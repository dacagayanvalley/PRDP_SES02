# Production Decision Record

## Current decision

Use GitHub Pages for the static MVP and browser localStorage for simple local data only.

## Accepted constraints

- No server-side authentication or authorization.
- No central multi-user database.
- No confidential or manually fabricated records in hosted public data.
- Audit trail is local and advisory.
- GIS overlays are advisory and must be confirmed by official custodians.

## Go/no-go criteria for production backend

A backend becomes necessary if any of the following are required:

- Real confidential records, named complainants, exact sensitive locations, or GBV/SEA/SH referrals.
- Multi-user editing with enforceable roles and approvals.
- Official audit logs, retention rules, or immutable evidence records.
- Integration with official GIS services, document repositories, or agency systems.
- Required uptime, backup, disaster recovery, or incident response SLAs.

## Minimum production controls

- Enforced RBAC and least-privilege access.
- MFA-backed authentication.
- Encryption in transit and at rest.
- Row/document-level confidentiality tagging.
- Versioned official forms and rulesets.
- Backup, recovery, logging, and monitoring.
- Signed release checklist before each official form/rules update.

