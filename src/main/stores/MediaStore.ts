import type { VaultFs } from '../../shared/fs/VaultFs';
import { isNotFound } from '../../shared/fs/VaultFs';
import { toEntryDate } from '../../shared/localDate';
import { isMediaPath, MAX_MEDIA_BYTES, MEDIA_DIR, mediaExtension, mediaType, slugifyFileName } from '../../shared/media';
import { err, ok, type Result } from '../../shared/types/Result';

/**
 * Photos, videos and voice notes in `<vault>/media/YYYY-MM/`. They are plain files next to the
 * journal, so they open in any app and go wherever the folder is synced or exported.
 */
export class MediaStore {
  constructor(
    private fs: VaultFs,
    private now: () => Date = () => new Date(),
  ) {}

  /** Copies the file in under a readable, unique name and returns its vault-relative path. */
  async save(fileName: string, bytes: Uint8Array): Promise<Result<{ path: string }>> {
    const type = mediaType(String(fileName ?? ''));
    if (!type) return err('Paroh can keep photos (JPG, PNG, GIF, WebP), videos (MP4, MOV, WebM) and audio (MP3, M4A, WAV, OGG).');
    if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) return err('That file is empty.');
    if (bytes.byteLength > MAX_MEDIA_BYTES) return err('That file is larger than 300 MB. Try a shorter or smaller version.');
    try {
      const dir = `${MEDIA_DIR}/${toEntryDate(this.now()).slice(0, 7)}`;
      await this.fs.mkdir(dir);
      const existing = new Set(await this.fs.list(dir));
      const slug = slugifyFileName(fileName);
      const ext = mediaExtension(fileName);
      let name = `${slug}.${ext}`;
      for (let n = 2; existing.has(name); n++) name = `${slug}-${n}.${ext}`;
      await this.fs.appendBytes(`${dir}/${name}`, bytes);
      return ok({ path: `${dir}/${name}` });
    } catch (e) {
      return err(`Could not save that file: ${(e as Error).message}`);
    }
  }

  async read(path: string): Promise<Result<Uint8Array>> {
    if (!isMediaPath(path)) return err('That file is not in your journal’s media folder.');
    try {
      return ok(await this.fs.readBytes(path));
    } catch (e) {
      if (isNotFound(e)) return err('This file is no longer in your journal folder.');
      return err(`Could not open that file: ${(e as Error).message}`);
    }
  }
}
