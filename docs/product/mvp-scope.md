# MVP Scope

Sprint 0 establishes the delivery foundation for TechOps Hub: monorepo structure, frontend and backend application scaffolds, PostgreSQL connectivity, local Docker dependencies, CI validation, and core architectural documentation.

The first functional business domains planned after Sprint 0 are authentication, organizations, customers, devices, tickets, appointments, invoices, payments, dashboard metrics, and audit logging. All tenant-owned records must be scoped to an organization, and backend services must derive tenant context from authenticated identity rather than trusting client-supplied organization identifiers.
