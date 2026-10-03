import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { isNotFound, isSafePath, notFound, type VaultFs, type VaultStat } from '../shared/fs/VaultFs';

/** Capacitor reports missing files with platform-specific messages; they all become `ENOENT` here. */
function normalize(e: unknown, path: string): never {
  const message = (e as Error)?.message ?? String(e);
  if (/does not exist|not found|no such file|doesn't exist/i.test(message)) throw notFound(path);
  throw e instanceof Error ? e : new Error(message);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * The mobile app's `VaultFs`: Capacitor's Filesystem API under `Documents/<folder>`, the same
 * Markdown-and-YAML vault the desktop writes, so a sync tool can carry it between devices unchanged.
 */
export class CapacitorVaultFs implements VaultFs {
  readonly root: string;

  constructor(
    private folder = 'Paroh',
    private directory: Directory = Directory.Documents,
  ) {
    this.root = `Documents/${folder}`;
  }

  private p(path: string): string {
    if (path === '') return this.folder;
    if (!isSafePath(path)) throw new Error(`Refusing a path outside the vault: ${path}`);
    return `${this.folder}/${path}`;
  }

  async readText(path: string): Promise<string> {
    try {
      const { data } = await Filesystem.readFile({ path: this.p(path), directory: this.directory, encoding: Encoding.UTF8 });
      return typeof data === 'string' ? data : await data.text();
    } catch (e) {
      return normalize(e, path);
    }
  }

  async readBytes(path: string): Promise<Uint8Array> {
    try {
      const { data } = await Filesystem.readFile({ path: this.p(path), directory: this.directory });
      return typeof data === 'string' ? base64ToBytes(data) : new Uint8Array(await data.arrayBuffer());
    } catch (e) {
      return normalize(e, path);
    }
  }

  /** Same pipeline as the desktop: write a temp file, read it back, validate, then replace the original. */
  async writeTextAtomic(path: string, contents: string, validate?: (written: string) => string | null): Promise<void> {
    const tmp = `${path}.tmp`;
    await Filesystem.writeFile({ path: this.p(tmp), directory: this.directory, data: contents, encoding: Encoding.UTF8, recursive: true });
    const written = await this.readText(tmp);
    const problem = written !== contents ? 'Written file does not match what was serialized' : (validate?.(written) ?? null);
    if (problem) {
      await this.remove(tmp);
      throw new Error(`Save aborted, original file untouched: ${problem}`);
    }
    try {
      await Filesystem.rename({ from: this.p(tmp), to: this.p(path), directory: this.directory });
    } catch {
      // Some platforms will not rename onto an existing file; the validated copy is safe in .tmp meanwhile.
      await this.remove(path);
      await Filesystem.rename({ from: this.p(tmp), to: this.p(path), directory: this.directory });
    }
  }

  async appendBytes(path: string, data: Uint8Array): Promise<void> {
    if (data.length === 0) {
      try {
        await Filesystem.stat({ path: this.p(path), directory: this.directory });
        return;
      } catch {
        await Filesystem.writeFile({ path: this.p(path), directory: this.directory, data: '', recursive: true });
        return;
      }
    }
    await Filesystem.appendFile({ path: this.p(path), directory: this.directory, data: bytesToBase64(data) });
  }

  async list(path: string): Promise<string[]> {
    try {
      const { files } = await Filesystem.readdir({ path: this.p(path), directory: this.directory });
      return files.map((f) => f.name);
    } catch (e) {
      return normalize(e, path);
    }
  }

  async stat(path: string): Promise<VaultStat> {
    try {
      const s = await Filesystem.stat({ path: this.p(path), directory: this.directory });
      return { isDirectory: s.type === 'directory', size: s.size, mtimeMs: Number(s.mtime), ...(s.ctime ? { birthtimeMs: Number(s.ctime) } : {}) };
    } catch (e) {
      return normalize(e, path);
    }
  }

  async mkdir(path: string): Promise<void> {
    try {
      await Filesystem.mkdir({ path: this.p(path), directory: this.directory, recursive: true });
    } catch (e) {
      // Already there is fine; anything else is a real error.
      if (!/already exist/i.test((e as Error)?.message ?? '')) throw e;
    }
  }

  async remove(path: string): Promise<void> {
    let info: VaultStat;
    try {
      info = await this.stat(path);
    } catch (e) {
      if (isNotFound(e)) return;
      throw e;
    }
    if (info.isDirectory) await Filesystem.rmdir({ path: this.p(path), directory: this.directory, recursive: true });
    else await Filesystem.deleteFile({ path: this.p(path), directory: this.directory });
  }

  async rename(from: string, to: string): Promise<void> {
    try {
      await Filesystem.rename({ from: this.p(from), to: this.p(to), directory: this.directory });
    } catch (e) {
      normalize(e, from);
    }
  }
}
