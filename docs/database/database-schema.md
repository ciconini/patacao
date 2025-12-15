# Database Schema Documentation — Patacão Petshop

## Overview

This document provides a comprehensive reference for the Patacão Petshop database schema, including all tables, columns, constraints, indexes, and relationships.

**Database:** PostgreSQL 15.x  
**Character Set:** UTF-8  
**Timezone:** UTC (application converts to Europe/Lisbon for display)

---

## Schema Conventions

- **Primary Keys:** All tables use UUID primary keys for distributed safety
- **Timestamps:** All timestamps stored in UTC, converted to Europe/Lisbon for display
- **JSON Fields:** Used for structured data (addresses, opening hours, metadata)
- **Foreign Keys:** Enforced at database level with appropriate ON DELETE actions
- **Indexes:** Created on frequently queried fields and foreign keys

---

## Table Reference

### 1. companies

Business profile and fiscal information for the petshop company.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `name` | VARCHAR(255) | NOT NULL | Company name |
| `nif` | VARCHAR(32) | NOT NULL | Portuguese fiscal number (NIF) |
| `address` | JSON | NULL | Structured address: `{street, city, postal_code, country}` |
| `tax_regime` | VARCHAR(64) | NULL | Tax regime code |
| `default_vat_rate` | DECIMAL(5,2) | NULL | Default VAT rate (e.g., 23.00) |
| `phone` | VARCHAR(32) | NULL | Contact phone |
| `email` | VARCHAR(255) | NULL | Contact email |
| `website` | VARCHAR(255) | NULL | Company website |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NULL | Last update timestamp |

**Indexes:**
- `idx_companies_nif` on `nif` (unique constraint)

**Business Rules:**
- NIF must be unique across all companies
- NIF must validate against Portuguese NIF format (9 digits + checksum)
- Only one company per system instance (business rule, not enforced at DB level)

---

### 2. stores

Physical store locations belonging to a company.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `company_id` | UUID | NOT NULL, FK → companies(id) | Parent company |
| `name` | VARCHAR(255) | NOT NULL | Store name |
| `address` | JSON | NULL | Structured address |
| `email` | VARCHAR(255) | NULL | Store email |
| `phone` | VARCHAR(32) | NULL | Store phone |
| `opening_hours` | JSON | NOT NULL | Weekly schedule structure |
| `timezone` | VARCHAR(64) | NOT NULL DEFAULT 'Europe/Lisbon' | Store timezone (IANA) |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NULL | Last update timestamp |

**Foreign Keys:**
- `company_id` → `companies(id)` ON DELETE RESTRICT

**Indexes:**
- `idx_stores_company_id` on `company_id`

**Opening Hours JSON Structure:**
```json
{
  "monday": {"open": "09:00", "close": "18:00", "closed": false},
  "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
  ...
}
```

---

### 3. inventory_locations

Optional inventory locations within stores for finer stock tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `store_id` | UUID | NOT NULL, FK → stores(id) | Parent store |
| `name` | VARCHAR(255) | NOT NULL | Location name (e.g., "Warehouse", "Front Counter") |
| `description` | TEXT | NULL | Location description |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NULL | Last update timestamp |

**Foreign Keys:**
- `store_id` → `stores(id)` ON DELETE CASCADE

**Indexes:**
- `idx_inventory_locations_store_id` on `store_id`

---

### 4. users

System users (staff, managers, accountants, veterinarians).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `email` | VARCHAR(255) | NOT NULL UNIQUE | User email (login) |
| `full_name` | VARCHAR(255) | NOT NULL | User full name |
| `phone` | VARCHAR(32) | NULL | Contact phone |
| `username` | VARCHAR(128) | NULL UNIQUE | Optional username |
| `password_hash` | VARCHAR(255) | NULL | Bcrypt/Argon2 hash |
| `active` | BOOLEAN | NOT NULL DEFAULT TRUE | Account active status |
| `working_hours` | JSON | NULL | Staff working hours structure |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NULL | Last update timestamp |

**Indexes:**
- `idx_users_email` on `email` (unique)
- `idx_users_username` on `username` (unique, partial where username is not null)

**Working Hours JSON Structure:**
```json
{
  "monday": {"start": "09:00", "end": "17:00"},
  "tuesday": {"start": "09:00", "end": "17:00"},
  ...
}
```

**Business Rules:**
- User must have at least one role (enforced at application level)
- Password hash is NULL for external auth (future SSO)

---

### 5. roles

System roles with permissions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | VARCHAR(64) | PRIMARY KEY | Canonical role ID (Owner, Manager, Staff, Accountant, Veterinarian) |
| `name` | VARCHAR(128) | NOT NULL | Role display name |
| `permissions` | JSON | NULL | Array of permission keys |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NULL | Last update timestamp |

**Standard Roles:**
- `Owner` - Full system access
- `Manager` - Store management, staff management
- `Staff` - Basic operations (appointments, POS)
- `Accountant` - Financial operations, exports
- `Veterinarian` - Medical records, appointments

---

### 6. user_roles

Join table linking users to roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `user_id` | UUID | NOT NULL, FK → users(id) | User reference |
| `role_id` | VARCHAR(64) | NOT NULL, FK → roles(id) | Role reference |
| `assigned_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Assignment timestamp |

**Foreign Keys:**
- `user_id` → `users(id)` ON DELETE CASCADE
- `role_id` → `roles(id)` ON DELETE RESTRICT

**Indexes:**
- `idx_user_roles_user_id` on `user_id`
- `idx_user_roles_role_id` on `role_id`
- Unique constraint on `(user_id, role_id)`

---

### 7. user_service_skills

Join table linking users to services they can perform.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `user_id` | UUID | NOT NULL, FK → users(id) | User reference |
| `service_id` | UUID | NOT NULL, FK → services(id) | Service reference |

**Foreign Keys:**
- `user_id` → `users(id)` ON DELETE CASCADE
- `service_id` → `services(id)` ON DELETE CASCADE

**Indexes:**
- `idx_user_service_skills_user_id` on `user_id`
- `idx_user_service_skills_service_id` on `service_id`
- Unique constraint on `(user_id, service_id)`

---

### 8. customers

Customer records (pet owners).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `full_name` | VARCHAR(255) | NOT NULL | Customer full name |
| `email` | VARCHAR(255) | NULL | Customer email |
| `phone` | VARCHAR(32) | NULL | Customer phone |
| `address` | JSON | NULL | Structured address |
| `consent_marketing` | BOOLEAN | NOT NULL DEFAULT FALSE | Marketing consent (GDPR) |
| `consent_reminders` | BOOLEAN | NOT NULL DEFAULT TRUE | Appointment reminders consent |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NULL | Last update timestamp |

**Indexes:**
- `idx_customers_email` on `email` (partial where email is not null)
- `idx_customers_phone` on `phone` (partial where phone is not null)

**Business Rules:**
- `consent_reminders` must be TRUE to send appointment reminders
- Customer can be archived (soft delete) but not hard deleted if linked to pets/appointments

---

### 9. pets

Pet records linked to customers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `customer_id` | UUID | NOT NULL, FK → customers(id) | Owner customer |
| `name` | VARCHAR(255) | NOT NULL | Pet name |
| `species` | VARCHAR(64) | NOT NULL | Species (e.g., "dog", "cat") |
| `breed` | VARCHAR(128) | NULL | Breed |
| `date_of_birth` | DATE | NULL | Date of birth |
| `microchip_id` | VARCHAR(64) | NULL | Microchip identifier |
| `medical_notes` | TEXT | NULL | Medical notes |
| `vaccination` | JSON | NULL | Vaccination records |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NULL | Last update timestamp |

**Foreign Keys:**
- `customer_id` → `customers(id)` ON DELETE RESTRICT

**Indexes:**
- `idx_pets_customer_id` on `customer_id`
- `idx_pets_microchip_id` on `microchip_id` (partial where microchip_id is not null)

**Vaccination JSON Structure:**
```json
[
  {"vaccine": "Rabies", "date": "2024-01-15", "next_due": "2025-01-15"},
  ...
]
```

---

### 10. services

Service catalog (grooming, consultations, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `name` | VARCHAR(255) | NOT NULL | Service name |
| `description` | TEXT | NULL | Service description |
| `duration_minutes` | INTEGER | NOT NULL | Service duration in minutes |
| `price` | DECIMAL(12,2) | NOT NULL | Service price |
| `consumes_inventory` | BOOLEAN | NOT NULL DEFAULT FALSE | Whether service consumes stock |
| `consumed_items` | JSON | NULL | Inventory items consumed: `[{product_id, quantity}]` |
| `tags` | JSON | NULL | Service tags for categorization |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NULL | Last update timestamp |

**Indexes:**
- `idx_services_name` on `name`

---

### 11. service_packages

Optional service packages/bundles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `name` | VARCHAR(255) | NOT NULL | Package name |
| `description` | TEXT | NULL | Package description |
| `services` | JSON | NOT NULL | Ordered list: `[{service_id, quantity}]` |
| `bundle_price` | DECIMAL(12,2) | NULL | Optional bundle price |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NULL | Last update timestamp |

---

### 12. appointments

Appointment bookings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `store_id` | UUID | NOT NULL, FK → stores(id) | Store location |
| `customer_id` | UUID | NOT NULL, FK → customers(id) | Customer |
| `pet_id` | UUID | NOT NULL, FK → pets(id) | Pet |
| `start_at` | TIMESTAMP | NOT NULL | Appointment start time |
| `end_at` | TIMESTAMP | NOT NULL | Appointment end time |
| `status` | VARCHAR(32) | NOT NULL | Status: booked, confirmed, checked_in, completed, cancelled, needs-reschedule |
| `created_by` | UUID | NULL, FK → users(id) | User who created appointment |
| `staff_id` | UUID | NULL, FK → users(id) | Assigned staff member |
| `notes` | TEXT | NULL | Appointment notes |
| `recurrence_id` | UUID | NULL | Recurrence group identifier |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NULL | Last update timestamp |

**Foreign Keys:**
- `store_id` → `stores(id)` ON DELETE RESTRICT
- `customer_id` → `customers(id)` ON DELETE RESTRICT
- `pet_id` → `pets(id)` ON DELETE RESTRICT
- `created_by` → `users(id)` ON DELETE SET NULL
- `staff_id` → `users(id)` ON DELETE SET NULL

**Indexes:**
- `idx_appointments_store_id` on `store_id`
- `idx_appointments_start_at` on `start_at`
- `idx_appointments_staff_id` on `staff_id` (partial where staff_id is not null)
- Composite index on `(store_id, start_at, end_at)` for conflict detection

**Business Rules:**
- Appointment must fall within store opening hours
- Double-booking prevented (application-level check with database locking)

---

### 13. appointment_service_lines

Join table linking appointments to services.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `appointment_id` | UUID | NOT NULL, FK → appointments(id) | Appointment reference |
| `service_id` | UUID | NOT NULL, FK → services(id) | Service reference |
| `quantity` | INTEGER | NOT NULL DEFAULT 1 | Service quantity |
| `price_override` | DECIMAL(12,2) | NULL | Optional price override |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NULL | Last update timestamp |

**Foreign Keys:**
- `appointment_id` → `appointments(id)` ON DELETE CASCADE
- `service_id` → `services(id)` ON DELETE RESTRICT

**Indexes:**
- `idx_appointment_service_lines_appointment_id` on `appointment_id`

---

### 14. products

Product catalog (inventory items).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `sku` | VARCHAR(64) | NOT NULL UNIQUE | Stock keeping unit |
| `name` | VARCHAR(255) | NOT NULL | Product name |
| `description` | TEXT | NULL | Product description |
| `category` | VARCHAR(128) | NULL | Product category |
| `unit_price` | DECIMAL(12,2) | NOT NULL | Unit price |
| `vat_rate` | DECIMAL(5,2) | NOT NULL | VAT rate (e.g., 23.00) |
| `stock_tracked` | BOOLEAN | NOT NULL DEFAULT TRUE | Whether stock is tracked |
| `reorder_threshold` | INTEGER | NULL | Low stock threshold |
| `supplier_id` | UUID | NULL, FK → suppliers(id) | Default supplier |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NULL | Last update timestamp |

**Foreign Keys:**
- `supplier_id` → `suppliers(id)` ON DELETE SET NULL

**Indexes:**
- `idx_products_sku` on `sku` (unique)
- `idx_products_supplier_id` on `supplier_id` (partial where supplier_id is not null)

**Business Rules:**
- SKU must be unique across all products
- If `stock_tracked` is FALSE, stock movements are not required

---

### 15. suppliers

Supplier records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `name` | VARCHAR(255) | NOT NULL | Supplier name |
| `contact_email` | VARCHAR(255) | NULL | Contact email |
| `phone` | VARCHAR(32) | NULL | Contact phone |
| `default_lead_time_days` | INTEGER | NULL | Default lead time in days |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NULL | Last update timestamp |

**Indexes:**
- `idx_suppliers_name` on `name`

---

### 16. stock_batches

Stock batches for batch/expiry tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `product_id` | UUID | NOT NULL, FK → products(id) | Product reference |
| `batch_number` | VARCHAR(128) | NULL | Batch number |
| `quantity` | INTEGER | NOT NULL | Batch quantity |
| `expiry_date` | DATE | NULL | Expiry date |
| `received_at` | TIMESTAMP | NOT NULL | Receipt timestamp |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NULL | Last update timestamp |

**Foreign Keys:**
- `product_id` → `products(id)` ON DELETE CASCADE

**Indexes:**
- `idx_stock_batches_product_id` on `product_id`
- `idx_stock_batches_batch_number` on `batch_number` (partial where batch_number is not null)
- `idx_stock_batches_expiry_date` on `expiry_date` (partial where expiry_date is not null)

**Business Rules:**
- Expired batches cannot be sold (application-level check)

---

### 17. stock_movements

Immutable stock movement history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `product_id` | UUID | NOT NULL, FK → products(id) | Product reference |
| `batch_id` | UUID | NULL, FK → stock_batches(id) | Batch reference (if applicable) |
| `quantity_change` | INTEGER | NOT NULL | Quantity change (positive for receipt, negative for decrement) |
| `reason` | VARCHAR(64) | NOT NULL | Movement reason: receipt, sale, adjustment, transfer, reservation_release |
| `performed_by` | UUID | NOT NULL, FK → users(id) | User who performed movement |
| `location_id` | UUID | NULL, FK → inventory_locations(id) | Location reference |
| `reference_id` | UUID | NULL | Generic reference (invoice_id, purchase_order_id, etc.) |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Movement timestamp |

**Foreign Keys:**
- `product_id` → `products(id)` ON DELETE RESTRICT
- `batch_id` → `stock_batches(id)` ON DELETE SET NULL
- `performed_by` → `users(id)` ON DELETE RESTRICT
- `location_id` → `inventory_locations(id)` ON DELETE SET NULL

**Indexes:**
- `idx_stock_movements_product_id` on `product_id`
- `idx_stock_movements_created_at` on `created_at`
- `idx_stock_movements_reference_id` on `reference_id` (partial where reference_id is not null)

**Business Rules:**
- Stock movements are immutable (append-only)
- Corrections require compensating movements

---

### 18. inventory_reservations

Stock reservations for appointments or transactions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `product_id` | UUID | NOT NULL, FK → products(id) | Product reference |
| `quantity` | INTEGER | NOT NULL | Reserved quantity |
| `reserved_for` | UUID | NOT NULL | Target entity ID (appointment_id or transaction_id) |
| `reserved_type` | VARCHAR(32) | NOT NULL | Type: appointment, transaction |
| `expires_at` | TIMESTAMP | NULL | Reservation expiry |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |

**Foreign Keys:**
- `product_id` → `products(id)` ON DELETE CASCADE

**Indexes:**
- `idx_inventory_reservations_product_id` on `product_id`
- `idx_inventory_reservations_reserved_for` on `reserved_for`
- Composite index on `(reserved_type, reserved_for)`

**Business Rules:**
- Reservations reduce available stock
- Expired reservations are automatically released (background job)

---

### 19. purchase_orders

Purchase orders to suppliers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `supplier_id` | UUID | NOT NULL, FK → suppliers(id) | Supplier reference |
| `store_id` | UUID | NULL, FK → stores(id) | Store reference |
| `status` | VARCHAR(32) | NOT NULL | Status: draft, ordered, received, cancelled |
| `created_by` | UUID | NOT NULL, FK → users(id) | User who created PO |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NULL | Last update timestamp |

**Foreign Keys:**
- `supplier_id` → `suppliers(id)` ON DELETE RESTRICT
- `store_id` → `stores(id)` ON DELETE SET NULL
- `created_by` → `users(id)` ON DELETE RESTRICT

**Indexes:**
- `idx_purchase_orders_supplier_id` on `supplier_id`
- `idx_purchase_orders_status` on `status`

---

### 20. purchase_order_lines

Purchase order line items.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `purchase_order_id` | UUID | NOT NULL, FK → purchase_orders(id) | PO reference |
| `product_id` | UUID | NOT NULL, FK → products(id) | Product reference |
| `quantity` | INTEGER | NOT NULL | Ordered quantity |
| `unit_price` | DECIMAL(12,2) | NOT NULL | Unit price at order time |
| `received_quantity` | INTEGER | NULL DEFAULT 0 | Received quantity |

**Foreign Keys:**
- `purchase_order_id` → `purchase_orders(id)` ON DELETE CASCADE
- `product_id` → `products(id)` ON DELETE RESTRICT

**Indexes:**
- `idx_purchase_order_lines_purchase_order_id` on `purchase_order_id`

---

### 21. invoices

Invoice records (fiscal documents).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `company_id` | UUID | NOT NULL, FK → companies(id) | Company reference |
| `store_id` | UUID | NOT NULL, FK → stores(id) | Store reference |
| `invoice_number` | VARCHAR(128) | NOT NULL | Sequential invoice number |
| `issued_at` | TIMESTAMP | NOT NULL | Issue timestamp |
| `buyer_customer_id` | UUID | NULL, FK → customers(id) | Customer reference |
| `subtotal` | DECIMAL(12,2) | NOT NULL | Subtotal (excl. VAT) |
| `vat_total` | DECIMAL(12,2) | NOT NULL | Total VAT |
| `total` | DECIMAL(12,2) | NOT NULL | Total amount |
| `status` | VARCHAR(32) | NOT NULL | Status: draft, issued, paid, cancelled, refunded |
| `paid_at` | TIMESTAMP | NULL | Payment timestamp |
| `payment_method` | VARCHAR(64) | NULL | Payment method |
| `external_reference` | VARCHAR(255) | NULL | External payment reference |
| `created_by` | UUID | NOT NULL, FK → users(id) | User who created invoice |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NULL | Last update timestamp |

**Foreign Keys:**
- `company_id` → `companies(id)` ON DELETE RESTRICT
- `store_id` → `stores(id)` ON DELETE RESTRICT
- `buyer_customer_id` → `customers(id)` ON DELETE SET NULL
- `created_by` → `users(id)` ON DELETE RESTRICT

**Indexes:**
- `idx_invoices_invoice_number` on `invoice_number` (unique per company/store)
- `idx_invoices_issued_at` on `issued_at`
- Composite index on `(company_id, store_id, invoice_number)` for uniqueness

**Business Rules:**
- Invoice number must be sequential per company/store
- Once issued, invoice is immutable (void/credit-note required for corrections)

---

### 22. invoice_lines

Invoice line items.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `invoice_id` | UUID | NOT NULL, FK → invoices(id) | Invoice reference |
| `description` | TEXT | NOT NULL | Line description |
| `product_id` | UUID | NULL, FK → products(id) | Product reference (if applicable) |
| `service_id` | UUID | NULL, FK → services(id) | Service reference (if applicable) |
| `quantity` | INTEGER | NOT NULL | Quantity |
| `unit_price` | DECIMAL(12,2) | NOT NULL | Unit price |
| `vat_rate` | DECIMAL(5,2) | NOT NULL | VAT rate |
| `line_total` | DECIMAL(12,2) | NOT NULL | Line total (incl. VAT) |

**Foreign Keys:**
- `invoice_id` → `invoices(id)` ON DELETE CASCADE
- `product_id` → `products(id)` ON DELETE SET NULL
- `service_id` → `services(id)` ON DELETE SET NULL

**Indexes:**
- `idx_invoice_lines_invoice_id` on `invoice_id`

---

### 23. credit_notes

Credit notes for invoice refunds.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `invoice_id` | UUID | NOT NULL, FK → invoices(id) | Original invoice |
| `issued_at` | TIMESTAMP | NOT NULL | Issue timestamp |
| `reason` | TEXT | NOT NULL | Credit note reason |
| `amount` | DECIMAL(12,2) | NOT NULL | Credit amount |
| `created_by` | UUID | NOT NULL, FK → users(id) | User who created credit note |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |

**Foreign Keys:**
- `invoice_id` → `invoices(id)` ON DELETE RESTRICT
- `created_by` → `users(id)` ON DELETE RESTRICT

**Indexes:**
- `idx_credit_notes_invoice_id` on `invoice_id`

**Business Rules:**
- Credit note amount cannot exceed invoice outstanding amount

---

### 24. transactions

POS transactions (sales).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `store_id` | UUID | NOT NULL, FK → stores(id) | Store reference |
| `invoice_id` | UUID | NOT NULL, FK → invoices(id) | Linked invoice |
| `total_amount` | DECIMAL(12,2) | NOT NULL | Transaction total |
| `payment_status` | VARCHAR(32) | NOT NULL | Status: pending, paid_manual, refunded |
| `created_by` | UUID | NOT NULL, FK → users(id) | User who created transaction |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | NULL | Last update timestamp |

**Foreign Keys:**
- `store_id` → `stores(id)` ON DELETE RESTRICT
- `invoice_id` → `invoices(id)` ON DELETE RESTRICT
- `created_by` → `users(id)` ON DELETE RESTRICT

**Indexes:**
- `idx_transactions_store_id` on `store_id`
- `idx_transactions_created_at` on `created_at`

---

### 25. transaction_lines

Transaction line items.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `transaction_id` | UUID | NOT NULL, FK → transactions(id) | Transaction reference |
| `product_id` | UUID | NULL, FK → products(id) | Product reference |
| `service_id` | UUID | NULL, FK → services(id) | Service reference |
| `quantity` | INTEGER | NOT NULL | Quantity |
| `unit_price` | DECIMAL(12,2) | NOT NULL | Unit price |
| `line_total` | DECIMAL(12,2) | NOT NULL | Line total |

**Foreign Keys:**
- `transaction_id` → `transactions(id)` ON DELETE CASCADE
- `product_id` → `products(id)` ON DELETE SET NULL
- `service_id` → `services(id)` ON DELETE SET NULL

**Indexes:**
- `idx_transaction_lines_transaction_id` on `transaction_id`

---

### 26. financial_exports

Financial export records for accounting.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `company_id` | UUID | NOT NULL, FK → companies(id) | Company reference |
| `period_start` | TIMESTAMP | NOT NULL | Export period start |
| `period_end` | TIMESTAMP | NOT NULL | Export period end |
| `format` | VARCHAR(16) | NOT NULL | Export format: CSV, JSON |
| `file_path` | VARCHAR(1024) | NULL | File storage path |
| `sftp_reference` | JSON | NULL | SFTP upload reference |
| `status` | VARCHAR(32) | NOT NULL DEFAULT 'pending' | Status: pending, processing, completed, failed |
| `created_by` | UUID | NOT NULL, FK → users(id) | User who created export |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Creation timestamp |

**Foreign Keys:**
- `company_id` → `companies(id)` ON DELETE RESTRICT
- `created_by` → `users(id)` ON DELETE RESTRICT

**Indexes:**
- `idx_financial_exports_company_id` on `company_id`
- `idx_financial_exports_period` on `(period_start, period_end)`

---

### 27. audit_logs

Immutable audit log for compliance.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `entity_type` | VARCHAR(128) | NOT NULL | Entity type (e.g., "Invoice", "Customer") |
| `entity_id` | UUID | NOT NULL | Entity identifier |
| `action` | VARCHAR(64) | NOT NULL | Action: create, update, delete, void, issue, etc. |
| `performed_by` | UUID | NOT NULL, FK → users(id) | User who performed action |
| `timestamp` | TIMESTAMP | NOT NULL DEFAULT NOW() | Action timestamp |
| `meta` | JSON | NULL | Additional metadata (before/after snapshots) |

**Foreign Keys:**
- `performed_by` → `users(id)` ON DELETE RESTRICT

**Indexes:**
- Composite index on `(entity_type, entity_id)`
- `idx_audit_logs_performed_by` on `performed_by`
- `idx_audit_logs_timestamp` on `timestamp`
- `idx_audit_logs_action` on `action`

**Business Rules:**
- Audit logs are append-only (immutable)
- Cannot be deleted or modified

---

### 28. sessions

User session records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Session identifier (used as token) |
| `user_id` | UUID | NOT NULL, FK → users(id) | User reference |
| `created_at` | TIMESTAMP | NOT NULL DEFAULT NOW() | Session creation |
| `expires_at` | TIMESTAMP | NOT NULL | Session expiry |
| `revoked` | BOOLEAN | NOT NULL DEFAULT FALSE | Revocation status |

**Foreign Keys:**
- `user_id` → `users(id)` ON DELETE CASCADE

**Indexes:**
- `idx_sessions_user_id` on `user_id`
- `idx_sessions_revoked` on `revoked`
- `idx_sessions_expires_at` on `expires_at` (for cleanup)

**Business Rules:**
- Sessions are automatically cleaned up after expiry
- Revoked sessions are immediately invalid

---

## Relationships Summary

### One-to-Many Relationships

- `companies` 1 → * `stores`
- `stores` 1 → * `inventory_locations`
- `stores` 1 → * `appointments`
- `stores` 1 → * `transactions`
- `customers` 1 → * `pets`
- `customers` 1 → * `appointments`
- `customers` 1 → * `invoices`
- `pets` 1 → * `appointments`
- `appointments` 1 → * `appointment_service_lines`
- `products` 1 → * `stock_batches`
- `products` 1 → * `stock_movements`
- `products` 1 → * `inventory_reservations`
- `suppliers` 1 → * `purchase_orders`
- `purchase_orders` 1 → * `purchase_order_lines`
- `invoices` 1 → * `invoice_lines`
- `invoices` 1 → * `credit_notes`
- `invoices` 1 → * `transactions`
- `transactions` 1 → * `transaction_lines`
- `services` 1 → * `appointment_service_lines`
- `users` 1 → * `sessions`
- `users` 1 → * `audit_logs` (performed_by)

### Many-to-Many Relationships

- `users` * ↔ * `roles` (via `user_roles`)
- `users` * ↔ * `services` (via `user_service_skills`)

---

## Index Strategy

### Primary Indexes
- All tables have UUID primary keys with B-tree indexes

### Foreign Key Indexes
- All foreign keys are indexed for join performance

### Query Optimization Indexes
- `appointments`: Composite index on `(store_id, start_at, end_at)` for conflict detection
- `invoices`: Composite index on `(company_id, store_id, invoice_number)` for uniqueness and lookup
- `stock_movements`: Index on `created_at` for time-based queries
- `audit_logs`: Composite index on `(entity_type, entity_id)` for entity history queries

### Partial Indexes
- `users.username`: Partial index where username is not null
- `customers.email`: Partial index where email is not null
- `customers.phone`: Partial index where phone is not null
- `stock_batches.batch_number`: Partial index where batch_number is not null
- `stock_batches.expiry_date`: Partial index where expiry_date is not null

---

## Data Types Reference

| Type | Usage | Notes |
|------|-------|-------|
| UUID | Primary keys, foreign keys | PostgreSQL uuid type |
| VARCHAR(n) | Variable-length strings | Max length enforced |
| TEXT | Long text fields | Unlimited length |
| INTEGER | Counts, quantities | 32-bit signed integer |
| DECIMAL(12,2) | Monetary amounts | 12 digits total, 2 decimal places |
| DECIMAL(5,2) | Percentages, rates | 5 digits total, 2 decimal places |
| BOOLEAN | Flags | true/false |
| TIMESTAMP | Date and time | Stored in UTC |
| DATE | Date only | No time component |
| JSON | Structured data | PostgreSQL jsonb type for indexing |

---

## Constraints and Validation

### Check Constraints
- `appointments.end_at > appointments.start_at` (application-level, not DB constraint)
- `invoices.total = invoices.subtotal + invoices.vat_total` (application-level)
- `stock_movements.quantity_change != 0` (application-level)

### Unique Constraints
- `companies.nif` (unique)
- `users.email` (unique)
- `users.username` (unique, nullable)
- `products.sku` (unique)
- `invoices.invoice_number` (unique per company/store)

### Foreign Key Constraints
- All foreign keys have appropriate ON DELETE actions:
  - `RESTRICT`: Critical relationships (invoices, appointments)
  - `CASCADE`: Dependent records (lines, join tables)
  - `SET NULL`: Optional references (staff assignments)

---

## Performance Considerations

1. **UUID Primary Keys**: Use UUID v4 for distributed safety, but consider INT surrogate keys for high-performance scenarios if needed.

2. **Index Maintenance**: Regularly analyze index usage and remove unused indexes.

3. **JSON Fields**: Use `jsonb` type for JSON fields to enable indexing and efficient queries.

4. **Partitioning**: Consider partitioning large tables (`audit_logs`, `stock_movements`) by date for better performance.

5. **Connection Pooling**: Use connection pooling (PgBouncer) to manage database connections efficiently.

6. **Read Replicas**: Use read replicas for reporting and dashboard queries.

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

