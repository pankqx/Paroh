import { isNotFound, type VaultFs } from '../../shared/fs/VaultFs';
import { isEntryDate, type DateRange, type Entry, type EntrySummary } from '../../shared/types/Entry';
import { err, ok, type Result } from '../../shared/types/Result';
import { markdownToPlainText } from '../../shared/plainText';
import { parseEntry, serializeEntry } from './frontmatter';

const MONTH_DIR_RE = /^\d{4}-\d{2}$/;

/** The only code that touches entry files (folder-structure.md), on whichever filesystem `fs` is. */
export class VaultAdapter {
  constructor(readonly fs: VaultFs) {}

  get root(): string {
    return this.fs.root;
  }

  entryPath(date: string): string {
    return `${date.slice(0, 7)}/${date}.md`;
  }

  async save(entry: Entry): Promise<Result<Entry>> {
    if (!isEntryDate(entry.date)) return err(`Invalid entry date: ${String(entry.date)}`);
    const path = this.entryPath(entry.date);
    const text = serializeEntry(entry);
    try {
      await this.fs.mkdir(entry.date.slice(0, 7));
      await this.fs.writeTextAtomic(path, text, (written) => {
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
      text = await this.fs.readText(this.entryPath(date));
    } catch (e) {
      if (isNotFound(e)) return ok(null);
      return err(`Could not read ${date}: ${(e as Error).message}`);
    }
    return parseEntry(text, date);
  }

  async delete(date: string): Promise<Result<void>> {
    if (!isEntryDate(date)) return err(`Invalid entry date: ${date}`);
    try {
      await this.fs.remove(this.entryPath(date));
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
      months = (await this.fs.list('')).filter((m) => MONTH_DIR_RE.test(m));
    } catch (e) {
      if (isNotFound(e)) return [];
      throw e;
    }
    for (const month of months) {
      if (!(await this.fs.stat(month)).isDirectory) continue;
      for (const file of await this.fs.list(month)) {
        const date = file.replace(/\.md$/, '');
        if (!file.endsWith('.md') || !isEntryDate(date) || date.slice(0, 7) !== month) continue;
        files.push({ date, mtimeMs: (await this.fs.stat(`${month}/${file}`)).mtimeMs });
      }
    }
    return files;
  }

  /** Every readable entry in one month folder, oldest first, read straight from disk (Chapters needs full bodies). */
  async loadMonth(month: string): Promise<Result<Entry[]>> {
    if (!MONTH_DIR_RE.test(month)) return err(`Invalid month: ${month}`);
    let files: string[];
    try {
      files = await this.fs.list(month);
    } catch (e) {
      if (isNotFound(e)) return ok([]);
      return err(`Could not read ${month}: ${(e as Error).message}`);
    }
    const entries: Entry[] = [];
    for (const file of files.sort()) {
      const date = file.replace(/\.md$/, '');
      if (!file.endsWith('.md') || !isEntryDate(date) || date.slice(0, 7) !== month) continue;
      const loaded = await this.load(date);
      if (loaded.ok && loaded.value) entries.push(loaded.value);
    }
    return ok(entries);
  }

  /** Modification time of an entry's file, or null if it does not exist. */
  async mtime(date: string): Promise<number | null> {
    try {
      return (await this.fs.stat(this.entryPath(date))).mtimeMs;
    } catch (e) {
      if (isNotFound(e)) return null;
      throw e;
    }
  }

  /** Newest first, by walking the folders. The app lists through the SQLite index; this is the fallback and the test oracle. */
  async list(range?: DateRange): Promise<Result<EntrySummary[]>> {
    const summaries: EntrySummary[] = [];
    let months: string[];
    try {
      months = (await this.fs.list('')).filter((m) => MONTH_DIR_RE.test(m));
    } catch (e) {
      if (isNotFound(e)) return ok([]);
      return err(`Could not read vault: ${(e as Error).message}`);
    }
    for (const month of months) {
      if (range && (month < range.from.slice(0, 7) || month > range.to.slice(0, 7))) continue;
      if (!(await this.fs.stat(month)).isDirectory) continue;
      for (const file of await this.fs.list(month)) {
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
