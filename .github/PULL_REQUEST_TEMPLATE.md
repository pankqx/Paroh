## What does this PR do?

## Which docs does this touch or implement?

(e.g., `docs/feature-specifications.md` §6 Habit Tracker)

---

## Checklist

**Always:**
- [ ] Follows `docs/coding-standards.md` (naming, layer-import rules, TypeScript strictness)
- [ ] No journal content in any log statement, error message, or test fixture with real-looking content

**If this touches UI:**
- [ ] Passes `docs/ui-rules.md`'s Quick Reference Checklist
- [ ] Uses `docs/design-system.md` tokens — no ad-hoc colors/spacing
- [ ] Passes `docs/accessibility.md`'s Non-Negotiables (keyboard, focus states, no color-only signals, `axe-core` clean)

**If this touches the vault/save pipeline:**
- [ ] Follows the atomic save pipeline in `docs/architecture.md`
- [ ] `schema_version` bumped and a migration path exists, if the file format changed
- [ ] Data Integrity test suite (`docs/testing.md`) updated/passing, including a crash-mid-write scenario if relevant

**If this touches an AI feature:**
- [ ] Defaults to off
- [ ] Has its own independent consent toggle, not bundled with another feature
- [ ] Reviewed against `docs/security.md`'s consent model

**Non-obvious decisions made in this PR:**
- [ ] Logged in `docs/decisions.md`, or not applicable

---

## Screenshots (if UI change)
