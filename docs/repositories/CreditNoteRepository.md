# Repository Interface Contract: CreditNoteRepository

## Overview

The `CreditNoteRepository` interface defines the contract for credit note data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for credit note entity operations, including credit note creation, invoice relationship management, and outstanding amount calculations.

**Entity:** `CreditNote`  
**Table:** `credit_notes`  
**Module:** Financial

## Entity Structure

Based on the ER model, the `CreditNote` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `invoice_id` (UUID, NOT NULL, FK -> invoices(id)) - Original invoice this credit note references
- `issued_at` (DATETIME, NOT NULL) - Credit note issue date
- `reason` (TEXT, NOT NULL) - Reason for credit note
- `amount` (DECIMAL(12,2), NOT NULL) - Credit note amount
- `created_by` (UUID, NOT NULL, FK -> users(id)) - User who created the credit note
- `created_at` (DATETIME, NOT NULL) - Creation timestamp

**Indexes:**
- Primary key on `id`
- Index on `invoice_id` (for invoice-credit note relationships)

**Relationships:**
- CreditNote 1 — 1 Invoice (via `invoice_id`)

**Business Rules:**
- CreditNote must reference original Invoice and reduce outstanding amount in exports
- Only Manager/Accountant can create CreditNote
- Credit note amount cannot exceed invoice total (or outstanding amount)
- Multiple credit notes can be created for the same invoice (partial refunds)

---

## Method Specifications

### 1. `save(creditNote: CreditNote): Promise<CreditNote>`

**Purpose:**  
Persist a new credit note entity. This method handles credit note creation and is used for refunds, corrections, and adjustments.

**Input Parameters:**
- `creditNote` (CreditNote): Credit note entity to persist
  - `id` is null/undefined (new credit note)
  - Required fields: `invoice_id`, `issued_at`, `reason`, `amount`, `created_by`

**Output Type:**
- `Promise<CreditNote>`: Returns the persisted credit note entity with all fields populated, including generated `id` and `created_at` timestamp

**Error Conditions:**
- `CreditNoteValidationError`: If required fields are missing or invalid
- `InvoiceNotFoundError`: If `invoice_id` does not exist
- `InvalidInvoiceStatusError`: If invoice status is not "issued" or "paid"
- `InvalidReasonError`: If `reason` is empty or whitespace-only
- `InvalidAmountError`: If `amount` <= 0
- `AmountExceedsInvoiceTotalError`: If `amount` > invoice total (business rule validation in application layer)
- `AmountExceedsOutstandingError`: If `amount` > outstanding amount (business rule validation in application layer)
- `UserNotFoundError`: If `created_by` does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Invoice existence and status validation should be within the same transaction
- Outstanding amount calculation should be within the same transaction

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `created_at` to current timestamp
- Validates that `invoice_id` references existing invoice
- Validates invoice status is "issued" or "paid" (business rule validation in application layer)
- Validates `reason` is non-empty and not whitespace-only
- Validates `amount` > 0
- Validates `amount` does not exceed invoice total (business rule validation in application layer)
- Validates `amount` does not exceed outstanding amount (sum of existing credit notes, business rule validation in application layer)
- Validates that `created_by` references existing user
- Returns the complete credit note entity with all fields

**Related Use Cases:**
- UC-FIN-005: Create Credit Note

---

### 2. `findById(id: UUID): Promise<CreditNote | null>`

**Purpose:**  
Retrieve a credit note entity by its unique identifier. Used for credit note lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Credit note identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<CreditNote | null>`: Returns the credit note entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete credit note entity with all fields
- Returns `null` if credit note with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by any criteria (pure ID lookup)

**Related Use Cases:**
- Credit note lookup and validation

---

### 3. `findByInvoiceId(invoiceId: UUID): Promise<CreditNote[]>`

**Purpose:**  
Retrieve all credit notes for a specific invoice. Used for calculating outstanding amount and invoice-credit note relationship management.

**Input Parameters:**
- `invoiceId` (UUID): Invoice identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<CreditNote[]>`: Returns array of credit note entities for the invoice
  - Returns empty array `[]` if invoice has no credit notes
  - Returns empty array `[]` if invoice does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `invoiceId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters credit notes where `invoice_id = invoiceId`
- Uses index on `invoice_id` for efficient query
- Returns credit notes in no specific order (database-dependent)
- Returns empty array if no credit notes found for invoice
- Used for outstanding amount calculation

**Sorting and Filtering Rules:**
- Filters by invoice only
- No default sorting applied
- Application layer may sort by `issued_at` descending (most recent first)

**Related Use Cases:**
- UC-FIN-005: Create Credit Note (calculate outstanding amount)

---

### 4. `sumByInvoiceId(invoiceId: UUID): Promise<Decimal>`

**Purpose:**  
Calculate the sum of all credit note amounts for a specific invoice. Used for outstanding amount calculation and validation.

**Input Parameters:**
- `invoiceId` (UUID): Invoice identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Decimal>`: Returns sum of credit note amounts for the invoice (decimal >= 0)
  - Returns `0` if invoice has no credit notes
  - Returns `0` if invoice does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `invoiceId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Sums `amount` field for all credit notes where `invoice_id = invoiceId`
- Uses index on `invoice_id` for efficient SUM query
- Returns decimal value, never negative
- Returns `0` if no credit notes found for invoice
- Used for outstanding amount calculation: `outstanding = invoice.total - sumByInvoiceId()`

**Sorting and Filtering Rules:**
- No sorting or filtering applied
- Pure aggregation calculation

**Related Use Cases:**
- UC-FIN-005: Create Credit Note (calculate outstanding amount for validation)

---

### 5. `findByInvoiceIds(invoiceIds: UUID[]): Promise<CreditNote[]>`

**Purpose:**  
Retrieve all credit notes for multiple invoices. Used for financial exports and batch operations.

**Input Parameters:**
- `invoiceIds` (UUID[]): Array of invoice identifiers
  - Must be array of valid UUIDs
  - Must not be null or undefined
  - Array can be empty (returns empty array)

**Output Type:**
- `Promise<CreditNote[]>`: Returns array of credit note entities for the invoices
  - Returns empty array `[]` if no credit notes found
  - Returns empty array `[]` if input array is empty

**Error Conditions:**
- `InvalidUUIDError`: If any ID in array is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters credit notes where `invoice_id IN (invoiceIds)`
- Uses index on `invoice_id` for efficient query
- Returns credit notes in no specific order (database-dependent)
- Returns empty array if no credit notes found for any invoice
- Used for financial exports and batch operations

**Sorting and Filtering Rules:**
- Filters by invoice IDs only
- No default sorting applied
- Application layer may sort by `invoice_id` and `issued_at`

**Related Use Cases:**
- UC-FIN-008: Create Financial Export (query credit notes for invoices in period)

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`
   - Index on `invoice_id` for `findByInvoiceId()`, `sumByInvoiceId()`, and `findByInvoiceIds()`

2. **Query Optimization:**
   - Use efficient aggregation queries for `sumByInvoiceId()`
   - Optimize batch queries for `findByInvoiceIds()`
   - Consider caching outstanding amounts for frequently accessed invoices

3. **Outstanding Amount Calculation:**
   - `sumByInvoiceId()` should use efficient SUM query
   - Consider caching outstanding amounts if frequently accessed

### Data Integrity

1. **Foreign Key Constraints:**
   - `invoice_id` must reference existing invoice (enforced by database)
   - `created_by` must reference existing user (enforced by database)
   - Credit notes cannot be deleted if they have active references (business rule dependent)

2. **Validation:**
   - `reason` must be non-empty and not whitespace-only
   - `amount` must be > 0
   - `amount` cannot exceed invoice total (business rule validation in application layer)
   - `amount` cannot exceed outstanding amount (business rule validation in application layer)

3. **Business Rules:**
   - Credit note must reference issued or paid invoice
   - Multiple credit notes can be created for the same invoice (partial refunds)
   - Total credit note amount cannot exceed invoice total
   - Credit note creation does not affect invoice status

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`) should be within transactions
- Outstanding amount calculation should be within the same transaction as credit note creation

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Amount validation errors should be thrown when amount exceeds limits

### Business Rules

1. **Credit Note Lifecycle:**
   - Credit notes are created for issued or paid invoices
   - Credit notes reduce outstanding amount of invoice
   - Credit notes are included in financial exports
   - Credit note creation does not change invoice status

2. **Amount Management:**
   - Credit note amount cannot exceed invoice total
   - Credit note amount cannot exceed outstanding amount (invoice total - sum of existing credit notes)
   - Multiple credit notes can be created for the same invoice (partial refunds)
   - Total of all credit notes for an invoice cannot exceed invoice total

3. **Refund Handling:**
   - Actual money refund is handled outside the system
   - Credit note records the refund for accounting purposes only
   - Credit note reason is critical for audit and compliance

---

## Related Repositories

- **InvoiceRepository:** For invoice validation and relationships
- **AuditLogRepository:** For logging credit note operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `search(criteria: SearchCriteria, pagination: Pagination): Promise<PaginatedResult<CreditNote>>` - Search credit notes with filters
- `findByDateRange(start: Date, end: Date): Promise<CreditNote[]>` - Find credit notes by date range
- `getCreditNoteStatistics(invoiceId: UUID): Promise<CreditNoteStatistics>` - Get credit note statistics for invoice

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

