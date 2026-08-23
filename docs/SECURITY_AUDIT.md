# Security Audit

Audit updated: 2026-08-23

## Scope and method

This audit covers the checked-in API, web client, shared contracts, Prisma schema/migrations/seed, upload storage, Socket.IO, environment handling, Docker/NGINX, tests, and CI. Findings are based on repository evidence and executed local gates. It is not a certification or a promise of invulnerability.

## Release conclusion

No known critical release blocker remains in the audited repository. The final implementation has no intentional anonymous access to protected routes, no known cross-tenant resource path, no known role bypass, no public upload directory, no known reusable verification/reset token race, no committed real secret, and no known high/critical dependency advisory in the executed npm audit.

The application can be presented as security-focused and production-oriented. It must not be presented as independently penetration-tested, compliant, or immune to unknown vulnerabilities.

## Remediated findings

| Finding                                             | Remediation evidence                                                                                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Private files could become publicly exposed         | Avatars and task files use randomized keys outside executable/static content and authenticated tenant-aware controllers                          |
| File type could rely on client MIME/name            | Size, allowlist, extension, magic signature, image decode/normalization, and active-content checks are applied by resource type                  |
| Verification/reset token race                       | Consumption is atomic and covered by concurrent single-use tests                                                                                 |
| Refresh token abuse                                 | Rotation, hashing, family/session revocation, expiration, and reuse handling are implemented                                                     |
| Tenant ID manipulation                              | Organization/project/board/task/comment/label/file/search/analytics paths resolve server-side membership and permissions                         |
| Board task scope ambiguity                          | Board task queries require exact board ownership rather than only project membership                                                             |
| Invitation tokens could leak through responses/logs | Tokens are delivered through mail abstraction, stored safely, rate-limited, expiring, revocable, and not returned in normal production responses |
| User search enumeration                             | Search requires authentication and an organization in which the caller is a member                                                               |
| Unsafe proxy trust                                  | `TRUST_PROXY` rejects wildcard/boolean trust and accepts only an explicit allowlist                                                              |
| One global abuse limit                              | Separate Redis buckets cover auth actions, recovery, invitations, uploads, search, analytics, and global traffic                                 |
| Realtime arbitrary room access                      | Access-token handshake, strict UUID payloads, repository authorization, subscription caps, event caps, and derived room names                    |
| Process-local realtime                              | Redis adapter plus two-instance fan-out/presence integration coverage                                                                            |
| Sensitive error/log leakage                         | Central safe errors, production stack suppression, request IDs, structured logging, and sensitive header/token avoidance                         |
| Hardcoded seed credential                           | Sample account is disabled by default and requires private validated environment values                                                          |
| Weak browser delivery headers                       | Helmet for API plus NGINX CSP, frame denial, referrer, permissions, and sniffing controls for the SPA                                            |
| CSRF/CORS ambiguity                                 | Exact credentialed CORS allowlist and origin/token checks for state changes                                                                      |
| Audit schema without writes                         | Persistent audit service records sensitive authentication and administrative actions                                                             |

## Verified defensive tests

- Anonymous requests to protected endpoints
- Invalid, expired, revoked, modified, and wrongly signed JWTs
- Cross-user and cross-organization resource access
- Viewer/developer attempts at administrative or destructive actions
- Invitation ownership and token acceptance boundaries
- Password reset/verification concurrent reuse
- CSRF origin/token behavior and CORS allowlist behavior
- UUID, query, filter, page-size, and unknown-field rejection
- Injection-like search input and escaped wildcard behavior
- Oversized, unsupported, signature-mismatched, active-content, and cross-tenant files
- Unauthorized Socket.IO connection/room subscription and cross-node room fan-out
- Timer concurrency and ownership
- Search/analytics tenant filtering and permissions
- Browser Axe serious/critical checks and dynamic color contrast

## Secrets review

Runtime secrets are loaded from ignored environment files or deployment secret injection. Examples contain placeholders only. Vite accepts only public `VITE_` values and does not receive database, Redis, SMTP, or JWT material. CI uses an explicit CI-only signing string and disposable service credentials.

Before any public push, run repository history secret scanning. Because the current workspace began without a committed baseline, local file state alone cannot substitute for reviewing the exact first commit staged for publication.

## Dependency review

The final local `npm audit --audit-level=high` gate reported no known vulnerability. CI repeats that check, Dependabot monitors npm, Docker, and GitHub Actions, and Gitleaks scans repository history. An audit result is time-sensitive and must be rerun for every release.

## Residual risks

| Risk                                                       | Severity   | Required operational treatment                                                                           |
| ---------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| Local-volume uploads limit multi-host consistency          | Medium     | Use private object storage with equivalent authorization before horizontal multi-host deployment         |
| No bundled malware scanning service                        | Medium     | Add quarantine/scanning for environments that accept untrusted external files at scale                   |
| SMTP configuration and deliverability are operator-owned   | Medium     | Use a trusted provider, protect credentials, monitor abuse/bounces, and test staging flows               |
| No independent penetration test                            | Medium     | Obtain external review before valuable, regulated, or high-risk use                                      |
| No default hosted monitoring/SIEM                          | Medium     | Configure metrics, alerts, error tracking, audit-log retention/export, and incident ownership            |
| Compose database/cache are single-host services            | Medium     | Use managed HA services and tested failover for availability requirements                                |
| Access token remains readable by running client JavaScript | Low/Medium | Maintain CSP/XSS defenses, short TTL, memory-only storage, dependency hygiene, and session revocation    |
| Markdown/user content evolves over time                    | Low/Medium | Preserve safe React Markdown rendering; review any future raw HTML/plugin support separately             |
| Rate limits depend on correct proxy/origin deployment      | Low/Medium | Preserve explicit trusted proxies, test client IP behavior at the actual edge, monitor distributed abuse |

## Security gate for releases

A release must stop if any of these conditions exists:

- TypeScript, lint, tests, build, or formatting fails;
- high/critical known dependency advisory without documented containment;
- real secret in staged files or history;
- anonymous protected access;
- cross-tenant or role authorization bypass;
- sensitive file exposed without tenant-aware authorization;
- reusable expired/revoked/single-use token;
- production error or log containing credentials/tokens/stacks;
- production Compose images or readiness checks fail.

## Recommended future assessment

Use an independent reviewer to test authentication, session rotation, CSRF, invitation/recovery abuse, multi-tenant BOLA/IDOR, stored XSS, WebSocket authorization, file polyglots, proxy/rate-limit bypass, dependency supply chain, database concurrency, and production infrastructure. Perform that test against a dedicated staging environment with synthetic data.
