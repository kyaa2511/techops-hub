# TechOps Hub Engineering Principles

- TechOps Hub is a multi-tenant SaaS platform.
- Use TypeScript throughout the application.
- The frontend uses React, Vite, Material UI, TanStack Query, Redux Toolkit, React Hook Form, and Zod.
- The backend uses NestJS, TypeORM, PostgreSQL, and REST APIs.
- Use a modular monolith for V1.
- Use TanStack Query for server state.
- Use Redux Toolkit only for client/application state.
- Keep NestJS controllers thin.
- Put business logic in services.
- Use database migrations.
- Never enable TypeORM synchronize in production.
- Never trust organizationId supplied by the frontend.
- Tenant context must eventually come from authenticated identity.
- Tenant-owned resources must always be organization scoped.
- Prefer strong TypeScript types and avoid any.
- Validate all external inputs.
- Never commit secrets.
- Keep changes small and reviewable.
- Do not introduce microservices without an ADR.
- Add automated tests for important business logic and security boundaries.
- Explain significant architectural changes.# TechOps Hub Copilot Instructions

TechOps Hub is a multi-tenant SaaS platform for solo and small tech-service businesses.

## Core Stack

- TypeScript
- React
- Vite
- Material UI
- TanStack Query
- Redux Toolkit
- NestJS
- TypeORM
- PostgreSQL
- REST APIs

## Architecture

- Use a modular monolith for V1.
- Keep frontend and backend separated within a monorepo.
- Keep NestJS controllers thin.
- Business logic belongs in services.
- Use migrations for database changes.
- Do not use TypeORM synchronize in production.
- Prefer strong TypeScript typing.
- Avoid `any` unless absolutely necessary.

## Multi-Tenancy

TechOps Hub is multi-tenant.

Every business is an Organization.

Every organization-owned resource must be isolated from other organizations.

Never trust `organizationId` supplied by the frontend.

Determine organization ownership from the authenticated user's context.

A user from Organization A must never be able to retrieve or modify Organization B's data.

## Frontend

Use TanStack Query for server state.

Use Redux Toolkit only for application/client state that does not belong in server-state caching.

Use React Hook Form and Zod for forms and validation.

Prefer reusable components without premature abstraction.

## Backend

Use NestJS modules organized by business domain.

Examples:

- Organizations
- Users
- Customers
- Devices
- Tickets
- Appointments
- Invoices
- Payments
- Dashboard
- Audit

Validate all incoming API data.

Use database transactions when multiple related records must succeed together.

## Engineering Standards

- Do not introduce unnecessary dependencies.
- Do not introduce microservices without a documented architectural reason.
- Write tests for important business logic.
- Enforce authorization and tenant isolation.
- Never commit secrets.
- Keep changes small and reviewable.
- Explain significant architectural changes before implementing them.
