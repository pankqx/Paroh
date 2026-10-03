import type { SpeechModelStatus } from './speechModel';
import type { AudioLog } from './types/AudioLog';
import type { EditorsNote } from './types/EditorsNote';
import type { DateRange, Entry, EntrySummary } from './types/Entry';
import type { Habit, HabitColor, HabitDay, HabitFrequency } from './types/Habit';
import type { HorizonsData, LifeStory, LifeStoryInput } from './types/LifeStory';
import type { PromptLog } from './types/Prompt';
import type { Result } from './types/Result';
import type { Backlink, SearchFilters, SearchResult } from './types/Search';
import type { Board, BoardSummary } from './types/Board';
import type { NudgeAction, Priority, Recurrence, Task } from './types/Task';

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
  tasksComment: 'tasks:comment',
  tasksUncomment: 'tasks:uncomment',
  audioBegin: 'audio:begin',
  audioAppend: 'audio:append',
  audioFinish: 'audio:finish',
  audioList: 'audio:list',
  audioRead: 'audio:read',
  audioRename: 'audio:rename',
  audioSetTranscript: 'audio:setTranscript',
  mediaSave: 'media:save',
  mediaRead: 'media:read',
  promptsHistory: 'prompts:history',
  chaptersMonth: 'chapters:month',
  boardsList: 'boards:list',
  boardsLoad: 'boards:load',
  boardsCreate: 'boards:create',
  boardsSave: 'boards:save',
  boardsRemove: 'boards:remove',
  horizonsList: 'horizons:list',
  horizonsSave: 'horizons:save',
  horizonsRemove: 'horizons:remove',
  horizonsAddArea: 'horizons:addArea',
  vaultInfo: 'vault:info',
  vaultChoose: 'vault:choose',
  vaultConfirmChoice: 'vault:confirmChoice',
  vaultReveal: 'vault:reveal',
  vaultExport: 'vault:export',
  vaultImport: 'vault:import',
  /** main → renderer: `{ done, total }` while an export runs. */
  vaultExportProgress: 'vault:exportProgress',
  settingsGet: 'settings:get',
  settingsSetAiFeature: 'settings:setAiFeature',
  settingsSetReminder: 'settings:setReminder',
  settingsCompleteOnboarding: 'settings:completeOnboarding',
  aiSetApiKey: 'ai:setApiKey',
  aiNoteGenerate: 'ai:noteGenerate',
  aiNoteCancel: 'ai:noteCancel',
  aiNoteLoad: 'ai:noteLoad',
  aiNoteSave: 'ai:noteSave',
  aiNoteRemove: 'ai:noteRemove',
  aiModelStatus: 'ai:modelStatus',
  aiModelDownload: 'ai:modelDownload',
  aiModelRemove: 'ai:modelRemove',
  /** main → renderer: speech model download progress and state changes. */
  aiModelChanged: 'ai:modelChanged',
  /** main → renderer: entry files changed outside the app (or the vault itself was switched). */
  vaultChanged: 'vault:changed',
} as const;

export interface VaultInfo {
  path: string;
}

/** Picking a folder that holds unrelated files asks for confirmation before Paroh writes there (§12 Edge Cases). */
export type VaultChoice = { status: 'switched'; path: string } | { status: 'needs-confirm'; path: string; sample: string[] };

export interface SettingsView {
  vaultPath: string;
  onboarded: boolean;
  aiFeatures: Record<string, boolean>;
  reminderTime?: string;
  version: string;
  /** True once an Anthropic API key is stored (encrypted). The key itself never comes back to the renderer. */
  hasApiKey: boolean;
  /** False when the OS has no keyring, so the stored key is only obscured, not encrypted. */
  apiKeyEncrypted: boolean;
}

/** A draft from Claude, not yet saved anywhere (architecture.md: nothing is written until the person accepts it). */
export interface EditorsNoteDraft {
  month: string;
  text: string;
  model: string;
  entryCount: number;
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
  color?: HabitColor;
}

export interface TaskInput {
  text: string;
  dueDate?: string;
  recurring?: Recurrence;
  notes?: string;
  priority?: Priority;
}

/** Which shell is running the renderer. The phone app has no folder picker, export, reminders or AI yet. */
export type Platform = 'desktop' | 'mobile';

/** The typed surface the renderer sees as `window.paroh` (docs/api.md). */
export interface ParohApi {
  platform: Platform;
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
    comment(id: string, text: string): Promise<Result<Task>>;
    uncomment(id: string, commentId: string): Promise<Result<Task>>;
  };
  audio: {
    begin(): Promise<Result<{ id: string }>>;
    append(id: string, chunk: Uint8Array): Promise<Result<void>>;
    finish(id: string, durationSeconds: number): Promise<Result<AudioLog>>;
    list(): Promise<Result<AudioLog[]>>;
    read(id: string): Promise<Result<Uint8Array>>;
    rename(id: string, title: string): Promise<Result<void>>;
    /** Stores text the renderer transcribed on-device; an empty string removes it. */
    setTranscript(id: string, text: string): Promise<Result<AudioLog>>;
  };
  media: {
    /** Copies a photo, video or sound file into `media/YYYY-MM/` and returns its vault-relative path. */
    save(fileName: string, bytes: Uint8Array): Promise<Result<{ path: string }>>;
    read(path: string): Promise<Result<Uint8Array>>;
  };
  prompts: {
    /** Answered and skipped healing prompts, newest first, read from entry frontmatter. */
    history(): Promise<Result<PromptLog[]>>;
  };
  chapters: {
    /** That month's entries with full bodies, read from the files (Chapters is computed in the renderer). */
    month(month: string): Promise<Result<Entry[]>>;
  };
  boards: {
    list(): Promise<Result<BoardSummary[]>>;
    load(id: string): Promise<Result<Board>>;
    create(title: string): Promise<Result<Board>>;
    /** Replaces the whole board; returns it with the new `updatedAt`. */
    save(board: Board): Promise<Result<Board>>;
    remove(id: string): Promise<Result<void>>;
  };
  horizons: {
    list(): Promise<Result<HorizonsData>>;
    /** Creates a story, or updates the one with `id`. */
    save(input: LifeStoryInput, id?: string): Promise<Result<LifeStory>>;
    remove(id: string): Promise<Result<void>>;
    /** Returns the new area's folder name. */
    addArea(name: string): Promise<Result<string>>;
  };
  settings: {
    get(): Promise<SettingsView>;
    setAiFeature(id: string, on: boolean): Promise<Result<void>>;
    /** `null` turns the reminder off. */
    setReminder(time: string | null): Promise<Result<void>>;
    completeOnboarding(): Promise<void>;
  };
  ai: {
    /** Stores the key encrypted with the OS keyring; `null` forgets it. */
    setApiKey(key: string | null): Promise<Result<void>>;
    note: {
      /** Asks Claude for a draft. Refused unless the Editor's Note switch is on and a key is stored. */
      generate(month: string): Promise<Result<EditorsNoteDraft>>;
      cancel(): Promise<void>;
      load(month: string): Promise<Result<EditorsNote | null>>;
      save(draft: EditorsNoteDraft): Promise<Result<EditorsNote>>;
      remove(month: string): Promise<Result<void>>;
    };
    model: {
      status(): Promise<SpeechModelStatus>;
      /** Refused unless the transcription switch is on. Progress arrives through `onChanged`. */
      download(): Promise<Result<void>>;
      remove(): Promise<Result<void>>;
      onChanged(listener: (status: SpeechModelStatus) => void): () => void;
    };
  };
  vault: {
    info(): Promise<VaultInfo>;
    choose(): Promise<VaultChoice | null>;
    /** Switches to the folder the last `choose()` asked about. */
    confirmChoice(): Promise<VaultChoice | null>;
    reveal(): Promise<string>;
    export(): Promise<Result<{ path: string; files: number; bytes: number } | null>>;
    import(): Promise<Result<{ path: string; files: number } | null>>;
    onExportProgress(listener: (p: { done: number; total: number }) => void): () => void;
    /** Returns an unsubscribe function. */
    onChanged(listener: (change: VaultChange) => void): () => void;
  };
}
