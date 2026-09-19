# TechOps Hub

TechOps Hub is a modular-monolith SaaS platform for small technology-service businesses. Sprint 0 establishes the repository foundation: a Vite/React web app, a NestJS API, PostgreSQL connectivity, Docker Compose for local dependencies, CI validation, and the first production-style health endpoint.

## Repository Structure

```text
apps/
  api/        NestJS REST API
  web/        React + Vite frontend
docs/         Product, architecture, database, API, security, testing, ADRs
packages/
  config/     Shared repository configuration assets
  types/      Reserved for shared TypeScript contracts
  validation/ Reserved for shared validation schemas
```

## Prerequisites

- Node.js 22+
- npm 10+
- Docker / Docker Compose

## Local Setup

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
2. Start PostgreSQL:
   ```bash
   npm run db:up
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run database migrations:
   ```bash
   npm run migration:run
   ```
5. Start the applications:
   ```bash
   npm run dev
   ```

The API runs on `http://localhost:3000`, Swagger is available at `http://localhost:3000/api/docs`, and the web app runs on `http://localhost:5173`.

## Verification Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
curl http://localhost:3000/api/v1/health
```

Expected health response shape:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-09-19T00:00:00.000Z"
}
```

## Available Scripts

- `npm run dev` — run API and web apps together
- `npm run dev:api` — run the NestJS API only
- `npm run dev:web` — run the Vite frontend only
- `npm run db:up` / `npm run db:down` — manage the local PostgreSQL container
- `npm run migration:run` — apply TypeORM migrations
- `npm run lint` — lint all workspaces
- `npm run typecheck` — type-check all workspaces
- `npm test` — run all workspace tests
- `npm run build` — build all workspaces

## Sprint 0 Deliverables

- npm workspaces monorepo
- React + TypeScript + Vite frontend baseline
- NestJS API baseline
- Validated PostgreSQL configuration with TypeORM migrations
- `GET /api/v1/health`
- Swagger/OpenAPI setup
- CI workflow for lint, typecheck, test, and build
- Initial documentation and ADR set
