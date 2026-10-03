import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { classifyFolder, vaultFiles } from '../../../src/main/vault/vaultFolder';
import { extractZip, readZip, writeZip } from '../../../src/main/vault/zip';
import { msUntilNext, isReminderTime } from '../../../src/shared/reminder';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'paroh-zip-'));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

async function sampleVault(root: string) {
  await mkdir(join(root, '2026-10'), { recursive: true });
  await mkdir(join(root, '.paroh'), { recursive: true });
  await mkdir(join(root, 'audio'), { recursive: true });
  await mkdir(join(root, 'horizons', 'health'), { recursive: true });
  await writeFile(join(root, '2026-10', '2026-10-02.md'), '---\ntitle: Café ☕\n---\n\nÜnïcode body.\n'.repeat(50));
  await writeFile(join(root, '.paroh', 'habits.json'), '{"habits":[]}');
  await writeFile(join(root, '.paroh', 'index.db'), 'disposable');
  await writeFile(join(root, '.paroh', 'index.db-wal'), 'disposable');
  await writeFile(join(root, '2026-10', '2026-10-03.md.tmp'), 'half-written');
  await writeFile(join(root, 'audio', 'a.webm'), Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3]));
  await writeFile(join(root, 'horizons', 'health', 'run.md'), '---\ntitle: Run\n---\n\n## Why\n\nStrong.\n');
}

describe('vault export and import', () => {
  it('exports every vault file except the disposable index and temp files, and imports it back byte for byte', async () => {
    const vault = join(dir, 'vault');
    await sampleVault(vault);
    const files = await vaultFiles(vault);
    expect(files.map((f) => f.name)).toEqual(['.paroh/habits.json', '2026-10/2026-10-02.md', 'audio/a.webm', 'horizons/health/run.md']);

    const zip = join(dir, 'export.zip');
    const progress: number[] = [];
    const result = await writeZip(zip, files, (done) => progress.push(done));
    expect(result.files).toBe(4);
    expect(progress).toEqual([1, 2, 3, 4]);

    const restored = join(dir, 'restored');
    expect(await extractZip(await readFile(zip), restored)).toBe(4);
    for (const f of files) expect(await readFile(join(restored, f.name))).toEqual(await readFile(f.path));
    expect((await classifyFolder(restored)).kind).toBe('paroh');
  });

  it('writes archives other tools can read', async () => {
    const vault = join(dir, 'vault');
    await sampleVault(vault);
    const zip = join(dir, 'export.zip');
    await writeZip(zip, await vaultFiles(vault));
    let listing: string;
    try {
      listing = execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print("\\n".join(z.namelist()))', zip], { encoding: 'utf8' });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return; // python3 not installed here
      throw e;
    }
    expect(listing.trim().split('\n')).toContain('2026-10/2026-10-02.md');
  });

  it('rejects archives that would write outside the destination, or are damaged', async () => {
    const evil = join(dir, 'evil.txt');
    await writeFile(evil, 'x');
    const zip = join(dir, 'evil.zip');
    await writeZip(zip, [{ name: '../escape.txt', path: evil }]);
    await expect(extractZip(await readFile(zip), join(dir, 'out'))).rejects.toThrow(/unsafe path/);
    const good = join(dir, 'good.zip');
    await writeZip(good, [{ name: 'a.md', path: evil }]);
    const buf = await readFile(good);
    buf[38] ^= 0xff; // flip a byte inside the stored data's CRC region
    expect(() => readZip(buf)).toThrow();
    expect(() => readZip(Buffer.from('not a zip at all, definitely not'))).toThrow(/Not a ZIP/);
  });
});

describe('classifyFolder', () => {
  it('tells empty, Paroh and unrelated folders apart', async () => {
    expect((await classifyFolder(join(dir, 'nope'))).kind).toBe('missing');
    expect((await classifyFolder(dir)).kind).toBe('empty');
    await mkdir(join(dir, '2026-01'));
    expect((await classifyFolder(dir)).kind).toBe('paroh');
    const other = join(dir, 'docs');
    await mkdir(other);
    await writeFile(join(other, 'taxes.pdf'), 'x');
    expect(await classifyFolder(other)).toEqual({ kind: 'other', sample: ['taxes.pdf'] });
  });
});

describe('daily reminder timing', () => {
  it('fires later today if the time is ahead, otherwise tomorrow', () => {
    const now = new Date(2026, 9, 2, 20, 30, 0);
    expect(msUntilNext('21:00', now)).toBe(30 * 60 * 1000);
    expect(msUntilNext('20:30', now)).toBe(24 * 60 * 60 * 1000);
    expect(msUntilNext('07:15', now)).toBe((10 * 60 + 45) * 60 * 1000);
  });
  it('accepts only HH:MM', () => {
    expect(isReminderTime('09:05')).toBe(true);
    expect(isReminderTime('24:00')).toBe(false);
    expect(isReminderTime('9:05')).toBe(false);
  });
});
