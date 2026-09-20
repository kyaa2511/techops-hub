# Database Design

PostgreSQL is the system of record for TechOps Hub. Sprint 0 establishes a validated TypeORM/PostgreSQL connection and a migration pipeline, including an initial migration that prepares UUID support through the `pgcrypto` extension.

Future tenant-owned tables will use UUID primary keys, explicit foreign keys, selective indexing, and soft-delete/archive behavior where required by business workflows. Organization ownership will be modeled consistently so that repository and service layers can enforce tenant isolation on every access path.
