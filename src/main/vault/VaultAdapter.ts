import { mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { isEntryDate, type DateRange, type Entry, type EntrySummary } from '../../shared/types/Entry';
import { err, ok, type Result } from '../../shared/types/Result';
import { markdownToPlainText } from '../../shared/plainText';
import { atomicWrite } from './atomicWrite';
import { parseEntry, serializeEntry } from './frontmatter';

const MONTH_DIR_RE = /^\d{4}-\d{2}$/;

/** The only code that touches the vault on disk (folder-structure.md). */
export class VaultAdapter {
  constructor(readonly root: string) {}

  entryPath(date: string): string {
    return join(this.root, date.slice(0, 7), `${date}.md`);
  }

  async save(entry: Entry): Promise<Result<Entry>> {
    if (!isEntryDate(entry.date)) return err(`Invalid entry date: ${String(entry.date)}`);
    const path = this.entryPath(entry.date);
    const text = serializeEntry(entry);
    try {
      await mkdir(join(this.root, entry.date.slice(0, 7)), { recursive: true });
      await atomicWrite(path, text, (written) => {
        const reparsed = parseEntry(written, entry.date);
        if (!reparsed.ok) return reparsed.error;
        return reparsed.value.body === normalizeBody(entry.body) ? null : 'Body did not round-trip';
      });
    } catch (e) {
      return err(`Could not save ${entry.date}: ${(e as Error).message}`);
    }
    return parseEntry(text, entry.date);
  }

  async load(date: string): Promise<Result<Entry | null>> {
    if (!isEntryDate(date)) return err(`Invalid entry date: ${date}`);
    let text: string;
    try {
      text = await readFile(this.entryPath(date), 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return ok(null);
      return err(`Could not read ${date}: ${(e as Error).message}`);
    }
    return parseEntry(text, date);
  }

  async delete(date: string): Promise<Result<void>> {
    if (!isEntryDate(date)) return err(`Invalid entry date: ${date}`);
    try {
      await rm(this.entryPath(date), { force: true });
      return ok(undefined);
    } catch (e) {
      return err(`Could not delete ${date}: ${(e as Error).message}`);
    }
  }

  /** Every entry file in the vault with its modification time, for keeping the index in sync. */
  async listFiles(): Promise<{ date: string; mtimeMs: number }[]> {
    const files: { date: string; mtimeMs: number }[] = [];
    let months: string[];
    try {
      months = (await readdir(this.root)).filter((m) => MONTH_DIR_RE.test(m));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw e;
    }
    for (const month of months) {
      const dir = join(this.root, month);
      if (!(await stat(dir)).isDirectory()) continue;
      for (const file of await readdir(dir)) {
        const date = file.replace(/\.md$/, '');
        if (!file.endsWith('.md') || !isEntryDate(date) || date.slice(0, 7) !== month) continue;
        files.push({ date, mtimeMs: (await stat(join(dir, file))).mtimeMs });
      }
    }
    return files;
  }

  /** Modification time of an entry's file, or null if it does not exist. */
  async mtime(date: string): Promise<number | null> {
    try {
      return (await stat(this.entryPath(date))).mtimeMs;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }

  /** Newest first, by walking the folders. The app lists through the SQLite index; this is the fallback and the test oracle. */
  async list(range?: DateRange): Promise<Result<EntrySummary[]>> {
    const summaries: EntrySummary[] = [];
    let months: string[];
    try {
      months = (await readdir(this.root)).filter((m) => MONTH_DIR_RE.test(m));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return ok([]);
      return err(`Could not read vault: ${(e as Error).message}`);
    }
    for (const month of months) {
      if (range && (month < range.from.slice(0, 7) || month > range.to.slice(0, 7))) continue;
      const dir = join(this.root, month);
      if (!(await stat(dir)).isDirectory()) continue;
      for (const file of await readdir(dir)) {
        const date = file.replace(/\.md$/, '');
        if (!file.endsWith('.md') || !isEntryDate(date)) continue;
        if (range && (date < range.from || date > range.to)) continue;
        const loaded = await this.load(date);
        // A single unreadable file must not hide the rest of the journal.
        if (!loaded.ok || !loaded.value) continue;
        summaries.push(toSummary(loaded.value));
      }
    }
    summaries.sort((a, b) => (a.date < b.date ? 1 : -1));
    return ok(summaries);
  }
}

function normalizeBody(body: string): string {
  return body.endsWith('\n') || body === '' ? body : `${body}\n`;
}

export function toSummary(entry: Entry): EntrySummary {
  const plain = markdownToPlainText(entry.body);
  return { date: entry.date, title: entry.title, mood: entry.mood, tags: entry.tags, excerpt: plain.slice(0, 180) };
}
