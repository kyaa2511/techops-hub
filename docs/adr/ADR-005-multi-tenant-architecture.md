# ADR-005 — Multi-Tenant Architecture

- Status: Accepted

## Context

TechOps Hub serves multiple businesses from one platform, and tenant isolation is a hard requirement.

## Decision

Model every business as an organization and require tenant-owned records to enforce organization scoping throughout the backend.

## Consequences

Data-access code must consistently derive organization context from authenticated users, but the application gains a clear and secure foundation for SaaS tenancy.
