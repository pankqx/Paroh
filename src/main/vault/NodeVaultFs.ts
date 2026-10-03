import { appendFile, mkdir, readdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { isSafePath, type VaultFs, type VaultStat } from '../../shared/fs/VaultFs';
import { atomicWrite } from './atomicWrite';

/** The desktop's `VaultFs`: Node's `fs` under a vault folder. */
export class NodeVaultFs implements VaultFs {
  constructor(readonly root: string) {}

  private abs(path: string): string {
    if (path === '') return this.root;
    if (!isSafePath(path)) throw new Error(`Refusing a path outside the vault: ${path}`);
    return join(this.root, ...path.split('/'));
  }

  readText(path: string): Promise<string> {
    return readFile(this.abs(path), 'utf8');
  }

  async readBytes(path: string): Promise<Uint8Array> {
    return new Uint8Array(await readFile(this.abs(path)));
  }

  async writeTextAtomic(path: string, contents: string, validate?: (written: string) => string | null): Promise<void> {
    const abs = this.abs(path);
    await mkdir(dirname(abs), { recursive: true });
    return atomicWrite(abs, contents, validate);
  }

  appendBytes(path: string, data: Uint8Array): Promise<void> {
    return appendFile(this.abs(path), data);
  }

  list(path: string): Promise<string[]> {
    return readdir(this.abs(path));
  }

  async stat(path: string): Promise<VaultStat> {
    const s = await stat(this.abs(path));
    return { isDirectory: s.isDirectory(), size: s.size, mtimeMs: s.mtimeMs, birthtimeMs: s.birthtimeMs };
  }

  async mkdir(path: string): Promise<void> {
    await mkdir(this.abs(path), { recursive: true });
  }

  remove(path: string): Promise<void> {
    return rm(this.abs(path), { recursive: true, force: true });
  }

  rename(from: string, to: string): Promise<void> {
    return rename(this.abs(from), this.abs(to));
  }
}
