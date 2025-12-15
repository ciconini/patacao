# Repository Interface Contract: FinancialExportRepository

## Overview

The `FinancialExportRepository` interface defines the contract for financial export data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for financial export entity operations, including export creation, status management, and file reference tracking.

**Entity:** `FinancialExport`  
**Table:** `financial_exports`  
**Module:** Financial

## Entity Structure

Based on the ER model, the `FinancialExport` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `company_id` (UUID, NOT NULL, FK -> companies(id)) - Company for this export
- `period_start` (DATETIME, NOT NULL) - Export period start date
- `period_end` (DATETIME, NOT NULL) - Export period end date
- `format` (VARCHAR(32), NOT NULL) - Export format: "csv" or "json"
- `status` (VARCHAR(32), NOT NULL) - Export status: pending, processing, completed, failed
- `file_path` (VARCHAR(512), NULL) - Local file path (optional)
- `sftp_reference` (JSON, NULL) - SFTP delivery reference (optional)
- `record_count` (INT, NULL) - Number of records exported (optional)
- `created_by` (UUID, NOT NULL, FK -> users(id)) - User who created the export
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `completed_at` (DATETIME, NULL) - Completion timestamp (optional)

**Indexes:**
- Primary key on `id`
- Index on `company_id` (for company-export relationships)
- Index on `created_at` (for date-based queries)

**Relationships:**
- FinancialExport 1 — 1 Company (via `company_id`)

**Business Rules:**
- Export includes invoices, transactions, and credit notes for the period
- Export can be generated in CSV or JSON format
- Export can be delivered via download or SFTP
- Export status tracks generation progress

---

## Method Specifications

### 1. `save(export: FinancialExport): Promise<FinancialExport>`

**Purpose:**  
Persist a new financial export entity. This method handles export creation and is used during financial export generation.

**Input Parameters:**
- `export` (FinancialExport): Financial export entity to persist
  - `id` is null/undefined (new export)
  - Required fields: `company_id`, `period_start`, `period_end`, `format`, `status`, `created_by`
  - Optional fields: `file_path`, `sftp_reference`, `record_count`, `completed_at`

**Output Type:**
- `Promise<FinancialExport>`: Returns the persisted financial export entity with all fields populated, including generated `id` and `created_at` timestamp

**Error Conditions:**
- `FinancialExportValidationError`: If required fields are missing or invalid
- `CompanyNotFoundError`: If `company_id` does not exist
- `InvalidDateRangeError`: If `period_start` > `period_end`
- `InvalidFormatError`: If `format` is not "csv" or "json"
- `InvalidStatusError`: If `status` is not one of: pending, processing, completed, failed
- `UserNotFoundError`: If `created_by` does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Company existence validation should be within the same transaction

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `created_at` to current timestamp
- Validates that `company_id` references existing company
- Validates that `period_start` <= `period_end`
- Validates that `format` is "csv" or "json"
- Validates that `status` is valid
- Validates that `created_by` references existing user
- Sets default status to "pending" if not provided
- Returns the complete financial export entity with all fields

**Related Use Cases:**
- UC-FIN-008: Create Financial Export

---

### 2. `findById(id: UUID): Promise<FinancialExport | null>`

**Purpose:**  
Retrieve a financial export entity by its unique identifier. Used for export lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Financial export identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<FinancialExport | null>`: Returns the financial export entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete financial export entity with all fields
- Returns `null` if export with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by any criteria (pure ID lookup)

**Related Use Cases:**
- UC-FIN-008: Create Financial Export (export lookup)

---

### 3. `update(export: FinancialExport): Promise<FinancialExport>`

**Purpose:**  
Update an existing financial export entity. Used for updating export status, file path, SFTP reference, and completion timestamp.

**Input Parameters:**
- `export` (FinancialExport): Financial export entity with updated fields
  - `id` must be valid UUID of existing export
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)

**Output Type:**
- `Promise<FinancialExport>`: Returns the updated financial export entity with all fields

**Error Conditions:**
- `FinancialExportNotFoundError`: If export with given `id` does not exist
- `FinancialExportValidationError`: If updated fields are invalid
- `InvalidStatusError`: If `status` is being updated and is not valid
- `InvalidStatusTransitionError`: If status transition is not allowed
- `ImmutableFieldError`: If `company_id`, `period_start`, `period_end`, or `format` is being updated (not allowed)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Status transition validation should be within the same transaction

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Preserves `created_at` timestamp
- Does not allow `company_id`, `period_start`, `period_end`, or `format` to be changed (immutable)
- Validates status transitions (business rule validation in application layer)
- Sets `completed_at` to current timestamp when status changes to "completed" or "failed"
- Returns complete updated financial export entity

**Related Use Cases:**
- UC-FIN-008: Create Financial Export (update status and file references)

---

### 4. `search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<FinancialExport>>`

**Purpose:**  
Search and filter financial export records by various criteria with pagination and sorting. Used for export listing and management operations.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object
  - `company_id?: UUID` - Filter by company
  - `status?: string` - Filter by status (exact match)
  - `format?: string` - Filter by format (exact match)
  - `from?: Date` - Start date (filter by `created_at`)
  - `to?: Date` - End date (filter by `created_at`)
- `pagination` (Pagination): Pagination parameters
  - `page: number` - Page number (min 1, default 1)
  - `per_page: number` - Results per page (min 1, max 100, default 20)
- `sort` (Sort): Sort parameters
  - `field: string` - Sort field ("created_at", "period_start", "period_end", "status")
  - `direction: 'asc' | 'desc'` - Sort direction (default: "desc" for created_at)

**Output Type:**
- `Promise<PaginatedResult<FinancialExport>>`: Returns paginated result with:
  - `items: FinancialExport[]` - Array of financial export entities matching criteria
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
- Date range filters use `created_at` field (exports with `created_at` between `from` and `to`)
- Status and format filters use exact match (case-sensitive)
- Uses indexes on `company_id` and `created_at` for efficient queries
- Returns exports in no specific order if no sort specified (default: `created_at` descending, most recent first)
- Returns empty array if no results found

**Pagination Rules:**
- Default page: 1
- Default per_page: 20
- Maximum per_page: 100
- Returns empty array if no results found
- Total count calculated before pagination

**Sorting and Filtering Rules:**
- Valid sort fields: "created_at", "period_start", "period_end", "status"
- Default sort: "created_at" descending (most recent first)
- Date range filters are inclusive (exports on start and end dates are included)
- Status and format filters use exact match

**Related Use Cases:**
- Financial export listing operations (GET /financial-exports endpoint)

---

### 5. `findByCompanyId(companyId: UUID): Promise<FinancialExport[]>`

**Purpose:**  
Retrieve all financial exports for a specific company. Used for company-specific export management and reporting.

**Input Parameters:**
- `companyId` (UUID): Company identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<FinancialExport[]>`: Returns array of financial export entities for the company
  - Returns empty array `[]` if company has no exports
  - Returns empty array `[]` if company does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `companyId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters exports where `company_id = companyId`
- Uses index on `company_id` for efficient query
- Returns exports in no specific order (database-dependent)
- Returns empty array if no exports found for company
- Used for company-specific export management

**Sorting and Filtering Rules:**
- Filters by company only
- No default sorting applied
- Application layer may sort by `created_at` descending (most recent first)

**Related Use Cases:**
- Company-specific export management

---

### 6. `findByStatus(status: string): Promise<FinancialExport[]>`

**Purpose:**  
Retrieve all financial exports with a specific status. Used for status-based export management and workflow operations.

**Input Parameters:**
- `status` (string): Export status
  - Must be one of: pending, processing, completed, failed
  - Must not be null or undefined

**Output Type:**
- `Promise<FinancialExport[]>`: Returns array of financial export entities with the specified status
  - Returns empty array `[]` if no exports found with given status

**Error Conditions:**
- `InvalidStatusError`: If `status` is not a valid export status
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters exports where `status = status` (exact match, case-sensitive)
- Returns exports in no specific order (database-dependent)
- Returns empty array if no exports found with given status
- Used for status-based export management (e.g., processing pending exports)

**Sorting and Filtering Rules:**
- Filters by status only
- No default sorting applied
- Application layer may sort by `created_at` ascending (oldest first for processing)

**Related Use Cases:**
- Status-based export management
- Background job processing (process pending exports)

---

### 7. `exists(id: UUID): Promise<boolean>`

**Purpose:**  
Check if a financial export with the given ID exists. Used for quick existence validation without loading the full entity.

**Input Parameters:**
- `id` (UUID): Financial export identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if export exists, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses efficient EXISTS query or COUNT query
- Returns boolean value (true/false)
- Does not load export entity (more efficient than `findById()` for existence checks)
- Uses primary key index for efficient lookup
- Used for validation before operations that require export existence

**Related Use Cases:**
- Export validation in various operations

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`, `exists()`, and update operations
   - Index on `company_id` for `findByCompanyId()` and company filtering
   - Index on `created_at` for date range queries and sorting

2. **Query Optimization:**
   - Use efficient queries for date range filtering
   - Consider caching for frequently accessed exports
   - Use `exists()` instead of `findById()` when only existence check is needed

3. **File Storage:**
   - Export files may be stored locally or on SFTP
   - File paths should be validated and sanitized
   - Consider file cleanup for old exports (data retention policy)

### Data Integrity

1. **Foreign Key Constraints:**
   - `company_id` must reference existing company (enforced by database)
   - `created_by` must reference existing user (enforced by database)

2. **Validation:**
   - `period_start` must be <= `period_end`
   - `format` must be "csv" or "json"
   - `status` must be one of: pending, processing, completed, failed
   - `company_id`, `period_start`, `period_end`, and `format` cannot be changed after creation

3. **Business Rules:**
   - Export includes invoices, transactions, and credit notes for the period
   - Export can be generated in CSV or JSON format
   - Export can be delivered via download or SFTP
   - Export status tracks generation progress

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`, `update`) should be within transactions
- Export generation may be asynchronous (background job)

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Status transition errors should be thrown when invalid transitions are attempted

### Business Rules

1. **Export Lifecycle:**
   - Export starts with "pending" status
   - Export transitions to "processing" when generation starts
   - Export transitions to "completed" when generation succeeds
   - Export transitions to "failed" when generation fails

2. **Export Content:**
   - Export includes invoices for the period
   - Export includes transactions for the period
   - Export includes credit notes for invoices in the period
   - Voided invoices may be excluded (business rule dependent)

3. **File Management:**
   - Export files can be stored locally or on SFTP
   - File paths are stored in `file_path` or `sftp_reference`
   - Files should be retained per data retention policy

---

## Related Repositories

- **CompanyRepository:** For company validation and relationships
- **InvoiceRepository:** For querying invoices for export
- **TransactionRepository:** For querying transactions for export
- **CreditNoteRepository:** For querying credit notes for export
- **AuditLogRepository:** For logging export operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `findByPeriod(companyId: UUID, start: Date, end: Date): Promise<FinancialExport[]>` - Find exports by period
- `getExportStatistics(companyId: UUID): Promise<ExportStatistics>` - Get export statistics for company
- `delete(id: UUID): Promise<void>` - Delete export (if business rules allow)
- `cleanupOldExports(retentionDays: number): Promise<number>` - Cleanup old export files

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

