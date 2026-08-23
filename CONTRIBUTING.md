# Contributing to Orbit

Thank you for improving Orbit. Contributions should preserve tenant isolation, strict shared contracts, accessibility, and the existing modular architecture.

## Before starting

1. Read [the architecture](docs/architecture.md), [security policy](SECURITY.md), and [threat model](docs/THREAT_MODEL.md).
2. Search existing issues and code before introducing a parallel implementation.
3. For a large behavior or schema change, open a design discussion first.
4. Never include a real secret, private user record, production log, or proprietary asset.

## Development setup

Follow [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md). Use Node `22.22.0`, `npm ci`, the development Compose services, and the checked-in migrations.

## Architecture expectations

- Put API behavior in the relevant feature module and keep controllers transport-focused.
- Keep data access behind repositories and business rules in services.
- Enforce authorization and tenant ownership in the API for every resource access.
- Define shared external contracts with strict Zod schemas in `packages/shared`.
- Do not duplicate API DTOs in the web application.
- Keep UI copy in all four locale catalogs; do not hardcode user-visible strings.
- Treat user-generated text, URLs, uploads, filters, and socket payloads as untrusted.
- Use transactions and constraints for concurrency-sensitive invariants.

## Database changes

Update `schema.prisma`, generate a descriptive migration, review its SQL, and add integration coverage. Never edit a migration that may already have been applied. Include a data migration and rollback/compatibility explanation for destructive changes.

## Required checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
npm run test:e2e
```

Add tests at the lowest useful layer and include authorization abuse cases for protected behavior. UI changes must remain usable by keyboard, respect reduced motion, work in responsive viewports, and avoid serious/critical Axe findings.

## Commit and pull-request style

Use Conventional Commits, for example:

```text
feat(tasks): add bulk assignee updates
fix(auth): make reset token consumption atomic
docs(deployment): clarify backup restoration
```

A pull request should explain:

- the user or operational problem;
- the chosen design and important alternatives;
- authorization and tenant effects;
- migration and compatibility effects;
- tests executed;
- screenshots for material UI changes, without private data.

Keep changes reviewable and do not mix unrelated refactors with a feature.
