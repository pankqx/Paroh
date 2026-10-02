# Tasks — Current Sprint

> This file reflects the current repository state only. It is updated when the documentation or implementation status changes.

**Active phase:** Phase 1 — Skeleton (implemented, in review)
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

## TODO (Phase 2 — Core Loop)

- [ ] SQLite FTS5 index (disposable, rebuildable) and full-text search.
- [ ] Calendar full page and All Entries page.
- [ ] File watcher for entries changed outside the app.
- [ ] Slash-command menu and wikilinks in the editor.

## Known gaps

- `npm run build:ubuntu` (used by the release workflow) is not defined yet; packaging lands in the Polish & Packaging phase.
- Opener images in `assets/openers/quotes.json` are placeholders; the opener card uses a gradient until real images exist.
