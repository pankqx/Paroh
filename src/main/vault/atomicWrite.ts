import { open, rename, rm, readFile } from 'node:fs/promises';

/**
 * Write-temp, validate, fsync, rename (architecture.md §Atomic Saving Strategy).
 * A crash at any point leaves either the old file or the new one on disk, never a half-written mix.
 * `validate` receives what was actually read back from disk, so a serializer bug is caught before the rename.
 */
export async function atomicWrite(path: string, contents: string, validate?: (written: string) => string | null): Promise<void> {
  const tmp = `${path}.tmp`;
  const handle = await open(tmp, 'w');
  try {
    await handle.writeFile(contents, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }

  const written = await readFile(tmp, 'utf8');
  const problem = written !== contents ? 'Written file does not match what was serialized' : validate?.(written) ?? null;
  if (problem) {
    await rm(tmp, { force: true });
    throw new Error(`Save aborted, original file untouched: ${problem}`);
  }
  await rename(tmp, path);
}
