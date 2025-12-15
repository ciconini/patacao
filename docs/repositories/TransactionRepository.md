# Repository Interface Contract: TransactionRepository

## Overview

The `TransactionRepository` interface defines the contract for transaction data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for transaction entity operations, including POS transaction management, payment status tracking, and stock decrement coordination.

**Entity:** `Transaction`  
**Table:** `transactions`  
**Module:** Financial

## Entity Structure

Based on the ER model, the `Transaction` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `store_id` (UUID, NOT NULL, FK -> stores(id)) - Store where transaction occurred
- `invoice_id` (UUID, NOT NULL, FK -> invoices(id)) - Invoice linked to transaction
- `total_amount` (DECIMAL(12,2), NOT NULL) - Total transaction amount
- `payment_status` (VARCHAR(32), NOT NULL) - Payment status: pending, paid_manual, refunded
- `created_by` (UUID, NOT NULL, FK -> users(id)) - User who created the transaction
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NULL) - Last update timestamp

**Note:** Transaction lines are stored in separate `transaction_lines` table and managed via `TransactionLineRepository`.

**Indexes:**
- Primary key on `id`
- Index on `store_id` (for store-transaction relationships)
- Index on `created_at` (for date range queries)

**Relationships:**
- Transaction 1 — 1 Store (via `store_id`)
- Transaction 1 — 1 Invoice (via `invoice_id`)
- Transaction 1 — 0..* TransactionLine (transaction line items)
- Transaction 1 — 0..* StockMovement (stock movements created when transaction completed)

**Business Rules:**
- Completing a Transaction with products triggers StockMovement decrements for tracked products
- Payment is recorded manually; `payment_status` must reflect manual entries
- Transaction represents a POS checkout or sale

---

## Method Specifications

### 1. `save(transaction: Transaction): Promise<Transaction>`

**Purpose:**  
Persist a new transaction entity. This method handles transaction creation and is used during POS checkout.

**Input Parameters:**
- `transaction` (Transaction): Transaction entity to persist
  - `id` is null/undefined (new transaction)
  - Required fields: `store_id`, `invoice_id`, `total_amount`, `payment_status`, `created_by`

**Output Type:**
- `Promise<Transaction>`: Returns the persisted transaction entity with all fields populated, including generated `id`, `created_at`, and `updated_at` timestamps

**Error Conditions:**
- `TransactionValidationError`: If required fields are missing or invalid
- `StoreNotFoundError`: If `store_id` does not exist
- `InvoiceNotFoundError`: If `invoice_id` does not exist
- `InvalidPaymentStatusError`: If `payment_status` is not one of: pending, paid_manual, refunded
- `InvalidAmountError`: If `total_amount` < 0
- `UserNotFoundError`: If `created_by` does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Store and invoice existence validation should be within the same transaction

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `created_at` and `updated_at` to current timestamp
- Validates that `store_id` references existing store
- Validates that `invoice_id` references existing invoice
- Validates that `created_by` references existing user
- Sets default payment_status to "pending" if not provided
- Returns the complete transaction entity with all fields
- Does not create transaction lines (handled by TransactionLineRepository)

**Related Use Cases:**
- UC-FIN-006: Create Transaction (POS)

---

### 2. `findById(id: UUID): Promise<Transaction | null>`

**Purpose:**  
Retrieve a transaction entity by its unique identifier. Used for transaction lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Transaction identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Transaction | null>`: Returns the transaction entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete transaction entity with all fields
- Returns `null` if transaction with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by any criteria (pure ID lookup)
- Does not include transaction lines (load separately via TransactionLineRepository)

**Related Use Cases:**
- UC-FIN-006: Create Transaction (validation)
- UC-FIN-007: Complete Transaction
- UC-INV-003: Inventory Reservation (target lookup)

---

### 3. `update(transaction: Transaction): Promise<Transaction>`

**Purpose:**  
Update an existing transaction entity. Used for modifying payment status and other transaction details.

**Input Parameters:**
- `transaction` (Transaction): Transaction entity with updated fields
  - `id` must be valid UUID of existing transaction
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)

**Output Type:**
- `Promise<Transaction>`: Returns the updated transaction entity with all fields

**Error Conditions:**
- `TransactionNotFoundError`: If transaction with given `id` does not exist
- `TransactionValidationError`: If updated fields are invalid
- `InvalidPaymentStatusError`: If `payment_status` is being updated and is not valid
- `InvalidPaymentStatusTransitionError`: If payment status transition is not allowed
- `ImmutableFieldError`: If `store_id` or `invoice_id` is being updated (not allowed)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Payment status transition validation should be within the same transaction

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Preserves `created_at` timestamp
- Updates `updated_at` timestamp to current time
- Does not allow `store_id` or `invoice_id` to be changed (immutable)
- Validates payment status transitions (business rule validation in application layer)
- Returns complete updated transaction entity

**Related Use Cases:**
- UC-FIN-007: Complete Transaction (update payment status)

---

### 4. `findByInvoiceId(invoiceId: UUID): Promise<Transaction[]>`

**Purpose:**  
Retrieve all transactions linked to a specific invoice. Used for invoice-transaction relationship management and validation.

**Input Parameters:**
- `invoiceId` (UUID): Invoice identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Transaction[]>`: Returns array of transaction entities for the invoice
  - Returns empty array `[]` if invoice has no transactions
  - Returns empty array `[]` if invoice does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `invoiceId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters transactions where `invoice_id = invoiceId`
- Returns transactions in no specific order (database-dependent)
- Returns empty array if no transactions found for invoice
- Used for invoice-transaction relationship management

**Sorting and Filtering Rules:**
- Filters by invoice only
- No default sorting applied
- Application layer may sort by `created_at` descending (most recent first)

**Related Use Cases:**
- UC-FIN-004: Void Invoice (check linked transactions)

---

### 5. `findByCompanyAndPeriod(companyId: UUID, start: Date, end: Date): Promise<Transaction[]>`

**Purpose:**  
Retrieve all transactions for stores belonging to a company within a date range. Used for financial exports, reporting, and period-based queries.

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

**Output Type:**
- `Promise<Transaction[]>`: Returns array of transaction entities for the company and period
  - Returns empty array `[]` if no transactions found
  - Returns empty array `[]` if company does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `companyId` is not a valid UUID format
- `InvalidDateRangeError`: If `start` > `end`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters transactions where `store_id` belongs to company (via store-company relationship) AND `created_at` between `start` and `end` (inclusive)
- Uses index on `created_at` for efficient date range queries
- May require join with stores table to filter by company
- Returns transactions in no specific order (database-dependent)
- Returns empty array if no transactions found for company and period
- Used for financial exports and reporting

**Sorting and Filtering Rules:**
- Filters by company (via store relationship) and date range
- No default sorting applied
- Application layer may sort by `created_at` ascending (chronological order)

**Related Use Cases:**
- UC-FIN-008: Create Financial Export (query transactions for period)

---

### 6. `findByStoreId(storeId: UUID, dateRange?: DateRange): Promise<Transaction[]>`

**Purpose:**  
Retrieve all transactions for a specific store, optionally filtered by date range. Used for store-specific reporting and transaction management.

**Input Parameters:**
- `storeId` (UUID): Store identifier
  - Must be valid UUID format
  - Must not be null or undefined
- `dateRange` (DateRange, optional): Optional date range filter
  - `from?: Date` - Start date
  - `to?: Date` - End date

**Output Type:**
- `Promise<Transaction[]>`: Returns array of transaction entities for the store
  - Returns empty array `[]` if store has no transactions
  - Returns empty array `[]` if store does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `storeId` is not a valid UUID format
- `InvalidDateRangeError`: If `dateRange` is provided and `from` > `to`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters transactions where `store_id = storeId`
- If `dateRange` provided, filters by `created_at` between `from` and `to` (inclusive)
- Uses index on `store_id` and `created_at` for efficient queries
- Returns transactions in no specific order (database-dependent)
- Returns empty array if no transactions found for store
- Used for store-specific transaction management

**Sorting and Filtering Rules:**
- Filters by store and optional date range
- No default sorting applied
- Application layer may sort by `created_at` descending (most recent first)

**Related Use Cases:**
- Store-specific transaction reporting

---

### 7. `search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<Transaction>>`

**Purpose:**  
Search and filter transaction records by various criteria with pagination and sorting. Used for transaction listing, reporting, and management operations.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object
  - `store_id?: UUID` - Filter by store
  - `status?: string` - Filter by payment status (exact match)
  - `from?: Date` - Start date (filter by `created_at`)
  - `to?: Date` - End date (filter by `created_at`)
  - `invoice_id?: UUID` - Filter by invoice
- `pagination` (Pagination): Pagination parameters
  - `page: number` - Page number (min 1, default 1)
  - `per_page: number` - Results per page (min 1, max 100, default 20)
- `sort` (Sort): Sort parameters
  - `field: string` - Sort field ("created_at", "total_amount", "payment_status")
  - `direction: 'asc' | 'desc'` - Sort direction (default: "desc" for created_at)

**Output Type:**
- `Promise<PaginatedResult<Transaction>>`: Returns paginated result with:
  - `items: Transaction[]` - Array of transaction entities matching criteria
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
- Date range filters use `created_at` field (transactions with `created_at` between `from` and `to`)
- Payment status filter uses exact match (case-sensitive)
- Uses indexes on `store_id` and `created_at` for efficient queries
- Returns transactions in no specific order if no sort specified (default: `created_at` descending, most recent first)
- Returns empty array if no results found

**Pagination Rules:**
- Default page: 1
- Default per_page: 20
- Maximum per_page: 100
- Returns empty array if no results found
- Total count calculated before pagination

**Sorting and Filtering Rules:**
- Valid sort fields: "created_at", "total_amount", "payment_status"
- Default sort: "created_at" descending (most recent first)
- Date range filters are inclusive (transactions on start and end dates are included)
- Payment status filter uses exact match

**Related Use Cases:**
- Transaction listing operations (GET /transactions endpoint)

---

### 8. `exists(id: UUID): Promise<boolean>`

**Purpose:**  
Check if a transaction with the given ID exists. Used for quick existence validation without loading the full entity.

**Input Parameters:**
- `id` (UUID): Transaction identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if transaction exists, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses efficient EXISTS query or COUNT query
- Returns boolean value (true/false)
- Does not load transaction entity (more efficient than `findById()` for existence checks)
- Uses primary key index for efficient lookup
- Used for validation before operations that require transaction existence

**Related Use Cases:**
- Transaction validation in various operations

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`, `exists()`, and update operations
   - Index on `store_id` for `findByStoreId()` and store filtering
   - Index on `created_at` for date range queries and sorting

2. **Query Optimization:**
   - Use efficient queries for date range filtering
   - Optimize company-based queries (may require join with stores table)
   - Consider caching for frequently accessed transactions
   - Use `exists()` instead of `findById()` when only existence check is needed

### Data Integrity

1. **Foreign Key Constraints:**
   - `store_id` must reference existing store (enforced by database)
   - `invoice_id` must reference existing invoice (enforced by database)
   - `created_by` must reference existing user (enforced by database)
   - Transactions cannot be deleted if they have linked stock movements (business rule dependent)

2. **Validation:**
   - `payment_status` must be one of: pending, paid_manual, refunded
   - `total_amount` must be >= 0
   - `store_id` and `invoice_id` cannot be changed after creation

3. **Business Rules:**
   - Transaction represents a POS checkout or sale
   - Payment is recorded manually
   - Completing transaction triggers stock decrements for tracked products

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`, `update`) should be within transactions
- Transaction completion should be atomic with stock decrements

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Payment status transition errors should be thrown when invalid transitions are attempted

### Business Rules

1. **Transaction Lifecycle:**
   - Transaction starts with "pending" payment status
   - Transaction transitions to "paid_manual" when payment is recorded
   - Transaction can be "refunded" if payment is refunded

2. **Stock Impact:**
   - Transaction creation does not affect inventory
   - Stock decrement occurs on transaction completion
   - Only tracked products are decremented

3. **Invoice Relationship:**
   - Transaction is linked to an invoice
   - Invoice is created when transaction is created (draft invoice)
   - Invoice can be issued later

---

## Related Repositories

- **StoreRepository:** For store validation and relationships
- **InvoiceRepository:** For invoice validation and relationships
- **TransactionLineRepository:** For managing transaction line items
- **StockMovementRepository:** For stock movements created on transaction completion
- **AuditLogRepository:** For logging transaction operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `findByPaymentStatus(status: string): Promise<Transaction[]>` - Find transactions by payment status
- `getTransactionStatistics(storeId: UUID, dateRange: DateRange): Promise<TransactionStatistics>` - Get transaction statistics
- `findPendingTransactions(storeId: UUID): Promise<Transaction[]>` - Find pending transactions

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

