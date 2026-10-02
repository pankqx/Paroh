import { mkdtemp, readdir, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { atomicWrite } from '../../../src/main/vault/atomicWrite';
import { VaultAdapter } from '../../../src/main/vault/VaultAdapter';
import { emptyEntry } from '../../../src/shared/types/Entry';

let root: string;
let vault: VaultAdapter;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paroh-vault-'));
  vault = new VaultAdapter(root);
});
afterEach(() => rm(root, { recursive: true, force: true }));

describe('VaultAdapter', () => {
  it('saves an entry to YYYY-MM/YYYY-MM-DD.md and loads it back identically', async () => {
    const entry = { ...emptyEntry('2026-06-11'), title: 'A quiet morning', mood: 'good' as const, tags: ['gratitude'], body: 'Hello **world**\n' };
    const saved = await vault.save(entry);
    expect(saved.ok).toBe(true);
    expect(await readdir(join(root, '2026-06'))).toEqual(['2026-06-11.md']);
    expect(await vault.load('2026-06-11')).toEqual({ ok: true, value: entry });
  });

  it('returns null for a day with no entry', async () => {
    expect(await vault.load('2026-01-01')).toEqual({ ok: true, value: null });
  });

  it('rejects dates that are not real calendar days', async () => {
    expect((await vault.save(emptyEntry('2026-02-30'))).ok).toBe(false);
    expect((await vault.load('../../etc/passwd')).ok).toBe(false);
  });

  it('lists entries newest first and respects a date range', async () => {
    for (const date of ['2026-05-30', '2026-06-02', '2026-06-11']) await vault.save({ ...emptyEntry(date), body: `day ${date}` });
    const all = await vault.list();
    expect(all.ok && all.value.map((e) => e.date)).toEqual(['2026-06-11', '2026-06-02', '2026-05-30']);
    const june = await vault.list({ from: '2026-06-01', to: '2026-06-30' });
    expect(june.ok && june.value.map((e) => e.date)).toEqual(['2026-06-11', '2026-06-02']);
  });

  it('keeps listing the rest of the journal when one file is corrupt', async () => {
    await vault.save({ ...emptyEntry('2026-06-01'), body: 'fine' });
    await writeFile(join(root, '2026-06', '2026-06-02.md'), '---\ntitle: [broken\n---\n');
    const all = await vault.list();
    expect(all.ok && all.value.map((e) => e.date)).toEqual(['2026-06-01']);
  });

  it('deletes an entry', async () => {
    await vault.save(emptyEntry('2026-06-11'));
    expect((await vault.delete('2026-06-11')).ok).toBe(true);
    expect(await vault.load('2026-06-11')).toEqual({ ok: true, value: null });
  });
});

describe('atomicWrite', () => {
  it('leaves the original file untouched and no temp file behind when validation fails', async () => {
    const path = join(root, 'entry.md');
    await mkdir(root, { recursive: true });
    await writeFile(path, 'original');
    await expect(atomicWrite(path, 'new', () => 'nope')).rejects.toThrow('original file untouched');
    expect(await readFile(path, 'utf8')).toBe('original');
    expect(await readdir(root)).toEqual(['entry.md']);
  });

  it('replaces the file when validation passes', async () => {
    const path = join(root, 'entry.md');
    await atomicWrite(path, 'new contents');
    expect(await readFile(path, 'utf8')).toBe('new contents');
    expect(await readdir(root)).toEqual(['entry.md']);
  });
});
