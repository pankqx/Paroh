# Tasks — Current Sprint

> This file reflects the current repository state only. It is updated when the documentation or implementation status changes.

**Active phase:** Phase 6 — Polish & Packaging (implemented, in review)
**Last updated:** 2026-10-02

---

## DONE (Phase 1)

- [x] Electron + React + TypeScript project (electron-vite), strict TS, ESLint with the renderer layer-boundary rule.
- [x] `VaultAdapter` with the atomic save pipeline (temp file, read-back validation, fsync, rename).
- [x] Frontmatter parse/serialize with `schema_version`; unknown keys are preserved on save.
- [x] Typed IPC contract (`src/shared/ipc-contract.ts`) exposed only through the preload bridge; `contextIsolation`, `sandbox`, no `nodeIntegration`.
- [x] Design tokens from `docs/design-system.md` as `src/renderer/styles/tokens.css`; Inter and Fraunces bundled locally.
- [x] Canvas: daily opener quote, mood check-in (writes today's frontmatter), mini calendar with entry dots, recent entries, placeholders for later cards.
- [x] Editor: title, Tiptap rich text with Markdown round-trip, formatting toolbar, mood, tags, word count and read time, 2s autosave, Ctrl/Cmd+S, Esc back to Canvas, delete with confirmation.
- [x] Vault folder picker (stored in app settings, not the vault).
- [x] Tests: frontmatter round-trip, vault save/load/list/delete, atomic write failure leaves the original untouched, calendar/date/word-count domain logic, axe-core accessibility pass.

## DONE (Phase 2)

- [x] SQLite FTS5 index at `<vault>/.paroh/index.db`, using Electron's built-in `node:sqlite` (no native module). Disposable: a corrupt or outdated index is deleted and rebuilt; launches only re-index files whose mtime changed.
- [x] Full-text search (stemming, prefix-as-you-type) with mood, tag and date-range filters and highlighted snippets; search box in the top bar.
- [x] Calendar full page (mood-coloured days, entry titles) and All Entries page; mini calendar dots tinted by mood.
- [x] File watcher: entries added, edited or deleted outside Paroh appear immediately; an open entry reloads quietly, or asks if you have unsaved changes.
- [x] Editor: `/` block menu, `[[wikilinks]]` with autocomplete (by title or date), click to open, "Linked from" backlinks in the side rail. Links are stored literally, Obsidian-style.
- [x] Tests: index search/filters/links/corruption, vault-index sync and external changes, plain-text extraction, axe-core for the new pages.

## DONE (Phase 3)

- [x] Habits: definitions in `.paroh/habits.json`, today's completions in the entry's `habits_snapshot`. Daily / weekdays / custom days, edit, archive (never delete), streaks that don't punish an unfinished today, 20-week heatmap, seeded suggestions on first run. Only today can be ticked.
- [x] To-Do: `.paroh/tasks.json`. Today / Upcoming / Someday / Done, repeat daily / weekdays / weekly (next instance created on completion, month-safe), "Did you finish this?" nudge with done / move to today / note why. `N` focuses the new-task box.
- [x] Audio Logs: record from the Canvas card, the Audio Logs page or `Ctrl/Cmd+Shift+R` anywhere. Audio streams to `<vault>/audio/*.webm` every second, so an interrupted recording is kept. Linked into that day's entry `audio:` frontmatter, inline playback, rename. The app grants the microphone permission only to its own page.
- [x] Mood trend chart (last 30 days) on the Calendar page.
- [x] Tests: habit/task/audio stores (including concurrent toggles, unreadable JSON never overwritten, interrupted recordings), streaks, schedules, task grouping, recurrence, mood trend, axe-core for the new pages.

## DONE (Phase 4)

- [x] Prompt library in `assets/prompts.json`: 120 prompts, five for each of the 24 weeks, across the six CBT blocks in PRODUCT.md §7.1. Validated on load; malformed prompts are dropped and an unusable file falls back to five built-in prompts.
- [x] Rotation: one week-block per 7 days with an entry (days of use, not calendar days), looping back to week 1 with a note after week 24. Within a week, the first prompt not seen before.
- [x] Dark prompt card on the Canvas: "Write about it" puts the prompt at the top of today's entry as a blockquote; "Skip" keeps the same prompt for the rest of the day. `W` / `S` while the card has focus.
- [x] Healing Prompts page: today's prompt, the programme overview, the full library with "Write about this today" (manual override, any week), and history (written about vs skipped, by date).
- [x] `prompt_id` / `prompt_skipped` in entry frontmatter are the only log; the index gained columns for them (index version 3).
- [x] A standing note that Paroh is a journal, not therapy, with a signpost to crisis lines and professionals.
- [x] Tests: library shape, fallback, rotation and looping, skip-is-not-shuffle, manual override, seeding, frontmatter round-trip, prompt history from the index, axe-core for the page.

## DONE (Phase 5)

- [x] Chapters: one page per month, computed from that month's files. Mood landscape (draws in once, respects reduced motion, with a text summary for screen readers), entries written, days logged, longest streak, most-used words (stopwords and blockquotes left out), week-by-week moods with the hardest week marked, and the month's entries. `←` / `→` change month; a week opens All Entries filtered to those dates. An empty month says "No entries this month."
- [x] Horizons: Life Stories as Markdown files at `<vault>/horizons/<area>/<slug>.md` in the documented format, with no progress field. Seven default life areas plus any you add (an area is a folder). Timeline with Year and Quarter zoom, a Today marker, ongoing stories stretching to today, `←` / `→` to move and `+` / `-` to zoom. A List view as the keyboard and screen-reader equivalent. Story editor with title, area, status (Dreaming / In motion / Living it / Let go), start date, an optional "when", why, and linked entries.
- [x] Sidebar grouped into Today and Reflect.
- [x] Tests: word counts, chapter stats and week grouping, landscape summary, timeline spans, columns and lanes, life story file format and round-trip, the Horizons store (unique slugs, moving between areas, unknown keys kept, path escapes rejected), month loading, axe-core for Chapters, the timeline, the list and the editor.

## DONE (Phase 6)

- [x] Settings page: vault folder (show, change), export and import, daily reminder, AI features section (every feature off by default, each with its own switch and a sentence on what leaves the device), the permanent privacy and crisis-resources line, About.
- [x] Export: one `.zip` of the whole vault (entries, audio, horizons, `.paroh/*.json`), leaving out the disposable search index and temp files, with progress and specific errors (disk full, no permission). Import unpacks an export into an empty folder, checks it is a Paroh vault, and switches to it. No zip dependency: a small reader/writer in `src/main/vault/zip.ts`, with CRC checks and path-escape protection.
- [x] Choosing a folder that already holds unrelated files asks first, everywhere (onboarding, Settings, sidebar).
- [x] Onboarding on first launch: what Paroh is, where the journal will live, the privacy line. Shown once; anyone who already picked a folder skips it.
- [x] Packaging: `npm run build:ubuntu` builds `.deb` and `.AppImage` with electron-builder (`electron-builder.yml`), with an app icon in `build/`. Only `yaml` ships as a runtime dependency; renderer libraries are bundled by Vite.
- [x] A global reduced-motion rule.
- [x] Tests: zip round-trip byte for byte, readable by Python's zipfile, unsafe paths and damaged archives rejected, folder classification, reminder timing, axe-core for Settings and onboarding.

## TODO (Phase 7 — Windows Build)

- [ ] `npm run build:windows` producing an installer in CI.
- [ ] Windows QA: paths, notifications, window chrome, shortcuts.

## Later

- [ ] Horizons: drag stories between periods, and rename or hide life areas.
- [ ] Accent colour and dark mode in Settings (the spec marks these "once available").

## Known gaps

- Opener images in `assets/openers/quotes.json` are placeholders; the opener card uses a gradient until real images exist.
