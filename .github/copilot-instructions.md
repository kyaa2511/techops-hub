# TechOps Hub Copilot Instructions

TechOps Hub is a multi-tenant SaaS platform for solo and small tech-service businesses.

## Core Stack

- Use TypeScript throughout the application.
- The frontend uses React, Vite, Material UI, TanStack Query, Redux Toolkit, React Hook Form, and Zod.
- The backend uses NestJS, TypeORM, PostgreSQL, and REST APIs.

## Architecture

- Use a modular monolith for V1.
- Keep frontend and backend separated within the monorepo.
- Keep NestJS controllers thin; put business logic in services.
- Use database migrations for schema changes.
- Keep TypeORM `synchronize: false`, especially in production.
- Do not introduce microservices without an ADR.
- Explain significant architectural decisions and changes.

## Frontend

- Use TanStack Query for server state.
- Use Redux Toolkit only for client/application state that does not belong in server-state caching.
- Use React Hook Form and Zod for forms and validation.

## Multi-Tenancy and Security

- Tenant-owned resources must always be organization scoped.
- Determine tenant context from authenticated identity rather than client input.
- Never trust a client-supplied `organizationId`.
- Validate all external inputs.
- Never commit secrets.

## Engineering Standards

- Prefer strong TypeScript types and avoid `any`.
- Keep changes small and reviewable.
- Add automated tests for important business logic and security boundaries.
