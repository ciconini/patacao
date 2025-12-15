Tech Stack — Patacão Petshop (Angular + Node.js)

Document Purpose

This document specifies the complete technology stack for Patacão, including runtime environments, frameworks, libraries, databases, infrastructure, and development tools. All versions are current as of December 2025 and chosen for stability, support, and alignment with project requirements.

Executive Summary

- Backend: Node.js + Express.js (or NestJS) + TypeScript
- Database: Firebase Firestore (primary), Redis (cache/session store)
- Queue: RabbitMQ or Bull (Redis-based)
- Frontend: Angular 18+ + TypeScript
- Infrastructure: Docker, Docker Compose (local dev), Kubernetes (optional for prod)
- Cloud: AWS (recommended), Azure, or GCP with EU data residency

---

Backend Stack

Runtime & Framework

- Node.js: 20.x LTS (support until April 2026) or 22.x LTS (experimental, stabilizes 2025)
  - Rationale: LTS versions ensure stability; 20.x is production-ready and widely tested.
  - Alternative: 18.x LTS (EOL April 2025) if legacy support needed, but recommend 20.x.

- Express.js: 4.18.2+ (lightweight, proven)
  - OR NestJS: 10.x (opinionated, built-in DI, better for modular architecture)
  - Recommendation: NestJS recommended for Clean/Hexagonal architecture (aligns with our design); Express fine if lightweight preferred.

Language & Type Safety

- TypeScript: 5.3+
  - Rationale: type safety, catches errors at compile time, aligns with front-end; essential for maintainability.
  - tsconfig: strict mode enabled, target ES2022 or later.

Database & ORM

- Firebase Firestore: Latest (NoSQL document database)
  - Real-time database capabilities
  - Automatic scaling
  - Built-in security rules
  - Offline support
  - Recommendation: Firestore for flexible schema, real-time updates, and managed infrastructure.
  
- Firebase Admin SDK: 12.x+ (Node.js SDK for server-side operations)
  - Server-side Firestore operations
  - Authentication management
  - Cloud Functions integration
  - Storage management

Database

- Firebase Firestore: Latest (Google Cloud managed NoSQL database)
  - Document-based storage
  - Real-time listeners
  - Automatic scaling
  - Multi-region replication
  - Strong consistency within regions
  - Backup and restore via Google Cloud Console

Cache & Session Store

- Redis: 7.x (stable, mature)
  - Rationale: cache, session store, rate limiting, distributed locks for stock reservations.
  - Client: ioredis (5.x+) for Node.js (strong error handling, clustering support).

Job Queue & Background Workers

- Bull: 4.x+ (Redis-based job queue, simpler than RabbitMQ for MVP)
  - OR RabbitMQ: 3.12.x+ (durable, more features, choose if scaling beyond single region later).
  - Recommendation: Bull for MVP (simpler ops); migrate to RabbitMQ later if needed.
  - Use case: appointment reminders, financial exports, stock reconciliation.

Authentication & Security

- jsonwebtoken (JWT): 9.x+ (token generation/verification)
- bcryptjs: 2.4.x+ (password hashing)
- passport.js: 0.6.x+ (optional, for OAuth/SSO in future)
- rate-limiter-flexible: 2.x+ (rate limiting for login attempts)

Validation & Serialization

- joi or zod: 3.x+ (schema validation for request DTOs)
  - Recommendation: Zod (better TypeScript integration, smaller bundle).
- class-transformer: 0.5.x+ (DTO transformations)
- class-validator: 0.14.x+ (decorator-based validation)

HTTP & REST

- axios: 1.6.x+ (HTTP client for internal service calls, exports)
- cors: 2.8.x+ (cross-origin handling)

Logging & Monitoring

- winston: 3.x+ (structured logging)
- pino: 8.x+ (high-performance logging, alternative)
  - Recommendation: Pino for performance-sensitive applications.
- @sentry/node: 7.x+ (error tracking, optional but recommended)
- prometheus-client: 15.x+ (metrics export for Prometheus/Grafana)

Database Utilities

- firebase-admin: 12.x+ (Firebase Admin SDK)
- firebase-tools: 12.x+ (Firebase CLI for deployment and management)
- @google-cloud/firestore: 7.x+ (Direct Firestore client, if needed)

Email & Notifications (transactional)

- nodemailer: 6.9.x+ (SMTP wrapper, optional if using SendGrid/AWS SES directly)
- @sendgrid/mail: 7.x+ (if using SendGrid)
- aws-sdk: 3.x (AWS SDK v3, for SES, S3, SNS)

File & Export Handling

- csv-stringify: 6.x+ (CSV export generation)
- json2csv: 6.x+ (JSON to CSV conversion)
- pdf-lib: 1.x+ (PDF generation for invoices; or use headless Chrome via Puppeteer)
- puppeteer: 21.x+ (headless browser for PDF rendering, heavyweight; use if advanced formatting needed)

Testing

- jest: 29.x+ (unit & integration tests)
- @testing-library/node: latest (optional, for isolated component testing)
- supertest: 6.x+ (HTTP endpoint testing)
- testcontainers: 10.x+ (Docker containers for integration tests — Firebase Emulator, Redis)

Code Quality & Linting

- eslint: 8.x+
- @typescript-eslint/eslint-plugin: 6.x+
- @typescript-eslint/parser: 6.x+
- prettier: 3.x+ (code formatting)
- husky: 8.x+ (pre-commit hooks)
- lint-staged: 15.x+ (run linters on staged files)

Development & Build

- ts-node: 10.x+ (run TypeScript directly in dev)
- nodemon: 3.x+ (auto-reload on changes)
- tsc-watch: 6.x+ (TypeScript compiler with file watching)
- webpack or esbuild: 5.x+ or 0.19.x+ (bundling; most frameworks handle this)

API Documentation

- swagger-ui-express: 4.x+ (Swagger UI for OpenAPI docs)
- @nestjs/swagger: 7.x+ (if using NestJS)
- openapi-types: 12.x+ (TypeScript types for OpenAPI)

Environment & Configuration

- dotenv: 16.x+ (load `.env` files)
- joi: 17.x+ (env validation schema)

---

Frontend Stack (Angular)

Runtime & Framework

- Node.js: 20.x LTS (same as backend for consistency)
- Angular: 20.x (latest stable; released late 2025)
  - @angular/core: 20.x
  - @angular/common: 20.x
  - @angular/forms: 20.x (reactive forms recommended)
  - @angular/router: 20.x (routing & lazy loading)
  - @angular/platform-browser: 20.x
  - @angular/platform-browser-dynamic: 20.x

Language & Type Safety

- TypeScript: 5.3+
  - tsconfig: strict mode, target ES2022.

Build & Tooling

- @angular/cli: 20.x (Angular CLI for dev, build, test)
- webpack: 5.x (integrated via Angular CLI)
- esbuild: 0.19.x+ (bundling optimization in ng 20+)

Component Libraries & UI

- PrimeNG: 20.x (UI components: forms, tables, dialogs, navigation, richer enterprise components)
  - OR Angular Material: 20.x (alternative, Material Design, lighter weight)
  - Recommendation: PrimeNG for feature-rich components, better calendar, and enterprise feel; easier to extend for Portuguese localization.
- @angular/cdk: 20.x (Component Dev Kit, advanced features like drag-drop, virtual scrolling)
- primeng: 20.x (PrimeNG components library)
- primeicons: 7.x+ (icon library for PrimeNG)
- @fortawesome/fontawesome-svg-core: 6.x+ (Font Awesome icon library, primary icon set)
- @fortawesome/free-solid-svg-icons: 6.x+ (solid Font Awesome icons)
- @fortawesome/free-regular-svg-icons: 6.x+ (regular Font Awesome icons)
- @fortawesome/angular-fontawesome: 0.x+ (Angular wrapper for Font Awesome)

Forms & State Management

- @angular/forms: 20.x (Reactive Forms recommended)
- @ngrx/store: 18.x+ (state management, Redux-like, optional but recommended for complex state)
- @ngrx/effects: 18.x+ (side-effect management)
- @ngrx/entity: 18.x+ (normalized data management)
- ngxs: 18.x+ (alternative to NgRx, lighter weight)
  - Recommendation: NgRx for larger app; simpler services for MVP.

Data & API Communication

- @angular/common/http: 20.x (HTTP client, built-in)
- rxjs: 7.8.x+ (reactive programming, observables)
- @ngrx/data: 18.x+ (auto-CRUD entity management, optional)
- Apollo Client: 5.x+ (if shifting to GraphQL later; not required now)

Routing & Navigation

- @angular/router: 20.x (built-in, with lazy loading, route guards)
- ngx-translate: 16.x+ (i18n for `pt-PT`, `en` support)

Forms & Validation

- reactive forms: 20.x (built-in)
- ngx-mask: 18.x+ (input masking, useful for Portuguese NIF, phone formats)
- ngx-mat-intl-tel-input: 18.x+ (international phone input, if needed)

Calendar & Date Handling

- PrimeNG Calendar: 20.x (built-in calendar component in PrimeNG)
- date-fns: 2.x+ or moment.js: 2.x+ (date utilities; moment is heavier, date-fns lighter)
  - Recommendation: date-fns for smaller bundle.

Charts & Dashboards

- ngx-charts: 20.x+ (simple charts)
- chart.js: 4.x+ with ng2-charts: 4.x+ (for dashboard KPIs)

Tables & Data Display

- PrimeNG DataTable: 20.x (built-in table component with sorting, paging, filtering)
- ng-table: 7.x+ (alternative data table library)

Notifications & Toasts

- PrimeNG Toast: 20.x (built-in toast notifications component)
- ngx-toastr: 17.x+ (alternative, if additional toast UI features needed)

PDF Export & Printing

- jsPDF: 2.x+ (PDF generation)
- html2pdf: 0.10.x+ (HTML to PDF, simpler than jsPDF)
- ngx-print: 18.x+ (printing directives)
  - Recommendation: jsPDF or html2pdf for invoice PDFs.

CSV & File Export

- ngx-csv: 0.3.x+ (CSV export helper)
- file-saver: 2.x+ (save files client-side)

Authentication & Security

- @angular/common/http: 20.x interceptors (token injection)
- @auth0/angular-jwt: 5.x+ (JWT helper library, compatible with Angular 20)
- crypto-js: 4.x+ (client-side crypto, if needed for local encryption)

Accessibility & Localization

- ngx-translate: 16.x+ (i18n management)
- @angular/localize: 20.x (built-in i18n support)
- axe-core: 4.x+ (accessibility testing)

Testing

- jasmine: 5.x+ (test framework, built-in with Angular)
- karma: 6.x+ (test runner, built-in with Angular)
- @angular/core/testing: 20.x (Angular testing utilities)
- @testing-library/angular: 14.x+ (modern testing library approach)
- cypress: 13.x+ (e2e testing)
  - OR playwright: 1.4.x+ (alternative e2e)

Code Quality

- eslint: 8.x+
- @angular-eslint/eslint-plugin: 17.x+
- prettier: 3.x+
- husky: 8.x+
- lint-staged: 15.x+

Performance & Optimization

- @angular/common/http + HttpClientModule: built-in caching strategies
- ngx-infinite-scroll: 18.x+ (lazy loading lists)
- @ngrx/store-devtools: 18.x+ (Redux DevTools integration for debugging)
- angular-compression: (optional, gzip at build time)

Development

- @angular/cli: 20.x (dev server, hot reload, code generation)
- @angular-devkit/build-webpack: included (build tooling, esbuild default)

Environment & Configuration

- @angular/core/environments: 20.x built-in (environment.ts, environment.prod.ts)
- dotenv-webpack: 8.x+ (load env vars at build time)

---

Databases & Data

Primary Database

- Firebase Firestore: Latest
  - Managed by Google Cloud Platform
  - Automatic backups and replication
  - Multi-region support
  - No infrastructure management required

Caching & Sessions

- Redis: 7.x
  - Managed: AWS ElastiCache, Azure Cache for Redis.
  - Self-hosted: Docker + Redis Sentinel (optional) for HA.

Message Queue

- Bull (Redis-backed): 4.x+ for MVP
  - OR RabbitMQ: 3.12.x+ for production scale and durability.

---

Infrastructure & Deployment

Containerization

- Docker: 24.x+ (latest stable)
  - Node.js official image: node:20-alpine (lightweight)
  - Firebase Emulator image: mtlynch/firestore-emulator
  - Redis image: redis:7-alpine
  - RabbitMQ image: rabbitmq:3.12-management (if used)

Orchestration & Container Management

- Docker Compose: 2.x+ (local development)
- Kubernetes: 1.28+ (optional, for production scale)
  - Helm: 3.x+ (Kubernetes package management)

Infrastructure as Code (IaC)

- Terraform: 1.6.x+ (AWS/Azure/GCP provisioning)
  - OR CloudFormation (AWS-only alternative)
  - OR Pulumi: 3.x+ (IaC in Python/TypeScript, alternative)

Cloud Platform

- AWS (recommended):
  - ECS or EKS (container orchestration)
  - Firebase Firestore (managed NoSQL database)
  - ElastiCache (Redis managed)
  - SQS or SNS (alternative to RabbitMQ, optional)
  - S3 (file storage for exports, PDFs)
  - CloudFront (CDN for Angular static assets)
  - ACM (SSL/TLS certificates)
  - Route 53 (DNS)
  - CloudWatch (logging & monitoring)
- OR Azure:
  - Azure Container Instances or Azure Kubernetes Service (AKS)
  - Firebase Firestore (cross-cloud, managed by Google)
  - Azure Cache for Redis
  - Azure Blob Storage (file storage)
  - Application Insights (monitoring)
- OR Google Cloud Platform:
  - Cloud Run (serverless containers, simple apps)
  - GKE (Kubernetes)
  - Firebase Firestore (managed NoSQL database)
  - Memorystore (Redis)
  - Cloud Storage (files)

Reverse Proxy & Load Balancing

- nginx: 1.25.x+ (reverse proxy, static asset serving)
  - OR AWS Application Load Balancer (ALB), Azure Application Gateway

CI/CD Pipelines

- GitHub Actions: free tier for public repos, paid for private (recommended, integrated with GitHub)
  - OR GitLab CI: if using GitLab
  - OR Jenkins: 2.x+ (self-hosted, complex setup)
  - Recommendation: GitHub Actions for simplicity.

Logging & Monitoring

- ELK Stack (Elasticsearch, Logstash, Kibana): 8.x+
  - OR Grafana Loki: 2.x+ (lightweight, Kubernetes-native)
  - OR AWS CloudWatch (managed)
  - Recommendation: AWS CloudWatch for MVP, ELK for multi-region production.

- Prometheus: 2.x+ (metrics collection)
- Grafana: 10.x+ (metrics visualization & dashboards)

Distributed Tracing (optional)

- Jaeger: 1.x+ (distributed tracing for microservices, not needed for monolith MVP)
  - OR DataDog: (commercial, comprehensive monitoring)

Error Tracking

- Sentry: @sentry/node, @sentry/angular (both sides)
  - OR Rollbar: (alternative)
  - Recommendation: Sentry open-source self-hosted or Sentry.io free tier.

SSL/TLS & Secrets Management

- Let's Encrypt: (free SSL certificates)
  - OR AWS Certificate Manager (ACM)
- Vault by HashiCorp: 1.x+ (secrets management, optional for MVP)
  - OR AWS Secrets Manager (managed)
  - OR Azure Key Vault
  - Recommendation: AWS Secrets Manager for simplicity.

---

Development Tools & Utilities

Version Control

- Git: 2.42.x+ (latest stable)
- GitHub, GitLab, or Bitbucket (repository hosting)

IDE & Editors

- Visual Studio Code: latest
  - Extensions: Angular Language Service, ESLint, Prettier, GitLens, PrimeNG Extension Pack
- WebStorm: 2024.x (JetBrains IDE, commercial; optional)

Package Management

- npm: 10.x+ (included with Node.js 20.x)
  - OR yarn: 4.x+ (faster, stricter lockfile)
  - OR pnpm: 8.x+ (fast, disk-efficient)
  - Recommendation: npm for simplicity; yarn if performance needed.

Code Collaboration & Review

- GitHub / GitLab (pull requests, code review)
- SonarQube: 9.x+ (code quality, optional but recommended)

Documentation

- Swagger/OpenAPI: 3.1.x (API documentation)
- MkDocs: 1.x+ (internal documentation generation)
- Storybook: 7.x+ (component documentation, optional)

Performance & Load Testing

- k6: 0.48.x+ (load testing, lightweight)
  - OR Apache JMeter: 5.x+ (traditional load testing)
  - OR Locust: 2.x+ (Python-based, modern)
  - Recommendation: k6 for easy adoption.

---

Recommended Optional Packages

Authentication / OAuth (future)

- @nestjs/jwt: 12.x+ (if using NestJS)
- @nestjs/passport: 10.x+ (if using NestJS)
- google-auth-library: 9.x+ (Google OAuth, if SSO needed)

Graphql (future migration)

- @apollo/server: 4.x+ (GraphQL server)
- @nestjs/graphql: 12.x+ (NestJS GraphQL integration)

---

Development Environment Setup

Local Development (Docker Compose)

- docker-compose.yml includes:
  - Node.js app container
  - Firebase Emulator container
  - Redis container
  - (Optional) RabbitMQ container
  - (Optional) Firebase Emulator UI
  - (Optional) Redis Commander (Redis UI)

Package Versions Lock File

- package-lock.json (npm) or yarn.lock (yarn) or pnpm-lock.yaml (pnpm)
  - Commit to version control for reproducible builds.

Node Modules Management

- .npmrc (npm config, registry, auth tokens)
- .npmignore (exclude files from published packages)

---

Summary & Version Table

| Component | Version | Notes |
|-----------|---------|-------|
| Node.js | 20.x LTS | Production-ready, support until April 2026 |
| TypeScript | 5.3+ | Strict mode |
| Express | 4.18.2+ | OR NestJS 10.x (recommended) |
| Firebase Firestore | Latest | Managed NoSQL database by Google |
| Firebase Admin SDK | 12.x+ | Server-side Firebase operations |
| Redis | 7.x | Session store, cache, queue |
| Angular | 20.x | Latest stable, released late 2025 |
| PrimeNG | 20.x | Primary UI component library, enterprise-grade |
| Font Awesome | 6.x | Primary icon library, extensive icon set |
| Docker | 24.x | Containerization |
| AWS / Azure / GCP | Latest | Cloud platform (EU region for data residency) |
| GitHub Actions | Latest | CI/CD (free) |
| Prometheus + Grafana | 2.x / 10.x | Monitoring (optional for MVP) |
| Sentry | 7.x (@sentry/node, @sentry/angular) | Error tracking (optional) |

---

Deployment Checklist

Before production deployment:
1. Firebase: configure Firestore security rules, set up automated backups.
2. Redis: configure persistence, optional Sentinel for HA.
3. SSL/TLS: acquire certificate (Let's Encrypt or ACM), set up auto-renewal.
4. Secrets: store API keys, DB passwords in Secrets Manager (not .env).
5. Logging: configure centralized logging (CloudWatch, ELK, or Loki).
6. Monitoring: set up Prometheus, Grafana, and alerting rules.
7. CI/CD: configure GitHub Actions for automated deploy.
8. Backups: test restore procedures for Firestore, Redis, and config.
9. Disaster Recovery: RTO/RPO targets and runbooks documented.

---

Document created: `docs/tech-stack.md`

End of document.
