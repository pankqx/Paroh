# Folder Structure

> This is the literal, physical map of the repository and the vault. Every path here should exist, or be the next thing created, before any unrelated file shows up somewhere not listed. If you're about to create a file and its home isn't obvious from this document, stop and add it here first.

---

## Repository Root

```
Paroh/
│
├── PRODUCT.md                  Product bible — the master product constitution
├── README.md                   What Paroh is, how to run it, for a stranger on GitHub
├── CHANGELOG.md                Every version, every release
├── LICENSE
├── .gitignore
│
├── docs/                       See below
├── references/                 Screenshots, inspiration, raw design notes
├── assets/                     App icons, fonts, static images shipped with the app
├── src/                        See below
├── vault/                      A real, working vault used for dev/testing — see below
└── tests/                      Mirrors src/ structure, see Testing section
```

---

## `docs/`

```
docs/
├── vision.md                   Why Paroh exists — read this first, always
├── architecture.md             Every technical decision, with reasoning
├── folder-structure.md         This file
├── design-system.md            Color/type/spacing tokens, component rules
├── ui-rules.md                 Interaction patterns, do's/don'ts across screens
├── feature-specifications.md   Every feature: user stories → acceptance criteria
├── roadmap.md                  Phases, milestones
├── project-state.md            "Where are we right now" — updated every session
├── tasks.md                    Current sprint / active work
├── coding-standards.md         Naming, TS rules, React patterns
├── accessibility.md            WCAG targets, keyboard nav, screen reader rules
├── testing.md                  What gets tested, how, at which layer
├── release-plan.md             How a version goes from built to shipped
├── security.md                 Expanded version of architecture.md's security section
├── performance.md              Expanded version of architecture.md's performance section
├── api.md                      IPC contract reference — every channel, typed
├── contribution.md             How to contribute — references coding-standards + quality checklist
├── decisions.md                Log of smaller decisions not big enough for architecture.md
└── future-ideas.md             Parked ideas — Seasons, AI Chapters narrative, encryption, multi-vault, plugin API
```

**Ordering note:** `security.md`, `performance.md`, and `api.md` are *expansions* of sections that already exist in `architecture.md`. `architecture.md` stays the authoritative summary; these three go deep on implementation specifics that would bloat it if inlined. Keep them in sync — if `architecture.md`'s Security Architecture section changes, check `security.md` the same day.

---

## `references/`

```
references/
├── dashboard.png                Canvas mode reference screenshot
├── editor.png                   Editor mode reference screenshot
├── yearly-planner-reference.png Horizons interaction reference (infinite horizontal scroll)
├── monthly-planner-reference.png Chapters layout reference
├── inspiration/                 Anything else pulled from elsewhere, credited
└── ui-notes.md                  Freeform notes tying references to actual decisions made
```

---

## `assets/`

```
assets/
├── icons/
│   ├── app-icon.svg              Source icon
│   ├── app-icon-512.png          Generated sizes for packaging
│   ├── app-icon-256.png
│   └── app-icon-128.png
├── fonts/
│   ├── Inter/                    UI sans — licensed, bundled, not CDN-loaded
│   ├── Fraunces/                 Editorial serif
│   └── JetBrainsMono/            Code blocks
└── openers/
    ├── quotes.json                Curated quote bank for the daily opener (§3.8 of PRODUCT.md)
    └── images/                    Curated opener photography, locally bundled — never scraped live
```

**Why fonts are bundled, not CDN-loaded:** Local-first (Architecture Principle 3) — the opener, the editor, the entire UI must render correctly with zero network connection from first launch.

---

## `src/` — Mirrors the Architecture Layers Exactly

This is the most important mapping in this document: the four layers from `architecture.md` are not just a diagram, they are real folders, and code is not allowed to import "sideways" across them except through the declared interfaces.

```
src/
│
├── main/                        Electron MAIN PROCESS — Infrastructure layer lives here
│   ├── index.ts                  App entry point, window creation
│   ├── ipc/                      IPC handlers — the ONLY code that receives renderer calls
│   │   ├── entries.ipc.ts
│   │   ├── habits.ipc.ts
│   │   ├── tasks.ipc.ts
│   │   ├── audio.ipc.ts
│   │   ├── prompts.ipc.ts
│   │   ├── horizons.ipc.ts       Life Stories CRUD
│   │   ├── chapters.ipc.ts       Computed monthly-view queries
│   │   ├── search.ipc.ts
│   │   └── settings.ipc.ts
│   ├── vault/                    VaultAdapter — the ONLY code that touches fs directly
│   │   ├── VaultAdapter.ts
│   │   ├── frontmatter.ts        YAML parse/serialize + schema_version handling
│   │   ├── atomicWrite.ts        The save pipeline from architecture.md
│   │   └── fileWatcher.ts        Detects externally changed/deleted files
│   ├── index-db/                 SQLite — disposable index, never source of truth
│   │   ├── schema.sql
│   │   ├── IndexRepository.ts
│   │   └── rebuild.ts
│   ├── ai/                       AIProvider implementations
│   │   ├── AIProvider.interface.ts
│   │   ├── LocalAIProvider.ts    Rule-based prompts, on-device Whisper
│   │   └── CloudAIProvider.ts    Anthropic API — only called with per-feature consent
│   └── audio/
│       └── AudioRecorder.ts
│
├── preload/
│   └── bridge.ts                 contextBridge surface — the typed API the renderer sees
│
├── shared/                       Types shared by main + renderer, nothing else
│   ├── types/
│   │   ├── Entry.ts
│   │   ├── Mood.ts
│   │   ├── Habit.ts
│   │   ├── Task.ts
│   │   ├── Prompt.ts
│   │   ├── LifeStory.ts          Horizons data shape
│   │   └── events.ts             The full domain event catalogue from architecture.md
│   └── ipc-contract.ts           Single source of truth for every IPC channel's shape
│
├── renderer/                     Everything below is Presentation + Application layer
│   ├── app/
│   │   ├── App.tsx
│   │   └── router.tsx
│   │
│   ├── application/               Application layer — Commands & Use Cases
│   │   ├── commands/
│   │   │   ├── saveEntry.ts
│   │   │   ├── completeHabit.ts
│   │   │   ├── answerPrompt.ts
│   │   │   └── createLifeStory.ts
│   │   ├── useCases/
│   │   │   ├── rotateDailyPrompt.ts
│   │   │   ├── computeChapterForMonth.ts
│   │   │   └── exportVault.ts
│   │   └── eventBus.ts           Publishes/subscribes domain events (architecture.md)
│   │
│   ├── domain/                    Domain layer — pure logic, no React, no fs, no fetch
│   │   ├── streak.ts
│   │   ├── overdueTask.ts
│   │   ├── moodTrend.ts
│   │   └── wordFrequency.ts       Powers Chapters' "most mentioned word"
│   │
│   ├── features/                  Presentation layer, one folder per screen/feature
│   │   ├── canvas/
│   │   │   ├── CanvasPage.tsx
│   │   │   ├── HeroOpenerCard.tsx
│   │   │   ├── MoodCheckInCard.tsx
│   │   │   ├── MiniCalendarCard.tsx
│   │   │   ├── HealingPromptCard.tsx
│   │   │   ├── RecentEntriesRow.tsx
│   │   │   ├── HabitsCard.tsx
│   │   │   ├── TasksCard.tsx
│   │   │   └── AudioLogsCard.tsx
│   │   ├── editor/
│   │   │   ├── EditorPage.tsx
│   │   │   ├── FormattingToolbar.tsx
│   │   │   ├── MetadataRail.tsx
│   │   │   └── tiptap-extensions/
│   │   │       ├── wikilink.ts
│   │   │       └── promptBlock.ts
│   │   ├── calendar/
│   │   │   └── CalendarPage.tsx
│   │   ├── all-entries/
│   │   │   └── AllEntriesPage.tsx
│   │   ├── audio-logs/
│   │   │   └── AudioLogsPage.tsx
│   │   ├── habits/
│   │   │   └── HabitsPage.tsx
│   │   ├── todo/
│   │   │   └── TodoPage.tsx
│   │   ├── healing-prompts/
│   │   │   └── HealingPromptsPage.tsx
│   │   ├── chapters/                       NEW — Chapters feature
│   │   │   ├── ChaptersPage.tsx
│   │   │   ├── MoodLandscape.tsx           Terrain visualization
│   │   │   ├── ChapterStatsGrid.tsx        Entry count, streak, word frequency
│   │   │   └── ChapterEditorsNote.tsx      AI summary — CloudAIProvider only, opt-in
│   │   ├── horizons/                       NEW — Horizons feature
│   │   │   ├── HorizonsPage.tsx
│   │   │   ├── TimelineCanvas.tsx          Infinite horizontal scroll + zoom
│   │   │   ├── LifeAreaRow.tsx
│   │   │   ├── LifeStoryCard.tsx
│   │   │   └── LifeStoryEditor.tsx         Title, "why," linked entries
│   │   └── settings/
│   │       └── SettingsPage.tsx
│   │
│   ├── components/                Shared, dumb, reusable UI — no feature-specific logic
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── TagChip.tsx
│   │   ├── MoodSelector.tsx
│   │   ├── StreakBadge.tsx
│   │   └── CalendarCell.tsx
│   │
│   ├── styles/
│   │   ├── tokens.css              Every value from design-system.md, as CSS custom properties
│   │   ├── canvas-theme.css
│   │   └── editor-theme.css
│   │
│   └── hooks/
│       ├── useEntry.ts
│       ├── useVaultEvents.ts       Subscribes to the event bus
│       └── useMoodTrend.ts
```

**The one rule that matters most in this whole document:** `renderer/features/**` never imports from `main/**`, and never touches `fs`, `sqlite`, or `fetch` directly — only through `preload/bridge.ts`. If you catch yourself writing `import fs from 'fs'` anywhere under `renderer/`, that's not a style violation, it's a Security Architecture violation (`architecture.md` § Security Architecture, renderer isolation).

---

## `vault/` — The Format Users' Real Vaults Will Follow

This copy in the repo is a **working example vault** for development — not a template shipped to users. Its shape is authoritative for what `VaultAdapter` reads/writes.

```
vault/
├── .paroh/
│   ├── index.db                    SQLite index — disposable, rebuildable, gitignored
│   └── config.json                 Vault-level settings (not app-level — app settings live elsewhere)
│
├── 2026-06/                        One folder per month
│   ├── 2026-06-11.md
│   ├── 2026-06-12.md
│   └── 2026-06-13.md
│
├── audio/
│   ├── 2026-06-11-0234.webm
│   └── 2026-06-10-1612.webm
│
├── attachments/
│   └── 2026-06-11-hero-image.jpg
│
└── horizons/                        NEW — Life Stories, same file philosophy as entries
    ├── career/
    │   ├── own-my-first-car.md
    │   └── ship-paroh-v1.md
    ├── health/
    │   └── run-a-5k.md
    ├── relationships/
    ├── learning/
    ├── travel/
    ├── finance/
    └── adventure/
```

**Life Story file shape** (mirrors the entry frontmatter pattern from `architecture.md` §Schema Versioning):

```yaml
---
schema_version: 1
title: "Own my first car"
life_area: career
status: in-motion            # dreaming | in-motion | living-it | let-go
created: 2026-06-01
linked_entries: [2026-06-11, 2026-07-03]
---

## Why

Freedom. Weekend trips. Drive my parents somewhere without asking anyone.
```

Note there is deliberately no `progress_percent` field — per the decision in the Horizons discussion, status is a narrative state, not a percentage, and the file format itself enforces that by not having a slot for one.

`chapters/` has **no folder** — a Chapter is a computed view over a month's existing entries (mood, count, word frequency, streaks), not stored data. If this changes later (e.g., a user can pin/edit a Chapter's cover or note), it would live at `vault/chapters/YYYY-MM.md` — not built now, noted here so the eventual home is already decided.

---

## `tests/`

Mirrors `src/` one-to-one, so a file's test is always where you'd guess:

```
tests/
├── main/
│   └── vault/
│       ├── atomicWrite.test.ts
│       └── frontmatter.test.ts
├── renderer/
│   ├── domain/
│   │   ├── streak.test.ts
│   │   └── wordFrequency.test.ts
│   └── application/
│       └── commands/
│           └── saveEntry.test.ts
└── fixtures/
    └── sample-vault/               A small, static vault used across tests — never the dev vault above
```

Per `architecture.md`'s Engineering Quality Standards, Domain and Application layer logic needs tests at minimum before merge — `domain/` and `application/` under `tests/` are the non-negotiable floor; `main/` and `renderer/features/` tests are strongly encouraged but not blocking in early phases.

---

## `.github/`

```
.github/
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   └── feature_request.md
├── PULL_REQUEST_TEMPLATE.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md              Short — points to docs/contribution.md for real detail
└── workflows/
    ├── ci.yml                    Lint + test on every PR
    ├── build-ubuntu.yml          .deb / .AppImage
    └── build-windows.yml         .exe / .msi — CI-only, per architecture.md's platform strategy
```

---

## What's Deliberately Not Here Yet

- No `plugins/` folder — per `architecture.md`, plugin seams exist in code (Tiptap extensions, `AIProvider`, Prompt Packs, `VaultAdapter`) but there is no plugin loader or marketplace scaffolding until Phase 5+.
- No `mobile/` folder — the mobile port reuses `src/renderer` and `src/shared` almost entirely; when it starts, it'll add a `src/mobile-main/` (Capacitor's equivalent of `src/main/`) rather than a parallel app.
- No `chapters/` folder in the vault — see above, intentional.
- No `encrypted-vault/` variant — tracked in `future-ideas.md`, not designed yet.

If you find yourself about to create any of the above, stop — that's a sign a phase boundary is being crossed early. Check `roadmap.md` first.
