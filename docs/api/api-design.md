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
