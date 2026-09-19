# ADR-003 — Use REST API

- Status: Accepted

## Context

The MVP requires explicit, inspectable API contracts and straightforward client/server integration.

## Decision

Expose backend capabilities through a versioned REST API documented with Swagger/OpenAPI.

## Consequences

Endpoints remain easy to document, secure, and test, while some highly customized aggregation use cases may require dedicated endpoints instead of ad hoc query flexibility.
