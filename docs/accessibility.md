# Accessibility

> A journaling app for people managing anxiety and depression has an unusually strong obligation here — some users will be interacting with this app during their hardest moments, sometimes with reduced motor precision, sight, or cognitive bandwidth. Accessibility isn't a checklist bolted on at the end; it's checked per-feature, in `feature-specifications.md`'s own Accessibility section, before that feature is considered done.

---

## Standard

**WCAG 2.1 AA** is the floor for every screen. AAA is the target for color contrast specifically, given the emotional stakes of misreading a mood indicator or a habit state.

## Keyboard

- Every interactive element reachable via `Tab`, in a logical order matching visual layout
- Every action achievable by mouse/touch has a keyboard equivalent — no exceptions, verified per-feature (`ui-rules.md` Rule 9)
- Visible focus ring on every focusable element: 2px `--accent` outline with sufficient offset, never suppressed with `outline: none` without a replacement
- No keyboard trap — a user can always `Tab` or `Esc` their way out of any modal, panel, or the Editor itself
- Global shortcuts (`Ctrl/Cmd+K` search, `Ctrl/Cmd+Shift+R` record) never conflict with OS-level or screen-reader shortcuts — verify against Orca (Ubuntu) and NVDA (Windows) shortcut tables before finalizing bindings

## Screen Readers

- Semantic HTML first — real `<button>`, `<nav>`, `<main>`, headings in order — ARIA only fills genuine gaps, never replaces semantic elements that already do the job
- Every icon-only control has a real accessible name (`aria-label`), not just a `title` attribute
- Live regions (`aria-live="polite"`) for save-status text, so "Saved 2s ago" is actually announced, not just visually updated
- Mood, calendar entry-dots, and tag chips always have a text-equivalent announcement, per `design-system.md`'s "never color alone" rule
- Horizons' timeline gets a full keyboard/screen-reader-equivalent list view, not just an attempt to make the spatial canvas itself accessible (`feature-specifications.md` §10) — this is the single hardest surface in the app and gets a genuinely separate accessible path, not a patch

## Color & Contrast

- Every text/background pairing in `design-system.md` verified at 4.5:1 (body) / 3:1 (large text) minimum, AAA (7:1) targeted for mood and status indicators specifically
- Never the sole signal: mood (emoji + color), tags (label + color), calendar dots (position + color), toolbar active state (icon fill change + color)
- Full color-blindness simulation pass (protanopia, deuteranopia, tritanopia) before each visual release, checking the mood scale and tag palette specifically since they're the most color-differentiated UI

## Motion

- `prefers-reduced-motion` respected globally — every transition in `design-system.md`'s Motion Principles section degrades to an instant state change, no exceptions, including the audio-recording pulse indicator (becomes a static "recording" label instead)
- No auto-playing audio, ever — audio logs play only on explicit user action

## Text & Readability

- User-adjustable text size in Settings, independent of OS zoom, with the Editor's 60-75 character line-length target maintained at every size
- No text embedded in images without a real text equivalent (the Daily Opener's quote text is always DOM text over the image, never baked in)
- Line height and paragraph spacing meet WCAG's text-spacing success criterion, adjustable without breaking layout

## Cognitive Accessibility

This matters specifically for Paroh's audience, beyond standard WCAG:

- Every screen has one clear primary action (`ui-rules.md` Rule 6) — reduces decision load on hard days
- No time-limited interactions anywhere (no auto-dismissing toasts the user must catch, no session timeouts on local content)
- Plain language throughout — error messages, empty states, and prompts avoid jargon (`ui-rules.md` Rule 3)
- Undo is available for anything non-destructive-by-design (habit toggle, mood change) simply by re-tapping — no separate "undo" mechanic needed because the action itself is reversible

## Testing Requirements

- Automated: `axe-core` run in CI against every feature's main screen, zero violations to merge (see `testing.md`)
- Manual: full keyboard-only pass and one screen-reader pass (Orca on Ubuntu at minimum) per release, not per PR — tracked in `release-plan.md`'s checklist
- Real user testing with people who use assistive technology, prioritized before Phase 6's public release, not treated as a nice-to-have

---

## Non-Negotiables (do not merge without these)

- [ ] Every new interactive element has a visible focus state
- [ ] Every new interactive element is keyboard-operable
- [ ] No new color-only state indicator
- [ ] No new auto-playing motion that ignores `prefers-reduced-motion`
- [ ] `axe-core` passes with zero violations on the new/changed screen
