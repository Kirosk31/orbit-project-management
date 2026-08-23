# Orbit Roadmap

This roadmap separates shipped repository behavior from optional product evolution. Items below are not represented as current features.

## Release-candidate baseline

Completed in the repository:

- Account registration, login, secure sessions, verification/recovery architecture, profile, and preferences
- Multi-tenant organizations, roles, members, invitations, teams, projects, boards, columns, and tasks
- Subtasks, checklists, assignees, labels, comments, reactions, private files, time tracking, activity, and saved filters
- Notifications, authorized Socket.IO rooms, presence, reconnect handling, and Redis multi-instance fan-out
- Tenant-aware global search and bounded organization analytics
- Responsive four-language UI, themes, command palette, accessibility safeguards, and truthful landing content
- Unit/integration/security/browser tests, PostgreSQL/Redis CI, dependency/secret gates, Docker/NGINX, and operator documentation

## Before a public `v1.0.0` tag

- Choose the final repository owner/name and update public links or badges.
- Add sanitized screenshots and optionally a short recorded walkthrough.
- Run the complete release gate on a clean checkout.
- Review the exact staged first commit and full Git history for secrets and private files.
- Enable GitHub private vulnerability reporting and branch protection for all CI jobs.
- Create a signed/tagged release only after the owner reviews release notes.

These steps require repository-owner decisions or external GitHub state and are intentionally not automated by local code changes.

## Near-term product work

- Notification delivery preferences backed by actual email workers/digests
- Custom roles and permission editor with protected owner invariants
- Bulk task operations and import/export
- Richer board keyboard drag-and-drop semantics and alternative accessible move controls
- Calendar and list views using the existing task contracts
- User-facing session inventory and explicit per-device revocation
- Expanded E2E journeys for invitations, recovery, collaboration, files, and role changes

## Scale and operations

- S3-compatible private object storage and malware-scanning/quarantine pipeline
- Background worker and durable queue for mail and expensive asynchronous work
- Managed PostgreSQL/Redis deployment examples and connection-pool/load testing
- OpenTelemetry metrics/traces, hosted error tracking, dashboards, alerts, and SLOs
- Automated encrypted backups plus recurring restore drills
- Rolling deployment and migration compatibility playbook for multiple API replicas

## Product validation

- Test the terminology and workflows with real teams.
- Establish measurable task-completion and collaboration outcomes.
- Validate responsive usability on physical mobile/tablet devices.
- Measure accessible workflows with assistive-technology users in addition to automation.
- Prioritize new features from observed use rather than copying competitors.

## Explicitly out of scope today

Orbit does not claim native mobile apps, billing, public share links, webhooks, third-party integrations, SSO/SAML, compliance certification, multi-region availability, bundled malware scanning, or a hosted SaaS service. Adding any of these requires new design, threat modeling, tests, and documentation.
