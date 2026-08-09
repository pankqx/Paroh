# UI Rules

> `design-system.md` defines what things look like. This defines how things *behave*. When a new screen is being built and it's unclear how an interaction should work, the answer should be derivable from this document, not invented fresh each time.

---

## 1. Feedback Timing

Every user action gets feedback within **100ms**, even if the real operation (a save, an index update) takes longer. A tap, click, or toggle changes its visual state instantly; the underlying async work happens after, and only rolls back visually if it actually fails (see Failure Feedback, below). Never make the user wait to see that their input registered.

## 2. Saving Is Invisible Until It Isn't

No feature in Paroh has a manual "Save" button as its primary path (Mood, Habits, Tasks, and autosaved entries all persist on the action itself). The only visible save indicator is passive status text ("Saved 2s ago") in the Editor's top bar — never a spinner, never a modal, never something that interrupts typing. `Ctrl/Cmd+S` still works everywhere as a reassurance shortcut, but it's redundant by design, not required.

## 3. Failure Feedback

When an action fails (see `architecture.md`'s Failure Philosophy), the UI:
1. Reverts the optimistic visual change (an unchecked box goes back to unchecked)
2. Shows a specific, human-readable inline message near the point of failure — never a toast that's disconnected from where the action happened
3. Offers a retry that's one click, not a re-navigation
4. Never uses a stack trace, error code, or developer-facing language in user-visible text

## 4. No Guilt, Ever

This is a hard rule, not a preference: no red badges for missed days, no "you're falling behind" language, no punitive framing of a broken streak, an empty Chapter, or a skipped prompt. A gap in usage is displayed as neutral fact (an empty calendar cell, a quiet stat) — never highlighted, colored red, or accompanied by nudging copy. This rule overrides normal engagement-optimization instincts a contributor might otherwise reach for; it exists specifically because `vision.md` names "a broken streak that makes a user feel worse" as a failure state for the whole product.

## 5. Progressive Disclosure

Every screen shows the minimum needed to act, with detail available on demand rather than upfront. The Canvas shows 3 recent entries, not all of them; the mini Calendar shows a month, not a decade — Horizons is the one deliberate exception, because seeing the long view *is* the point of that specific feature.

## 6. One Primary Action Per Screen

Every screen has exactly one visually primary (filled, high-contrast) button representing its main intended action — "Write today's entry," "+ New Entry," "Record." Everything else is secondary (ghost/outline) or tertiary (text-only). Two primary buttons on one screen means the screen's purpose isn't clear yet — fix that before adding more buttons.

## 7. Destructive Actions Always Confirm, Everything Else Never Does

Deleting an entry, a habit, or a Life Story requires an explicit confirmation dialog naming exactly what will be lost. Every other action (toggling a habit, saving text, changing a mood) requires zero confirmation — confirmation dialogs on low-stakes actions train users to click through them blindly, which defeats the purpose when a real destructive action needs their attention.

## 8. Empty States Are Invitations, Not Apologies

An empty state never says "Nothing here yet 😢" or similar. It states the fact plainly and offers the next action: "No entries this month" + a way to write one; "No habits yet" + one-tap defaults to add. Tone stays even whether the screen is empty because the user is new or empty because they had a hard stretch — the UI doesn't know which, and shouldn't guess.

## 9. Keyboard Parity

Anything achievable with a mouse/touch must be achievable via keyboard, without exception — this isn't a nice-to-have layered on afterward, it's checked per-feature in `feature-specifications.md`'s acceptance criteria. `Ctrl/Cmd+K` (search) and the Editor's formatting shortcuts are global and consistent across the whole app; a shortcut never means something different on two different screens.

## 10. Modals Are a Last Resort

Prefer inline expansion, side panels, or a dedicated page over a modal dialog. Modals are reserved for: destructive-action confirmations, and genuinely blocking one-time flows (initial vault setup). The Editor, Settings, and every browsing screen are full pages or panels, never modals — modals interrupt the "quiet room" feeling `vision.md` describes.

## 11. Color Never Carries Meaning Alone

Every place color indicates state (mood, tag category, active toolbar formatting, calendar entry-dots) has a redundant non-color signal too — shape, icon, text label, or position — per the Accessibility notes already established in `design-system.md`. This is checked explicitly in every feature's Accessibility section in `feature-specifications.md`.

## 12. Motion Answers "What Changed," Never Decorates

Every animation in the app should be answerable with "this exists to show the user what just changed state." If an animation's purpose can't be stated that plainly, cut it. Loops, pulses, and idle motion are banned outside the one named exception (the audio-recording indicator, which represents a genuinely ongoing process).

## 13. The Two Modes Never Mix Mid-Screen

A single screen is either Canvas-styled or Editor-styled, never both. If a feature seems to need elements of both (e.g., Chapters, which is dashboard-like but also editorial), it establishes its own coherent third treatment using the shared token system (`design-system.md`) — it doesn't literally combine a dark Canvas card with a cream Editor panel on the same screen. Consistency of *feeling* matters more than reusing components verbatim.

## 14. Errors Are Owned by the Feature That Caused Them

An error surfaces where the user is looking, not in a global notification tray disconnected from context — a failed habit toggle shows its error on the habit card, not as a banner at the top of the app. Global-level errors (index corruption, vault path unreachable) are the only exception, since they're not attributable to a single visible action.

## 15. Loading States Never Block the Whole App

A slow operation (index rebuild, large export, initial search on an unindexed vault) shows a scoped loading state within the feature doing the work — the rest of the app (navigation, other cards) stays interactive. Paroh should never show a full-screen spinner after initial launch.

---

## Quick Reference Checklist (paste into a PR description)

- [ ] Feedback within 100ms of user action
- [ ] No manual save button on the primary path
- [ ] Failures revert optimistic UI + show inline, human-readable retry
- [ ] No guilt-inducing copy anywhere, including empty/gap states
- [ ] Exactly one primary button on the screen
- [ ] Destructive actions confirm; everything else doesn't
- [ ] Empty states state fact + offer next action, even tone regardless of "why" it's empty
- [ ] Fully keyboard-operable, shortcuts consistent with the rest of the app
- [ ] No unnecessary modal — inline/panel/page preferred
- [ ] No state conveyed by color alone
- [ ] Every animation answers "what changed"
- [ ] Screen is coherently Canvas-styled or Editor-styled, not a mix
- [ ] Errors appear at the point of failure, not a disconnected global toast
- [ ] No full-screen blocking spinner post-launch
