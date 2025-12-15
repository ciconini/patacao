Backend Architecture — Patacão Petshop

Purpose

This document captures the chosen backend architecture, layer responsibilities, request flow, a logical text diagram, and a minimal folder structure for the Patacão Petshop application.

Architecture choice & rationale

- Choice: Hexagonal (Ports & Adapters) combined with Clean Architecture (Onion/Clean) for strong separation of concerns.
- Rationale: keeps domain logic independent of frameworks and infra, improves testability, enables modular development of Administrative, Services, Financial, Inventory, and Users modules, and eases future extraction into microservices or separate processes.

Layer descriptions

1. Presentation / API Layer
- Contains: HTTP controllers, GraphQL resolvers, request/response DTOs, validation, authentication & authorization middleware.
- Responsibility: map external requests to application commands/queries, validate input and auth, and return responses. No domain rules.

2. Application / Use-Case Layer
- Contains: use-case interactors / application services, DTOs for use-cases.
- Responsibility: orchestrate application workflows (e.g., CreateAppointment, CompleteTransaction), coordinate domain entities and repository ports, manage transactions/unit-of-work, and publish domain events.

3. Domain Layer
- Contains: entities (Pet, Customer, Invoice, Product, Appointment), value objects, domain services, domain events, invariants and business rules.
- Responsibility: implement core business logic and invariants. Framework-agnostic.

4. Ports / Interfaces Layer
- Contains: repository interfaces, outbound adapters interfaces (mailer, exporter, queue), unit-of-work interfaces.
- Responsibility: define contracts the application/domain expect. No implementations here.

5. Adapters / Infrastructure Layer
- Contains: concrete implementations of ports (SQL repositories, mailer client, SFTP exporter, queue producers/consumers), ORM mappers, persistence wiring.
- Responsibility: implement IO and mapping between persistence schemas and domain models.

6. Cross-cutting / Shared Kernel
- Contains: logging, configuration, auth helpers (password hashing), error types, DTO mappers.
- Responsibility: reusable utilities used across modules.

7. Background Workers / Batch
- Contains: worker processes/consumers for scheduled reminders, exports, reconciliation.
- Responsibility: perform async or heavy tasks outside the request path.

8. Deployment / Ops
- Contains: CI/CD pipelines, Dockerfiles, infra-as-code, monitoring and backup scripts.
- Responsibility: deployment and operational concerns.

Request flow (step-by-step)

1. HTTP request reaches API server / gateway.
2. Router -> Controller/Resolver (Presentation)
   - Authentication middleware validates token/session.
   - Authorization guard performs permission check via Permission service.
   - Input validation runs (DTOs).
3. Controller builds UseCase Request DTO and calls Application UseCase (e.g., `CreateAppointment`).
4. Application UseCase:
   - Start transaction via UnitOfWork port.
   - Perform application-level validations.
   - Load domain objects via Repository Ports.
   - Execute domain logic using Domain Entities/Services.
   - Persist changes via Repository Ports (adapters implement these).
   - Publish domain events (in-memory or broker).
   - Commit transaction.
   - Return UseCase Response DTO.
5. Controller maps response DTO to HTTP response.
6. Async work: domain events published to broker consumed by background workers (email reminders, exports).
7. Audit logs and monitoring are recorded during or after the transaction.

Concurrency & integrity notes

- Use optimistic locking or DB transactions for booking and stock operations.
- Inventory: reserve on appointment confirmation; decrement on transaction completion within a transaction if possible; otherwise use compensating transactions.

Text diagram (logical)

Presentation (Controllers / DTOs / Auth)
  ↑
  | calls
Application (Use Cases / Interactors / UnitOfWork)
  ↑
  | orchestrates
Domain (Entities / Domain Services / Events)
  ↑
  | depends on ports/interfaces
Ports / Interfaces (Repository, Mailer, Exporter, Queue, UoW)
  ↓
Adapters / Infrastructure (SQL adapters, Email adapter, SFTP exporter, Queue client)
  ↓
External Systems (DB, S3/SFTP, Email provider, Accountant systems)

Background Worker -> Adapters -> Domain Use Cases (for asynchronous flows)

Minimal folder structure (feature-modular, Clean/Hexagonal)

- src/
  - shared/
    - config/
    - logger/
    - auth/
    - errors/
  - modules/
    - administrative/
      - presentation/    # controllers/routes, DTOs, validation
      - application/     # use-cases and DTOs
      - domain/          # entities, value objects, domain services
      - ports/           # repository interfaces, export/mail ports
      - adapters/        # module-specific infra (optional)
      - infrastructure/  # DB mappers if module-scoped
      - tests/
    - services/
      - presentation/
      - application/
      - domain/
      - ports/
      - adapters/
      - infrastructure/
    - financial/
    - inventory/
    - users/
  - adapters/
    - db/               # DB pool and repository implementations
    - email/            # mailer adapter
    - file/             # CSV, SFTP exporters
    - queue/            # event producer/consumer
  - workers/            # background job processes
  - cli/                # admin CLI tasks
  - migrations/
  - scripts/
  - openapi/ or docs/api/
- tests/
- docker/
- infra/
- README.md

Folder notes

- Feature-first module layout keeps domain, use-cases and adapters grouped for each module; eases extraction to services later.
- Shared `adapters/` contains global implementations (DB pool, shared repo impls) used by modules.
- Domain code must not import framework or infra modules.

Transactions & Unit-of-Work

- Application layer acquires UnitOfWork port (transaction manager). Repositories accept a UnitOfWork context to execute within the same transaction. This keeps transaction boundaries explicit and testable.

Authentication & Authorization

- Auth middleware: `shared/auth` in Presentation; token validation and session revocation.
- Authorization: delegated to an application-level Permission service; controllers guard the request entrance and use-cases enforce critical permission checks.

Async & Background processing

- Use domain events published to a durable queue (Rabbit/Kafka) via `adapters/queue` and consumed by `workers/`.
- Reminders, exports and heavy reports run in `workers/`.

Performance & Scalability suggestions

- Optimize hot paths (appointment booking, POS checkout): DB transactions, optimistic locking for stock, indices on `start_at`, `sku`, `invoice_number`.
- Use read replicas and caching for dashboards and list queries.
- Offload heavy work to background workers and support batch processing.

Testing strategy

- Unit tests: `modules/*/domain` and `modules/*/application` (mock ports).
- Integration tests: `tests/integration` with real DB and adapters.
- E2E tests: `tests/e2e` with full stack and workers.

Governance & Evolution

- Start as a well-structured monolith with strict module boundaries. Extract modules to services when necessary keeping same ports/contracts.
- Version APIs (e.g., `/api/v1/`) and design backward-compatible changes.

Next steps (suggestions)

- Create minimal file skeleton matching the folder structure.
- Draft unit-of-work and repository interface signatures (no code) for critical aggregates (AppointmentRepository, ProductRepository, InvoiceRepository).
- Draft an example use-case flow (pseudo-code) for `CreateAppointment` or `CompleteTransaction` to demonstrate interactions across layers.

Document created for planning and implementation reference.