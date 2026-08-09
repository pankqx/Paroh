# Release Plan

> A release is not "the code compiled." It's a checked, deliberate moment where something goes into a stranger's daily emotional practice. This document is the checklist that stands between "it builds" and "it ships."

---

## Versioning

Semantic versioning (`MAJOR.MINOR.PATCH`). `MAJOR` reserved for genuine breaking changes to the vault format (should be extremely rare, and requires a migration path per `architecture.md`'s Schema Versioning section before it can ship at all). `MINOR` for new features. `PATCH` for fixes.

## Release Channels

- **Dev** — main branch, built continuously via CI, never distributed
- **Beta** — manually tagged, distributed to a small opt-in group before a real release, focused on real-vault, real-usage feedback over multiple days, not a quick smoke test
- **Stable** — the only channel a first-time user should ever receive

## Pre-Release Checklist

**Data integrity (non-negotiable, blocks release on any failure):**
- [ ] Full `testing.md` Data Integrity suite passes
- [ ] Manual test: journal for real across a full day using the release build, confirm every entry survives an app restart
- [ ] Manual test: force-quit the app mid-save at least once, confirm no data loss

**Quality:**
- [ ] `feature-specifications.md`'s acceptance criteria re-checked for any feature touched this release
- [ ] `ui-rules.md`'s Quick Reference Checklist re-checked for any UI touched this release
- [ ] `accessibility.md`'s Non-Negotiables re-checked, plus one full keyboard-only manual pass, plus one screen-reader pass
- [ ] Performance sanity check against a large (1,000+ entry) fixture vault — app launch time, calendar render, search latency all within acceptable range (see `performance.md`)

**Privacy & security:**
- [ ] Confirm no journal content appears in any log output, crash report, or telemetry (`architecture.md`'s Logging rule, `security.md`)
- [ ] Confirm every AI feature (if any shipped this release) defaults to off and states clearly what leaves the device
- [ ] Confirm the crisis-resources line in Settings is present and not permanently dismissible

**Packaging:**
- [ ] `.AppImage` and `.deb` build and launch cleanly on a real (not just CI) Ubuntu machine
- [ ] Windows `.exe`/`.msi` build and launch cleanly on a real Windows machine (from Phase 7 onward)
- [ ] App icon, name, and version number correct in the built package
- [ ] Fresh-install flow tested — vault setup from zero, not just upgrading an existing install

**Documentation:**
- [ ] `CHANGELOG.md` updated with real, human-readable entries — not raw commit logs
- [ ] `README.md` still accurately describes current functionality
- [ ] Any `docs/` file affected by this release's changes is updated in the same PR, not deferred

## Release Steps

1. Cut a release branch from main, freeze new features, fixes only
2. Run the full Pre-Release Checklist above
3. Build for all currently-supported platforms
4. Beta channel for a minimum soak period (days, not hours) for anything touching the save pipeline, vault format, or migration logic — shorter soak acceptable for pure UI changes
5. Tag the release, publish to Stable, update `CHANGELOG.md`
6. Post-release: monitor for crash reports (never containing journal content, per above) for the first 48 hours before considering the release fully settled

## Rollback

Because the vault format is the durable source of truth (`architecture.md`), rolling back the *app* to a previous version is always safe as long as no irreversible migration ran in the newer version — this is exactly why migrations only run "when necessary" and are never silent (Schema Versioning). If a release ships a bug, the fix is: pull the release, ship a patch, and users lose nothing, because their data was never dependent on the buggy version staying installed.

## What Never Ships Without Extra Scrutiny

- Any change to the atomic save pipeline
- Any change to frontmatter parsing/serialization
- Any new `schema_version`
- Any new AI feature (must be reviewed specifically against the consent model in `security.md`)
