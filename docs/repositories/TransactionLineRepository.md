# Repository Interface Contract: TransactionLineRepository

## Overview

The `TransactionLineRepository` interface defines the contract for transaction line data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for transaction line entity operations.

**Entity:** `TransactionLine`  
**Table:** `transaction_lines`  
**Module:** Financial

## Entity Structure

Based on the ER model, the `TransactionLine` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `transaction_id` (UUID, NOT NULL, FK -> transactions(id)) - Transaction this line belongs to
- `product_id` (UUID, NULL, FK -> products(id)) - Product for this line (optional)
- `service_id` (UUID, NULL, FK -> services(id)) - Service for this line (optional)
- `quantity` (INT, NOT NULL) - Quantity
- `unit_price` (DECIMAL(12,2), NOT NULL) - Unit price
- `line_total` (DECIMAL(12,2), NOT NULL) - Line total (quantity * unit_price)

**Indexes:**
- Primary key on `id`
- Index on `transaction_id` (for transaction-line relationships)

**Relationships:**
- TransactionLine * — 1 Transaction (via `transaction_id`)
- TransactionLine 0..1 — 1 Product (via `product_id`)
- TransactionLine 0..1 — 1 Service (via `service_id`)

**Business Rules:**
- Each transaction line represents one product or service with quantity and price
- Line total = quantity * unit_price
- Transaction total is sum of all line totals
- Either `product_id` or `service_id` should be provided (not both, not neither)

---

## Method Specifications

### 1. `saveLines(transactionId: UUID, lines: TransactionLine[]): Promise<TransactionLine[]>`

**Purpose:**  
Persist multiple transaction lines for a transaction. This method handles bulk creation of transaction lines and is used during transaction creation.

**Input Parameters:**
- `transactionId` (UUID): Transaction identifier
  - Must be valid UUID format
  - Must not be null or undefined
  - Must reference existing transaction
- `lines` (TransactionLine[]): Array of transaction line entities to persist
  - Must be non-empty array
  - Each line must have: `quantity`, `unit_price`, `line_total`
  - Optional fields: `product_id`, `service_id` (at least one should be provided)
  - `transaction_id` should match `transactionId` parameter (or set automatically)

**Output Type:**
- `Promise<TransactionLine[]>`: Returns array of persisted transaction line entities with all fields populated, including generated `id` timestamps

**Error Conditions:**
- `TransactionLineValidationError`: If lines array is empty or invalid
- `TransactionNotFoundError`: If `transactionId` does not exist
- `ProductNotFoundError`: If product referenced in any line does not exist
- `ServiceNotFoundError`: If service referenced in any line does not exist
- `InvalidQuantityError`: If any line has `quantity` <= 0
- `InvalidUnitPriceError`: If any line has `unit_price` < 0
- `InvalidLineTotalError`: If any line has `line_total` != `quantity * unit_price`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Transaction and product/service existence validation should be within the same transaction
- All lines must be saved atomically (all or nothing)

**Notes on Expected Behaviour:**
- Generates UUID for each line `id`
- Sets `transaction_id` to `transactionId` for all lines
- Validates that `transactionId` references existing transaction
- Validates that all product IDs reference existing products if provided
- Validates that all service IDs reference existing services if provided
- Validates `quantity` > 0 for each line
- Validates `unit_price` >= 0 for each line
- Validates `line_total` matches calculated total for each line
- Returns array of complete transaction line entities with all fields
- All lines are saved atomically (transaction rollback if any line fails)

**Related Use Cases:**
- UC-FIN-006: Create Transaction (save transaction lines)

---

### 2. `findByTransactionId(transactionId: UUID): Promise<TransactionLine[]>`

**Purpose:**  
Retrieve all transaction lines for a specific transaction. Used for loading transaction details, calculating totals, and line item management.

**Input Parameters:**
- `transactionId` (UUID): Transaction identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<TransactionLine[]>`: Returns array of transaction line entities for the transaction
  - Returns empty array `[]` if transaction has no lines
  - Returns empty array `[]` if transaction does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `transactionId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters transaction lines where `transaction_id = transactionId`
- Uses index on `transaction_id` for efficient query
- Returns lines in no specific order (database-dependent)
- Returns empty array if no lines found for transaction
- Used for transaction detail retrieval and total calculation

**Sorting and Filtering Rules:**
- Filters by transaction only
- No default sorting applied
- Application layer may sort by line creation order or `product_id`/`service_id`

**Related Use Cases:**
- UC-FIN-007: Complete Transaction (load transaction lines for stock decrement)

---

### 3. `findById(id: UUID): Promise<TransactionLine | null>`

**Purpose:**  
Retrieve a transaction line entity by its unique identifier. Used for line lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Transaction line identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<TransactionLine | null>`: Returns the transaction line entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete transaction line entity with all fields
- Returns `null` if line with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by any criteria (pure ID lookup)

**Related Use Cases:**
- Transaction line lookup and validation

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`
   - Index on `transaction_id` for `findByTransactionId()` and transaction filtering

2. **Query Optimization:**
   - Use efficient queries for bulk operations
   - Optimize `saveLines()` for batch inserts
   - Consider caching transaction lines for frequently accessed transactions

3. **Bulk Operations:**
   - `saveLines()` should use batch insert for performance
   - Consider transaction size limits for very large line arrays

### Data Integrity

1. **Foreign Key Constraints:**
   - `transaction_id` must reference existing transaction (enforced by database)
   - `product_id` must reference existing product if provided (enforced by database)
   - `service_id` must reference existing service if provided (enforced by database)
   - Transaction lines cannot exist without transaction

2. **Validation:**
   - `quantity` must be > 0
   - `unit_price` must be >= 0
   - `line_total` must equal `quantity * unit_price`
   - Either `product_id` or `service_id` should be provided (business rule validation in application layer)

3. **Business Rules:**
   - Transaction should have at least one line (business rule validation in application layer)
   - Line totals are calculated and stored (not calculated on-the-fly)

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`saveLines`) should be within transactions
- `saveLines()` must be atomic (all lines saved or none)
- Transaction and product/service existence validation should be within the same transaction as line creation

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Product and service existence errors should be thrown when validating references

### Business Rules

1. **Line Management:**
   - Each line represents one product or service with quantity and price
   - Line total = quantity * unit_price
   - Transaction total is sum of all line totals

2. **Product/Service Reference:**
   - Either `product_id` or `service_id` should be provided
   - Both cannot be provided (business rule validation in application layer)
   - Neither cannot be provided (business rule validation in application layer)

3. **Stock Impact:**
   - Transaction lines with products are used for stock decrement on transaction completion
   - Only tracked products are decremented

---

## Related Repositories

- **TransactionRepository:** For transaction validation and relationships
- **ProductRepository:** For product validation and stock tracking checks
- **ServiceRepository:** For service validation
- **AuditLogRepository:** For logging transaction line operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `update(line: TransactionLine): Promise<TransactionLine>` - Update transaction line (if line editing is needed)
- `delete(id: UUID): Promise<void>` - Delete transaction line (if line deletion is needed)
- `deleteByTransactionId(transactionId: UUID): Promise<number>` - Delete all lines for transaction
- `bulkUpdate(lines: TransactionLine[]): Promise<TransactionLine[]>` - Bulk update transaction lines

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

