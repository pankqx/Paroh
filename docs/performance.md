# Performance

> Expands `architecture.md`'s Performance Philosophy into concrete budgets. Correctness still outranks every number here (Architecture Principle 10) — these are targets to profile against, not excuses to cut a correctness corner.

---

## Budgets

| Metric | Target | Why this number |
|---|---|---|
| Cold app launch (to interactive Canvas) | < 1.5s on a mid-range machine | This is the "did I actually open the app" moment — slower than this and the four-minute daily habit starts to feel like friction |
| Entry save (keystroke pause → confirmed on disk) | < 150ms | Fast enough that "Saved" feels instant, never anxiety-inducing about whether it worked |
| Calendar month render | < 100ms | Should feel like flipping a physical page, not loading a page |
| Search query response (10,000-entry vault) | < 300ms | FTS5-backed, should stay flat regardless of vault size (see Indexing) |
| Editor keystroke-to-render latency | < 16ms (one frame) | Typing lag is one of the fastest ways to break trust in a writing tool |
| Index rebuild (10,000 entries) | < 5s, non-blocking | Rare operation, but must never freeze the UI while it runs |
| Memory footprint, Canvas idle | < 250MB **[target, revisit once measured]** | Reasonable for an always-could-be-open app without becoming "the reason my laptop fan is loud" |

These are targets for profiling against on real hardware once there's a real app to measure — not guesses to defend past evidence. Revise the table itself once actual numbers exist; don't quietly ignore a budget that turns out to be wrong.

## Techniques (from `architecture.md`, expanded)

**Lazy loading.** Entries outside the visible calendar range, images below the fold, and Horizons' distant time periods are not fetched until scrolled/navigated into view.

**Virtualization.** All Entries and Search Results use windowed rendering (only visible rows exist in the DOM) once a vault exceeds roughly a few hundred entries — below that threshold, plain rendering is simpler and the added complexity isn't worth it yet.

**Incremental indexing.** A save triggers a single-file index update, never a full-vault re-scan (`architecture.md` §Search & Indexing). Full rebuilds only happen on explicit user request or detected index corruption.

**Debounced autosave.** ~2 seconds of typing inactivity before a save fires, avoiding both excessive disk writes and excessive index churn during active typing.

**Image handling.** Thumbnails generated and cached on first load for any image embedded in an entry; the full-resolution file is only loaded when the image is actually opened/expanded.

**Audio streaming.** Playback streams from disk via the OS's audio pipeline, never loads a full recording into memory first — matters especially for the "no artificial length cap" decision in `feature-specifications.md` §8.

**Background work off the main thread.** Index rebuilds and vault exports run in a separate process/worker where Electron's architecture allows it, so the UI thread stays responsive throughout.

## What Not to Optimize Early

Per Architecture Principle 10 and `architecture.md`'s Performance Philosophy: don't optimize Horizons' timeline rendering before it has real data to render against; don't build a caching layer for Chapters' word-frequency computation before profiling shows it's actually slow at realistic vault sizes. Every optimization in this document should be justified by a measured number, not a guess about where slowness "probably" is.

## Performance Testing

A dedicated large fixture vault (~1,000-10,000 synthetically generated entries, clearly fictional content per `testing.md`'s fixture rules) is used specifically for performance regression testing — separate from the small correctness-focused fixture vault. Run before every release per `release-plan.md`, and whenever a PR touches indexing, search, or the Editor's core render path.

## Regression Policy

A PR that regresses any budget above by more than ~20% needs an explicit justification in the PR description (a real feature trade-off, reviewed and accepted) or a fix before merge — performance regressions are easy to accumulate silently one small PR at a time, so this is checked deliberately, not assumed to be someone else's problem later.
