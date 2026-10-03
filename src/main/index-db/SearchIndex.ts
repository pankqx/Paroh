import type { DateRange, Entry, EntrySummary } from '../../shared/types/Entry';
import type { HabitDay } from '../../shared/types/Habit';
import type { PromptLog } from '../../shared/types/Prompt';
import type { Backlink, SearchFilters, SearchResult } from '../../shared/types/Search';

/**
 * The derived, disposable index over the vault (architecture.md §Search & Indexing). Desktop uses
 * SQLite FTS5 (`IndexRepository`); the mobile app, which has no SQLite in its web view, uses the
 * in-memory `MemoryIndex`, rebuilt from the files at launch. Both must answer the same questions alike.
 */
export interface SearchIndex {
  mtimes(): Map<string, number>;
  upsert(entry: Entry, mtime: number): void;
  remove(date: string): void;
  list(range?: DateRange): EntrySummary[];
  habitHistory(): HabitDay[];
  promptHistory(): PromptLog[];
  tags(): { tag: string; count: number }[];
  search(text: string, filters?: SearchFilters): SearchResult[];
  replaceTranscripts(rows: { id: string; date: string; text: string }[]): void;
  setTranscript(id: string, date: string, text: string): void;
  backlinks(date: string): Backlink[];
  resolveLink(target: string): string | null;
  close(): void;
}
