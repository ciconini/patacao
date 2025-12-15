# Repository Interface Contract: PurchaseOrderLineRepository

## Overview

The `PurchaseOrderLineRepository` interface defines the contract for purchase order line data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for purchase order line entity operations.

**Entity:** `PurchaseOrderLine`  
**Table:** `purchase_order_lines`  
**Module:** Inventory

## Entity Structure

Based on the ER model, the `PurchaseOrderLine` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `purchase_order_id` (UUID, NOT NULL, FK -> purchase_orders(id)) - Purchase order this line belongs to
- `product_id` (UUID, NOT NULL, FK -> products(id)) - Product for this line
- `quantity` (INT, NOT NULL) - Ordered quantity
- `unit_price` (DECIMAL(12,2), NOT NULL) - Unit price

**Note:** The ER model does not explicitly show a `received_quantity` field, but the use cases reference updating received quantities. This field may be added to track partial receipts, or received quantity may be calculated from stock movements.

**Indexes:**
- Primary key on `id`
- Index on `purchase_order_id` (for PO-line relationships)

**Relationships:**
- PurchaseOrderLine * — 1 PurchaseOrder (via `purchase_order_id`)
- PurchaseOrderLine * — 1 Product (via `product_id`)

**Business Rules:**
- Each PO line represents one product with ordered quantity
- Received quantity is tracked for partial receipt support
- Line total = quantity * unit_price
- PO total is sum of all line totals

---

## Method Specifications

### 1. `saveLines(purchaseOrderId: UUID, lines: PurchaseOrderLine[]): Promise<PurchaseOrderLine[]>`

**Purpose:**  
Persist multiple purchase order lines for a purchase order. This method handles bulk creation of PO lines and is used during purchase order creation.

**Input Parameters:**
- `purchaseOrderId` (UUID): Purchase order identifier
  - Must be valid UUID format
  - Must not be null or undefined
  - Must reference existing purchase order
- `lines` (PurchaseOrderLine[]): Array of PO line entities to persist
  - Must be non-empty array
  - Each line must have: `product_id`, `quantity`, `unit_price`
  - `purchase_order_id` should match `purchaseOrderId` parameter (or set automatically)

**Output Type:**
- `Promise<PurchaseOrderLine[]>`: Returns array of persisted PO line entities with all fields populated, including generated `id` timestamps

**Error Conditions:**
- `PurchaseOrderLineValidationError`: If lines array is empty or invalid
- `PurchaseOrderNotFoundError`: If `purchaseOrderId` does not exist
- `ProductNotFoundError`: If product referenced in any line does not exist
- `InvalidQuantityError`: If any line has `quantity` <= 0
- `InvalidUnitPriceError`: If any line has `unit_price` < 0
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Purchase order and product existence validation should be within the same transaction
- All lines must be saved atomically (all or nothing)

**Notes on Expected Behaviour:**
- Generates UUID for each line `id`
- Sets `purchase_order_id` to `purchaseOrderId` for all lines
- Validates that `purchaseOrderId` references existing purchase order
- Validates that all product IDs reference existing products
- Validates `quantity` > 0 for each line
- Validates `unit_price` >= 0 for each line
- Returns array of complete PO line entities with all fields
- All lines are saved atomically (transaction rollback if any line fails)

**Related Use Cases:**
- UC-INV-011: Create Purchase Order (save PO lines)

---

### 2. `findByPurchaseOrderId(poId: UUID): Promise<PurchaseOrderLine[]>`

**Purpose:**  
Retrieve all purchase order lines for a specific purchase order. Used for loading PO details, calculating totals, and line item management.

**Input Parameters:**
- `poId` (UUID): Purchase order identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<PurchaseOrderLine[]>`: Returns array of PO line entities for the purchase order
  - Returns empty array `[]` if PO has no lines
  - Returns empty array `[]` if PO does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `poId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters PO lines where `purchase_order_id = poId`
- Uses index on `purchase_order_id` for efficient query
- Returns lines in no specific order (database-dependent)
- Returns empty array if no lines found for PO
- Used for PO detail retrieval and receiving workflow

**Sorting and Filtering Rules:**
- Filters by purchase order only
- No default sorting applied
- Application layer may sort by line creation order or `product_id`

**Related Use Cases:**
- UC-INV-012: Receive Purchase Order (load PO lines for receiving)

---

### 3. `findById(id: UUID): Promise<PurchaseOrderLine | null>`

**Purpose:**  
Retrieve a purchase order line entity by its unique identifier. Used for line lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Purchase order line identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<PurchaseOrderLine | null>`: Returns the PO line entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete PO line entity with all fields
- Returns `null` if line with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by any criteria (pure ID lookup)

**Related Use Cases:**
- PO line lookup and validation

---

### 4. `updateReceivedQuantity(lineId: UUID, receivedQuantity: Integer): Promise<void>`

**Purpose:**  
Update the received quantity for a purchase order line. Used during PO receiving to track partial receipts.

**Input Parameters:**
- `lineId` (UUID): Purchase order line identifier
  - Must be valid UUID format
  - Must not be null or undefined
- `receivedQuantity` (Integer): Received quantity to set
  - Must be >= 0
  - Must not be null or undefined
  - Should be <= ordered quantity (validated in application layer)

**Output Type:**
- `Promise<void>`: Returns void on successful update

**Error Conditions:**
- `PurchaseOrderLineNotFoundError`: If line with given `id` does not exist
- `InvalidUUIDError`: If `lineId` is not a valid UUID format
- `InvalidQuantityError`: If `receivedQuantity` < 0
- `ExceedsOrderedQuantityError`: If `receivedQuantity` > ordered quantity (business rule validation in application layer)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Should be atomic with stock batch and movement creation

**Notes on Expected Behaviour:**
- Updates `received_quantity` field (if field exists in ER model) or tracks via other mechanism
- Validates line exists before updating
- Validates `receivedQuantity` >= 0
- May validate `receivedQuantity` <= ordered quantity (application layer responsibility)
- Used for tracking partial receipts during PO receiving

**Related Use Cases:**
- UC-INV-012: Receive Purchase Order (update received quantity for each line)

---

### 5. `update(line: PurchaseOrderLine): Promise<PurchaseOrderLine>`

**Purpose:**  
Update an existing purchase order line entity. Used for modifying quantity, unit price, or product assignment.

**Input Parameters:**
- `line` (PurchaseOrderLine): Purchase order line entity with updated fields
  - `id` must be valid UUID of existing line
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)

**Output Type:**
- `Promise<PurchaseOrderLine>`: Returns the updated PO line entity with all fields

**Error Conditions:**
- `PurchaseOrderLineNotFoundError`: If line with given `id` does not exist
- `PurchaseOrderLineValidationError`: If updated fields are invalid
- `ProductNotFoundError`: If `product_id` is being updated and new product does not exist
- `InvalidQuantityError`: If `quantity` is being updated and is <= 0
- `InvalidUnitPriceError`: If `unit_price` is being updated and is < 0
- `ImmutableFieldError`: If `purchase_order_id` is being updated (not allowed)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Product existence validation should be within the same transaction if product is being updated

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Does not allow `purchase_order_id` to be changed (immutable)
- Validates product existence if `product_id` is being updated
- Validates `quantity` > 0 if being updated
- Validates `unit_price` >= 0 if being updated
- Returns complete updated PO line entity

**Related Use Cases:**
- Future: Update Purchase Order Line use case

---

### 6. `delete(id: UUID): Promise<void>`

**Purpose:**  
Permanently delete a purchase order line entity from the database. Used for removing lines from draft purchase orders.

**Input Parameters:**
- `id` (UUID): Purchase order line identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<void>`: Returns void on successful deletion

**Error Conditions:**
- `PurchaseOrderLineNotFoundError`: If line with given `id` does not exist
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- May require validation that PO is in editable state (business rule)

**Notes on Expected Behaviour:**
- Permanently deletes PO line record from database
- Does not cascade delete purchase order (PO remains)
- Should verify PO is in editable state (draft status, business rule validation in application layer)
- Hard delete is permanent and cannot be undone
- Should be logged in audit trail (handled in application layer)

**Related Use Cases:**
- Future: Delete Purchase Order Line use case

---

### 7. `deleteByPurchaseOrderId(poId: UUID): Promise<number>`

**Purpose:**  
Delete all purchase order lines for a specific purchase order. Used for PO cancellation or line replacement.

**Input Parameters:**
- `poId` (UUID): Purchase order identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<number>`: Returns number of deleted PO lines (integer >= 0)

**Error Conditions:**
- `InvalidUUIDError`: If `poId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Bulk delete operation should be atomic

**Notes on Expected Behaviour:**
- Deletes all PO lines where `purchase_order_id = poId`
- Uses index on `purchase_order_id` for efficient query
- Returns count of deleted lines
- Returns 0 if no lines found for PO
- Used for PO cancellation or line replacement
- Should verify PO is in editable state (business rule validation in application layer)

**Related Use Cases:**
- PO cancellation (delete all lines)
- PO line replacement operations

---

### 8. `countByPurchaseOrderId(poId: UUID): Promise<number>`

**Purpose:**  
Count the number of purchase order lines for a specific purchase order. Used for validation and business rule checks.

**Input Parameters:**
- `poId` (UUID): Purchase order identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<number>`: Returns count of PO lines for the purchase order (integer >= 0)
  - Returns `0` if PO has no lines
  - Returns `0` if PO does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `poId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Counts PO lines where `purchase_order_id = poId`
- Uses index on `purchase_order_id` for efficient COUNT query
- Returns integer count, never negative
- Used for validation (e.g., PO must have at least one line)

**Related Use Cases:**
- PO validation (ensure PO has lines)

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`, `update()`, and `delete()`
   - Index on `purchase_order_id` for `findByPurchaseOrderId()`, `deleteByPurchaseOrderId()`, and `countByPurchaseOrderId()`

2. **Query Optimization:**
   - Use efficient queries for bulk operations
   - Optimize `saveLines()` for batch inserts
   - Use `countByPurchaseOrderId()` instead of loading all lines when only count is needed

3. **Bulk Operations:**
   - `saveLines()` should use batch insert for performance
   - `deleteByPurchaseOrderId()` should use bulk delete
   - Consider transaction size limits for very large line arrays

### Data Integrity

1. **Foreign Key Constraints:**
   - `purchase_order_id` must reference existing purchase order (enforced by database)
   - `product_id` must reference existing product (enforced by database)
   - PO lines cannot exist without purchase order

2. **Validation:**
   - `quantity` must be > 0
   - `unit_price` must be >= 0
   - Purchase order must exist before creating lines
   - Product must exist before creating line

3. **Business Rules:**
   - PO should have at least one line (business rule validation in application layer)
   - Lines can only be edited when PO is in "draft" status (business rule validation in application layer)
   - Received quantity cannot exceed ordered quantity

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`saveLines`, `update`, `updateReceivedQuantity`, `delete`, `deleteByPurchaseOrderId`) should be within transactions
- `saveLines()` must be atomic (all lines saved or none)
- Purchase order and product existence validation should be within the same transaction as line creation

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Product and purchase order existence errors should be thrown when validating references

### Business Rules

1. **Line Management:**
   - Each line represents one product with ordered quantity
   - Line total = quantity * unit_price
   - PO total is sum of all line totals

2. **Receiving:**
   - Received quantity is tracked for partial receipt support
   - Received quantity cannot exceed ordered quantity
   - PO status updates to "received" when all lines are fully received

3. **Editable State:**
   - Lines can only be edited when PO is in "draft" status
   - Ordered POs may have restrictions on line modifications
   - Received POs cannot be modified

---

## Related Repositories

- **PurchaseOrderRepository:** For purchase order validation and relationships
- **ProductRepository:** For product validation and price lookup
- **AuditLogRepository:** For logging PO line operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `findByProductId(productId: UUID): Promise<PurchaseOrderLine[]>` - Find PO lines by product
- `updateQuantity(id: UUID, quantity: number): Promise<PurchaseOrderLine>` - Update quantity only
- `updateUnitPrice(id: UUID, unitPrice: Decimal): Promise<PurchaseOrderLine>` - Update unit price only
- `bulkUpdate(lines: PurchaseOrderLine[]): Promise<PurchaseOrderLine[]>` - Bulk update PO lines

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

