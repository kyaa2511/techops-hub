# ADR-002 — Use PostgreSQL

- Status: Accepted

## Context

The platform needs strong relational integrity, predictable migrations, and production-ready transactional guarantees.

## Decision

Use PostgreSQL as the primary datastore, accessed through TypeORM with migrations.

## Consequences

The system gains robust relational modeling and operational familiarity at the cost of maintaining a database service in local, CI, and hosted environments.
