# Domain Entity Validation Report

This document validates all created domain entities against the specification in `entities.md`.

## Validation Summary

### Entities Created (22 total)
1. ✅ Company
2. ✅ Store
3. ✅ User
4. ✅ Role
5. ✅ Customer
6. ✅ Pet
7. ✅ Service
8. ✅ ServicePackage
9. ✅ Appointment
10. ✅ AppointmentServiceLine
11. ✅ Product
12. ✅ Supplier
13. ✅ StockBatch
14. ✅ StockMovement
15. ✅ InventoryReservation
16. ✅ PurchaseOrder
17. ✅ Invoice
18. ✅ CreditNote
19. ✅ Transaction
20. ✅ FinancialExport
21. ✅ AuditLog
22. ✅ Session

### Additional Entities (Not in main entities.md list)
- Employee (found in codebase, may be part of administrative module)
- Owner (found in codebase, may be part of administrative module)

---

## Detailed Validation

### 1. Company ✅
**Status**: Valid
**Location**: `backend/src/modules/administrative/domain/company.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `name` (required)
- ✅ `nif` (required) - Portuguese NIF validation implemented
- ✅ `address` (required, structured)
- ✅ `tax_regime` (required)
- ✅ `default_vat_rate` (optional, 0-100 validation)
- ✅ `phone` (optional)
- ✅ `email` (optional, validated)
- ✅ `website` (optional)
- ✅ `created_at`, `updated_at`

**Business Rules**:
- ✅ NIF validation against Portuguese format
- ✅ VAT rate validation (0-100)
- ✅ Owner role restriction noted in comments (use case level)

---

### 2. Store ✅
**Status**: Valid
**Location**: `backend/src/modules/administrative/domain/store.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `company_id` (required)
- ✅ `name` (required)
- ✅ `address` (optional, structured)
- ✅ `email` (optional, validated)
- ✅ `phone` (optional)
- ✅ `opening_hours` (required, structured weekly schedule)
- ✅ `timezone` (default Europe/Lisbon)
- ✅ `created_at`, `updated_at`

**Business Rules**:
- ✅ Opening hours validation
- ✅ Timezone default to Europe/Lisbon

---

### 3. User ✅
**Status**: Valid
**Location**: `backend/src/modules/users/domain/user.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `email` (required, validated)
- ✅ `full_name` (required)
- ✅ `phone` (optional)
- ✅ `username` (optional)
- ✅ `password_hash` (optional)
- ✅ `roles` (list of Role IDs, required, at least one)
- ✅ `working_hours` (optional, structured)
- ✅ `service_skills` (optional list)
- ✅ `active` (boolean, default true)
- ✅ `created_at`, `updated_at`

**Business Rules**:
- ✅ Must have at least one role (validated)
- ✅ Email validation
- ✅ Working hours structure matches Store pattern

---

### 4. Role ✅
**Status**: Valid
**Location**: `backend/src/modules/users/domain/role.entity.ts`

**Properties Check**:
- ✅ `id` (required, string)
- ✅ `name` (required, enum: Owner, Manager, Staff, Accountant, Veterinarian)
- ✅ `permissions` (list)
- ✅ `created_at`, `updated_at`

**Business Rules**:
- ✅ Role name validation against enum values

---

### 5. Customer ✅
**Status**: Valid
**Location**: `backend/src/modules/administrative/domain/customer.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `full_name` (required)
- ✅ `email` (optional, validated)
- ✅ `phone` (optional)
- ✅ `address` (optional, structured)
- ✅ `consent_marketing` (boolean, default false)
- ✅ `consent_reminders` (boolean, default false)
- ✅ `created_at`, `updated_at`

**Business Rules**:
- ✅ `consent_reminders` must be true to send reminders (method: `canReceiveReminders()`)

---

### 6. Pet ✅
**Status**: Valid
**Location**: `backend/src/modules/administrative/domain/pet.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `name` (required)
- ✅ `customer_id` (required)
- ✅ `species` (optional)
- ✅ `breed` (optional)
- ✅ `date_of_birth` (optional)
- ✅ `microchip_id` (optional, validated format)
- ✅ `medical_notes` (optional)
- ✅ `vaccination_dates` (optional, structured as VaccinationRecord[])
- ✅ `created_at`, `updated_at`

**Business Rules**:
- ✅ Microchip format validation
- ✅ Date of birth cannot be in future
- ✅ Vaccination records with proper date copying

---

### 7. Service ✅
**Status**: Valid
**Location**: `backend/src/modules/services/domain/service.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `name` (required)
- ✅ `description` (optional)
- ✅ `duration_minutes` (required, positive integer)
- ✅ `price` (required, non-negative)
- ✅ `required_resources` (optional list)
- ✅ `consumes_inventory` (boolean, default false)
- ✅ `consumed_items` (optional list with product_id, quantity)
- ✅ `tags` (optional)
- ✅ `created_at`, `updated_at`

**Business Rules**:
- ✅ Duration must be positive
- ✅ Price must be non-negative
- ✅ If consumes_inventory is true, consumed_items validation

---

### 8. ServicePackage ✅
**Status**: Valid
**Location**: `backend/src/modules/services/domain/service-package.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `name` (required)
- ✅ `description` (optional)
- ✅ `services` (ordered list with service_id, quantity)
- ✅ `bundle_price` (optional, non-negative)
- ✅ `created_at`, `updated_at`

**Business Rules**:
- ✅ Must have at least one service
- ✅ No duplicate service IDs
- ✅ Bundle price validation

---

### 9. Appointment ✅
**Status**: Valid
**Location**: `backend/src/modules/services/domain/appointment.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `store_id` (required)
- ✅ `customer_id` (required)
- ✅ `pet_id` (required)
- ✅ `start_at` (required)
- ✅ `end_at` (required)
- ✅ `status` (required, enum with all values)
- ✅ `created_by` (optional User ID)
- ✅ `staff_id` (optional User ID)
- ✅ `notes` (optional)
- ✅ `recurrence_id` (optional)
- ✅ `created_at`, `updated_at`

**Business Rules**:
- ✅ Start time must be before end time
- ✅ Duration must be positive
- ✅ Status transitions validated
- ✅ Overlap detection method

---

### 10. AppointmentServiceLine ✅
**Status**: Valid
**Location**: `backend/src/modules/services/domain/appointment-service-line.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `appointment_id` (required)
- ✅ `service_id` (required)
- ✅ `quantity` (default 1, positive integer)
- ✅ `price_override` (optional, non-negative)
- ✅ `created_at`, `updated_at`

**Business Rules**:
- ✅ Price calculation uses override when present, otherwise Service price
- ✅ Methods: `calculateLineTotal()`, `getEffectivePrice()`

---

### 11. Product ✅
**Status**: Valid
**Location**: `backend/src/modules/inventory/domain/product.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `sku` (required, validated)
- ✅ `name` (required)
- ✅ `description` (optional)
- ✅ `category` (optional)
- ✅ `unit_price` (required, non-negative)
- ✅ `vat_rate` (required, 0-100)
- ✅ `stock_tracked` (boolean, default false)
- ✅ `reorder_threshold` (optional, non-negative integer)
- ✅ `created_at`, `updated_at`

**Business Rules**:
- ✅ SKU validation
- ✅ VAT rate validation (0-100)
- ✅ Price calculations with VAT

---

### 12. Supplier ✅
**Status**: Valid
**Location**: `backend/src/modules/inventory/domain/supplier.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `name` (required)
- ✅ `contact_email` (optional, validated)
- ✅ `phone` (optional)
- ✅ `default_lead_time_days` (optional, non-negative integer)
- ✅ `created_at`, `updated_at`

**Business Rules**:
- ✅ Lead time calculation methods
- ✅ Expected arrival date calculation

---

### 13. StockBatch ⚠️
**Status**: Minor Documentation Ambiguity
**Location**: `backend/src/modules/inventory/domain/stock-batch.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `product_id` (required)
- ⚠️ `batch_number` (optional) - Docs say `+batch_number` (opt) which is contradictory notation
- ✅ `quantity` (integer, default 0, non-negative)
- ✅ `expiry_date` (optional)
- ✅ `received_at` (required)
- ✅ `created_at`, `updated_at`

**Note**: Documentation has `+batch_number` (opt) which is contradictory. Implementation correctly makes it optional.

**Business Rules**:
- ✅ Expired batches cannot be sold (`canBeSold()` method)
- ✅ Expiry date must be after received date

---

### 14. StockMovement ✅
**Status**: Valid
**Location**: `backend/src/modules/inventory/domain/stock-movement.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `product_id` (required)
- ✅ `batch_id` (optional)
- ✅ `quantity_change` (required, non-zero integer)
- ✅ `reason` (required, enum: receipt, sale, adjustment, transfer, reservation_release)
- ✅ `performed_by` (required User ID)
- ✅ `location_id` (required)
- ✅ `reference_id` (optional)
- ✅ `created_at` (no updated_at - immutable)

**Business Rules**:
- ✅ Immutable entity (all properties readonly)
- ✅ Compensating movement creation method
- ✅ Quantity change validation (non-zero)

---

### 15. InventoryReservation ✅
**Status**: Valid
**Location**: `backend/src/modules/inventory/domain/inventory-reservation.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `product_id` (required)
- ✅ `quantity` (required, positive integer)
- ✅ `reserved_for` (required, appointment_id or order_id)
- ✅ `expires_at` (optional)
- ✅ `created_at` (no updated_at)

**Business Rules**:
- ✅ Reservation reduces available stock
- ✅ Expiration checking methods

---

### 16. PurchaseOrder ✅
**Status**: Valid
**Location**: `backend/src/modules/inventory/domain/purchase-order.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `supplier_id` (required)
- ✅ `store_id` (optional)
- ✅ `order_lines` (list with product_id, quantity, unit_price)
- ✅ `status` (enum: draft, ordered, received, cancelled)
- ✅ `created_by` (required User ID)
- ✅ `created_at`, `updated_at`

**Business Rules**:
- ✅ Must have at least one order line
- ✅ Status transitions validated
- ✅ No duplicate product IDs in lines

---

### 17. Invoice ⚠️
**Status**: Minor Documentation Ambiguity
**Location**: `backend/src/modules/financial/domain/invoice.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `company_id` (required)
- ✅ `store_id` (required)
- ✅ `invoice_number` (required)
- ⚠️ `issued_at` (optional in implementation, but `+` in docs) - Correctly optional for DRAFT status, set when issued
- ✅ `buyer_customer_id` (optional)
- ✅ `lines` (list with description, product_id|service_id, quantity, unit_price, vat_rate)
- ✅ `subtotal`, `vat_total`, `total` (calculated)
- ✅ `status` (enum: draft, issued, paid, cancelled, refunded)
- ✅ `paid_at` (optional)
- ✅ `payment_method` (optional)
- ✅ `external_reference` (optional)
- ✅ `created_by` (required User ID)
- ✅ `created_at`, `updated_at`

**Note**: Documentation marks `issued_at` as `+` (required), but implementation correctly makes it optional since invoices start as DRAFT. The `issue()` method sets it when status changes to ISSUED.

**Business Rules**:
- ✅ Cannot be issued without valid Company NIF (noted in comments, use case level)
- ✅ Once issued, editing is restricted
- ✅ Totals calculated from lines

---

### 18. CreditNote ✅
**Status**: Valid
**Location**: `backend/src/modules/financial/domain/credit-note.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `invoice_id` (required)
- ✅ `issued_at` (optional)
- ✅ `reason` (optional)
- ✅ `amount` (required, positive)
- ✅ `created_by` (required User ID)
- ✅ `created_at` (no updated_at - immutable once issued)

**Business Rules**:
- ✅ Immutable once issued
- ✅ Amount must be positive

---

### 19. Transaction ✅
**Status**: Valid
**Location**: `backend/src/modules/financial/domain/transaction.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `store_id` (required)
- ✅ `invoice_id` (required)
- ✅ `line_items` (list with product_id|service_id, quantity, price)
- ✅ `total_amount` (calculated)
- ✅ `payment_status` (enum: pending, paid_manual, refunded)
- ✅ `created_by` (required User ID)
- ✅ `created_at`, `updated_at`

**Business Rules**:
- ✅ Payment recorded manually
- ✅ Line items must have productId or serviceId (not both)
- ✅ Total calculated from line items

---

### 20. FinancialExport ✅
**Status**: Valid
**Location**: `backend/src/modules/financial/domain/financial-export.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `company_id` (required)
- ✅ `period_start` (optional)
- ✅ `period_end` (optional)
- ✅ `format` (enum: CSV, JSON, default CSV)
- ✅ `file_path` or `sftp_reference` (mutually exclusive)
- ✅ `created_at`, `created_by` (required User ID)

**Business Rules**:
- ✅ Immutable once generated (has file_path or sftp_reference)
- ✅ Period validation (end after start)
- ✅ Mutually exclusive file_path and sftp_reference

---

### 21. AuditLog ✅
**Status**: Valid
**Location**: `backend/src/modules/shared/domain/audit-log.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `entity_type` (required, string)
- ✅ `entity_id` (required, UUID)
- ✅ `action` (required, enum: create, update, delete, void)
- ✅ `performed_by` (required User ID)
- ✅ `timestamp` (required)
- ✅ `meta` (optional JSON with before/after)

**Business Rules**:
- ✅ Fully immutable (append-only)
- ✅ All properties readonly
- ✅ Meta data deep copied

---

### 22. Session ✅
**Status**: Valid
**Location**: `backend/src/modules/users/domain/session.entity.ts`

**Properties Check**:
- ✅ `id` (required)
- ✅ `user_id` (required)
- ✅ `created_at` (required)
- ✅ `expires_at` (optional)
- ✅ `revoked` (boolean, default false)
- ✅ `revoked_at` (optional, set when revoked)

**Business Rules**:
- ✅ Revocation immediately denies access
- ✅ Session validation methods
- ✅ Time calculations

---

## Issues Found

### Minor Documentation Ambiguities (Not Implementation Errors)

1. **StockBatch.batch_number**: Documentation shows `+batch_number` (opt) which is contradictory notation. Implementation correctly makes it optional.

2. **Invoice.issued_at**: Documentation marks as `+` (required), but implementation correctly makes it optional since invoices start as DRAFT. The `issue()` method sets it when status changes to ISSUED. This is correct behavior.

### Missing Entities (Not in entities.md but found in codebase)

1. **Employee**: Found in `backend/src/modules/administrative/domain/employee.entity.ts`
   - May be part of administrative module
   - Not listed in main entities.md

2. **Owner**: Found in `backend/src/modules/administrative/domain/owner.entity.ts`
   - May be part of administrative module
   - Not listed in main entities.md

---

## Validation Results

### Overall Status: ✅ All Entities Valid

All 22 entities from the documentation have been implemented and validated. The implementations correctly follow:
- Clean/Hexagonal architecture principles
- Domain-driven design patterns
- Proper encapsulation and immutability
- Business rules and invariants
- Validation patterns consistent across entities

### Recommendations

1. **Documentation Clarification**: Consider clarifying the `+` notation in entities.md - it may mean "required when in certain state" rather than "required at creation" for fields like `issued_at`.

2. **Additional Entities**: If Employee and Owner are part of the domain model, consider adding them to entities.md documentation.

3. **Consistency**: All entities follow consistent patterns for:
   - Date handling (proper copying)
   - Validation (at boundaries)
   - Immutability (readonly properties)
   - Error messages (descriptive)

---

## Conclusion

All domain entities have been successfully validated against the documentation. The implementations are correct and follow best practices for Clean/Hexagonal architecture. Minor documentation ambiguities do not affect the correctness of the implementations.

