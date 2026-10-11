# Copilot PR #9 review fixes — October 9, 2026

Addressed five Copilot comments locally for https://github.com/kyaa2511/techops-hub/pull/9.

- Demo attention items/count derive awaiting-parts tickets from current status;
  completing TH-1040 removes it and resetting restores it.
- Demo CSS is scoped to .demo-shell and the portaled .demo-dialog, including
  responsive rules, table selectors, and focus styling.
- .env.example uses host PostgreSQL port 5433, matching Compose; README documents it.
- /app route tests cover configured signed-out entry and missing-key fallback.
  The Jest jsdom environment uses Node native Fetch APIs for router navigation.
- Active demo navigation exposes aria-current=page.

Files changed: .env.example, README.md, apps/web/src/demo/demo-page.tsx,
apps/web/src/demo/demo.css, apps/web/src/App.test.tsx, apps/web/jest.config.cjs,
apps/web/test/browser-environment.cjs, and this record.

Validation: 4 frontend suites / 31 tests passed. PostCSS inspection confirmed all
CSS rules are scoped. Frontend build and lint passed; Vite reports the existing
large-bundle advisory. git diff --check passed.

Existing organization-selection sprint edits were preserved. Fixes remain local
on codex/organization-selection-switching. No commits, pushes, staging, merges,
or GitHub comment replies/resolutions occurred. Next starting point: publish
these fixes through the user's Git workflow before resolving the review threads.
