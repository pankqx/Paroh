# Future Ideas

> Things that are good ideas, deliberately not built yet. Living here instead of in an issue tracker keeps them visible to anyone reading the docs, and keeps `roadmap.md` honest about what's actually scheduled vs. what's just appealing. Nothing here is promised — this is a parking lot, not a commitment.

---

## Product Features

- **AI Therapist Voice Mode** — voice-in/voice-out CBT-literate reflective conversation, transcript saved as a normal journal entry. The big future feature; architecture already leaves room for it (`architecture.md` §AI Integration). Never diagnoses, always signposts professional help for anything beyond its depth.
- **AI-detected "Seasons" in Horizons** — automatically noticing and labeling emotionally-related spans of months (e.g., "Season of Becoming") based on patterns across entries. Requires `CloudAIProvider`, explicitly deferred from Horizons v1.
- **Chapters' "Editor's Note"** — AI-generated narrative summary of a month, layered on top of the already-shippable local stats. Phase 8, opt-in.
- **Deeper Horizons zoom** — true Year → Quarter → Month → Week → Today continuous zoom, Google-Maps-style. v1 ships Year/Quarter only.
- **Habit "why" field** — same emotional-anchor pattern as Life Stories, applied to habits.
- **Task-to-Life-Story linking** — connect a To-Do item directly to the Horizons story it serves.
- **Local audio transcription surfaced as searchable text** — on-device Whisper, no cloud requirement, makes audio logs findable via the same search as written entries.
- **Entry version history** — see the evolution of an entry if edited after the fact, not just the final saved state.
- **Editor focus mode** — hide toolbar/metadata rail entirely for distraction-free writing.
- **User-supplied opener content** — let users add their own quotes/photos to the Daily Opener bank instead of only the curated set in `assets/openers/quotes.json`.
- **Saved searches / smart filters** — e.g., "show me every low-mood day with no entry," useful for noticing avoidance patterns without manual digging.
- **Optional Chapters cover/editor's-note pinning** — if this ships, `vault/chapters/YYYY-MM.md` becomes a real file per `folder-structure.md`'s forward note; not needed while Chapters stays fully computed.

## Platform & Infrastructure

- **macOS build** — same codebase, same native-build-only strategy as Windows.
- **Mobile via Capacitor** — Phase 9, already architected for via `VaultAdapter`'s adapter-swap design.
- **A real plugin system** — built on the four seams already reserved (Tiptap extensions, `AIProvider`, Prompt Packs, `VaultAdapter`), including a permissions model, once there's a proven core product asking for it. Explicitly not scheduled.
- **Read-only web viewer or CLI tool** — additional thin clients over the same durable vault format, discussed in `architecture.md`'s closing "Vault as Platform" section as structurally possible, not currently planned.
- **First-party sync service** — only if ever built, must still sync plain files a user could point Syncthing at instead; not a proprietary format or account-bound store.
- **Versioned/Git-style vault backup** — beyond the current zip-export safety net.
- **Multiple vaults** — `VaultAdapter` is already parameterized by path, making this an addition rather than a rewrite when it's prioritized.

## Security & Privacy

- **Encrypted vault mode** — opt-in, per-vault, user-held key, no Paroh-side recovery path (`security.md`). Needs its own careful design pass, including how the trade-off of "losing the key means losing access" is communicated.

## Explicitly Rejected (recorded here so they don't get re-proposed without context)

- **Gamification beyond streaks** (points, levels, badges) — conflicts directly with `vision.md`; would need `vision.md` itself to change first, not just a feature PR.
- **Cloud-first architecture** — rejected at the foundational level; local-first is not up for reconsideration without revisiting `vision.md`'s privacy commitments entirely.
- **Global "enable all AI" toggle** — rejected in favor of per-feature consent; a convenience that would undermine the entire consent model in `security.md`.

---

## How to Add to This List

If you catch yourself thinking "this would be great, but not now" while working on anything in this repo, add it here in one or two sentences, tagged to the relevant doc if there's an obvious connection. Don't let a good idea disappear just because it wasn't the right time.
