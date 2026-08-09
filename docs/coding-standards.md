# Coding Standards

> Consistency here is what lets a contributor (including a future session of you) open any file and immediately know the conventions, without hunting for precedent elsewhere in the codebase.

---

## 1. TypeScript Rules

- `strict: true` in `tsconfig.json`, no exceptions, no `any` without a `// TODO(reason):` comment justifying it and a linked issue.
- Every type that crosses the main/renderer IPC boundary lives in `src/shared/types/` and is imported by both sides — never redefined independently on each side (this is the exact schema-drift risk `architecture.md` calls out as the reason TypeScript matters more here than usual).
- Prefer `interface` for object shapes that represent domain entities (`Entry`, `Habit`, `LifeStory`); prefer `type` for unions, utility compositions, and function signatures.
- No `enum` — use string union types (`'low' | 'sad' | 'meh' | 'ok' | 'good'`) instead. Enums don't serialize predictably to/from the YAML frontmatter round-trip; string unions do.
- Every function that can fail (file I/O, parsing, network) returns a `Result<T, E>`-style discriminated union or throws a typed error class — never returns `null`/`undefined` to silently signal failure. This matters directly for Failure Philosophy: a swallowed `null` is how "fail safely" quietly turns into "fail silently."

## 2. Naming

| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase, matches filename | `HealingPromptCard.tsx` |
| Hooks | camelCase, `use` prefix | `useMoodTrend.ts` |
| Domain functions | camelCase, verb-first | `computeStreak.ts`, `isTaskOverdue.ts` |
| Types/interfaces | PascalCase, no `I` prefix | `Entry`, not `IEntry` |
| IPC channels | `domain:action` | `entries:save`, `habits:toggle` |
| Events | PastTense noun-verb | `EntryUpdated`, `HabitCompleted` |
| CSS custom properties | `--kebab-case`, matches `design-system.md` exactly | `--canvas-text-primary` |
| Files | Match the primary export's name | one component/hook/domain function's worth of concern per file, not grab-bag utility files |

## 3. React Patterns

- Function components only, no class components.
- Co-locate a feature's components under `renderer/features/{feature}/` (per `folder-structure.md`) — a component only moves to `renderer/components/` (shared) once a second, unrelated feature genuinely needs it. Don't pre-abstract.
- State lives at the lowest common ancestor that needs it. Global state (current vault, settings) goes through a small number of top-level contexts — not a general-purpose global store reached for by default. If a feature thinks it needs global state, that's a signal to check whether it should instead be reading from the event bus (`architecture.md` §Internal Event Architecture).
- Data fetching (via the IPC bridge) happens in hooks (`useEntry`, `useVaultEvents`), never directly inside a component's render body.
- No inline styles except values genuinely computed at runtime (a dynamically generated chart color). Everything else uses the token system via CSS classes/modules.

## 4. The Layer Boundary Is Enforced by Import Rules, Not Just Discipline

Per `architecture.md` and `folder-structure.md`, these import directions are the only ones allowed, and should be enforced with an ESLint import-boundary rule, not just a convention someone might forget:

```
renderer/features    → renderer/application, renderer/domain, renderer/components, preload/bridge
renderer/application → renderer/domain, shared
renderer/domain       → shared only (no React, no fs, no fetch, ever)
main/**               → shared only from the renderer side; never imported BY the renderer
```

A PR that violates this (e.g., a `features/` component importing `main/vault/VaultAdapter` directly) fails CI, not just review.

## 5. Comments

Comment *why*, not *what* — the code already says what it does. A comment earns its place by explaining a non-obvious constraint: "atomic rename here because a crash mid-write must never leave a partial file (see architecture.md §Atomic Saving Strategy)" is a good comment; "// save the entry" above a function called `saveEntry()` is not.

## 6. Error Handling

Every `catch` block does something specific: log (never journal content, per `architecture.md`'s Logging rule), surface a user-facing message, or explicitly re-throw with added context. An empty `catch {}` block is never acceptable — it's exactly the "silent failure" Failure Philosophy exists to prevent.

## 7. File Size & Structure

If a file exceeds ~300 lines, that's a signal to look for a natural seam to split it — not a hard rule, but a prompt to check. A component file handling both data-fetching logic and complex rendering is a common place this happens; extracting a hook usually solves it.

## 8. Testing Conventions

Test files live in `tests/`, mirroring `src/` exactly (`folder-structure.md`). Test names describe behavior, not implementation: `"marks a task done and generates the next recurring instance"`, not `"toggleTask sets done=true"`. Domain and Application layer logic (streaks, overdue calculation, atomic write correctness) is tested with real assertions on inputs/outputs — no snapshot-testing pure business logic, since snapshots hide exactly the kind of subtle regression this layer can't afford.

## 9. Formatting & Linting

Prettier, default config, enforced pre-commit (not just CI) so formatting is never a review discussion. ESLint with the import-boundary rule (§4) plus standard React/TypeScript recommended rules. No disabling a lint rule inline without a comment explaining why.

## 10. Commit & PR Conventions

Conventional Commits style (`feat:`, `fix:`, `docs:`, `refactor:`) since `CHANGELOG.md` generation can eventually be semi-automated from these. A PR touching UI must be checked against `ui-rules.md`'s Quick Reference Checklist before requesting review, not after.

---

## The One-Sentence Version

If a piece of code can't be explained by pointing at a line in `vision.md`, a decision in `architecture.md`, or a rule in this file, stop and ask which one it should map to before writing it.
