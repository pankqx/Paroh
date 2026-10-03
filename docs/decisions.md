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

### 2026-10-03 — Phase 6 implementation choices
- **A built-in ZIP writer and reader** instead of a dependency. The format needs only store and deflate, Node has `zlib.crc32`, and every byte of the user's safety net stays inspectable in one file. Archives are checked readable by Python's `zipfile` in the tests.
- **Exports leave out `.paroh/index.db`**, since the index is rebuilt from the files on first open.
- **The main process remembers the folder awaiting confirmation**, so the renderer can confirm a choice but never name an arbitrary path for Paroh to write into.
- **electron-builder's old `@electron/get` is overridden to 5.x** (the version Electron itself uses), which removes a high-severity advisory in `http-cache-semantics` that has no patched release. It only affects the packaging tool, never the shipped app.
- **Renderer libraries moved to devDependencies.** Vite bundles them, so shipping their `node_modules` again only made the installer bigger.
- **Accent colour and dark mode wait.** The spec lists them "once available"; the design system has no dark tokens yet.

### 2026-10-03 — Phase 7 implementation choices
- **NSIS, per user, not one-click.** No admin prompt, and the person can see and choose where it goes. MSI was dropped from the workflow's artifact list because nothing builds one; NSIS is electron-builder's default and supports updates later.
- **Windows runs the whole unit suite in CI** rather than a separate Windows-only test set, so any path or file-locking difference shows up as a normal red check.
- **Single-instance lock on every platform.** Two windows on one vault would mean two watchers and two indexes racing on the same files.
- **Unsigned for now.** Signing needs a certificate only the project owner can buy; `docs/windows-qa.md` tells testers how to get past SmartScreen.

### 2026-10-03 — Phase 8 implementation choices
- **The person's own Anthropic key, no Paroh server.** There is nothing in between to trust or pay for. The key is encrypted with Electron's `safeStorage` in the config folder, so an exported or synced vault never carries it.
- **Claude Opus 5.5 at low effort, with server-side fallback.** A month's note is short; low effort keeps it quick and cheap. `fallbacks: "default"` lets Anthropic retry a classifier decline on its recommended model instead of failing.
- **Notes live in `<vault>/chapters/`** as Markdown with frontmatter, so they export, sync and read like everything else. Nothing is written until the person keeps a draft.
- **Transcription runs in the renderer on ONNX Runtime Web (WASM), not a native module.** `onnxruntime-node` downloads extra binaries at install time and would need per-platform packaging; the WASM build runs everywhere Electron does, including the planned Capacitor app. The native `onnxruntime-node` and `sharp` packages Transformers.js lists are replaced with empty stubs (`tools/stubs/`, npm `overrides`) because they are never used.
- **The main process downloads the model**, keeping every network call in main per `security.md`; the renderer reads the files through a read-only `paroh-model://` scheme with path-escape checks. Whisper base (multilingual, 8-bit, about 80 MB) balances quality and download size.
- **Transcripts go in `.paroh/audio.json`, not the entry body.** The person decides what enters their writing; the search index keeps transcripts findable on their own.

### 2026-10-03 — Phase 9 implementation choices
- **One React app, two hosts.** The phone runs the exact renderer bundle; only `window.paroh` differs. On the desktop it is the IPC bridge, on the phone it is `mobileApi.ts`, which calls the same vault services in the WebView. No second codebase, as `architecture.md` §Mobile Reuse Strategy planned.
- **The swap happens at a `VaultFs` interface, not inside each store.** Every store and the `VaultAdapter` take a `VaultFs`, so the atomic save pipeline (write temp, read back, validate, replace) is the same code on both platforms. A contract test holds the two implementations to the same behaviour.
- **An in-memory search index on phones.** `node:sqlite` does not exist in a WebView and a native SQLite plugin adds a second schema to keep in step. A personal journal is small enough to index on launch, and the index is disposable by design.
- **Android first.** It can be built on Linux CI; iOS needs a Mac. The `Documents/Paroh` folder is where sync apps can reach it.
- **Desktop-only features say so on the phone** instead of half-working: export/import (the phone folder is already plain files), the reminder (needs a notification plugin) and the AI features (key storage and the speech model need their own phone work).

### 2026-10-03 — Redesign: one hand-made design system, not five libraries
Pank asked for a much richer UI and named Lucide, Tailwind, Phosphor, shadcn/ui and 21st.dev as references. Paroh keeps its own token-based CSS and borrows the patterns (component shapes, motion, glass, focus rings) rather than installing all of them: mixing several kits is what makes an app look generated, and rewriting every screen into Tailwind classes would have cost the new features. Lucide is the one icon set (Phosphor would be a second visual language); `motion` handles screen and layout animation. The theme (Ivory, Midnight or system) is a per-device choice in localStorage, like a reading lamp, so it never syncs a laptop's dark mode onto a phone.

### 2026-10-03 — Journal pages: media beside the entries, covers in frontmatter, an on-device "Make it beautiful"
- **Photos, video and sound are copied into `<vault>/media/YYYY-MM/`** and embedded with ordinary Markdown image syntax (`![caption](media/2026-10/sunset.jpg "wide")`); the title slot carries the layout (normal, wide, full). The file stays readable in any Markdown app, and syncing or exporting the vault carries the media with it. Linking to files elsewhere on disk was rejected: they break when the folder moves.
- **The cover is `cover:` (a media path or `gradient:<id>`) plus `cover_y:` in frontmatter.** Gradients need no file, so every page can have a cover.
- **The editor's Markdown now allows inline HTML** so highlight colours, text colours and underline survive a save. Scripts, iframes and other unknown tags are dropped by the schema on load, so a pasted page cannot run code.
- **"Make it beautiful" is rules, not a model.** Pank asked that no data leave the device. A rule-based tidy (capitals, punctuation, lists, headings, a Plan checklist with dates, a Grateful-for list) is instant, predictable, always undoable and never invents words. A local language model would be a large optional download and was left for later.

### 2026-10-03 — Tasks gain an explanation, priority and comments; habits gain a colour
- **All new task fields are optional keys in `.paroh/tasks.json`** (`notes`, `priority`, `comments[]` with an ISO time), so older files read unchanged and no schema bump is needed. The deadline is the existing `dueDate`. A repeating task carries its explanation and priority to the next instance; comments stay with the instance they were written on.
- **Comments are a running log, not a chat.** Each is timestamped and can be deleted; there is no editing, which keeps the record honest in the same spirit as the habit history.
- **Habits get an optional `color`** from a fixed palette of six inks, so cards, rings and heatmaps stay in the design system in both themes. Habits without one take a colour by position.

### 2026-10-03 — Boards: a hand-built canvas, one JSON file per board
- **Boards live in `<vault>/boards/<id>.json`** (readable ids, like habits), with pictures copied into `media/` like journal pages. They export and sync with the rest of the vault, and a board can be read or repaired by hand.
- **Built on plain DOM and SVG, not a whiteboard library.** tldraw and Excalidraw are large, bring their own look and file formats, and tldraw's licence needs a key for production use. Paroh needs notes, text, shapes, pen, arrows, pictures and a few widgets in its own visual language; the camera, history and hit-testing are a few hundred lines with tests.
- **Whole-list undo snapshots**, not operation diffs. Boards are small enough, and snapshots cannot drift out of sync with what's on screen.
- **Saved 0.7 s after the last change, and at once when the board is closed**, so leaving mid-edit never loses work.
- **On touch, one finger on empty paper pans and two fingers pinch-zoom**; on a mouse, dragging empty paper draws a selection box and the wheel pans.

---

## Template for New Entries

```
### YYYY-MM-DD — Short decision title
What was decided. Why. What alternative(s) were considered and rejected, briefly.
```
