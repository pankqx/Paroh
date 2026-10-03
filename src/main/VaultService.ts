import type { VaultFs } from '../shared/fs/VaultFs';
import type { DateRange, Entry, EntrySummary } from '../shared/types/Entry';
import type { PromptLog } from '../shared/types/Prompt';
import type { HabitDay } from '../shared/types/Habit';
import { err, ok, type Result } from '../shared/types/Result';
import type { Backlink, SearchFilters, SearchResult } from '../shared/types/Search';
import type { SearchIndex } from './index-db/SearchIndex';
import { VaultAdapter } from './vault/VaultAdapter';

/**
 * Keeps the Markdown vault (source of truth) and the index (disposable) in step. Platform-neutral:
 * the desktop gives it Node's filesystem and SQLite (`EntryService`), the mobile app Capacitor's
 * filesystem and an in-memory index. Every write goes to the file first; the index only follows.
 */
export class VaultService {
  readonly vault: VaultAdapter;

  constructor(
    readonly fs: VaultFs,
    protected index: SearchIndex,
  ) {
    this.vault = new VaultAdapter(fs);
  }

  static async create(fs: VaultFs, index: SearchIndex): Promise<VaultService> {
    const service = new VaultService(fs, index);
    await service.sync();
    return service;
  }

  get root(): string {
    return this.vault.root;
  }

  /** Each indexed entry's modification time, to tell what a `sync()` changed. */
  mtimeSnapshot(): Map<string, number> {
    return this.index.mtimes();
  }

  /** Brings the index up to date with the files: only new, changed or deleted files are touched. */
  async sync(): Promise<void> {
    const files = await this.vault.listFiles();
    const indexed = this.index.mtimes();
    const onDisk = new Set(files.map((f) => f.date));
    for (const date of indexed.keys()) if (!onDisk.has(date)) this.index.remove(date);
    for (const f of files) if (indexed.get(f.date) !== f.mtimeMs) await this.reindex(f.date);
  }

  async save(entry: Entry): Promise<Result<Entry>> {
    const saved = await this.vault.save(entry);
    if (saved.ok) await this.reindex(entry.date);
    return saved;
  }

  /** Recording transcripts live in `.paroh/audio.json`, not in entries; the index keeps them searchable. */
  indexTranscripts(rows: { id: string; date: string; text: string }[]): void {
    this.index.replaceTranscripts(rows);
  }

  indexTranscript(id: string, date: string, text: string): void {
    this.index.setTranscript(id, date, text);
  }

  monthEntries(month: string): Promise<Result<Entry[]>> {
    return this.vault.loadMonth(String(month));
  }

  load(date: string): Promise<Result<Entry | null>> {
    return this.vault.load(date);
  }

  async delete(date: string): Promise<Result<void>> {
    const deleted = await this.vault.delete(date);
    if (deleted.ok) this.index.remove(date);
    return deleted;
  }

  list(range?: DateRange): Result<EntrySummary[]> {
    return this.guard(() => this.index.list(range));
  }

  search(text: string, filters?: SearchFilters): Result<SearchResult[]> {
    return this.guard(() => this.index.search(text, filters));
  }

  tags(): Result<{ tag: string; count: number }[]> {
    return this.guard(() => this.index.tags());
  }

  habitHistory(): Result<HabitDay[]> {
    return this.guard(() => this.index.habitHistory());
  }

  promptHistory(): Result<PromptLog[]> {
    return this.guard(() => this.index.promptHistory());
  }

  backlinks(date: string): Result<Backlink[]> {
    return this.guard(() => this.index.backlinks(date));
  }

  resolveLink(target: string): Result<string | null> {
    return this.guard(() => this.index.resolveLink(target));
  }

  async rebuildIndex(): Promise<Result<void>> {
    try {
      for (const date of this.index.mtimes().keys()) this.index.remove(date);
      await this.sync();
      return ok(undefined);
    } catch (e) {
      return err(`Could not rebuild the search index: ${(e as Error).message}`);
    }
  }

  close(): void {
    this.index.close();
  }

  /** Returns true when the change was not one we already knew about. */
  async handleExternalChange(date: string): Promise<boolean> {
    const mtime = await this.vault.mtime(date);
    const known = this.index.mtimes().get(date);
    if (mtime === null) {
      if (known === undefined) return false;
      this.index.remove(date);
      return true;
    }
    if (mtime === known) return false;
    await this.reindex(date);
    return true;
  }

  protected async reindex(date: string): Promise<void> {
    const [loaded, mtime] = await Promise.all([this.vault.load(date), this.vault.mtime(date)]);
    // An unreadable file drops out of the index rather than taking search down with it.
    if (!loaded.ok || !loaded.value || mtime === null) return this.index.remove(date);
    this.index.upsert(loaded.value, mtime);
  }

  private guard<T>(fn: () => T): Result<T> {
    try {
      return ok(fn());
    } catch (e) {
      return err(`Search index error: ${(e as Error).message}`);
    }
  }
}
