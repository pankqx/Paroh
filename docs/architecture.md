# Architecture

> This document records *decisions*, not code. Every entry answers: what we chose, what we didn't, and why. If a future contributor wants to challenge a decision here, the burden of proof is on them to show `vision.md` is better served by changing it — not just that an alternative is trendier.

---

## Architecture Principles

Every decision in this document, and every decision made in code afterward, should be traceable back to one or more of these ten principles. When two principles conflict, resolve in the order listed — Simplicity and Single Source of Truth outrank Performance; Privacy outranks Convenience.

**1. Simplicity Over Cleverness.** Prefer code that is obvious to code that is impressive. A future contributor — including a future session of whoever is building this now — should understand a subsystem by reading it once, not by reverse-engineering an abstraction. If a pattern needs a paragraph of comments to justify its existence, it's probably the wrong pattern.

**2. Single Source of Truth.** Every piece of data has exactly one authoritative location. Markdown files are always the source of truth for entry content and metadata. SQLite is a disposable index, never authoritative. In-memory caches are temporary and invalidated aggressively. UI state is always derived from the above, never the other way around.

**3. Local-First.** Everything works with no internet connection. Network access is an enhancement layered on top of a fully functional offline app, never a dependency the core experience quietly requires.

**4. Replaceable Components.** Every major subsystem — editor, AI provider, filesystem adapter, search engine, sync mechanism — sits behind an interface narrow enough that it can be replaced without rewriting anything outside it. This is what makes the Windows build, the mobile port, and any future AI backend swaps additions instead of rewrites.

**5. Explicit Over Implicit.** Data flow is visible and traceable. No hidden side effects, no "magic" that only makes sense if you already know the codebase. If component A changes something component B depends on, that relationship should be visible in an event or a call, not an assumption.

**6. Platform Independence.** Business logic — what a journal entry is, how mood is tracked, how the prompt rotation works — has no idea whether it's running on Ubuntu, Windows, or a phone. Platform-specific code lives only inside adapters (see Layers, below).

**7. Fail Safely.** A software bug is allowed to produce a temporary error. It is never allowed to destroy a user's writing. Every failure-handling decision in this document is downstream of that one sentence.

**8. Privacy by Default.** Every architectural decision assumes the content behind it is someone's most honest, unguarded writing, and minimizes exposure accordingly — to the network, to logs, to other processes, to future plugins.

**9. Testability.** Every subsystem is independently testable because it communicates through interfaces, not through reaching into another subsystem's internals. If a component can't be tested without spinning up the whole app, it's wired wrong.

**10. Correctness Before Performance.** Get it right first. Optimize second. A fast feature that occasionally loses a paragraph is a worse outcome than a slightly slower one that never does — no exception to this.

---

## System Layers

Paroh is organized in four layers, each with a strict responsibility, each only allowed to depend on the layer below it — never sideways, never up.

```
Presentation Layer
  React UI — Canvas, Editor, Calendar, Habit/To-Do views, Settings
  Knows: how to render state, how to dispatch user intent
  Does NOT know: how data is stored, whether AI is local or cloud

        ↓ dispatches Commands, subscribes to Events

Application Layer
  Commands (SaveEntry, CompleteHabit, RecordAudio, AnswerPrompt...)
  Use Cases (RotateDailyPrompt, RebuildIndex, ExportVault...)
  Knows: how to orchestrate a user action into domain + infrastructure calls
  Does NOT know: React, IPC wire format, SQL

        ↓ operates on Domain models, calls Infrastructure interfaces

Domain Layer
  Entry, Mood, Habit, Task, Prompt, AudioLog — pure data + business rules
  Knows: what a valid entry is, what a streak is, what "overdue" means
  Does NOT know: files, databases, network, Electron exists

        ↓ persisted/read through narrow interfaces

Infrastructure Layer
  VaultAdapter (filesystem), SQLite index, AIProvider, Audio I/O
  Knows: how to actually read/write bytes, call an API, query SQL
  Does NOT know: application-level meaning of what it's persisting

        ↓ runs on

Operating System
  Ubuntu / Windows (macOS, mobile later) — via Electron main process
```

**Why this shape matters:** the Domain layer is where `vision.md` actually lives in code — a "healthy streak" or "an overdue task" is defined once, here, and every other layer just displays or persists it. Because Presentation only ever talks to Application, and Application only ever talks to Domain and Infrastructure through interfaces, a platform swap (§ Mobile Reuse) or a backend swap (§ AI Integration) never touches the Presentation or Domain layers at all.

This layering is also the mechanism by which the vault becomes something bigger than "this one Electron app" over time — see *The Vault as Platform* at the end of this document.

---

## Platform Strategy: Native on Both, No Compatibility Layers

**Decision:** Paroh is built once, in Electron + React + TypeScript, and packaged as a **native** target for each platform — `.deb`/`.AppImage` for Ubuntu, `.exe`/`.msi` for Windows, both from the same source tree. Development and testing happen natively on Ubuntu first; the Windows build is produced via CI (GitHub Actions Windows runner) once the app is stable enough to ship a second platform.

**Reasoning:** Electron's whole value proposition is one codebase, many native targets. Running a Windows build under Wine on Linux trades a real native Linux build for a worse, second-hand one, and directly contradicts `vision.md`'s commitment to feeling like software that belongs on the user's machine.

**Alternatives considered:** Wine-hosted Windows build on Ubuntu — rejected (broken GTK integration, mismatched chrome, no upside). Tauri — smaller and faster, but steeper solo-dev iteration loop; revisit only if Electron's footprint becomes a measured problem, not a hypothetical one.

**Trade-offs accepted:** Electron's larger binary/RAM footprint, for zero compatibility-layer risk and faster iteration.

---

## Technology Decisions

**Electron (shell).** Proven at this exact scale (Obsidian, VS Code). Full Node access in main, full browser in renderer. Trade-off: memory overhead, acceptable for a writing app.

**React + TypeScript (UI + types everywhere).** Paroh's UI is fundamentally interlocking, stateful modules that share data (a mood change touches the Calendar, the Canvas card, and the mood trend chart at once) — React's model matches that shape. TypeScript matters more here than usual because the frontmatter schema, the SQLite schema, and the IPC contract all have to agree, and a silent drift between them corrupts a user's journal.

**Markdown files (storage format, not export format).** The only format. Protects the `vision.md` line that a person's record should outlive the company. Human-readable, diffable, portable to any tool that already speaks Markdown.

**YAML frontmatter (metadata).** The de facto standard (Jekyll/Hugo/Obsidian) — makes every Paroh file useful outside Paroh with zero translation, and cleanly separates machine-readable facts (mood, tags) from prose.

**Tiptap/ProseMirror (editor).** Word/Notion-grade formatting with Markdown as a first-class serialization target, not an afterthought. Its extension pattern is also the seam any future block-level plugin would use.

**SQLite as index only (never source of truth).** Solves the real performance problem (full-text search and calendar lookups across years of files) without threatening Single Source of Truth — it is derived, disposable, and rebuildable, and "rebuild index" must remain a real, tested action in Settings, not just a claim in this document.

---

## Data Integrity & Persistence

### Atomic Saving Strategy

An entry is never overwritten in place. Every save follows the same pipeline:

```
1. Serialize entry to Markdown + YAML in memory
2. Write to a temp file in the same directory (entry.md.tmp)
3. Validate the written temp file: parses as valid YAML + valid Markdown
4. fsync the temp file to disk (flush, don't trust the OS cache)
5. Atomic rename: entry.md.tmp → entry.md
6. Update the SQLite index for this one file
7. Emit an EntryUpdated event
8. UI subscribers refresh (Calendar, Canvas cards, search, etc.)
```

**Why atomic rename matters:** on both Ubuntu (ext4/btrfs) and Windows (NTFS), a rename within the same directory is atomic at the filesystem level — the file on disk is either fully the old version or fully the new version, never a half-written mix. If Paroh crashes, the OS loses power, or the disk fills up mid-write, the worst case is a leftover `.tmp` file next to an untouched, still-valid `entry.md`. The user's last successfully saved version is never at risk. Step 3's validation exists so a bug in the serializer is caught *before* it ever reaches the real file, not after.

### Schema Versioning

Every entry's frontmatter carries an explicit schema version:

```yaml
---
schema_version: 1
date: 2026-07-28
mood: ok
tags: [anxiety, healing]
---
```

**Why:** the app will change shape over time — a future version might add AI-generated summaries, richer audio metadata, or new prompt fields. `schema_version` lets `VaultAdapter` know exactly how to read an old file without guessing. Migration philosophy: old entries always load correctly under their own version's rules; a migration only runs when a feature genuinely needs the newer shape (e.g., the AI summary feature turning on), and it upgrades a file's `schema_version` only after a successful write, following the same atomic pipeline above — a failed migration leaves the original file untouched. Newer app versions must always be able to read every older schema version that ever shipped; that backward-compatibility guarantee doesn't expire.

### Failure Philosophy

The single governing rule: **preserving the user's writing always outranks preserving application state.** Specific scenarios:

| Scenario | What happens | What's protected | Recovery |
|---|---|---|---|
| Crash mid-save | Rename never completed | Original file untouched | Stray `.tmp` cleaned up on next launch |
| Power outage mid-write | Same as above — atomic rename means no partial file | Original file untouched | Same as above |
| Disk full | Temp-file write fails at step 2/4, save aborted with a visible error | Original file untouched | User frees space; in-memory draft stays in the editor, not lost, until they retry |
| Invalid Markdown produced by a bug | Caught at validation (step 3), save aborted before touching real file | Original file untouched | Error surfaced; content stays in editor for the user to copy out manually if needed |
| Corrupted YAML found on load | Entry loads with a "metadata unreadable" banner; body text still shown | Prose body, which is the part that matters most | User can re-tag/re-set mood; raw file is still viewable/editable outside the app since it's still just text |
| Corrupted SQLite index | Detected on launch (schema check fails) | Nothing — index is disposable by design | Automatic full rebuild from the `.md` files, silently, on next launch |
| Externally deleted entry file | Detected by file watcher | N/A — the file is genuinely gone | Index removes the stale entry; app never "invents" a recovery, it reflects reality honestly |
| Missing audio file (moved/deleted outside the app) | Entry still loads; audio player shows "file not found" instead of failing the whole entry | The rest of the entry | User can re-link or remove the reference |
| Invalid/corrupted attachment (image) | Broken-image placeholder shown inline, rest of entry unaffected | The rest of the entry | User can re-add the image |
| Interrupted AI request (Phase 4+) | Times out gracefully, partial response discarded, nothing written to the vault until the user explicitly accepts it | The entry, which is never auto-written by AI without the user's action | User retries or continues writing manually |

The user should always *see* what happened in plain language, never a stack trace, and should never lose more than the few seconds of typing since their last autosave.

---

## IPC & Process Boundary

**Decision:** All filesystem access, SQLite access, and audio-file I/O happen exclusively in Electron's **main process**, behind `VaultAdapter`. The renderer never touches disk directly — it calls a typed IPC API exposed via a `contextBridge` preload script, with `contextIsolation: true` and `nodeIntegration: false` enforced everywhere, no exceptions.

**Reasoning:** This is both a security boundary and the practical enforcement mechanism for Single Source of Truth — centralizing every disk write in one adapter is what makes atomic saving (above) actually guaranteed rather than just documented.

**Trade-offs accepted:** A typed IPC layer to design and maintain, for a security model that doesn't need revisiting later under pressure — see Security Architecture, next.

---

## Security Architecture

This section describes Paroh's security *philosophy*. Implementation specifics belong in code review, not here.

**Threat model.** Paroh defends against: (1) a compromised or malicious future plugin/extension attempting to read data it shouldn't, (2) a malicious website or file attempting to exploit the renderer if the user ever views untrusted content inside the app, (3) accidental data exposure through logs, crash reports, or clipboard leakage, (4) an AI backend receiving more data than the user explicitly consented to send.

**Assets being protected.** In priority order: (1) the plaintext content of journal entries, (2) metadata that reveals patterns about the user (mood history, tag frequency, prompt-skip patterns — these are sensitive even without prose), (3) audio recordings, (4) the user's vault file path and any account/API credentials for opt-in cloud features.

**What Paroh explicitly does not protect against.** Malware already running with the user's own OS permissions, a compromised OS, or physical access to an unlocked, unencrypted machine. Paroh is not a security product; it is a private-by-default writing tool. Full-disk encryption and OS-level security remain the user's and the OS's responsibility.

**Renderer isolation.** `contextIsolation: true`, `nodeIntegration: false`, a minimal `contextBridge` surface exposing only the specific typed functions the UI needs (`entries.save`, `entries.load`, etc.) — never a generic `fs` or `ipcRenderer.invoke` passthrough. The renderer is treated as the least-trusted process in the app, which matters increasingly once plugin UI or AI-rendered content can appear in it.

**Main process responsibilities.** Owns all disk I/O, all SQLite access, all AI network calls, and all consent-gating for those network calls. The main process is the only place allowed to know the vault's real file paths.

**Plugin isolation (forward-looking).** If plugins are ever built, plugin UI code runs in the renderer under the exact same `contextIsolation` boundary as core app code — no plugin gets raw filesystem or network access; every vault operation it needs still routes through the same `VaultAdapter` IPC contract the core app uses, with per-plugin permission scoping considered before any plugin ships, not after.

**AI isolation.** No entry content leaves the device to any cloud AI backend without a feature-specific, explicit opt-in (see AI Integration & Privacy, below). Local AI features (rule-based prompt rotation, on-device transcription) never touch the network at all, by construction, not by configuration.

**Filesystem protection.** `VaultAdapter` only ever reads/writes within the configured vault directory and its declared subfolders (`audio/`, `attachments/`, `.paroh/`) — no arbitrary path traversal, validated on every call.

**Consent model.** Consent is per-feature, not global (see Architecture Principle 8 and the AI section below). A user enabling cloud-assisted prompt suggestions has not thereby enabled anything else. Every consent toggle in Settings states in one sentence exactly what leaves the device and where it goes.

**Clipboard behavior.** Paroh never silently reads the system clipboard. Copy actions the user explicitly triggers are the only clipboard writes the app performs.

**External link handling.** Links inside entries open in the user's default system browser, never inside an in-app frame — the renderer never loads arbitrary external content itself.

**Future encryption support.** Not in Phase 1–5, but the file-per-entry, plain-Markdown model is compatible with future opt-in, per-vault encryption-at-rest (e.g., an encrypted vault mode using a user-held key) without changing the core format — tracked in `future-ideas.md`, not built now.

---

## Internal Event Architecture

**Decision:** Components do not call each other directly to react to changes. The Application layer publishes domain events; interested Presentation-layer subscribers react independently.

```
EntryCreated · EntryUpdated · EntryDeleted
MoodChanged · HabitCompleted · TaskFinished
PromptAnswered · PromptSkipped · AudioRecorded
VaultOpened · VaultClosed
ThemeChanged · SettingsUpdated
IndexRebuilt
```

Example flow:

```
User saves an entry
  → VaultAdapter completes the atomic save (see above)
  → EntryUpdated event published
      → Calendar recomputes that day's dot
      → Search index updates (incremental, not full rebuild)
      → Recent Entries card refreshes
      → Mood trend chart recomputes if mood changed
      → (future) AI summary invalidates and lazily recomputes
```

**Why this matters:** without this, every new feature that needs to react to "an entry changed" would require finding and editing every existing feature that also cares — a combinatorial mess that gets worse with each addition. With events, a brand-new feature (say, a future "weekly reflection" digest) just subscribes to `EntryUpdated`; nothing that already exists needs to change. This is what keeps Architecture Principle 5 (Explicit Over Implicit) true even as the feature set grows — the *relationships* are implicit-feeling to write, but the event log itself is fully inspectable and explicit to debug.

---

## AI Integration & Privacy

**Decision:** Any AI feature sits behind an `AIProvider` interface with two implementations: a **local, no-network default** (rule-based prompt rotation; on-device Whisper for transcription) and an **explicit opt-in cloud implementation** (Claude via the Anthropic API) that the user enables per feature, never globally.

**Reasoning:** Encodes `vision.md`'s consent commitment directly in the type system, not just in a settings screen someone could misconfigure. Enabling cloud AI for prompt suggestions never silently enables it for, say, future transcript analysis — each is its own toggle, its own sentence of explanation, its own `AIProvider` binding.

**Trade-offs accepted:** two code paths per AI feature, for privacy guarantees that don't depend on the user reading fine print.

---

## Sync & Backup

**Sync.** No first-party sync server. The vault directory is designed to tolerate being placed inside a folder managed by a sync tool of the user's choosing (Syncthing, Dropbox, iCloud Drive, a Git repo): no long-held file locks, no in-memory-only state that could conflict with an externally modified file, and a file-watcher that detects and reloads entries changed outside the app. A first-party sync layer is not ruled out for later, but if built, it must still sync plain files a user could point Syncthing at instead — never a proprietary format.

**Backup.** The vault being plain files means backup is whatever the user already does for their filesystem (Timeshift, `rsync`, cloud folder sync, Git) — Paroh doesn't need to reinvent this, just not be the reason it fails. One first-party convenience: a one-click "Export vault as `.zip`" in Settings as a low-friction safety net. A versioned/Git-style backup of the vault itself is a good future idea, tracked in `future-ideas.md`, not core scope now.

---

## Search & Indexing

SQLite's FTS5 extension powers ranked full-text search without hand-rolling a search algorithm. On first launch (or on-demand rebuild), `VaultAdapter` walks the vault and populates FTS5 plus lookup tables for calendar dots, tags, and mood-by-date. On every save, the index updates incrementally for that one file — not a full rebuild — so performance stays flat as the vault grows across years of daily entries (see Long-Term Scalability, below).

---

## Mobile Reuse Strategy

The eventual mobile app is Capacitor wrapping the same React codebase, with `VaultAdapter`'s internals swapped to Capacitor's Filesystem API instead of Node's `fs`, reading and writing the identical `.md` + YAML format. Because the UI, the Domain layer, and the file format are already platform-agnostic (see Layers, above), the mobile port is primarily an Infrastructure-layer adapter swap plus a touch-optimized Presentation-layer pass — not a second codebase. Desktop-specific layouts (the multi-column Canvas grid) will need real mobile-specific layout work, planned honestly, not hand-waved.

---

## Themes

Two built-in visual modes exist as first-class, not skins: **Canvas** (dark, structured, dashboard) and **Editor** (warm, cream, editorial) — exact tokens in `design-system.md`. Both are driven by one CSS custom-property system, so a future user-adjustable accent color or light/dark bias is a token override, not a parallel stylesheet — this is what keeps the two modes feeling like one app.

---

## Plugin Seams (Deliberately Minimal)

No plugin system ships in Phase 1–5. Four seams are kept open on purpose so a real plugin system, if it's ever warranted, is an addition rather than a rewrite:

1. **Tiptap extensions** — custom editor block types follow Tiptap's existing extension pattern.
2. **`AIProvider` interface** — an alternative AI backend is a new implementation of an existing interface.
3. **Prompt Packs** — the prompt library is external JSON (`PRODUCT.md` §3.6), so a themed prompt pack is just more data, not new code.
4. **`VaultAdapter`** — any plugin-originated vault operation would route through the same adapter and IPC boundary as the core app, inheriting the Security Architecture above by construction, not by extra effort.

Nothing beyond these four seams is speculated on here. A full plugin API, permissions model, and marketplace are explicitly out of scope until there's a working, well-loved core product to extend — building that infrastructure now would be exactly the "impressive to build, forgettable to use" trap `vision.md` warns against.

---

## Performance Philosophy

Lazy-load anything not visible (entries outside the current calendar view, images below the fold). Virtualize long lists (All Entries, search results) rather than rendering thousands of DOM nodes. Indexing happens incrementally on save and in the background on rebuild, never blocking the UI thread. Autosave is debounced (a pause in typing, not every keystroke) so atomic saves aren't triggered dozens of times a minute. Images are cached after first load; audio is streamed from disk, never fully loaded into memory. A soft memory budget is a design constraint for the Canvas view specifically, since it's the screen most likely to be open all day.

**What not to optimize early:** anything not yet measured as slow. Premature optimization here means guessing which of the above matters before real usage data says so — Principle 10 (Correctness Before Performance) governs; profile before optimizing, not instead of it.

---

## Logging & Diagnostics

Standard levels: `DEBUG`, `INFO`, `WARN`, `ERROR`. `INFO` for lifecycle events (vault opened, index rebuilt, migration ran). `WARN` for recoverable issues (missing audio file, stale index detected). `ERROR` for anything requiring user awareness (save failed, corrupted YAML detected). `DEBUG` gated behind a developer flag, off by default.

**The one hard rule: journal content is never logged, at any level, ever.** Crash reports, recovery logs, index-rebuild logs, and migration logs record *what happened* (which operation, which file path, which error type) — never *what the user wrote*. A crash report should be useful to a developer without ever showing them a single sentence of someone's journal. This is Privacy by Default applied to the app's own internals, not just to network calls.

---

## Engineering Quality Standards

Before any feature is considered mergeable, it must:

- Work fully offline
- Respect Local-First (no feature silently requires a network call to function)
- Never lose user data, under any of the Failure Philosophy scenarios above
- Be keyboard-navigable and screen-reader accessible (see `accessibility.md`)
- Have tests for its Domain and Application layer logic, at minimum
- Follow the design tokens in `design-system.md` rather than inventing new ones
- Trace back to at least one Architecture Principle above
- Not assume desktop-only constraints where mobile reuse is foreseeable
- Not introduce a new dependency where an existing one already covers the need

This list is the actual pre-merge checklist, not aspirational prose — `contribution.md` should reference it directly rather than duplicating it.

---

## Long-Term Scalability

The architecture above is sized for real longitudinal use, not a demo:

- **10 entries → 10,000+ entries:** flat performance via incremental SQLite indexing (§ Search & Indexing), not full-vault re-scans.
- **10 years of daily journaling:** the calendar and All Entries views are built around date-range queries against the index, not "load everything into memory."
- **Large image/audio libraries:** streamed and lazily loaded, never fully memory-resident (§ Performance Philosophy).
- **Multiple vaults:** not built in Phase 1–5, but `VaultAdapter` is already parameterized by vault path rather than hardcoded to one — a "switch vault" feature later is a Presentation-layer addition, not an Infrastructure rewrite.
- **A future plugin ecosystem:** the four seams above mean this can be added without touching the Domain layer or the Security Architecture that everything else already relies on.

---

## The Vault as Platform — Framed Honestly

There's a real insight in treating the vault as a durable core and the desktop UI as one client of it: the layering above already makes that true in practice — Domain logic doesn't know about Electron, `VaultAdapter` doesn't know about React, and the file format is legible to any future interface (a CLI tool, a read-only web viewer, macOS, mobile) without modification.

But there's a difference between an architecture that's *capable* of supporting multiple future clients and a product roadmap that starts *building* for them. This document commits to the former and deliberately declines the latter for now. Calling Paroh a "platform" before there's one well-loved client of it risks the exact failure mode `vision.md` names directly: *"a feature roadmap that grows because it's easy to build things, not because each thing serves the four minutes."*

So: the vault is architected to outlive any single UI built on top of it. The roadmap, for now, still has exactly one client to build well — the desktop app, on Ubuntu, then Windows. If that client succeeds, the door to a CLI tool, a web viewer, or third-party clients is already open by construction, not by a later rewrite. That's the correct amount of platform thinking at this stage — structural, not promotional.

---

## Summary Table

| Decision | One-line reasoning |
|---|---|
| Ten Architecture Principles | Every later decision traces back to one of these |
| Four-layer system (Presentation/Application/Domain/Infrastructure) | Isolates business logic from platform, enables replaceable components |
| Electron, native builds only | Proven shell; no Wine compatibility-layer risk |
| React + TypeScript | Matches interlocking-state UI shape; type safety across the vault schema |
| Markdown files, YAML frontmatter | Data outlives the company; tool-portable metadata |
| Tiptap | Rich formatting with lossless Markdown round-trip |
| SQLite as index only | Fast search/calendar without threatening Single Source of Truth |
| Atomic save pipeline | Crash/power-loss can never corrupt the last good save |
| Schema versioning | Old entries always load correctly as the app evolves |
| Explicit Failure Philosophy | Every failure mode has a defined, tested, user-visible outcome |
| Strict IPC boundary + Security Architecture | Renderer treated as least-trusted; consent is per-feature |
| Internal event system | New features subscribe to events instead of editing existing code |
| `AIProvider` interface | Consent is per-feature and specific, never global |
| File-level sync only, zip-export backup | No first-party server needed; real backup stays the OS's job |
| Four plugin seams, no plugin system | Extensible later without speculative build now |
| Performance and Logging philosophies | Correctness first; journal content never logged, ever |
| Long-term scalability commitments | Designed for years of daily use, not a demo |
| Vault as structural platform, product roadmap stays focused | Architecture is platform-ready; roadmap ships one great client first |

---

Every decision above should be traceable back to a line in `vision.md`. If you're adding a new decision and can't point to which line it protects, stop and go find out — or write that line into `vision.md` first.
