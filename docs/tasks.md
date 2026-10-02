# Tasks — Current Sprint

> This file reflects the current repository state only. It is updated when the documentation or implementation status changes.

**Active phase:** Phase 4 — Healing Prompt Engine (implemented, in review)
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

## TODO (Phase 5 — Horizons & Chapters)

- [ ] Chapters: computed monthly view (mood landscape, stats, top word).
- [ ] Horizons: Life Areas and Life Stories on a Year/Quarter timeline, status states, no percentages.
- [ ] Sidebar reorganized into Today / Reflect groups.

## Known gaps

- `npm run build:ubuntu` (used by the release workflow) is not defined yet; packaging lands in the Polish & Packaging phase.
- Opener images in `assets/openers/quotes.json` are placeholders; the opener card uses a gradient until real images exist.
