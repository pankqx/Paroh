# Paroh — Product Constitution

**Version:** 0.1.0 (Documentation / product draft)
**Status:** Current product direction and documentation are aligned; implementation has not started
**Last updated:** 2026-08-09

> This document is the single source of truth for Paroh. When a later document or a newer decision conflicts with an older draft, this file and the latest entries in docs/decisions.md govern.

---

## 1. Product identity

**Name:** Paroh

**Descriptor:** Personal Operating System

**Long-form identity:** Paroh is an offline-first, privacy-first, open-source Personal Operating System where journaling is the heart of the experience.

The journal remains the center of the product. Paroh may grow into a broader system around:

- Journal
- Canvas
- Habits
- Tasks
- Calendar
- Mood
- Audio Journal
- Templates
- Horizons
- Chapters
- Life Stories
- Knowledge
- Reflection
- Future AI companion

No additional product areas are introduced here beyond those already named in the repository's existing product direction.

---

## 2. What Paroh is for

Paroh is not merely a journal app. It is intended to become a Personal Operating System for everyday reflection, planning, and self-understanding.

The experience is grounded in four commitments:

1. **Offline-first and privacy-first.** The core experience should work without a network connection and preserve the user's data in plain, durable files they can access directly.
2. **Calm and non-guilting.** The product should feel safe to return to on hard days rather than punitive or performance-oriented.
3. **Journal-first.** The journal remains the emotional center of the experience, even as the product grows into a broader system.
4. **Open and durable.** The user's writing should outlive any particular interface or company decision.

---

## 3. Confirmed product decisions

### 3.1 Paroh is a Personal Operating System

Paroh is intended to become a Personal Operating System, not merely a journal application. The journal remains the heart of the system, but the product can expand around it over time.

### 3.2 Dashboard customization

Users should eventually be able to customize their dashboard by:

- adding widgets
- removing widgets
- rearranging widgets
- resizing widgets
- customizing their workspace

The default dashboard should remain calm and minimal.

### 3.3 Canvas as a visual thinking space

The Canvas becomes a visual thinking space inspired by Milanote. It may eventually contain:

- text
- images
- sticky notes
- links
- files
- journal blocks
- audio
- mind maps
- future drawing support

Handwriting and drawing are not current priorities and remain deferred.

### 3.4 Reflection rhythms

Journaling should support:

- daily reflection
- weekly reflection
- monthly reflection
- yearly reflection

These should be supported naturally rather than requiring users to manually reconstruct the structure every time.

### 3.5 Life Operating System direction

Paroh is intended to evolve into a Life Operating System. The journal remains the heart of the product.

### 3.6 Templates

Users can create their own templates. Paroh should also ship with useful pre-built templates because many users will not want to create them themselves.

Starter templates aligned with the existing product direction include:

- Morning Journal
- Evening Reflection
- Weekly Review
- Monthly Review
- Yearly Reflection
- Gratitude
- Dream Journal
- Study Session
- Meeting Notes
- Book Notes
- Decision Journal
- Therapy / Reflection Notes
- Travel Journal
- Relationship Reflection

### 3.7 Brand identity

- Name: Paroh
- Descriptor: Personal Operating System

### 3.8 Opening and splash experience

Paroh should include an opening experience that presents the product logo and the descriptor beneath it:

- Product logo: Paroh
- Descriptor displayed beneath the logo: "Personal Operating System"

The opening experience should use a short, calm, elegant animation that visually communicates that Paroh connects the user's journal, canvas, habits, tasks, calendar, reflection, and other life areas into one personal operating system. The animation should be approximately 1–1.5 seconds long, should never delay the application unnecessarily, and should be possible to disable in a future setting.

This animation is a visual branding requirement only and must not be implemented yet.

---

## 4. Visual direction

The current repository's documented design decision is authoritative: the Canvas is a light, warm, structured surface with a dotted texture and white cards, while the Editor is warm and editorial. The earlier dark-Canvas description is superseded by the latest design decision in docs/decisions.md.

The product should feel like one system with two tonal modes rather than two unrelated interfaces.

---

## 5. Product scope and guardrails

Paroh should remain centered on reflection, emotional clarity, and the user's ownership of their own data. It should not become a performance surface, a guilt-driven habit tracker, or a cloud-first product that treats private writing as a product asset.

Important guardrails include:

- it should support healing and reflection without claiming to replace professional care
- it should never punish a missed day as a failure state
- it should remain local-first and privacy-first
- it should preserve a calm, minimal default experience even as more features are added

---

## 6. Documentation issues

- The original dashboard/editor reference image assets are not present in the repository's references directory. They should be placed there if available, but documentation cleanup should continue without blocking on them.

---

## 7. Current implementation status

The repository currently contains the product documentation and planning materials, but not the Phase 1 application implementation. This document remains the authoritative product definition while implementation work remains pending.

This is the therapeutic engine of the whole app, and it deserves real structure, not a random quote generator.

### 7.1 Structure
The program runs in **4-week blocks across 24 weeks (~6 months)**, each block focused on one CBT skill area, escalating in depth. Prompts rotate daily within the active block; the user can also browse/pick manually from the full library at any time (§4.16).

| Weeks | Focus | Core CBT skill |
|---|---|---|
| 1–4 | Psychoeducation + noticing | Identifying thought patterns, mood-thought-behavior links |
| 5–8 | Cognitive restructuring | Naming cognitive distortions, evidence-for/against thinking |
| 9–12 | Social anxiety specific | Exposure hierarchy building, post-event processing, safety-behavior reduction |
| 13–16 | Behavioral activation | Fighting depressive withdrawal via small scheduled actions |
| 17–20 | Self-compassion & core beliefs | Softening the inner critic, values clarification |
| 21–24 | Relapse-proofing | Consolidating skills, building a personal "toolkit" entry, planning for setbacks |

### 7.2 Sample prompts by category (representative, not exhaustive — the full library lives in `docs/feature-specifications.md` once we build it out)

**Noticing (Weeks 1–4)**
- "What's one moment today when your mood shifted? What happened right before it?"
- "Describe a thought that visited you today without you inviting it. Where do you think it came from?"

**Cognitive restructuring (Weeks 5–8)**
- "What's a thought you had today that felt 100% true in the moment? What's the evidence for it — and against it?"
- "If a friend told you they were thinking this about themselves, what would you say back to them?"

**Social anxiety specific (Weeks 9–12)** — matches the exact prompt style from Screenshot 1
- "What is one social situation that made you anxious this week? What was the fear underneath it?"
- "Think of a conversation you replayed in your head afterward. What did you assume people noticed? How likely is that, really?"
- "Name one 'safety behavior' you used today (avoiding eye contact, over-preparing what to say, leaving early). What might happen if you dropped it by 10%?"

**Behavioral activation (Weeks 13–16)**
- "What's one small thing you used to enjoy that you haven't done in a while? Could you do 10 minutes of it this week?"
- "Describe a task you've been avoiding. What's the smallest possible first step?"

**Self-compassion (Weeks 17–20)**
- "Write a short letter to yourself from a year in the future, looking back on this season with kindness."
- "What's a rule you hold yourself to that you wouldn't hold a friend to?"

**Relapse-proofing (Weeks 21–24)**
- "Looking back over your entries, what's one coping tool that's worked more than once? Write it down as if instructing a future version of yourself."
- "What would the early warning signs of a hard week look like for you? What's your first move when you notice them?"

### 6.3 Data shape
Each prompt is a small object: `{ id, week_block, category, text, followups?: [] }`. Stored as JSON in `src/data/prompts.json` (or later a small table in the SQLite index), never hardcoded into components — this keeps the library editable without touching UI code.

---

## 7. Cross-Cutting Intelligent Features

7.1 **Streak system** — consecutive days with at least one saved entry; shown in sidebar (🔥 14-day streak)
7.2 **"Did you finish this?" nudge** — see §4.9
7.3 **Entry indicator dots** — see §4.5/§4.12
7.4 **Global search** — full-text, tag, mood, and date-range filters
7.5 **Wikilinks + backlinks** — Obsidian-style graph between entries
7.6 **Export/Import** — full vault as `.zip`, or single entry as `.md`/`.pdf`
7.7 **Blog publish flow** — toggling Public strips private metadata and pushes a clean read-only export (destination — static file, or later a hosted option — is a Phase-3+ decision, not needed now)
7.8 **Offline-first, always** — nothing in the core app requires internet; only Phase 4's AI Therapist Voice will need a connection
7.9 **Mood trend chart** (Phase 3) — a small line/heatmap chart on the Calendar page showing mood over time, useful for both the user and, later, for the AI Therapist's context
7.10 **Habit heatmap** (Phase 3) — GitHub-style contribution graph per habit

---

## 8. Future: AI Therapist Voice Mode (Phase 4 — architecture only, not built now)

Not building this yet, but the app must be architected so it slots in cleanly later:
- Reads recent entries + mood/habit data (with explicit user consent, local-only unless the user opts into cloud AI) as context
- Voice in (Whisper or similar), voice out (TTS), text fallback always available
- Behaves like a grounded, CBT-literate listener — reflects, asks open questions, never diagnoses, always signposts professional help for anything beyond its depth
- Every AI Therapist session, once built, should itself be saved as a normal `.md` entry (transcript + summary) — so it's just another kind of journal entry, not a separate silo

---

## 9. Build Order (so tokens/sessions map to real milestones)

**Phase 1 — Skeleton**
Electron shell, vault file I/O, Canvas layout (static), Editor layout (static), basic Markdown round-trip.

**Phase 2 — Core loop**
Real entry creation/save/load, calendar with entry dots, mood check-in, tags, search.

**Phase 3 — Habits, To-Do, Audio**
Habit CRUD + streaks, to-do CRUD + "did you finish this," audio recording + playback + linking.

**Phase 4 — Healing Prompt Engine**
Full prompt library, 6-month block rotation, prompt history page.

**Phase 5 — Polish & packaging**
Design system pass, opener quote/meme rotation, `.deb`/`.AppImage` build, Settings page, export/import.

**Phase 6 — Future**
AI Therapist Voice Mode, Windows build, mobile via Capacitor, sync strategy.

This maps directly onto `docs/roadmap.md` and `docs/tasks.md` — each phase above should become its own checklist there when we start writing code.

---

## 10. Open Questions for You

1. Do you want habit/to-do/mood data duplicated into each day's frontmatter (fully self-contained files, simplest, slightly redundant) or centralized in a separate `habits.json`/`todos.json` (less redundant, but entries alone won't tell the whole story if someone opens just the `.md` in Obsidian)? I'd lean toward **frontmatter-first** for portability, but it's your call.
2. For the opening quote/meme rotation — should I curate an initial static set (~50 quotes/images) now, or do you want to supply your own images/quotes to keep it personal?
3. For Phase 1, do you want me to start writing actual Electron/React code next, or flesh out `docs/design-system.md` (exact colors, type scale, spacing) first so the code has precise values to build against?
