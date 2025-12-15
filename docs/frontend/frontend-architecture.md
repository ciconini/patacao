Frontend Architecture — Patacão Petshop

Purpose

This document defines the front-end architecture for Patacão (desktop-first, responsive web application). It describes pages, components (Atomic Design), user flows, state organization, routing/navigation, screenmap, and a recommended folder structure. All designs map to the backend domain, REST API, and business rules previously defined.

High-level decisions

- Type: Single Page Application (SPA) using feature-modular structure.
- UI Pattern: Atomic Design (Atoms → Molecules → Organisms → Templates → Pages).
- Language: English primary; allow i18n for European Portuguese (`pt-PT`).
- Desktop-first responsive design; breakpoints for tablet/mobile.
- Auth: Bearer token (session/JWT) with route guards and role-based UI.

Accessibility & Quality

- Follow WCAG 2.1 AA for forms and POS accessibility.
- Keyboard-first for POS and calendar interactions.
- Use semantic HTML and ARIA where required.

Pages (screen list)

Each page corresponds to one or more REST resources or flows.

Global
- Login (/login)
- Password Reset (/auth/password-reset)
- Dashboard (/dashboard)
- Settings (/settings)
- Not Found (404)

Administrative
- Company Profile (/admin/company)
- Stores List & Detail (/admin/stores, /admin/stores/:id)
- Customers List & Detail (/customers, /customers/:id)
- Pets List & Detail (/pets, /pets/:id)
- Users List & Detail (/users, /users/:id)
- Roles & Permissions (/roles)
- Import/Export (/admin/import, /admin/export)

Services
- Services Catalog (/services)
- Service Packages (/service-packages)
- Staff Calendar / Schedule (/calendar or /stores/:id/calendar)
- Appointment List (/appointments)
- Appointment Detail & Edit (/appointments/:id)
- Appointment Create / Quick-book modal
- Reminders Templates (/reminders/templates)

Financial
- POS / Checkout (/pos)
- Transactions List (/transactions)
- Transaction Detail (/transactions/:id)
- Invoices List (/invoices)
- Invoice Detail (/invoices/:id)
- Credit Notes (/credit-notes)
- Financial Exports (/financial-exports)

Inventory
- Products List (/products)
- Product Detail (/products/:id)
- Suppliers (/suppliers)
- Stock Batches (/stock-batches)
- Stock Movements (/stock-movements)
- Purchase Orders (/purchase-orders)
- Stock Reconciliation (/stock-reconciliation)

Audit & Ops
- Audit Logs (/audit-logs)
- Health / Admin Tools (/admin/health)

Components (Atomic Design)

Atoms
- Button, Link
- Text, Heading
- Input, Select, Textarea
- Checkbox, Radio
- Icon, Avatar
- Badge, Tag
- Date input, Time input
- Toast / Notification
- Modal shell

Molecules
- FormField (Label + Input + Error)
- SearchBox (input + clear + filters)
- TableRow (selection, actions)
- ToastGroup
- InlineAction (icon button + menu)

Organisms
- Header (logo, nav, user menu)
- Sidebar (module nav with store selector)
- DataTable (paging, sorting, filters)
- POS Cart (line items, totals, discount, VAT breakdown)
- AppointmentCard (time, pet/customer, staff, status)
- Calendar (day/week view with drag/drop)
- ProductCard (SKU, stock, price, quick actions)
- InvoiceViewer (line items, VAT, stamping metadata)

Templates
- Admin layout (sidebar + header + content)
- Detail layout (object header + tabs + activity feed)
- POS layout (large centered content + quick-access actions)

Pages
- Composed from templates and organisms

Reusable UI Patterns
- Confirmation modal pattern (critical destructive actions)
- Inline edit pattern for quick stock adjustments
- Batch actions in lists (select + perform)
- Optimistic UI for small, fast changes (e.g., mark-paid, checkin)

State Organization

Principles
- Separate server state and client UI state.
- Server-state handled by a query/cache library (recommended: React Query or SWR). Server state mirrors REST resources.
- Local UI state (form inputs, modal open/close) lives in component state or small local hooks.
- Global ephemeral UI (toasts, global modals) handled by a small global store or context.
- Authorization and session stored in an Auth store accessible by route guards and components.
- Normalize entities in cache/store (e.g., customers, pets, products, invoices) to avoid duplication.

Recommended stores & responsibilities
- AuthStore: access_token, refresh_token, currentUser, roles, session info, token refresh logic.
- UIStore (optional): global toasts, modals, layout preferences.
- QueryClient (React Query): server data caches per resource, background refetch, stale-while-revalidate.
- Local module stores/hooks: small domain hooks for derived UI state (e.g., useAppointmentEditor, usePosCart).

State patterns & concurrency
- Optimistic updates for UX-sensitive actions (checkin, mark-paid): update UI immediately, send request, rollback on failure.
- For appointment booking and stock reservation, use pessimistic confirmation: call API to reserve/check before committing in UI to avoid false success.
- Use entity `updated_at` or ETag for conflict detection and surface 409 conflicts to the user with clear resolution UI.

Data flow & API layer
- Single API client wrapper (api/httpClient) that handles auth header injection, error translation, retry logic, and response normalization.
- Per-module API services (e.g., servicesApi, invoicesApi) that implement the endpoints defined in backend docs.
- Use DTO mappers to adapt API shapes to front-end models if needed.

Routing & Navigation

Routing style
- SPA with client-side router (React Router / Vue Router / similar)
- Nested routes and route-level code splitting for performance
- Route guards for auth and role-based permissions

Route structure (example)
- /login (public)
- /dashboard (auth)
- /stores/:storeId/calendar
- /appointments
- /appointments/:id
- /pos (store-scoped, /pos?store=)
- /products
- /products/:id
- /invoices
- /invoices/:id
- /users
- /users/:id

Navigation patterns
- Primary navigation in the left Sidebar (modules): Dashboard, Services, Financial, Inventory, Admin
- Secondary navigation in page header for filters, store selector, quick actions
- Contextual actions appear as flyouts or side panels (e.g., quick-create appointment)
- Use modals for small flows (create customer inline from appointment) and full pages for complex workflows (POS)

Screenmap (visual mapping as hierarchical list)

- / (redirect to /dashboard)
- /login
- /dashboard
- /stores
  - /stores/:id (store settings)
  - /stores/:id/calendar
- /customers
  - /customers/:id
- /pets
  - /pets/:id
- /appointments
  - /appointments/new (modal or page)
  - /appointments/:id
- /pos
  - /pos/cart
  - /pos/checkout (modal within POS)
- /products
  - /products/:id
- /suppliers
  - /suppliers/:id
- /purchase-orders
- /stock-batches
- /invoices
  - /invoices/:id
- /transactions
  - /transactions/:id
- /users
  - /users/:id
- /roles
- /audit-logs
- /settings
  - /settings/company
  - /settings/reminders
- /admin/import
- /admin/export

User flows (key flows mapped to endpoints)

1) Login
- Page: /login
- Steps: enter credentials -> call POST /auth/login -> on success store tokens in AuthStore -> fetch current user -> redirect to /dashboard
- Auth rules: public endpoint; UI shows role-based modules after login

2) Appointment booking (book via appointment page)
- Page: /appointments or quick-book modal on calendar
- Steps:
  1. User opens create appointment modal -> selects store (store_id), customer (or create inline via POST /customers), pet, service(s)
  2. Client validates slot within store opening hours (client-side) and calls POST /appointments
  3. Server validates concurrency; if 201 returned, show appointment on calendar and schedule reminder (server side)
  4. If 409 double-booking, show conflict and offer reschedule
- API calls: POST /appointments, maybe GET /services, GET /staff availability
- Auth: Staff, Manager

3) POS Checkout (no in-app payment capture)
- Page: /pos
- Steps:
  1. Cashier adds products/services to cart (client state)
  2. Client calls POST /transactions (creates transaction and draft invoice depending on config)
  3. System reserves/decrements stock: either via immediate POST /transactions/{id}/complete (which triggers stock movements) or via concurrent flow
  4. Cashier marks payment manually using POST /invoices/{id}/mark-paid or POST /transactions/{id}/complete with payment info
  5. Show printable receipt/invoice viewer using GET /invoices/{id}
- API calls: POST /transactions, POST /transactions/{id}/complete, GET /invoices/{id}
- Auth: Staff, Manager

4) Inventory receipt (receive goods)
- Page: /purchase-orders or /stock-receipts
- Steps:
  1. Create PO POST /purchase-orders (Manager)
  2. Receive goods POST /purchase-orders/{id}/receive or POST /stock-receipts
  3. UI updates product stock and stock batches via GET /stock-batches
- API calls: POST /purchase-orders, POST /purchase-orders/{id}/receive, GET /stock-batches
- Auth: Manager, Staff

5) Issue Invoice (accounting flow)
- Page: /invoices
- Steps:
  1. Accountant opens invoice (or from transaction) and reviews lines
  2. Click Issue -> POST /invoices/{id}/issue which validates NIF and numbering
  3. UI renders issued invoice and allows export (PDF) and financial export generation
- API calls: POST /invoices, POST /invoices/{id}/issue, GET /invoices/{id}
- Auth: Manager, Accountant

6) User & Access Management
- Page: /users, /roles
- Steps:
  1. Owner/Manager creates a user via POST /users and assigns roles
  2. User receives email (out of scope) to set password; Admin can revoke sessions via POST /sessions/{id}/revoke
- API calls: POST /users, GET /roles, POST /sessions/{id}/revoke
- Auth: Owner, Manager

Client-side error & conflict handling

- Surface 409 conflicts with contextual UI offering resolution (reschedule, choose different stock batch, or request manager override).
- Global error boundary catches 500; errors logged to monitoring service.

Offline & resilience

- No full offline mode (out-of-scope). Cache server data for faster UX; retry transient failures, and queue background sync for non-critical writes if desired later.

Testing & Quality

- Unit test components and hooks (Jest + Testing Library).
- Integration tests for pages (Playwright / Cypress).
- Accessibility tests (axe).

Folder structure (feature-modular, example)

- src/
  - app/
    - App.jsx (router mount)
    - routes.js
    - i18n/
    - styles/
  - shared/
    - components/          # atoms & molecules used across modules
    - hooks/               # auth hooks, useApi, useQueryClient
    - utils/               # formatters, validators
    - services/            # api client wrapper
    - stores/              # AuthStore, UIStore
    - types/
  - modules/
    - administrative/
      - pages/
        - CompanyPage/
        - StoresPage/
      - components/
        - StoreForm/
        - CustomerForm/
      - hooks/
      - api/
      - tests/
    - services/
      - pages/
        - AppointmentsPage/
        - CalendarPage/
      - components/
        - AppointmentCard/
        - Calendar/
      - hooks/
      - api/
    - financial/
      - pages/
        - POSPage/
        - InvoicesPage/
      - components/
        - POSCart/
        - InvoiceViewer/
      - hooks/
      - api/
    - inventory/
      - pages/
      - components/
      - hooks/
      - api/
    - users/
      - pages/
      - components/
      - hooks/
      - api/
  - adapters/               # platform-specific UI adapters (analytics)
  - workers/                # service worker or background sync (if added later)
  - index.js
  - setupTests.js

Notes on component placement

- Keep atoms in `shared/components/atoms`, molecules in `shared/components/molecules`, and module-specific organisms in each `modules/*/components` folder.
- API service wrappers live in `modules/*/api` and call endpoints defined in `docs/api/rest-endpoints.md`.

Performance recommendations

- Code-split by route and module.
- Use virtualization for large tables (e.g., product lists, audit logs).
- Debounce search inputs; server-side pagination for large lists.

Deliverables & next steps

- This file defines the front-end plan and matches back-end APIs and business rules.
- Next optional tasks:
  - Produce wireframes or clickable mockups for critical pages (POS, Appointment calendar, Checkout). 
  - Scaffold the front-end project folder skeleton with placeholder files.
  - Produce OpenAPI-driven TypeScript client types or DTOs for stronger typing.

Document path: `docs/frontend/frontend-architecture.md`

End of document.