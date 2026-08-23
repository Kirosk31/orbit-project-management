# GitHub Publication Guide

This guide prepares Orbit for a public portfolio release. It does not authorize an automated push, repository creation, deployment, or release; the repository owner should review and execute those external actions.

## Recommended repository metadata

Repository name:

```text
orbit-project-management
```

GitHub **About** description:

```text
Multi-tenant project management SaaS with React, Express, PostgreSQL, Prisma, Redis, Socket.IO, strict RBAC, analytics, i18n, tests, and production Docker.
```

Website: use the real HTTPS deployment URL only after it is live. Do not insert a placeholder or localhost URL in the GitHub website field.

Topics:

```text
react
typescript
nodejs
express
postgresql
prisma
redis
socket-io
project-management
kanban
saas
multi-tenant
rbac
docker
playwright
```

## Portfolio description

Use this copy in a portfolio entry:

> Orbit is a security-focused, multi-tenant project management platform built as a complete TypeScript monorepo. It combines rotating sessions, granular organization RBAC, private tenant-aware files, projects and Kanban planning, detailed task collaboration, distributed Socket.IO events, authorized global search, delivery analytics, four-language accessible React UX, PostgreSQL/Redis integration tests, and a health-checked Docker/NGINX deployment. The project includes threat modeling, audits, CI security gates, migration/seed automation, and an honest operations runbook.

Suggested engineering highlights:

- Designed and tested organization isolation against IDOR/BOLA rather than relying on client-side route guards.
- Modeled 37 relational entities with Prisma migrations, transactional concurrency controls, audit history, and bounded analytics/search queries.
- Implemented short-lived access tokens, rotating revocable refresh sessions, CSRF/CORS controls, differentiated Redis rate limits, and single-use recovery tokens.
- Delivered authorized realtime project rooms and distributed presence/event fan-out across API instances through Redis.
- Built responsive English, Spanish, French, and Brazilian Portuguese UX with route splitting, query-cache reconciliation, keyboard flows, reduced motion, and Axe gates.
- Packaged non-root containers, unprivileged NGINX, internal database/cache networking, migrations, RBAC seed, health checks, and CI image builds.

## Media checklist

Use only synthetic data. Recommended images:

1. Landing page in desktop dark mode.
2. Dashboard showing workload, progress, velocity, and burndown.
3. Kanban board with realistic synthetic labels, priorities, and assignees.
4. Task detail with subtasks, two checklists, a comment, and time tracking.
5. Organization members/teams view demonstrating roles.
6. Mobile board or dashboard.
7. Language switch showing the same screen in Spanish or Portuguese.

Crop private browser chrome and notifications. Never show a personal email, local filesystem path, token, environment file, Docker secret, SMTP host, real invitation link, or production customer data. Add useful alt text to every image.

## Pre-publication security review

Run from a clean terminal:

```powershell
npm.cmd ci
npm.cmd run prisma:generate --workspace=@orbit/api
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd audit --audit-level=high
npm.cmd run test:e2e
docker compose --env-file .env.production.example config --quiet
docker compose --env-file .env.production.example build api web migrate seed
```

Inspect ignored sensitive files:

```powershell
git status --short --ignored
git check-ignore -v apps/api/.env apps/web/.env test-results
```

The local `.env` files, runtime `data`, uploads, logs, Playwright output, and dependency/build directories must be ignored. `.env.example` and `.env.production.example` should contain placeholders only.

Before the first push, scan the exact staged snapshot and history with a trusted secret scanner. If a real secret ever entered Git history, removing the visible line is insufficient: rotate the credential first and purge/rebuild history before publication.

## First commit review

This workspace originally had no committed repository baseline, so treat the first commit as a release artifact. Review every staged path rather than using a blind add-and-push sequence.

```powershell
git status --short
git add --dry-run .
git diff --cached --stat
git diff --cached
```

After intentionally staging reviewed files, run all gates again if the staged snapshot differs from the tested working tree. A suitable initial commit message is:

```text
feat: release Orbit project management platform
```

## GitHub settings

After creating the repository:

1. Enable private vulnerability reporting.
2. Enable Dependabot alerts and security updates.
3. Protect `main` and require pull requests.
4. Require the quality, browser, container, and secret-scanning CI jobs.
5. Block force pushes and branch deletion.
6. Require conversation resolution and prevent bypass where appropriate.
7. Configure Actions permissions with least privilege.
8. Add the About description and topics above.
9. Enable Issues only if they will be maintained.
10. Do not add repository secrets until a workflow genuinely requires them.

## Release notes for `v1.0.0`

Suggested title:

```text
Orbit v1.0.0 — portfolio release
```

Suggested summary:

> The first public Orbit release delivers the end-to-end owner workflow, multi-tenant organization/project/task management, detailed task resources, authorized realtime collaboration, global search, analytics, four-language accessible UI, attack-oriented tests, and a production-oriented Docker/NGINX topology. See the security audit and deployment runbook before self-hosting with real data.

Link the release to `CHANGELOG.md`, `SECURITY.md`, `docs/DEPLOYMENT.md`, and the documented residual risks. Do not label the release penetration-tested, compliant, highly available, or hosted unless those statements become independently true.
