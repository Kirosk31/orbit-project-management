# Security Policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability reporting feature in the repository **Security** tab and include:

- the affected route, component, or version;
- prerequisites and a minimal reproduction;
- expected and observed impact;
- whether cross-user or cross-organization access is possible;
- suggested remediation, if known.

Do not access data that is not yours, degrade shared services, persist access, or publish exploit details before remediation. Reports made in good faith are appreciated.

## Supported version

Until stable releases are published, security fixes apply to the current `main` branch. After versioned releases begin, this document will list supported release lines explicitly.

## Security invariants

- Authorization is enforced by the API for every protected operation.
- A user cannot access another organization by changing an identifier.
- Refresh, verification, and reset tokens are revocable, expiring, stored as hashes where applicable, and consumed atomically.
- Private files require authenticated tenant-aware retrieval.
- Secrets, passwords, tokens, cookies, and authorization headers do not belong in logs or source control.
- Production errors must not expose stacks, SQL, filesystem paths, or credentials.

The implementation audit is in [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md), and attacker scenarios are in [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).

## Deployment responsibility

Security also depends on the operator. Use HTTPS, unique secrets, restricted networks, maintained dependencies, encrypted backups, SMTP security, central monitoring, least-privilege infrastructure access, and an incident-response process. The example environment values are not production credentials.
