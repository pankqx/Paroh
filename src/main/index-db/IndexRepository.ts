import { mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { DateRange, Entry, EntrySummary } from '../../shared/types/Entry';
import type { HabitDay } from '../../shared/types/Habit';
import type { PromptLog } from '../../shared/types/Prompt';
import { isMood } from '../../shared/types/Mood';
import { MATCH_END, MATCH_START, type Backlink, type SearchFilters, type SearchResult } from '../../shared/types/Search';
import { markdownToPlainText } from '../../shared/plainText';
import { extractWikilinkTargets, normalizeLinkTarget } from '../../shared/wikilinks';
import { toSummary } from '../vault/VaultAdapter';
import { INDEX_VERSION, SCHEMA } from './schema';

interface EntryRow {
  date: string;
  title: string;
  mood: string | null;
  tags: string;
  excerpt: string;
}

/** SQLite FTS5 index over the vault. Never the source of truth: everything here can be rebuilt from the .md files. */
export class IndexRepository {
  private db: DatabaseSync;

  private constructor(db: DatabaseSync) {
    this.db = db;
  }

  /** Opens the index, or throws it away and starts fresh if it is corrupt or from another schema version. */
  static open(path: string): IndexRepository {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    let existing: DatabaseSync | null = null;
    try {
      existing = new DatabaseSync(path);
      const version = (existing.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
      if (version === INDEX_VERSION) {
        existing.prepare('SELECT count(*) FROM entries').get();
        return new IndexRepository(existing);
      }
    } catch (e) {
      console.warn('Search index unreadable, rebuilding:', (e as Error).message);
    }
    // Close before deleting: Windows refuses to remove a file that is still open.
    try {
      existing?.close();
    } catch {
      // already closed, or never opened
    }
    if (path !== ':memory:') for (const suffix of ['', '-wal', '-shm']) rmSync(path + suffix, { force: true });
    const db = new DatabaseSync(path);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec(SCHEMA);
    db.exec(`PRAGMA user_version = ${INDEX_VERSION}`);
    return new IndexRepository(db);
  }

  close(): void {
    this.db.close();
  }

  mtimes(): Map<string, number> {
    const rows = this.db.prepare('SELECT date, mtime FROM entries').all() as { date: string; mtime: number }[];
    return new Map(rows.map((r) => [r.date, r.mtime]));
  }

  upsert(entry: Entry, mtime: number): void {
    const summary = toSummary(entry);
    this.transaction(() => {
      this.removeRows(entry.date);
      this.db
        .prepare('INSERT INTO entries (date, title, title_key, mood, tags, excerpt, habits, prompt_id, prompt_skipped, mtime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(
          entry.date,
          entry.title,
          normalizeLinkTarget(entry.title),
          entry.mood ?? null,
          JSON.stringify(entry.tags),
          summary.excerpt,
          JSON.stringify(entry.habits_snapshot ?? []),
          entry.prompt_id ?? null,
          entry.prompt_skipped ? 1 : 0,
          mtime,
        );
      const tag = this.db.prepare('INSERT OR IGNORE INTO entry_tags (date, tag) VALUES (?, ?)');
      for (const t of entry.tags) tag.run(entry.date, t.toLowerCase());
      const link = this.db.prepare('INSERT OR IGNORE INTO links (source, target) VALUES (?, ?)');
      for (const target of extractWikilinkTargets(entry.body)) link.run(entry.date, target);
      this.db.prepare('INSERT INTO entries_fts (date, title, body, tags) VALUES (?, ?, ?, ?)').run(entry.date, entry.title, markdownToPlainText(entry.body), entry.tags.join(' '));
    });
  }

  remove(date: string): void {
    this.transaction(() => this.removeRows(date));
  }

  list(range?: DateRange): EntrySummary[] {
    const rows = range
      ? (this.db.prepare('SELECT * FROM entries WHERE date BETWEEN ? AND ? ORDER BY date DESC').all(range.from, range.to) as unknown as EntryRow[])
      : (this.db.prepare('SELECT * FROM entries ORDER BY date DESC').all() as unknown as EntryRow[]);
    return rows.map(rowToSummary);
  }

  /** Days on which at least one habit was completed, oldest first. */
  habitHistory(): HabitDay[] {
    const rows = this.db.prepare("SELECT date, habits FROM entries WHERE habits != '[]' ORDER BY date").all() as { date: string; habits: string }[];
    return rows.map((r) => ({ date: r.date, habits: JSON.parse(r.habits) as string[] }));
  }

  /** Every day a healing prompt was answered or skipped, newest first. */
  promptHistory(): PromptLog[] {
    const rows = this.db.prepare('SELECT date, prompt_id, prompt_skipped FROM entries WHERE prompt_id IS NOT NULL ORDER BY date DESC').all() as {
      date: string;
      prompt_id: string;
      prompt_skipped: number;
    }[];
    return rows.map((r) => ({ prompt_id: r.prompt_id, date: r.date, outcome: r.prompt_skipped ? 'skipped' : 'answered' }));
  }

  tags(): { tag: string; count: number }[] {
    return this.db.prepare('SELECT tag, count(*) AS count FROM entry_tags GROUP BY tag ORDER BY count DESC, tag').all() as { tag: string; count: number }[];
  }

  search(text: string, filters: SearchFilters = {}): SearchResult[] {
    const where: string[] = [];
    const params: (string | number)[] = [];
    const query = toFtsQuery(text);
    if (filters.mood) {
      where.push('e.mood = ?');
      params.push(filters.mood);
    }
    if (filters.range?.from) {
      where.push('e.date >= ?');
      params.push(filters.range.from);
    }
    if (filters.range?.to) {
      where.push('e.date <= ?');
      params.push(filters.range.to);
    }
    for (const tag of filters.tags ?? []) {
      where.push('EXISTS (SELECT 1 FROM entry_tags t WHERE t.date = e.date AND t.tag = ?)');
      params.push(tag.toLowerCase());
    }

    if (query) {
      const sql = `SELECT e.date, e.title, e.mood, e.tags, snippet(entries_fts, 2, '${MATCH_START}', '${MATCH_END}', '…', 24) AS snippet
        FROM entries_fts f JOIN entries e ON e.date = f.date
        WHERE entries_fts MATCH ? ${where.length ? `AND ${where.join(' AND ')}` : ''}
        ORDER BY bm25(entries_fts, 0, 5, 1, 2) LIMIT 200`;
      const rows = this.db.prepare(sql).all(query, ...params) as unknown as (EntryRow & { snippet: string })[];
      const results = rows.map((r) => ({ ...rowToSummary(r), snippet: r.snippet }));
      // Transcribed recordings are findable too; a hit shows up as the day the recording belongs to.
      const seen = new Set(results.map((r) => r.date));
      const tsql = `SELECT e.date, e.title, e.mood, e.tags, snippet(transcripts_fts, 2, '${MATCH_START}', '${MATCH_END}', '…', 24) AS snippet
        FROM transcripts_fts t JOIN entries e ON e.date = t.date
        WHERE transcripts_fts MATCH ? ${where.length ? `AND ${where.join(' AND ')}` : ''}
        ORDER BY bm25(transcripts_fts) LIMIT 200`;
      for (const r of this.db.prepare(tsql).all(query, ...params) as unknown as (EntryRow & { snippet: string })[]) {
        if (seen.has(r.date)) continue;
        seen.add(r.date);
        results.push({ ...rowToSummary(r), snippet: `🎙 ${r.snippet}` });
      }
      return results;
    }
    const sql = `SELECT e.* FROM entries e ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY e.date DESC LIMIT 500`;
    const rows = this.db.prepare(sql).all(...params) as unknown as EntryRow[];
    return rows.map((r) => ({ ...rowToSummary(r), snippet: r.excerpt }));
  }

  /** Replaces every indexed transcript (on vault open, from `.paroh/audio.json`). */
  replaceTranscripts(rows: { id: string; date: string; text: string }[]): void {
    this.transaction(() => {
      this.db.exec('DELETE FROM transcripts_fts');
      const insert = this.db.prepare('INSERT INTO transcripts_fts (id, date, text) VALUES (?, ?, ?)');
      for (const r of rows) if (r.text.trim()) insert.run(r.id, r.date, r.text);
    });
  }

  /** An empty text removes the recording's transcript from the index. */
  setTranscript(id: string, date: string, text: string): void {
    this.transaction(() => {
      this.db.prepare('DELETE FROM transcripts_fts WHERE id = ?').run(id);
      if (text.trim()) this.db.prepare('INSERT INTO transcripts_fts (id, date, text) VALUES (?, ?, ?)').run(id, date, text);
    });
  }

  /** Entries linking here, by date (`[[2026-06-11]]`) or by title (`[[A quiet morning]]`). */
  backlinks(date: string): Backlink[] {
    const row = this.db.prepare('SELECT title_key FROM entries WHERE date = ?').get(date) as { title_key: string } | undefined;
    const keys = [date, ...(row?.title_key ? [row.title_key] : [])];
    const rows = this.db
      .prepare(`SELECT DISTINCT e.date, e.title FROM links l JOIN entries e ON e.date = l.source WHERE l.target IN (${keys.map(() => '?').join(',')}) AND l.source != ? ORDER BY e.date DESC`)
      .all(...keys, date) as unknown as Backlink[];
    return rows;
  }

  /** Resolves a wikilink target to an entry date: a date that exists, else the newest entry with that title. */
  resolveLink(target: string): string | null {
    const key = normalizeLinkTarget(target);
    const byDate = this.db.prepare('SELECT date FROM entries WHERE date = ?').get(key) as { date: string } | undefined;
    if (byDate) return byDate.date;
    const byTitle = this.db.prepare('SELECT date FROM entries WHERE title_key = ? ORDER BY date DESC LIMIT 1').get(key) as { date: string } | undefined;
    return byTitle?.date ?? null;
  }

  private removeRows(date: string): void {
    for (const table of ['entries', 'entry_tags', 'entries_fts']) this.db.prepare(`DELETE FROM ${table} WHERE date = ?`).run(date);
    this.db.prepare('DELETE FROM links WHERE source = ?').run(date);
  }

  private transaction(fn: () => void): void {
    this.db.exec('BEGIN');
    try {
      fn();
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
}

function rowToSummary(r: EntryRow): EntrySummary {
  return { date: r.date, title: r.title, mood: isMood(r.mood) ? r.mood : undefined, tags: JSON.parse(r.tags) as string[], excerpt: r.excerpt };
}

/**
 * Turns what a person types into a safe FTS5 query: each word is quoted (so `-`, `:` and quotes can't
 * become FTS syntax errors) and the last word is a prefix match, so results appear while typing.
 */
export function toFtsQuery(text: string): string {
  const words = text.match(/[\p{L}\p{N}_']+/gu) ?? [];
  return words.map((w, i) => `"${w.replace(/"/g, '""')}"${i === words.length - 1 ? '*' : ''}`).join(' ');
}
