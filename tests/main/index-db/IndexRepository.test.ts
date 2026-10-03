import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IndexRepository, toFtsQuery } from '../../../src/main/index-db/IndexRepository';
import { MemoryIndex } from '../../../src/main/index-db/MemoryIndex';
import type { SearchIndex } from '../../../src/main/index-db/SearchIndex';
import { emptyEntry, type Entry } from '../../../src/shared/types/Entry';

const entry = (date: string, patch: Partial<Entry> = {}): Entry => ({ ...emptyEntry(date), ...patch });

// The desktop's SQLite index and the mobile app's in-memory index must answer alike.
describe.each([
  ['SQLite (desktop)', () => IndexRepository.open(':memory:')],
  ['in-memory (mobile)', () => new MemoryIndex()],
] as [string, () => SearchIndex][])('%s index', (_name, open) => {
  let index: SearchIndex;
  beforeEach(() => {
    index = open();
    index.upsert(entry('2026-06-11', { title: 'A quiet morning', mood: 'good', tags: ['gratitude'], body: 'Watched pigeons on the roof with coffee.' }), 1);
    index.upsert(entry('2026-06-10', { title: 'The call with dad', mood: 'sad', tags: ['family', 'healing'], body: 'He asked how I was. See [[A quiet morning]].' }), 1);
    index.upsert(entry('2026-06-08', { title: 'Grocery spiral', mood: 'low', tags: ['anxiety'], body: 'Everyone seemed to be looking at me. Linked to [[2026-06-11]].' }), 1);
  });
  afterEach(() => index.close());

  describe('prompt history', () => {
    it('derives answered and skipped prompts from entry frontmatter, newest first', () => {
      index.upsert(entry('2026-06-12', { prompt_id: 'noticing-001', prompt_skipped: false }), 1);
      index.upsert(entry('2026-06-13', { prompt_id: 'noticing-002', prompt_skipped: true }), 1);
      expect(index.promptHistory()).toEqual([
        { prompt_id: 'noticing-002', date: '2026-06-13', outcome: 'skipped' },
        { prompt_id: 'noticing-001', date: '2026-06-12', outcome: 'answered' },
      ]);
    });
  });

  describe('search', () => {
    it('finds entries by words in the body, with the match marked in the snippet', () => {
      const results = index.search('pigeons');
      expect(results.map((r) => r.date)).toEqual(['2026-06-11']);
      expect(results[0].snippet).toContain('\u0002pigeons\u0003');
    });

    it('matches word stems and prefixes while typing', () => {
      expect(index.search('pigeon').map((r) => r.date)).toEqual(['2026-06-11']);
      expect(index.search('groc').map((r) => r.date)).toEqual(['2026-06-08']);
    });

    it('filters by tag, mood and date range, with or without text', () => {
      expect(index.search('', { tags: ['family'] }).map((r) => r.date)).toEqual(['2026-06-10']);
      expect(index.search('', { mood: 'low' }).map((r) => r.date)).toEqual(['2026-06-08']);
      expect(index.search('', { range: { from: '2026-06-09' } }).map((r) => r.date)).toEqual(['2026-06-11', '2026-06-10']);
      expect(index.search('asked', { mood: 'good' })).toEqual([]);
    });

    it('never throws on punctuation that is FTS syntax', () => {
      for (const q of ['"', 'a AND', '-', 'NEAR(', ':', "it's", '*']) expect(() => index.search(q)).not.toThrow();
        });

    it('updates and removes entries without leaving stale results', () => {
      index.upsert(entry('2026-06-11', { title: 'A quiet morning', body: 'Rain all day.' }), 2);
      expect(index.search('pigeons')).toEqual([]);
      expect(index.search('rain').map((r) => r.date)).toEqual(['2026-06-11']);
      index.remove('2026-06-11');
      expect(index.search('rain')).toEqual([]);
      expect(index.list().map((e) => e.date)).toEqual(['2026-06-10', '2026-06-08']);
    });
  });

  describe('links', () => {
    it('finds backlinks made by title or by date', () => {
      expect(index.backlinks('2026-06-11').map((b) => b.date)).toEqual(['2026-06-10', '2026-06-08']);
      expect(index.backlinks('2026-06-10')).toEqual([]);
    });

    it('resolves a link target to an entry date, case-insensitively', () => {
      expect(index.resolveLink('a QUIET morning')).toBe('2026-06-11');
      expect(index.resolveLink('2026-06-08')).toBe('2026-06-08');
      expect(index.resolveLink('nothing like this')).toBeNull();
    });
  });

  describe('tags', () => {
    it('counts tags across entries', () => {
      expect(index.tags()).toContainEqual({ tag: 'family', count: 1 });
      expect(index.tags()).toHaveLength(4);
    });
  });
});

describe('FTS query building', () => {
  it('quotes words so punctuation never becomes FTS syntax', () => {
    expect(toFtsQuery('hello "world')).toBe('"hello" "world"*');
  });
});

describe('opening', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'paroh-index-'));
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('replaces a corrupt index file with a fresh one instead of failing', async () => {
    const path = join(dir, 'index.db');
    await writeFile(path, 'this is not a database');
    const fresh = IndexRepository.open(path);
    expect(fresh.list()).toEqual([]);
    fresh.close();
  });

  it('keeps its contents between launches', () => {
    const path = join(dir, 'index.db');
    const first = IndexRepository.open(path);
    first.upsert(entry('2026-06-11', { title: 'kept' }), 5);
    first.close();
    const second = IndexRepository.open(path);
    expect(second.list().map((e) => e.title)).toEqual(['kept']);
    second.close();
  });
});
