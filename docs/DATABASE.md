# Database Architecture

Orbit uses PostgreSQL 16 through Prisma 7. PostgreSQL is the source of truth; Redis is used for cache, rate limits, and realtime fan-out, not as authoritative business storage.

## Domain groups

| Domain             | Models                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Identity           | `User`, `UserPreference`, `Session`, `RefreshToken`, `EmailVerificationToken`, `PasswordResetToken`           |
| Tenancy and RBAC   | `Organization`, `OrganizationMember`, `Role`, `Permission`, `RolePermission`, `Invitation`                    |
| Teams and projects | `Team`, `TeamMember`, `Project`, `ProjectFavorite`, `ProjectMember`, `ProjectTeam`                            |
| Planning           | `Board`, `SavedFilter`, `TaskStatus`, `Column`, `Task`                                                        |
| Task resources     | `TaskAssignee`, `Label`, `TaskLabel`, `Checklist`, `ChecklistItem`, `Attachment`, `TaskActivity`, `TimeEntry` |
| Collaboration      | `Comment`, `CommentReaction`, `CommentMention`, `Notification`, `ActivityLog`, `AuditLog`                     |
| Commercial         | `BillingPlan`, `Subscription`                                                                                 |
| Operations         | `OutboxEvent`                                                                                                 |

The detailed relationship diagram is in [er-diagram.md](er-diagram.md).

## Tenant boundaries

`Organization` is the tenant root. Projects belong to organizations; boards belong to projects; columns, statuses, tasks, comments, labels, attachments, and task resources are reached through that chain. API repositories never authorize a resource using an unscoped identifier alone. Middleware resolves membership and permission at the organization or project boundary before the operation proceeds.

Search uses one parameterized bounded query, but every union branch includes its own membership predicate. Analytics starts with an organization permission check and all aggregates remain constrained to that organization.

## Integrity and concurrency

- UUID primary keys prevent predictable sequential identifiers.
- Foreign keys define ownership and deletion behavior.
- Composite unique constraints prevent duplicate memberships, assignments, labels, reactions, and favorites.
- Ordering and lookup columns are indexed for common organization, project, board, status, assignee, notification, and activity queries.
- Refresh, verification, and recovery token consumption is atomic so a token cannot succeed twice under concurrent requests.
- Time tracking uses row locks and transactional checks to allow at most one running timer per user.
- Multi-step domain mutations use Prisma transactions where partial completion would violate an invariant.
- Verification, password-recovery, and invitation records commit with an encrypted outbox event; workers use `FOR UPDATE SKIP LOCKED` leases for safe horizontal processing.
- Audit records preserve the actor identifier even if the user is later deleted.

## Migration policy

Migration files under `apps/api/prisma/migrations` are append-only deployment history.

For normal setup and deployment:

```powershell
npm.cmd run prisma:generate --workspace=@orbit/api
npm.cmd run prisma:deploy --workspace=@orbit/api
```

For an intentional schema change during development:

```powershell
npm.cmd run prisma:migrate --workspace=@orbit/api -- --name descriptive_change_name
```

Review the generated SQL before accepting it. Never edit or delete a migration that may have run outside a disposable local database. Destructive type changes require a documented expand/migrate/contract strategy and a tested backup restore.

## Seed behavior

`apps/api/prisma/seed.ts` always upserts the permission catalog and five system roles. Sample workspace data is opt-in through `SEED_SAMPLE_DATA=true` and requires a private email, name, and password of at least 12 characters. There is no built-in public demo password.

Production Compose runs the safe RBAC seed after migrations and before the API starts.

## Backups

For Compose deployments, back up PostgreSQL independently of Docker volumes. A logical backup example is:

```bash
docker compose --env-file .env.production exec -T postgres \
  pg_dump --format=custom --no-owner --username="$POSTGRES_USER" "$POSTGRES_DB" \
  > orbit.backup
```

Do not treat that command as a complete backup plan: private uploads must be backed up with the database, retention must be defined, backup files must be encrypted, and restore drills must be performed. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Performance policy

- Every collection endpoint has bounded pagination or a bounded domain-specific result.
- Search page size is capped at 20.
- Analytics windows are limited to 7–90 days and use aggregate SQL instead of N+1 reads.
- Task lists support indexed filters rather than arbitrary user-controlled SQL or sort expressions.
- New queries must be inspected with representative tenant sizes and `EXPLAIN (ANALYZE, BUFFERS)` before production-scale claims are made.

## Development databases

`docker-compose.dev.yml` initializes both `orbit` and `orbit_test`. Tests must never target a production database. The integration suite truncates test data and is intentionally unsafe for a database containing valuable records.
