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

custom (tuned depth) — surfaces come from a fixed ten-step indigo-to-black
palette supplied by the user (Space Indigo → Black). The palette covers
backgrounds, surfaces and borders only; text, accent and status colours are
defined here in OKLCH, with the existing sky-blue accent carried forward.

**Vibe:** "quiet instrument panel, dense, no-nonsense"
**Anchor:** the app's existing sky-blue accent, carried forward (not replaced),
sitting on deep indigo-black surfaces.

## Stack

- **UI components:** [shadcn-svelte](https://www.shadcn-svelte.com) — the
  official Svelte port of shadcn/ui (built on Bits UI). shadcn/ui itself is
  React-only and cannot be used in this SvelteKit app. Components are copied
  into `src/lib/components/ui/` via the shadcn-svelte CLI and owned by the repo;
  restyle them through the tokens below, not by forking each component's classes.
- **Animation / transitions:** [`motion`](https://motion.dev) (Motion One, the
  framework-agnostic vanilla JS engine). Motion Primitives is React-only, so its
  patterns (fade/slide transitions, transition panel, animated number, text
  effect, in-view, animated group) are rebuilt as Svelte components/actions in
  `src/lib/components/motion/`, using `animate()` / `inView()` from `motion`.
- **Replaces:** daisyUI. The `dashboard` daisyUI theme and `btn` / `input` /
  `badge` / `table` classes are retired as pages migrate to shadcn-svelte
  components. Until a page is migrated it may still use daisyUI — do not mix
  both systems inside one component.

## Blocks (start from these, do not hand-build)

shadcn-svelte ships ready-made page **blocks** (https://www.shadcn-svelte.com/blocks).
The login page and the dashboard shell MUST start from these blocks instead of
being designed from scratch. Add a block with the CLI (it copies the block's
components into the repo, like any other shadcn-svelte component):

```bash
bun x shadcn-svelte@latest add login-02
bun x shadcn-svelte@latest add dashboard-01
```

Once added, the block's files are owned by the repo: restyle them through the
tokens, and adapt their content to this app as listed below. Do not re-run
`add` over a block that has already been customised — it overwrites local edits.

### Login page — `login-02`

- Route: `src/routes/login/`. The block supplies a two-column split layout:
  left column with logo (top-left) and the login form centred (title, email +
  password fields, submit button); right column a full-height cover panel,
  hidden below the `lg` breakpoint so mobile gets the form only.
- Keep the existing SvelteKit form action and session logic untouched — wire
  the block's form to it (`method="POST"`, `use:enhance`, field `name`s the
  action expects, error message from `form`). The block is the view only.
- Strip what does not apply to a single-user app: "Sign up" link, social /
  OAuth login buttons, and "Forgot password" (no reset flow exists).
- Left column on `--color-paper`; the wordmark (`◆ Dashboard`) replaces the
  block's placeholder logo.
- Right cover panel: drop the block's placeholder photo. Use a quiet
  token-only panel instead — `--color-chrome` fill with a `--color-rule` left
  border and a subtle gradient down the palette (`--ink-black` →
  `--black`); no stock imagery, no illustration, no marketing copy. If an
  image is ever added it must be a self-hosted asset, darkened to sit in the
  palette.
- Form enters with the `Transition` motion wrapper (fade + 8px slide-y,
  `--dur-med`); the cover panel does not animate.

### Admin dashboard — `dashboard-01`

- Becomes the **app shell** in `src/routes/+layout.svelte` for every
  authenticated route: collapsible `Sidebar` (app sidebar) + site header +
  content inset. Unauthenticated routes (`/login`) render without the shell.
- Sidebar nav groups replace the old top-nav links (catalog types, spends,
  bills, tasks / kanban / boards, vault, tools, archive). Lucide icon + label per
  item, active route highlighted with `--color-accent`. Sidebar footer holds
  the user menu (email + logout). Collapses to icon rail on desktop, `Sheet`
  on mobile — both provided by the block.
- The `/` overview uses the block's content parts: section cards (stat tiles) →
  spend totals / counts with `AnimatedNumber`; interactive area chart → spend
  trend (reuse existing spend data, not the block's sample data); data table →
  recent items. Delete the block's sample data and any column/feature the app
  has no data for.
- Inside the content inset, individual pages keep their own layout
  (Workbench `[380px_1fr]` grid where it already exists).

## Macrostructure family

This app has two page types — **auth** (`/login`, from the `login-02` block)
and **app pages** (dense CRUD/dashboard panels inside the `dashboard-01`
shell). No marketing pages, no content pages.

- Auth: split screen — form column + decorative cover panel (cover hidden
  on mobile).
- App pages: **Workbench-adapted** — sticky sidebar (capture form / summary /
  filters) + scrollable main content (list or table), placed inside the
  `dashboard-01` content inset. No hero, no enrichment. The existing two-column
  `[380px_1fr]` grid IS the right shape for this content — kept as-is. What
  changes is the token system and component voice layered on top: type,
  colour, radius, border weight, motion, icon/emoji discipline in chrome vs.
  functional data.

## Theme — tokens

### Base palette (user-supplied, do not alter)

```css
:root {
	--space-indigo: #282e42; /* lightest */
	--space-indigo-2: #24293b;
	--shadow-grey: #1f2433;
	--shadow-grey-2: #1b1f2c;
	--ink-black: #161a25;
	--ink-black-2: #12141d;
	--ink-black-3: #0d0f16;
	--onyx: #090a0f;
	--black: #040507;
	--black-2: #000000; /* darkest */
}
```

### Semantic tokens

Pages and components reference these, never the raw palette names.

```css
:root {
	--color-paper: var(--ink-black-2); /* app background */
	--color-paper-2: var(--shadow-grey-2); /* cards, sidebar panels */
	--color-paper-3: var(--shadow-grey); /* hover surfaces, popovers, dropdowns */
	--color-paper-4: var(--space-indigo-2); /* modals, dialogs, raised layers */
	--color-well: var(--ink-black-3); /* inputs, code blocks, inset areas */
	--color-chrome: var(--ink-black); /* nav bar, footer */
	--color-overlay: var(--onyx); /* dialog/sheet backdrop, used at ~80% alpha */
	--color-chart-well: var(--black); /* chart plot background */
	--color-shadow: var(--black-2); /* shadow colour (sparingly — borders first) */

	--color-rule: var(--space-indigo); /* borders / dividers */
	--color-rule-2: var(--space-indigo-2); /* subtler dividers */

	--color-ink: oklch(94% 0.01 265); /* primary text */
	--color-ink-2: oklch(76% 0.014 265); /* secondary text */
	--color-muted: oklch(62% 0.016 265); /* de-emphasised text */

	--color-accent: oklch(72% 0.15 227); /* primary interactive — cool sky-blue, brand-carried */
	--color-accent-ink: var(--ink-black-2); /* text on accent fill (accent L>50 → dark ink) */
	--color-focus: oklch(78% 0.19 227);

	/* Functional status — not decorative. Kept low-footprint, used only for
	   state (trend arrows, pins, delete, alerts), never as page-wide fills. */
	--color-success: oklch(74% 0.15 152);
	--color-warning: oklch(80% 0.15 80);
	--color-danger: oklch(68% 0.18 25);

	/* Category taxonomy — functional, not decorative. Small dots/badges only. */
	--color-cat-bookmark: oklch(74% 0.13 152);
	--color-cat-note: oklch(80% 0.13 80);
	--color-cat-snippet: oklch(74% 0.12 245);

	--font-display: 'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, monospace;
	--font-body: 'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, monospace;
	--font-mono: 'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, monospace;

	--space-3xs: 0.25rem;
	--space-2xs: 0.5rem;
	--space-xs: 0.75rem;
	--space-sm: 1rem;
	--space-md: 1.5rem;
	--space-lg: 2rem;
	--space-xl: 3rem;
	--space-2xl: 4.5rem;

	--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
	--ease-in: cubic-bezier(0.7, 0, 0.84, 0);
	--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
	--dur-short: 160ms;
	--dur-med: 220ms;

	--radius-box: 0.625rem; /* 10px — cards, panels */
	--radius-btn: 0.5rem; /* 8px — buttons, inputs */
	--radius-badge: 0.375rem; /* 6px — badges de-pilled, read as data tags not bubbles */
}
```

### shadcn-svelte variable mapping

shadcn-svelte components read their own CSS variables. Map them onto the
semantic tokens once (in `src/app.css`) so every component inherits the system:

| shadcn-svelte var                        | Token                                                          |
| ---------------------------------------- | -------------------------------------------------------------- |
| `--background` / `--foreground`          | `paper` / `ink`                                                |
| `--card` / `--card-foreground`           | `paper-2` / `ink`                                              |
| `--popover` / `--popover-foreground`     | `paper-3` / `ink`                                              |
| `--primary` / `--primary-foreground`     | `accent` / `accent-ink`                                        |
| `--secondary` / `--secondary-foreground` | `paper-3` / `ink`                                              |
| `--muted` / `--muted-foreground`         | `paper-3` / `muted`                                            |
| `--accent` / `--accent-foreground`       | `paper-3` / `ink` (hover surface, per shadcn semantics)        |
| `--destructive`                          | `danger`                                                       |
| `--border`                               | `rule`                                                         |
| `--input`                                | `rule`                                                         |
| `--ring`                                 | `focus`                                                        |
| `--radius`                               | `radius-box`                                                   |
| `--chart-1` … `--chart-5`                | `accent`, `cat-bookmark`, `cat-note`, `cat-snippet`, `warning` |
| `--sidebar` / `--sidebar-border`         | `paper-2` / `rule`                                             |

Note: shadcn's `--accent` means "subtle hover surface", not brand colour. The
brand sky-blue lives in `--primary`. Do not map brand accent onto `--accent`.

The app is dark-only: put the mapping on `:root` (and `.dark`, which
shadcn-svelte components may target) — no light theme.

**Axes:** dark / monospace / cool (single-family: JetBrains Mono Variable for
display, body and code — the single font IS the design choice; a monospace
voice reinforces the instrument-panel precision and gives tabular numerics for
free).

## Typography

- Family: JetBrains Mono Variable (`@fontsource-variable/jetbrains-mono`),
  self-hosted, replaces Geist / Geist Mono. Ligatures off in UI chrome
  (`font-variant-ligatures: none`), on inside code blocks.
- Display: weight 600–700 (section labels, stat numbers, page titles)
- Body: weight 400; secondary/meta text 400 in `--color-ink-2`
- Code / numerics: weight 400–500 (snippets, amounts, dates, timestamps)
- Display tracking: -0.02em on headings, normal on body
- Monospace runs ~15–20% wider than the old sans: step body down one size
  where dense tables would otherwise wrap, but never below 16px on inputs
  (iOS zoom invariant in `app.css`).
- No italics on headings anywhere (universal rule)

## Spacing

Tailwind's default scale already is a 4pt scale — kept as-is in markup
(`gap-2`, `p-3`, etc.). Named `--space-*` tokens above exist for portability,
not to force a markup rewrite.

## Motion

- Engine: `motion` (`animate`, `inView`) wrapped in Svelte components/actions
  under `src/lib/components/motion/`, following Motion Primitives' patterns:
  - `Transition` — fade / slide-y (8px) enter/exit for dialogs, sheets,
    popovers, toasts.
  - `TransitionPanel` — cross-fade + small slide between tab panels and
    filter-switched lists.
  - `AnimatedGroup` — short stagger (≤ 30ms/item, max ~8 items animated) when a
    list first renders or is re-filtered.
  - `AnimatedNumber` — tween for spend totals and stat numbers when they change.
  - `InView` — allowed only for chart entrance; never for regular content.
- Easings: `--ease-out` for enter, `--ease-in` for exit, `--ease-in-out` for
  layout/panel moves. Durations `--dur-short` (hover, press, small) and
  `--dur-med` (overlays, panels). Nothing over 300ms.
- Properties: `opacity` and `transform` only — no animating height/width/colour
  of large surfaces.
- No bouncy springs, no click-scale on buttons — a press that "boings" reads
  toy-like against an instrument-panel tone.
- Reveal pattern: none for content. This is a tool, not a landing page —
  content is present, not revealed. Motion is for state change, not decoration.
- Reduced motion: every motion wrapper checks
  `matchMedia('(prefers-reduced-motion: reduce)')` and skips to the end state
  (`motion` does not do this automatically for vanilla `animate()`); the global
  rule in `app.css` stays as the CSS-side fallback.

## Microinteractions stance

- Silent success on save (existing flash/Toast pattern kept, rebuilt on
  shadcn-svelte's Sonner toast, restyled to tokens).
- Copy-to-clipboard on snippets: brief inline confirmation (existing pattern kept).
- `:focus-visible` uses `--color-focus`, 2px ring, shows instantly, never animated in.

## Icon / emoji discipline

- **Icons:** Lucide (`@lucide/svelte`), the set shadcn-svelte ships with.
  16px in dense rows, 20px in nav; stroke 1.75; colour inherits text.
- **Chrome** (nav, section eyebrows, page headers): no emoji — a small
  accent-coloured dot/rule + type, or a Lucide icon. Modern-minimal restraint —
  the old 🔖📝⌨💸🗄 in nav read as decorative default-AI-dashboard styling.
- **Data** (item type badges, category tags): emoji-as-classifier is preserved
  where it's genuinely functional shorthand a daily user scans by (e.g. the
  section badges on the catalog page) — not a slop violation, it's an existing,
  working scan pattern for a single-user tool. Judgement call, stated for the record.

## CTA voice

- Primary: shadcn `Button` default variant → filled `--color-accent`,
  `--radius-btn`, no uppercase transform, no click-scale.
- Secondary / ghost: `outline` (bordered `--color-rule`) or `ghost` variant,
  same radius.
- Destructive (archive delete): `outline` styled with `--color-danger`,
  confirmed through a shadcn `AlertDialog` (replaces the native `confirm()`).

## Nav and footer

- **Nav:** the `dashboard-01` block's app sidebar (see Blocks) replaces the old
  top nav — the app now has too many destinations for inline links. Wordmark at
  the top of the sidebar; site header holds the page title, `SidebarTrigger`
  and the Ctrl+K command palette trigger. Sidebar and header on
  `--color-chrome`, hairline `--color-rule` borders, no emoji, no blur.
- **Footer:** Ft2 inline single line — already the shape in place. Restyled only.

## Per-page allowances

- All pages are app pages: **no enrichment**, function carries the page.
- Charts (`SpendChart`, `MonthlySpendChart`) restyled to the token palette
  (`--chart-*`, plot on `--color-chart-well`) — no change to their data logic.

## What pages MUST share

- The token set above (colour, type, radius, motion) — every route.
- The `dashboard-01` shell (sidebar + site header) — every authenticated route.
- shadcn-svelte components for every control that has one (Button, Input,
  Select, Dialog, Sheet, Table, Badge, Tabs, Tooltip, Command, Sonner) — no
  hand-rolled equivalents.
- The `motion/` wrappers for animation — no ad-hoc `animate()` calls or
  per-page CSS keyframes.
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

The palette + semantic token blocks above are written to `src/lib/tokens.css`
and imported from `src/app.css`, where the shadcn-svelte variable mapping is
applied. Migrated pages pick the system up through shadcn-svelte components;
unmigrated pages keep working through the legacy daisyUI `dashboard` theme
(re-pointed at the same tokens) until they are moved over.
