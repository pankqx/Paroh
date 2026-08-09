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

---

## Template for New Entries

```
### YYYY-MM-DD — Short decision title
What was decided. Why. What alternative(s) were considered and rejected, briefly.
```
