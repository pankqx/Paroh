# Tasks — Current Sprint

> This file reflects the current repository state only. It is updated when the documentation or implementation status changes.

**Active phase:** Phase 3 — Habits, To-Do, Audio (implemented, in review)
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

## TODO (Phase 4 — Healing Prompt Engine)

- [ ] Full CBT prompt library (`assets/prompts.json`), 24-week rotation, prompt history page, manual override.
- [ ] "Write about it" seeds the prompt into today's entry.

## Known gaps

- `npm run build:ubuntu` (used by the release workflow) is not defined yet; packaging lands in the Polish & Packaging phase.
- Opener images in `assets/openers/quotes.json` are placeholders; the opener card uses a gradient until real images exist.
