# ADR-001 — Use Modular Monolith for V1

- Status: Accepted

## Context

TechOps Hub needs to move quickly while keeping clear internal business boundaries.

## Decision

Use a modular monolith for V1, implemented as a monorepo with separate web and API applications.

## Consequences

Deployment and local development stay simple, while the codebase can still evolve around explicit domain modules and service boundaries.
