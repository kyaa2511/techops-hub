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
