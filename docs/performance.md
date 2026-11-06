# Performance

Orbit went through a 31-point performance checklist covering the database, the API, the web bundle, the UI, the edge server and the tests. This page records where each point stands and where it lives in the code, so the next change can start from here instead of re-auditing.

Status:

- **Done**: implemented and covered by tests.
- **Not applicable**: Orbit has nothing for the point to act on.
- **Deployment decision**: the code is ready; whether to do it depends on how Orbit is hosted.

## Summary

| #   | Improvement                                    | Status              | Where                                                                                                                           |
| --- | ---------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Trigram indexes for search                     | Done                | `apps/api/prisma/migrations/20261106202832_restore_search_and_hot_path_indexes`, `schema.prisma` (`*_trgm_idx`)                 |
| 2   | Indexes on the hot query paths                 | Done                | Same migration: board cards, "my tasks", activity and notifications                                                             |
| 3   | Load every page of a board                     | Done                | `listAllBoardTasksRequest` in `apps/web/src/features/tasks/task-api.ts`                                                         |
| 4   | Stop duplicate fetches                         | Done                | `apps/web/src/lib/query-client.ts`, `features/realtime/use-project-realtime.ts`, `features/users/secure-avatar-image.tsx`       |
| 5   | Time limits on SMTP and API requests           | Done                | `apps/api/src/shared/mail/mail.ts`, `apps/web/src/lib/api.ts`                                                                   |
| 6   | Optimistic card moves                          | Done                | `moveTaskInList` in `apps/web/src/lib/optimistic.ts`, used by `pages/app/board-detail-page.tsx`                                 |
| 7   | Optimistic task completion                     | Done                | `setTaskCompletion` in `lib/optimistic.ts`, used by `pages/app/task-detail-page.tsx`                                            |
| 8   | Optimistic checklist items                     | Done                | `toggleChecklistItem` in `lib/optimistic.ts`, used by `features/tasks/task-checklists.tsx`                                      |
| 9   | Reorder with a single UPDATE                   | Done                | `apps/api/src/shared/database/reorder.ts`                                                                                       |
| 10  | Validate members and labels in one query       | Done                | `organizations.repository.ts`, `tasks.repository.ts` (`countOrgLabels`), `comments.service.ts`                                  |
| 11  | Lazy-load the command palette and charts       | Done                | `features/command-palette/command-palette-host.tsx`, `pages/app/dashboard-page.tsx`                                             |
| 12  | Preload only what each route imports           | Done                | `apps/web/vite.config.ts` (`manualChunks` keeps only React, i18n and data vendors)                                              |
| 13  | Tree-shakable shared package                   | Done                | `"sideEffects": false` in `packages/shared/package.json`                                                                        |
| 14  | Cache analytics                                | Done                | `apps/api/src/modules/analytics/analytics.service.ts` (Redis, 60 s)                                                             |
| 15  | Smaller avatars                                | Done                | `apps/api/src/modules/users/users.service.ts` (256 px WebP)                                                                     |
| 16  | Leave descriptions out of task lists           | Done                | `TASK_CARD_SELECT` in `apps/api/src/modules/tasks/tasks.repository.ts`, `TaskListItemDto` in `packages/shared`                  |
| 17  | Compression headers and precompressed assets   | Done                | `deploy/nginx.conf` (`gzip_vary`, `gzip_proxied any`, `gzip_static`), `.gz` step in `apps/web/Dockerfile`                       |
| 18  | Keep-alive connections to the API              | Done                | `upstream api` with `keepalive 32` in `deploy/nginx.conf`                                                                       |
| 19  | Memoize the board                              | Done                | `features/boards/board-column.tsx`, `board-task-card.tsx`, `group-tasks.ts`; `useMemo`/`useCallback` in `board-detail-page.tsx` |
| 20  | Zustand selectors instead of whole-store reads | Done                | `features/theme/theme-toggle.tsx`, `features/workspace/use-active-workspace.ts`                                                 |
| 21  | Real-user monitoring (Core Web Vitals)         | Done                | `apps/web/src/lib/rum.ts`, `packages/shared/src/schemas/rum.schemas.ts`, `apps/api/src/modules/rum/rum.routes.ts`               |
| 22  | Log slow requests                              | Done                | `apps/api/src/core/logger/http-logger.ts` (warn above 500 ms)                                                                   |
| 23  | Configurable database pool                     | Done                | `DATABASE_POOL_MAX` in `apps/api/src/config/env.ts` and `shared/database/prisma.ts`                                             |
| 24  | Preload the main font                          | Done                | `apps/web/index.html`                                                                                                           |
| 25  | Test on a phone viewport                       | Done                | `mobile-chromium` project in `playwright.config.ts`                                                                             |
| 26  | Test on a slow network                         | Done                | `e2e/slow-network.spec.ts`                                                                                                      |
| 27  | Stream AI responses                            | Not applicable      | Orbit has no AI features                                                                                                        |
| 28  | Defer or remove third-party scripts            | Not applicable      | The app loads no third-party scripts; its CSP is `script-src 'self'`                                                            |
| 29  | Lazy-load `<img>`                              | Not applicable      | The app has no content images below the fold; avatars are small and fetched per user through `secure-avatar-image.tsx`          |
| 30  | Serve static assets from a CDN                 | Deployment decision | See [CDN](#cdn)                                                                                                                 |
| 31  | Run several API instances                      | Deployment decision | See [Several API instances](#several-api-instances)                                                                             |

## Details

### Database

**1–2. Indexes.** Search uses `ILIKE '%term%'`, which a B-tree cannot serve, so task titles, project names and comment bodies carry `gin_trgm_ops` indexes. The hot paths have composite indexes that match their filters and sort order: board cards (`boardId, columnId, position`), "my tasks" (`orgId, isCompleted, isArchived, dueDate`), activity (`entityType, entityId, createdAt`) and notifications (`userId, createdAt`).

**9. Reordering.** Moving a task, column or checklist item rewrote each sibling with its own UPDATE. `writePositions` now sends one `UPDATE ... FROM unnest()`.

**10. Validation.** Assignee, mention and label checks count all ids in one query instead of looking each one up.

**16. List payloads.** Board, project and "my tasks" lists select only the columns a card shows. Descriptions can be up to 10,000 characters each and no list shows them. `TaskListItemDto` makes `description` optional; `TaskDto` (single task, realtime events) still includes it.

**23. Pool size.** `DATABASE_POOL_MAX` (default 10, range 1–100) is the number of Postgres connections each API or worker process may hold. With several processes, keep `(API + worker processes) × DATABASE_POOL_MAX` below Postgres `max_connections` (100 by default).

### API

**5. Time limits.** SMTP connections, greetings and sockets time out instead of holding a worker, and web requests to the API abort after a fixed time.

**14. Analytics cache.** The analytics endpoint aggregates a whole organization; results are cached in Redis for 60 seconds per organization and range.

**15. Avatars.** Uploads are re-encoded as 256 px WebP (they display at 20–80 px). Older JPEG and PNG keys are still served.

**22. Slow requests.** pino-http logs any request over 500 ms at `warn`, with its `responseTime`. Filter for `level >= 40` to find them.

### Web

**3. Whole boards.** The API pages at 100. The board loads the first page, then all remaining pages in parallel. Before this, cards past the first page did not appear.

**4. Duplicate fetches.** Focus refetches respect `staleTime`, board, project and task queries no longer wait on their parent, avatars are cached per user, the notification list loads only when opened, and realtime echoes do not restart a refetch that is already running.

**6–8. Optimistic updates.** Moving a card, completing a task and ticking a checklist item update the cache at once and roll back on error. The helpers are pure functions with unit tests (`lib/optimistic.test.ts`).

**11–13. First load.** The command palette and the dashboard charts load on demand. Only React, i18n and the data libraries are split into always-preloaded vendor chunks; Radix, forms and framer-motion load with the routes that use them. `@orbit/shared` is marked side-effect free so unused schemas are dropped. First-load JavaScript went from 898 KB to 671 KB (284 to 213 KB gzipped).

**19–20. Board rendering.** Columns and cards are memoized components with stable callbacks, and tasks are grouped by column only when the task list changes. Typing in a dialog or a realtime update to one card no longer re-renders the whole board. Stores are read through selectors, so a component re-renders only when the field it uses changes.

**24. Font.** `index.html` preloads the Latin subset of Archivo. The build rewrites the link to the same hashed file the CSS uses, so it downloads once. A unit test fails if npm hoisting moves the file.

### Edge (nginx)

**17. Compression.** `gzip_vary on` sends `Vary: Accept-Encoding` so caches keep compressed and plain copies apart. `gzip_proxied any` compresses API responses even behind another proxy. `gzip_static on` serves the `.gz` files the image build writes next to each asset, so nginx no longer compresses them on every request.

**18. Keep-alive.** The API is an `upstream` with a pool of 32 idle connections. `proxy_http_version 1.1` and an empty `Connection` header let nginx reuse them instead of opening a TCP connection per request. Socket.IO keeps its own `Upgrade` headers.

### Monitoring

**21. Real-user monitoring.** In production builds the web app loads `web-vitals` in a separate chunk after the first render and records LCP, INP and CLS. When the page is hidden it sends the latest values with `navigator.sendBeacon` to `POST /api/v1/rum`, which logs them as `web vitals` lines.

A report has the screen the visit landed on, reduced to a route template (`/app/boards/:id`; unknown paths become `/*`, query strings are dropped), and each metric's name, value, rating and navigation type. It has no ids, user, session, IP or user agent. The request body is validated against a strict Zod schema, capped at 4 KB, and rate-limited per IP (`RATE_LIMIT_RUM_MAX`, default 60 per minute).

`sendBeacon` cannot set headers, so this one route is mounted ahead of the CSRF check. It reads no cookie and changes no state, and every other route still requires the CSRF token (covered by `apps/api/tests/rum.integration.test.ts`).

### Tests

**25. Mobile.** The `mobile-chromium` project (Pixel 7) runs the accessibility suite and the full owner workflow: register, create a workspace, project, board, column and task. On a phone the test opens the navigation menu, as a phone user would.

**26. Slow network.** `e2e/slow-network.spec.ts` uses CDP `Network.emulateNetworkConditions` with Chrome DevTools' "Slow 4G" profile (562.5 ms RTT, about 1.4 Mbps down). It checks that the landing page renders, the lazily loaded login route opens and its form responds. The time to the landing heading is recorded as a test annotation.

## Not applicable

**27. Streaming AI responses.** Orbit makes no model calls, so there is nothing to stream.

**28. Third-party scripts.** The app loads no analytics, chat or tag-manager scripts. The CSP (`deploy/security-headers.conf`) only allows `script-src 'self'`, and this checklist does not change that.

**29. Lazy-loading `<img>`.** The app has no below-the-fold content images to defer. Avatars are a few kilobytes, appear in the visible part of lists, and are fetched with the user's credentials and cached per user.

## Deployment decisions

### CDN

The web image already serves `/assets/*` with `Cache-Control: public, max-age=31536000, immutable` and content-hashed names, and the HTML with `no-cache`. A CDN in front of the `web` service can cache `/assets/` as-is. Keep `/api/` and `/socket.io/` uncached. If the CDN compresses, it should honor the `Vary: Accept-Encoding` header nginx now sends. A CDN helps most when users are far from the server; for one region it is optional.

### Several API instances

The API can run as more than one container:

- Rate limits, the analytics cache and Socket.IO events go through Redis, so they are shared across instances.
- Sessions are JWTs and refresh tokens stored in Postgres, so any instance can serve any request.
- The email outbox claims events with `FOR UPDATE SKIP LOCKED`, so several workers can run at once.
- Uploads are written to the `orbit_uploads` volume. Every instance needs the same volume, or storage should move to an object store first.

Before scaling out, size `DATABASE_POOL_MAX` against Postgres `max_connections` (see item 23), and put the instances behind the `api` upstream in `deploy/nginx.conf`. The web client connects to Socket.IO with the WebSocket transport only (`features/realtime/realtime-client.ts`), so no sticky sessions are needed.

## Checking performance in production

- **Slow endpoints:** API log lines at `warn` with `responseTime` over 500.
- **Real-user metrics:** API log lines with `msg: "web vitals"`, grouped by `route` and `metrics[].name`. Google's "good" thresholds are LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1.
- **Bundle size:** `npm run build -w @orbit/web` prints each chunk with its gzipped size.
