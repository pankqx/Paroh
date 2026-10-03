import { readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import type { ZipSource } from './zip';

export type FolderKind = 'missing' | 'empty' | 'paroh' | 'other';

const MONTH_DIR_RE = /^\d{4}-\d{2}$/;

/** Is this folder safe to use as a vault without asking? Empty or already Paroh's, yes; anything else needs confirmation. */
export async function classifyFolder(path: string): Promise<{ kind: FolderKind; sample: string[] }> {
  let names: string[];
  try {
    names = (await readdir(path)).filter((n) => n !== '.DS_Store' && n !== 'Thumbs.db');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { kind: 'missing', sample: [] };
    throw e;
  }
  if (names.length === 0) return { kind: 'empty', sample: [] };
  if (names.includes('.paroh') || names.some((n) => MONTH_DIR_RE.test(n)) || names.includes('horizons')) return { kind: 'paroh', sample: [] };
  return { kind: 'other', sample: names.slice(0, 5) };
}

/** Every file worth keeping in an export: entries, audio, horizons, `.paroh/*.json`. The search index and temp files are rebuilt, so they are left out. */
export async function vaultFiles(root: string): Promise<ZipSource[]> {
  const out: ZipSource[] = [];
  async function walk(dir: string) {
    for (const name of (await readdir(dir)).sort()) {
      const path = join(dir, name);
      const rel = relative(root, path).split(sep).join('/');
      if (/^\.paroh\/index\.db/.test(rel) || name.endsWith('.tmp') || name === '.DS_Store') continue;
      const s = await stat(path);
      if (s.isDirectory()) await walk(path);
      else if (s.isFile()) out.push({ name: rel, path });
    }
  }
  await walk(root);
  return out;
}
