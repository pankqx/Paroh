# Testing

> Testing effort is allocated by consequence of failure, not by ease of writing the test. A bug in the atomic save pipeline can destroy someone's writing; a bug in a card's hover shadow cannot. The first gets exhaustive tests before merge; the second gets a visual glance.

---

## What Gets Tested, and How

| Layer | What | How | Blocking? |
|---|---|---|---|
| Domain (`renderer/domain/`) | Pure logic — streaks, overdue tasks, mood trend, word frequency | Unit tests, real input/output assertions, no mocking needed since there's nothing to mock | Yes — required before merge |
| Application (`renderer/application/`) | Commands and use cases | Unit tests with a mocked `VaultAdapter`/IPC layer | Yes — required before merge |
| Infrastructure (`main/vault/`) | `VaultAdapter`, atomic write, frontmatter parse/serialize | Integration tests against a real temp filesystem (not mocked — this is exactly the layer where a mock would hide the bugs that matter) | Yes — required before merge, especially the crash-mid-write simulation described below |
| IPC contract (`shared/ipc-contract.ts`) | Every channel's request/response shape | Type-level tests (compile-time) plus a runtime schema check in dev mode | Yes |
| Presentation (`renderer/features/`) | Component rendering, user interaction | Component tests (Testing Library) for critical flows; full coverage not required | Encouraged, not blocking in early phases per `coding-standards.md` |
| Cross-cutting | Accessibility | `axe-core` automated pass per screen | Yes, per `accessibility.md` |
| Cross-cutting | End-to-end | Playwright/Spectron-equivalent for Electron, covering the core loop (write → save → reopen → find via search) | Yes, before each release, not every PR |

## The One Test Suite That Cannot Be Skipped: Data Integrity

Because Failure Philosophy (`architecture.md`) makes specific promises about what survives a crash, those promises need tests that actually simulate the failure, not just the happy path:

- **Crash mid-write:** kill the process (or simulate the interruption) between temp-file write and atomic rename; assert the original file is untouched and the `.tmp` is either absent or safely cleaned up on next launch
- **Disk full:** simulate an `ENOSPC` error at the write step; assert the original file is untouched and the user sees a specific, actionable error
- **Corrupted YAML on load:** load a hand-corrupted fixture file; assert the body still renders and a "metadata unreadable" state is shown, not a crash
- **Corrupted SQLite index:** delete/corrupt the index file; assert the app rebuilds it automatically on next launch with zero data loss
- **Schema migration:** load a fixture at `schema_version: 1` after a hypothetical `schema_version: 2` feature ships; assert it still loads correctly and only migrates on an explicit write, never silently on read

These live in `tests/main/vault/` and `tests/fixtures/`, and are the tests most worth writing carefully — everything else in the test suite is in service of protecting the user's writing, and this is where that's proven directly.

## Test Data

`tests/fixtures/sample-vault/` is a small, static, hand-crafted vault (a handful of entries, a habit, a task, a Life Story) — never the real dev vault at `vault/` in the repo root, which is meant for manual exploration and can drift. Fixtures are committed, deterministic, and never contain anything resembling real personal writing — write clearly fictional placeholder content for them.

## Coverage Philosophy

No blanket percentage target. Domain and Application layers should be close to fully covered because they're small, pure, and cheap to test. Presentation layer coverage grows organically — testing a card's exact pixel layout is a poor use of effort; testing that "saving a task with no text shows a validation message" is a good one. Coverage numbers are a signal to look at, never a target to game with low-value tests.

## CI Requirements

Every PR runs: lint, typecheck, Domain/Application/Infrastructure unit + integration tests, `axe-core` on changed screens. Full end-to-end suite runs on merge to main and before every release build, not on every PR, to keep iteration fast — see `.github/workflows/ci.yml`.

## Manual QA Before Release

Tracked fully in `release-plan.md`; testing.md's contribution to it: full keyboard-only pass, one screen-reader pass, one pass on a large (1,000+ entry) fixture vault to catch performance regressions the automated suite might not surface at that scale.
