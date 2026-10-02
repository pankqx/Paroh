import type { DateRange, Entry, EntrySummary } from './types/Entry';
import type { Result } from './types/Result';
import type { Backlink, SearchFilters, SearchResult } from './types/Search';

/** Channel names, `domain:action` per docs/coding-standards.md. */
export const IPC = {
  entriesSave: 'entries:save',
  entriesLoad: 'entries:load',
  entriesDelete: 'entries:delete',
  entriesList: 'entries:list',
  entriesBacklinks: 'entries:backlinks',
  entriesResolveLink: 'entries:resolveLink',
  searchQuery: 'search:query',
  searchTags: 'search:tags',
  searchRebuildIndex: 'search:rebuildIndex',
  vaultInfo: 'vault:info',
  vaultChoose: 'vault:choose',
  /** main → renderer: entry files changed outside the app (or the vault itself was switched). */
  vaultChanged: 'vault:changed',
} as const;

export interface VaultInfo {
  path: string;
}

export interface VaultChange {
  dates: string[];
  /** True when the whole vault was swapped for another folder. */
  reset?: boolean;
}

/** The typed surface the renderer sees as `window.paroh` (docs/api.md). */
export interface ParohApi {
  entries: {
    save(entry: Entry): Promise<Result<Entry>>;
    load(date: string): Promise<Result<Entry | null>>;
    delete(date: string): Promise<Result<void>>;
    list(range?: DateRange): Promise<Result<EntrySummary[]>>;
    backlinks(date: string): Promise<Result<Backlink[]>>;
    resolveLink(target: string): Promise<Result<string | null>>;
  };
  search: {
    query(text: string, filters?: SearchFilters): Promise<Result<SearchResult[]>>;
    tags(): Promise<Result<{ tag: string; count: number }[]>>;
    rebuildIndex(): Promise<Result<void>>;
  };
  vault: {
    info(): Promise<VaultInfo>;
    choose(): Promise<VaultInfo | null>;
    /** Returns an unsubscribe function. */
    onChanged(listener: (change: VaultChange) => void): () => void;
  };
}
