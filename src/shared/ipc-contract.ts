import type { DateRange, Entry, EntrySummary } from './types/Entry';
import type { Result } from './types/Result';

/** Channel names, `domain:action` per docs/coding-standards.md. */
export const IPC = {
  entriesSave: 'entries:save',
  entriesLoad: 'entries:load',
  entriesDelete: 'entries:delete',
  entriesList: 'entries:list',
  vaultInfo: 'vault:info',
  vaultChoose: 'vault:choose',
} as const;

export interface VaultInfo {
  path: string;
}

/** The typed surface the renderer sees as `window.paroh` (docs/api.md). */
export interface ParohApi {
  entries: {
    save(entry: Entry): Promise<Result<Entry>>;
    load(date: string): Promise<Result<Entry | null>>;
    delete(date: string): Promise<Result<void>>;
    list(range?: DateRange): Promise<Result<EntrySummary[]>>;
  };
  vault: {
    info(): Promise<VaultInfo>;
    choose(): Promise<VaultInfo | null>;
  };
}
