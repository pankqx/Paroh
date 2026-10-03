import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isNotFound, type VaultFs } from '../../../src/shared/fs/VaultFs';
import { NodeVaultFs } from '../../../src/main/vault/NodeVaultFs';
import { CapacitorVaultFs } from '../../../src/mobile-main/CapacitorVaultFs';
import { resetFakeFilesystem } from '../../mobile/fakeFilesystem';

vi.mock('@capacitor/filesystem', () => import('../../mobile/fakeFilesystem'));

let dir: string;
const makers: [string, () => Promise<VaultFs>][] = [
  [
    'NodeVaultFs (desktop)',
    async () => {
      dir = await mkdtemp(join(tmpdir(), 'paroh-fs-'));
      return new NodeVaultFs(dir);
    },
  ],
  [
    'CapacitorVaultFs (phone)',
    async () => {
      resetFakeFilesystem();
      const fs = new CapacitorVaultFs();
      await fs.mkdir('');
      return fs;
    },
  ],
];

async function code(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return isNotFound(e) ? 'ENOENT' : (e as Error).message;
  }
}

// Both platforms must behave the same, or the shared vault code would work on one and break on the other.
describe.each(makers)('%s', (_name, make) => {
  let fs: VaultFs;
  beforeEach(async () => {
    fs = await make();
  });
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('reports anything missing as ENOENT', async () => {
    expect(await code(fs.readText('2026-10/2026-10-02.md'))).toBe('ENOENT');
    expect(await code(fs.readBytes('audio/a.webm'))).toBe('ENOENT');
    expect(await code(fs.list('2026-10'))).toBe('ENOENT');
    expect(await code(fs.stat('2026-10'))).toBe('ENOENT');
  });

  it('saves atomically, creating folders, and leaves no temp file behind', async () => {
    const text = '---\ntitle: Café ☕\n---\n\nÜnïcode body 🌿\n';
    await fs.writeTextAtomic('2026-10/2026-10-02.md', text);
    expect(await fs.readText('2026-10/2026-10-02.md')).toBe(text);
    expect(await fs.list('2026-10')).toEqual(['2026-10-02.md']);
    const s = await fs.stat('2026-10/2026-10-02.md');
    expect(s.isDirectory).toBe(false);
    expect(s.size).toBe(new TextEncoder().encode(text).length);
    expect((await fs.stat('2026-10')).isDirectory).toBe(true);

    await fs.writeTextAtomic('2026-10/2026-10-02.md', 'second');
    expect(await fs.readText('2026-10/2026-10-02.md')).toBe('second');
    expect(await fs.list('2026-10')).toEqual(['2026-10-02.md']);
  });

  it('keeps the original when validation fails', async () => {
    await fs.writeTextAtomic('a.md', 'original');
    expect(await code(fs.writeTextAtomic('a.md', 'broken', () => 'frontmatter does not parse'))).toMatch(/original file untouched/);
    expect(await fs.readText('a.md')).toBe('original');
    expect(await fs.list('')).toEqual(['a.md']);
  });

  it('appends bytes, and an empty append creates an empty file', async () => {
    await fs.mkdir('audio');
    await fs.appendBytes('audio/a.webm', new Uint8Array());
    expect((await fs.stat('audio/a.webm')).size).toBe(0);
    await fs.appendBytes('audio/a.webm', new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]));
    await fs.appendBytes('audio/a.webm', new Uint8Array([0, 255, 128]));
    expect([...(await fs.readBytes('audio/a.webm'))]).toEqual([0x1a, 0x45, 0xdf, 0xa3, 0, 255, 128]);
  });

  it('makes folders idempotently, renames, and removes files and folders', async () => {
    await fs.mkdir('horizons/health');
    await fs.mkdir('horizons/health');
    await fs.writeTextAtomic('horizons/health/run.md', 'x');
    await fs.rename('horizons/health/run.md', 'horizons/health/walk.md');
    expect(await fs.list('horizons/health')).toEqual(['walk.md']);
    await fs.remove('horizons/health/walk.md');
    expect(await fs.list('horizons/health')).toEqual([]);
    await fs.writeTextAtomic('horizons/health/b.md', 'y');
    await fs.remove('horizons');
    expect(await code(fs.stat('horizons'))).toBe('ENOENT');
    expect(await code(fs.remove('horizons'))).toBe('ok');
  });

  it('refuses paths that climb out of the vault', async () => {
    for (const bad of ['../escape.md', '/etc/passwd', 'a/../../b', 'a\\b']) {
      expect(await code((async () => fs.readText(bad))())).toMatch(/outside the vault/);
    }
  });
});
