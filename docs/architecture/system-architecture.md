# System Architecture

TechOps Hub uses a modular monolith architecture in a monorepo. The repository contains a Vite/React frontend in `apps/web`, a NestJS REST API in `apps/api`, shared configuration assets under `packages/config`, and product/engineering documentation under `docs`.

The backend is structured around bounded modules so that business logic remains isolated while deployment stays operationally simple for the MVP. The frontend follows a feature-oriented structure and uses TanStack Query for server state, Redux Toolkit for client-only state, and React Router for route composition.
