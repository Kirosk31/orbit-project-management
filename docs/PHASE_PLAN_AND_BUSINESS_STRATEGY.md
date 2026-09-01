# Phase Plan & Business Strategy

> Prepared with the `product-phase-planner` skill. This document is a decision/planning artifact for the repository owner. It is intentionally separated from the public README claims until the proposed phase is implemented and verified.

## 1. Executive summary

Orbit is already a **complete, tested, multi-tenant project-management platform**: organizations and workspaces, granular RBAC, projects, boards, Kanban, subtasks, checklists, time tracking, private attachments, comments/reactions/mentions, saved filters, tenant-aware search, analytics, authorized realtime (Socket.IO + Redis fan-out), a four-locale UI (en, es, fr, pt-BR), light/dark themes, a11y safeguards, a 367-test suite, production Docker/NGINX images, and honest documentation.

It is **production-oriented and portfolio-ready**, but it is **not yet sellable as a SaaS**: there is **no billing, no subscription management, no plan gating, no seat limits, and no licensing model**. You cannot charge a customer today. This is the single blocker between "great portfolio project" and "product that produces revenue."

The **next phase must be monetization readiness** — specifically **Billing & Subscription Management** (Stripe-based) with **plan gating and seat limits**. That is the key that unlocks every revenue path: hosted SaaS subscription, white-label/reseller licensing, and one-off custom deployments. It is a complete vertical slice (DB → shared contracts → Stripe service → webhook → gating middleware → seats → UI → tests → docs) and is low-risk because Stripe carries the PCI/card-data burden.

This document defines that phase completely and lays out a business strategy tuned to the owner's context: escaping a below-$700/month income in Costa Rica, where the cost of living is high.

## 2. Verified current state

The following is based on direct inspection of `apps/api/src/app.ts`, `routes.ts`, `server.ts`, `config/env.ts`, `auth.routes.ts`, `tasks.routes.ts`, `apps/api/prisma/schema.prisma` (37 models, 3 enums), `packages/shared/src/permissions.ts`, `packages/shared/src/enums.ts`, plus the existing audits, roadmap, and architecture docs.

### 2.1 Inventory

| Area                                                                                             | Status                         | Evidence                                                                 |
| ------------------------------------------------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------ |
| Authentication (register/login/refresh/logout/logout-all/me/verify/resend/forgot/reset)          | **Implemented + tested**       | `auth.routes.ts`; rate-limited; secure tokens                            |
| Authorization / RBAC                                                                             | **Implemented + tested**       | `Permission` catalog; `requireOrgPermission`; server-side enforcement    |
| Multi-tenancy                                                                                    | **Implemented + tested**       | Membership + permission checks on every tenant-owned path                |
| Organizations / members / teams / invitations                                                    | **Implemented + tested**       | `organizations` module; accept/revoke; roles                             |
| Projects / boards / columns                                                                      | **Implemented + tested**       | CRUD, archive, favorites, members, activity, ordering                    |
| Tasks & task resources (subtasks, checklists+move, time+timer, attachments, labels, assignees)   | **Implemented + tested**       | `tasks.routes.ts`; RBAC-scoped                                           |
| Saved filters                                                                                    | **Implemented**                | per-user, per-board, schema-versioned `filters` JSON                     |
| Comments / reactions / mentions                                                                  | **Implemented + tested**       | create, reply, moderate, reactions, mentions                             |
| Notifications                                                                                    | **Implemented**                | list, unread-count, read, read-all; realtime                             |
| Search (tenant-aware global)                                                                     | **Implemented + tested**       | bounded, permission-scoped, rate-limited                                 |
| Analytics / dashboard                                                                            | **Implemented + tested**       | org-scoped metrics; Recharts                                             |
| Realtime (Socket.IO + Redis fan-out)                                                             | **Implemented + tested**       | authorized rooms, presence, two-node proof                               |
| i18n (en, es, fr, pt-BR) / themes / responsive / a11y / command palette                          | **Implemented + tested**       | complete catalogs; Axe; keyboard                                         |
| Files / private storage                                                                          | **Implemented (local)**        | authenticated, tenant-aware; local volume only                           |
| Docker / NGINX / production topology                                                             | **Implemented + smoke-tested** | non-root API, unprivileged NGINX, health checks, migration+seed one-shot |
| CI/CD                                                                                            | **Implemented**                | GitHub Actions, Dependabot, Gitleaks (per docs)                          |
| Public docs (README, architecture, API, DB, deployment, security, threat model, roadmap, audits) | **Implemented**                | present and honest                                                       |
| **Billing / subscriptions / Stripe**                                                             | **Missing — blocker**          | No Stripe dep, no env vars, roadmap marks it out of scope                |
| **Plan gating / feature limits / seat limiting / usage metering**                                | **Missing**                    | No plan concept in schema or shared contracts                            |
| **Public share links / guest access**                                                            | **Missing**                    | Roadmap: out of scope; prevents viral loop                               |
| **Webhooks / public API tokens / third-party integrations**                                      | **Missing**                    | Roadmap: out of scope; caps Business/Enterprise value                    |
| **Import/export (CSV/JSON/Jira/Trello/Notion)**                                                  | **Missing**                    | Roadmap: near-term; captures switchers                                   |
| **SSO / SAML / SCIM**                                                                            | **Missing**                    | Roadmap: out of scope; caps enterprise                                   |
| **Custom roles / permission editor**                                                             | **Partial**                    | System roles only; editor not built                                      |
| **Real SMTP deliverability**                                                                     | **Partial**                    | SMTP config present but empty by default; operator-owned                 |
| **Object storage (S3-compatible) for multi-host scale**                                          | **Partial**                    | local volume; S3 not implemented                                         |
| **Mail workers / digest delivery**                                                               | **Partial**                    | notification prefs exist; workers/digests not built                      |
| **Upload malware scanning**                                                                      | **Missing**                    | Medium residual risk in security audit                                   |
| **Monitoring / metrics / SIEM**                                                                  | **Missing**                    | Audit notes operator-owned                                               |

### 2.2 Documentation-drift notes

- `docs/MASTER_COMPLETION_PROMPT.md` refers to 33 models; the current schema has 37 — that document is explicitly marked as a historical artifact and is not the current source of truth.
- README already uses honest wording ("production-oriented portfolio SaaS and self-hosted foundation"), which is correct. Do **not** claim "enterprise-grade", "high availability", or "hosted SaaS" until billing, monitoring, and object storage are real.

## 3. Proposed next phase: Billing & Subscription Management

**Objective:** Enable self-serve paid subscriptions with plan gating and seat limits, so a customer can sign up, choose a plan, pay via Stripe, and the system enforces feature/seat boundaries — the minimum viable monetization loop.

### 3.1 Deliverables

- **Prisma (forward-only migration):**
  - `Plan` (key, name, price, currency, isActive) or a static `PlanLimits` map in shared.
  - `Subscription` (orgId, planKey, status, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd, seatCount, lastEventAt).
  - `PlanFeatureFlag`/limits enum in shared (`maxMembers`, `maxProjects`, `maxStorageBytes`, `customRoles`, `whiteLabel`, `webhooks`, `publicShare`, `sso`, `auditExport`).
- **Shared contracts (`packages/shared`):** `PlanKey` enum, `SubscriptionStatus` enum, `PlanLimits` type, Zod schemas for create-checkout, portal-session, change-plan, and the Stripe webhook event envelope (loose, signature-trusted).
- **Stripe service + repository:** create checkout session, create/refresh billing portal session, fetch current subscription, map plan keys, compute used seats, parse/verify webhook events.
- **Billing module:** `billing.routes.ts` (`GET /billing/subscription`, `POST /billing/checkout`, `POST /billing/portal`, `PATCH /billing/plan`, `POST /billing/webhook`), `billing.controller.ts`, `billing.service.ts`, `billing.repository.ts`. The webhook route is **public** but **signature-verified** and **idempotent**.
- **Plan gating middleware:** `requirePlan` + `enforcePlanLimit` helpers; enforce on invite/member-creation (seats), project creation (project limit), attachment storage (storage limit), and gate paywalled features (custom roles, white-label, webhooks, SSO, audit export).
- **Seat enforcement:** default org to Free on creation; inviting beyond seat count returns a controlled `402`/`403` with an "upgrade" signal; never over-seat.
- **Downgrade safety:** on downgrade/unpaid, keep all data; mark over-limit rows read-only (not deleted), and surface an "over limit" banner.
- **Frontend:** `settings/billing` page — current plan, usage meters, upgrade/downgrade, "Manage billing" (Stripe portal), plan comparison; feature gating in UI (hide/disable paywalled actions) — but the **API always enforces**.
- **Env vars:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTUP`, `STRIPE_PRICE_TEAM`, `STRIPE_PRICE_BUSINESS`, `STRIPE_CURRENCY`, `BILLING_ENABLED`.
- **Docs:** README env table, deployment runbook, API map, and update `CURRENT_STATE_AUDIT` / `SECURITY_AUDIT` / `ROADMAP`.

### 3.2 Dependencies

- **Required first:** a Stripe account (test mode) and a basic `PRODUCTS`/`PRICES` layout; existing `config/env.ts` pattern; existing DI in `server.ts`; existing shared-contract pattern.
- **Unblocks:** revenue (hosted SaaS and white-label), trial management, seat/usage metering, plan-based feature rollout, and the public-share/webhook/custom-role phases below.

### 3.3 Risks & mitigations

| Risk                                        | Severity | Mitigation                                                                                                                        |
| ------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| PCI / card-data handling                    | High     | Delegated entirely to Stripe; never store card numbers; use Stripe tokens/Checkout; keep webhook signature verification mandatory |
| Webhook idempotency / replay                | High     | Dedupe by Stripe `event.id`; transactional upsert; record `lastEventAt`                                                           |
| Downgrade data loss                         | High     | Preserve all data; set over-limit rows read-only; never delete on plan change                                                     |
| Currency / tax (CRC vs USD, Costa Rica IVA) | Medium   | Price in USD; enable Stripe Tax; document the obligation to consult an accountant / Hacienda e-factura                            |
| Unpaid / expired subscription               | Medium   | `invoice.payment_failed` + `customer.subscription.deleted` → grace → downgrade to Free read-only                                  |
| Fraud / abuse                               | Medium   | Stripe Radar + rate limits on checkout + verify email                                                                             |
| Local webhook testing                       | Low      | `stripe listen` or a dev-only guarded endpoint                                                                                    |

### 3.4 Acceptance criteria

- Org owner selects a plan → Stripe Checkout (test mode) → webhook sets `Subscription` active → plan limits are honored.
- Inviting a member beyond the seat count returns a controlled `402`/`403` with an upgrade signal; no over-seat membership is created.
- Downgrade preserves all data; over-limit members/projects/attachments become read-only (not deleted).
- Duplicate/replayed Stripe events apply the state change only once.
- A non-owner (viewer/admin) cannot change the plan (`403`).
- An invalid Stripe signature returns `400` and does not change state.
- Free plan cannot access paywalled features at the API level (custom roles, white-label, webhooks, SSO, audit export).

### 3.5 Required tests

- **Unit:** `PlanLimits` resolver; seat computation; webhook event → state mapping.
- **Service:** checkout intent, plan change, downgrade preservation, seat enforcement.
- **Integration:** webhook signature (valid/invalid); `checkout.session.completed`; `subscription.updated`/`deleted`; idempotency on duplicate events.
- **Concurrency:** two simultaneous checkout completions for the same org.
- **Cross-tenant:** user in Org B cannot change Org A plan; viewer cannot change plan.
- **E2E:** owner flow — create org → choose plan → Stripe test → active plan → hit seat limit → upgrade.
- **Accessibility:** billing page keyboard navigation and Axe.

### 3.6 Exact implementation order (minimal vertical slices)

1. Read existing shared contracts + org service + `server.ts` DI; add `Plan`/`Subscription` schema + forward-only migration + default plan seed.
2. Add shared `PlanKey`, `SubscriptionStatus`, `PlanLimits`, and checkout/portal/webhook Zod schemas.
3. Add Stripe client + `BillingService` (checkout, portal, webhook parsing, seat math) + repository; wire into `server.ts` DI (conditional on `BILLING_ENABLED`).
4. Add `billing.routes.ts` + controller (`GET /billing/subscription`, `POST /billing/checkout`, `POST /billing/portal`, `PATCH /billing/plan`, `POST /billing/webhook`).
5. Add plan-gating middleware + `enforcePlanLimit` in invite/member-creation, project creation, attachment storage, and paywalled features.
6. Add the frontend billing page + plan comparison + usage meters + upgrade CTAs + UI feature gating.
7. Add webhook idempotency + transactional state transitions + downgrade preservation.
8. Add tests (unit/service/integration/E2E/a11y) + README env + deployment runbook + API map + update audits/roadmap.
9. Run full gates (`format`, `lint`, `typecheck`, `test`, `build`, `audit`) and fix all failures.

## 4. Business / monetization strategy

### 4.1 Core insight

Orbit's **first-class Spanish and Brazilian Portuguese localization**, **multi-tenant RBAC**, **realtime collaboration**, **private files**, and **analytics** make it uniquely valuable to **Latin American agencies, studios, and SMBs** — who today are forced to pay **USD per-seat** for tools (Asana, Jira, ClickUp) that are not localized for their teams, or to cobble together Notion + Trello + Sheets. This is the wedge. The second wedge is **white-label / reseller**: agencies want to offer "their own" PM platform to clients without building one.

### 4.2 Revenue paths (ranked by speed × value)

1. **White-label / reseller licensing (fastest, highest immediate value).** Sell an agency a monthly license to run a rebranded Orbit for **their** clients (own logo, custom domain, es/pt-BR out of the box). Pricing: **$50–$150/mo per agency**, plus a **$1,500–$5,000 setup**, or **$2k–$5k one-time license + maintenance retainer**. This directly moves income and requires the fewest customers.
2. **Hosted SaaS subscription (scalable recurring).** Public deploy + Stripe. Tiers in USD (flat per team is easier to sell in LatAm than pure per-seat):
   - **Free:** 1 workspace, 5 members, core Kanban.
   - **Startup:** **$29/mo** flat (up to 10 users) — full features, unlimited projects, attachments.
   - **Team:** **$79/mo** flat (up to 25 users) — + saved filters, reports, priority support.
   - **Business:** **$199/mo** flat (up to 100 users) — + custom roles, audit export, webhooks.
   - **Enterprise:** custom — SSO/SAML, white-label, on-prem, SLA.
   - Revenue math: 10 Startup = $290/mo; 20 = $580; 30 = $870. That is the escape from <$700/mo.
3. **One-off custom deployment (immediate cash, low customer count).** Sell a private instance to one client: brand it, train, maintain. **$2k–$8k per deal.** Best for "I need income this month."
4. **Portfolio → remote/contract role (secondary).** The repository itself is a strong hiring signal; treat it as a bonus, not the primary plan.

### 4.3 Monetization levers

- Seats (paid plan seat count), storage (attachment quota), integrations (webhooks/API), white-label (branding/custom domain), priority support/SLA, audit export, SSO.

### 4.4 Growth / viral loops (add right after billing)

- **Public share links** (read-only board/task) — #1 discovery loop.
- **Template gallery** with one-click copy — onboarding and sharing.
- **Embeddable widget** (mini board / task) and a "Built with Orbit" badge.
- **Referral credit** (e.g., 2 months free per referred paying team).

### 4.5 Target segments (LatAm-first)

| Segment                 | Pain Orbit solves                                                                                      | Willingness to pay |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | ------------------ |
| Agencies / studios      | Want to offer a PM tool to clients without paying $50/user/mo per client; need es/pt-BR and rebranding | High               |
| Startups / SMB in LatAm | USD per-seat SaaS is unaffordable; need Spanish UI                                                     | Medium-High        |
| Remote / product teams  | Scattered tools; need all-in-one with realtime                                                         | Medium             |
| Freelancers             | Overspending on per-seat tools                                                                         | Medium             |

### 4.6 Practical notes for the owner

- Price in **USD** to match income goals and simplify; enable Stripe Tax and consult a Costa Rican accountant for IVA/e-factura.
- Start with **white-label + one-off deployments** for immediate cash; launch hosted SaaS once billing is live.
- Keep the **free tier** as the top-of-funnel; public share links and templates drive organic growth.

## 5. Suggested roadmap order (after billing)

1. **Public share links + embeddable widget** — viral loop; high value, medium effort.
2. **Import/export (Jira, Trello, CSV, Notion)** — captures switchers; high value.
3. **Webhooks + public API tokens** — Business/Enterprise value; enables integrations.
4. **White-label (custom domain, logo, branding) + custom roles editor** — the reseller/enterprise unlock; top revenue.
5. **Object storage (S3-compatible) + upload malware scanning** — scale, compliance, multi-host.
6. **Real SMTP + mail workers/digests** — deliverability and retention.
7. **SSO / SAML + SCIM** — enterprise.

## 6. Open risks & owner decisions

- **Pricing definition:** flat-per-team vs per-seat; LatAm pricing tier; free-tier limits.
- **Stripe readiness:** test vs live account, required business info, payouts to Costa Rica.
- **Tax / invoicing:** Costa Rica IVA and Hacienda e-factura; enable Stripe Tax; accountant review.
- **Currency strategy:** USD pricing to avoid FX complexity initially.
- **Distribution choice:** hosted SaaS, white-label only, or both — recommend starting with white-label/one-off for immediate revenue.
- **Infrastructure vendor:** hosting (fly.io / Railway / EC2), managed PostgreSQL/Redis, S3 (or Cloudflare R2), SMTP (Resend / Postmark / SES), object storage before multi-host.
- **Legal:** Terms of Service, Privacy Policy, Data Processing Agreement.
- **Naming/branding:** whether "Orbit" ships as-is or is rebranded per client (white-label requires per-client branding).

## 7. Definition of done (for this phase)

- A customer can create an org, choose a plan, pay via Stripe (test), and the system honor plan limits and seat counts.
- Downgrades preserve data and enforce read-only over-limit states.
- All gates green, including cross-tenant and webhook idempotency tests.
- README, deployment, API docs, audits, and roadmap updated to match the code.
- No new critical/high security finding without an owner-signed, dated risk acceptance.
