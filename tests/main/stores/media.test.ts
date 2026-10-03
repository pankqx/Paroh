import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MediaStore } from '../../../src/main/stores/MediaStore';
import { NodeVaultFs } from '../../../src/main/vault/NodeVaultFs';
import { isMediaPath, mediaType, slugifyFileName } from '../../../src/shared/media';

let root: string;
let store: MediaStore;
const bytes = new Uint8Array([1, 2, 3, 4]);

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'paroh-media-'));
  store = new MediaStore(new NodeVaultFs(root), () => new Date(2026, 9, 3, 9, 0));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('MediaStore', () => {
  it('copies a photo into media/YYYY-MM under a readable, unique name', async () => {
    const a = await store.save('Holiday Photo (1).JPG', bytes);
    const b = await store.save('Holiday Photo (1).JPG', bytes);
    expect(a.ok && a.value.path).toBe('media/2026-10/holiday-photo-1.jpg');
    expect(b.ok && b.value.path).toBe('media/2026-10/holiday-photo-1-2.jpg');
    expect([...(await readFile(join(root, 'media', '2026-10', 'holiday-photo-1.jpg')))]).toEqual([1, 2, 3, 4]);
  });

  it('reads back what it saved', async () => {
    const saved = await store.save('voice.weba', bytes);
    if (!saved.ok) throw new Error(saved.error);
    const read = await store.read(saved.value.path);
    expect(read.ok && [...read.value]).toEqual([1, 2, 3, 4]);
  });

  it('refuses unknown types, empty files, and paths outside media/', async () => {
    expect((await store.save('notes.exe', bytes)).ok).toBe(false);
    expect((await store.save('a.png', new Uint8Array())).ok).toBe(false);
    expect((await store.read('2026-10/2026-10-03.md')).ok).toBe(false);
    expect((await store.read('media/../secret.jpg')).ok).toBe(false);
  });
});

describe('media helpers', () => {
  it('knows each kind by extension', () => {
    expect(mediaType('a.MP4')?.kind).toBe('video');
    expect(mediaType('a.weba')?.kind).toBe('audio');
    expect(mediaType('a.webp')?.kind).toBe('image');
    expect(mediaType('a.txt')).toBeNull();
  });
  it('only accepts safe media paths', () => {
    expect(isMediaPath('media/2026-10/a.jpg')).toBe(true);
    expect(isMediaPath('media/2026-10/../../a.jpg')).toBe(false);
    expect(isMediaPath('audio/a.webm')).toBe(false);
  });
  it('slugifies file names', () => {
    expect(slugifyFileName('Café Night.jpeg')).toBe('cafe-night');
    expect(slugifyFileName('???.png')).toBe('media');
  });
});
