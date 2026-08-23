# Changelog

All notable changes to Orbit are documented here. The project follows semantic versioning once its first public release is tagged.

## Unreleased

### Added

- Multi-tenant organizations, teams, invitations, projects, boards, tasks, comments, notifications, search, and analytics
- Rotating sessions, email verification architecture, password recovery, granular RBAC, CSRF, rate limits, private uploads, and audit logging
- Subtasks, multiple checklists, task labels, assignees, attachments, saved filters, time tracking, and activity history
- Authorized Socket.IO rooms, distributed presence, Redis cross-instance fan-out, and client cache reconciliation
- English, Spanish, French, and Brazilian Portuguese account-persisted localization
- Playwright owner workflow, responsive public checks, and Axe accessibility gates
- Production API and unprivileged NGINX images, migration/seed jobs, internal data network, and health checks
- GitHub Actions quality, browser, container, dependency, and secret-scanning gates
- Installation, database, deployment, architecture, security, and contribution documentation

### Changed

- Replaced unverifiable landing-page metrics, testimonials, integrations, pricing, and roadmap labels with truthful product behavior
- Hardened token consumption, proxy trust, tenant-scoped queries, task lookups, invitation delivery, uploads, and structured logging
- Updated the repository to Node `22.22.0`, Prisma 7, strict TypeScript, and a zero-known-vulnerability dependency baseline

### Security

- Added cross-tenant IDOR/BOLA, forged/expired/revoked token, upload, CSRF/CORS, rate-limit, realtime-room, and pagination abuse coverage
- Added content-signature validation and private authorized retrieval for avatars and task attachments
- Added durable audit events for sensitive authentication, organization, project, and task operations
