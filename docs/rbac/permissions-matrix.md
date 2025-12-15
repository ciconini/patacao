# RBAC Permissions Matrix — Patacão Petshop Management System

## System Roles

The system defines five primary roles:

1. **Owner** — Full system access, fiscal operations, user management, system configuration
2. **Manager** — Operational management, staff supervision, most administrative and financial operations
3. **Staff** — Day-to-day operations, customer service, appointment management, basic transactions
4. **Accountant** — Financial operations, reporting, audit access, invoice management
5. **Veterinarian** — Medical services, pet care, appointment completion, medical notes

---

## Resources and Modules

### Authentication & Users Module
- **User** — System user accounts
- **Role** — Role definitions
- **Session** — User sessions
- **Authentication** — Login, logout, password reset

### Administrative Module
- **Company** — Business profile and fiscal information
- **Store** — Store locations and configuration
- **Customer** — Customer records
- **Pet** — Pet records

### Services Module
- **Service** — Service catalog
- **ServicePackage** — Service bundles
- **Appointment** — Appointment scheduling and management
- **Reminder** — Appointment reminders

### Financial Module
- **Invoice** — Sales invoices
- **CreditNote** — Credit notes and refunds
- **Transaction** — Point-of-sale transactions
- **FinancialExport** — Financial data exports

### Inventory Module
- **Product** — Product catalog
- **Supplier** — Supplier records
- **StockBatch** — Stock batch tracking
- **StockMovement** — Stock movement history
- **InventoryReservation** — Inventory reservations
- **PurchaseOrder** — Purchase orders
- **StockReconciliation** — Stock reconciliation

### Audit & Operational Module
- **AuditLog** — System audit logs
- **Health** — System health checks

---

## Actions

| Action | Description |
|--------|-------------|
| `create` | Create new resource |
| `read` | View single resource |
| `update` | Modify existing resource |
| `delete` | Delete resource |
| `list` | Search/list multiple resources |
| `export` | Export data to file |
| `import` | Import data from file |
| `issue` | Issue/finalize document (invoice) |
| `mark_paid` | Mark invoice/transaction as paid |
| `void` | Void/cancel document |
| `confirm` | Confirm appointment |
| `checkin` | Check-in customer for appointment |
| `complete` | Complete appointment/service |
| `cancel` | Cancel appointment |
| `reschedule` | Reschedule appointment |
| `archive` | Archive resource (soft delete) |
| `revoke` | Revoke session/access |
| `receive` | Receive goods (stock/Purchase Order) |
| `adjust` | Adjust stock quantities |
| `reserve` | Reserve inventory |
| `release` | Release inventory reservation |
| `reconcile` | Reconcile stock counts |

---

## Permissions Matrix

### Authentication & Users Module

| Resource | Action | Owner | Manager | Staff | Accountant | Veterinarian | Notes |
|----------|--------|:-----:|:-------:|:-----:|:----------:|:------------:|-------|
| **User** | create | ✅ | ✅ | ❌ | ❌ | ❌ | Manager cannot create Owner users |
| **User** | read | ✅ | ✅ | ✅* | ✅* | ❌ | *Self only for Staff/Accountant |
| **User** | update | ✅ | ✅ | ✅* | ✅* | ❌ | *Self only with restricted fields |
| **User** | delete | ✅ | ✅* | ❌ | ❌ | ❌ | *Manager can deactivate, not delete |
| **User** | list | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Role** | read | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Role** | list | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Session** | read | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Session** | list | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Session** | revoke | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Authentication** | login | ✅ | ✅ | ✅ | ✅ | ✅ | Public endpoint |
| **Authentication** | logout | ✅ | ✅ | ✅ | ✅ | ✅ | Any authenticated user |
| **Authentication** | password_reset | ✅ | ✅ | ✅ | ✅ | ✅ | Public endpoint |

### Administrative Module

| Resource | Action | Owner | Manager | Staff | Accountant | Veterinarian | Notes |
|----------|--------|:-----:|:-------:|:-----:|:----------:|:------------:|-------|
| **Company** | read | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Company** | update | ✅ | ✅* | ❌ | ❌ | ❌ | *Manager: non-fiscal fields only |
| **Store** | create | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Store** | read | ✅ | ✅ | ✅* | ❌ | ❌ | *Assigned stores only |
| **Store** | update | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Store** | delete | ✅ | ✅* | ❌ | ❌ | ❌ | *Manager with constraints |
| **Store** | list | ✅ | ✅ | ✅* | ❌ | ❌ | *Assigned stores only |
| **Customer** | create | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **Customer** | read | ✅ | ✅ | ✅ | ✅ | ❌ | |
| **Customer** | update | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **Customer** | delete | ✅ | ✅ | ❌ | ❌ | ❌ | Owner only (hard delete) |
| **Customer** | archive | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Customer** | list | ✅ | ✅ | ✅ | ✅ | ❌ | |
| **Customer** | export | ✅ | ✅ | ❌ | ✅ | ❌ | |
| **Customer** | import | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Pet** | create | ✅ | ✅ | ✅ | ❌ | ✅ | |
| **Pet** | read | ✅ | ✅ | ✅ | ❌ | ✅ | |
| **Pet** | update | ✅ | ✅ | ✅ | ❌ | ✅ | |
| **Pet** | delete | ✅ | ✅ | ❌ | ❌ | ❌ | Owner/Manager only |

### Services Module

| Resource | Action | Owner | Manager | Staff | Accountant | Veterinarian | Notes |
|----------|--------|:-----:|:-------:|:-----:|:----------:|:------------:|-------|
| **Service** | create | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Service** | read | ✅ | ✅ | ✅ | ❌ | ✅ | |
| **Service** | update | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Service** | delete | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Service** | list | ✅ | ✅ | ✅ | ❌ | ✅ | |
| **ServicePackage** | create | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **ServicePackage** | read | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **ServicePackage** | list | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **Appointment** | create | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **Appointment** | read | ✅ | ✅ | ✅ | ❌ | ✅ | |
| **Appointment** | update | ✅ | ✅ | ✅* | ❌ | ❌ | *Own store only |
| **Appointment** | delete | ❌ | ❌ | ❌ | ❌ | ❌ | Use cancel instead |
| **Appointment** | list | ✅ | ✅ | ✅ | ❌ | ✅ | |
| **Appointment** | confirm | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **Appointment** | checkin | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **Appointment** | complete | ✅ | ✅ | ✅ | ❌ | ✅ | |
| **Appointment** | cancel | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **Appointment** | reschedule | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **Reminder** | read | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Reminder** | update | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Reminder** | send | ✅ | ✅ | ❌ | ❌ | ❌ | Admin/debug only |

### Financial Module

| Resource | Action | Owner | Manager | Staff | Accountant | Veterinarian | Notes |
|----------|--------|:-----:|:-------:|:-----:|:----------:|:------------:|-------|
| **Invoice** | create | ✅ | ✅ | ✅* | ✅ | ❌ | *Draft only for Staff |
| **Invoice** | read | ✅ | ✅ | ✅* | ✅ | ❌ | *Own store only for Staff |
| **Invoice** | update | ✅ | ✅ | ✅* | ✅ | ❌ | *Draft only for Staff |
| **Invoice** | delete | ❌ | ❌ | ❌ | ❌ | ❌ | Use void instead |
| **Invoice** | list | ✅ | ✅ | ✅* | ✅ | ❌ | *Own store only for Staff |
| **Invoice** | issue | ✅ | ✅ | ❌ | ✅ | ❌ | Requires NIF validation |
| **Invoice** | mark_paid | ✅ | ✅ | ✅ | ✅ | ❌ | Staff: cashier operations |
| **Invoice** | void | ✅ | ✅ | ❌ | ✅ | ❌ | Requires audit log |
| **CreditNote** | create | ✅ | ✅ | ❌ | ✅ | ❌ | Requires audit log |
| **CreditNote** | read | ✅ | ✅ | ❌ | ✅ | ❌ | |
| **CreditNote** | list | ✅ | ✅ | ❌ | ✅ | ❌ | |
| **Transaction** | create | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **Transaction** | read | ✅ | ✅ | ✅ | ✅ | ❌ | |
| **Transaction** | update | ❌ | ❌ | ❌ | ❌ | ❌ | Immutable after creation |
| **Transaction** | delete | ❌ | ❌ | ❌ | ❌ | ❌ | Use void/refund |
| **Transaction** | list | ✅ | ✅ | ✅ | ✅ | ❌ | |
| **Transaction** | complete | ✅ | ✅ | ✅ | ❌ | ❌ | Triggers stock decrement |
| **FinancialExport** | create | ✅ | ✅ | ❌ | ✅ | ❌ | |
| **FinancialExport** | read | ✅ | ✅ | ❌ | ✅ | ❌ | |
| **FinancialExport** | list | ✅ | ✅ | ❌ | ✅ | ❌ | |

### Inventory Module

| Resource | Action | Owner | Manager | Staff | Accountant | Veterinarian | Notes |
|----------|--------|:-----:|:-------:|:-----:|:----------:|:------------:|-------|
| **Product** | create | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Product** | read | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **Product** | update | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Product** | delete | ✅ | ✅ | ❌ | ❌ | ❌ | Safe delete only |
| **Product** | list | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **Supplier** | create | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Supplier** | read | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **Supplier** | update | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **Supplier** | list | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **StockBatch** | read | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **StockBatch** | list | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **StockMovement** | read | ✅ | ✅ | ✅ | ✅ | ❌ | |
| **StockMovement** | list | ✅ | ✅ | ✅ | ✅ | ❌ | |
| **StockMovement** | create | ✅ | ✅ | ✅* | ❌ | ❌ | *Via receipt/receive only |
| **InventoryReservation** | create | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **InventoryReservation** | read | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **InventoryReservation** | release | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **PurchaseOrder** | create | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **PurchaseOrder** | read | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **PurchaseOrder** | list | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **PurchaseOrder** | receive | ✅ | ✅ | ✅ | ❌ | ❌ | |
| **StockReconciliation** | create | ✅ | ✅ | ❌ | ❌ | ❌ | |
| **StockAdjustment** | create | ✅ | ✅ | ✅* | ❌ | ❌ | *Staff only when explicitly permitted |
| **StockReceipt** | create | ✅ | ✅ | ✅ | ❌ | ❌ | |

### Audit & Operational Module

| Resource | Action | Owner | Manager | Staff | Accountant | Veterinarian | Notes |
|----------|--------|:-----:|:-------:|:-----:|:----------:|:------------:|-------|
| **AuditLog** | read | ✅ | ✅ | ❌ | ✅ | ❌ | Accountant has Auditor role |
| **AuditLog** | list | ✅ | ✅ | ❌ | ✅ | ❌ | |
| **Health** | read | ✅ | ✅ | ❌ | ❌ | ❌ | Internal networks only |

---

## Restrictions and Special Rules

### Owner Role Restrictions

1. **Owner Creation:** Only existing Owner can create new Owner users
2. **Owner Deletion:** Owner accounts cannot be deleted; ownership transfer required
3. **Fiscal Fields:** Only Owner can modify company fiscal fields (NIF, tax_regime, default_vat_rate)
4. **System Configuration:** Owner has exclusive access to system-wide configuration

### Manager Role Restrictions

1. **Owner Management:** Cannot create or delete Owner users
2. **Fiscal Fields:** Cannot modify company fiscal fields (NIF, tax_regime, default_vat_rate)
3. **User Deletion:** Can deactivate users but cannot hard delete
4. **Store Deletion:** Store deletion may require Owner approval (business rule dependent)

### Staff Role Restrictions

1. **Invoice Issuance:** Cannot issue invoices; can only create drafts
2. **Invoice Editing:** Can only edit draft invoices; cannot modify issued invoices
3. **Store Access:** Limited to assigned stores only
4. **User Management:** Cannot view or manage other users (except self with restrictions)
5. **Stock Adjustments:** Requires explicit permission; typically Manager/Owner only
6. **Financial Exports:** No access to financial export functionality
7. **Audit Logs:** No access to audit logs

### Accountant Role Restrictions

1. **Operational Operations:** Cannot create appointments, manage customers, or handle inventory
2. **Invoice Issuance:** Can issue invoices (requires NIF validation)
3. **Credit Notes:** Can create credit notes (requires audit log)
4. **Financial Exports:** Can create and access financial exports
5. **Audit Access:** Has Auditor role for audit log access
6. **Store Access:** No store-specific restrictions (financial data is company-wide)

### Veterinarian Role Restrictions

1. **Financial Operations:** No access to invoices, transactions, or financial exports
2. **Inventory Management:** No access to inventory operations
3. **User Management:** No access to user management
4. **Appointment Completion:** Can complete appointments and add medical notes
5. **Pet Management:** Full access to pet records and medical information

### Self-Access Rules

1. **User Profile:** Staff and Accountant can read and update their own profile with restrictions:
   - Cannot change email or username (immutable)
   - Cannot modify roles
   - Cannot modify active status
   - Can update: full_name, phone, working_hours (if applicable)

2. **Session Management:** Users cannot revoke their own sessions via API (security measure)

### Store-Scoped Access

1. **Staff Access:** Staff can only access resources for assigned stores:
   - Store information (read only)
   - Customers (full access)
   - Pets (full access)
   - Appointments (full access for assigned stores)
   - Invoices (read only for assigned stores)
   - Transactions (full access for assigned stores)
   - Inventory (full access for assigned stores)

2. **Manager Access:** Managers have access to all stores within their company

3. **Owner Access:** Owners have access to all stores across all companies

### Status-Based Restrictions

1. **Draft Invoices:** Only Staff and above can edit draft invoices; once issued, only Manager/Accountant can void
2. **Appointment Status:** 
   - Only booked/confirmed appointments can be cancelled
   - Only confirmed/checked_in appointments can be completed
   - Completed appointments cannot be modified
3. **Purchase Orders:** Only ordered POs can be received
4. **Transactions:** Completed transactions are immutable

---

## Compliance and Auditing

### Audit Requirements

1. **Financial Operations:** All financial operations must create audit log entries:
   - Invoice issuance
   - Invoice voiding
   - Credit note creation
   - Financial export creation
   - Stock adjustments (negative adjustments)

2. **User Management:** All user management operations are audited:
   - User creation
   - User role changes
   - User deletion/deactivation
   - Session revocation

3. **Sensitive Operations:** Operations requiring audit logs:
   - Stock adjustments
   - Customer archiving
   - Invoice voiding
   - Credit note creation
   - Stock reconciliation

### GDPR Compliance

1. **Data Access:** Users can request access to their personal data
2. **Data Deletion:** Customer data deletion requires Owner approval and audit log
3. **Consent Management:** Customer consent flags (marketing, reminders) must be respected
4. **Data Export:** Customers can request data export (Owner/Manager only)

### Portuguese Fiscal Compliance

1. **Invoice Numbering:** Sequential invoice numbering per company/store (validated on issuance)
2. **NIF Validation:** Company NIF must be valid Portuguese format before invoice issuance
3. **VAT Rates:** VAT rates must comply with Portuguese tax regulations (0%, 6%, 13%, 23%)
4. **Audit Trail:** Financial operations must maintain immutable audit trail for tax authorities

### Audit Log Retention

1. **Financial Logs:** Retained for 10 years (Portuguese tax law requirement)
2. **Security Logs:** Retained for 2 years (login attempts, password changes)
3. **Operational Logs:** Retained for 1 year (general operations)
4. **Tamper Evidence:** Audit logs are append-only and cryptographically signed

---

## Delegation Rules

### Temporary Role Delegation

1. **Delegation Authority:** Only Owner and Manager can delegate permissions
2. **Delegation Scope:** Can delegate specific permissions or entire roles
3. **Delegation Duration:** Must specify start and end dates
4. **Delegation Restrictions:**
   - Cannot delegate Owner role
   - Cannot delegate permissions not held by delegator
   - Delegation automatically expires at end date
   - Delegation can be revoked by delegator or Owner

### Delegation Use Cases

1. **Vacation Coverage:** Manager delegates appointment management to Staff during vacation
2. **Temporary Promotion:** Staff temporarily receives Manager permissions for specific store
3. **Project-Based Access:** Temporary access to specific resources for project work

### Delegation Audit

1. **Delegation Creation:** All delegations are logged in audit log
2. **Delegation Usage:** Actions performed under delegation are marked in audit log
3. **Delegation Revocation:** Revocation is logged with reason

---

## Minimum Permissions Required for System Operation

### Essential Permissions (All Roles)

1. **Authentication:**
   - `authentication:login` — Required for system access
   - `authentication:logout` — Required for session management
   - `authentication:password_reset` — Required for password recovery

2. **Self-Profile:**
   - `user:read:self` — View own profile
   - `user:update:self` — Update own profile (restricted fields)

### Role-Specific Minimum Permissions

#### Staff Minimum Permissions

1. **Customer Management:**
   - `customer:create`
   - `customer:read`
   - `customer:update`
   - `customer:list`

2. **Pet Management:**
   - `pet:create`
   - `pet:read`
   - `pet:update`
   - `pet:list`

3. **Appointment Management:**
   - `appointment:create`
   - `appointment:read`
   - `appointment:update` (own store)
   - `appointment:list`
   - `appointment:confirm`
   - `appointment:checkin`
   - `appointment:complete`
   - `appointment:cancel`
   - `appointment:reschedule`

4. **Service Access:**
   - `service:read`
   - `service:list`

5. **Transaction Operations:**
   - `transaction:create`
   - `transaction:read`
   - `transaction:list`
   - `transaction:complete`

6. **Invoice Operations:**
   - `invoice:create` (draft only)
   - `invoice:read` (own store)
   - `invoice:update` (draft only)
   - `invoice:list` (own store)
   - `invoice:mark_paid`

7. **Inventory Operations:**
   - `product:read`
   - `product:list`
   - `stock_receipt:create`
   - `stock_movement:read`
   - `inventory_reservation:create`
   - `inventory_reservation:release`
   - `purchase_order:receive`

#### Manager Minimum Permissions

Includes all Staff permissions plus:

1. **User Management:**
   - `user:create` (except Owner)
   - `user:read`
   - `user:update`
   - `user:delete` (deactivate only)
   - `user:list`
   - `role:read`
   - `role:list`
   - `session:read`
   - `session:list`
   - `session:revoke`

2. **Store Management:**
   - `store:create`
   - `store:read`
   - `store:update`
   - `store:delete` (with constraints)
   - `store:list`

3. **Company Management:**
   - `company:read`
   - `company:update` (non-fiscal fields)

4. **Financial Operations:**
   - `invoice:issue`
   - `invoice:void`
   - `credit_note:create`
   - `financial_export:create`
   - `financial_export:read`
   - `financial_export:list`

5. **Inventory Management:**
   - `product:create`
   - `product:update`
   - `product:delete`
   - `supplier:create`
   - `supplier:update`
   - `stock_adjustment:create`
   - `purchase_order:create`
   - `stock_reconciliation:create`

6. **Service Management:**
   - `service:create`
   - `service:update`
   - `service:delete`
   - `service_package:create`
   - `reminder:read`
   - `reminder:update`

7. **Customer Management:**
   - `customer:archive`
   - `customer:import`
   - `customer:export`

#### Accountant Minimum Permissions

1. **Financial Operations:**
   - `invoice:create`
   - `invoice:read`
   - `invoice:update`
   - `invoice:list`
   - `invoice:issue`
   - `invoice:void`
   - `invoice:mark_paid`
   - `credit_note:create`
   - `credit_note:read`
   - `credit_note:list`
   - `transaction:read`
   - `transaction:list`
   - `financial_export:create`
   - `financial_export:read`
   - `financial_export:list`

2. **Customer Access:**
   - `customer:read`
   - `customer:list`
   - `customer:export`

3. **Inventory Access:**
   - `stock_movement:read`
   - `stock_movement:list`

4. **Audit Access:**
   - `audit_log:read`
   - `audit_log:list`

#### Veterinarian Minimum Permissions

1. **Pet Management:**
   - `pet:create`
   - `pet:read`
   - `pet:update`
   - `pet:list`

2. **Appointment Management:**
   - `appointment:read`
   - `appointment:list`
   - `appointment:complete`

3. **Service Access:**
   - `service:read`
   - `service:list`

#### Owner Minimum Permissions

Includes all Manager permissions plus:

1. **Owner-Exclusive Operations:**
   - `user:create` (including Owner)
   - `user:delete` (including Owner)
   - `company:update` (including fiscal fields)
   - `store:delete` (unrestricted)
   - `customer:delete` (hard delete)
   - `pet:delete`

2. **System Configuration:**
   - Full access to all system configuration
   - Access to all audit logs
   - Access to system health endpoints

---

## Permission Key Format

Permissions follow the format: `{resource}:{action}`

Examples:
- `user:create`
- `invoice:issue`
- `appointment:complete`
- `stock_adjustment:create`

Wildcard permissions:
- `{resource}:*` — All actions on resource
- `*:*` — All permissions (Owner only)

---

## Permission Check Implementation

1. **Centralized Service:** All permission checks go through centralized authorization service
2. **Performance:** Permission checks must complete within 50ms
3. **Caching:** Permission checks are cached per session
4. **Store Scoping:** Store-scoped permissions are validated against user's assigned stores
5. **Status Validation:** Resource status is validated before action (e.g., draft invoices only)

---

## Notes

1. **Multi-Role Users:** Users can have multiple roles; permissions are union of all role permissions
2. **Permission Inheritance:** Higher roles inherit permissions from lower roles (e.g., Manager inherits Staff permissions)
3. **Dynamic Permissions:** Some permissions may be granted dynamically via delegation
4. **Permission Revocation:** Permissions can be revoked immediately; active sessions are invalidated
5. **Audit Trail:** All permission changes are logged in audit system

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

