# API — IPC Contract Reference

> This is the single source of truth for every channel between the renderer and main process, mirroring `src/shared/ipc-contract.ts` exactly — if this document and that file ever disagree, the file is buggy and needs fixing, not this document. Every entry here should be directly traceable to a function in `preload/bridge.ts`.

All channels are invoked from the renderer as `window.paroh.<namespace>.<method>(...)`, per `architecture.md` §IPC & Process Boundary. None of these are reachable via a generic `ipcRenderer.invoke` call — only through this explicit, typed surface.

---

## `entries`

| Method | Signature | Description |
|---|---|---|
| `save` | `(entry: Entry) => Promise<Result<Entry, SaveError>>` | Runs the full atomic save pipeline (`architecture.md`) |
| `load` | `(date: string) => Promise<Entry \| null>` | Loads a single entry by date; `null` if none exists |
| `delete` | `(date: string) => Promise<Result<void, DeleteError>>` | Requires prior UI confirmation per `ui-rules.md` Rule 7 |
| `list` | `(range?: DateRange) => Promise<Result<EntrySummary[]>>` | Lightweight list for Calendar/All Entries, served from the index |
| `backlinks` | `(date: string) => Promise<Result<Backlink[]>>` | Entries whose `[[links]]` point here, by date or title |
| `resolveLink` | `(target: string) => Promise<Result<string \| null>>` | Wikilink target to entry date |

## `search`

| Method | Signature | Description |
|---|---|---|
| `query` | `(text: string, filters?: SearchFilters) => Promise<SearchResult[]>` | FTS5-backed, per `architecture.md` §Search & Indexing |
| `rebuildIndex` | `() => Promise<Result<void, IndexError>>` | Manual trigger, also called automatically on detected corruption |
| `tags` | `() => Promise<Result<{ tag: string; count: number }[]>>` | Tag list with counts, for filters |

## `vault`

| Method | Signature | Description |
|---|---|---|
| `info` | `() => Promise<VaultInfo>` | Current vault folder |
| `choose` | `() => Promise<VaultInfo \| null>` | Folder picker; reopens the index for the new vault |
| `onChanged` | `(listener: (change: VaultChange) => void) => () => void` | Entry files changed outside the app, or the vault was switched |

## `habits`

| Method | Signature | Description |
|---|---|---|
| `list` | `() => Promise<Habit[]>` | Includes archived, UI filters as needed |
| `create` | `(habit: Omit<Habit, 'id'>) => Promise<Habit>` | |
| `archive` | `(id: string) => Promise<void>` | Never deletes — see `feature-specifications.md` §6 edge cases |
| `toggleToday` | `(id: string) => Promise<void>` | Only ever affects today's entry frontmatter, never past days |
| `streakFor` | `(id: string) => Promise<number>` | Computed via `renderer/domain/streak.ts`, exposed here for convenience caching |

## `tasks`

| Method | Signature | Description |
|---|---|---|
| `list` | `(group?: 'today' \| 'upcoming' \| 'someday' \| 'done') => Promise<Task[]>` | |
| `create` | `(task: Omit<Task, 'id'>) => Promise<Task>` | |
| `toggle` | `(id: string) => Promise<void>` | |
| `resolveNudge` | `(id: string, action: 'done' \| 'moveToday' \| 'reflect', reflection?: string) => Promise<void>` | Powers the "Did you finish this?" flow |

## `audio`

| Method | Signature | Description |
|---|---|---|
| `startRecording` | `() => Promise<{ recordingId: string }>` | |
| `stopRecording` | `(recordingId: string) => Promise<AudioLog>` | Persists even if interrupted, per Failure Philosophy |
| `list` | `() => Promise<AudioLog[]>` | |
| `linkToEntry` | `(recordingId: string, date: string) => Promise<void>` | |

## `prompts`

| Method | Signature | Description |
|---|---|---|
| `today` | `() => Promise<Prompt>` | Rotation logic per `feature-specifications.md` §5 |
| `skip` | `() => Promise<void>` | Logs skip, does not reroll same-day |
| `history` | `() => Promise<PromptLog[]>` | |
| `selectManually` | `(promptId: string) => Promise<void>` | User override |

## `horizons`

| Method | Signature | Description |
|---|---|---|
| `listStories` | `(lifeArea?: string) => Promise<LifeStory[]>` | |
| `createStory` | `(story: Omit<LifeStory, 'id'>) => Promise<LifeStory>` | |
| `updateStatus` | `(id: string, status: LifeStory['status']) => Promise<void>` | Narrative states only, no percentage field exists to set |
| `linkEntry` | `(storyId: string, date: string) => Promise<void>` | |

## `chapters`

| Method | Signature | Description |
|---|---|---|
| `forMonth` | `(month: string) => Promise<ChapterSummary>` | Fully computed, no persisted store (`feature-specifications.md` §11) |

## `mood`

| Method | Signature | Description |
|---|---|---|
| `setToday` | `(mood: Mood) => Promise<void>` | Creates a stub entry if none exists yet |
| `trend` | `(range: DateRange) => Promise<{ date: string; mood: Mood }[]>` | |

## `vault`

| Method | Signature | Description |
|---|---|---|
| `getPath` | `() => Promise<string>` | |
| `setPath` | `(path: string) => Promise<Result<void, VaultPathError>>` | Refuses non-empty, non-Paroh folders without explicit confirmation |
| `exportZip` | `() => Promise<{ filePath: string }>` | |
| `importZip` | `(filePath: string) => Promise<Result<void, ImportError>>` | |

## `settings`

| Method | Signature | Description |
|---|---|---|
| `get` | `() => Promise<AppSettings>` | |
| `update` | `(patch: Partial<AppSettings>) => Promise<AppSettings>` | Each `aiFeatures` key updated independently, never a bulk "enable all" |

## `ai` (Phase 8+, stubbed until then)

| Method | Signature | Description |
|---|---|---|
| `isEnabled` | `(feature: string) => Promise<boolean>` | Per-feature check, per `security.md`'s consent model |
| `requestSummary` | `(feature: string, payload: unknown) => Promise<Result<string, AIError>>` | Routed through `AIProvider`; rejected entirely if the feature's consent flag is off — this is enforced main-process-side, not just hidden in the renderer |

---

## Event Subscriptions (not request/response — see `architecture.md` §Internal Event Architecture)

| Method | Signature | Description |
|---|---|---|
| `events.subscribe` | `(eventName: DomainEvent, handler: (payload) => void) => Unsubscribe` | Renderer-side subscription to the main-process-originated event bus (e.g., `EntryUpdated` after an external file change is detected) |

---

## Versioning This Contract

Any change to a method's signature is a breaking change to this file and must be called out explicitly in `CHANGELOG.md` and, if it affects the renderer/main boundary in a way that could break a mid-flight operation, considered against `release-plan.md`'s "extra scrutiny" list.


## Phase 4 notes

Only `prompts.history()` exists over IPC; it returns `PromptLog[]` read from the index. Today's prompt, skipping and manual selection are computed in `renderer/domain/healingProgram.ts` and saved as `prompt_id` / `prompt_skipped` on today's entry through `entries.save`, so there is no separate prompt store.

## Phase 3 notes

`habits`, `tasks` and `audio` are implemented as typed in `src/shared/ipc-contract.ts` (that file wins if this one disagrees). Differences from the sketches above: `habits.setArchived(id, archived)` replaces `archive`, `habits.history()` returns completed habit ids per day (streaks are computed in `renderer/domain/streak.ts`), and recording is `audio.begin()` → `audio.append(id, chunk)` every second → `audio.finish(id, seconds)`, with `audio.read(id)` for playback and `audio.rename(id, title)`.
