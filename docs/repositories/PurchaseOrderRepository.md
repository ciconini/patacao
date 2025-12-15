# Repository Interface Contract: PurchaseOrderRepository

## Overview

The `PurchaseOrderRepository` interface defines the contract for purchase order data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for purchase order entity operations, including PO creation, status management, and receiving workflow.

**Entity:** `PurchaseOrder`  
**Table:** `purchase_orders`  
**Module:** Inventory

## Entity Structure

Based on the ER model, the `PurchaseOrder` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `supplier_id` (UUID, NOT NULL, FK -> suppliers(id)) - Supplier for this purchase order
- `store_id` (UUID, NULL, FK -> stores(id)) - Store receiving goods (optional)
- `status` (VARCHAR(32), NOT NULL) - PO status: draft, ordered, received, cancelled
- `created_by` (UUID, NOT NULL, FK -> users(id)) - User who created the PO
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NULL) - Last update timestamp

**Note:** Purchase order lines are stored in separate `purchase_order_lines` table and managed via `PurchaseOrderLineRepository`.

**Indexes:**
- Primary key on `id`
- Index on `supplier_id` (for supplier-PO relationships)
- Index on `status` (for status filtering)

**Relationships:**
- PurchaseOrder 1 — 1 Supplier (via `supplier_id`)
- PurchaseOrder 0..1 — 1 Store (via `store_id`)
- PurchaseOrder 1 — 0..* PurchaseOrderLine (PO line items)
- PurchaseOrder 1 — 0..* StockBatch (batches created when PO is received)

**Business Rules:**
- Receiving goods creates StockBatch and StockMovement entries; PO status updates to `received`
- PO status transitions: draft → ordered → received (or cancelled)
- Draft POs can be edited; ordered POs may have restrictions
- PO must have at least one line item

---

## Method Specifications

### 1. `save(purchaseOrder: PurchaseOrder): Promise<PurchaseOrder>`

**Purpose:**  
Persist a new purchase order entity. This method handles PO creation and is used during purchase order setup.

**Input Parameters:**
- `purchaseOrder` (PurchaseOrder): Purchase order entity to persist
  - `id` is null/undefined (new PO)
  - Required fields: `supplier_id`, `status`, `created_by`
  - Optional fields: `store_id`

**Output Type:**
- `Promise<PurchaseOrder>`: Returns the persisted purchase order entity with all fields populated, including generated `id`, `created_at`, and `updated_at` timestamps

**Error Conditions:**
- `PurchaseOrderValidationError`: If required fields are missing or invalid
- `SupplierNotFoundError`: If `supplier_id` does not exist
- `StoreNotFoundError`: If `store_id` is provided and does not exist
- `InvalidStatusError`: If `status` is not one of: draft, ordered, received, cancelled
- `UserNotFoundError`: If `created_by` does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Supplier and store existence validation should be within the same transaction

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `created_at` and `updated_at` to current timestamp
- Validates that `supplier_id` references existing supplier
- Validates that `store_id` references existing store if provided
- Validates that `created_by` references existing user
- Sets default status to "draft" if not provided
- Returns the complete purchase order entity with all fields
- Does not create PO lines (handled by PurchaseOrderLineRepository)

**Related Use Cases:**
- UC-INV-011: Create Purchase Order

---

### 2. `findById(id: UUID): Promise<PurchaseOrder | null>`

**Purpose:**  
Retrieve a purchase order entity by its unique identifier. Used for PO lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Purchase order identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<PurchaseOrder | null>`: Returns the purchase order entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete purchase order entity with all fields
- Returns `null` if PO with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by any criteria (pure ID lookup)
- Does not include PO lines (load separately via PurchaseOrderLineRepository)

**Related Use Cases:**
- UC-INV-011: Create Purchase Order (validation)
- UC-INV-012: Receive Purchase Order
- UC-INV-001: Receive Stock (PO validation)

---

### 3. `update(purchaseOrder: PurchaseOrder): Promise<PurchaseOrder>`

**Purpose:**  
Update an existing purchase order entity. Used for modifying PO status, store assignment, and other PO details.

**Input Parameters:**
- `purchaseOrder` (PurchaseOrder): Purchase order entity with updated fields
  - `id` must be valid UUID of existing PO
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)

**Output Type:**
- `Promise<PurchaseOrder>`: Returns the updated purchase order entity with all fields

**Error Conditions:**
- `PurchaseOrderNotFoundError`: If PO with given `id` does not exist
- `PurchaseOrderValidationError`: If updated fields are invalid
- `InvalidStatusError`: If `status` is being updated and is not valid
- `InvalidStatusTransitionError`: If status transition is not allowed (e.g., received → draft)
- `StoreNotFoundError`: If `store_id` is being updated and new store does not exist
- `ImmutableFieldError`: If `supplier_id` or `created_by` is being updated (not allowed)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Status transition validation should be within the same transaction

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Preserves `created_at` timestamp
- Updates `updated_at` timestamp to current time
- Does not allow `supplier_id` or `created_by` to be changed (immutable)
- Validates status transitions (business rule validation in application layer)
- Returns complete updated purchase order entity

**Related Use Cases:**
- UC-INV-012: Receive Purchase Order (update PO status)

---

### 4. `findLinesByPOId(poId: UUID): Promise<PurchaseOrderLine[]>`

**Purpose:**  
Retrieve all purchase order lines for a specific purchase order. Used for loading PO details and line item management.

**Input Parameters:**
- `poId` (UUID): Purchase order identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<PurchaseOrderLine[]>`: Returns array of purchase order line entities for the PO
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

### 5. `isReceivable(poId: UUID): Promise<boolean>`

**Purpose:**  
Check if a purchase order is in a receivable state (can be received). Used for validation before receiving goods.

**Input Parameters:**
- `poId` (UUID): Purchase order identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if PO is receivable, `false` otherwise
  - Returns `false` if PO does not exist

**Error Conditions:**
- `InvalidUUIDError`: If `poId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Checks if PO exists and status is "ordered" (receivable state)
- Returns `true` if PO status is "ordered"
- Returns `false` if PO does not exist
- Returns `false` if PO status is not "ordered" (draft, received, or cancelled)
- Uses efficient query (checks status only, does not load full entity)
- Used for validation before receiving operations

**Related Use Cases:**
- UC-INV-001: Receive Stock (check if PO is receivable)
- UC-INV-012: Receive Purchase Order (validate PO is receivable)

---

### 6. `findBySupplierId(supplierId: UUID, status?: string): Promise<PurchaseOrder[]>`

**Purpose:**  
Retrieve all purchase orders for a specific supplier, optionally filtered by status. Used for supplier PO management and reporting.

**Input Parameters:**
- `supplierId` (UUID): Supplier identifier
  - Must be valid UUID format
  - Must not be null or undefined
- `status` (string, optional): Optional status filter
  - Must be one of: draft, ordered, received, cancelled
  - If not provided, returns all statuses

**Output Type:**
- `Promise<PurchaseOrder[]>`: Returns array of purchase order entities for the supplier
  - Returns empty array `[]` if supplier has no POs
  - Returns empty array `[]` if supplier does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `supplierId` is not a valid UUID format
- `InvalidStatusError`: If `status` is provided and is not valid
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters POs where `supplier_id = supplierId`
- If `status` provided, filters by status as well
- Uses indexes on `supplier_id` and `status` for efficient queries
- Returns POs in no specific order (database-dependent)
- Returns empty array if no POs found for supplier
- Used for supplier PO management

**Sorting and Filtering Rules:**
- Filters by supplier and optional status
- No default sorting applied
- Application layer may sort by `created_at` descending (most recent first)

**Related Use Cases:**
- Supplier PO listing operations
- Supplier reporting

---

### 7. `findByStatus(status: string): Promise<PurchaseOrder[]>`

**Purpose:**  
Retrieve all purchase orders with a specific status. Used for status-based PO management and workflow operations.

**Input Parameters:**
- `status` (string): PO status
  - Must be one of: draft, ordered, received, cancelled
  - Must not be null or undefined

**Output Type:**
- `Promise<PurchaseOrder[]>`: Returns array of purchase order entities with the specified status
  - Returns empty array `[]` if no POs found with given status

**Error Conditions:**
- `InvalidStatusError`: If `status` is not a valid PO status
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters POs where `status = status` (exact match)
- Uses index on `status` for efficient query
- Returns POs in no specific order (database-dependent)
- Returns empty array if no POs found with given status
- Used for status-based PO management

**Sorting and Filtering Rules:**
- Filters by status only
- No default sorting applied
- Application layer may sort by `created_at` descending (most recent first)

**Related Use Cases:**
- Status-based PO listing operations
- PO workflow management

---

### 8. `exists(id: UUID): Promise<boolean>`

**Purpose:**  
Check if a purchase order with the given ID exists. Used for quick existence validation without loading the full entity.

**Input Parameters:**
- `id` (UUID): Purchase order identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if PO exists, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses efficient EXISTS query or COUNT query
- Returns boolean value (true/false)
- Does not load PO entity (more efficient than `findById()` for existence checks)
- Uses primary key index for efficient lookup
- Used for validation before operations that require PO existence

**Related Use Cases:**
- PO validation in various operations

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`, `exists()`, and update operations
   - Index on `supplier_id` for `findBySupplierId()` and supplier filtering
   - Index on `status` for `findByStatus()` and status filtering

2. **Query Optimization:**
   - Use efficient queries for status filtering
   - Consider caching PO data if frequently accessed
   - Use `exists()` instead of `findById()` when only existence check is needed

### Data Integrity

1. **Foreign Key Constraints:**
   - `supplier_id` must reference existing supplier (enforced by database)
   - `store_id` must reference existing store if provided (enforced by database)
   - `created_by` must reference existing user (enforced by database)
   - POs cannot be deleted if they have linked stock batches or movements (business rule dependent)

2. **Validation:**
   - `status` must be one of: draft, ordered, received, cancelled
   - Status transitions must be valid (business rule validation in application layer)
   - PO must have at least one line item (validated in application layer)

3. **Business Rules:**
   - PO status transitions: draft → ordered → received (or cancelled)
   - Draft POs can be edited; ordered POs may have restrictions
   - Only "ordered" POs can be received
   - PO must have at least one line item

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`, `update`) should be within transactions
- PO receiving operations should be atomic with stock batch and movement creation

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Status transition errors should be thrown when invalid transitions are attempted

### Business Rules

1. **Status Lifecycle:**
   - PO starts as "draft" (can be edited)
   - PO transitions to "ordered" (sent to supplier, ready for receiving)
   - PO transitions to "received" (all goods received)
   - PO can be "cancelled" at any time (except received)

2. **Receiving Workflow:**
   - Only "ordered" POs can be received
   - Receiving creates stock batches and movements
   - Partial receipts are supported (PO remains "ordered" until fully received)
   - PO status updates to "received" when all lines are fully received

3. **PO Lines:**
   - PO must have at least one line item
   - PO lines are managed separately via PurchaseOrderLineRepository
   - Line items track ordered quantity and received quantity

---

## Related Repositories

- **SupplierRepository:** For supplier validation and relationships
- **StoreRepository:** For store validation and relationships
- **PurchaseOrderLineRepository:** For managing PO line items
- **StockBatchRepository:** For batches created when PO is received
- **StockMovementRepository:** For movements created when PO is received
- **AuditLogRepository:** For logging PO operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `search(criteria: SearchCriteria, pagination: Pagination): Promise<PaginatedResult<PurchaseOrder>>` - Search POs with filters
- `findByStoreId(storeId: UUID, status?: string): Promise<PurchaseOrder[]>` - Find POs by store
- `cancel(poId: UUID, reason?: string): Promise<PurchaseOrder>` - Cancel PO
- `getPOStatistics(supplierId: UUID): Promise<POStatistics>` - Get PO statistics for supplier

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

