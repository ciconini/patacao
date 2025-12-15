# Repository Interface Contract: InvoiceRepository

## Overview

The `InvoiceRepository` interface defines the contract for invoice data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for invoice entity operations, including CRUD, status management, sequential numbering, and fiscal compliance.

**Entity:** `Invoice`  
**Table:** `invoices`  
**Module:** Financial

## Entity Structure

Based on the ER model, the `Invoice` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `company_id` (UUID, NOT NULL, FK -> companies(id)) - Company issuing the invoice
- `store_id` (UUID, NOT NULL, FK -> stores(id)) - Store issuing the invoice
- `invoice_number` (VARCHAR(128), NOT NULL) - Sequential invoice number per company/store
- `issued_at` (DATETIME, NOT NULL) - Invoice issue date
- `buyer_customer_id` (UUID, NULL, FK -> customers(id)) - Customer buyer (optional)
- `subtotal` (DECIMAL(12,2), NOT NULL) - Subtotal before VAT
- `vat_total` (DECIMAL(12,2), NOT NULL) - Total VAT amount
- `total` (DECIMAL(12,2), NOT NULL) - Total amount including VAT
- `status` (VARCHAR(32), NOT NULL) - Invoice status: draft, issued, paid, cancelled, refunded
- `paid_at` (DATETIME, NULL) - Payment date (optional)
- `payment_method` (VARCHAR(64), NULL) - Payment method (optional)
- `external_reference` (VARCHAR(255), NULL) - External payment reference (optional)
- `created_by` (UUID, NOT NULL, FK -> users(id)) - User who created the invoice
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NULL) - Last update timestamp

**Note:** Invoice lines are stored in separate `invoice_lines` table and managed via `InvoiceLineRepository`.

**Indexes:**
- Primary key on `id`
- Index on `invoice_number` (for invoice number lookups)
- Index on `issued_at` (for date range queries)

**Relationships:**
- Invoice 1 — 1 Company (via `company_id`)
- Invoice 1 — 1 Store (via `store_id`)
- Invoice 0..1 — 1 Customer (via `buyer_customer_id`)
- Invoice 1 — 0..* InvoiceLine (invoice line items)
- Invoice 1 — 0..* Transaction (transactions linked to invoice)
- Invoice 1 — 0..* CreditNote (credit notes for invoice)

**Business Rules:**
- Invoice cannot be `issued` without valid Company `nif` and sequential `invoice_number`
- Once `issued`, editing is restricted; void/credit-note flows are required to correct
- Invoice number must be sequential per company/store
- Invoice number must be unique

---

## Method Specifications

### 1. `save(invoice: Invoice): Promise<Invoice>`

**Purpose:**  
Persist a new invoice entity. This method handles invoice creation and is used during draft invoice creation.

**Input Parameters:**
- `invoice` (Invoice): Invoice entity to persist
  - `id` is null/undefined (new invoice)
  - Required fields: `company_id`, `store_id`, `issued_at`, `subtotal`, `vat_total`, `total`, `status`, `created_by`
  - Optional fields: `buyer_customer_id`, `invoice_number` (generated on issue), `paid_at`, `payment_method`, `external_reference`

**Output Type:**
- `Promise<Invoice>`: Returns the persisted invoice entity with all fields populated, including generated `id`, `created_at`, and `updated_at` timestamps

**Error Conditions:**
- `InvoiceValidationError`: If required fields are missing or invalid
- `CompanyNotFoundError`: If `company_id` does not exist
- `StoreNotFoundError`: If `store_id` does not exist
- `CustomerNotFoundError`: If `buyer_customer_id` is provided and does not exist
- `InvalidStatusError`: If `status` is not one of: draft, issued, paid, cancelled, refunded
- `InvalidAmountError`: If `total` != `subtotal + vat_total`
- `UserNotFoundError`: If `created_by` does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Company, store, and customer existence validation should be within the same transaction

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `created_at` and `updated_at` to current timestamp
- Validates that `company_id` references existing company
- Validates that `store_id` references existing store
- Validates that `buyer_customer_id` references existing customer if provided
- Validates that `created_by` references existing user
- Sets default status to "draft" if not provided
- `invoice_number` may be null for draft invoices (generated on issue)
- Returns the complete invoice entity with all fields
- Does not create invoice lines (handled by InvoiceLineRepository)

**Related Use Cases:**
- UC-FIN-001: Create Invoice (Draft)
- UC-FIN-006: Create Transaction (creates draft invoice)

---

### 2. `findById(id: UUID): Promise<Invoice | null>`

**Purpose:**  
Retrieve an invoice entity by its unique identifier. Used for invoice lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Invoice identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Invoice | null>`: Returns the invoice entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete invoice entity with all fields
- Returns `null` if invoice with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by any criteria (pure ID lookup)
- Does not include invoice lines (load separately via InvoiceLineRepository)

**Related Use Cases:**
- UC-FIN-001: Create Invoice (validation)
- UC-FIN-002: Issue Invoice
- UC-FIN-003: Mark Invoice as Paid
- UC-FIN-004: Void Invoice
- UC-FIN-005: Create Credit Note
- UC-FIN-006: Create Transaction (invoice creation)
- UC-ADMIN-007: Archive Customer (check for linked invoices)

---

### 3. `update(invoice: Invoice): Promise<Invoice>`

**Purpose:**  
Update an existing invoice entity. Used for modifying invoice status, payment information, and other invoice details. Only draft invoices can be edited; issued invoices are immutable.

**Input Parameters:**
- `invoice` (Invoice): Invoice entity with updated fields
  - `id` must be valid UUID of existing invoice
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)

**Output Type:**
- `Promise<Invoice>`: Returns the updated invoice entity with all fields

**Error Conditions:**
- `InvoiceNotFoundError`: If invoice with given `id` does not exist
- `InvoiceValidationError`: If updated fields are invalid
- `InvalidStatusError`: If `status` is being updated and is not valid
- `InvalidStatusTransitionError`: If status transition is not allowed (e.g., issued → draft)
- `ImmutableInvoiceError`: If invoice is issued and attempting to edit immutable fields
- `InvalidAmountError`: If amounts are being updated and `total` != `subtotal + vat_total`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Status transition validation should be within the same transaction

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Preserves `created_at` timestamp
- Updates `updated_at` timestamp to current time
- Does not allow editing of issued invoices (business rule validation in application layer)
- Validates status transitions (business rule validation in application layer)
- Does not allow `invoice_number` to be changed after issue
- Returns complete updated invoice entity

**Related Use Cases:**
- UC-FIN-002: Issue Invoice (update status and invoice_number)
- UC-FIN-003: Mark Invoice as Paid (update payment info and status)
- UC-FIN-004: Void Invoice (update status to cancelled)

---

### 4. `generateInvoiceNumber(companyId: UUID, storeId: UUID): Promise<string>`

**Purpose:**  
Generate the next sequential invoice number for a company/store combination. Used during invoice issuance to ensure sequential, unique numbering.

**Input Parameters:**
- `companyId` (UUID): Company identifier
  - Must be valid UUID format
  - Must not be null or undefined
- `storeId` (UUID): Store identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<string>`: Returns the next sequential invoice number (e.g., "INV-2024-001")

**Error Conditions:**
- `InvalidUUIDError`: If `companyId` or `storeId` is not a valid UUID format
- `CompanyNotFoundError`: If `companyId` does not exist
- `StoreNotFoundError`: If `storeId` does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Must be atomic to prevent duplicate invoice numbers
- May use database sequences or optimistic locking

**Notes on Expected Behaviour:**
- Generates sequential invoice number per company/store combination
- Invoice number format may include prefix, year, and sequence (business rule dependent)
- Uses atomic operation to prevent duplicate numbers
- May use database sequence or calculate from last invoice number
- Returns unique invoice number string
- Used during invoice issuance (UC-FIN-002)

**Related Use Cases:**
- UC-FIN-002: Issue Invoice (generate sequential invoice number)

---

### 5. `findByInvoiceNumber(invoiceNumber: string, companyId: UUID): Promise<Invoice | null>`

**Purpose:**  
Retrieve an invoice entity by its invoice number and company. Used for invoice number uniqueness checks and invoice lookup by number.

**Input Parameters:**
- `invoiceNumber` (string): Invoice number
  - Must be non-empty string
  - Must not be null or undefined
- `companyId` (UUID): Company identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Invoice | null>`: Returns the invoice entity if found, `null` if not found

**Error Conditions:**
- `InvalidInvoiceNumberError`: If `invoiceNumber` is empty or null
- `InvalidUUIDError`: If `companyId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Searches for invoice where `invoice_number = invoiceNumber` AND `company_id = companyId`
- Uses index on `invoice_number` for efficient lookup
- Returns first match if multiple invoices exist (should not happen due to uniqueness constraint)
- Returns `null` if no invoice found with given invoice number and company
- Used for invoice number uniqueness validation during issuance

**Sorting and Filtering Rules:**
- Exact invoice number match (case-sensitive)
- Filters by company and invoice number

**Related Use Cases:**
- UC-FIN-002: Issue Invoice (check invoice number uniqueness)

---

### 6. `findByCompanyAndPeriod(companyId: UUID, start: Date, end: Date, includeVoided: boolean): Promise<Invoice[]>`

**Purpose:**  
Retrieve all invoices for a company within a date range. Used for financial exports, reporting, and period-based queries.

**Input Parameters:**
- `companyId` (UUID): Company identifier
  - Must be valid UUID format
  - Must not be null or undefined
- `start` (Date): Start date (inclusive)
  - Must be valid date
  - Must not be null or undefined
- `end` (Date): End date (inclusive)
  - Must be valid date
  - Must not be null or undefined
  - Must be >= start
- `includeVoided` (boolean): Whether to include voided/cancelled invoices
  - Defaults to false

**Output Type:**
- `Promise<Invoice[]>`: Returns array of invoice entities for the company and period
  - Returns empty array `[]` if no invoices found
  - Returns empty array `[]` if company does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `companyId` is not a valid UUID format
- `InvalidDateRangeError`: If `start` > `end`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters invoices where `company_id = companyId` AND `issued_at` between `start` and `end` (inclusive)
- If `includeVoided` is false, excludes invoices with status "cancelled" or "refunded"
- Uses index on `issued_at` for efficient date range queries
- Returns invoices in no specific order (database-dependent)
- Returns empty array if no invoices found for company and period
- Used for financial exports and reporting

**Sorting and Filtering Rules:**
- Filters by company and date range
- Optionally filters by status (excludes voided if `includeVoided` is false)
- No default sorting applied
- Application layer may sort by `issued_at` ascending (chronological order)

**Related Use Cases:**
- UC-FIN-008: Create Financial Export (query invoices for period)

---

### 7. `search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<Invoice>>`

**Purpose:**  
Search and filter invoice records by various criteria with pagination and sorting. Used for invoice listing, reporting, and management operations.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object
  - `company_id?: UUID` - Filter by company
  - `store_id?: UUID` - Filter by store
  - `status?: string` - Filter by status (exact match)
  - `from?: Date` - Start date (filter by `issued_at`)
  - `to?: Date` - End date (filter by `issued_at`)
  - `buyer_customer_id?: UUID` - Filter by customer
  - `invoice_number?: string` - Filter by invoice number (partial match)
- `pagination` (Pagination): Pagination parameters
  - `page: number` - Page number (min 1, default 1)
  - `per_page: number` - Results per page (min 1, max 100, default 20)
- `sort` (Sort): Sort parameters
  - `field: string` - Sort field ("issued_at", "invoice_number", "total", "status", "created_at")
  - `direction: 'asc' | 'desc'` - Sort direction (default: "desc" for issued_at)

**Output Type:**
- `Promise<PaginatedResult<Invoice>>`: Returns paginated result with:
  - `items: Invoice[]` - Array of invoice entities matching criteria
  - `meta: PaginationMeta` - Pagination metadata (total, page, per_page, total_pages, has_next, has_previous)

**Error Conditions:**
- `InvalidPaginationError`: If pagination parameters are invalid
- `InvalidSortError`: If sort field is invalid
- `InvalidDateRangeError`: If `from` > `to`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Builds query with filters based on criteria
- Date range filters use `issued_at` field (invoices with `issued_at` between `from` and `to`)
- Status filter uses exact match (case-sensitive)
- Invoice number filter uses partial match (case-insensitive, LIKE)
- Uses indexes on `issued_at` and `invoice_number` for efficient queries
- Returns invoices in no specific order if no sort specified (default: `issued_at` descending, most recent first)
- Returns empty array if no results found

**Pagination Rules:**
- Default page: 1
- Default per_page: 20
- Maximum per_page: 100
- Returns empty array if no results found
- Total count calculated before pagination

**Sorting and Filtering Rules:**
- Valid sort fields: "issued_at", "invoice_number", "total", "status", "created_at"
- Default sort: "issued_at" descending (most recent first)
- Date range filters are inclusive (invoices on start and end dates are included)
- Status filter uses exact match
- Invoice number filter uses partial match (case-insensitive)

**Related Use Cases:**
- Invoice listing operations (GET /invoices endpoint)

---

### 8. `count(criteria: SearchCriteria): Promise<number>`

**Purpose:**  
Count the number of invoices matching search criteria. Used for pagination metadata calculation.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object (same as `search()` method)
  - `company_id?: UUID` - Filter by company
  - `store_id?: UUID` - Filter by store
  - `status?: string` - Filter by status
  - `from?: Date` - Start date
  - `to?: Date` - End date
  - `buyer_customer_id?: UUID` - Filter by customer
  - `invoice_number?: string` - Filter by invoice number

**Output Type:**
- `Promise<number>`: Returns count of matching invoices (integer >= 0)

**Error Conditions:**
- `InvalidDateRangeError`: If `from` > `to`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses same filtering logic as `search()` method
- Should use efficient COUNT query
- Returns integer count, never negative
- Does not apply pagination (counts all matching records)
- Uses indexes for efficient counting

**Related Use Cases:**
- Invoice listing operations (pagination metadata)

---

### 9. `findByStoreId(storeId: UUID, dateRange?: DateRange): Promise<Invoice[]>`

**Purpose:**  
Retrieve all invoices for a specific store, optionally filtered by date range. Used for store-specific reporting and invoice management.

**Input Parameters:**
- `storeId` (UUID): Store identifier
  - Must be valid UUID format
  - Must not be null or undefined
- `dateRange` (DateRange, optional): Optional date range filter
  - `from?: Date` - Start date
  - `to?: Date` - End date

**Output Type:**
- `Promise<Invoice[]>`: Returns array of invoice entities for the store
  - Returns empty array `[]` if store has no invoices
  - Returns empty array `[]` if store does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `storeId` is not a valid UUID format
- `InvalidDateRangeError`: If `dateRange` is provided and `from` > `to`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters invoices where `store_id = storeId`
- If `dateRange` provided, filters by `issued_at` between `from` and `to` (inclusive)
- Uses index on `issued_at` for efficient date range queries
- Returns invoices in no specific order (database-dependent)
- Returns empty array if no invoices found for store
- Used for store-specific invoice management

**Sorting and Filtering Rules:**
- Filters by store and optional date range
- No default sorting applied
- Application layer may sort by `issued_at` descending (most recent first)

**Related Use Cases:**
- Store-specific invoice reporting

---

### 10. `findByStatus(status: string): Promise<Invoice[]>`

**Purpose:**  
Retrieve all invoices with a specific status. Used for status-based invoice management and workflow operations.

**Input Parameters:**
- `status` (string): Invoice status
  - Must be one of: draft, issued, paid, cancelled, refunded
  - Must not be null or undefined

**Output Type:**
- `Promise<Invoice[]>`: Returns array of invoice entities with the specified status
  - Returns empty array `[]` if no invoices found with given status

**Error Conditions:**
- `InvalidStatusError`: If `status` is not a valid invoice status
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters invoices where `status = status` (exact match, case-sensitive)
- Returns invoices in no specific order (database-dependent)
- Returns empty array if no invoices found with given status
- Used for status-based invoice management

**Sorting and Filtering Rules:**
- Filters by status only
- No default sorting applied
- Application layer may sort by `issued_at` descending (most recent first)

**Related Use Cases:**
- Status-based invoice listing operations

---

### 11. `exists(id: UUID): Promise<boolean>`

**Purpose:**  
Check if an invoice with the given ID exists. Used for quick existence validation without loading the full entity.

**Input Parameters:**
- `id` (UUID): Invoice identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if invoice exists, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses efficient EXISTS query or COUNT query
- Returns boolean value (true/false)
- Does not load invoice entity (more efficient than `findById()` for existence checks)
- Uses primary key index for efficient lookup
- Used for validation before operations that require invoice existence

**Related Use Cases:**
- Invoice validation in various operations

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`, `exists()`, and update operations
   - Index on `invoice_number` for `findByInvoiceNumber()` and invoice number lookups
   - Index on `issued_at` for date range queries and sorting

2. **Query Optimization:**
   - Use efficient queries for date range filtering
   - Optimize invoice number generation (use database sequences if available)
   - Consider caching for frequently accessed invoices
   - Use `exists()` instead of `findById()` when only existence check is needed

3. **Invoice Number Generation:**
   - Must be atomic to prevent duplicate numbers
   - Consider using database sequences or optimistic locking
   - Invoice number format may be configurable (business rule dependent)

### Data Integrity

1. **Foreign Key Constraints:**
   - `company_id` must reference existing company (enforced by database)
   - `store_id` must reference existing store (enforced by database)
   - `buyer_customer_id` must reference existing customer if provided (enforced by database)
   - `created_by` must reference existing user (enforced by database)
   - Invoices cannot be deleted if they have linked transactions or credit notes (business rule dependent)

2. **Validation:**
   - `invoice_number` must be unique per company/store (enforced by database or application logic)
   - `status` must be one of: draft, issued, paid, cancelled, refunded
   - `total` must equal `subtotal + vat_total`
   - Invoice number cannot be changed after issue

3. **Business Rules:**
   - Invoice cannot be issued without valid Company NIF
   - Invoice number must be sequential per company/store
   - Once issued, invoice becomes immutable (cannot be edited)
   - Draft invoices can be edited; issued invoices require void/credit-note flows

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`, `update`, `generateInvoiceNumber`) should be within transactions
- Invoice number generation must be atomic to prevent duplicates
- Invoice issuance should be atomic with invoice number generation

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Status transition errors should be thrown when invalid transitions are attempted

### Business Rules

1. **Invoice Lifecycle:**
   - Invoice starts as "draft" (can be edited)
   - Invoice transitions to "issued" (immutable, legally valid)
   - Invoice transitions to "paid" (payment recorded)
   - Invoice can be "cancelled" (voided)
   - Invoice can be "refunded" (credit notes applied)

2. **Invoice Numbering:**
   - Invoice number must be sequential per company/store
   - Invoice number must be unique
   - Invoice number is generated on issue (not on draft creation)
   - Invoice number cannot be changed after issue

3. **Fiscal Compliance:**
   - Invoice cannot be issued without valid Company NIF
   - Issued invoices are legally valid fiscal documents
   - Invoice must comply with Portuguese fiscal requirements

---

## Related Repositories

- **CompanyRepository:** For company validation and NIF checks
- **StoreRepository:** For store validation and relationships
- **CustomerRepository:** For customer validation (buyer)
- **InvoiceLineRepository:** For managing invoice line items
- **TransactionRepository:** For transactions linked to invoice
- **CreditNoteRepository:** For credit notes linked to invoice
- **AuditLogRepository:** For logging invoice operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `findByCustomerId(customerId: UUID, dateRange?: DateRange): Promise<Invoice[]>` - Find invoices by customer
- `getInvoiceStatistics(companyId: UUID, dateRange: DateRange): Promise<InvoiceStatistics>` - Get invoice statistics
- `findUnpaidInvoices(companyId: UUID): Promise<Invoice[]>` - Find unpaid invoices
- `bulkUpdateStatus(invoiceIds: UUID[], status: string): Promise<number>` - Bulk update invoice status

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

