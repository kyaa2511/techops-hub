# API Design

The API follows versioned REST conventions rooted at `/api/v1`. Sprint 0 introduces the first production-style endpoint, `GET /api/v1/health`, and Swagger documentation at `/api/docs`.

Collection endpoints added in later sprints will use explicit DTO validation, pagination, and consistent error formatting. Business workflows such as create-job will be implemented in backend services so that the API, rather than the frontend, owns transactional rules and tenant-scoped data access.
