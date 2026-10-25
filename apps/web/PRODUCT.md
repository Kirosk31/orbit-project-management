# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: startups and SMBs in Latin America, teams of roughly 5–30 people. Teams are mixed:
operations, design, sales, and marketing work alongside developers. Many arrive from Trello,
spreadsheets, or WhatsApp threads. Spanish (and Brazilian Portuguese) is their working language.
People open Orbit at the start of the day to see what is theirs, keep it open for hours, move
cards as work progresses, and close the day by checking what is late or blocked.

Secondary, confirmed by the business plan: agencies and studios that resell a white-labeled Orbit
to their own clients, and remote product teams.

## Product Purpose

Orbit is a multi-tenant project management platform: organizations, projects, Kanban boards and
list views, detailed tasks, collaboration, search, and delivery analytics in one product. Success
means a team runs its whole week in Orbit, without a second tool, and without dreading opening it.

## Positioning

Three claims the product must prove together, confirmed by the owner:

1. **Everything in one place, without the noise.** Kanban, tasks, subtasks, checklists, time
   tracking, comments, attachments, analytics, and realtime updates live together, with less visual
   noise than all-in-one competitors such as ClickUp.
2. **Built for Latin America.** Native Spanish and Brazilian Portuguese (plus English and French),
   and flat per-team pricing instead of USD per-seat pricing.
3. **Secure and serious.** API-enforced tenant isolation, five system roles with granular
   permissions, revocable sessions, audit events. Trust is an argument for companies and agencies.

## Operating Context

- Daily rituals: "what's mine today", standups around the board, moving cards between columns,
  reviewing overdue work, commenting with @mentions.
- Long sessions on laptops; also phones for quick checks (mobile web, not native).
- Command palette (Cmd/Ctrl+K) and keyboard navigation already exist.
- Realtime presence and updates via Socket.IO.

## Capabilities and Constraints

- Stack in place: React 19, Vite, Tailwind CSS v4 (CSS-first tokens in
  `src/styles/globals.css`), Radix primitives, lucide icons, framer-motion, i18next.
- Content Security Policy (`deploy/security-headers.conf`) allows fonts only from `'self'` and
  `data:`: every typeface must be self-hosted.
- Every visible string goes through i18n in four locales (`packages/locales/src/{en,es,fr,pt-br}.ts`, shared with the public site);
  `src/lib/i18n.test.ts` enforces identical keys.
- Playwright and Axe journeys depend on accessible names and English copy (see `e2e/`).
- Light and dark themes plus system preference are product features.
- **White-label ready:** the Orbit identity is the default skin. The accent color and the logo
  must be swappable per tenant from a small set of tokens without breaking contrast or hierarchy.
  The branding editor itself is not built yet.
- Not built yet: billing/plans UI (API module exists), keyboard alternative to drag and drop.

## Brand Commitments

- Name: **Orbit**. Tagline in use: "Plan. Track. Ship." / "Keep your work in orbit."
- Personality chosen by the owner: **calm focus**. Quiet surfaces, generous air, color only when it
  carries meaning (status, priority), no visual fatigue over long days.
- The orbit metaphor may appear in the brand mark, empty states, and progress, never as decoration
  inside the working flow.
- Explicit anti-references from the owner: generic shadcn template look, "designed by raw AI
  imitating templates", anything that makes the tool feel like a chore.

## Evidence on Hand

- Real product capabilities listed in `README.md`; real business plan in
  `docs/PHASE_PLAN_AND_BUSINESS_STRATEGY.md`.
- No customers, testimonials, logos, or usage metrics exist. Locale sections `pricing`,
  `testimonials`, and `logos` exist but must not be rendered with invented content.
- No photography or illustration assets; the only brand asset is the inline SVG logo.

## Product Principles

1. **Today first.** Every entry point answers "what needs me now" before anything else.
2. **Meaning over decoration.** Color, motion, and emphasis exist only to communicate state.
3. **One tool, many people.** Plain language that non-technical teammates understand; power
   (keyboard, filters, palette) available without being demanded.
4. **Trust is visible.** Permissions, roles, and destructive actions are clear and never surprising.
5. **Every tenant's brand, Orbit's craft.** The structure stays excellent whatever accent and logo a
   client brings.

## Accessibility & Inclusion

WCAG 2.1 AA in both themes (enforced by Axe in CI), visible keyboard focus, `prefers-reduced-motion`
respected, touch targets for mobile, and priority/status/WIP never communicated by color alone.
