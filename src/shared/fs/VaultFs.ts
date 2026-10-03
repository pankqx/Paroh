/**
 * Everything the vault code needs from a filesystem, and nothing more (architecture.md §Mobile Reuse
 * Strategy). The desktop app implements it with Node's `fs`; the mobile app with Capacitor's
 * Filesystem API. Paths are vault-relative and always use `/`, e.g. `2026-10/2026-10-02.md`.
 * A missing file or folder is reported as an error whose `code` is `ENOENT`, on every platform.
 */
export interface VaultFs {
  /** Where the vault lives, for showing to the person. */
  readonly root: string;
  readText(path: string): Promise<string>;
  readBytes(path: string): Promise<Uint8Array>;
  /**
   * Write-temp, read back, validate, then replace (architecture.md §Atomic Saving Strategy). `validate`
   * gets what was actually read back and returns a problem or null; on a problem the original is untouched.
   */
  writeTextAtomic(path: string, contents: string, validate?: (written: string) => string | null): Promise<void>;
  appendBytes(path: string, data: Uint8Array): Promise<void>;
  /** Names in a folder (not paths). */
  list(path: string): Promise<string[]>;
  stat(path: string): Promise<VaultStat>;
  /** Creates the folder and any parents; fine if it exists. */
  mkdir(path: string): Promise<void>;
  /** Removes a file, or a folder and everything in it; fine if it is already gone. */
  remove(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
}

export interface VaultStat {
  isDirectory: boolean;
  size: number;
  mtimeMs: number;
  /** Not every platform knows when a file was created; callers fall back to `mtimeMs`. */
  birthtimeMs?: number;
}

export function isNotFound(e: unknown): boolean {
  return (e as { code?: unknown } | null)?.code === 'ENOENT';
}

export function notFound(path: string): Error {
  return Object.assign(new Error(`ENOENT: no such file or directory, '${path}'`), { code: 'ENOENT' });
}

/** Joins vault-relative parts with `/`, dropping empty parts. */
export function joinPath(...parts: string[]): string {
  return parts
    .flatMap((p) => p.split('/'))
    .filter(Boolean)
    .join('/');
}

export function parentPath(path: string): string {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i);
}

/** A vault-relative path must not climb out of the vault or smuggle in odd segments. */
export function isSafePath(path: string): boolean {
  if (!path || path.startsWith('/') || path.includes('\\') || path.includes('\0')) return false;
  return path.split('/').every((s) => s !== '' && s !== '.' && s !== '..');
}
