# Repository Interface Contract: StockBatchRepository

## Overview

The `StockBatchRepository` interface defines the contract for stock batch data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for stock batch entity operations, including batch creation, tracking, and expiry management.

**Entity:** `StockBatch`  
**Table:** `stock_batches`  
**Module:** Inventory

**Note:** This entity is optional and provides batch/expiry tracking for products. If not used, stock is tracked without batch granularity.

## Entity Structure

Based on the ER model, the `StockBatch` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `product_id` (UUID, NOT NULL, FK -> products(id)) - Product this batch belongs to
- `batch_number` (VARCHAR(128), NULL) - Batch number (optional)
- `quantity` (INT, NOT NULL) - Quantity in batch
- `expiry_date` (DATETIME, NULL) - Expiry date (optional)
- `received_at` (DATETIME, NOT NULL) - Date when batch was received
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NULL) - Last update timestamp

**Indexes:**
- Primary key on `id`
- Index on `product_id` (for product-batch relationships)
- Index on `batch_number` (for batch number lookups)

**Relationships:**
- StockBatch 1 — 1 Product (via `product_id`)
- StockBatch 1 — 0..* StockMovement (stock movements for this batch)

**Business Rules:**
- Items in expired StockBatch cannot be sold; system must block them at POS
- Batch number may be unique per product or globally (business rule dependent)
- Batch quantity decreases as stock is consumed
- Expired batches should be blocked from sales

---

## Method Specifications

### 1. `save(batch: StockBatch): Promise<StockBatch>`

**Purpose:**  
Persist a new stock batch entity. This method handles batch creation and is used during stock receipt operations.

**Input Parameters:**
- `batch` (StockBatch): Stock batch entity to persist
  - `id` is null/undefined (new batch)
  - Required fields: `product_id`, `quantity`, `received_at`
  - Optional fields: `batch_number`, `expiry_date`

**Output Type:**
- `Promise<StockBatch>`: Returns the persisted stock batch entity with all fields populated, including generated `id`, `created_at`, and `updated_at` timestamps

**Error Conditions:**
- `StockBatchValidationError`: If required fields are missing or invalid
- `ProductNotFoundError`: If `product_id` does not exist
- `InvalidQuantityError`: If `quantity` <= 0
- `InvalidExpiryDateError`: If `expiry_date` is in the past
- `DuplicateBatchNumberError`: If `batch_number` already exists for the product (business rule dependent)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Product existence validation should be within the same transaction

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `created_at` and `updated_at` to current timestamp
- Validates that `product_id` references existing product
- Validates `quantity` > 0
- Validates `expiry_date` is not in the past if provided
- May validate batch number uniqueness within product (business rule dependent)
- Returns the complete stock batch entity with all fields

**Related Use Cases:**
- Stock receipt operations
- Purchase order receiving

---

### 2. `createOrIncrement(batchInput: StockBatchInput): Promise<StockBatch>`

**Purpose:**  
Create a new batch or increment quantity of existing batch. Used during stock receipt when batches may already exist (e.g., same batch number, same expiry date).

**Input Parameters:**
- `batchInput` (StockBatchInput): Batch input object
  - `product_id` (UUID, required) - Product identifier
  - `batch_number` (string, optional) - Batch number
  - `expiry_date` (DateTime, optional) - Expiry date
  - `quantity` (Integer, required) - Quantity to add
  - `received_at` (DateTime, required) - Receipt date

**Output Type:**
- `Promise<StockBatch>`: Returns the stock batch entity (newly created or updated)

**Error Conditions:**
- `ProductNotFoundError`: If `product_id` does not exist
- `InvalidQuantityError`: If `quantity` <= 0
- `InvalidExpiryDateError`: If `expiry_date` is in the past
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Should be atomic (create or increment, not both)

**Notes on Expected Behaviour:**
- Searches for existing batch with matching `product_id`, `batch_number`, and `expiry_date`
- If batch exists, increments `quantity` by input quantity
- If batch does not exist, creates new batch with input quantity
- Updates `received_at` if creating new batch or if input `received_at` is newer
- Updates `updated_at` timestamp
- Returns the batch entity (newly created or updated)
- Used for stock receipt operations where batches may be merged

**Related Use Cases:**
- UC-INV-001: Receive Stock (create or increment batch)
- UC-INV-012: Receive Purchase Order (create or increment batch)

---

### 3. `findById(id: UUID): Promise<StockBatch | null>`

**Purpose:**  
Retrieve a stock batch entity by its unique identifier. Used for batch lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Stock batch identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<StockBatch | null>`: Returns the stock batch entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete stock batch entity with all fields
- Returns `null` if batch with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by any criteria (pure ID lookup)

**Related Use Cases:**
- Batch lookup and validation

---

### 4. `findByProductId(productId: UUID): Promise<StockBatch[]>`

**Purpose:**  
Retrieve all stock batches for a specific product. Used for product batch management, expiry tracking, and stock calculation.

**Input Parameters:**
- `productId` (UUID): Product identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<StockBatch[]>`: Returns array of stock batch entities for the product
  - Returns empty array `[]` if product has no batches
  - Returns empty array `[]` if product does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `productId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters batches where `product_id = productId`
- Uses index on `product_id` for efficient query
- Returns batches in no specific order (database-dependent)
- Returns empty array if no batches found for product
- Used for product batch management and stock calculation

**Sorting and Filtering Rules:**
- No default sorting applied
- Filters by product only
- Application layer may sort by `expiry_date`, `received_at`, or `batch_number`

**Related Use Cases:**
- Product batch listing
- Stock calculation by batch
- Expiry tracking

---

### 5. `findByProductAndBatch(productId: UUID, batchNumber: string): Promise<StockBatch | null>`

**Purpose:**  
Retrieve a stock batch by product ID and batch number. Used for batch lookup during stock receipt and reconciliation.

**Input Parameters:**
- `productId` (UUID): Product identifier
  - Must be valid UUID format
- `batchNumber` (string): Batch number
  - Must be non-empty string
  - Must not be null or undefined

**Output Type:**
- `Promise<StockBatch | null>`: Returns the stock batch entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `productId` is not a valid UUID format
- `InvalidBatchNumberError`: If `batchNumber` is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Searches for batch where `product_id = productId` AND `batch_number = batchNumber`
- Uses indexes on `product_id` and `batch_number` for efficient lookup
- Returns first match if multiple batches exist (should not happen if uniqueness enforced)
- Returns `null` if no batch found with given product and batch number
- Used for batch lookup during stock operations

**Sorting and Filtering Rules:**
- Exact batch number match (case-sensitive or case-insensitive, business rule dependent)
- Filters by product and batch number

**Related Use Cases:**
- UC-INV-004: Stock Reconciliation (find batch by product and batch number)

---

### 6. `findExpiredBatches(beforeDate?: Date): Promise<StockBatch[]>`

**Purpose:**  
Retrieve all expired stock batches. Used for expiry tracking, blocking expired stock from sales, and cleanup operations.

**Input Parameters:**
- `beforeDate` (Date, optional): Date to check expiry against
  - If not provided, uses current date
  - Must be valid date

**Output Type:**
- `Promise<StockBatch[]>`: Returns array of expired stock batch entities
  - Returns empty array `[]` if no expired batches found

**Error Conditions:**
- `InvalidDateError`: If `beforeDate` is invalid
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters batches where `expiry_date IS NOT NULL` AND `expiry_date < beforeDate` (or current date)
- Returns batches with quantity > 0 (only batches with stock)
- Returns batches in no specific order (database-dependent)
- Used for expiry tracking and blocking expired stock from sales

**Sorting and Filtering Rules:**
- Filters by expiry date only
- No default sorting applied
- Application layer may sort by `expiry_date` ascending (earliest expiry first)

**Related Use Cases:**
- Expiry tracking operations
- Blocking expired stock from sales
- Cleanup operations

---

### 7. `update(batch: StockBatch): Promise<StockBatch>`

**Purpose:**  
Update an existing stock batch entity. Used for modifying batch quantity, expiry date, or batch number.

**Input Parameters:**
- `batch` (StockBatch): Stock batch entity with updated fields
  - `id` must be valid UUID of existing batch
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)

**Output Type:**
- `Promise<StockBatch>`: Returns the updated stock batch entity with all fields

**Error Conditions:**
- `StockBatchNotFoundError`: If batch with given `id` does not exist
- `StockBatchValidationError`: If updated fields are invalid
- `InvalidQuantityError`: If `quantity` is being updated and is < 0
- `InvalidExpiryDateError`: If `expiry_date` is being updated and is in the past
- `ImmutableFieldError`: If `product_id` is being updated (not allowed)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Preserves `created_at` timestamp
- Updates `updated_at` timestamp to current time
- Does not allow `product_id` to be changed (immutable)
- Validates `quantity` >= 0 if being updated
- Validates `expiry_date` is not in the past if being updated
- Returns complete updated stock batch entity

**Related Use Cases:**
- Batch quantity updates
- Batch expiry date updates

---

### 8. `decrementQuantity(batchId: UUID, quantity: Integer): Promise<void>`

**Purpose:**  
Decrement the quantity of a stock batch. Used when stock from a specific batch is consumed (sale, service completion).

**Input Parameters:**
- `batchId` (UUID): Stock batch identifier
  - Must be valid UUID format
- `quantity` (Integer): Quantity to decrement
  - Must be > 0
  - Must not be null or undefined

**Output Type:**
- `Promise<void>`: Returns void on successful decrement

**Error Conditions:**
- `StockBatchNotFoundError`: If batch with given `id` does not exist
- `InvalidUUIDError`: If `batchId` is not a valid UUID format
- `InvalidQuantityError`: If `quantity` <= 0
- `InsufficientBatchQuantityError`: If batch quantity < `quantity`
- `ExpiredBatchError`: If batch is expired (business rule dependent)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Should be atomic with stock movement creation
- May use database-level locking to prevent race conditions

**Notes on Expected Behaviour:**
- Decrements batch `quantity` by input quantity
- Validates batch exists and has sufficient quantity
- Validates batch is not expired (business rule dependent)
- Should prevent negative quantity (business rule dependent)
- Updates `updated_at` timestamp
- Used in conjunction with StockMovement creation (stock movement records the change)
- Should be atomic to prevent race conditions

**Related Use Cases:**
- Stock consumption from specific batches
- Batch-aware stock decrements

---

### 9. `exists(id: UUID): Promise<boolean>`

**Purpose:**  
Check if a stock batch with the given ID exists. Used for quick existence validation without loading the full entity.

**Input Parameters:**
- `id` (UUID): Stock batch identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if batch exists, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses efficient EXISTS query or COUNT query
- Returns boolean value (true/false)
- Does not load batch entity (more efficient than `findById()` for existence checks)
- Uses primary key index for efficient lookup
- Used for validation before operations that require batch existence

**Related Use Cases:**
- Batch validation in stock operations

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`, `exists()`, and update operations
   - Index on `product_id` for `findByProductId()` and product filtering
   - Index on `batch_number` for `findByProductAndBatch()` and batch number lookups

2. **Query Optimization:**
   - Use efficient queries for batch lookups
   - Consider caching batch data for frequently accessed products
   - Optimize expiry queries with proper date indexes

3. **Batch Operations:**
   - `createOrIncrement()` should use efficient upsert operations
   - Batch quantity updates should be atomic

### Data Integrity

1. **Foreign Key Constraints:**
   - `product_id` must reference existing product (enforced by database)
   - Stock movements may reference batch via `batch_id` (enforced by database)
   - Batches cannot be deleted if they have linked stock movements (business rule dependent)

2. **Validation:**
   - `quantity` must be >= 0
   - `expiry_date` must not be in the past if provided
   - Batch number may need to be unique within product (business rule dependent)

3. **Business Rules:**
   - Expired batches cannot be sold (blocked at POS)
   - Batch quantity decreases as stock is consumed
   - Batch number is optional but useful for tracking

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`, `createOrIncrement`, `update`, `decrementQuantity`) should be within transactions
- Batch operations should be atomic with stock movement creation

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Expired batch errors should be thrown when attempting to use expired batches

### Business Rules

1. **Expiry Management:**
   - Expired batches cannot be sold
   - Expiry date is optional (not all products have expiry)
   - Expired batches should be blocked at POS

2. **Batch Tracking:**
   - Batch number is optional but useful for tracking
   - Batches can be merged if same batch number and expiry
   - Batch quantity tracks available stock in batch

3. **Stock Consumption:**
   - Stock can be consumed from specific batches
   - Batch quantity decreases as stock is consumed
   - FIFO/LIFO rules may apply (business rule dependent)

---

## Related Repositories

- **ProductRepository:** For product validation and relationships
- **StockMovementRepository:** For stock movements linked to batches
- **AuditLogRepository:** For logging batch operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `findByExpiryDateRange(startDate: Date, endDate: Date): Promise<StockBatch[]>` - Find batches expiring in date range
- `getBatchStatistics(productId: UUID): Promise<BatchStatistics>` - Get batch statistics for product
- `delete(id: UUID): Promise<void>` - Delete batch (if business rules allow)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

