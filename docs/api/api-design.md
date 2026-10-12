# API Design

The API follows versioned REST conventions rooted at `/api/v1`. Swagger documentation is available at `/api/docs`.

## Authenticated user provisioning

`POST /api/v1/auth/provision` creates or retrieves the local PostgreSQL user for
the verified Clerk identity.

- Authentication: required. The Clerk-authenticated identity is taken from the
  verified request context; request body, query parameters, and arbitrary
  headers cannot select the user.
- Organization context: not required. Do not send `X-Organization-Id`; no
  organization or membership is created by this endpoint.
- Request body: none.
- Success: `200 OK`.

New local user response:

```json
{
  "userId": "local-user-uuid",
  "clerkUserId": "user_123",
  "created": true
}
```

When the local user already exists, the same response shape is returned with
`"created": false`. Existing user profile data is not overwritten.

Failure responses:

- `401 Unauthorized` when Clerk authentication is missing or invalid.
- `422 Unprocessable Entity` when the trusted Clerk profile has no usable email
  address required by the local User record.
- Unexpected persistence or Clerk-provider failures are surfaced as server
  errors; they do not return a successful provisioning response.

Collection endpoints added in later sprints will use explicit DTO validation, pagination, and consistent error formatting. Business workflows such as create-job will be implemented in backend services so that the API, rather than the frontend, owns transactional rules and tenant-scoped data access.

## Organization onboarding

`POST /api/v1/organizations` requires a verified Clerk identity and an already
provisioned local user. No active organization header is required.

Request body: `name` (string, 1–120 characters) and `slug` (3–80 lowercase
letters/numbers with single hyphens between words). Additional fields are rejected;
clients cannot select the owner, membership role, or an existing organization.

The API creates the organization and the authenticated user's OWNER membership
in one database transaction. A failure rolls back both writes.

Success: `201 Created`, containing `organizationId`, `name`, `slug`, and
`ownerMembershipId`. Errors: `401` for missing authentication, `400` for invalid
input, `404` for an unprovisioned identity, and `409` for a duplicate slug.

Invitations, member administration, frontend onboarding, and billing remain deferred.

## Organization selection and switching

`GET /api/v1/organizations` requires Clerk authentication and a provisioned local
user. It does not require `X-Organization-Id`. It returns an array of the current
user's memberships, each containing `organizationId`, `name`, `slug`,
`membershipId`, and `role`. A user with no memberships receives `[]`; an
unprovisioned identity receives `404`. The verified Clerk identity determines the
user; query parameters and arbitrary identity headers cannot select another user.

To select or switch an organization, use an ID from this list as the
`X-Organization-Id` header on `GET /api/v1/auth/context` and subsequent tenant
requests. Membership is checked server-side on each request. Listing an
organization does not grant future access after membership is revoked.
No server-side active-organization preference is stored by discovery.

### Authenticated frontend organization context

The `/app` route lists the signed-in user's organizations and requires an explicit
selection. The workspace renders only after `/auth/context` verifies the selected
organization. Loading, empty, unprovisioned-account, discovery-error, and access-error
states have dedicated messages; failed requests can be retried. Refreshing the
organization list clears the selection and requires verification again.

The selection is held in memory, scoped to the Clerk user and session. Reloading,
signing out, or changing identity/session requires a fresh selection. No Clerk
Organization or server-side active-organization preference is used.

Frontend identity requests use `useAuthenticatedApi` without a tenant header.
Tenant requests use `useOrganizationApi` within the verified organization provider;
it sets `X-Organization-Id` from that scope and overrides caller-supplied tenant
headers. Use `tenantQueryKey(identityId, organizationId, ...resourceParts)` and pass
the TanStack Query `signal` to the API request. Do not use unscoped keys or keep
previous-organization data as placeholder data. A tenant `401` or `403` clears the
active context and its tenant queries and refreshes discovery. A resource `404`
does not automatically revoke context; verification failures always gate access.

Every Clerk user/session has an isolated authenticated QueryClient. Organization
changes cancel and remove tenant queries and remount workspace children. Identity
changes and sign-out cancel and clear the entire authenticated cache. Canceled
requests cannot repopulate visible data or revoke a newer selection. Server-side
membership checks remain the source of authorization on each tenant request.


## Customers foundation — Sprint 2

All customer endpoints require Clerk authentication and a valid
`X-Organization-Id`. Membership is rechecked on every request. OWNER and ADMIN
may list, view, create, and update customers. MEMBER has no customer-directory
access in this sprint, following the roadmap's assigned-work role; future ticket
permissions are deferred.

- `POST /api/v1/customers`: 201 with the created customer.
- `GET /api/v1/customers?page=1&limit=25`: 200 with
  `{ items, total, page, limit }`. Page is an integer 1–1,000,000; limit is 1–100.
  Results are ordered by createdAt descending, then UUID descending.
- `GET /api/v1/customers/:id`: 200 with one customer.
- `PATCH /api/v1/customers/:id`: 200 with the updated customer. Omitted fields
  stay unchanged; an empty patch returns the existing record without touching it.

Create requires a trimmed name (1–120 characters). Optional fields are email
(valid email, max 254), phone (max 40), address (free text, max 1,000), notes
(max 5,000), and status (ACTIVE or INACTIVE, default ACTIVE). Optional contact
fields accept null; PATCH null explicitly clears them. Name and status cannot be
null. Unknown body/query fields are rejected, including ownership, IDs, and
timestamps. Customer emails are not unique; shared family/business contact
addresses are allowed. No hard-delete endpoint is included; set status INACTIVE.

Responses contain id, organizationId, name, email, phone, address, notes, status,
createdAt, and updatedAt. Times are ISO 8601 UTC strings. Every service operation
requires a matching verified user/membership/organization context and checks
OWNER/ADMIN access. The repository stays private to the Customers module.
Reads and updates always include organizationId; create derives it exclusively
from context and allowlists writable fields. Customer UUIDs do not grant access.
Unknown and other-organization customer IDs both return 404 in an authorized
tenant. Missing authentication returns 401; missing/invalid tenant headers and
invalid input return 400; non-members/revoked memberships or MEMBER access return
403. Existing unprovisioned-user/unknown-organization context behavior is retained.

The authenticated /app workspace includes a paginated customer list and a
details/editor dialog for OWNER/ADMIN. Queries use useOrganizationApi,
tenantQueryKey, and AbortSignals. Saves invalidate only the current tenant's
customer queries and abort when the workspace unmounts. A sent write may still
complete server-side for its original tenant; cancellation suppresses stale UI
results, rather than promising transaction rollback. Edits use last-write-wins;
concurrency versioning and audit history are deferred.

Migration: `1791676800000-CreateCustomers`, with an organization foreign key,
status enum, timestamps, and an organization/createdAt/id index. Run the normal
migration command before using these endpoints. Existing organizations/memberships
and public demo data are independent of customer records.
