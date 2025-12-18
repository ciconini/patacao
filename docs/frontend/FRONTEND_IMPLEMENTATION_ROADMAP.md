# Frontend Implementation Roadmap — Patacão Petshop

## Executive Summary

This document outlines the strategic implementation path for the Patacão Petshop frontend application. It provides a phased approach that aligns with the backend API, follows Angular best practices, and implements the architecture defined in the frontend architecture documentation.

**Current Status:**
- ✅ Angular 20 project initialized
- ✅ Dependencies installed (PrimeNG, NgRx, Font Awesome, etc.)
- ✅ Project structure created
- ✅ Environment configuration ready
- ✅ Backend API fully functional and documented
- ⚠️ No implementation yet (blank slate)

**Recommended Approach:** Incremental, feature-driven development starting with core infrastructure, then authentication, followed by module-by-module implementation.

---

## Table of Contents

1. [Implementation Phases](#implementation-phases)
2. [Phase 1: Foundation & Infrastructure](#phase-1-foundation--infrastructure)
3. [Phase 2: Authentication & Core Layout](#phase-2-authentication--core-layout)
4. [Phase 3: Administrative Module](#phase-3-administrative-module)
5. [Phase 4: Services Module](#phase-4-services-module)
6. [Phase 5: Financial Module](#phase-5-financial-module)
7. [Phase 6: Inventory Module](#phase-6-inventory-module)
8. [Phase 7: Polish & Optimization](#phase-7-polish--optimization)
9. [Technical Decisions](#technical-decisions)
10. [Best Practices](#best-practices)

---

## Implementation Phases

### Overview

The implementation is divided into 7 phases, each building upon the previous:

1. **Foundation & Infrastructure** (Week 1)
   - HTTP client setup
   - API service layer
   - State management (NgRx)
   - Shared components (atoms)
   - Error handling

2. **Authentication & Core Layout** (Week 1-2)
   - Auth service & guards
   - Login page
   - Main layout (sidebar, header)
   - Dashboard placeholder

3. **Administrative Module** (Week 2-3)
   - Customers management
   - Pets management
   - Company/Store settings
   - User management

4. **Services Module** (Week 3-4)
   - Services catalog
   - Appointment calendar
   - Appointment management

5. **Financial Module** (Week 4-5)
   - POS interface
   - Invoice management
   - Transaction history

6. **Inventory Module** (Week 5-6)
   - Product catalog
   - Stock management
   - Purchase orders

7. **Polish & Optimization** (Week 6+)
   - Performance optimization
   - Accessibility improvements
   - Testing
   - Documentation

---

## Phase 1: Foundation & Infrastructure

### Priority: CRITICAL
### Estimated Time: 3-5 days

### 1.1 HTTP Client & API Service Layer

**Goal:** Create a robust API communication layer with interceptors, error handling, and type safety.

**Tasks:**

1. **Base API Service** (`src/shared/services/api.service.ts`)
   ```typescript
   - Configure HttpClient with base URL from environment
   - Implement request/response interceptors
   - Handle authentication token injection
   - Implement token refresh logic
   - Error handling and transformation
   - Request/response logging (dev mode)
   ```

2. **HTTP Interceptors**
   - **Auth Interceptor**: Inject Bearer token
   - **Error Interceptor**: Handle 401 (redirect to login), 403 (show error), 409 (conflict handling)
   - **Loading Interceptor**: Global loading state (optional)

3. **API Response Types**
   ```typescript
   - Create TypeScript interfaces for API responses
   - Paginated response type: { items: T[], meta: PaginationMeta }
   - Error response type: { success: false, error: ApiError }
   - Success response type: { success: true, data: T }
   ```

4. **Module-Specific API Services** (skeleton)
   - `src/modules/users/api/auth.api.service.ts`
   - `src/modules/users/api/user.api.service.ts`
   - `src/modules/administrative/api/customer.api.service.ts`
   - `src/modules/administrative/api/pet.api.service.ts`
   - `src/modules/services/api/service.api.service.ts`
   - `src/modules/services/api/appointment.api.service.ts`
   - `src/modules/financial/api/invoice.api.service.ts`
   - `src/modules/financial/api/transaction.api.service.ts`
   - `src/modules/inventory/api/product.api.service.ts`

**Key Files to Create:**
- `src/shared/services/api.service.ts`
- `src/shared/interceptors/auth.interceptor.ts`
- `src/shared/interceptors/error.interceptor.ts`
- `src/shared/types/api.types.ts`
- `src/shared/types/response.types.ts`

### 1.2 State Management (NgRx)

**Goal:** Set up NgRx for global state management (auth, UI state).

**Tasks:**

1. **Auth Store** (`src/shared/stores/auth/`)
   ```typescript
   - AuthState: { user, accessToken, refreshToken, roles, storeIds, isAuthenticated }
   - AuthActions: login, logout, refreshToken, setUser, clearAuth
   - AuthReducer: handle auth state changes
   - AuthEffects: handle side effects (API calls, token refresh)
   - AuthSelectors: selectors for auth state
   ```

2. **UI Store** (`src/shared/stores/ui/`) - Optional
   ```typescript
   - UIState: { loading, toasts, modals, sidebarOpen }
   - Toast service for notifications
   ```

3. **NgRx Configuration**
   - Install and configure @ngrx/store, @ngrx/effects, @ngrx/store-devtools
   - Set up StoreModule and EffectsModule in app.config.ts

**Key Files to Create:**
- `src/shared/stores/auth/auth.state.ts`
- `src/shared/stores/auth/auth.actions.ts`
- `src/shared/stores/auth/auth.reducer.ts`
- `src/shared/stores/auth/auth.effects.ts`
- `src/shared/stores/auth/auth.selectors.ts`
- `src/shared/stores/ui/ui.state.ts` (optional)

### 1.3 Shared Components (Atomic Design - Atoms)

**Goal:** Create reusable base components following Atomic Design principles.

**Tasks:**

1. **Button Component** (`src/shared/components/atoms/button/`)
   - Variants: primary, secondary, danger, outline
   - Sizes: small, medium, large
   - States: loading, disabled
   - PrimeNG p-button wrapper or custom

2. **Input Component** (`src/shared/components/atoms/input/`)
   - Text input with validation
   - Error display
   - Label support
   - PrimeNG p-inputText wrapper

3. **Form Field Component** (`src/shared/components/molecules/form-field/`)
   - Label + Input + Error message
   - Reusable for all forms

4. **Toast/Notification Component**
   - Use PrimeNG Toast service
   - Configure in app.config.ts

5. **Loading Spinner**
   - Global loading indicator
   - Use PrimeNG ProgressSpinner

**Key Files to Create:**
- `src/shared/components/atoms/button/button.component.ts`
- `src/shared/components/atoms/input/input.component.ts`
- `src/shared/components/molecules/form-field/form-field.component.ts`
- `src/shared/services/toast.service.ts`

### 1.4 Error Handling & Utilities

**Goal:** Centralized error handling and utility functions.

**Tasks:**

1. **Error Handler Service**
   - Global error handler
   - Error transformation (API errors to user-friendly messages)
   - Error logging

2. **Utility Functions** (`src/shared/utils/`)
   - Date formatting (date-fns)
   - Currency formatting (EUR, Portuguese locale)
   - Phone number formatting
   - NIF validation
   - Form validators

3. **Type Definitions** (`src/shared/types/`)
   - Domain models (User, Customer, Pet, etc.)
   - API DTOs
   - Common types

**Key Files to Create:**
- `src/shared/services/error-handler.service.ts`
- `src/shared/utils/date.utils.ts`
- `src/shared/utils/currency.utils.ts`
- `src/shared/utils/validators.ts`
- `src/shared/types/domain.types.ts`

### 1.5 Routing Infrastructure

**Goal:** Set up routing structure with guards and lazy loading.

**Tasks:**

1. **Route Guards**
   - `AuthGuard`: Protect routes requiring authentication
   - `RoleGuard`: Protect routes based on user roles
   - `StoreGuard`: Protect store-scoped routes

2. **Route Structure** (skeleton)
   - Public routes: /login, /auth/password-reset
   - Protected routes: /dashboard, /customers, etc.
   - Lazy loading configuration

**Key Files to Create:**
- `src/shared/guards/auth.guard.ts`
- `src/shared/guards/role.guard.ts`
- `src/app/app.routes.ts` (update with routes)

---

## Phase 2: Authentication & Core Layout

### Priority: CRITICAL
### Estimated Time: 3-4 days

### 2.1 Authentication Service

**Goal:** Complete authentication flow with token management.

**Tasks:**

1. **Auth Service** (`src/modules/users/services/auth.service.ts`)
   ```typescript
   - login(email, password): Observable<AuthResponse>
   - logout(): Observable<void>
   - refreshToken(): Observable<TokenResponse>
   - requestPasswordReset(email): Observable<void>
   - confirmPasswordReset(token, newPassword): Observable<void>
   - getCurrentUser(): Observable<User>
   - isAuthenticated(): boolean
   - hasRole(role: string): boolean
   - hasStoreAccess(storeId: string): boolean
   ```

2. **Token Management**
   - Store tokens in localStorage or sessionStorage
   - Automatic token refresh before expiry
   - Token expiration handling

3. **Auth API Service** (`src/modules/users/api/auth.api.service.ts`)
   - Implement all auth endpoints
   - Type-safe request/response handling

**Key Files to Create:**
- `src/modules/users/services/auth.service.ts`
- `src/modules/users/api/auth.api.service.ts`
- `src/modules/users/types/auth.types.ts`

### 2.2 Login Page

**Goal:** Functional login page with validation and error handling.

**Tasks:**

1. **Login Component** (`src/modules/users/pages/login/`)
   - Reactive form with email/password
   - Validation (required, email format)
   - Error display
   - Loading state
   - Success: redirect to dashboard

2. **Login Page Styling**
   - Clean, professional design
   - Responsive layout
   - PrimeNG components

**Key Files to Create:**
- `src/modules/users/pages/login/login.component.ts`
- `src/modules/users/pages/login/login.component.html`
- `src/modules/users/pages/login/login.component.scss`

### 2.3 Main Layout

**Goal:** Application shell with sidebar, header, and content area.

**Tasks:**

1. **Main Layout Component** (`src/shared/components/templates/main-layout/`)
   - Sidebar navigation (collapsible)
   - Header with user menu
   - Content area with router-outlet
   - Responsive design

2. **Sidebar Component** (`src/shared/components/organisms/sidebar/`)
   - Module navigation (Dashboard, Services, Financial, Inventory, Admin)
   - Role-based menu items
   - Store selector (for Staff)
   - Active route highlighting

3. **Header Component** (`src/shared/components/organisms/header/`)
   - Logo/branding
   - User menu (profile, logout)
   - Notifications (optional)
   - Breadcrumbs (optional)

**Key Files to Create:**
- `src/shared/components/templates/main-layout/main-layout.component.ts`
- `src/shared/components/organisms/sidebar/sidebar.component.ts`
- `src/shared/components/organisms/header/header.component.ts`

### 2.4 Dashboard (Placeholder)

**Goal:** Basic dashboard page to verify routing and layout.

**Tasks:**

1. **Dashboard Component** (`src/modules/administrative/pages/dashboard/`)
   - Welcome message
   - Quick stats (placeholder)
   - Recent activity (placeholder)
   - Role-based widgets

**Key Files to Create:**
- `src/modules/administrative/pages/dashboard/dashboard.component.ts`

### 2.5 Route Configuration

**Goal:** Set up all routes with guards and lazy loading.

**Tasks:**

1. **Update app.routes.ts**
   ```typescript
   - /login (public)
   - /dashboard (protected, auth guard)
   - Lazy load modules:
     - /customers -> AdministrativeModule
     - /pets -> AdministrativeModule
     - /appointments -> ServicesModule
     - /invoices -> FinancialModule
     - /products -> InventoryModule
   ```

**Key Files to Update:**
- `src/app/app.routes.ts`

---

## Phase 3: Administrative Module

### Priority: HIGH
### Estimated Time: 5-7 days

### 3.1 Customers Management

**Goal:** Full CRUD for customers with search and pagination.

**Tasks:**

1. **Customer API Service** (`src/modules/administrative/api/customer.api.service.ts`)
   - getAll(params): Observable<PaginatedResponse<Customer>>
   - getById(id): Observable<Customer>
   - create(data): Observable<Customer>
   - update(id, data): Observable<Customer>
   - archive(id): Observable<void>
   - search(query): Observable<Customer[]>

2. **Customers List Page** (`src/modules/administrative/pages/customers-list/`)
   - Data table with PrimeNG p-table
   - Search functionality
   - Pagination
   - Filters (archived, etc.)
   - Actions: Create, Edit, Archive, View

3. **Customer Detail Page** (`src/modules/administrative/pages/customer-detail/`)
   - View customer information
   - Edit form
   - Linked pets list
   - Linked appointments list
   - Archive/Delete actions

4. **Customer Form Component** (`src/modules/administrative/components/customer-form/`)
   - Reactive form
   - Validation (name, email, phone)
   - Consent checkboxes
   - Reusable for create/edit

**Key Files to Create:**
- `src/modules/administrative/api/customer.api.service.ts`
- `src/modules/administrative/pages/customers-list/customers-list.component.ts`
- `src/modules/administrative/pages/customer-detail/customer-detail.component.ts`
- `src/modules/administrative/components/customer-form/customer-form.component.ts`
- `src/modules/administrative/types/customer.types.ts`

### 3.2 Pets Management

**Goal:** Full CRUD for pets linked to customers.

**Tasks:**

1. **Pet API Service** (`src/modules/administrative/api/pet.api.service.ts`)
   - Similar structure to Customer API Service

2. **Pets List Page**
   - Filter by customer
   - Search by name, microchip
   - Data table

3. **Pet Detail Page**
   - View/edit pet information
   - Medical notes
   - Vaccination history
   - Linked appointments

4. **Pet Form Component**
   - Customer selection
   - Species/breed selection
   - Date of birth picker
   - Medical notes editor

**Key Files to Create:**
- `src/modules/administrative/api/pet.api.service.ts`
- `src/modules/administrative/pages/pets-list/pets-list.component.ts`
- `src/modules/administrative/pages/pet-detail/pet-detail.component.ts`
- `src/modules/administrative/components/pet-form/pet-form.component.ts`
- `src/modules/administrative/types/pet.types.ts`

### 3.3 Company & Store Settings

**Goal:** View and edit company/store information (Owner/Manager only).

**Tasks:**

1. **Company API Service**
2. **Store API Service**
3. **Company Settings Page**
4. **Store Settings Page**
5. **Store List Page**

**Key Files to Create:**
- `src/modules/administrative/api/company.api.service.ts`
- `src/modules/administrative/api/store.api.service.ts`
- `src/modules/administrative/pages/company-settings/company-settings.component.ts`
- `src/modules/administrative/pages/stores-list/stores-list.component.ts`

### 3.4 User Management (Owner/Manager)

**Goal:** User CRUD with role assignment.

**Tasks:**

1. **User API Service**
2. **Users List Page**
3. **User Detail Page**
4. **User Form Component**
5. **Role Management** (view roles, assign to users)

**Key Files to Create:**
- `src/modules/users/api/user.api.service.ts`
- `src/modules/users/pages/users-list/users-list.component.ts`
- `src/modules/users/pages/user-detail/user-detail.component.ts`
- `src/modules/users/components/user-form/user-form.component.ts`

---

## Phase 4: Services Module

### Priority: HIGH
### Estimated Time: 5-7 days

### 4.1 Services Catalog

**Goal:** Manage service catalog (grooming, veterinary, etc.).

**Tasks:**

1. **Service API Service**
2. **Services List Page**
3. **Service Detail/Edit Page**
4. **Service Form Component**

### 4.2 Appointment Calendar

**Goal:** Visual calendar for appointment scheduling.

**Tasks:**

1. **Calendar Component** (`src/modules/services/components/calendar/`)
   - Use PrimeNG Calendar or FullCalendar integration
   - Day/Week/Month views
   - Drag-and-drop rescheduling
   - Color coding by status
   - Store filtering

2. **Appointment API Service**
3. **Appointment List Page**
4. **Appointment Detail Page**
5. **Appointment Form Component** (create/edit)
6. **Quick Book Modal** (inline appointment creation)

### 4.3 Appointment Management

**Goal:** Full appointment lifecycle (create, confirm, check-in, complete, cancel).

**Tasks:**

1. **Appointment Actions**
   - Confirm appointment
   - Check-in
   - Complete (with notes)
   - Cancel (with reason)
   - Reschedule

2. **Appointment Status Indicators**
   - Visual status badges
   - Status-based actions

---

## Phase 5: Financial Module

### Priority: HIGH
### Estimated Time: 6-8 days

### 5.1 POS (Point of Sale)

**Goal:** Point-of-sale interface for transactions.

**Tasks:**

1. **POS Page** (`src/modules/financial/pages/pos/`)
   - Product/service search and selection
   - Shopping cart (POS Cart organism)
   - Customer selection (or walk-in)
   - VAT calculation display
   - Payment method selection
   - Complete transaction

2. **POS Cart Component** (`src/modules/financial/components/pos-cart/`)
   - Line items display
   - Quantity adjustment
   - Remove items
   - Subtotal, VAT, Total
   - Discount application (if needed)

3. **Transaction API Service**
4. **Product/Service Quick Search**

### 5.2 Invoice Management

**Goal:** View, create, issue, and manage invoices.

**Tasks:**

1. **Invoice API Service**
2. **Invoices List Page**
   - Filter by status, date range, store
   - Search by invoice number, customer
3. **Invoice Detail Page**
   - Invoice viewer (printable)
   - Issue invoice (Manager/Accountant)
   - Mark as paid
   - Void invoice
   - PDF export
4. **Invoice Form Component** (draft creation)

### 5.3 Transaction History

**Goal:** View transaction history and details.

**Tasks:**

1. **Transactions List Page**
2. **Transaction Detail Page**
3. **Transaction API Service**

---

## Phase 6: Inventory Module

### Priority: MEDIUM
### Estimated Time: 5-7 days

### 6.1 Product Catalog

**Goal:** Manage product catalog with stock tracking.

**Tasks:**

1. **Product API Service**
2. **Products List Page**
   - Search by SKU, name
   - Filter by category
   - Stock level indicators
3. **Product Detail Page**
   - Product information
   - Stock levels
   - Stock batches
   - Stock movements history
4. **Product Form Component**

### 6.2 Stock Management

**Goal:** Stock receipts, adjustments, and reconciliation.

**Tasks:**

1. **Stock Receipts**
   - Create stock receipt
   - Batch tracking
   - Expiry date management
2. **Stock Adjustments**
   - Adjust stock levels
   - Reason tracking
3. **Stock Movements History**
4. **Stock Reconciliation** (Manager/Owner)

### 6.3 Suppliers & Purchase Orders

**Goal:** Manage suppliers and purchase orders.

**Tasks:**

1. **Suppliers Management**
2. **Purchase Orders**
   - Create PO
   - Receive goods
   - Track status

---

## Phase 7: Polish & Optimization

### Priority: MEDIUM
### Estimated Time: Ongoing

### 7.1 Performance Optimization

**Tasks:**
- Lazy loading for all modules
- Virtual scrolling for large lists
- Image optimization
- Bundle size optimization
- Caching strategies

### 7.2 Accessibility

**Tasks:**
- ARIA labels
- Keyboard navigation
- Screen reader support
- Color contrast compliance
- Focus management

### 7.3 Testing

**Tasks:**
- Unit tests for services
- Component tests
- E2E tests for critical flows
- Accessibility tests

### 7.4 Documentation

**Tasks:**
- Component documentation
- API service documentation
- User guides (optional)

---

## Technical Decisions

### State Management Strategy

**Decision:** Use NgRx for global state (auth, UI), services for module-specific state.

**Rationale:**
- NgRx provides predictable state management
- Good for complex auth flows
- Services are simpler for module-specific data
- Can migrate to NgRx Entity later if needed

### Component Library

**Decision:** PrimeNG as primary UI library.

**Rationale:**
- Rich component set
- Good calendar component
- Enterprise feel
- Easy Portuguese localization
- Already installed

### Forms Strategy

**Decision:** Reactive Forms for all forms.

**Rationale:**
- Better type safety
- Easier validation
- Better testability
- Angular best practice

### API Communication

**Decision:** RxJS Observables with HttpClient.

**Rationale:**
- Native Angular approach
- Good error handling
- Cancellation support
- Type-safe with TypeScript

### Routing Strategy

**Decision:** Lazy loading for all feature modules.

**Rationale:**
- Better performance
- Smaller initial bundle
- Better code organization

### Styling Strategy

**Decision:** SCSS with PrimeNG theming.

**Rationale:**
- PrimeNG uses SCSS
- Easy customization
- Component-scoped styles

---

## Best Practices

### Code Organization

1. **Feature Modules**
   - Each module is self-contained
   - Module-specific components, services, types
   - Shared code in `src/shared/`

2. **Component Structure**
   ```
   component-name/
   ├── component-name.component.ts
   ├── component-name.component.html
   ├── component-name.component.scss
   ├── component-name.component.spec.ts
   └── component-name.types.ts (if needed)
   ```

3. **Service Structure**
   - One service per domain entity
   - API services in `modules/*/api/`
   - Business logic services in `modules/*/services/`

### Type Safety

1. **Always define types**
   - No `any` types
   - Use interfaces for API responses
   - Use types for domain models

2. **DTO Mapping**
   - Map API DTOs to domain models if needed
   - Keep API layer separate from domain layer

### Error Handling

1. **Centralized Error Handling**
   - Use error interceptor
   - Transform API errors to user-friendly messages
   - Log errors for debugging

2. **User Feedback**
   - Show toast notifications for actions
   - Display validation errors inline
   - Handle 409 conflicts with resolution UI

### Performance

1. **Lazy Loading**
   - All feature modules lazy loaded
   - Route-level code splitting

2. **OnPush Change Detection**
   - Use OnPush for better performance
   - Immutable data patterns

3. **Virtual Scrolling**
   - For large lists (100+ items)
   - Use PrimeNG p-table virtual scrolling

### Security

1. **Token Management**
   - Store tokens securely
   - Automatic token refresh
   - Clear tokens on logout

2. **Route Guards**
   - Protect all authenticated routes
   - Role-based route protection
   - Store-scoped access control

### Testing Strategy

1. **Unit Tests**
   - Services: 80%+ coverage
   - Components: Critical paths
   - Utilities: 100% coverage

2. **Integration Tests**
   - API service integration
   - Auth flow
   - Critical user flows

3. **E2E Tests**
   - Login flow
   - Appointment booking
   - POS checkout
   - Invoice creation

---

## Implementation Checklist

### Phase 1: Foundation ✅
- [ ] HTTP client setup
- [ ] API service layer
- [ ] NgRx store setup
- [ ] Shared atoms (Button, Input)
- [ ] Form field molecule
- [ ] Error handling
- [ ] Route guards

### Phase 2: Auth & Layout ✅
- [ ] Auth service
- [ ] Login page
- [ ] Main layout
- [ ] Sidebar
- [ ] Header
- [ ] Dashboard placeholder
- [ ] Route configuration

### Phase 3: Administrative ✅
- [ ] Customers CRUD
- [ ] Pets CRUD
- [ ] Company settings
- [ ] Store settings
- [ ] User management

### Phase 4: Services ✅
- [ ] Services catalog
- [ ] Appointment calendar
- [ ] Appointment management

### Phase 5: Financial ✅
- [ ] POS interface
- [ ] Invoice management
- [ ] Transaction history

### Phase 6: Inventory ✅
- [ ] Product catalog
- [ ] Stock management
- [ ] Suppliers & POs

### Phase 7: Polish ✅
- [ ] Performance optimization
- [ ] Accessibility
- [ ] Testing
- [ ] Documentation

---

## Quick Start Guide

### Step 1: Set Up Foundation (Day 1)

```bash
# 1. Create base API service
touch src/shared/services/api.service.ts

# 2. Create interceptors
touch src/shared/interceptors/auth.interceptor.ts
touch src/shared/interceptors/error.interceptor.ts

# 3. Set up NgRx
npm install @ngrx/store @ngrx/effects @ngrx/store-devtools

# 4. Create auth store
mkdir -p src/shared/stores/auth
```

### Step 2: Implement Authentication (Day 2-3)

```bash
# 1. Create auth service
touch src/modules/users/services/auth.service.ts
touch src/modules/users/api/auth.api.service.ts

# 2. Create login page
ng generate component modules/users/pages/login

# 3. Create route guards
touch src/shared/guards/auth.guard.ts
```

### Step 3: Create Main Layout (Day 3-4)

```bash
# 1. Create layout components
ng generate component shared/components/templates/main-layout
ng generate component shared/components/organisms/sidebar
ng generate component shared/components/organisms/header
```

### Step 4: Build First Feature (Day 4-5)

```bash
# Start with Customers (simplest CRUD)
ng generate component modules/administrative/pages/customers-list
ng generate component modules/administrative/pages/customer-detail
ng generate component modules/administrative/components/customer-form
```

---

## Dependencies & Setup

### Required Angular Modules

Ensure these are imported in `app.config.ts`:

```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
```

### PrimeNG Setup

1. Import PrimeNG modules as needed
2. Configure PrimeNG theme in `styles.scss`
3. Set up PrimeNG icons

### Environment Variables

Already configured:
- ✅ `apiUrl: 'http://localhost:3000/api/v1'`
- ✅ Firebase configuration

---

## Backend Integration Points

### Authentication Endpoints
- ✅ `POST /api/v1/auth/login` - Ready
- ✅ `POST /api/v1/auth/logout` - Ready
- ✅ `POST /api/v1/auth/refresh` - Ready

### Administrative Endpoints
- ✅ `GET /api/v1/customers` - Ready
- ✅ `POST /api/v1/customers` - Ready
- ✅ `GET /api/v1/pets` - Ready
- ✅ `POST /api/v1/pets` - Ready

### Services Endpoints
- ✅ `GET /api/v1/services` - Ready
- ✅ `GET /api/v1/appointments` - Ready
- ✅ `POST /api/v1/appointments` - Ready

### Financial Endpoints
- ✅ `GET /api/v1/invoices` - Ready
- ✅ `POST /api/v1/transactions` - Ready

### Inventory Endpoints
- ✅ `GET /api/v1/products` - Ready
- ✅ `POST /api/v1/products` - Ready

**All endpoints are documented in Swagger:** `http://localhost:3000/api/v1/docs`

---

## Risk Mitigation

### Potential Issues

1. **CORS Configuration**
   - ✅ Backend has CORS configured
   - ⚠️ Verify CORS allows frontend origin

2. **Token Expiration**
   - Implement automatic refresh
   - Handle 401 gracefully

3. **Large Data Sets**
   - Use pagination
   - Implement virtual scrolling

4. **Concurrent Updates**
   - Handle 409 conflicts
   - Show resolution UI

---

## Success Criteria

### Phase 1 Complete When:
- ✅ HTTP client working
- ✅ API service can call backend
- ✅ NgRx store functional
- ✅ Basic components render

### Phase 2 Complete When:
- ✅ User can log in
- ✅ Token stored and used
- ✅ Main layout displays
- ✅ Routes work with guards

### Phase 3 Complete When:
- ✅ Can view customers list
- ✅ Can create/edit customer
- ✅ Can view pets
- ✅ Can create/edit pet

### MVP Complete When:
- ✅ Login works
- ✅ Can manage customers
- ✅ Can create appointments
- ✅ Can process transactions (POS)
- ✅ Can view invoices

---

## Next Steps

1. **Start with Phase 1** - Foundation is critical
2. **Test incrementally** - Verify each phase before moving on
3. **Use Swagger** - Reference API documentation constantly
4. **Follow patterns** - Establish patterns early, reuse them
5. **Iterate** - Build, test, refine

---

## Resources

- **Backend API Docs**: `http://localhost:3000/api/v1/docs`
- **Frontend Architecture**: `docs/frontend/frontend-architecture.md`
- **API Endpoints**: `docs/api/rest-endpoints.md`
- **Tech Stack**: `docs/tech-stack.md`
- **Permissions Matrix**: `docs/rbac/permissions-matrix.md`

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-17  
**Maintained By**: Development Team

