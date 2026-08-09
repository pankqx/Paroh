# Design System

> A correction, stated up front: `PRODUCT.md` and `architecture.md` describe Canvas mode as "dark." Re-reading the reference screenshots closely, that's wrong — Canvas is a **light, warm, structured** surface with dotted texture and white cards; only the Healing Prompt card is deliberately dark, as a single point of contrast. Editor mode is also light — warm cream, editorial. This document reflects what's actually in the references. If you want a genuinely dark Canvas as an intentional departure, say so and this gets revised; otherwise this file is the correction of record, and `PRODUCT.md`/`architecture.md` should be read as superseded on this one point.

> Every value below is read directly off the two reference screenshots where possible. Where a screenshot can't give full precision (exact hex, exact px), the value is a considered best match, marked **[estimated]** — eyedrop and correct against the real files if you have them at higher resolution.

---

## Design Philosophy

Two surfaces, one shared language, per `PRODUCT.md` §4. The difference between them is *tone*, not *identity*:

- **Canvas** is where the user surveys their life — calm, gridded, a little clinical in the good sense, like a well-organized desk.
- **Editor** is where the user actually writes — warmer, quieter, fewer visible seams, like a notebook by a window.

Both use the same accent color, the same corner-radius language, the same icon set, and the same underlying spacing grid. A user should never feel like they've left the app when they move between them — only that the room changed.

---

## Color System

### Canvas mode tokens

| Token | Value | Usage |
|---|---|---|
| `--canvas-bg` | `#F3F1EA` **[estimated]** | Page background — warm off-white, not pure white |
| `--canvas-dot` | `#E2DFD4` **[estimated]** | Dot-grid texture dots on the canvas background |
| `--canvas-surface` | `#FFFFFF` | Card backgrounds |
| `--canvas-border` | `#E7E5DD` **[estimated]** | Card borders, hairline dividers |
| `--canvas-text-primary` | `#1C1B18` | Headlines, primary UI text |
| `--canvas-text-secondary` | `#6F6C61` **[estimated]** | Timestamps, muted labels, placeholder text |
| `--canvas-contrast-bg` | `#1B1B19` **[estimated]** | The one deliberately dark card (Healing Prompt) |
| `--canvas-contrast-text` | `#F5F3EC` | Text on the dark contrast card |
| `--canvas-sidebar-bg` | `#FFFFFF` | Left sidebar background |
| `--canvas-sidebar-active` | `#1C1B18` | Active nav item background (Canvas, in the reference) |
| `--canvas-sidebar-active-text` | `#FFFFFF` | Active nav item text |

### Editor mode tokens

| Token | Value | Usage |
|---|---|---|
| `--editor-bg` | `#FAF7F1` **[estimated]** | Page background — warmer and lighter than Canvas |
| `--editor-surface` | `#FFFFFF` | Metadata rail, toolbar |
| `--editor-text-primary` | `#221F1A` | Body copy |
| `--editor-text-secondary` | `#8A8578` **[estimated]** | Timestamps, "Private journal entry" subtitle |
| `--editor-hero-overlay` | `linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)` | Scrim over the hero image so white title text stays legible |
| `--editor-code-bg` | `#F1EEE6` **[estimated]** | Fenced code block background |
| `--editor-quote-border` | `var(--accent)` | Left border on blockquotes |

### Shared tokens (used identically in both modes)

| Token | Value | Usage |
|---|---|---|
| `--accent` | `#E2793D` **[estimated — warm amber/ember]** | Streak flame, mood-dot indicator, record button, blockquote border, primary CTA in Editor, links |
| `--accent-hover` | `#CC6A30` **[estimated]** | Hover state for accent-colored elements |
| `--success` | `#4C8A5E` | Completed habit/task checkmarks |
| `--danger` | `#C2513F` | Destructive actions only (delete entry, remove habit) |
| `--tag-anxiety-bg` / `--tag-anxiety-text` | `#EDE3F5` / `#6B4A8C` **[estimated]** | Tag chip — purple family, used for "anxiety" in the reference |
| `--tag-healing-bg` / `--tag-healing-text` | `#E4F0E8` / `#3F7A55` **[estimated]** | Tag chip — green family, used for "healing" |
| `--tag-neutral-bg` / `--tag-neutral-text` | `#EFEDE6` / `#5C594E` **[estimated]** | Default/fallback tag chip |
| `--mood-low` | `#C2513F` | Mood scale, position 1 |
| `--mood-sad` | `#D98A4A` | Mood scale, position 2 |
| `--mood-meh` | `#C9B65A` **[estimated]** | Mood scale, position 3 |
| `--mood-ok` | `#8FAE6E` **[estimated]** | Mood scale, position 4 |
| `--mood-good` | `#4C8A5E` | Mood scale, position 5 |

**Contrast rule:** every text/background pairing above must meet WCAG AA (4.5:1 for body text, 3:1 for large/headline text) — verify `--canvas-text-secondary` and `--editor-text-secondary` against their backgrounds specifically once real values are set; muted-gray-on-off-white pairings are the most likely to fail and need checking first.

---

## Typography

### Families

| Role | Family | Fallback stack | Where it's used |
|---|---|---|---|
| UI / sans | **Inter** | `-apple-system, "Segoe UI", sans-serif` | Sidebar, buttons, labels, cards, body copy inside Canvas, metadata rail in Editor |
| Editorial serif | **Fraunces** | `Georgia, "Times New Roman", serif` | Entry titles, the daily opener quote, blockquotes — never buttons, never labels |
| Monospace | **JetBrains Mono** | `"Courier New", monospace` | Fenced code blocks only |

**Rule:** the serif appears in exactly three places — entry/opener titles, direct quotes, and nowhere else. This restraint is what keeps it feeling editorial instead of decorative. If a new screen wants "a bit of warmth," the answer is spacing and color, not adding another serif element.

### Type scale

| Token | Size / Line-height | Weight | Usage |
|---|---|---|---|
| `--text-hero` | 40px / 1.15 | 600 (Fraunces) | Opener quote, entry title on hero image |
| `--text-h1` | 28px / 1.25 | 700 (Fraunces) | Entry title in-page (below the hero) |
| `--text-h2` | 20px / 1.3 | 600 (Inter) | Section headers ("What changed," "Small victories") |
| `--text-h3` | 16px / 1.4 | 600 (Inter) | Card titles ("Today's Habits," "Healing Prompt") |
| `--text-body` | 16px / 1.6 | 400 (Inter) | Entry body copy, general UI text |
| `--text-body-serif-quote` | 18px / 1.5 | 400 italic (Fraunces) | Blockquotes |
| `--text-small` | 14px / 1.5 | 400 | Card metadata, excerpts, tag labels |
| `--text-micro` | 12px / 1.4 | 500 | Timestamps, word count, streak badge |

Line length for entry body copy should stay between 60–75 characters — the Editor's center column width is a typography decision as much as a layout one.

---

## Spacing & Layout Grid

Base unit: **4px.** All spacing values are multiples of it — no arbitrary in-between values in components.

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |
| `--space-16` | 64px |

**Canvas grid:** 3-column card grid on desktop (matching the reference's Recent Entries row and the Habits/Tasks/Audio row), collapsing to 1 column under ~900px for the eventual mobile port. Gutter: `--space-6`. Card internal padding: `--space-4` to `--space-6` depending on card density.

**Editor column:** max-width ~680px for the writing column, centered, with the metadata rail as a fixed ~280px right column on desktop, collapsing below it on narrow viewports. Hero image is full-bleed (100% of the content area width), height ~280px **[estimated]**.

**Sidebar:** fixed width ~220px, persistent on desktop, collapsible to icons-only below ~1024px.

---

## Radius & Elevation

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 6px | Chips, badges, small buttons |
| `--radius-md` | 10px | Cards, inputs, calendar cells |
| `--radius-lg` | 16px | Hero images, the opener card |
| `--radius-full` | 999px | Streak badge, mood-scale emoji buttons, avatar |

Shadows are minimal and warm-tinted, never pure black:

| Token | Value | Usage |
|---|---|---|
| `--shadow-card` | `0 1px 2px rgba(28,27,24,0.04), 0 1px 6px rgba(28,27,24,0.04)` | Default card elevation |
| `--shadow-card-hover` | `0 2px 4px rgba(28,27,24,0.06), 0 4px 12px rgba(28,27,24,0.06)` | Card hover (Recent Entries, Habit rows) |
| `--shadow-popover` | `0 4px 12px rgba(28,27,24,0.10), 0 8px 24px rgba(28,27,24,0.10)` | Dropdowns, the slash-command menu |

No card ever uses a hard 1px-black border *and* a heavy shadow at once — pick one per element; the reference uses hairline borders on white cards over a warm-gray page, which is border-led, not shadow-led. Reserve visible shadow for hover/elevation states.

---

## Iconography

**Lucide**, 1.5px stroke weight, 20px default size (16px in dense contexts like the sidebar nav, 24px for primary actions like Record). Icons are always paired with a text label in navigation — never icon-only for anything destructive or non-obvious.

---

## Component Tokens

### Buttons

| Variant | Background | Text | Border | Usage |
|---|---|---|---|---|
| Primary | `--canvas-text-primary` (near-black) | white | none | "Write today's entry," "+ New Entry," "Publish" |
| Secondary / ghost | transparent | `--canvas-text-primary` | 1px `--canvas-border` | "New quote," "Skip," "Preview" |
| Accent | `--accent` | white | none | "Record," "Write about it" (Healing Prompt CTA) |
| Destructive | transparent, red text | `--danger` | 1px `--danger` at 30% opacity | Delete actions, confirmed via dialog only |

All buttons: `--radius-sm`, `--space-2` vertical / `--space-4` horizontal padding, `--text-small` weight 600.

### Cards

Base card: `--canvas-surface`, `--radius-md`, `--shadow-card`, 1px `--canvas-border`, internal padding `--space-4`–`--space-6`. Title uses `--text-h3`. The one exception is the Healing Prompt card, which inverts to `--canvas-contrast-bg`/`--canvas-contrast-text` — this inversion is reserved for that single card type; don't reuse the dark-card treatment elsewhere or it stops reading as intentional.

### Tag chips

`--radius-sm`, `--space-1` vertical / `--space-2` horizontal padding, `--text-micro` weight 500, colored per the tag palette above (assign color families to semantic tag categories, not randomly — anxiety-family tags stay in the purple family, healing-family tags stay in green, etc., so the palette itself becomes legible over time).

### Mood selector

Five circular buttons (`--radius-full`), 40px **[estimated]** diameter, emoji centered, unselected state uses `--canvas-text-secondary` at reduced opacity, selected state shows the emoji at full opacity plus a small filled dot beneath it in the color matching that mood's token (`--mood-sad`, etc.) — exactly as shown under "Sad" in the reference.

### Calendar cell

`--radius-sm`, 32px **[estimated]** square, today's date gets a filled `--canvas-text-primary` background with white text; dates with an entry get a small `--accent`-colored dot beneath the number; dates with a logged mood additionally tint the dot with that mood's color once mood-on-calendar ships (Phase 3).

### Streak badge

`--radius-full`, `--canvas-sidebar-bg` background, 1px border, flame emoji + count, `--text-micro` weight 600.

### Toolbar (Editor formatting rail)

Vertical icon strip, `--space-2` between icons, `--canvas-text-secondary` default icon color, `--accent` when a mark is active at the cursor (e.g., Bold icon tints accent when bold is on) — this is the only place in the app where the accent color indicates *state* rather than *action*, and it should be used consistently everywhere formatting state is shown.

---

## Motion Principles

Motion is felt, not seen — nothing in Paroh should call attention to itself as an animation.

- Card hover: 120ms ease-out, shadow + 1px lift only, no scale/bounce
- Panel/page transitions (Canvas → Editor): 180ms cross-fade, no slide, no skeuomorphic page-turn
- Mood/habit selection: a quiet 100ms scale-and-settle on the selected element, nothing else moves
- Toasts/save-status ("Saved 2s ago"): fade in over 150ms, no slide-in from an edge
- Nothing in the app should loop, pulse, or animate at rest — that reads as anxious, which is the opposite of the point

---

## Dark Mode — Not Built Yet, Not Forgotten

Both current modes are light. A true dark mode (distinct from the single dark *card* in Canvas) is a reasonable future request — likely Phase 5 polish or later, tracked in `future-ideas.md`. If built, it inherits this same token structure: new `--canvas-bg`/`--editor-bg` etc. values under a `[data-theme="dark"]` scope, same spacing/radius/motion rules unchanged. Do not build a parallel design system for it — extend this one.

---

## Accessibility Notes

Full detail belongs in `accessibility.md`; the design-system-relevant points are:

- Every color pairing in this file must be verified at AA contrast before shipping, not assumed from how it looks
- Mood and calendar-dot indicators must never rely on color alone — pair with the emoji (mood) or position/shape (dot presence) as they already do in the reference, which is good practice, not incidental
- Focus states need a visible, non-color-only ring (e.g., a 2px `--accent` outline with sufficient offset) on every interactive element, including cards that are themselves clickable
- Minimum tap/click target 40px×40px even where the visual element (like the calendar cell) is drawn smaller

---

Every token here should be usable directly as a CSS custom property in `src/styles/tokens.css` once implementation starts — this file is meant to be copied from, not just referenced.
