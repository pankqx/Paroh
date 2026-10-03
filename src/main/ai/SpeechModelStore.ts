import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { SPEECH_MODEL, type SpeechModelStatus } from '../../shared/speechModel';
import { err, ok, type Result } from '../../shared/types/Result';

const MARKER = '.paroh-complete.json';

export interface SpeechModelOptions {
  /** `<userData>/models`: app data, not the vault, so the model is never exported or synced. */
  root: string;
  fetch: typeof fetch;
  host?: string;
  onChange?: (status: SpeechModelStatus) => void;
}

/**
 * Downloads the speech model once and serves its files read-only. The only network traffic local
 * transcription ever causes is this download of public model files; no recording or text is sent.
 */
export class SpeechModelStore {
  private downloading: Promise<Result<void>> | null = null;
  private progress: SpeechModelStatus | null = null;

  constructor(private opts: SpeechModelOptions) {}

  get dir(): string {
    return join(this.opts.root, ...SPEECH_MODEL.id.split('/'));
  }

  async status(): Promise<SpeechModelStatus> {
    if (this.progress) return this.progress;
    try {
      const marker = JSON.parse(await readFile(join(this.dir, MARKER), 'utf8')) as { bytes?: number };
      return { state: 'ready', bytes: marker.bytes ?? 0 };
    } catch {
      return { state: 'missing' };
    }
  }

  download(): Promise<Result<void>> {
    this.downloading ??= this.run().finally(() => {
      this.downloading = null;
    });
    return this.downloading;
  }

  async remove(): Promise<Result<void>> {
    if (this.downloading) return err('Wait for the download to finish first.');
    try {
      await rm(this.dir, { recursive: true, force: true });
      this.emit(null);
      return ok(undefined);
    } catch (e) {
      return err(`Could not remove the speech model: ${(e as Error).message}`);
    }
  }

  /** Maps `<model id>/<file>` from a `paroh-model://models/...` URL to a file, or null if it is outside the model folder. */
  resolveFile(relative: string): string | null {
    let decoded: string;
    try {
      decoded = decodeURIComponent(relative);
    } catch {
      return null;
    }
    if (decoded.includes('\0')) return null;
    const root = resolve(this.opts.root);
    const full = resolve(root, decoded);
    return full.startsWith(root + sep) ? full : null;
  }

  private async run(): Promise<Result<void>> {
    const host = this.opts.host ?? 'https://huggingface.co';
    let received = 0;
    try {
      await rm(this.dir, { recursive: true, force: true });
      for (const file of SPEECH_MODEL.files) {
        const url = `${host}/${SPEECH_MODEL.id}/resolve/${SPEECH_MODEL.revision}/${file.path}`;
        const res = await this.opts.fetch(url);
        if (res.status === 404 && !file.required) continue;
        if (!res.ok || !res.body) throw new Error(`${file.path} could not be downloaded (HTTP ${res.status})`);
        const target = join(this.dir, ...file.path.split('/'));
        await mkdir(dirname(target), { recursive: true });
        let lastEmit = 0;
        const counted = Readable.fromWeb(res.body as unknown as WebReadableStream<Uint8Array>).on('data', (chunk: Buffer) => {
          received += chunk.length;
          const now = Date.now();
          if (now - lastEmit > 200) {
            lastEmit = now;
            this.emit({ state: 'downloading', receivedBytes: received, totalBytes: null, file: file.path });
          }
        });
        await pipeline(counted, createWriteStream(`${target}.part`));
        const expected = Number(res.headers.get('content-length'));
        if (expected && (await stat(`${target}.part`)).size !== expected) throw new Error(`${file.path} arrived incomplete`);
        await rename(`${target}.part`, target);
      }
      await writeFile(join(this.dir, MARKER), JSON.stringify({ model: SPEECH_MODEL.id, bytes: received, at: new Date().toISOString() }));
      this.emit(null);
      return ok(undefined);
    } catch (e) {
      await rm(this.dir, { recursive: true, force: true }).catch(() => undefined);
      const message = describeDownloadError(e as Error);
      this.emit({ state: 'error', message });
      this.progress = null;
      return err(message);
    }
  }

  /** `null` means "read the state from disk again". */
  private emit(status: SpeechModelStatus | null): void {
    this.progress = status?.state === 'downloading' ? status : null;
    if (status) this.opts.onChange?.(status);
    else void this.status().then((s) => this.opts.onChange?.(s));
  }
}

function describeDownloadError(e: Error): string {
  const code = (e as NodeJS.ErrnoException).code;
  if (code === 'ENOSPC') return 'There is not enough disk space for the speech model.';
  if (code === 'EACCES' || code === 'EPERM') return 'Paroh is not allowed to write the speech model to its config folder.';
  if (e.name === 'TypeError' || /fetch|network|ENOTFOUND|ECONNRESET|ERR_/i.test(e.message)) return `Could not download the speech model. Check your internet connection. (${e.message})`;
  return `Could not download the speech model: ${e.message}`;
}
