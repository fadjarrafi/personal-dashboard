# Design — Personal Dashboard

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

## Genre
modern-minimal (dev-tool / instrument-panel register), executed dark instead of
the genre's canonical light paper — deliberate deviation, confirmed with the user:
this is a single-user tool checked at odd hours, and the existing app was already
dark-first.

## Theme route
custom (tuned depth) — the catalog's modern-minimal themes (Coral, Cobalt) are
light-paper only; this app needed a dark cool palette that keeps the existing
sky-blue brand identity the app already had, just executed properly in OKLCH.

**Vibe:** "quiet instrument panel, dense, no-nonsense"
**Anchor:** the app's existing sky-blue accent, carried forward (not replaced)

## Macrostructure family
This app has exactly one page type — **app pages** (dense CRUD/dashboard panels).
No marketing pages, no content pages.

- App pages: **Workbench-adapted** — sticky sidebar (capture form / summary /
  filters) + scrollable main content (list or table). No hero, no enrichment.
  The existing two-column `[380px_1fr]` grid IS the right shape for this
  content — kept as-is. What changes is the token system and component voice
  layered on top: type, colour, radius, border weight, motion, icon/emoji
  discipline in chrome vs. functional data.

## Theme — tokens

```css
:root {
  --color-paper:      oklch(16% 0.016 235);  /* app background */
  --color-paper-2:    oklch(20% 0.018 235);  /* cards, sidebar panels */
  --color-paper-3:    oklch(25% 0.020 235);  /* hover surfaces, modals, popovers */
  --color-ink:        oklch(94% 0.010 235);  /* primary text */
  --color-ink-2:      oklch(74% 0.012 235);  /* secondary text */
  --color-rule:       oklch(31% 0.016 235);  /* borders / dividers */
  --color-rule-2:     oklch(26% 0.016 235);  /* subtler dividers */
  --color-muted:      oklch(58% 0.014 235);  /* de-emphasised text */

  --color-accent:     oklch(72% 0.150 227);  /* primary interactive — cool sky-blue, brand-carried */
  --color-accent-ink: oklch(16% 0.016 235);  /* text on accent fill (accent L>50 → dark ink) */
  --color-focus:      oklch(78% 0.190 227);

  /* Functional status — not decorative. Kept low-footprint, used only for
     state (trend arrows, pins, delete, alerts), never as page-wide fills. */
  --color-success:    oklch(74% 0.150 152);
  --color-warning:    oklch(80% 0.150 80);
  --color-danger:     oklch(68% 0.180 25);

  /* Category taxonomy — functional, not decorative. Small dots/badges only. */
  --color-cat-bookmark: oklch(74% 0.130 152);
  --color-cat-note:     oklch(80% 0.130 80);
  --color-cat-snippet:  oklch(74% 0.120 245);

  --font-display: "Geist Variable", ui-sans-serif, system-ui, sans-serif;
  --font-body:    "Geist Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono:    "Geist Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace;

  --space-3xs: 0.25rem; --space-2xs: 0.5rem; --space-xs: 0.75rem;
  --space-sm:  1rem;    --space-md:  1.5rem; --space-lg: 2rem;
  --space-xl:  3rem;    --space-2xl: 4.5rem;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in:  cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-short: 160ms;
  --dur-med:   220ms;

  --radius-box: 0.625rem;  /* 10px — cards, panels */
  --radius-btn: 0.5rem;    /* 8px — buttons, inputs */
  --radius-badge: 0.375rem;/* 6px — badges de-pilled, read as data tags not bubbles */
}
```

**Axes:** dark / geometric-sans / cool (single-family: Geist Variable + Geist Mono
Variable — same type family at different widths, which `typography.md` explicitly
allows when the single font IS the design choice; here it reinforces the
instrument-panel precision).

## Typography
- Display: Geist Variable, weight 600–700 (section labels, stat numbers, page titles)
- Body: Geist Variable, weight 400
- Mono: Geist Mono Variable, weight 400–500 (code snippets, tabular numerics —
  amounts, dates, timestamps)
- Display tracking: -0.01em on headings, normal on body
- No italics on headings anywhere (universal rule)

## Spacing
Tailwind's default scale already is a 4pt scale — kept as-is in markup
(`gap-2`, `p-3`, etc.). Named `--space-*` tokens above exist for portability,
not to force a markup rewrite.

## Motion
- Easings: `--ease-out` / `--ease-in` / `--ease-in-out` above — replaces daisyui's
  default `ease` on drawer/transition utilities.
- daisyui's default button click-scale (`--btn-focus-scale: 0.95`) is disabled
  (`1`) — a "bouncy" press reads toy-like against an instrument-panel tone.
- Reveal pattern: none. This is a tool, not a landing page — content is present,
  not revealed.
- Reduced-motion fallback: already handled in `app.css` (existing global rule kept).

## Microinteractions stance
- Silent success on save (existing flash/Toast pattern kept, restyled to tokens).
- Copy-to-clipboard on snippets: brief inline confirmation (existing pattern kept).
- `:focus-visible` uses `--color-focus`, 2px ring, shows instantly, never animated in.

## Icon / emoji discipline
- **Chrome** (nav, section eyebrows, page headers): emoji removed in favour of a
  small accent-coloured dot/rule + type. Modern-minimal restraint — the existing
  🔖📝⌨💸🗄 in nav read as decorative default-AI-dashboard styling.
- **Data** (item type badges, category tags): emoji-as-classifier is preserved
  where it's genuinely functional shorthand a daily user scans by by (e.g. the
  section badges on the catalog page) — not a slop violation, it's an existing,
  working scan pattern for a single-user tool. Judgement call, stated for the record.

## CTA voice
- Primary: filled accent, `--radius-btn`, no uppercase transform, no click-scale.
- Secondary / ghost: bordered `--color-rule` or text-only, same radius.
- Destructive (archive delete): outlined `--color-danger`, requires existing
  confirm() — kept, not a redesign concern.

## Nav and footer
- **Nav:** kept structurally as-is (wordmark + inline section links on desktop,
  drawer on mobile) — this is N1a/N1b territory, which the genre allows when
  destinations are genuinely few (4 catalog types + spends + archive). Restyled:
  tokens, no emoji, tighter radius, hairline border instead of soft blurred panel.
- **Footer:** Ft2 inline single line — already the shape in place. Restyled only.

## Per-page allowances
- All pages are app pages: **no enrichment**, function carries the page.
- Charts (`SpendChart`, `MonthlySpendChart`) restyled to the token palette —
  no change to their data logic.

## What pages MUST share
- The token set above (colour, type, radius, motion) — every route.
- The wordmark treatment (`◆ Dashboard`, restyled).
- The accent's restrained footprint (interactive states, one wordmark mark, chart
  highlights) — never a page-wide fill.
- Table/card dual-layout pattern (mobile cards, desktop table) — already correct,
  kept everywhere it exists.

## What pages MAY differ on
- Sidebar content (capture form vs. spend summary + quick-add) — driven by
  what each page actually does, not a template mismatch.
- Chart presence (spends only).

## Exports

### tokens.css
See the token block above — written to `src/lib/tokens.css` and imported from
`src/app.css`, then mapped onto daisyui's `dashboard` theme so every existing
`btn` / `input` / `badge` / `table` daisyui class picks up the new system without
a markup rewrite.
