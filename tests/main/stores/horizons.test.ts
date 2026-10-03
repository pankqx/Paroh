import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HorizonStore } from '../../../src/main/stores/HorizonStore';
import { NodeVaultFs } from '../../../src/main/vault/NodeVaultFs';
import { VaultAdapter } from '../../../src/main/vault/VaultAdapter';
import { parseLifeStory, serializeLifeStory } from '../../../src/main/vault/lifeStoryFile';
import type { LifeStory, LifeStoryInput } from '../../../src/shared/types/LifeStory';
import type { Result } from '../../../src/shared/types/Result';

const value = <T>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

let root: string;
let store: HorizonStore;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paroh-horizons-'));
  store = new HorizonStore(new NodeVaultFs(root));
});
afterEach(() => rm(root, { recursive: true, force: true }));

const input: LifeStoryInput = { title: 'Own my first car', life_area: 'career', status: 'in-motion', created: '2026-06-01', linked_entries: ['2026-07-03', '2026-06-11'], why: 'Freedom. Weekend trips.' };

describe('life story files', () => {
  it('match the documented format, with no progress field, and round-trip', () => {
    const story: LifeStory = { id: 'career/own-my-first-car', schema_version: 1, ...input, linked_entries: ['2026-06-11', '2026-07-03'] };
    const text = serializeLifeStory(story);
    expect(text).toBe(
      '---\nschema_version: 1\ntitle: Own my first car\nlife_area: career\nstatus: in-motion\ncreated: 2026-06-01\nlinked_entries: [2026-06-11, 2026-07-03]\n---\n\n## Why\n\nFreedom. Weekend trips.\n',
    );
    expect(text).not.toMatch(/progress/);
    expect(parseLifeStory(text, story.id, 'career', '2026-01-01')).toEqual({ ok: true, value: story });
  });

  it('reads hand-written files leniently and keeps unknown keys', () => {
    const parsed = value(parseLifeStory('---\ntitle: Paint\nstatus: wandering\nmood_board: yes\n---\nJust because.\n', 'learning/paint', 'learning', '2026-02-02'));
    expect(parsed).toMatchObject({ title: 'Paint', status: 'dreaming', created: '2026-02-02', why: 'Just because.', extra: { mood_board: 'yes' } });
    expect(serializeLifeStory(parsed)).toContain('mood_board: yes');
  });
});

describe('HorizonStore', () => {
  it('lists the default life areas with no stories, without creating anything', async () => {
    const data = value(await store.list());
    expect(data.stories).toEqual([]);
    expect(data.areas).toEqual(['career', 'health', 'relationships', 'learning', 'travel', 'finance', 'adventure']);
  });

  it('creates a story as a file in its area folder, with a unique slug', async () => {
    const a = value(await store.save(input));
    const b = value(await store.save(input));
    expect(a.id).toBe('career/own-my-first-car');
    expect(b.id).toBe('career/own-my-first-car-2');
    expect(a.linked_entries).toEqual(['2026-06-11', '2026-07-03']);
    expect(await readFile(join(root, 'horizons', 'career', 'own-my-first-car.md'), 'utf8')).toContain('## Why\n\nFreedom. Weekend trips.');
    expect(value(await store.list()).stories.map((s) => s.id)).toEqual([a.id, b.id]);
  });

  it('moves the file when the life area changes and keeps unknown keys', async () => {
    const a = value(await store.save(input));
    const path = join(root, 'horizons', 'career', 'own-my-first-car.md');
    await writeFile(path, (await readFile(path, 'utf8')).replace('status:', 'cover: car.jpg\nstatus:'));
    const moved = value(await store.save({ ...input, life_area: 'adventure', status: 'living-it', when: '2027-Q1' }, a.id));
    expect(moved.id).toBe('adventure/own-my-first-car');
    expect(await readdir(join(root, 'horizons', 'career'))).toEqual([]);
    const text = await readFile(join(root, 'horizons', 'adventure', 'own-my-first-car.md'), 'utf8');
    expect(text).toContain('cover: car.jpg');
    expect(text).toContain('when: 2027-Q1');
  });

  it('removes stories, adds areas as folders and rejects bad input or ids', async () => {
    const a = value(await store.save(input));
    value(await store.remove(a.id));
    expect(value(await store.list()).stories).toEqual([]);
    expect(value(await store.addArea('Creative Work'))).toBe('creative-work');
    expect(value(await store.list()).areas.at(-1)).toBe('creative-work');
    expect((await store.save({ ...input, title: ' ' })).ok).toBe(false);
    expect((await store.save({ ...input, life_area: '../x' })).ok).toBe(false);
    expect((await store.save({ ...input, when: 'soon' })).ok).toBe(false);
    expect((await store.remove('../../etc/passwd')).ok).toBe(false);
    expect((await store.save(input, '../evil')).ok).toBe(false);
  });
});

describe('VaultAdapter.loadMonth', () => {
  it('reads every entry in one month with full bodies, oldest first', async () => {
    const vault = new VaultAdapter(new NodeVaultFs(root));
    await vault.save({ schema_version: 1, date: '2026-10-02', title: 'b', tags: [], visibility: 'private', body: 'Second\n' });
    await vault.save({ schema_version: 1, date: '2026-10-01', title: 'a', tags: [], visibility: 'private', body: 'First\n' });
    await vault.save({ schema_version: 1, date: '2026-09-30', title: 'x', tags: [], visibility: 'private', body: 'Other\n' });
    await mkdir(join(root, '2026-11'));
    expect(value(await vault.loadMonth('2026-10')).map((e) => [e.date, e.body])).toEqual([
      ['2026-10-01', 'First\n'],
      ['2026-10-02', 'Second\n'],
    ]);
    expect(value(await vault.loadMonth('2026-11'))).toEqual([]);
    expect(value(await vault.loadMonth('2027-01'))).toEqual([]);
    expect((await vault.loadMonth('../x')).ok).toBe(false);
  });
});
