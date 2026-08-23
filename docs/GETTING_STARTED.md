# Getting Started

This guide creates a complete Orbit development environment on Windows without relying on globally installed PostgreSQL or Redis services.

## 1. Install system prerequisites

Install these tools once on the computer:

1. Git for Windows.
2. Docker Desktop with the WSL 2 backend enabled.
3. Node.js `22.22.0` and npm `10` or newer.

Node.js belongs in the operating system, not inside the Orbit repository. The official Windows installer normally chooses `C:\Program Files\nodejs` and adds that directory to `PATH`.

NVM for Windows is optional. The command `nvm install 22.22.0` works only after NVM for Windows has been installed separately. If `nvm` is not recognized, install Node directly or install NVM and reopen every terminal.

Verify the installation in a new PowerShell window:

```powershell
node --version
npm.cmd --version
git --version
docker --version
docker compose version
```

Expected Node output is `v22.22.0`. A newer compatible Node 22 patch release is acceptable. The repository deliberately rejects older releases because its dependency set is tested against the pinned toolchain.

## 2. Open the repository

```powershell
Set-Location 'C:\path\to\Proyecto1github'
```

Confirm that `package.json`, `apps`, `packages`, and `docker-compose.dev.yml` are visible:

```powershell
Get-ChildItem
```

## 3. Install JavaScript dependencies

```powershell
npm.cmd ci
```

`npm ci` uses the exact versions in `package-lock.json`. If PowerShell reports that script execution is disabled for `npm.ps1`, continue to use `npm.cmd`; changing the system execution policy is not required.

## 4. Configure the API

Create the ignored local file from the public template:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Generate a signing secret:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Paste the generated value after `JWT_ACCESS_SECRET=` in `apps/api/.env`. Do not paste it into an issue, screenshot, commit, README, chat, or CI file.

The development values should resolve to:

| Variable          | Development value                                             | Purpose                                  |
| ----------------- | ------------------------------------------------------------- | ---------------------------------------- |
| `NODE_ENV`        | `development`                                                 | Development error behavior and cookies   |
| `PORT`            | `4000`                                                        | API and Socket.IO listener               |
| `DATABASE_URL`    | `postgresql://orbit:orbit@localhost:5432/orbit?schema=public` | Main development database                |
| `REDIS_URL`       | `redis://localhost:6379`                                      | Cache, rate limits, and realtime adapter |
| `CORS_ORIGINS`    | `http://localhost:5173`                                       | Exact trusted browser origin             |
| `WEB_APP_URL`     | `http://localhost:5173`                                       | Links generated for email flows          |
| `UPLOAD_DIR`      | `./data/uploads`                                              | Private local file storage               |
| `EXPOSE_API_DOCS` | `true`                                                        | Swagger UI in development only           |

SMTP is optional locally. When `SMTP_HOST` is blank, the mail abstraction logs safe delivery information instead of contacting a mail server. Tokens and passwords are never logged.

The web application already defaults to same-origin `/api/v1`. Its Vite server proxies API and Socket.IO requests to port `4000`, so no client-side secret is needed.

## 5. Start data services

Start Docker Desktop and wait until its engine reports ready. Then run:

```powershell
npm.cmd run db:up
docker compose -f docker-compose.dev.yml ps
```

The first startup creates two named volumes and two databases:

- `orbit` for normal development
- `orbit_test` for integration and Playwright tests

Wait for both services to become healthy. Follow startup logs when needed:

```powershell
npm.cmd run db:logs
```

Press `Ctrl+C` to stop following logs; this does not stop the containers.

If an older PostgreSQL volume existed before the test-database initializer was added, create the missing database once:

```powershell
docker exec orbit-postgres createdb -U orbit orbit_test
```

An `already exists` response is harmless and means no action is needed.

## 6. Apply schema and reference data

Generate the client that matches the checked-in Prisma schema:

```powershell
npm.cmd run prisma:generate --workspace=@orbit/api
```

Apply all existing migrations to the main database:

```powershell
npm.cmd run prisma:deploy --workspace=@orbit/api
```

Create or update the permission and system-role catalog:

```powershell
npm.cmd run db:seed --workspace=@orbit/api
```

These operations are repeatable. `prisma:deploy` applies only migrations that have not run; the seed uses upserts/reference-safe inserts.

Use `prisma:migrate` only while intentionally authoring a new schema migration. Do not edit a migration that has already been shared or deployed.

## 7. Start Orbit

Open two terminals in the same repository.

API terminal:

```powershell
npm.cmd run dev:api
```

Web terminal:

```powershell
npm.cmd run dev:web
```

Expected endpoints:

| Service   | URL                                  | Expected result                    |
| --------- | ------------------------------------ | ---------------------------------- |
| Web       | `http://localhost:5173`              | Orbit landing page                 |
| Liveness  | `http://localhost:4000/health`       | HTTP 200 and `status: ok`          |
| Readiness | `http://localhost:4000/health/ready` | Database and Redis checks are `ok` |
| Swagger   | `http://localhost:4000/docs`         | Development API documentation      |

The API intentionally retries PostgreSQL and Redis during startup. Repeated `dependency not ready` messages followed by a fatal error mean the dependency remained unreachable for all attempts; they are not a Node installation problem.

## 8. Create and use the first workspace

1. Select **Create account** and register with a private password.
2. Create an organization from **Organizations**. The creator becomes its owner.
3. Create teams or invite members from the organization detail page.
4. Create a project, give it a short project key, and optionally add project members or teams.
5. Create a board and ordered columns.
6. Create a task and open it to manage all task resources.
7. Use the dashboard organization selector to load tenant-scoped analytics.
8. Press the command-palette shortcut shown in the interface to search authorized resources.
9. Change language between English, Spanish, French, and Brazilian Portuguese. Reload to confirm persistence.

Invitation, verification, and recovery URLs are sent through the mail abstraction. Configure SMTP to test real delivery; do not expect tokens to be returned by production API responses.

## 9. Run the test suite

Apply migrations to the test database before its first run:

```powershell
$env:DATABASE_URL='postgresql://orbit:orbit@localhost:5432/orbit_test?schema=public'
npm.cmd run prisma:deploy --workspace=@orbit/api
Remove-Item Env:DATABASE_URL
```

The integration helpers use that same test URL and clean their own records.

Run repository gates:

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd audit --audit-level=high
```

Install Playwright Chromium once, then run browser tests:

```powershell
npm.cmd run test:e2e:install
npm.cmd run test:e2e
```

The critical browser journey registers a unique owner, creates a workspace, project, board, column, and task, then runs Axe on the authenticated task page. Public tests also validate keyboard focus, serious/critical Axe findings, responsive execution, and a live language change.

## 10. Stop or reset local services

Stop PostgreSQL and Redis without deleting data:

```powershell
npm.cmd run db:down
```

Start them later with `npm.cmd run db:up`; named-volume data remains.

The following command permanently deletes the development PostgreSQL and Redis volumes. Use it only when you intentionally want an empty local database and have no data to preserve:

```powershell
docker compose -f docker-compose.dev.yml down --volumes
```

After a reset, repeat sections 5 and 6.

## Troubleshooting matrix

| Symptom                                  | Cause                                                                   | Resolution                                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `nvm` is not recognized                  | NVM for Windows is not installed or its terminal is stale               | Install NVM separately or install Node 22 directly; reopen PowerShell                          |
| `npm.ps1 cannot be loaded`               | PowerShell execution policy blocks the wrapper                          | Run `npm.cmd` commands                                                                         |
| `dependency not ready: redis`            | Docker is stopped, Redis is unhealthy, or the URL/port is wrong         | Start Docker, inspect `docker compose ... ps`, verify `REDIS_URL`                              |
| `dependency not ready: database`         | PostgreSQL is unhealthy or `DATABASE_URL` is wrong                      | Verify the container and connection string                                                     |
| Prisma client error after schema pull    | Generated client is stale                                               | Run `prisma:generate` again                                                                    |
| Tests are skipped                        | `orbit_test` is missing or unreachable                                  | Create it and deploy migrations as described in section 9                                      |
| HTTP 403 on a state-changing request     | Origin/CSRF validation rejected the request                             | Use the Vite origin and exact `CORS_ORIGINS`; do not call cookie endpoints from another origin |
| HTTP 401 after an idle period            | The access token expired and refresh failed or was revoked              | Sign in again; inspect API logs by request ID if unexpected                                    |
| Upload rejected                          | File exceeds the limit or content does not match its declared MIME type | Use a supported, valid file within the UI limit                                                |
| Browser page works but realtime does not | API/Socket.IO proxy or Redis is unavailable                             | Verify `/socket.io`, Redis readiness, and both dev terminals                                   |
