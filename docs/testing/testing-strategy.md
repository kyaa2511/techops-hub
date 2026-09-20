# Testing Strategy

Sprint 0 establishes automated tests for both applications and keeps them targeted: a frontend render test for the application shell and backend unit/e2e tests for the health endpoint. These tests protect the first critical paths without introducing broad, fragile coverage requirements.

Subsequent sprints should extend this foundation with tenant-isolation, authorization, customer/device ownership, workflow transaction, and payment webhook tests. CI runs linting, type checking, tests, and builds on every pull request to keep the main branch releasable.
