# Repository Interface Contract: StockMovementRepository

## Overview

The `StockMovementRepository` interface defines the contract for stock movement data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for stock movement entity operations, including movement history tracking and audit trail.

**Entity:** `StockMovement`  
**Table:** `stock_movements`  
**Module:** Inventory

## Entity Structure

Based on the ER model, the `StockMovement` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `product_id` (UUID, NOT NULL, FK -> products(id)) - Product for this movement
- `batch_id` (UUID, NULL, FK -> stock_batches(id)) - Batch for this movement (optional)
- `quantity_change` (INT, NOT NULL) - Change in quantity (positive for receipt, negative for decrement)
- `reason` (VARCHAR(64), NOT NULL) - Movement reason: receipt, sale, adjustment, transfer, reservation_release
- `performed_by` (UUID, NOT NULL, FK -> users(id)) - User who performed the movement
- `location_id` (UUID, NULL, FK -> inventory_locations(id) or stores(id)) - Location for this movement
- `reference_id` (UUID, NULL) - Generic reference (invoice_id, purchase_order_id, transaction_id, etc.)
- `created_at` (DATETIME, NOT NULL) - Creation timestamp (immutable)

**Indexes:**
- Primary key on `id`
- Index on `product_id` (for product movement history)
- Index on `created_at` (for date range queries)

**Relationships:**
- StockMovement * — 1 Product (via `product_id`)
- StockMovement 0..1 — 1 StockBatch (via `batch_id`)
- StockMovement * — 1 User (via `performed_by`)

**Business Rules:**
- All stock changes must be recorded as StockMovement with `performed_by` and cannot be deleted (only corrected with compensating movement)
- Transactions creating multiple StockMovements must be atomic to preserve consistency
- Stock movements are append-only (immutable after creation)
- Movement reason determines the type of operation

---

## Method Specifications

### 1. `save(movement: StockMovement): Promise<StockMovement>`

**Purpose:**  
Persist a new stock movement entity. This method handles movement creation and is used for all stock changes (receipts, sales, adjustments, transfers, reservation releases).

**Input Parameters:**
- `movement` (StockMovement): Stock movement entity to persist
  - `id` is null/undefined (new movement)
  - Required fields: `product_id`, `quantity_change`, `reason`, `performed_by`, `created_at`
  - Optional fields: `batch_id`, `location_id`, `reference_id`

**Output Type:**
- `Promise<StockMovement>`: Returns the persisted stock movement entity with all fields populated, including generated `id` and `created_at` timestamp

**Error Conditions:**
- `StockMovementValidationError`: If required fields are missing or invalid
- `ProductNotFoundError`: If `product_id` does not exist
- `StockBatchNotFoundError`: If `batch_id` is provided and does not exist
- `InvalidQuantityChangeError`: If `quantity_change` is 0
- `InvalidReasonError`: If `reason` is not one of: receipt, sale, adjustment, transfer, reservation_release
- `UserNotFoundError`: If `performed_by` does not exist
- `LocationNotFoundError`: If `location_id` is provided and does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Should be atomic with product stock updates
- Multiple movements in same transaction should all succeed or all fail

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `created_at` to current timestamp (or uses provided timestamp)
- Validates that `product_id` references existing product
- Validates that `batch_id` references existing batch if provided
- Validates that `performed_by` references existing user
- Validates that `location_id` references existing location if provided
- Validates `reason` is one of the allowed values
- Validates `quantity_change` is not 0 (positive for receipts, negative for decrements)
- Stock movements are append-only (cannot be updated or deleted after creation)
- Returns the complete stock movement entity with all fields

**Related Use Cases:**
- UC-INV-001: Receive Stock (create receipt movements)
- UC-INV-002: Stock Adjustment (create adjustment movements)
- UC-INV-004: Stock Reconciliation (create adjustment movements for variances)
- UC-INV-012: Receive Purchase Order (create receipt movements)
- UC-FIN-007: Complete Transaction (create sale movements)
- UC-SVC-004: Complete Appointment (create sale movements for consumed inventory)

---

### 2. `findById(id: UUID): Promise<StockMovement | null>`

**Purpose:**  
Retrieve a stock movement entity by its unique identifier. Used for movement lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Stock movement identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<StockMovement | null>`: Returns the stock movement entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete stock movement entity with all fields
- Returns `null` if movement with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by any criteria (pure ID lookup)

**Related Use Cases:**
- Movement lookup and validation

---

### 3. `search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<StockMovement>>`

**Purpose:**  
Search and filter stock movement records by various criteria with pagination and sorting. Used for stock movement history, audit trail access, and reporting.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object
  - `product_id?: UUID` - Filter by product
  - `from?: Date` - Start date (filter by `created_at`)
  - `to?: Date` - End date (filter by `created_at`)
  - `reason?: string` - Filter by movement reason (exact match)
  - `location_id?: UUID` - Filter by location
  - `performed_by?: UUID` - Filter by user who performed movement
  - `reference_id?: UUID` - Filter by reference (invoice, PO, transaction, etc.)
  - `batch_id?: UUID` - Filter by batch
- `pagination` (Pagination): Pagination parameters
  - `page: number` - Page number (min 1, default 1)
  - `per_page: number` - Results per page (min 1, max 100, default 20)
- `sort` (Sort): Sort parameters
  - `field: string` - Sort field ("created_at", "product_id", "quantity_change")
  - `direction: 'asc' | 'desc'` - Sort direction (default: "desc" for created_at)

**Output Type:**
- `Promise<PaginatedResult<StockMovement>>`: Returns paginated result with:
  - `items: StockMovement[]` - Array of stock movement entities matching criteria
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
- Date range filters use `created_at` field (movements with `created_at` between `from` and `to`)
- Reason filter uses exact match (case-sensitive)
- Product, location, user, reference, and batch filters use exact match
- Uses indexes on `product_id` and `created_at` for efficient queries
- Returns movements in no specific order if no sort specified (default: `created_at` descending, most recent first)
- Returns empty array if no results found

**Pagination Rules:**
- Default page: 1
- Default per_page: 20
- Maximum per_page: 100
- Returns empty array if no results found
- Total count calculated before pagination

**Sorting and Filtering Rules:**
- Valid sort fields: "created_at", "product_id", "quantity_change"
- Default sort: "created_at" descending (most recent first)
- Date range filters are inclusive (movements on start and end dates are included)
- Reason filter uses exact match (case-sensitive)
- All other filters use exact match

**Related Use Cases:**
- UC-INV-009: Search Stock Movements

---

### 4. `count(criteria: SearchCriteria): Promise<number>`

**Purpose:**  
Count the number of stock movements matching search criteria. Used for pagination metadata calculation.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object (same as `search()` method)
  - `product_id?: UUID` - Filter by product
  - `from?: Date` - Start date
  - `to?: Date` - End date
  - `reason?: string` - Filter by reason
  - `location_id?: UUID` - Filter by location
  - `performed_by?: UUID` - Filter by user
  - `reference_id?: UUID` - Filter by reference
  - `batch_id?: UUID` - Filter by batch

**Output Type:**
- `Promise<number>`: Returns count of matching stock movements (integer >= 0)

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
- UC-INV-009: Search Stock Movements (pagination metadata)

---

### 5. `findByProductId(productId: UUID, dateRange?: DateRange): Promise<StockMovement[]>`

**Purpose:**  
Retrieve all stock movements for a specific product, optionally filtered by date range. Used for product stock history and stock calculation.

**Input Parameters:**
- `productId` (UUID): Product identifier
  - Must be valid UUID format
  - Must not be null or undefined
- `dateRange` (DateRange, optional): Optional date range filter
  - `from?: Date` - Start date
  - `to?: Date` - End date

**Output Type:**
- `Promise<StockMovement[]>`: Returns array of stock movement entities for the product
  - Returns empty array `[]` if product has no movements
  - Returns empty array `[]` if product does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `productId` is not a valid UUID format
- `InvalidDateRangeError`: If `dateRange` is provided and `from` > `to`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters movements where `product_id = productId`
- If `dateRange` provided, filters by `created_at` between `from` and `to` (inclusive)
- Uses index on `product_id` and `created_at` for efficient query
- Returns movements in no specific order (database-dependent)
- Returns empty array if no movements found for product
- Used for stock calculation and product movement history

**Sorting and Filtering Rules:**
- Filters by product and optional date range
- No default sorting applied
- Application layer may sort by `created_at` ascending (chronological order)

**Related Use Cases:**
- Product stock history
- Stock calculation from movements

---

### 6. `findByReferenceId(referenceId: UUID): Promise<StockMovement[]>`

**Purpose:**  
Retrieve all stock movements linked to a specific reference (invoice, purchase order, transaction, etc.). Used for tracking stock changes related to specific operations.

**Input Parameters:**
- `referenceId` (UUID): Reference identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<StockMovement[]>`: Returns array of stock movement entities for the reference
  - Returns empty array `[]` if reference has no movements

**Error Conditions:**
- `InvalidUUIDError`: If `referenceId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters movements where `reference_id = referenceId`
- Returns movements in no specific order (database-dependent)
- Returns empty array if no movements found for reference
- Used for tracking stock changes related to invoices, purchase orders, transactions, etc.

**Sorting and Filtering Rules:**
- Filters by reference only
- No default sorting applied
- Application layer may sort by `created_at` or `product_id`

**Related Use Cases:**
- Stock movement tracking for invoices
- Stock movement tracking for purchase orders
- Stock movement tracking for transactions

---

### 7. `findByReason(reason: string, dateRange?: DateRange): Promise<StockMovement[]>`

**Purpose:**  
Retrieve all stock movements with a specific reason. Used for reporting and audit trail by movement type.

**Input Parameters:**
- `reason` (string): Movement reason
  - Must be one of: receipt, sale, adjustment, transfer, reservation_release
  - Must not be null or undefined
- `dateRange` (DateRange, optional): Optional date range filter
  - `from?: Date` - Start date
  - `to?: Date` - End date

**Output Type:**
- `Promise<StockMovement[]>`: Returns array of stock movement entities with the specified reason
  - Returns empty array `[]` if no movements found with given reason

**Error Conditions:**
- `InvalidReasonError`: If `reason` is not a valid movement reason
- `InvalidDateRangeError`: If `dateRange` is provided and `from` > `to`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters movements where `reason = reason` (exact match, case-sensitive)
- If `dateRange` provided, filters by `created_at` between `from` and `to` (inclusive)
- Uses index on `created_at` for efficient date range queries
- Returns movements in no specific order (database-dependent)
- Used for reporting by movement type

**Sorting and Filtering Rules:**
- Filters by reason and optional date range
- No default sorting applied
- Application layer may sort by `created_at` descending (most recent first)

**Related Use Cases:**
- Movement reporting by type
- Audit trail by reason

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`
   - Index on `product_id` for `findByProductId()` and product filtering
   - Index on `created_at` for date range queries and sorting

2. **Query Optimization:**
   - Use efficient queries for date range filtering
   - Optimize aggregation queries for stock calculation
   - Consider materialized views for frequently accessed movement summaries
   - Use pagination for large result sets

3. **Stock Calculation:**
   - Stock calculation from movements may be expensive for products with many movements
   - Consider caching stock levels or using aggregated fields
   - Use efficient aggregation queries (SUM with proper indexes)

### Data Integrity

1. **Foreign Key Constraints:**
   - `product_id` must reference existing product (enforced by database)
   - `batch_id` must reference existing batch if provided (enforced by database)
   - `performed_by` must reference existing user (enforced by database)
   - `location_id` must reference existing location if provided (enforced by database)

2. **Validation:**
   - `quantity_change` must not be 0 (positive for receipts, negative for decrements)
   - `reason` must be one of the allowed values
   - `created_at` is immutable (cannot be changed after creation)

3. **Business Rules:**
   - Stock movements are append-only (cannot be updated or deleted)
   - Corrections are made with compensating movements
   - All stock changes must be recorded with `performed_by` for audit trail

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`) should be within transactions
- Multiple movements in same transaction should all succeed or all fail (atomicity)

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations

### Business Rules

1. **Append-Only:**
   - Stock movements cannot be updated or deleted after creation
   - Corrections are made with compensating movements (new movement with opposite quantity_change)
   - Movements provide complete audit trail

2. **Movement Reasons:**
   - `receipt`: Stock received (positive quantity_change)
   - `sale`: Stock sold (negative quantity_change)
   - `adjustment`: Manual adjustment (positive or negative quantity_change)
   - `transfer`: Stock transferred between locations (positive or negative quantity_change)
   - `reservation_release`: Reservation released (positive quantity_change, makes stock available)

3. **Audit Trail:**
   - All movements must have `performed_by` (user who performed the operation)
   - Movements are timestamped with `created_at`
   - Movements can reference source operation via `reference_id`

---

## Related Repositories

- **ProductRepository:** For product validation and relationships
- **StockBatchRepository:** For batch validation and relationships
- **UserRepository:** For user validation (performed_by)
- **InventoryLocationRepository:** For location validation
- **AuditLogRepository:** For logging movement operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `findByBatchId(batchId: UUID): Promise<StockMovement[]>` - Find movements for specific batch
- `getMovementStatistics(productId: UUID, dateRange: DateRange): Promise<MovementStatistics>` - Get movement statistics
- `findByLocationId(locationId: UUID, dateRange?: DateRange): Promise<StockMovement[]>` - Find movements by location

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

