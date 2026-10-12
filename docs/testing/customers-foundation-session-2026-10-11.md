# Sprint 2 — Customers Foundation — October 11, 2026

## Source and scope

Source checkout: C:\Users\Katana\techops-hub. Initial main was clean at
753dec78003c789c1d41ab04b5c559deb5692d6a (selection/switching PR #15).
Sprint edits are local on codex/customers-foundation. No applicable AGENTS.md
was found in the checkout or its parent directories.

Recovered ChatGPT roadmap: Project Sprint Rundown,
6abe5b6b-e39c-83ea-981a-112198b0a1d8. This sprint implements #13, “Next Major
Phase — Customers,” from “TechOps Hub — Full Project Rundown”; it does not use
the later master prompt's differently numbered #13 organization foundation.
Role behavior follows the rundown's #12: OWNER/ADMIN manage customers; MEMBER
is limited to future assigned-work workflows and has no directory access here.

## Bounded acceptance criteria

- Persist organization-owned customers with UUID, name, optional email/phone/
  address/notes, ACTIVE/INACTIVE status, and created/updated UTC timestamps.
- Provide validated create, paginated list, detail, and partial-update REST
  contracts. Unknown fields, tenant override fields, invalid IDs, invalid status,
  oversized fields, blank names, and invalid pagination are rejected.
- Require verified authentication and current membership on every HTTP request.
  Service access requires matching tenant/user/membership context and OWNER/ADMIN.
  All reads and writes scope to the organization; foreign IDs give 404.
- Expose the real authenticated customer list and details/editor in /app using
  useOrganizationApi, tenantQueryKey, query AbortSignals, and scoped invalidation.
- Preserve demo independence, organization switching, and user/session isolation.
  Drop tenant queries/drafts when switching; suppress late results after unmount.
- Validate meaningful HTTP authorization, PostgreSQL persistence/isolation, and
  actual Customers UI behavior without adding other business domains.

All criteria are implemented. Choices bounded during this sprint: free-text
address; optional contact details; ACTIVE default; INACTIVE instead of hard
deletion; no email uniqueness; deterministic offset pagination; last-write-wins.

## Files changed

- apps/api/src/app.module.ts — registers CustomersModule.
- apps/api/src/customers/customer.entity.ts — tenant FK, fields, timestamps/index.
- apps/api/src/customers/customer-request.dto.ts — create/update/query validation.
- apps/api/src/customers/customer-response.dto.ts — explicit serialized responses.
- apps/api/src/customers/customers.controller.ts — guarded REST/OpenAPI routes.
- apps/api/src/customers/customers.module.ts — module and guard dependencies.
- apps/api/src/customers/customers.service.ts — mandatory context and tenant access.
- apps/api/src/customers/customers.controller.spec.ts — HTTP contracts/authorization.
- apps/api/src/database/migrations/1791676800000-CreateCustomers.ts — reversible DDL.
- apps/api/test/customers.e2e-spec.ts — real PostgreSQL persistence/isolation.
- apps/web/src/customers/customers-page.tsx — paginated list and details/editor.
- apps/web/src/customers/customers-page.test.tsx — real customer UI regression tests.
- apps/web/src/dashboard/dashboard-page.tsx — authenticated integration.
- docs/api/api-design.md — full endpoint, role, validation, and frontend contract.
- docs/testing/customers-foundation-session-2026-10-11.md — this handoff.

## Validation

- API: 12 suites / 94 tests passed.
- Frontend: 5 suites / 39 tests passed (32 existing plus 7 customer tests).
- PostgreSQL: 4 suites / 9 tests passed.
- Workspace typecheck, explicit frontend app/test TypeScript checks, lint, and
  production builds passed. Existing Vite >500 kB bundle advisory remains.
- git diff --check passed; final index is unchanged/unstaged.
- New migration successfully ran against the existing local PostgreSQL database
  with process-only DATABASE_PORT=5433. Migration is now recorded locally.
  E2E fixtures use unique IDs and are cleaned up; existing local smoke users and
  organizations are preserved. Private .env and running services were not changed.

HTTP coverage includes unauthenticated requests, missing/invalid tenant headers,
revoked/non-member access, MEMBER denial, OWNER/ADMIN allowance, validation,
server-derived ownership, scoped pagination, and foreign customer lookup/update.
PostgreSQL covers persisted fields/defaults/timestamps, optional-field clearing,
status update, foreign-tenant read/update denial, foreign-key integrity, and
matching context requirements. Frontend covers create/update, save/list errors,
empty directory, MEMBER gating, organization cache removal, aborted late save,
identity changes, and sign-out; existing tests cover session changes/public demo.

During validation, full-app E2E caught missing guard dependencies in CustomersModule;
those imports/providers were corrected and the full suite passed. A UI test hit
the 5-second default during concurrent builds; this suite now has a 15-second
timeout and passed on rerun. There are no outstanding failing checks.

## Limits and next starting point

Automated sprint acceptance and live customer operations are complete. See the live
smoke review addendum below. The fresh sign-in selection check passed October 12, 2026.
Use the normal frontend/API dev setup with process-only Clerk auth and local DB
port overrides described by the earlier smoke record; do not expose credentials.

The Customers UI details editor uses the selected list record; GET :id is available
for future dedicated detail routes. Search, deduplication, hard deletion, concurrency
versioning, audit history, and assignment-based MEMBER customer visibility are
deferred. Devices, leads, tickets, billing, and invitations are outside this sprint.

A sent save may complete in its original tenant even if the browser aborts it.
Unmount cancellation prevents stale UI/cache effects; it does not promise database
rollback. Future modules should follow the same required-context/private-repository
pattern and include organization criteria in every query.

The user handles review and all commits/pushes. No staging, commits, pushes,
amendments, merges, or pull requests occurred. HEAD remains at the starting commit.


## Live smoke review addendum — October 11, 2026

Customers Foundation live smoke review — October 11, 2026

Actual source: C:\Users\Katana\techops-hub
Branch: codex/customers-foundation; local/uncommitted.

Local API and Vite were initially stopped; existing PostgreSQL remained on 5433.
Started npm run dev with root environment loaded, process-only AUTH_PROVIDER=clerk
and DATABASE_PORT=5433. No private configuration files were changed.

Live defect found and fixed:
Customer frontend requests omitted /api/v1, causing the Alpha directory to fail.
Corrected list/create/update requests to /api/v1/customers and added explicit
versioned-path regression assertions to customers-page.test.tsx. Backend unchanged.

Verified through the actual signed-in Clerk browser UI:
- Discovery listed Smoke Test Alpha and Smoke Test Beta; Alpha verified OWNER.
- Alpha initially had an empty customer directory.
- Created Sprint 2 Smoke Customer 2026-10-11 with synthetic email/phone/address/notes.
- Reopened details and verified all fields plus created/updated timestamps.
- Cleared email, changed notes, and set status INACTIVE; saved and reopened.
- Saved details showed empty email, changed notes, INACTIVE, unchanged created time,
  and a later updated time. List showed No email and Inactive.
- Switched to Beta, verified OWNER, and saw zero customers. Alpha's customer absent.
- Reload cleared tenant selection and hid customer/workspace data.
- Selected Alpha again; persisted inactive customer and cleared email remained.
- Signed out; public demo rendered. Opening /app showed the sign-in gate and no
  protected customer content.

Completed October 12, 2026: a fresh signed-in session showed the empty organization selector and no dashboard/customer data.
Credentials were not accessed or entered by the agent.

Synthetic customer remains INACTIVE in Alpha for review; no hard deletion performed.
Existing users, memberships, and organizations preserved. Dev services left running.
Proof images: customers-smoke-alpha-2026-10-11.png,
customers-smoke-beta-2026-10-11.png, customers-smoke-signout-2026-10-11.png.

After the route fix, all 39 frontend tests passed, along with frontend build, lint,
explicit app/test TypeScript checks, and git diff --check. Existing bundle advisory remains.
No staging, commits, pushes, amendments, merges, or pull requests occurred.


Final new-session proof: customers-smoke-new-session-2026-10-12.png in the OneDrive TechOps Hub directory. Live smoke review complete. No staging, commits, or pushes occurred.
