import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BoardStore } from '../../../src/main/stores/BoardStore';
import { NodeVaultFs } from '../../../src/main/vault/NodeVaultFs';
import type { Board, BoardItem } from '../../../src/shared/types/Board';
import type { Result } from '../../../src/shared/types/Result';

let root: string;
let store: BoardStore;
const value = <T>(r: Result<T>): T => {
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const sticky: BoardItem = { id: 'a', type: 'sticky', x: 10, y: 20, w: 200, h: 200, color: '#fde68a', text: 'Idea' };

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paroh-boards-'));
  store = new BoardStore(new NodeVaultFs(root), () => new Date('2026-10-03T09:00:00Z'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('BoardStore', () => {
  it('lists nothing before the first board', async () => {
    expect(value(await store.list())).toEqual([]);
  });

  it('creates boards with readable, unique ids as JSON in boards/', async () => {
    const a = value(await store.create('Trip to the hills'));
    const b = value(await store.create('Trip to the hills'));
    expect(a.id).toBe('trip-to-the-hills');
    expect(b.id).toBe('trip-to-the-hills-2');
    const file = JSON.parse(await readFile(join(root, 'boards', 'trip-to-the-hills.json'), 'utf8')) as Board;
    expect(file).toMatchObject({ schema_version: 1, title: 'Trip to the hills', items: [] });
  });

  it('saves items and summarises boards for the list, newest first', async () => {
    const a = value(await store.create('One'));
    value(await store.create('Two'));
    store = new BoardStore(new NodeVaultFs(root), () => new Date('2026-10-04T09:00:00Z'));
    value(await store.save({ ...a, items: [sticky] }));
    const list = value(await store.list());
    expect(list.map((b) => b.id)).toEqual(['one', 'two']);
    expect(list[0]).toMatchObject({ itemCount: 1, preview: [{ type: 'sticky', x: 10, y: 20, w: 200, h: 200, color: '#fde68a' }] });
    expect(value(await store.load('one')).items).toEqual([sticky]);
  });

  it('refuses unknown items, pictures from outside the journal and odd ids', async () => {
    const b = value(await store.create('Safe'));
    expect((await store.save({ ...b, items: [{ ...sticky, type: 'script' } as unknown as BoardItem] })).ok).toBe(false);
    expect((await store.save({ ...b, items: [{ id: 'i', type: 'image', x: 0, y: 0, w: 1, h: 1, src: '/etc/passwd' }] })).ok).toBe(false);
    expect((await store.save({ ...b, items: [{ ...sticky, x: Number.NaN }] })).ok).toBe(false);
    expect((await store.load('../secrets')).ok).toBe(false);
    expect((await store.save({ ...b, id: '../x' })).ok).toBe(false);
  });

  it('removes a board', async () => {
    const b = value(await store.create('Gone'));
    value(await store.remove(b.id));
    expect(value(await store.list())).toEqual([]);
  });
});
