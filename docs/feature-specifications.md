# Feature Specifications

> This is where every feature stops being a paragraph in `PRODUCT.md` and becomes something a contributor can implement without guessing. Each feature follows the same template. If a section feels like it doesn't apply, write "N/A — because X," don't skip it silently; an empty section reads as forgotten, not intentional.

**Template used throughout:** Purpose → User Stories → Screen Layout → Interactions → Keyboard Shortcuts → Animations → Accessibility → Data Model → Markdown Format → Edge Cases → Empty State → Errors → Future Ideas → Acceptance Criteria

---

## 1. Daily Opener

### Purpose
The literal front door of the app. Sets emotional tone before a single word is written and converts "I opened the app" into "I'm about to write."

### User Stories
- As a user who dreads a blank page, I want something to look at first so writing feels like a continuation, not a cold start.
- As a returning user, I want the opener to feel different each day so the app doesn't go stale.

### Screen Layout
Full-bleed image (curated photo or wholesome illustration) with a scrim gradient (`--editor-hero-overlay`), serif headline (`--text-hero`) quote or affirmation centered-left, attribution line below in `--text-small`, primary button "Write today's entry," ghost button "New quote."

### Interactions
- Opens automatically on first launch after local midnight, or first launch of a fresh session
- "New quote" rerolls without leaving the screen, from the local `assets/openers/quotes.json` bank, excluding the last 14 days shown (no-repeat window)
- "Write today's entry" → opens the Editor for today's date, blank unless a Healing Prompt has been selected for today (see Feature 5)

### Keyboard Shortcuts
`Enter` = Write today's entry (when opener has focus). `R` = New quote.

### Animations
150ms fade-in on load. No auto-advancing carousel — the user controls pacing entirely, per Motion Principles in `design-system.md`.

### Accessibility
Image has descriptive alt text pulled from the asset's metadata. Quote text and attribution are real DOM text, not baked into the image, so screen readers read them.

### Data Model
```ts
interface OpenerContent {
  id: string;
  type: 'quote' | 'illustration';
  text?: string;        // for quotes
  attribution?: string;
  imagePath: string;    // local asset path, never a remote URL
}
```
No entry file is created by viewing the opener — it's stateless except for the "last 14 days shown" rotation log, kept in `.paroh/config.json`, not the vault proper.

### Markdown Format
N/A — not vault content.

### Edge Cases
- Quote bank exhausted within the 14-day no-repeat window (small bank, active user) → repeat allowed, oldest-shown-first
- User opens app multiple times same day → opener shows once per calendar day, subsequent opens go straight to Canvas

### Empty State
N/A — the bank ships with ~50 curated entries at launch; an empty bank is a build error, not a runtime state.

### Errors
Missing/corrupt image asset → falls back to a solid `--canvas-contrast-bg` background with the quote text alone; never shows a broken-image icon.

### Future Ideas
User-supplied personal quote/photo bank (tracked in `future-ideas.md`).

### Acceptance Criteria
- [ ] Opener shows exactly once per calendar day on first launch
- [ ] "New quote" never repeats a quote shown in the last 14 days unless the bank is smaller than 14
- [ ] Works fully offline
- [ ] Missing asset never crashes or shows a broken image

---

## 2. Mood Check-In

### Purpose
The single fastest way to log emotional state — one tap, feeds three other features (Calendar, Chapters, mood trend) without asking the user to think about it twice.

### User Stories
- As a user who doesn't feel like writing, I still want a way to log how I'm doing in one tap.
- As a user reviewing my month, I want to see my mood pattern without having read every entry.

### Screen Layout
Card titled "How are you today?", five circular emoji buttons (Low/Sad/Meh/Ok/Good) per `design-system.md`'s Mood Selector component, small filled dot beneath the selected mood.

### Interactions
One tap selects and immediately persists — no confirm step, no save button. Tapping a different mood the same day overwrites, doesn't stack.

### Keyboard Shortcuts
`1`–`5` when the card has focus, mapped Low→Good.

### Animations
100ms scale-and-settle on selection (Motion Principles).

### Accessibility
Each button has an `aria-label` naming the mood word, not just the emoji. Selected state conveyed by both the filled dot *and* `aria-pressed`, not color alone.

### Data Model
Stored as a field on that day's entry frontmatter — mood is not a separate file:
```ts
type Mood = 'low' | 'sad' | 'meh' | 'ok' | 'good';
```

### Markdown Format
```yaml
mood: sad
```
If no entry exists yet for today when mood is logged, a minimal entry file is created (empty body, just frontmatter) — logging mood should never be blocked on writing prose first.

### Edge Cases
- User logs mood before writing anything that day → creates a stub entry; if they later write and save, the stub is updated in place, not duplicated
- User changes mood after already writing → frontmatter updates, body untouched

### Empty State
No mood logged yet today → all five buttons shown unselected, no dot.

### Errors
Save failure (disk full, etc.) → mood selection visually reverts, inline error shown ("Couldn't save — try again"), per Failure Philosophy in `architecture.md`.

### Future Ideas
Optional secondary "what's driving this?" micro-tag, shown only if the user taps the mood a second time (never forced).

### Acceptance Criteria
- [ ] One tap persists with no additional confirmation
- [ ] Creates a stub entry if none exists yet for the day
- [ ] Never blocks or requires the user to write prose first
- [ ] Reflected on the Calendar and Chapters within the same session, no refresh needed

---

## 3. Calendar (Mini + Full Page)

### Purpose
Spatial memory for the practice — "did I show up" made visible at a glance, and the fastest way to jump to any day.

### User Stories
- As a user building a habit, I want to see my consistency at a glance without counting.
- As a user looking for a specific memory, I want to jump straight to a date instead of scrolling a list.

### Screen Layout
Mini version (Canvas card): month grid, prev/next arrows, today highlighted filled. Full page: month/week/agenda view toggle, same dot/highlight language, larger cells with room for mood-tinted dots once Phase 3 ships.

### Interactions
Click any date → opens that day's entry if one exists, or a blank Editor pre-dated to that day if not. Arrows navigate months; a "Today" button jumps back instantly from anywhere.

### Keyboard Shortcuts
Arrow keys move focus a day at a time when the calendar has focus; `Enter` opens the focused date; `T` jumps to today.

### Animations
Month transitions cross-fade 150ms, no slide (Motion Principles) — sliding implies a spatial "next month is to the right" metaphor this calendar doesn't otherwise use.

### Accessibility
Full keyboard navigability (arrow keys + Enter, above) is required, not optional, since this is a primary navigation surface. Each date cell's `aria-label` includes the full date plus "has entry" / "no entry" plus mood word if logged.

### Data Model
Read-only view over the SQLite index (`architecture.md` §Search & Indexing) — queries `entries` table for `date`, `has_entry`, `mood`. No new data model of its own.

### Markdown Format
N/A — derived view.

### Edge Cases
- Very first month a user has ever used Paroh → most cells empty, no dots; this is expected, not treated as an error state
- Leap years, months with 5-week spans → grid layout must handle 4–6 week rows without visual jumps between months

### Empty State
A month with zero entries shows a plain grid, no dots, no special messaging — the absence itself is the information; adding a nagging "no entries this month!" banner would violate the "no punishment for gaps" principle in `vision.md`.

### Errors
Index unavailable/corrupted → falls back to a live filesystem scan for just the visible month (slower, but the calendar must never simply fail to render).

### Future Ideas
Mood-tinted dots (Phase 3), habit-completion ring around the date cell.

### Acceptance Criteria
- [ ] Every date with a saved entry shows a dot, no exceptions, no caching lag beyond one index update cycle
- [ ] Today is always visually distinct
- [ ] Fully keyboard-navigable
- [ ] A month with zero entries never shows guilt-inducing copy

---

## 4. Entry Editor

### Purpose
The core writing surface — has to out-perform Word/Notion/Obsidian for this specific job: fast, warm, honest daily writing.

### User Stories
- As a user, I want rich formatting available without it getting in the way of just writing.
- As a user, I want my writing saved automatically so I never think about "did I save."
- As a returning user, I want to link this entry to past ones that relate to it.

### Screen Layout
Per `PRODUCT.md` and `design-system.md`: top bar (back, Journal/Blog tab, date + save-status, Preview/Share/Publish), left formatting rail, center writing column (hero image optional, serif title, editorial body), right metadata rail (mood, tags, visibility, word count, read time).

### Interactions
- Slash command (`/`) opens a block-insert menu (image, quote, divider, table, to-do, wikilink)
- Selecting text shows a floating format bubble (bold/italic/link/highlight)
- `[[` triggers wikilink autocomplete against existing entry titles/dates
- Autosave on a debounced pause in typing (~2s of no keystrokes), not every keystroke, per Performance Philosophy

### Keyboard Shortcuts
Standard: `Ctrl/Cmd+B/I/U`, `Ctrl/Cmd+K` link, `Ctrl/Cmd+S` force-save (even though autosave exists — some users want the reassurance), `Esc` returns to Canvas.

### Animations
Toolbar active-state tint (accent color) is instant, not animated — state indicators shouldn't lag. Save-status text ("Saved 2s ago") fades in per Motion Principles.

### Accessibility
Full toolbar operable via keyboard, not just click. Every formatting button has a text label available to screen readers even though visually icon-only.

### Data Model
```ts
interface Entry {
  schema_version: number;
  date: string;               // ISO date, also the filename
  title: string;               // first H1, or auto-derived from first line if none
  mood?: Mood;
  tags: string[];
  visibility: 'private' | 'public';
  habits_snapshot: string[];   // habit ids completed as of save time
  audio: string[];             // relative paths into vault/audio/
  prompt_id?: string;
  prompt_skipped?: boolean;
  body: string;                // Markdown
}
```

### Markdown Format
See `folder-structure.md`'s vault section and `architecture.md` §Data Integrity for the full frontmatter example — this is the canonical shape referenced by every other feature.

### Edge Cases
- Two windows/instances editing the same day's entry (unlikely in v1, single-window app, but the file-watcher must still handle an external edit gracefully) → last atomic write wins, no silent data loss, a "this file changed elsewhere" notice appears if a conflict is detected on save
- Extremely long entries (multi-thousand words) → editor must not degrade in typing latency; virtualize rendering if needed
- Pasting rich content from Word/Google Docs → sanitized down to supported Markdown-representable formatting, not raw HTML dumped into the vault file

### Empty State
Blank entry: cursor in the title field, placeholder "Untitled" in `--editor-text-secondary`, hero image slot shown as a subtle dashed-border add-image affordance, not a big empty gray box.

### Errors
See `architecture.md`'s Failure Philosophy table — disk full, invalid Markdown, corrupted YAML all handled per that table; this feature is where those failures are actually surfaced to the user.

### Future Ideas
Focus mode (hides toolbar/metadata rail entirely), version history per entry.

### Acceptance Criteria
- [ ] Every supported format round-trips losslessly to Markdown and back
- [ ] Autosave never loses more than ~2 seconds of typing on crash
- [ ] Wikilinks resolve and are clickable immediately after save
- [ ] Works fully offline, including all formatting

---

## 5. Healing Prompts (CBT Engine)

### Purpose
The therapeutic core of the app — turns "I should journal" into "here's exactly what to think about today," structured across a 6-month program (`PRODUCT.md` §3.4 and §3.5).

### User Stories
- As a user without therapy experience, I want the app to tell me what to reflect on so I don't have to design my own practice.
- As a user in therapy, I want prompts that complement what I'm working on with my therapist.
- As a user not ready for a specific topic, I want to skip without guilt.

### Screen Layout
Canvas card: category label, prompt text, "Write about it" / "Skip." Full page: browse by category/week-block, prompt history (answered vs. skipped, with dates), manual override to pick today's prompt.

### Interactions
"Write about it" opens the Editor with the prompt text pre-inserted as a styled blockquote at the top of a fresh entry. "Skip" logs the skip and rotates to tomorrow's scheduled prompt (doesn't show a different one today — skipping isn't "shuffle").

### Keyboard Shortcuts
`W` = Write about it, `S` = Skip, when the card has focus.

### Animations
None beyond standard card hover — this is a low-motion, low-pressure surface intentionally.

### Accessibility
Prompt text is always real, selectable text (screen-reader friendly), category label conveyed via text, not color alone.

### Data Model
```ts
interface Prompt {
  id: string;
  week_block: number;      // 1–24
  category: 'noticing' | 'restructuring' | 'social-anxiety' | 'behavioral-activation' | 'self-compassion' | 'relapse-proofing';
  text: string;
  followups?: string[];
}
interface PromptLog {
  prompt_id: string;
  date: string;
  outcome: 'answered' | 'skipped';
}
```
`Prompt[]` lives in `assets/prompts.json` (bundled, versionable, not hardcoded in components, per `architecture.md`'s plugin-seam reasoning). `PromptLog[]` is derived from `prompt_id`/`prompt_skipped` fields already present in entry frontmatter — no separate log file needed.

### Markdown Format
```yaml
prompt_id: social-anxiety-002
prompt_skipped: false
```

### Edge Cases
- User is on week 30 (past the 24-week program) → program loops back to week 1's category rotation with a friendly one-time note acknowledging they've completed a full cycle, not an error state
- User manually picks a prompt from a future week-block → allowed; program guidance is a default path, not a locked gate

### Empty State
N/A — a prompt is always available once the program data ships; there's no "no prompt today" state by design.

### Errors
`prompts.json` fails to load/parse → falls back to a small hardcoded emergency set of 5 generic prompts bundled directly in code, so this feature can never go fully blank.

### Future Ideas
AI-personalized prompt selection based on recent entry themes (behind `CloudAIProvider`, opt-in only).

### Acceptance Criteria
- [ ] Skipping never shows a replacement prompt same-day
- [ ] Prompt history accurately reflects answered vs. skipped per date
- [ ] Program advances one week-block roughly every 7 days of app use, not calendar days (so a user who's inactive for 2 weeks doesn't "lose" progress)
- [ ] Fully offline

---

## 6. Habit Tracker

### Purpose
Builds the small daily behaviors CBT research treats as protective (routine, movement, reduced avoidance) without turning them into a productivity scoreboard.

### User Stories
- As a user, I want to define my own habits, not be stuck with generic ones.
- As a user having a hard week, I want a missed day to feel like data, not failure.

### Screen Layout
Canvas card: checklist with strikethrough-on-complete, progress bar, "X% complete — keep going!" Full page: full CRUD, per-habit streak, calendar heatmap (GitHub-contributions style).

### Interactions
Tap to toggle complete/incomplete for today only — past days' habit completion is read-only history, not editable retroactively (protects the integrity of the streak as an honest record).

### Keyboard Shortcuts
`J`/`K` or arrow keys to move focus between habits, `Space`/`Enter` to toggle.

### Animations
Checkbox check: 100ms, strikethrough draws in over 150ms (a small, satisfying but non-flashy confirmation).

### Accessibility
Checkbox state conveyed via `aria-checked`, strikethrough is decorative only, never the sole indicator of state.

### Data Model
```ts
interface Habit {
  id: string;
  name: string;
  icon: string;          // lucide icon name
  frequency: 'daily' | 'weekdays' | 'custom';
  customDays?: number[];  // 0-6 if frequency is custom
  createdAt: string;
  archived: boolean;
}
```
Habit definitions live in `.paroh/habits.json` (config-like, not per-entry). Daily completion is recorded in each day's entry frontmatter (`habits_snapshot`), so history is naturally derived from existing entry files — no separate completion-log file to keep in sync.

### Markdown Format
```yaml
habits_snapshot: [morning-pages, meditation, gratitude-list]
```

### Edge Cases
- Habit deleted after being logged in past entries → past entries keep their historical `habits_snapshot` values untouched (history isn't rewritten); the Habits page shows it as "archived" with its heatmap intact, just not toggleable going forward
- User toggles a habit off after already saving today → immediately updates today's stub/entry frontmatter, no separate save step

### Empty State
No habits defined yet → friendly prompt to add the first one, with the seeded defaults (Morning pages, 10-min meditation, No social media, Walk outside, Gratitude list) offered as one-tap adds, not force-added.

### Errors
Save failure while toggling → same pattern as Mood Check-In: visual revert + inline retry, never a silent failure.

### Future Ideas
Habit "why" field (same emotional-anchor pattern as Life Stories in Horizons).

### Acceptance Criteria
- [ ] Past days' completion is never retroactively editable
- [ ] Deleting a habit never rewrites historical entry files
- [ ] Progress bar and percentage never appear alongside punitive language
- [ ] Fully offline

---

## 7. To-Do

### Purpose
Lightweight daily task management with the one distinctive behavior the reference screenshot called for: a gentle next-day nudge on anything left unfinished.

### User Stories
- As a user, I want a simple daily task list without a full project-management tool.
- As a user who let something slip, I want a nudge, not a scolding.

### Screen Layout
Canvas card: checklist, `+` add. Full page: grouped Today / Upcoming / Someday / Done, recurring task support.

### Interactions
Unmarked tasks from a previous day surface at the top of Today's list the next morning with a small "Did you finish this? →" tag; tapping it offers three choices: mark done, move to today, or a one-line optional reflection on why it stalled (never mandatory).

### Keyboard Shortcuts
`N` = new task (focus input), `Space`/`Enter` on focused task = toggle done.

### Animations
Same checkbox pattern as Habits for consistency.

### Accessibility
Nudge tag has `aria-label` explaining its meaning fully ("Not finished yesterday"), not relying on the arrow glyph alone.

### Data Model
```ts
interface Task {
  id: string;
  text: string;
  createdDate: string;
  dueDate?: string;
  done: boolean;
  doneDate?: string;
  recurring?: 'daily' | 'weekly' | 'weekdays';
  carriedOverFrom?: string;   // original date, if this is a carried task
  stallReflection?: string;   // optional, from the nudge flow
}
```
Stored in `.paroh/tasks.json` — tasks are cross-cutting (span dates, recur) in a way that doesn't map cleanly to a single day's entry file, so unlike habits, they get their own store rather than being embedded in frontmatter.

### Markdown Format
N/A — tasks are not part of entry files, though a completed task can optionally be referenced from an entry via a normal Markdown checklist item written by the user, unrelated to the structured Task store.

### Edge Cases
- Recurring task marked done today → next occurrence is generated for its next scheduled date automatically, this instance stays marked done historically
- A carried-over task carried over many times in a row → still just shows one nudge, doesn't stack multiple nudge tags

### Empty State
No tasks today → simple "Nothing on your list — add one or just write" message, never an accusatory empty state.

### Errors
Same save-failure pattern as other toggles.

### Future Ideas
Linking a task directly to a Life Story (Horizons) it serves.

### Acceptance Criteria
- [ ] Unfinished tasks nudge exactly once the following day, never repeatedly stack
- [ ] Recurring tasks generate their next instance correctly across month boundaries
- [ ] Fully offline

---

## 8. Audio Logs

### Purpose
Lets a user process out loud when writing feels like too much, with recordings living alongside the vault like any other entry content.

### User Stories
- As a user who's too anxious to write, I want to just talk instead.
- As a user, I want to play back an old recording the same way I'd reread an old entry.

### Screen Layout
Canvas card: list (title, date, duration), Record button top-right. Full page: same list, larger, with inline waveform/playback.

### Interactions
Record button starts immediately (no confirmation dialog — friction here works against the point of the feature), auto-titled by date/time, saved to `vault/audio/`, and linked into that day's entry's `audio` field. Tapping a past log plays inline without leaving the page.

### Keyboard Shortcuts
`Ctrl/Cmd+Shift+R` = start/stop recording from anywhere in the app (global shortcut, since the moment someone wants to talk shouldn't require navigating first).

### Animations
Recording state shows a subtle pulsing dot — the one deliberate exception to "nothing animates at rest" in Motion Principles, because it's communicating an active, ongoing process, not decoration.

### Accessibility
Playback controls are standard `<audio>` element semantics, fully keyboard operable. Recordings are never auto-transcribed and displayed without the user requesting it (Phase 3+ feature, opt-in).

### Data Model
```ts
interface AudioLog {
  id: string;
  filePath: string;       // vault/audio/...
  createdAt: string;
  durationSeconds: number;
  linkedEntryDate?: string;
  transcript?: string;    // Phase 3+, local Whisper only unless cloud opted in
}
```

### Markdown Format
Referenced from the day's entry:
```yaml
audio: ["audio/2026-06-11-0234.webm"]
```

### Edge Cases
- Recording interrupted (app closed mid-recording) → partial file is still saved and playable up to the interruption point, never silently discarded, per Fail Safely principle
- Very long recording (>30 min) → still saved; UI should not impose an artificial cap, though a soft warning appears past 20 min suggesting a natural stopping point

### Empty State
No recordings yet → Record button is the obvious, only focal point; empty list area shows a quiet prompt, not a stock illustration.

### Errors
Microphone permission denied → clear, specific message naming exactly what to fix (not a generic "recording failed").

### Future Ideas
Local transcription surfaced as searchable text alongside written entries.

### Acceptance Criteria
- [ ] Recording starts with zero confirmation steps
- [ ] A recording interrupted by app closure is still saved and playable
- [ ] Playback works fully offline
- [ ] Global keyboard shortcut works from any screen

---

## 9. All Entries & Search

### Purpose
The library view — finding anything, ever written, fast.

### User Stories
- As a user, I want to find every entry tagged "social anxiety" from the last 3 months.
- As a user, I want full-text search across years of writing.

### Screen Layout
List/grid toggle, filter bar (tag, mood, date range, has-audio), search input with live results.

### Interactions
Search debounced ~200ms, queries SQLite FTS5 (`architecture.md` §Search & Indexing). Filters combine (AND logic) — tag + mood + date range all narrow together, not separately.

### Keyboard Shortcuts
`Ctrl/Cmd+K` opens search from anywhere in the app (global). `/` focuses search when already on this page.

### Animations
Results update in place, no full-page reload flash.

### Accessibility
Search results list is a proper `<ul>`/`role="listbox"` with arrow-key navigation to results and `Enter` to open.

### Data Model
Query layer over the SQLite index — no new persisted model; result shape:
```ts
interface SearchResult {
  date: string;
  title: string;
  excerpt: string;   // highlighted snippet around the match
  mood?: Mood;
  tags: string[];
}
```

### Markdown Format
N/A — derived.

### Edge Cases
- Search run before the index finishes an initial build (very first launch on a large pre-existing vault, e.g., imported from Obsidian) → shows a "still indexing…" state with partial results rather than blocking entirely
- Query with zero results → explicit "No entries match" state, with the active filters shown so the user can see what to loosen

### Empty State
Vault with zero entries at all → All Entries page shows an invitation to write the first one, not a bare empty table.

### Errors
Index corrupted → triggers the automatic rebuild described in `architecture.md`'s Failure Philosophy; search degrades to a slower live scan in the interim rather than failing outright.

### Future Ideas
Saved searches/smart filters ("show me every low-mood day with no entry" — useful for noticing avoidance).

### Acceptance Criteria
- [ ] Search returns results from the full vault, not just recent entries
- [ ] Filters combine correctly (AND, not OR)
- [ ] Never blocks entirely during index rebuild
- [ ] Fully offline

---

## 10. Horizons (Life Timeline)

### Purpose
A long-horizon, emotionally-anchored view of where the user's life is heading — Life Stories instead of goals, per the naming/framing decision already made.

### User Stories
- As a user, I want to see my life across years, not just my week.
- As a user, I want each aspiration tied to *why* it matters, not just a checkbox.
- As a user whose priorities changed, I want to let a story go without it feeling like failure.

### Screen Layout
Infinite horizontal timeline (years), Life Area rows (Career, Health, Relationships, Learning, Travel, Finance, Adventure — user-editable set) running vertically, zoom control (Year ↔ Quarter for v1; deeper zoom is a later phase per the earlier discussion). Tapping a Life Story card opens its editor (title, why, linked entries, status).

### Interactions
Drag/scroll horizontally to move through time; zoom control changes time-scale, not page. Cards can be dragged between adjacent time periods. Clicking "linked entries" jumps into All Entries filtered to that story's links.

### Keyboard Shortcuts
`←`/`→` pan the timeline when focused, `+`/`-` zoom.

### Animations
Timeline pan/zoom uses direct manipulation physics (momentum scroll, no artificial easing delay) — this is the one place in the app where a slightly more expressive motion language is appropriate, because the metaphor (unfolding a map) depends on it feeling physical.

### Accessibility
Timeline is a genuinely hard a11y surface (spatial, drag-based) — a parallel list view (per Life Area, chronological) must exist as a fully keyboard-operable equivalent, not an afterthought. This is called out explicitly in `accessibility.md`.

### Data Model
See `folder-structure.md`'s Life Story shape:
```ts
interface LifeStory {
  schema_version: number;
  title: string;
  life_area: string;
  status: 'dreaming' | 'in-motion' | 'living-it' | 'let-go';
  created: string;
  linked_entries: string[];   // dates
  why: string;                 // body content, not just a field
}
```

### Markdown Format
```yaml
---
schema_version: 1
title: "Own my first car"
life_area: career
status: in-motion
created: 2026-06-01
linked_entries: [2026-06-11, 2026-07-03]
---

## Why

Freedom. Weekend trips. Drive my parents somewhere without asking anyone.
```

### Edge Cases
- User has zero Life Stories → timeline still renders (empty rows per Life Area), never blocked on having content first
- A story spans years (e.g., "Learn to paint," ongoing) → not tied to a single time cell; shown as a continuous band across its `created` date to present, updating live rather than requiring manual re-placement

### Empty State
Empty timeline shows Life Area labels and a quiet "Add your first story" affordance per row, not a tutorial overlay.

### Errors
Same file-based error handling as entries (Failure Philosophy table applies identically — Life Stories are files too).

### Future Ideas
AI-detected "Seasons" (auto-labeled spans of related entries) — explicitly deferred behind `CloudAIProvider` opt-in, not core.

### Acceptance Criteria
- [ ] No Life Story ever has a numeric progress percentage field
- [ ] Fully keyboard-operable via the list-view equivalent
- [ ] Zero Life Stories never blocks the page from rendering
- [ ] Fully offline (excluding the future AI Seasons feature)

---

## 11. Chapters (Monthly Reflection)

### Purpose
Turns a month of entries the user already wrote into something worth revisiting — computed entirely from existing data, no new writing burden.

### User Stories
- As a user, I want to see my month reflected back to me without re-reading every entry.
- As a user years from now, I want to open "August 2026" and feel like I'm reading a chapter of my life.

### Screen Layout
One card per month, magazine-style: mood landscape (terrain visualization across the month's weeks), stat grid (entry count, longest streak, most-mentioned word, days logged), list of that month's entries for quick jump-in.

### Interactions
Navigate month-to-month like the Calendar. Clicking a stat or the landscape jumps to the relevant entries (e.g., clicking the hardest-mood week filters All Entries to that week).

### Keyboard Shortcuts
`←`/`→` = previous/next month.

### Animations
Mood landscape draws in once on load (400ms), not looping or animated afterward.

### Accessibility
Mood landscape has a text-equivalent summary ("Week 1: mixed, trending up by week 3") for screen readers, since the terrain visual itself isn't inherently accessible.

### Data Model
Entirely computed, no persisted Chapter object in v1:
```ts
interface ChapterSummary {
  month: string;              // YYYY-MM
  entryCount: number;
  daysLogged: number;
  longestStreak: number;
  moodByWeek: Mood[][];       // for the landscape
  topWord: string;            // stopword-filtered frequency count, local only
}
```

### Markdown Format
N/A in v1 (computed, not stored). If a future version allows pinning a cover image or writing an editor's note, that becomes `vault/chapters/YYYY-MM.md` per `folder-structure.md`'s forward note.

### Edge Cases
- A month with very few entries (e.g., 2) → landscape and stats still render, just sparse; no "not enough data" gate — even a little reflection is worth showing
- Word frequency count dominated by a name/proper noun the user writes often → acceptable, not filtered beyond standard stopwords; this is honest reflection of their own writing, not curated

### Empty State
A month with zero entries shows the month label with a quiet "No entries this month" line — factual, not guilt-inducing, consistent with the Calendar's empty-state philosophy.

### Errors
Underlying index unavailable → Chapters falls back to a direct filesystem scan of that month's folder, same resilience pattern as Search.

### Future Ideas
AI-generated "Editor's Note" narrative summary — explicitly `CloudAIProvider`, opt-in, off by default; local stats/landscape must be fully functional without it.

### Acceptance Criteria
- [ ] Fully computed from existing entries — no new user input required to populate
- [ ] Renders meaningfully even with very few entries in a month
- [ ] Local stats (count, streak, top word, landscape) work fully offline
- [ ] Never shows guilt-inducing copy for a light or empty month

---

## 12. Settings & Export

### Purpose
Where trust gets operationalized — vault location, privacy controls, and the ability to leave with your data intact at any time.

### User Stories
- As a user, I want to know exactly where my files live.
- As a user, I want to export everything in one click, no support ticket required.
- As a user, I want AI features off by default and clearly explained if I turn them on.

### Screen Layout
Sections: Vault (location picker, current path shown), Appearance (accent color, light/dark bias once available), AI Features (per-feature toggles, each with a one-sentence explanation of what leaves the device), Notifications (daily reminder time), Privacy & Support (the permanent crisis-resources line from `vision.md` §1.1, non-dismissible-permanently), Export/Import, About/Changelog.

### Interactions
"Export vault as .zip" runs immediately, produces a timestamped file, shows a system save dialog. Vault location change requires confirming the new folder is empty or already a valid Paroh vault — never silently merges two unrelated folders.

### Keyboard Shortcuts
Standard settings-page tab/arrow navigation; no special shortcuts needed here.

### Animations
None beyond standard hover/focus states — Settings is a utility surface, not an emotional one.

### Accessibility
Every AI toggle's explanation text is real text adjacent to the control, associated via `aria-describedby`, not a tooltip-only explanation.

### Data Model
```ts
interface AppSettings {
  vaultPath: string;
  aiFeatures: Record<string, boolean>;  // keyed per feature, never a global flag
  reminderTime?: string;
  accentColor?: string;   // future
}
```
Stored in the OS-appropriate app-config location (not inside the vault itself — this is app config, the vault is user data, and the two must never be conflated per `architecture.md`'s layering).

### Markdown Format
N/A.

### Edge Cases
- User points Paroh at a folder that already contains non-Paroh files → vault creation refuses to proceed without explicit confirmation, to avoid ever writing into an unrelated folder unexpectedly
- Export requested on a very large vault (years of audio + entries) → runs as a background task with progress, never freezes the UI

### Empty State
N/A — Settings always has content.

### Errors
Export failure (disk space, permissions) → specific, actionable error, never a silent failure — this is the one feature where a silent failure would be especially damaging, since it's the user's safety net.

### Future Ideas
Encrypted vault mode, multiple vaults.

### Acceptance Criteria
- [ ] Every AI feature defaults to off
- [ ] Each AI toggle states in one sentence what leaves the device
- [ ] Export always produces a complete, valid, re-importable vault
- [ ] Privacy/crisis-resources line is present and cannot be permanently dismissed

---

## Cross-Feature Acceptance Criteria (apply to all of the above)

- [ ] Works fully offline unless explicitly marked as a cloud-opt-in feature
- [ ] Never loses user data on crash, per `architecture.md`'s Failure Philosophy
- [ ] Follows `design-system.md` tokens exactly — no ad-hoc colors/spacing
- [ ] Fully keyboard-navigable
- [ ] Journal content never appears in logs or crash reports
- [ ] Traceable to at least one line in `vision.md`
