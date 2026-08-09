# Contributing to Paroh

> Read `vision.md` before anything else in this repo. If a contribution doesn't serve it, it doesn't belong here, no matter how well-built.

---

## Before You Start

1. Read `vision.md` — the philosophy every decision traces back to
2. Read `architecture.md` — the technical decisions and why they were made
3. Skim `roadmap.md` and check `project-state.md`/`tasks.md` for what's actually active right now — don't build ahead of the current phase

## Setting Up

```bash
git clone <repo-url>
cd Paroh
npm install
npm run dev       # launches Electron in dev mode against vault/ (the dev fixture vault)
```

## Making a Change

1. Check `tasks.md` — is this already planned, or does it need discussion first?
2. For anything touching UI: re-read `ui-rules.md` and `design-system.md` before writing a line of CSS
3. For anything touching the vault/save pipeline: re-read `architecture.md`'s Data Integrity & Persistence section — this is the part of the codebase with zero tolerance for shortcuts
4. Write the code following `coding-standards.md`
5. Write tests per `testing.md` — Domain/Application/Infrastructure layer changes require tests to merge, no exceptions
6. Run the full `feature-specifications.md` acceptance criteria for any feature you touched
7. Run `ui-rules.md`'s Quick Reference Checklist for any UI you touched
8. Run `accessibility.md`'s Non-Negotiables for any UI you touched

## Pull Request Checklist

See `.github/PULL_REQUEST_TEMPLATE.md` — it's a direct pointer to the checklists above, not a separate list to keep in sync manually.

## What Gets Rejected, Regardless of Code Quality

- A feature that adds guilt, pressure, or gamified scoring (`ui-rules.md` Rule 4, `vision.md`'s "What We Will Never Compromise")
- Anything that sends journal content off-device without a specific, revocable, feature-scoped consent toggle (`security.md`)
- A new dependency that duplicates something already in the project (`coding-standards.md`)
- UI that mixes Canvas and Editor styling on one screen (`ui-rules.md` Rule 13)
- Any change to the vault file format without a `schema_version` bump and a migration path (`architecture.md`)

## Where Decisions Get Recorded

Small decisions not big enough for `architecture.md` go in `decisions.md` — add one there as part of your PR if you made a non-obvious call along the way. Future contributors (including future-you) will thank you for not having to reverse-engineer why something is the way it is.

## Reporting Bugs / Requesting Features

Use the templates in `.github/ISSUE_TEMPLATE/`. For anything touching data integrity or privacy, mark it clearly in the title — these get priority review given the stakes described in `vision.md`.

## Code of Conduct

See `.github/CODE_OF_CONDUCT.md`. Worth saying plainly here too: this project exists to help people through genuinely hard periods of their lives. Contributors are expected to bring that same care to how they treat each other in issues, PRs, and discussion.
