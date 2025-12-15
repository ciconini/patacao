# Repository Interface Contract: InvoiceLineRepository

## Overview

The `InvoiceLineRepository` interface defines the contract for invoice line data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for invoice line entity operations.

**Entity:** `InvoiceLine`  
**Table:** `invoice_lines`  
**Module:** Financial

## Entity Structure

Based on the ER model, the `InvoiceLine` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `invoice_id` (UUID, NOT NULL, FK -> invoices(id)) - Invoice this line belongs to
- `description` (TEXT, NOT NULL) - Line item description
- `product_id` (UUID, NULL, FK -> products(id)) - Product for this line (optional)
- `service_id` (UUID, NULL, FK -> services(id)) - Service for this line (optional)
- `quantity` (INT, NOT NULL) - Quantity
- `unit_price` (DECIMAL(12,2), NOT NULL) - Unit price
- `vat_rate` (DECIMAL(5,2), NOT NULL) - VAT rate percentage
- `line_total` (DECIMAL(12,2), NOT NULL) - Line total (quantity * unit_price * (1 + vat_rate))

**Indexes:**
- Primary key on `id`
- Index on `invoice_id` (for invoice-line relationships)

**Relationships:**
- InvoiceLine * — 1 Invoice (via `invoice_id`)
- InvoiceLine 0..1 — 1 Product (via `product_id`)
- InvoiceLine 0..1 — 1 Service (via `service_id`)

**Business Rules:**
- Each invoice line represents one product or service with quantity, price, and VAT
- Line total = quantity * unit_price * (1 + vat_rate)
- Invoice total is sum of all line totals
- Either `product_id` or `service_id` should be provided (not both, not neither)

---

## Method Specifications

### 1. `saveLines(invoiceId: UUID, lines: InvoiceLine[]): Promise<InvoiceLine[]>`

**Purpose:**  
Persist multiple invoice lines for an invoice. This method handles bulk creation of invoice lines and is used during invoice creation.

**Input Parameters:**
- `invoiceId` (UUID): Invoice identifier
  - Must be valid UUID format
  - Must not be null or undefined
  - Must reference existing invoice
- `lines` (InvoiceLine[]): Array of invoice line entities to persist
  - Must be non-empty array
  - Each line must have: `description`, `quantity`, `unit_price`, `vat_rate`, `line_total`
  - Optional fields: `product_id`, `service_id` (at least one should be provided)
  - `invoice_id` should match `invoiceId` parameter (or set automatically)

**Output Type:**
- `Promise<InvoiceLine[]>`: Returns array of persisted invoice line entities with all fields populated, including generated `id` timestamps

**Error Conditions:**
- `InvoiceLineValidationError`: If lines array is empty or invalid
- `InvoiceNotFoundError`: If `invoiceId` does not exist
- `ProductNotFoundError`: If product referenced in any line does not exist
- `ServiceNotFoundError`: If service referenced in any line does not exist
- `InvalidQuantityError`: If any line has `quantity` <= 0
- `InvalidUnitPriceError`: If any line has `unit_price` < 0
- `InvalidVatRateError`: If any line has `vat_rate` outside valid range (0.00 to 100.00)
- `InvalidLineTotalError`: If any line has `line_total` != `quantity * unit_price * (1 + vat_rate)`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Invoice and product/service existence validation should be within the same transaction
- All lines must be saved atomically (all or nothing)

**Notes on Expected Behaviour:**
- Generates UUID for each line `id`
- Sets `invoice_id` to `invoiceId` for all lines
- Validates that `invoiceId` references existing invoice
- Validates that all product IDs reference existing products if provided
- Validates that all service IDs reference existing services if provided
- Validates `quantity` > 0 for each line
- Validates `unit_price` >= 0 for each line
- Validates `vat_rate` is between 0.00 and 100.00 for each line
- Validates `line_total` matches calculated total for each line
- Returns array of complete invoice line entities with all fields
- All lines are saved atomically (transaction rollback if any line fails)

**Related Use Cases:**
- UC-FIN-001: Create Invoice (Draft) (save invoice lines)

---

### 2. `findByInvoiceId(invoiceId: UUID): Promise<InvoiceLine[]>`

**Purpose:**  
Retrieve all invoice lines for a specific invoice. Used for loading invoice details, calculating totals, and line item management.

**Input Parameters:**
- `invoiceId` (UUID): Invoice identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<InvoiceLine[]>`: Returns array of invoice line entities for the invoice
  - Returns empty array `[]` if invoice has no lines
  - Returns empty array `[]` if invoice does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `invoiceId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters invoice lines where `invoice_id = invoiceId`
- Uses index on `invoice_id` for efficient query
- Returns lines in no specific order (database-dependent)
- Returns empty array if no lines found for invoice
- Used for invoice detail retrieval and total calculation

**Sorting and Filtering Rules:**
- Filters by invoice only
- No default sorting applied
- Application layer may sort by line creation order or `product_id`/`service_id`

**Related Use Cases:**
- Invoice detail retrieval (GET /invoice-lines/{invoice_id} endpoint)
- Invoice total calculation

---

### 3. `findById(id: UUID): Promise<InvoiceLine | null>`

**Purpose:**  
Retrieve an invoice line entity by its unique identifier. Used for line lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Invoice line identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<InvoiceLine | null>`: Returns the invoice line entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete invoice line entity with all fields
- Returns `null` if line with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by any criteria (pure ID lookup)

**Related Use Cases:**
- Invoice line lookup and validation

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`
   - Index on `invoice_id` for `findByInvoiceId()` and invoice filtering

2. **Query Optimization:**
   - Use efficient queries for bulk operations
   - Optimize `saveLines()` for batch inserts
   - Consider caching invoice lines for frequently accessed invoices

3. **Bulk Operations:**
   - `saveLines()` should use batch insert for performance
   - Consider transaction size limits for very large line arrays

### Data Integrity

1. **Foreign Key Constraints:**
   - `invoice_id` must reference existing invoice (enforced by database)
   - `product_id` must reference existing product if provided (enforced by database)
   - `service_id` must reference existing service if provided (enforced by database)
   - Invoice lines cannot exist without invoice

2. **Validation:**
   - `quantity` must be > 0
   - `unit_price` must be >= 0
   - `vat_rate` must be between 0.00 and 100.00
   - `line_total` must equal `quantity * unit_price * (1 + vat_rate)`
   - Either `product_id` or `service_id` should be provided (business rule validation in application layer)

3. **Business Rules:**
   - Invoice should have at least one line (business rule validation in application layer)
   - Lines can only be edited when invoice is in "draft" status (business rule validation in application layer)
   - Line totals are calculated and stored (not calculated on-the-fly)

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`saveLines`) should be within transactions
- `saveLines()` must be atomic (all lines saved or none)
- Invoice and product/service existence validation should be within the same transaction as line creation

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Product and service existence errors should be thrown when validating references

### Business Rules

1. **Line Management:**
   - Each line represents one product or service with quantity, price, and VAT
   - Line total = quantity * unit_price * (1 + vat_rate)
   - Invoice total is sum of all line totals

2. **Product/Service Reference:**
   - Either `product_id` or `service_id` should be provided
   - Both cannot be provided (business rule validation in application layer)
   - Neither cannot be provided (business rule validation in application layer)

3. **Editable State:**
   - Lines can only be edited when invoice is in "draft" status
   - Issued invoices cannot have lines modified (business rule validation in application layer)

---

## Related Repositories

- **InvoiceRepository:** For invoice validation and relationships
- **ProductRepository:** For product validation and price lookup
- **ServiceRepository:** For service validation and price lookup
- **AuditLogRepository:** For logging invoice line operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `update(line: InvoiceLine): Promise<InvoiceLine>` - Update invoice line (if line editing is needed)
- `delete(id: UUID): Promise<void>` - Delete invoice line (if line deletion is needed)
- `deleteByInvoiceId(invoiceId: UUID): Promise<number>` - Delete all lines for invoice
- `bulkUpdate(lines: InvoiceLine[]): Promise<InvoiceLine[]>` - Bulk update invoice lines

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

