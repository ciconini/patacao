# Administrative Module — Use Cases Index

This directory contains PDC/PDL (Product Design Document/Product Design Language) Use Case Specifications for the Administrative Module of the Patacão Petshop Management System.

## Overview

The Administrative Module handles business profile management, store configuration, customer and pet records, staff management, and data import/export operations. All use cases follow Clean/Hexagonal Architecture principles and use the official entities and terminology defined in the ER model.

## Use Cases

### Company & Store Management

1. **[UC-ADMIN-001: Create Company Profile](UC-ADMIN-001-create-company-profile.md)**
   - **Actors:** Owner
   - **Purpose:** Create a new company/business profile with fiscal data
   - **Key Features:** NIF validation, fiscal settings, address management

2. **[UC-ADMIN-002: Update Company Profile](UC-ADMIN-002-update-company-profile.md)**
   - **Actors:** Owner, Manager
   - **Purpose:** Update existing company information with role-based field restrictions
   - **Key Features:** Fiscal field protection (Owner only), partial updates, audit trail

3. **[UC-ADMIN-003: Create Store](UC-ADMIN-003-create-store.md)**
   - **Actors:** Owner, Manager
   - **Purpose:** Create a new store location with opening hours and contact information
   - **Key Features:** Opening hours validation, timezone support, company association

4. **[UC-ADMIN-004: Update Store](UC-ADMIN-004-update-store.md)**
   - **Actors:** Owner, Manager
   - **Purpose:** Update store information including opening hours and contact details
   - **Key Features:** Opening hours updates, partial updates, impact validation

### Customer Management

5. **[UC-ADMIN-005: Create Customer](UC-ADMIN-005-create-customer.md)**
   - **Actors:** Staff, Manager, Owner
   - **Purpose:** Create a new customer record with contact info and consent flags
   - **Key Features:** GDPR compliance, consent management, contact validation

6. **[UC-ADMIN-006: Update Customer](UC-ADMIN-006-update-customer.md)**
   - **Actors:** Staff, Manager, Owner
   - **Purpose:** Update customer information including consent flags
   - **Key Features:** Partial updates, consent change tracking, audit trail

7. **[UC-ADMIN-007: Archive Customer](UC-ADMIN-007-archive-customer.md)**
   - **Actors:** Manager, Owner
   - **Purpose:** Archive or permanently delete customer records
   - **Key Features:** Soft delete (archive) vs hard delete, referential integrity checks, GDPR compliance

8. **[UC-ADMIN-010: Search Customers](UC-ADMIN-010-search-customers.md)**
   - **Actors:** Staff, Manager, Accountant, Owner
   - **Purpose:** Search and filter customer records with pagination
   - **Key Features:** Multi-field search, pagination, sorting, archive filtering

9. **[UC-ADMIN-011: Import Customers](UC-ADMIN-011-import-customers.md)**
   - **Actors:** Manager, Owner
   - **Purpose:** Bulk import customers from CSV or JSON files
   - **Key Features:** File validation, duplicate handling, error reporting, dry-run mode

### Pet Management

8. **[UC-ADMIN-008: Create Pet](UC-ADMIN-008-create-pet.md)**
   - **Actors:** Staff, Manager, Veterinarian, Owner
   - **Purpose:** Create a new pet record linked to a customer
   - **Key Features:** Inline customer creation, microchip validation, vaccination records, medical notes

### User & Staff Management

9. **[UC-ADMIN-009: Create User (Staff)](UC-ADMIN-009-create-user-staff.md)**
   - **Actors:** Owner, Manager
   - **Purpose:** Create a new system user account with roles and store assignments
   - **Key Features:** Role-based access control, Owner role restriction, store assignments, service skills, working hours

## Use Case Structure

Each use case specification follows this structure:

1. **Objective** - Purpose and scope of the use case
2. **Actors and Permissions** - Who can perform this action and required RBAC roles
3. **Preconditions** - Conditions that must be met before execution
4. **Postconditions** - Expected state after successful execution
5. **Inputs** - Required and optional input fields with constraints
6. **Outputs** - Response data structure
7. **Main Flow** - Step-by-step execution flow
8. **Alternative Flows** - Error scenarios and edge cases
9. **Business Rules** - Domain-specific rules and constraints
10. **Validation Rules** - Field-level validation requirements
11. **Error Conditions** - Error codes and messages
12. **Events Triggered** - Domain events and system events
13. **Repository Methods Required** - Data access interface requirements
14. **Notes or Limitations** - Implementation considerations and future enhancements

## Common Patterns

### Authorization
- **Owner:** Full access to all administrative functions, including fiscal data
- **Manager:** Can manage stores, customers, pets, and staff (except Owner creation)
- **Staff:** Can create/update customers and pets, limited administrative access
- **Accountant:** Read access to financial data, customer search
- **Veterinarian:** Can create/update pets and access medical records

### Validation
- All use cases include comprehensive validation rules
- Portuguese-specific validations (NIF, phone, postal code)
- GDPR compliance considerations (consent flags, data retention)

### Audit Trail
- All create/update/delete operations are logged
- Audit logs include user, timestamp, and before/after values
- Required for compliance and troubleshooting

### Error Handling
- Standardized HTTP status codes (400, 401, 403, 404, 409, 500)
- Detailed error messages with error codes
- User-friendly error descriptions

## Dependencies

These use cases depend on:
- **Domain Entities:** Company, Store, Customer, Pet, User, Role (from ER model)
- **Users & Access Control Module:** Authentication, RBAC, permissions
- **Services Module:** Service skills, appointment scheduling (for validation)
- **Financial Module:** Invoice generation (for fiscal data validation)

## Related Documentation

- [Domain Entities](../../domain/entities.md)
- [ER Diagram](../../domain/er-diagram.txt)
- [Administrative Requirements](../../modules/administrative-requirements.md)
- [REST API Endpoints](../../api/rest-endpoints.md)
- [Backend Architecture](../../architecture/backend-architecture.md)

## Implementation Notes

1. **Clean Architecture:** Use cases are designed for Clean/Hexagonal Architecture
2. **Repository Pattern:** All data access goes through repository interfaces
3. **Domain Events:** Use cases publish domain events for integration
4. **Transaction Safety:** Multi-step operations use database transactions
5. **Performance:** Pagination and indexing considerations included
6. **Security:** RBAC enforcement, input validation, audit logging

## Financial Module Use Cases

### Invoice Management

1. **[UC-FIN-001: Create Invoice (Draft)](UC-FIN-001-create-invoice-draft.md)**
   - **Actors:** Staff, Manager, Accountant, Owner
   - **Purpose:** Create a new invoice in draft status with line items and VAT calculation
   - **Key Features:** Draft status, line items, VAT calculation, company/store validation

2. **[UC-FIN-002: Issue Invoice](UC-FIN-002-issue-invoice.md)**
   - **Actors:** Manager, Accountant, Owner
   - **Purpose:** Issue a draft invoice, making it a legally valid fiscal document
   - **Key Features:** NIF validation, sequential invoice numbering, immutability

3. **[UC-FIN-003: Mark Invoice as Paid](UC-FIN-003-mark-invoice-paid.md)**
   - **Actors:** Staff, Manager, Accountant, Owner
   - **Purpose:** Record manual payment for an issued invoice
   - **Key Features:** Payment method recording, payment date, external reference

4. **[UC-FIN-004: Void Invoice](UC-FIN-004-void-invoice.md)**
   - **Actors:** Manager, Accountant, Owner
   - **Purpose:** Void an issued invoice while preserving audit trail
   - **Key Features:** Void reason, immutability, audit logging

### Credit Notes

5. **[UC-FIN-005: Create Credit Note](UC-FIN-005-create-credit-note.md)**
   - **Actors:** Manager, Accountant, Owner
   - **Purpose:** Create a credit note linked to an original invoice for refunds or corrections
   - **Key Features:** Invoice linking, amount validation, outstanding amount calculation

### Transaction Management

6. **[UC-FIN-006: Create Transaction (POS)](UC-FIN-006-create-transaction.md)**
   - **Actors:** Staff, Manager, Accountant, Owner
   - **Purpose:** Create a new transaction representing POS checkout or sale
   - **Key Features:** Line items, draft invoice creation, payment status

7. **[UC-FIN-007: Complete Transaction](UC-FIN-007-complete-transaction.md)**
   - **Actors:** Staff, Manager, Accountant, Owner
   - **Purpose:** Complete a pending transaction, triggering stock decrement and payment recording
   - **Key Features:** Stock decrement, payment recording, atomic completion

### Financial Exports

8. **[UC-FIN-008: Create Financial Export](UC-FIN-008-create-financial-export.md)**
   - **Actors:** Accountant, Owner
   - **Purpose:** Generate financial export for accountant reconciliation and VAT reporting
   - **Key Features:** Period-based export, CSV/JSON format, SFTP delivery, fiscal compliance

## Inventory Module Use Cases

### Product Management

1. **[UC-INV-005: Create Product](UC-INV-005-create-product.md)**
   - **Actors:** Manager, Owner
   - **Purpose:** Create a product with SKU, pricing, VAT, stock tracking
   - **Key Features:** SKU uniqueness, VAT validation, stock_tracked flag, reorder threshold

2. **[UC-INV-006: Update Product](UC-INV-006-update-product.md)**
   - **Actors:** Manager, Owner
   - **Purpose:** Update product information including pricing, VAT, stock tracking
   - **Key Features:** Partial updates, SKU immutability, audit trail

3. **[UC-INV-007: Search Products](UC-INV-007-search-products.md)**
   - **Actors:** Staff, Manager, Accountant, Owner
   - **Purpose:** Search and filter products by SKU, name, category, supplier, stock status
   - **Key Features:** Multi-field search, pagination, low-stock filtering, current stock calculation

### Supplier Management

4. **[UC-INV-008: Create Supplier](UC-INV-008-create-supplier.md)**
   - **Actors:** Manager, Owner
   - **Purpose:** Create a supplier record with contact information and lead time
   - **Key Features:** Contact validation, default lead time, supplier reference

### Stock Operations

5. **[UC-INV-001: Receive Stock (Stock Receipt)](UC-INV-001-receive-stock.md)**
   - **Actors:** Staff, Manager, Owner
   - **Purpose:** Record incoming stock with batches/expiry and stock movements
   - **Key Features:** PO link (optional), batch/expiry, receipt movements, audit

6. **[UC-INV-002: Stock Adjustment](UC-INV-002-stock-adjustment.md)**
   - **Actors:** Manager, Owner (Staff if permitted)
   - **Purpose:** Manually adjust stock up/down with reason and audit trail
   - **Key Features:** Positive/negative movement, reason required, permission gating

7. **[UC-INV-003: Inventory Reservation](UC-INV-003-inventory-reservation.md)**
   - **Actors:** Staff, Manager, Owner
   - **Purpose:** Reserve stock for appointments or transactions to prevent oversell
   - **Key Features:** Available-stock check, override rules, expiry/release, audit

8. **[UC-INV-010: Release Inventory Reservation](UC-INV-010-release-inventory-reservation.md)**
   - **Actors:** Staff, Manager, Owner
   - **Purpose:** Release a reservation, making stock available again
   - **Key Features:** Reservation state validation, available stock increase, audit trail

9. **[UC-INV-004: Stock Reconciliation (Stock Count)](UC-INV-004-stock-reconciliation.md)**
   - **Actors:** Manager, Owner
   - **Purpose:** Perform stock take, apply variances via movements, audit results
   - **Key Features:** Variance movements, batch-aware, counting vs apply modes

10. **[UC-INV-009: Search Stock Movements](UC-INV-009-search-stock-movements.md)**
    - **Actors:** Staff, Manager, Accountant, Owner
    - **Purpose:** Search stock movement history by product, date range, reason, location
    - **Key Features:** Date range filtering, reason filtering, pagination, audit trail access

### Purchase Order Management

11. **[UC-INV-011: Create Purchase Order](UC-INV-011-create-purchase-order.md)**
    - **Actors:** Manager, Owner
    - **Purpose:** Create a purchase order for ordering products from supplier
    - **Key Features:** PO lines, supplier reference, draft/ordered status, total calculation

12. **[UC-INV-012: Receive Purchase Order](UC-INV-012-receive-purchase-order.md)**
    - **Actors:** Staff, Manager, Owner
    - **Purpose:** Receive goods against a purchase order, creating stock batches and movements
    - **Key Features:** Partial receipts, batch/expiry, PO status update, stock creation

## Users & Access Control Module Use Cases

### Authentication

1. **[UC-AUTH-001: User Login](UC-AUTH-001-user-login.md)**
   - **Actors:** Any User (Staff, Manager, Owner, Accountant, Veterinarian)
   - **Purpose:** Authenticate user with email/username and password, create session
   - **Key Features:** Rate limiting, account lockout, token generation, audit logging

2. **[UC-AUTH-002: User Logout](UC-AUTH-002-user-logout.md)**
   - **Actors:** Any Authenticated User
   - **Purpose:** Log out user by invalidating session and tokens
   - **Key Features:** Session revocation, token invalidation, audit logging

3. **[UC-AUTH-003: Password Reset Request](UC-AUTH-003-password-reset-request.md)**
   - **Actors:** Any User (forgot password scenario)
   - **Purpose:** Request password reset token via email
   - **Key Features:** Rate limiting, secure token generation, email delivery, user enumeration prevention

4. **[UC-AUTH-004: Password Reset Confirm](UC-AUTH-004-password-reset-confirm.md)**
   - **Actors:** Any User (resetting password)
   - **Purpose:** Confirm password reset with token and update password
   - **Key Features:** Token validation, password complexity, session revocation, audit logging

### User Management

5. **[UC-AUTH-005: Create User](UC-AUTH-005-create-user.md)**
   - **Actors:** Manager, Owner
   - **Purpose:** Create new user account with roles and store assignments
   - **Key Features:** Role assignment, Owner creation restriction, email uniqueness, audit logging

6. **[UC-AUTH-006: Search Users](UC-AUTH-006-search-users.md)**
   - **Actors:** Manager, Owner
   - **Purpose:** Search and filter user accounts by various criteria
   - **Key Features:** Multi-field search, role filtering, store filtering, pagination, security (password_hash excluded)

## Future Enhancements

Potential additional use cases:

### Administrative Module:
- Update Pet
- Search Pets
- Update User (Staff)
- Archive User
- Search Users
- Export Customers
- Import Pets
- Store Assignment Management
- Role Permission Management

### Financial Module:
- Update Invoice (Draft)
- Search Invoices
- Search Transactions
- Update Transaction
- Cancel Transaction
- Download Financial Export
- Scheduled Financial Exports
- Invoice PDF Generation
- Payment Reconciliation

### Inventory Module:
- Update Supplier
- Search Suppliers
- Search Purchase Orders
- Delete Product (safe delete)
- Stock Transfer Between Locations
- Low-Stock Alerts & Notifications
- Batch/Expiry Management (edit/merge)
- Import/Export Product Catalog
- Search Stock Batches

### Services Module:
- Update Service
- Search Services
- Create Service Package
- Update Appointment
- Check-in Appointment
- Reschedule Appointment
- Search Appointments (Calendar View)
- Create Service Notes
- Manage Reminder Templates

### Users & Access Control Module:
- Update User
- Delete/Archive User
- Create Role
- Update Role
- Search Roles
- Search Sessions
- Revoke Session
- Enable/Disable MFA
- Access Delegation

---

**Document Version:** 1.4  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

