# Orbit

Orbit is a full-stack, multi-tenant project management platform for teams that need organizations, projects, Kanban boards, detailed tasks, collaboration, search, and delivery analytics in one product.

This repository is a production-oriented portfolio project rather than a static demo. It contains a React application, a Next.js public site, an Express API, a relational PostgreSQL model, Redis-backed rate limiting and multi-instance realtime delivery, security-focused integration tests, browser accessibility tests, production containers, and automated CI gates.

## Product capabilities

- Organization workspaces with members, invitations, teams, five system roles, and granular permissions
- Projects with memberships, favorites, archival, boards, ordered columns, and task ordering
- Tasks with priorities, dates, assignees, labels, subtasks, multiple checklists, comments, reactions, attachments, activity, and time tracking
- Personal saved board filters and tenant-aware global search across tasks, projects, users, comments, and labels
- Dashboards for task totals, completion rate, overdue work, tracked time, project progress, workload, velocity, activity, and burndown
- In-app notifications and authorized Socket.IO updates for tasks, boards, comments, notifications, and presence
- English, Spanish, French, and Brazilian Portuguese with persisted account preferences
- Responsive light and dark themes, white-label brand color preview, keyboard shortcuts, keyboard-accessible navigation, command palette, reduced-motion support, loading states, and error boundaries

## Design

Orbit's interface follows one idea, **calm focus**: quiet surfaces, generous air, and color only when it carries meaning. Its signature is the _azulejo tile_, after the tile panels Athos Bulcão made for Brasília. Every task is one tile; finishing it glazes the tile in the brand color, and the sprint becomes a small wall of progress that reads at a glance.

|                          Before                          |                   After                    |
| :------------------------------------------------------: | :----------------------------------------: |
| ![Previous dashboard](docs/screenshots/before-today.png) | ![Today](docs/screenshots/today-light.png) |
|   ![Previous board](docs/screenshots/before-board.png)   | ![Board](docs/screenshots/board-light.png) |

| Task, light                                     | Today, Spanish                        | Today, mobile                                |
| ----------------------------------------------- | ------------------------------------- | -------------------------------------------- |
| ![Task detail](docs/screenshots/task-light.png) | ![Hoy](docs/screenshots/today-es.png) | ![Mobile](docs/screenshots/today-mobile.png) |

Decisions worth knowing:

- **Today first.** The home screen answers "what needs me now": overdue and due-today work is grouped on ochre, served by one `GET /organizations/:slug/my-tasks` call instead of a request per project. New accounts get a three-step first-week guide instead of an empty dashboard.
- **One hue retunes the product.** Primary, ring, rail and logo derive from `--brand-hue` at fixed lightness, so an agency can resell Orbit in its own color without breaking contrast. Try it in **Profile → Brand color**; axe reports no serious issues across six hues in both themes.
- **Never color alone.** Priority, status and overdue work always carry an icon or text next to the color. Reduced motion collapses every animation, including the glaze.
- **Keyboard.** `Ctrl/Cmd K` or `/` opens search, `N` adds a task to the first column of a board.
- **One source for two apps.** The Vite app and the Next.js [public site](docs/public-site.md) share tokens, locale catalogs and the logo/tile components through workspace packages.

![The public site in Costa Rican Spanish](docs/screenshots/site-es-cr.png)

The full system (palette in OKLCH, type, spacing, motion, components and named rules) lives in [`apps/web/DESIGN.md`](apps/web/DESIGN.md); product intent and audience are in [`apps/web/PRODUCT.md`](apps/web/PRODUCT.md).

## Security model

Security decisions are enforced by the API, not by hidden client controls.

- Short-lived signed access tokens and rotating, revocable refresh tokens in `HttpOnly` cookies
- Strong password hashing, email verification architecture, password reset, logout, and global session revocation
- Double-submit CSRF protection for state-changing requests and explicit credentialed CORS origins
- Organization and project membership checks on every tenant-owned operation, including search, files, analytics, and realtime rooms
- Granular RBAC permissions for owner, admin, manager, developer, and viewer roles
- Separate Redis-backed limits for authentication, recovery, invitations, uploads, search, analytics, and general API traffic
- Strict Zod schemas, unknown-field rejection, bounded pagination, upload size/type/signature checks, randomized private storage keys, and authenticated downloads
- Structured redacted logs, request IDs, safe production errors, security headers, durable audit events, readiness probes, and graceful shutdown
- CI dependency auditing, secret scanning, unit/integration tests, cross-tenant attack cases, browser flows, Axe checks, and production image builds

See [SECURITY.md](SECURITY.md), [the security audit](docs/SECURITY_AUDIT.md), and [the threat model](docs/THREAT_MODEL.md) for scope and residual risks.

## Technology

| Area     | Stack                                                                                                                                    |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Site     | Next.js 16 App Router, static per-locale pages, `next/og`, sitemap and `hreflang` ([details](docs/public-site.md))                       |
| Web      | React 19, TypeScript, Vite, React Router, TanStack Query, Zustand, Tailwind CSS, Radix UI, React Hook Form, Zod, Recharts, Framer Motion |
| API      | Node.js 22, Express 5, TypeScript, Socket.IO, Pino                                                                                       |
| Data     | PostgreSQL 16, Prisma 7, Redis 7                                                                                                         |
| Security | bcrypt, JWT, `HttpOnly` cookies, CSRF, Helmet, CORS allowlist, Redis rate limits                                                         |
| Testing  | Vitest, Supertest, React Testing Library, Playwright, Axe                                                                                |
| Delivery | Docker, Docker Compose, unprivileged NGINX, GitHub Actions and Azure Pipelines ([setup](docs/azure-devops.md)), Dependabot, Gitleaks     |

## Repository layout

```text
.
|-- apps/
|   |-- api/                 Express API, Socket.IO, Prisma, migrations, seed
|   |-- site/                Next.js public site, five locales, SEO metadata
|   `-- web/                 React application and localized UI
|-- packages/
|   |-- brand/               Logo and tile progress panel shared by web and site
|   |-- design-tokens/       Azulejo OKLCH tokens and Tailwind v4 theme mapping
|   |-- locales/             EN, ES, FR, PT-BR catalogs shared by web and site
|   |-- shared/              Shared Zod contracts, types, permissions, events
|   |-- eslint-config/
|   |-- prettier-config/
|   `-- tsconfig/
|-- deploy/                  NGINX and security-header configuration
|-- docs/                    Architecture, API, database, deployment, audits
|-- e2e/                     Playwright critical journeys and Axe checks
|-- docker-compose.dev.yml   Local PostgreSQL and Redis
`-- docker-compose.yml       Complete production topology
```

## Prerequisites

- Node.js `22.22.0` (the version is pinned in `.nvmrc` and `.node-version`)
- npm `10` or newer
- Docker Desktop with Docker Compose
- Git

Install Node at the operating-system level, not inside this project folder. On Windows, the official Node.js installer normally installs it under `C:\Program Files\nodejs`. `nvm` is optional and is not included with Node.js; if PowerShell says that `nvm` is not recognized, either install **NVM for Windows** separately or use the official Node.js 22 installer.

Verify the runtime in PowerShell:

```powershell
node --version
npm.cmd --version
docker --version
docker compose version
```

The first command should report `v22.22.0` or a newer compatible Node 22 release. Use `npm.cmd` instead of `npm` if PowerShell blocks `npm.ps1` because of its execution policy.

## Local setup on Windows

These commands assume PowerShell is open in the repository root.

### 1. Install dependencies

```powershell
npm.cmd ci
```

Use `npm ci` for a reproducible installation from `package-lock.json`. Use `npm install` only when intentionally changing dependencies.

### 2. Create the API environment file

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Generate a local JWT signing secret:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Open `apps/api/.env`, replace `JWT_ACCESS_SECRET`, and keep these local defaults:

```dotenv
DATABASE_URL=postgresql://orbit:orbit@localhost:5432/orbit?schema=public
REDIS_URL=redis://localhost:6379
CORS_ORIGINS=http://localhost:5173
WEB_APP_URL=http://localhost:5173
```

Never commit `apps/api/.env`. The repository ignores environment files and contains examples only.

### 3. Start PostgreSQL and Redis

Make sure Docker Desktop is running, then execute:

```powershell
npm.cmd run db:up
docker compose -f docker-compose.dev.yml ps
```

Wait until both `orbit-postgres` and `orbit-redis` show `healthy`. PostgreSQL listens on `localhost:5432`; Redis listens on `localhost:6379`.

### 4. Generate Prisma, create the database schema, and seed RBAC

```powershell
npm.cmd run prisma:generate --workspace=@orbit/api
npm.cmd run prisma:deploy --workspace=@orbit/api
npm.cmd run db:seed --workspace=@orbit/api
```

The seed is idempotent. By default it creates only permission and role reference data; it does not create a public demo account or a known password.

Optional disposable sample data requires all of these values in `apps/api/.env`:

```dotenv
SEED_SAMPLE_DATA=true
SEED_USER_EMAIL=owner@example.test
SEED_USER_PASSWORD=replace-with-a-private-password-of-12-or-more-characters
SEED_USER_NAME=Local Owner
```

Run the seed command again after setting them. Do not enable sample data in production.

### 5. Start the API and web application

Open two PowerShell terminals in the repository root.

Terminal 1:

```powershell
npm.cmd run dev:api
```

Terminal 2:

```powershell
npm.cmd run dev:web
```

Open the following URLs:

- Web application: <http://localhost:5173>
- API liveness: <http://localhost:4000/health>
- API readiness: <http://localhost:4000/health/ready>
- Interactive API documentation in development: <http://localhost:4000/docs>

The readiness response must report both `database` and `redis` as `ok`.

## First-use walkthrough

1. Open `/register`, create an account, and enter the protected application.
2. Open **Organizations**, create a workspace, and inspect its member, role, team, and invitation controls.
3. Open **Projects**, choose the workspace, and create a project with a short unique key.
4. Create a board, add columns such as **Backlog**, **In progress**, and **Done**, then add tasks.
5. Open a task to manage assignees, labels, subtasks, checklists, comments, attachments, dates, time entries, and activity.
6. Use board filters and save a personal filter; drag tasks between columns to update ordering.
7. Use the command palette or global search to find authorized resources across the workspace.
8. Return to the dashboard and select the workspace to view workload, progress, velocity, activity, and burndown.
9. Change the interface language or theme from the application controls. The preference is persisted to the user account.

## Validation commands

Run these before opening a pull request:

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd audit --audit-level=high
npm.cmd run test:e2e
```

Playwright requires Chromium once per machine:

```powershell
npm.cmd run test:e2e:install
```

The API integration suite expects the `orbit_test` database. The provided test helpers and CI configuration use `postgresql://orbit:orbit@localhost:5432/orbit_test`; see [the detailed setup guide](docs/GETTING_STARTED.md) before running the suite against a new local Docker installation.

## Production deployment with Docker Compose

The production topology includes PostgreSQL, authenticated Redis, one-shot migration and RBAC seed jobs, the non-root API image, and an unprivileged NGINX web image.

```powershell
Copy-Item .env.production.example .env.production
```

Replace every `REQUIRED_...` value, set `APP_URL` to the public HTTPS origin, and then run:

```powershell
docker compose --env-file .env.production config --quiet
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production ps
```

Open the configured `APP_URL`. For a local production check using the example port, use `http://localhost:8080` as `APP_URL`.

The included NGINX container serves HTTP on port `8080`. Terminate TLS at a trusted load balancer or edge reverse proxy, forward the original protocol, and never expose PostgreSQL or Redis ports publicly. Read [the deployment runbook](docs/DEPLOYMENT.md) before operating the application with real data.

## Common problems

### `nvm` is not recognized

`nvm` is a separate version manager. It is not installed by Node.js. Install NVM for Windows and reopen PowerShell, or install Node.js 22 directly. You do not need `nvm` to run Orbit.

### `dependency not ready ... redis`

Redis is not reachable. Start Docker Desktop, run `npm.cmd run db:up`, and confirm `orbit-redis` is healthy. If port `6379` is occupied, stop the conflicting process or change both the Compose mapping and `REDIS_URL`.

### PostgreSQL migration cannot connect

Confirm `orbit-postgres` is healthy and that `DATABASE_URL` uses port `5432`, user `orbit`, password `orbit`, and database `orbit` for local development.

### Port already in use

Orbit uses `4000`, `5173`, `5432`, and `6379` locally. Stop the conflicting service before retrying. Do not run the development and production Compose stacks on the same published web port.

### The web app opens but API actions fail

Confirm the API readiness endpoint is green, the Vite terminal is still running, and `CORS_ORIGINS` exactly contains `http://localhost:5173`. Origins include scheme and port and must not end with a different port.

## Documentation

- [Detailed local setup and database lifecycle](docs/GETTING_STARTED.md)
- [Architecture](docs/architecture.md)
- [API conventions and endpoint map](docs/api.md)
- [Database model and migration policy](docs/DATABASE.md)
- [Production deployment and operations](docs/DEPLOYMENT.md)
- [Safe GitHub publication checklist and project metadata](docs/GITHUB_RELEASE.md)
- [Localization](docs/localization.md)
- [Public site (Next.js)](docs/public-site.md)
- [Azure DevOps pipeline](docs/azure-devops.md)
- [Current-state audit](docs/CURRENT_STATE_AUDIT.md)
- [Security audit](docs/SECURITY_AUDIT.md)
- [Threat model](docs/THREAT_MODEL.md)
- [Roadmap](docs/roadmap.md)
- [Contributing](CONTRIBUTING.md)

## Honest scope

Orbit is suitable as a serious portfolio application and as a self-hosted foundation. The provided Compose topology is tested as a single-host deployment. Socket.IO events and presence can fan out across API instances through Redis, but a multi-host deployment must also replace the local attachment volume with shared object storage and add managed backups, external monitoring, TLS, and an incident-response process.

## License

Released under the [MIT License](LICENSE).
