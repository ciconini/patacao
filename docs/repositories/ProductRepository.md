# Repository Interface Contract: ProductRepository

## Overview

The `ProductRepository` interface defines the contract for product data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for product entity operations, including CRUD, search, stock management, and inventory tracking.

**Entity:** `Product`  
**Table:** `products`  
**Module:** Inventory

## Entity Structure

Based on the ER model, the `Product` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `sku` (VARCHAR(64), NOT NULL, UNIQUE) - Stock keeping unit (unique identifier)
- `name` (VARCHAR(255), NOT NULL) - Product name
- `description` (TEXT, NULL) - Product description (optional)
- `category` (VARCHAR(128), NULL) - Product category (optional)
- `unit_price` (DECIMAL(12,2), NOT NULL) - Default unit price
- `vat_rate` (DECIMAL(5,2), NOT NULL) - VAT rate percentage (e.g., 23.00 for 23%)
- `stock_tracked` (BOOLEAN, NOT NULL, DEFAULT TRUE) - Whether stock is tracked for this product
- `reorder_threshold` (INT, NULL) - Low-stock threshold (optional)
- `supplier_id` (UUID, NULL, FK -> suppliers(id)) - Supplier reference (optional)
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NULL) - Last update timestamp

**Indexes:**
- Primary key on `id`
- Unique constraint on `sku`
- Index on `sku` (for SKU lookups)
- Index on `supplier_id` (for supplier-product relationships)

**Relationships:**
- Product 1 — 0..* StockBatch (batches for this product)
- Product 1 — 0..* StockMovement (stock movements for this product)
- Product 0..1 — 1 Supplier (via `supplier_id`)

**Business Rules:**
- SKU must be unique per Store or per Company depending on configuration (Company-global by default)
- Sales can include Product line items; if `stock_tracked` is true, reservations and decrements apply
- If `stock_tracked` is false, stock movements are ignored; still allow sales without inventory

---

## Method Specifications

### 1. `save(product: Product): Promise<Product>`

**Purpose:**  
Persist a new product entity. This method handles product creation and is used during product catalog setup.

**Input Parameters:**
- `product` (Product): Product entity to persist
  - `id` is null/undefined (new product)
  - Required fields: `sku`, `name`, `unit_price`, `vat_rate`, `stock_tracked`
  - Optional fields: `description`, `category`, `reorder_threshold`, `supplier_id`

**Output Type:**
- `Promise<Product>`: Returns the persisted product entity with all fields populated, including generated `id`, `created_at`, and `updated_at` timestamps

**Error Conditions:**
- `ProductValidationError`: If required fields are missing or invalid
- `InvalidSkuError`: If `sku` is empty or whitespace-only
- `DuplicateSkuError`: If `sku` already exists in system
- `InvalidPriceError`: If `unit_price` < 0
- `InvalidVatRateError`: If `vat_rate` is outside valid range (0.00 to 100.00)
- `InvalidReorderThresholdError`: If `reorder_threshold` < 0
- `SupplierNotFoundError`: If `supplier_id` is provided and does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- SKU uniqueness check should be within the same transaction
- Supplier existence validation should be within the same transaction if supplier_id is provided

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `created_at` and `updated_at` to current timestamp
- Validates SKU uniqueness (company-global or store-scoped, business rule dependent)
- Validates that `supplier_id` references existing supplier if provided
- Sets `stock_tracked` to true by default if not provided
- Returns the complete product entity with all fields

**Related Use Cases:**
- UC-INV-005: Create Product

---

### 2. `findById(id: UUID): Promise<Product | null>`

**Purpose:**  
Retrieve a product entity by its unique identifier. Used for product lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Product identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Product | null>`: Returns the product entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete product entity with all fields
- Returns `null` if product with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by any criteria (pure ID lookup)

**Related Use Cases:**
- UC-INV-005: Create Product (validation)
- UC-INV-006: Update Product
- UC-INV-007: Search Products (denormalization)
- UC-INV-001: Receive Stock (product validation)
- UC-INV-002: Stock Adjustment (product validation)
- UC-INV-003: Inventory Reservation (product validation)
- UC-INV-011: Create Purchase Order (product validation)
- UC-INV-012: Receive Purchase Order (product validation)
- UC-FIN-001: Create Invoice Draft (product validation)
- UC-FIN-006: Create Transaction (product validation)
- UC-FIN-007: Complete Transaction (product validation)
- UC-SVC-001: Create Service (consumed_items validation)
- UC-SVC-003: Confirm Appointment (consumed_items validation)
- UC-SVC-004: Complete Appointment (consumed_items validation)

---

### 3. `update(product: Product): Promise<Product>`

**Purpose:**  
Update an existing product entity. Used for modifying product information, pricing, VAT, stock tracking, and supplier reference.

**Input Parameters:**
- `product` (Product): Product entity with updated fields
  - `id` must be valid UUID of existing product
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)
  - `sku` cannot be changed (immutable)

**Output Type:**
- `Promise<Product>`: Returns the updated product entity with all fields

**Error Conditions:**
- `ProductNotFoundError`: If product with given `id` does not exist
- `ProductValidationError`: If updated fields are invalid
- `InvalidPriceError`: If `unit_price` is being updated and is < 0
- `InvalidVatRateError`: If `vat_rate` is being updated and is outside valid range
- `InvalidReorderThresholdError`: If `reorder_threshold` is being updated and is < 0
- `ImmutableFieldError`: If `sku` is being updated (not allowed)
- `SupplierNotFoundError`: If `supplier_id` is being updated and new supplier does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Supplier existence validation should be within the same transaction if supplier is being updated

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Preserves `created_at` timestamp
- Updates `updated_at` timestamp to current time
- Does not allow `sku` to be changed (immutable)
- Validates supplier existence if `supplier_id` is being updated
- Returns complete updated product entity

**Related Use Cases:**
- UC-INV-006: Update Product

---

### 4. `findBySku(sku: string): Promise<Product | null>`

**Purpose:**  
Retrieve a product entity by its SKU. Used for SKU uniqueness checks and product lookup by SKU.

**Input Parameters:**
- `sku` (string): Stock keeping unit
  - Must be non-empty string
  - Must not be null or undefined
  - Case-sensitive or case-insensitive match (business rule dependent)

**Output Type:**
- `Promise<Product | null>`: Returns the product entity if found, `null` if not found

**Error Conditions:**
- `InvalidSkuError`: If `sku` is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Searches for product where `sku` matches exactly
- Uses unique index on `sku` for efficient lookup
- Returns first match if multiple products with same SKU exist (should not happen due to uniqueness constraint)
- Returns `null` if no product found with given SKU
- Used for SKU uniqueness validation during create and update operations

**Sorting and Filtering Rules:**
- Exact SKU match (case-sensitive or case-insensitive, business rule dependent)
- No filtering applied (pure SKU lookup)

**Related Use Cases:**
- UC-INV-005: Create Product (SKU uniqueness check)

---

### 5. `search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<Product>>`

**Purpose:**  
Search and filter product records by various criteria with pagination and sorting. Used for product catalog browsing, product lookup during POS checkout, and inventory management.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object
  - `q?: string` - General search query (searches in `name`, `description`, `sku`)
  - `sku?: string` - Filter by exact SKU match
  - `name?: string` - Filter by name (partial match)
  - `category?: string` - Filter by category (exact match)
  - `supplier_id?: UUID` - Filter by supplier
  - `stock_tracked?: boolean` - Filter by stock tracking flag
  - `low_stock?: boolean` - Filter by low stock status (requires stock calculation)
- `pagination` (Pagination): Pagination parameters
  - `page: number` - Page number (min 1, default 1)
  - `per_page: number` - Results per page (min 1, max 100, default 20)
- `sort` (Sort): Sort parameters
  - `field: string` - Sort field ("name", "sku", "unit_price", "category", "created_at")
  - `direction: 'asc' | 'desc'` - Sort direction (default: "asc")

**Output Type:**
- `Promise<PaginatedResult<Product>>`: Returns paginated result with:
  - `items: Product[]` - Array of product entities matching criteria
  - `meta: PaginationMeta` - Pagination metadata (total, page, per_page, total_pages, has_next, has_previous)

**Error Conditions:**
- `InvalidPaginationError`: If pagination parameters are invalid
- `InvalidSortError`: If sort field is invalid
- `InvalidSupplierError`: If `supplier_id` is not a valid UUID
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Builds query with filters based on criteria
- Text search (`q`) searches in `name`, `description`, and `sku` fields (case-insensitive, partial match)
- SKU filter uses exact match (case-sensitive or case-insensitive, business rule dependent)
- Name filter uses partial match (case-insensitive)
- Category filter uses exact match (case-sensitive or case-insensitive, business rule dependent)
- Supplier filter uses exact match
- Stock tracked filter uses exact boolean match
- Low stock filter requires calculating current stock and comparing to `reorder_threshold`
- Uses indexes on `sku`, `supplier_id` for efficient queries
- Returns products in no specific order if no sort specified (default: `name` ascending)
- Returns empty array if no results found

**Pagination Rules:**
- Default page: 1
- Default per_page: 20
- Maximum per_page: 100
- Returns empty array if no results found
- Total count calculated before pagination

**Sorting and Filtering Rules:**
- Valid sort fields: "name", "sku", "unit_price", "category", "created_at"
- Default sort: "name" ascending (alphabetical)
- Text search is case-insensitive and uses partial matching (LIKE or full-text search)
- SKU filter uses exact match
- Category filter uses exact match
- Low stock filter requires stock calculation (may be expensive, consider caching)

**Related Use Cases:**
- UC-INV-007: Search Products

---

### 6. `count(criteria: SearchCriteria): Promise<number>`

**Purpose:**  
Count the number of products matching search criteria. Used for pagination metadata calculation.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object (same as `search()` method)
  - `q?: string` - General search query
  - `sku?: string` - Filter by SKU
  - `name?: string` - Filter by name
  - `category?: string` - Filter by category
  - `supplier_id?: UUID` - Filter by supplier
  - `stock_tracked?: boolean` - Filter by stock tracking flag
  - `low_stock?: boolean` - Filter by low stock status

**Output Type:**
- `Promise<number>`: Returns count of matching products (integer >= 0)

**Error Conditions:**
- `InvalidSupplierError`: If `supplier_id` is not a valid UUID
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
- UC-INV-007: Search Products (pagination metadata)

---

### 7. `checkStock(productId: UUID, quantity: Decimal): Promise<boolean>`

**Purpose:**  
Check if sufficient stock is available for a product. Used for stock availability validation before sales, reservations, and transactions.

**Input Parameters:**
- `productId` (UUID): Product identifier
  - Must be valid UUID format
- `quantity` (Decimal): Required quantity
  - Must be > 0
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if sufficient stock is available, `false` otherwise
  - Returns `false` if product does not exist
  - Returns `false` if product is not stock_tracked

**Error Conditions:**
- `InvalidUUIDError`: If `productId` is not a valid UUID format
- `InvalidQuantityError`: If `quantity` <= 0
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- Should be executed within a read transaction for consistency
- May be part of larger transaction (e.g., transaction completion with stock check)

**Notes on Expected Behaviour:**
- Checks if product exists and `stock_tracked` is true
- Calculates available stock (on-hand stock minus reserved stock)
- Returns `true` if available stock >= `quantity`
- Returns `false` if product does not exist
- Returns `false` if product is not stock_tracked
- Returns `false` if available stock < `quantity`
- Should be fast (< 200ms per N1 requirement)
- Used for stock availability validation before operations

**Sorting and Filtering Rules:**
- No sorting or filtering applied
- Pure availability check based on stock calculation

**Related Use Cases:**
- UC-FIN-007: Complete Transaction (stock availability check)

---

### 8. `decrementStock(productId: UUID, quantity: Decimal): Promise<void>`

**Purpose:**  
Decrement stock level for a product. Used when stock is consumed (sale completion, service completion). This method updates aggregated stock or creates stock movements depending on implementation.

**Input Parameters:**
- `productId` (UUID): Product identifier
  - Must be valid UUID format
- `quantity` (Decimal): Quantity to decrement
  - Must be > 0
  - Must not be null or undefined

**Output Type:**
- `Promise<void>`: Returns void on successful decrement

**Error Conditions:**
- `ProductNotFoundError`: If product with given `id` does not exist
- `InvalidUUIDError`: If `productId` is not a valid UUID format
- `InvalidQuantityError`: If `quantity` <= 0
- `InsufficientStockError`: If available stock < `quantity` (business rule dependent)
- `ProductNotStockTrackedError`: If product is not stock_tracked
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Should be atomic with stock movement creation
- May use database-level locking to prevent race conditions

**Notes on Expected Behaviour:**
- Validates product exists and `stock_tracked` is true
- Decrements stock level (may update aggregated field or rely on stock movements)
- Should check available stock before decrementing (business rule dependent)
- Should prevent negative stock (business rule dependent)
- Used in conjunction with StockMovement creation (stock movement records the change)
- Should be atomic to prevent race conditions

**Related Use Cases:**
- UC-FIN-007: Complete Transaction (decrement stock on sale completion)

---

### 9. `updateOnHand(productId: UUID, delta: Integer): Promise<void>`

**Purpose:**  
Update the on-hand stock level for a product by a delta amount. Used for stock adjustments, receipts, and reconciliation when stock is tracked as an aggregated field.

**Input Parameters:**
- `productId` (UUID): Product identifier
  - Must be valid UUID format
- `delta` (Integer): Change in stock level (positive for increase, negative for decrease)
  - Must not be null or undefined
  - Can be positive (increase) or negative (decrease)

**Output Type:**
- `Promise<void>`: Returns void on successful update

**Error Conditions:**
- `ProductNotFoundError`: If product with given `id` does not exist
- `InvalidUUIDError`: If `productId` is not a valid UUID format
- `ProductNotStockTrackedError`: If product is not stock_tracked
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Should be atomic with stock movement creation
- May use database-level locking to prevent race conditions

**Notes on Expected Behaviour:**
- Validates product exists and `stock_tracked` is true
- Updates on-hand stock by adding `delta` to current value
- Positive `delta` increases stock (receipts, adjustments)
- Negative `delta` decreases stock (sales, adjustments)
- Should prevent negative stock (business rule dependent)
- Used in conjunction with StockMovement creation (stock movement records the change)
- This method is used if stock is tracked as aggregated field; otherwise stock is calculated from movements

**Related Use Cases:**
- UC-INV-001: Receive Stock (update on-hand after receipt)
- UC-INV-002: Stock Adjustment (update on-hand for adjustment)
- UC-INV-004: Stock Reconciliation (update on-hand for reconciliation)

---

### 10. `calculateCurrentStock(productId: UUID): Promise<number>`

**Purpose:**  
Calculate current stock level for a product by summing stock movements. Used for stock display and low-stock calculations when stock is not tracked as aggregated field.

**Input Parameters:**
- `productId` (UUID): Product identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<number>`: Returns current stock level (integer, can be negative if oversold)
  - Returns 0 if product does not exist
  - Returns 0 if product is not stock_tracked

**Error Conditions:**
- `InvalidUUIDError`: If `productId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Calculates stock by summing `quantity_change` from all stock movements for the product
- Positive movements (receipts) increase stock
- Negative movements (sales, adjustments) decrease stock
- Returns integer value (can be negative if oversold, business rule dependent)
- Returns 0 if product does not exist
- Returns 0 if product is not stock_tracked
- Used for stock display and low-stock filtering
- May be expensive for products with many movements (consider caching or aggregation)

**Sorting and Filtering Rules:**
- No sorting or filtering applied
- Pure stock calculation from movements

**Related Use Cases:**
- UC-INV-007: Search Products (calculate current stock for low-stock filtering)

---

### 11. `findBySupplierId(supplierId: UUID): Promise<Product[]>`

**Purpose:**  
Retrieve all products supplied by a specific supplier. Used for supplier-product relationship management and supplier reporting.

**Input Parameters:**
- `supplierId` (UUID): Supplier identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Product[]>`: Returns array of product entities for the supplier
  - Returns empty array `[]` if supplier has no products
  - Returns empty array `[]` if supplier does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `supplierId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters products where `supplier_id = supplierId`
- Uses index on `supplier_id` for efficient query
- Returns products in no specific order (database-dependent)
- Returns empty array if no products found for supplier
- Used for supplier-product relationship management

**Sorting and Filtering Rules:**
- No default sorting applied
- Filters by supplier only
- Application layer may sort by `name`, `sku`, or other criteria

**Related Use Cases:**
- Supplier-product relationship management
- Supplier reporting

---

### 12. `exists(id: UUID): Promise<boolean>`

**Purpose:**  
Check if a product with the given ID exists. Used for quick existence validation without loading the full entity.

**Input Parameters:**
- `id` (UUID): Product identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if product exists, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses efficient EXISTS query or COUNT query
- Returns boolean value (true/false)
- Does not load product entity (more efficient than `findById()` for existence checks)
- Uses primary key index for efficient lookup
- Used for validation before operations that require product existence

**Related Use Cases:**
- Product validation in various operations

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`, `exists()`, and update operations
   - Unique index on `sku` for `findBySku()` and SKU uniqueness checks
   - Index on `supplier_id` for `findBySupplierId()` and supplier filtering

2. **Query Optimization:**
   - Use efficient queries for text search (consider full-text search for large catalogs)
   - Optimize stock calculation queries (consider materialized views or aggregation)
   - Use `exists()` instead of `findById()` when only existence check is needed
   - Cache stock calculations for frequently accessed products

3. **Stock Calculation Performance:**
   - Stock calculation from movements may be expensive for products with many movements
   - Consider caching stock levels or using aggregated fields
   - Use efficient aggregation queries (SUM with proper indexes)

### Data Integrity

1. **Foreign Key Constraints:**
   - `supplier_id` must reference existing supplier if provided (enforced by database)
   - Products cannot be deleted if they have linked stock movements, batches, or reservations (business rule dependent)

2. **Validation:**
   - `sku` must be unique (enforced by database unique constraint)
   - `unit_price` must be >= 0
   - `vat_rate` must be between 0.00 and 100.00
   - `reorder_threshold` must be >= 0 if provided
   - `sku` is immutable (cannot be changed after creation)

3. **Business Rules:**
   - SKU uniqueness is critical for inventory management
   - Stock tracking flag determines whether stock operations apply
   - Stock can be tracked as aggregated field or calculated from movements

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`, `update`, `decrementStock`, `updateOnHand`) should be within transactions
- Stock operations should be atomic with stock movement creation
- SKU uniqueness checks should be within the same transaction as product creation

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Stock availability errors should be thrown when insufficient stock

### Business Rules

1. **SKU Management:**
   - SKU must be unique (company-global by default)
   - SKU is immutable (cannot be changed after creation)
   - SKU is used for product identification and inventory tracking

2. **Stock Tracking:**
   - `stock_tracked` flag determines whether stock operations apply
   - If `stock_tracked` is false, stock movements are ignored
   - Stock can be tracked as aggregated field or calculated from movements

3. **Stock Operations:**
   - Stock decrements occur on sale completion
   - Stock increments occur on receipt
   - Stock adjustments require reason and audit trail
   - Stock reservations reduce available stock but not on-hand

4. **Pricing:**
   - Unit price is default price (can be overridden in transactions/invoices)
   - VAT rate is used for invoice calculations
   - Price can be 0 (free products)

---

## Related Repositories

- **SupplierRepository:** For supplier validation and relationships
- **StockBatchRepository:** For batch management and stock tracking
- **StockMovementRepository:** For stock movement history
- **InventoryReservationRepository:** For stock reservations
- **AuditLogRepository:** For logging product operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `findByCategory(category: string): Promise<Product[]>` - Find products by category
- `findLowStock(threshold?: number): Promise<Product[]>` - Find products below reorder threshold
- `bulkUpdate(products: Product[]): Promise<Product[]>` - Bulk update products
- `delete(id: UUID): Promise<void>` - Soft delete or hard delete product (if business rules allow)
- `getProductStatistics(productId: UUID): Promise<ProductStatistics>` - Get product statistics

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

