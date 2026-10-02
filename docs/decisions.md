# Decisions Log

> `architecture.md` holds the big, load-bearing decisions. This file holds the smaller ones — naming calls, small trade-offs, things that would otherwise get silently re-litigated because nobody remembers why they were decided. Add an entry whenever you make a non-obvious call that isn't big enough to earn a section in `architecture.md`.

**Format:** Date · Decision · Reasoning · Alternatives considered (brief)

---

### 2026-07-28 — App named "Paroh," project restructured
Renamed from the working title "Inklight" to "Paroh." Structure reorganized per the priority-ordered `docs/` layout (vision → architecture → folder-structure → design-system → feature-specs → ...) instead of building all docs at once, to avoid the "random docs written for the feeling of progress" failure mode.

### 2026-07-28 — No Wine, native builds only
Platform strategy decided: Electron with native `.deb`/`.AppImage` (Ubuntu) and `.exe`/`.msi` (Windows) from one codebase, built via CI for the Windows target. Rejected running a Windows build under Wine on Ubuntu — full reasoning in `architecture.md` §Platform Strategy.

### 2026-07-28 — Canvas is light, not dark
Corrected an earlier assumption (made while drafting `PRODUCT.md`) that Canvas mode was a dark dashboard. Re-examination of the reference screenshots showed Canvas is light/warm with dotted texture and white cards, with only the Healing Prompt card intentionally dark for contrast. `design-system.md` reflects the corrected version; confirmed acceptable by the project owner on 2026-08-09.

### 2026-07-28 — Plugin architecture kept to four seams, not built
Per explicit feedback: removed detailed plugin implementation planning from `architecture.md` in favor of four minimal seams (Tiptap extensions, `AIProvider` interface, Prompt Packs, `VaultAdapter`). A full plugin system is deferred to Phase 10+, tracked in `future-ideas.md`.

### 2026-08-09 — "Horizons" and "Chapters" naming
Yearly life-timeline feature named "Horizons" instead of "Yearly Planner" — the word "planner" implies deadline pressure that contradicts `vision.md`. Monthly reflection feature named "Chapters" (not "Monthly Planner" or "Monthly Magazine") to keep the same story-based naming register as Horizons. Sidebar reorganized into "Today" and "Reflect" groups to accommodate both without overcrowding a flat list.

### 2026-08-09 — Life Stories have no percentage/progress field
Horizons' Life Story data model deliberately excludes a `progress_percent` field. Status is a narrative state (`dreaming` / `in-motion` / `living-it` / `let-go`) instead. This is enforced by the file format itself, not just UI convention, per the reasoning in the original Horizons discussion: humans remember life as stories, not completion percentages.

### 2026-08-09 — Chapters' AI narrative summary deferred, local stats shipped first
Chapters' mood landscape, entry count, streak, and word-frequency stats are fully local and computed from existing data — no AI required, shippable in Phase 5. The "Editor's Note" AI-generated narrative summary is explicitly deferred to Phase 8, gated behind the same opt-in `CloudAIProvider` consent model as every other AI feature.

### 2026-08-10 — Paroh product direction consolidated before implementation
Paroh is being developed as an offline-first Personal Operating System whose journal is the heart of the experience. The confirmed direction includes a customizable dashboard, a visual Canvas, built-in and custom templates, daily/weekly/monthly/yearly reflection rhythms, Life Operating System evolution, deferred handwriting/drawing, a short calm opening experience on first launch, Ubuntu-first implementation focus, and future cross-platform support that does not force premature implementation.

This consolidation was made before any implementation began so future AI coding sessions have one coherent product direction and do not interpret conflicting documentation as separate product requirements.

### 2026-08-09 — Deep zoom (Year→Quarter→Month→Week→Today) deferred for Horizons v1
The original brainstorm's Google-Maps-style continuous zoom is a genuinely good long-term goal but a significant engineering lift. v1 ships Year and Quarter zoom only; deeper zoom levels are tracked in `future-ideas.md` for a later phase once the core timeline interaction is proven with real users.

### 2026-10-02 — Phase 1 implementation choices
- **electron-vite** builds main, preload and renderer from one config; simpler than wiring three Vite builds by hand.
- **tiptap-markdown** serializes the editor to Markdown, with raw HTML disabled so pasted rich text is reduced to Markdown.
- **Unknown frontmatter keys are preserved** on save (`Entry.extra`), so files from a newer version or edited by hand never lose data.
- **No SQLite yet.** Phase 1 lists entries by walking the month folders; the FTS5 index arrives with search in Phase 2.
- **`renderer/application/` and the event bus are not created yet.** Phase 1 has no cross-feature events to publish; they are added when the first one is needed, per "don't pre-abstract" in coding-standards.md.
- **Fonts come from `@fontsource`** packages, bundled into the app at build time, so nothing loads from a CDN.

### 2026-10-02 — Phase 2 implementation choices
- **`node:sqlite` instead of better-sqlite3.** Electron 44 ships Node 24, whose built-in SQLite includes FTS5. No native module means no `electron-rebuild` and nothing to compile per platform.
- **The index stores plain text**, not Markdown, so search snippets never show `**` or `[[`.
- **Wikilinks stay plain text in the document** and are only decorated in the editor, so Markdown round-trips untouched. The serializer is told not to escape them, keeping files Obsidian-compatible. Targets resolve to a date first, then to the newest entry with that title.
- **Own saves vs outside edits** are told apart by mtime: after every save the index holds the file's mtime, so the watcher ignores the echo.
- **Mood tints calendar dots now** (design-system.md listed this for Phase 3) because the Calendar page needed it anyway.

### 2026-10-02 — Phase 3 implementation choices
- **Answers PRODUCT.md open question 1 the way feature-specifications.md already did:** habit completions live in each day's frontmatter (`habits_snapshot`), habit definitions and tasks in `.paroh/*.json`. The index gained a `habits` column (index version 2, rebuilt automatically) so streaks and heatmaps don't re-read every file.
- **Habit ids are readable slugs** (`walk-outside`) because they appear in entry files people may open in other editors.
- **A streak doesn't break on an unfinished today**; it counts back from yesterday until today is ticked.
- **Audio is streamed to disk in one-second chunks** over IPC rather than saved on stop, so a crash keeps the recording. Playback reads the file over IPC into a blob URL instead of opening a custom protocol or `file://` access.
- **A reflection from the nudge also moves the task to today**, so a nudged task never shows the nudge twice in a row.
- **JSON stores refuse to overwrite a file they can't parse**, and writes are serialized per store so quick clicks can't lose an update.

### 2026-10-02 — Phase 4 implementation choices
- **Five prompts per week-block, 120 in total,** written in the style of PRODUCT.md §7.2. Every prompt is an open question; none asks about diagnoses, symptoms or self-harm, and the page carries a permanent "journal, not therapy" note with a signpost to crisis lines and professionals.
- **Today's prompt is computed in the renderer** from the bundled library, entry dates and prompt history, instead of the `prompts.today/skip/selectManually` IPC sketched in api.md. Skipping and picking are ordinary entry saves of `prompt_id` / `prompt_skipped`, so there is one write path and no prompt state outside the Markdown files.
- **Days of use = days with an entry before today.** Counting only earlier days keeps today's prompt stable even after today's entry is created. A skip creates today's entry, so it counts as a day of use.
- **"Write about it" on a day that already has writing** puts the prompt above it rather than starting a second entry, since there is one file per day.

### 2026-10-02 — Phase 5 implementation choices
- **Chapters reads that month's files directly** (`chapters.month`) instead of the index, because the most-used word needs full bodies. This also covers the spec's "fall back to a filesystem scan" case. Everything else is computed in `renderer/domain/chapters.ts`.
- **Blockquotes are left out of word counts**, so a seeded healing prompt doesn't become the month's "most-used word."
- **Life Stories gained one optional key, `when`** (`2027` or `2027-Q2`), because the spec's timeline needs somewhere to place a story but the file shape only had `created`. A story spans `created` to the end of `when`, or to today when there is no `when`. There is still no progress field.
- **Horizons is not watched for outside edits** in v1; it reloads each time the page opens. Entries remain the only watched files.
- **Dragging cards between periods is deferred.** The editor's "when" field does the same job and works by keyboard; drag can come in the polish phase.

---

## Template for New Entries

```
### YYYY-MM-DD — Short decision title
What was decided. Why. What alternative(s) were considered and rejected, briefly.
```
