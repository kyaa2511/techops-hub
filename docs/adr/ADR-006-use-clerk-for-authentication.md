# ADR-006: Use Clerk for authentication

- Status: Accepted
- Date: 2026-09-20

## Decision

TechOps Hub will use Clerk as its external identity provider for authentication and
session verification. The NestJS API will verify Clerk session requests and expose
the verified Clerk user ID through an application authentication boundary.

TechOps Hub will continue to own application authorization, Organizations,
memberships, roles, and tenant context in PostgreSQL. Clerk Organizations are not
the application's source of truth for those concerns.

## Consequences

### Benefits

- No custom password storage.
- Managed session security.
- Reduced authentication security burden.
- Application authorization remains under our control.

### Tradeoffs

- The application depends on an external identity provider.
- Local application users will later need to map to Clerk user IDs.
