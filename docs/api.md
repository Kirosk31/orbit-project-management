# Orbit API

## Base URLs

- Development API: `http://localhost:4000/api/v1`
- Development Swagger UI: `http://localhost:4000/docs`
- Development OpenAPI JSON: `http://localhost:4000/docs.json`
- Production: same-origin `/api/v1` through NGINX

Swagger is enabled by default only in development and can be controlled with `EXPOSE_API_DOCS`. It is disabled in the production Compose environment.

## Conventions

- JSON request and response bodies use UTF-8.
- Successful responses use `{ "data": ..., "requestId": "..." }`.
- Collection responses include bounded pagination metadata where applicable.
- Errors use a safe stable code, message, request ID, and optional validation details; production responses omit stack traces and infrastructure details.
- UUID parameters, queries, and bodies are validated before controllers execute.
- Unknown input fields are rejected by strict schemas where accepting them could enable mass assignment.
- The default JSON request limit is 1 MB. Task attachments are capped at 10 MB; avatars are capped at 2 MB.

## Authentication and CSRF

Obtain a CSRF token with `GET /auth/csrf`. State-changing browser requests must come from an allowed origin and send the returned token according to the web client's double-submit contract.

Protected endpoints require:

```http
Authorization: Bearer <short-lived-access-token>
```

The refresh credential is not placed in browser storage or JavaScript-visible JSON. It is sent as an `HttpOnly` cookie scoped to `/api/v1/auth`. The frontend API client performs one coordinated refresh and retries the original request when appropriate.

## Endpoint map

All paths below are relative to `/api/v1`.

### Authentication

| Method | Path                        | Purpose                                               |
| ------ | --------------------------- | ----------------------------------------------------- |
| `GET`  | `/auth/csrf`                | Issue CSRF token material                             |
| `POST` | `/auth/register`            | Register and create a session                         |
| `POST` | `/auth/login`               | Authenticate and create a session                     |
| `POST` | `/auth/refresh`             | Rotate refresh token and issue access token           |
| `POST` | `/auth/logout`              | Revoke current session                                |
| `POST` | `/auth/logout-all`          | Revoke all other sessions                             |
| `GET`  | `/auth/me`                  | Return authenticated user                             |
| `POST` | `/auth/verify-email`        | Consume single-use verification token                 |
| `POST` | `/auth/resend-verification` | Request another verification message                  |
| `POST` | `/auth/forgot-password`     | Request recovery without account enumeration          |
| `POST` | `/auth/reset-password`      | Consume reset token, change password, revoke sessions |

### Users

| Method           | Path                            | Purpose                                                    |
| ---------------- | ------------------------------- | ---------------------------------------------------------- |
| `PATCH`          | `/users/me`                     | Update profile                                             |
| `POST`, `DELETE` | `/users/me/avatar`              | Replace or remove private avatar                           |
| `GET`            | `/users/:userId/avatar`         | Authorized avatar retrieval                                |
| `GET`, `PATCH`   | `/users/me/preferences`         | Read or update theme, locale, and notification preferences |
| `GET`            | `/users/search?q=...&orgId=...` | Search users inside a caller-owned organization            |

### Organizations, roles, teams, and invitations

| Method                   | Path                                                    | Purpose                                 |
| ------------------------ | ------------------------------------------------------- | --------------------------------------- |
| `GET`, `POST`            | `/organizations`                                        | List memberships or create organization |
| `GET`, `PATCH`, `DELETE` | `/organizations/:slug`                                  | Read, update, or soft-delete tenant     |
| `GET`                    | `/organizations/:slug/roles`                            | List tenant role choices                |
| `GET`                    | `/organizations/:slug/members`                          | List members                            |
| `PATCH`, `DELETE`        | `/organizations/:slug/members/:userId`                  | Change role or remove member            |
| `GET`, `POST`            | `/organizations/:slug/teams`                            | List or create teams                    |
| `PATCH`, `DELETE`        | `/organizations/:slug/teams/:teamId`                    | Update or delete team                   |
| `GET`, `POST`            | `/organizations/:slug/teams/:teamId/members`            | List or add team members                |
| `DELETE`                 | `/organizations/:slug/teams/:teamId/members/:userId`    | Remove team member                      |
| `GET`, `POST`            | `/organizations/:slug/invitations`                      | List or issue invitations               |
| `POST`                   | `/organizations/:slug/invitations/:invitationId/revoke` | Revoke pending invitation               |
| `POST`                   | `/organizations/invitations/accept`                     | Consume invitation token                |

### Projects and boards

| Method                   | Path                                               | Purpose                          |
| ------------------------ | -------------------------------------------------- | -------------------------------- |
| `GET`, `POST`            | `/organizations/:slug/projects`                    | List or create projects          |
| `GET`, `PATCH`, `DELETE` | `/projects/:id`                                    | Read, update, or delete project  |
| `POST`                   | `/projects/:id/archive`, `/projects/:id/unarchive` | Change archival state            |
| `POST`, `DELETE`         | `/projects/:id/favorite`                           | Manage personal favorite         |
| `GET`, `POST`            | `/projects/:id/members`                            | List or add project members      |
| `DELETE`                 | `/projects/:id/members/:userId`                    | Remove project member            |
| `GET`                    | `/projects/:id/activity`                           | Project activity stream          |
| `GET`, `POST`            | `/projects/:id/boards`                             | List or create boards            |
| `GET`, `PATCH`, `DELETE` | `/boards/:id`                                      | Read, update, or delete board    |
| `POST`                   | `/boards/:id/archive`, `/boards/:id/unarchive`     | Change board archival state      |
| `GET`, `POST`            | `/boards/:id/columns`                              | List or create columns           |
| `PATCH`, `DELETE`        | `/columns/:columnId`                               | Update or delete column          |
| `POST`                   | `/columns/:columnId/move`                          | Reorder a column transactionally |

### Tasks and task resources

| Method                   | Path                                         | Purpose                                        |
| ------------------------ | -------------------------------------------- | ---------------------------------------------- |
| `GET`, `POST`            | `/projects/:id/tasks`                        | Filter/list or create project tasks            |
| `GET`                    | `/boards/:id/tasks`                          | Filter/list board tasks with exact board scope |
| `GET`, `PATCH`, `DELETE` | `/tasks/:id`                                 | Read, update, or delete task                   |
| `POST`                   | `/tasks/:id/archive`, `/tasks/:id/unarchive` | Change task archival state                     |
| `POST`                   | `/tasks/:id/move`                            | Validate and update Kanban order/status        |
| `GET`, `POST`            | `/tasks/:id/subtasks`                        | List or create subtasks                        |
| `POST`, `DELETE`         | `/tasks/:id/assignees/:userId`               | Add or remove assignee                         |
| `POST`, `DELETE`         | `/tasks/:id/labels/:labelId`                 | Attach or detach label                         |
| `GET`                    | `/tasks/:id/activity`                        | Task activity stream                           |
| `GET`, `POST`            | `/organizations/:slug/labels`                | List or create organization labels             |
| `PATCH`, `DELETE`        | `/labels/:id`                                | Update or delete tenant label                  |

### Checklists, time, files, and saved filters

| Method            | Path                                                    | Purpose                            |
| ----------------- | ------------------------------------------------------- | ---------------------------------- |
| `GET`, `POST`     | `/tasks/:id/checklists`                                 | List or create checklists          |
| `PATCH`, `DELETE` | `/tasks/:id/checklists/:checklistId`                    | Update or remove checklist         |
| `POST`            | `/tasks/:id/checklists/:checklistId/items`              | Create item                        |
| `PATCH`, `DELETE` | `/tasks/:id/checklists/:checklistId/items/:itemId`      | Update or remove item              |
| `POST`            | `/tasks/:id/checklists/:checklistId/items/:itemId/move` | Reorder item                       |
| `GET`, `POST`     | `/tasks/:id/time-entries`                               | List or manually log time          |
| `PATCH`, `DELETE` | `/tasks/:id/time-entries/:timeEntryId`                  | Update or remove time entry        |
| `POST`            | `/tasks/:id/timer/start`, `/tasks/:id/timer/stop`       | Control concurrency-safe timer     |
| `GET`, `POST`     | `/tasks/:id/attachments`                                | List or upload private attachments |
| `GET`             | `/tasks/:id/attachments/:attachmentId/download`         | Authorized download                |
| `DELETE`          | `/tasks/:id/attachments/:attachmentId`                  | Remove attachment and stored bytes |
| `GET`, `POST`     | `/boards/:id/saved-filters`                             | List or create personal filters    |
| `PATCH`, `DELETE` | `/boards/:id/saved-filters/:filterId`                   | Update or remove owned filter      |

### Comments and notifications

| Method            | Path                          | Purpose                                 |
| ----------------- | ----------------------------- | --------------------------------------- |
| `GET`, `POST`     | `/tasks/:id/comments`         | Paginated comments or new comment/reply |
| `PATCH`, `DELETE` | `/comments/:id`               | Update own comment or moderate deletion |
| `POST`            | `/comments/:id/reactions`     | Toggle an allowed reaction              |
| `GET`             | `/notifications`              | Paginated personal notification list    |
| `GET`             | `/notifications/unread-count` | Personal unread total                   |
| `PATCH`           | `/notifications/:id/read`     | Mark owned notification read            |
| `POST`            | `/notifications/read-all`     | Mark all personal notifications read    |

### Search, analytics, and health

| Method | Path                                     | Purpose                                                         |
| ------ | ---------------------------------------- | --------------------------------------------------------------- |
| `GET`  | `/search?q=...`                          | Tenant-aware global search with type/org filters and pagination |
| `GET`  | `/organizations/:slug/analytics?days=30` | Permission-scoped 7–90 day delivery analytics                   |
| `GET`  | `/health` and `/health/ready`            | API probes, also available outside `/api/v1`                    |

## Realtime protocol

Socket.IO uses path `/socket.io`. The client sends an access token in `handshake.auth.token`. Missing, invalid, expired, modified, or wrongly signed tokens are rejected.

Client-to-server events:

| Event         | Payload               | Result                                          |
| ------------- | --------------------- | ----------------------------------------------- |
| `subscribe`   | `{ projectId: UUID }` | Authorization check, room join, online user IDs |
| `unsubscribe` | `{ projectId: UUID }` | Room leave                                      |

Both events are rate-limited, strictly validated, and bounded to 100 project subscriptions per socket. A client cannot submit an arbitrary room name.

Server events include `task.created`, `task.updated`, `task.deleted`, `task.moved`, `board.updated`, `comment.created`, `comment.updated`, `comment.deleted`, `notification.created`, and `presence.updated`. Shared payload contracts are in `packages/shared/src/realtime.ts`. Redis carries events across API instances.

## Rate limits

Rate-limit values are environment-controlled. Separate buckets exist for global API traffic, login, registration, refresh, recovery, token consumption, invitations, uploads, search, and analytics. Sensitive application buckets can key on the authenticated user rather than only an IP. Exceeding a limit returns HTTP `429` without revealing account existence.

## Authorization behavior

Resources outside the caller's tenant are generally returned as not found to reduce enumeration. Each sensitive operation checks the specific permission after membership has been resolved. IDs supplied by the client are never treated as proof of ownership or role.
