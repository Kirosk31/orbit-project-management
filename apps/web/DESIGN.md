---
name: Orbit
description: Calm-focus project management set like an azulejo wall; porcelain grounds, a cobalt rail, ochre for today.
colors:
  cobalt-glaze: 'oklch(0.45 0.17 264)'
  cobalt-glaze-dark: 'oklch(0.74 0.1292 264)'
  cobalt-rail: 'oklch(0.3 0.1224 264)'
  cobalt-rail-accent: 'oklch(0.38 0.1326 264)'
  cobalt-rail-border: 'oklch(0.42 0.102 264)'
  rail-ink: 'oklch(0.97 0.01 250)'
  rail-ink-muted: 'oklch(0.82 0.04 264)'
  porcelain: 'oklch(0.972 0.006 250)'
  porcelain-panel: 'oklch(0.995 0.002 250)'
  porcelain-wash: 'oklch(0.945 0.01 255)'
  porcelain-line: 'oklch(0.9 0.012 255)'
  porcelain-line-strong: 'oklch(0.85 0.016 255)'
  cobalt-ink: 'oklch(0.24 0.035 262)'
  cobalt-ink-muted: 'oklch(0.47 0.03 260)'
  brand-tint: 'oklch(0.94 0.0306 264)'
  brand-tint-ink: 'oklch(0.32 0.102 264)'
  ochre: 'oklch(0.8 0.15 80)'
  ochre-ink: 'oklch(0.5 0.11 70)'
  ochre-on: 'oklch(0.26 0.05 70)'
  brick: 'oklch(0.53 0.19 27)'
  glaze-green: 'oklch(0.52 0.12 158)'
  priority-urgent: 'oklch(0.55 0.19 27)'
  priority-high: 'oklch(0.64 0.15 55)'
  priority-medium: 'oklch(0.58 0.1 220)'
  priority-low: 'oklch(0.62 0.02 255)'
  tile-open: 'oklch(0.92 0.012 255)'
  tile-glaze: 'oklch(0.985 0.005 250)'
typography:
  display:
    fontFamily: 'Archivo Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'
    fontSize: '1.625rem'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '-0.015em'
    fontVariation: 'font-stretch 114%'
  headline:
    fontFamily: 'Archivo Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 600
    lineHeight: 1.5
    fontVariation: 'font-stretch 108%'
  title:
    fontFamily: 'Archivo Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.9375rem'
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: 'Archivo Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.9375rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'Archivo Variable, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.8125rem'
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: 'tnum'
rounded:
  sm: '4px'
  md: '6px'
  lg: '8px'
  xl: '10px'
  tile: '2px'
spacing:
  tile-gap: '3px'
  xs: '6px'
  sm: '8px'
  md: '12px'
  lg: '20px'
  xl: '32px'
  page-x: '32px'
components:
  button-primary:
    backgroundColor: '{colors.cobalt-glaze}'
    textColor: '{colors.tile-glaze}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
    height: '36px'
    padding: '0 14px'
  button-outline:
    backgroundColor: '{colors.porcelain-panel}'
    textColor: '{colors.cobalt-ink}'
    rounded: '{rounded.md}'
    height: '36px'
    padding: '0 14px'
  button-secondary:
    backgroundColor: '{colors.porcelain-wash}'
    textColor: '{colors.cobalt-ink}'
    rounded: '{rounded.md}'
    height: '36px'
  button-destructive:
    backgroundColor: '{colors.brick}'
    textColor: '{colors.tile-glaze}'
    rounded: '{rounded.md}'
    height: '36px'
  input:
    backgroundColor: '{colors.porcelain-panel}'
    textColor: '{colors.cobalt-ink}'
    rounded: '{rounded.md}'
    height: '36px'
    padding: '4px 12px'
  card:
    backgroundColor: '{colors.porcelain-panel}'
    textColor: '{colors.cobalt-ink}'
    rounded: '{rounded.lg}'
    padding: '20px'
  badge-default:
    backgroundColor: '{colors.brand-tint}'
    textColor: '{colors.brand-tint-ink}'
    rounded: '{rounded.sm}'
    padding: '1px 6px'
  badge-warning:
    backgroundColor: '{colors.ochre}'
    textColor: '{colors.ochre-ink}'
    rounded: '{rounded.sm}'
    padding: '1px 6px'
  nav-rail:
    backgroundColor: '{colors.cobalt-rail}'
    textColor: '{colors.rail-ink}'
  nav-item-active:
    backgroundColor: '{colors.cobalt-rail-accent}'
    textColor: '{colors.rail-ink}'
    rounded: '{rounded.md}'
    height: '36px'
  tile-done:
    backgroundColor: '{colors.cobalt-glaze}'
    rounded: '{rounded.tile}'
    size: '14px'
  tile-open:
    backgroundColor: '{colors.tile-open}'
    rounded: '{rounded.tile}'
    size: '14px'
  tile-overdue:
    backgroundColor: '{colors.ochre}'
    rounded: '{rounded.tile}'
    size: '14px'
---

# Design System: Orbit

## Overview

**Creative North Star: "The Tiled Wall"**

A team's week is a panel of simple, repeated pieces set in calm order, after Athos Bulcao's glazed azulejo walls in Brasilia. The surface is cool porcelain with white panels; a deep cobalt rail holds navigation the way a tiled wall holds a corridor; ochre appears only for "today" and attention. The personality is calm focus: quiet surfaces, generous air, color only when it carries meaning (status, priority), no fatigue across a long day.

Depth is tonal, not dramatic: panels sit on the ground by lightness and a hairline border, and shadows exist only for things that float. Controls are square-shouldered with one small radius family. One typeface, Archivo Variable, carries every role; its width axis is the only display gesture. The signature is the tile panel: progress drawn as one quarter-circle tile per task.

The build refuses the generic shadcn grey screen with one violet accent and a grid of KPI cards. White-label is a first-class constraint: the structure must stay correct whatever hue a tenant brings.

**Key Characteristics:**

- Porcelain ground, white panels, cobalt rail, ochre for today and attention.
- Archivo Variable only, widened on headings via font-stretch; tabular figures in fields and badges.
- One small radius family (4/6/8/10px); tonal layering; shadows only on floating layers.
- Priority, status and overdue always carry an icon, count or text beside the hue.
- Brand accent derived from two tokens (hue, chroma), so tenants retune without losing contrast.

## Colors

A cool, blue-tinted neutral field with a single cobalt voice, one warm ochre counterpoint, and semantic hues reserved for state. All values are OKLCH and defined in `packages/design-tokens/tokens.css`; the dark theme (`.dark`) redefines the same names.

### Primary

- **Cobalt Glaze** (oklch(0.45 0.17 264), `--primary`): primary buttons, links, the done tile, checked controls, progress fill, caret and accent-color. Dark theme lifts it to oklch(0.74 chroma*0.76 hue) so it stays AA on the dark ground, with a dark primary-foreground.
- **Brand Tint / Tint Ink** (`--accent`, `--accent-foreground`): hover and default-badge fill, a whisper of the brand hue (chroma 0.18x brand-chroma) with deep brand-hued text.

### Secondary

- **Ochre** (oklch(0.8 0.15 80), `--ochre`/`--warning`): "today", attention, the overdue tile, the planet in the logo. Never body text on light grounds.
- **Ochre Ink** (oklch(0.5 0.11 70), `--ochre-ink`): the only ochre for text on light grounds (warning badges). In dark theme it lightens to oklch(0.84 0.13 82).

### Tertiary

- **Brick** (`--destructive`, oklch(0.53 0.19 27)) and **Glaze Green** (`--success`, oklch(0.52 0.12 158)): destructive actions and success states. Badges tint them at 14% over the ground.
- **Priority hues** (`--priority-urgent/high/medium/low`): red, orange, teal-blue, grey. Used only through the PriorityMark (see Components).

### Neutral

- **Porcelain** (oklch(0.972 0.006 250), `--background`): the page ground. **Porcelain Panel** (oklch(0.995 0.002 250), `--card`/`--popover`): cards, inputs, popovers.
- **Porcelain Wash** (`--secondary`/`--muted`) for quiet fills; **Porcelain Line** (`--border`) hairlines; **Porcelain Line Strong** (`--input`) control borders.
- **Cobalt Ink** (oklch(0.24 0.035 262), `--foreground`) text; **Cobalt Ink Muted** (`--muted-foreground`) secondary text.
- **Cobalt Rail** (oklch(0.3 chroma*0.72 hue), `--rail`) with `--rail-accent`, `--rail-border`, `--rail-foreground`, `--rail-muted-foreground`: the navigation wall, a darker, desaturated derivation of the brand hue.

### White-label retuning

Two root variables drive the brand: `--brand-hue` (default 264) and `--brand-chroma` (default 0.17). Lightness is fixed per role, only hue and chroma move: primary (L 0.45 light, 0.74 dark), ring (L 0.55), accent tint, the whole rail family (chroma scaled 0.55-0.78), and the logo tile (`--brand-tile`). Ochre, semantic hues, priority hues and neutral grounds do not retune, so state meaning and contrast hold for every tenant. A tenant should be verified at AA for primary-on-primary-foreground and rail text after changing hue; the branding editor itself is not built.

### Named Rules

**The Ochre Is Today Rule.** Ochre marks today and attention only. It never decorates, and its text form is always Ochre Ink.
**The Fixed Lightness Rule.** Brand roles are defined by lightness first; a tenant swaps hue and chroma, never lightness.
**The Cobalt Rarity Rule.** Outside the rail, cobalt appears on the primary action, links, checked state and done tiles. Everything else is porcelain.

## Typography

**Display, Body and Label Font:** Archivo Variable (self-hosted via @fontsource-variable/archivo wdth.css, fallbacks ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif). Monospace stack exists as `--font-mono` but is not used for labels.

**Character:** A grotesque from Buenos Aires whose width axis lets headings stand wider without a second family. Everything else is the same face at ordinary width.

### Hierarchy

- **Display** (600, 1.625rem, 1.2, -0.015em, font-stretch 114% via the global h1 rule): page titles (PageHeader). Landing heroes and section headings set font-stretch inline at 110-112%.
- **Headline** (600, 1rem, font-stretch 108% via h2/h3 rule): section headers; the auth panel statement uses 108% at 1.5rem.
- **Title** (600, 0.9375rem, leading-snug): card titles, empty-state titles.
- **Body** (400, 0.9375rem/1.5): default. Descriptions are 0.875rem muted, capped at 65ch. `text-wrap: balance` on headings, `pretty` on paragraphs.
- **Label** (500, 0.8125-0.875rem): buttons (0.875rem, 0.8125rem small), badges (0.75rem, tabular), project keys (0.6875rem bold, tracking-wide).

### Named Rules

**The Width Is The Voice Rule.** Display emphasis comes from font-stretch (108-114%), not from a second family or heavier weight. The wordmark uses 112% at weight 650.
**The Tabular Figures Rule.** Numbers in inputs, badges and tile overflow counts are tabular.

## Layout

Single authenticated frame: cobalt rail at left (workspace switcher, navigation, recent projects, account at foot), top bar with breadcrumb and a search field that opens the command palette, then the main column in PageContainer. Page widths are named: narrow (max-w-3xl), default (5xl), wide (7xl), full. Horizontal padding steps 16 / 24 / 32px (base / sm / lg); top padding 24px, 32px at lg; bottom 64px. PageHeader sits 28px above content, stacks on mobile, aligns actions to the end on sm+. Section headers sit 12px above their content. Controls are 36px high (32 small, 40 large) on a 4px base; card padding 20px with 20px internal gap. Tiles sit 3px apart. The first viewport is "Today": assigned and due-soon tasks first, project tile panels beside, notifications below. Below lg the rail moves into a 288px left sheet opened from a menu button in the 56px top bar.

### Motion

Motion is short and tied to state. State transitions are 150ms ease-out (buttons, nav items, inputs); tile fill and rotation 300ms ease-out; dialogs 150ms fade and 95% zoom; accordions 200ms; `fade-up` entrance 600ms on cubic-bezier(0.16, 1, 0.3, 1) for landing content; a card landing in Done settles from -6px (`land`, site). Buttons nudge 1px down on press. Reduced motion is respected twice: a global `prefers-reduced-motion` rule clamps animation and transition durations to 0.01ms and disables smooth scrolling, and framer-motion runs under `MotionConfig reducedMotion="user"`.

## Elevation & Depth

Tonal layering. Panels are lighter than the ground and separated by a 1px hairline; the rail is darker than everything. Shadows appear only on floating layers.

### Shadow Vocabulary

- **Overlay** (`box-shadow: 0 16px 40px -16px oklch(0.25 0.06 262 / 0.3), 0 2px 6px -2px oklch(0.25 0.06 262 / 0.14)`; heavier in dark): dialogs, sheets, menus.
- **Lift** (`box-shadow: 0 8px 20px -10px oklch(0.25 0.06 262 / 0.28)`): tooltips and small raised items.

Dialog scrim is oklch(0.2 0.04 262 / 0.42).

### Named Rules

**The Tone Not Shadow Rule.** Resting surfaces never carry a shadow; separation is lightness and a hairline.

## Shapes

One radius family from a 0.5rem base (`--radius`): 4px (sm: badges, checkbox), 6px (md: buttons, inputs, nav items), 8px (lg: cards, empty states), 10px (xl: dialogs). Tiles are 2px and the logo tile 7px of 32. Progress bars are fully rounded. The recurring geometry is the quarter circle: each tile holds a quarter-circle module rotated in steps of 90 degrees.

## Components

### Buttons

- **Shape:** 6px radius, 36px high (sm 32, lg 40, icon 36 square), 14px side padding, 0.875rem medium, 16px icons.
- **Primary:** cobalt fill with glaze text; hover mixes 14% ink into the fill. Destructive follows the same mix.
- **Outline / Secondary / Ghost / Link:** outline is a panel fill with a strong hairline that warms toward the brand on hover; secondary is wash; ghost and hover states land on the brand tint.
- **Press / Focus:** 1px downward press; disabled 50% opacity. Focus is a global 2px ring-colored outline at 2px offset.

### Inputs / Fields

Panel fill, 1px strong hairline, 6px radius, 36px high, tabular figures. Hover darkens the border; focus shifts to the ring color with a 2px ring at 25%. Invalid uses brick border and ring.

### Cards / Containers

8px radius, panel fill, 1px border, no shadow, 20px padding and gap. Card title 0.9375rem semibold.

### Badges

4px radius, 12px text, tabular. Default is brand tint; success, destructive and warning are 14-24% tints with a tinted ink (warning uses Ochre Ink).

### Navigation (the rail)

Cobalt rail with rail-foreground text, 36px items at 6px radius, active/hover on the rail-accent fill, 32px recent-project rows, focus outline switched to rail-foreground so it reads on cobalt. The logo uses the rail tone variant.

### PriorityMark

Priority drawn as one to four filled tiles by count plus a text label, colored by the priority tokens; "none" can render empty slots for alignment. Color is never the only carrier.

### Page frame, EmptyState

PageContainer, PageHeader, SectionHeader (shared/page.tsx) are the only page scaffolding. EmptyState is an unlaid tile panel (3x3, mostly open tiles, a few done) inside a dashed 8px border.

### Signature: Tile Panel

Progress for a project or board: one tile per task in a grid (default 14px tile, 3px gap, 12 columns, max 48 then a "+N" tile). Each tile is a square with a quarter-circle module, rotated by a repeating sequence (0, 90, 180, 90, 270, 0, 180, 270). Three states:

- **Done:** filled with `--tile-done` (the brand primary) with a glaze quarter disc at 92% opacity.
- **Open:** `--tile-open` wash with only an outlined quarter arc (muted, 45%).
- **Overdue:** filled ochre with a darker ochre-ink quarter disc at 55%.
  Done and overdue differ from open by fill and by a solid disc versus an outline, so state does not rest on hue alone. The panel is `role="img"` with a text summary ("7 of 10 tasks done, 1 overdue"). Fill and rotation transition at 300ms ease-out. The logo is the same module: one cobalt tile, glaze quarter disc and arc, ochre planet.

### Shared across apps

`apps/site` (Next.js) imports the same `@orbit/design-tokens` (tokens.css, theme.css), `@orbit/brand` (Logo, TilePanel, TileGlyph; transpiled in next.config) and `@orbit/locales` (en, es, fr, pt-br) as `apps/web`. Token, brand and copy changes therefore land in both. The site adds only its own keyframes (e.g. `land`) and its own reduced-motion rule.

## Do's and Don'ts

### Do:

- **Do** take every color from a token; derive brand roles from `--brand-hue` and `--brand-chroma` so a tenant can retune.
- **Do** pair priority, status, WIP and overdue with an icon, count or text; never color alone.
- **Do** keep text and controls at WCAG 2.1 AA in both light and dark themes; check dark values, not only light.
- **Do** use Ochre Ink for ochre-toned text on light grounds.
- **Do** build page structure from PageContainer, PageHeader and SectionHeader; use TilePanel for progress.
- **Do** keep a visible 2px focus outline (rail-foreground on the rail) and respect `prefers-reduced-motion`.
- **Do** route every visible string through i18n (four shared locales).

### Don't:

- **Don't** put resting shadows on cards or panels; shadow is for overlays and tooltips.
- **Don't** use ochre as decoration or body text.
- **Don't** add a second typeface or monospace labels; emphasis comes from font-stretch and weight.
- **Don't** hard-code hex or oklch values in components that a token already covers; tenants would not retune them.
- **Don't** use the orbit metaphor as decoration inside the working flow; it belongs to the mark, empty states and progress.
- **Don't** fall back to the generic shadcn look: grey screen, one violet accent, grid of KPI cards.
