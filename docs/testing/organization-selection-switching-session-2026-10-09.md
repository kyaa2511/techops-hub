# Organization selection and switching — October 9, 2026

## Source and scope

Actual checkout: `C:\Users\Katana\techops-hub`.
Branch: `codex/organization-selection-switching`; clean when inspected.
No applicable AGENTS.md was found. The OneDrive project directory was not used
for source work. Existing organization discovery, authentication, provisioning,
onboarding, and tenant guards were preserved.

Recovered roadmap: ChatGPT `Project Sprint Rundown`,
`6abe5b6b-e39c-83ea-981a-112198b0a1d8`. Organization selection/switching follows
completed onboarding. No new numbered sprint designation was assigned.

## Acceptance criteria and implementation

- Authenticated discovery displays loading, empty, unprovisioned identity, and
  retryable error states; no active tenant header is sent.
- Users explicitly select an organization; `/auth/context` verifies membership
  before the workspace renders. The verified role and membership ID are used.
- Switching hides workspace content while verification runs. Failed, denied,
  missing, or mismatched context responses keep the workspace gated.
- Tenant clients send the selected organization's header. Identity requests omit
  tenant headers. Missing tokens fail closed for tenant requests.
- Tenant keys include identity and organization. Switching cancels/removes tenant
  queries and remounts workspace children. Late responses, including late denials
  after reselecting the same organization, cannot overwrite newer context.
- Clerk identity/session changes and sign-out dispose the isolated authenticated
  QueryClient and reset selection. Selection is in memory, with no persistence.
- Tenant authorization denial clears active selection/cache and refreshes discovery.
  Users can also refresh memberships explicitly, clearing selection first.
- Public demo remains independent of Clerk and API calls.

## Files changed

- `apps/web/src/auth/auth-gate.tsx`
- `apps/web/src/auth/authenticated-workspace.tsx` (new)
- `apps/web/src/auth/organization-context.ts` (new)
- `apps/web/src/auth/organization-selection.tsx` (new)
- `apps/web/src/auth/organization-selection.test.tsx` (new)
- `apps/web/src/auth/session-verification.tsx`
- `apps/web/src/shared/api/authenticated-api.ts`
- `apps/web/src/shared/api/authenticated-api.test.ts`
- `docs/api/api-design.md`
- `docs/testing/organization-selection-switching-session-2026-10-09.md` (this file)

## Validation

- Frontend: 4 suites / 28 tests passed, including public demo regressions,
  discovery states, verification retries/denials, tenant headers, cache isolation,
  rapid switches, late tenant results/denials, identity/session changes, sign-out,
  and React Strict Mode.
- Frontend lint passed with no warnings.
- Frontend typecheck and explicit app/test TypeScript checks passed.
- Production and demo builds passed. Vite reports a bundle above its 500 kB
  warning threshold; bundle splitting was not part of this sprint.
- Backend: 11 suites / 60 API tests passed.
- PostgreSQL E2E: 3 suites / 7 tests passed.
- `git diff --check` passed.

Frontend tests mock Clerk identity and HTTP responses; PostgreSQL E2E checks the
existing real database contracts. An interactive smoke test with a real Clerk
session and memberships was not performed in this chat.

## Remaining work and next starting point

Implementation and automated acceptance checks are complete. Next review step:
open `/app` with a provisioned Clerk test user who belongs to two organizations;
select each organization, confirm the displayed role and request header, sign out,
and confirm a new sign-in starts without a selection. Test an account with no
memberships and an unprovisioned account as well.

Then agree the next bounded organization-foundation sprint from the roadmap
(membership management, role/permission enforcement, settings, or invitations).
Do not jump into customers/tickets until that scope is agreed. This sprint adds
no invitations, member management, onboarding wizard, billing, or business resources.
Future tenant resource queries should use `useOrganizationApi`, `tenantQueryKey`,
and the query AbortSignal, as documented in `docs/api/api-design.md`.

All edits remain local and uncommitted. No staging, commits, pushes, amendments,
merges, or pull requests occurred. The existing PostgreSQL container was left running.

## Working-file reconciliation with origin/main — October 10, 2026

Refreshed origin and reconciled the four upstream-changed files: demo page,
demo CSS, App route/demo tests, and docker-compose.yml. Upstream dynamic
attention items and navigation accessibility are retained. Local portal dialog
CSS scoping and native Fetch test environment are retained. Organization
selection/switching source work was preserved.

.env.example and docker-compose.yml now exactly match origin/main defaults:
DATABASE_PORT=5432 and host/container mapping 5432:5432. README documents
alternate ports through local configuration. Port 5432 is occupied on this
machine; the existing container still runs on 5433. Private .env and running
services were not changed. PostgreSQL checks used a process-only
DATABASE_PORT=5433 override.

Validation: 32 frontend tests and 7 PostgreSQL E2E tests passed. Frontend build,
lint, CSS scoping inspection, and git diff --check passed. Windows encoding and
line-ending issues encountered during file reconciliation were corrected.

Touched files: .env.example, docker-compose.yml, README.md, App.test.tsx,
demo-page.tsx, demo.css, and this session record. A pre-edit backup of those
source/configuration files is in the OneDrive TechOps Hub directory under
reconciliation-backup-2026-10-10.

This reconciles file contents only. Branch history has not been merged/rebased;
origin/main is still not an ancestor of this branch. Under the standing no-merge,
no-commit/no-push restriction, no staging, commits, branch merges, or pushes
occurred. Next starting point: integrate origin/main into branch history through
the user's Git workflow, then review/commit the preserved sprint changes.

## Authorized branch integration — October 10, 2026

The user authorized integrating origin/main. A no-commit merge of
origin/main eaf5603897beff4f354594459d90bfc5f40f563d is now prepared.
Conflicts in App.test.tsx, demo-page.tsx, and demo.css were resolved using upstream
versions for the merge index. The PostgreSQL Compose mapping in that index is
5432:5432. The reconciled sprint working files were restored byte-for-byte from
a verified backup in the OneDrive TechOps Hub/integration-backup-2026-10-10
folder. There are no unresolved conflicts; index and working-tree diff checks pass.

The merge is intentionally still uncommitted: MERGE_HEAD records origin/main,
while HEAD remains the prior sprint base until the user commits the merge.
Upstream integration changes are staged as required for conflict resolution;
sprint edits remain unstaged/untracked. The restored working files match the
previously validated contents (32 frontend tests, 7 E2E tests, build and lint).
No new source behavior changed, so those tests were not repeated.
No commit or push occurred. Next starting point: review the staged merge and
unstaged sprint work, then complete the merge commit through the user's Git workflow.
