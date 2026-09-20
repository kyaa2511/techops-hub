# ADR-004 — Use TanStack Query for Server State

- Status: Accepted

## Context

Frontend data fetching must distinguish remote/server data from local UI state.

## Decision

Use TanStack Query for server-state fetching and caching, and reserve Redux Toolkit for client-only application state.

## Consequences

Server interactions gain cache awareness and consistent lifecycle handling, while frontend state management stays clearer and avoids overusing Redux for API data.
