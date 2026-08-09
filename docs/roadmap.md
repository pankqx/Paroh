# Roadmap

> Phases are ordered by dependency, not by excitement — a later phase's honesty (Chapters, Horizons) depends on earlier phases having produced real data to reflect on. Don't reorder this to build a "cooler" feature early; check what it silently depends on first.

---

## Phase 1 — Skeleton
**Goal:** the app opens, shows Canvas and Editor as static shells, and can write one real file to disk.

- Electron shell boots on Ubuntu, packaged as `.AppImage` for local testing
- `VaultAdapter` reads/writes a single entry with atomic save pipeline (`architecture.md`)
- Canvas and Editor layouts built to spec, no live data — hardcoded placeholder content
- Design tokens (`design-system.md`) implemented as `tokens.css`, applied to both modes
- Basic Markdown round-trip proven end-to-end (write in Editor → real `.md` file → reopen → identical content)

**Exit criteria:** a user can open the app, write an entry, close the app, reopen it, and see that entry exactly as written.

## Phase 2 — Core Loop
**Goal:** the daily habit loop actually works — write, see it on the calendar, find it again.

- Real entry CRUD wired to Canvas and Editor (no more placeholders)
- Calendar (mini + full) with live entry-dot indicators
- Mood Check-In, wired to frontmatter and reflected on Calendar
- Tags, basic full-text search (SQLite FTS5 index stood up per `architecture.md`)
- All Entries page
- Daily Opener (static curated quote/image bank, no rotation logic yet beyond no-repeat window)

**Exit criteria:** a user can journal daily for a week, see every day dot on the calendar, and find any entry by tag or search.

## Phase 3 — Habits, To-Do, Audio
**Goal:** the full Canvas dashboard from the reference screenshots is real, not mockup.

- Habit CRUD, streaks, Canvas card + full page with heatmap
- To-Do CRUD, "did you finish this?" next-day nudge, recurring tasks
- Audio recording, playback, linking to entries, global record shortcut
- Mood trend chart (basic line/heatmap) on Calendar page

**Exit criteria:** Canvas matches the reference screenshot's full card set, all live, all backed by real persisted data.

## Phase 4 — Healing Prompt Engine
**Goal:** the therapeutic core ships — the thing that makes Paroh different from a generic journal.

- Full CBT prompt library authored and loaded (`assets/prompts.json`, `feature-specifications.md` §5)
- 6-month/24-week rotation logic, prompt history page, manual override
- Prompt pre-seeding into new entries when "Write about it" is chosen

**Exit criteria:** a user can run the full daily practice loop — opener → prompt → write → mood → habits → to-do — for real, for weeks, without a single feature being a placeholder.

## Phase 5 — Horizons & Chapters
**Goal:** reflection features that depend on Phase 1-4 having produced real accumulated data.

- Chapters: computed monthly view (mood landscape, stats, top word) — local only, no AI required
- Horizons: infinite horizontal timeline (Year/Quarter zoom for v1), Life Areas, Life Story CRUD with the "why" field, status states (no percentages)
- Sidebar reorganized into Today/Reflect groups (`folder-structure.md`)

**Exit criteria:** a user with a few months of real entries can open Chapters and Horizons and see something genuinely worth revisiting, not an empty scaffold.

## Phase 6 — Polish & Packaging
**Goal:** ready to actually ship to real users, not just dogfood.

- Full design-system polish pass across every screen (spacing, motion, empty states re-checked against `ui-rules.md`)
- Settings page complete: vault management, AI feature toggles (all off by default), reminders, export/import, permanent privacy/crisis-resources line
- `.deb`/`.AppImage` build finalized via `electron-builder`
- Accessibility pass against `accessibility.md`
- Onboarding flow for first-time vault setup

**Exit criteria:** a stranger can install Paroh on Ubuntu, set up a vault, and use every shipped feature without hitting a placeholder, without prior explanation.

## Phase 7 — Windows Build
**Goal:** second native platform, same codebase, per the no-Wine platform strategy in `architecture.md`.

- CI pipeline (`build-windows.yml`) producing `.exe`/`.msi`
- Windows-specific QA pass: file paths, notifications, window chrome, keyboard shortcut conventions (`Ctrl` vs any Ubuntu-specific bindings)
- No new features in this phase — parity, not expansion

**Exit criteria:** functional parity with the Ubuntu build, verified on a real Windows machine, not just CI.

## Phase 8 — AI Features (Opt-In)
**Goal:** the `AIProvider` seam from `architecture.md` gets its first real implementation.

- `CloudAIProvider` (Claude via Anthropic API) wired for the first, lowest-risk feature: Chapters' "Editor's Note" narrative summary — opt-in, off by default
- Local Whisper-based audio transcription (on-device, no cloud requirement)
- Each AI feature ships with its own explicit consent toggle in Settings, per feature, per `feature-specifications.md`'s Settings acceptance criteria

**Exit criteria:** AI features are genuinely useful, genuinely optional, and a user who never opts into any of them has an unchanged, fully-functional app.

## Phase 9 — Mobile
**Goal:** the same vault, in your pocket.

- Capacitor wrapper, `VaultAdapter` internals swapped for Capacitor's Filesystem API (`architecture.md` §Mobile Reuse Strategy)
- Touch-optimized layout pass for Canvas's multi-column grid and Horizons' timeline interaction
- Same file format — an entry written on Ubuntu opens correctly on mobile with zero conversion

**Exit criteria:** a user can journal on their phone in a waiting room and see the same entry on their Ubuntu machine that evening via their own sync setup.

## Phase 10+ — Beyond
Not scheduled, tracked in `future-ideas.md`: AI Therapist Voice Mode, macOS build, encrypted vault mode, multi-vault support, a real plugin system built on the four seams already reserved for it, AI-detected "Seasons" in Horizons, a possible read-only web viewer or CLI tool over the same vault format.

---

## What's Explicitly Not on This Roadmap

- A plugin marketplace — the seams exist (`architecture.md`), the marketplace doesn't, and won't until there's a proven core product asking for it
- Any first-party cloud sync/hosting service — deferred indefinitely per the local-first commitment; file-level sync via tools the user already trusts is the plan, not a stopgap
- Gamification beyond streaks (points, levels, badges) — conflicts directly with `vision.md`'s "no guilt, no scoreboard" stance; not a future phase, a permanent no unless `vision.md` itself changes first

---

## How to Use This Document

Before starting work in a session, check which Phase is active in `project-state.md`, then pull the relevant checklist items into `tasks.md`. Don't pull Phase 5 work into a Phase 2 session just because it sounds more interesting that day — the exit criteria above exist specifically to prevent that kind of drift.
