import type { AudioLog } from './types/AudioLog';
import type { DateRange, Entry, EntrySummary } from './types/Entry';
import type { Habit, HabitDay, HabitFrequency } from './types/Habit';
import type { PromptLog } from './types/Prompt';
import type { Result } from './types/Result';
import type { Backlink, SearchFilters, SearchResult } from './types/Search';
import type { NudgeAction, Recurrence, Task } from './types/Task';

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
  habitsList: 'habits:list',
  habitsCreate: 'habits:create',
  habitsUpdate: 'habits:update',
  habitsSetArchived: 'habits:setArchived',
  habitsToggleToday: 'habits:toggleToday',
  habitsHistory: 'habits:history',
  tasksList: 'tasks:list',
  tasksCreate: 'tasks:create',
  tasksUpdate: 'tasks:update',
  tasksToggle: 'tasks:toggle',
  tasksResolveNudge: 'tasks:resolveNudge',
  tasksRemove: 'tasks:remove',
  audioBegin: 'audio:begin',
  audioAppend: 'audio:append',
  audioFinish: 'audio:finish',
  audioList: 'audio:list',
  audioRead: 'audio:read',
  audioRename: 'audio:rename',
  promptsHistory: 'prompts:history',
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

export interface HabitInput {
  name: string;
  frequency: HabitFrequency;
  customDays?: number[];
}

export interface TaskInput {
  text: string;
  dueDate?: string;
  recurring?: Recurrence;
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
  habits: {
    list(): Promise<Result<Habit[]>>;
    create(input: HabitInput): Promise<Result<Habit>>;
    update(id: string, input: HabitInput): Promise<Result<Habit>>;
    setArchived(id: string, archived: boolean): Promise<Result<Habit>>;
    /** Only ever today; returns today's completed habit ids. */
    toggleToday(id: string): Promise<Result<string[]>>;
    history(): Promise<Result<HabitDay[]>>;
  };
  tasks: {
    list(): Promise<Result<Task[]>>;
    create(input: TaskInput): Promise<Result<Task>>;
    update(id: string, input: TaskInput): Promise<Result<Task>>;
    toggle(id: string): Promise<Result<Task>>;
    resolveNudge(id: string, action: NudgeAction, reflection?: string): Promise<Result<Task>>;
    remove(id: string): Promise<Result<void>>;
  };
  audio: {
    begin(): Promise<Result<{ id: string }>>;
    append(id: string, chunk: Uint8Array): Promise<Result<void>>;
    finish(id: string, durationSeconds: number): Promise<Result<AudioLog>>;
    list(): Promise<Result<AudioLog[]>>;
    read(id: string): Promise<Result<Uint8Array>>;
    rename(id: string, title: string): Promise<Result<void>>;
  };
  prompts: {
    /** Answered and skipped healing prompts, newest first, read from entry frontmatter. */
    history(): Promise<Result<PromptLog[]>>;
  };
  vault: {
    info(): Promise<VaultInfo>;
    choose(): Promise<VaultInfo | null>;
    /** Returns an unsubscribe function. */
    onChanged(listener: (change: VaultChange) => void): () => void;
  };
}
