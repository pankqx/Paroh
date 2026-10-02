import { watch, type FSWatcher } from 'node:fs';
import { join, sep } from 'node:path';
import { isEntryDate, type DateRange, type Entry, type EntrySummary } from '../shared/types/Entry';
import type { PromptLog } from '../shared/types/Prompt';
import type { HabitDay } from '../shared/types/Habit';
import { err, ok, type Result } from '../shared/types/Result';
import type { Backlink, SearchFilters, SearchResult } from '../shared/types/Search';
import { IndexRepository } from './index-db/IndexRepository';
import { VaultAdapter } from './vault/VaultAdapter';

/**
 * Keeps the Markdown vault (source of truth) and the SQLite index (disposable) in step.
 * Every write goes to the file first; the index only ever follows what is on disk.
 */
export class EntryService {
  private watcher?: FSWatcher;
  private pending = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    readonly vault: VaultAdapter,
    private index: IndexRepository,
  ) {}

  static async open(root: string, indexPath = join(root, '.paroh', 'index.db')): Promise<EntryService> {
    const service = new EntryService(new VaultAdapter(root), IndexRepository.open(indexPath));
    await service.sync();
    return service;
  }

  get root(): string {
    return this.vault.root;
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

  /**
   * Watches for entries changed outside Paroh (another editor, a sync tool). Our own saves are
   * recognised because the index already holds that file's mtime, so they don't echo back.
   */
  watch(onChange: (dates: string[]) => void): void {
    this.watcher = watch(this.root, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      const parts = filename.toString().split(sep);
      const file = parts[parts.length - 1];
      const date = file.replace(/\.md$/, '');
      if (parts.length !== 2 || !file.endsWith('.md') || !isEntryDate(date) || parts[0] !== date.slice(0, 7)) return;
      clearTimeout(this.pending.get(date));
      this.pending.set(
        date,
        setTimeout(() => {
          this.pending.delete(date);
          void this.handleExternalChange(date).then((changed) => changed && onChange([date]));
        }, 250),
      );
    });
    this.watcher.on('error', (e) => console.error('Vault watcher stopped:', e.message));
  }

  close(): void {
    this.watcher?.close();
    for (const t of this.pending.values()) clearTimeout(t);
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

  private async reindex(date: string): Promise<void> {
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
