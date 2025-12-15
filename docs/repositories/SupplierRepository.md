# Repository Interface Contract: SupplierRepository

## Overview

The `SupplierRepository` interface defines the contract for supplier data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for supplier entity operations.

**Entity:** `Supplier`  
**Table:** `suppliers`  
**Module:** Inventory

## Entity Structure

Based on the ER model, the `Supplier` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `name` (VARCHAR(255), NOT NULL) - Supplier name
- `contact_email` (VARCHAR(255), NULL) - Contact email (optional)
- `phone` (VARCHAR(32), NULL) - Contact phone number (optional)
- `default_lead_time_days` (INT, NULL) - Default lead time in days (optional)
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NULL) - Last update timestamp

**Indexes:**
- Primary key on `id`
- Index on `name` (for search operations)

**Relationships:**
- Supplier 1 — 0..* Product (via product.supplier_id)
- Supplier 1 — 0..* PurchaseOrder (purchase orders from supplier)

**Business Rules:**
- Suggested reorder uses Supplier `default_lead_time_days` when calculating expected arrival
- Supplier name uniqueness may or may not be enforced (business rule dependent)
- Contact information (email/phone) is optional but recommended

---

## Method Specifications

### 1. `save(supplier: Supplier): Promise<Supplier>`

**Purpose:**  
Persist a new supplier entity. This method handles supplier creation and is used during supplier setup.

**Input Parameters:**
- `supplier` (Supplier): Supplier entity to persist
  - `id` is null/undefined (new supplier)
  - Required fields: `name`
  - Optional fields: `contact_email`, `phone`, `default_lead_time_days`

**Output Type:**
- `Promise<Supplier>`: Returns the persisted supplier entity with all fields populated, including generated `id`, `created_at`, and `updated_at` timestamps

**Error Conditions:**
- `SupplierValidationError`: If required fields are missing or invalid
- `InvalidNameError`: If `name` is empty or whitespace-only
- `InvalidEmailError`: If `contact_email` format is invalid
- `InvalidPhoneError`: If `phone` format is invalid
- `InvalidLeadTimeError`: If `default_lead_time_days` < 0
- `DuplicateNameError`: If supplier name already exists (business rule dependent)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `created_at` and `updated_at` to current timestamp
- Validates `name` is non-empty and not whitespace-only
- Validates email format if `contact_email` is provided
- Validates phone format if `phone` is provided
- May validate name uniqueness (business rule dependent)
- Returns the complete supplier entity with all fields

**Related Use Cases:**
- UC-INV-008: Create Supplier

---

### 2. `findById(id: UUID): Promise<Supplier | null>`

**Purpose:**  
Retrieve a supplier entity by its unique identifier. Used for supplier lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Supplier identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Supplier | null>`: Returns the supplier entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete supplier entity with all fields
- Returns `null` if supplier with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by any criteria (pure ID lookup)

**Related Use Cases:**
- UC-INV-005: Create Product (supplier validation)
- UC-INV-006: Update Product (supplier validation)
- UC-INV-008: Create Supplier (validation)
- UC-INV-011: Create Purchase Order (supplier validation)
- UC-INV-001: Receive Stock (supplier validation)

---

### 3. `update(supplier: Supplier): Promise<Supplier>`

**Purpose:**  
Update an existing supplier entity. Used for modifying supplier information, contact details, and lead time.

**Input Parameters:**
- `supplier` (Supplier): Supplier entity with updated fields
  - `id` must be valid UUID of existing supplier
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)

**Output Type:**
- `Promise<Supplier>`: Returns the updated supplier entity with all fields

**Error Conditions:**
- `SupplierNotFoundError`: If supplier with given `id` does not exist
- `SupplierValidationError`: If updated fields are invalid
- `InvalidNameError`: If `name` is being updated and is empty or whitespace-only
- `InvalidEmailError`: If `contact_email` is being updated and format is invalid
- `InvalidPhoneError`: If `phone` is being updated and format is invalid
- `InvalidLeadTimeError`: If `default_lead_time_days` is being updated and is < 0
- `DuplicateNameError`: If `name` is being updated and already exists (business rule dependent)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Preserves `created_at` timestamp
- Updates `updated_at` timestamp to current time
- Validates email format if `contact_email` is being updated
- Validates phone format if `phone` is being updated
- May validate name uniqueness if name is being updated (business rule dependent)
- Returns complete updated supplier entity

**Related Use Cases:**
- Future: Update Supplier use case

---

### 4. `search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<Supplier>>`

**Purpose:**  
Search and filter supplier records by various criteria with pagination and sorting. Used for supplier listing and selection operations.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object
  - `q?: string` - General search query (searches in `name`, `contact_email`, `phone`)
  - `name?: string` - Filter by name (partial match)
- `pagination` (Pagination): Pagination parameters
  - `page: number` - Page number (min 1, default 1)
  - `per_page: number` - Results per page (min 1, max 100, default 20)
- `sort` (Sort): Sort parameters
  - `field: string` - Sort field ("name", "created_at")
  - `direction: 'asc' | 'desc'` - Sort direction (default: "asc")

**Output Type:**
- `Promise<PaginatedResult<Supplier>>`: Returns paginated result with:
  - `items: Supplier[]` - Array of supplier entities matching criteria
  - `meta: PaginationMeta` - Pagination metadata (total, page, per_page, total_pages, has_next, has_previous)

**Error Conditions:**
- `InvalidPaginationError`: If pagination parameters are invalid
- `InvalidSortError`: If sort field is invalid
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Builds query with filters based on criteria
- Text search (`q`) searches in `name`, `contact_email`, and `phone` fields (case-insensitive, partial match)
- Name filter uses partial match (case-insensitive)
- Uses index on `name` for efficient queries
- Returns suppliers in no specific order if no sort specified (default: `name` ascending)
- Returns empty array if no results found

**Pagination Rules:**
- Default page: 1
- Default per_page: 20
- Maximum per_page: 100
- Returns empty array if no results found
- Total count calculated before pagination

**Sorting and Filtering Rules:**
- Valid sort fields: "name", "created_at"
- Default sort: "name" ascending (alphabetical)
- Text search is case-insensitive and uses partial matching (LIKE or full-text search)
- Name filter uses partial match (case-insensitive)

**Related Use Cases:**
- Supplier listing operations (GET /suppliers endpoint)

---

### 5. `count(criteria: SearchCriteria): Promise<number>`

**Purpose:**  
Count the number of suppliers matching search criteria. Used for pagination metadata calculation.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object (same as `search()` method)
  - `q?: string` - General search query
  - `name?: string` - Filter by name

**Output Type:**
- `Promise<number>`: Returns count of matching suppliers (integer >= 0)

**Error Conditions:**
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
- Supplier listing operations (pagination metadata)

---

### 6. `findByName(name: string): Promise<Supplier | null>`

**Purpose:**  
Retrieve a supplier entity by its name. Used for name uniqueness checks and supplier lookup by name.

**Input Parameters:**
- `name` (string): Supplier name
  - Must be non-empty string
  - Must not be null or undefined
  - Case-sensitive or case-insensitive match (business rule dependent)

**Output Type:**
- `Promise<Supplier | null>`: Returns the supplier entity if found, `null` if not found
  - If multiple suppliers with same name exist, returns first match (business rule dependent)

**Error Conditions:**
- `InvalidNameError`: If `name` is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Searches for supplier where `name` matches exactly
- Uses index on `name` for efficient lookup
- Returns first match if multiple suppliers with same name exist
- Returns `null` if no supplier found with given name
- Used for name uniqueness validation during create and update operations

**Sorting and Filtering Rules:**
- Exact name match (case-sensitive or case-insensitive, business rule dependent)
- No filtering applied (pure name lookup)

**Related Use Cases:**
- Supplier name uniqueness validation

---

### 7. `findAll(): Promise<Supplier[]>`

**Purpose:**  
Retrieve all suppliers in the system. Used for supplier listing and selection operations.

**Input Parameters:**
- None

**Output Type:**
- `Promise<Supplier[]>`: Returns array of all supplier entities
  - Returns empty array `[]` if no suppliers exist

**Error Conditions:**
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns all suppliers without filtering
- Returns suppliers in no specific order (database-dependent)
- Should be used with caution for large numbers of suppliers (consider using `search()` with pagination)
- Used for supplier selection in administrative operations

**Sorting and Filtering Rules:**
- No default sorting applied
- No filtering applied
- Application layer may sort by `name` or `created_at`

**Related Use Cases:**
- Supplier selection in product creation
- Supplier selection in purchase order creation

---

### 8. `exists(id: UUID): Promise<boolean>`

**Purpose:**  
Check if a supplier with the given ID exists. Used for quick existence validation without loading the full entity.

**Input Parameters:**
- `id` (UUID): Supplier identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if supplier exists, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses efficient EXISTS query or COUNT query
- Returns boolean value (true/false)
- Does not load supplier entity (more efficient than `findById()` for existence checks)
- Uses primary key index for efficient lookup
- Used for validation before operations that require supplier existence

**Related Use Cases:**
- Supplier validation in product creation
- Supplier validation in purchase order creation

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`, `exists()`, and update operations
   - Index on `name` for `findByName()` and name filtering in `search()`

2. **Query Optimization:**
   - Use efficient queries for text search
   - Consider caching supplier data if frequently accessed
   - Use `exists()` instead of `findById()` when only existence check is needed

### Data Integrity

1. **Foreign Key Constraints:**
   - Products reference supplier via `supplier_id` (enforced by database)
   - Purchase orders reference supplier via `supplier_id` (enforced by database)
   - Suppliers cannot be deleted if they have linked products or purchase orders (business rule dependent)

2. **Validation:**
   - `name` must be non-empty and not whitespace-only
   - `contact_email` must be valid email format if provided
   - `phone` must be valid phone format if provided
   - `default_lead_time_days` must be >= 0 if provided
   - Name uniqueness may or may not be enforced (business rule dependent)

3. **Business Rules:**
   - Supplier name uniqueness is optional (business rule dependent)
   - Contact information is optional but recommended
   - Default lead time is used for reorder calculations

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`, `update`) should be within transactions

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations

### Business Rules

1. **Lead Time:**
   - Default lead time is used for reorder calculations
   - Lead time represents days from order to expected arrival
   - Lead time is optional (may be product-specific or supplier-specific)

2. **Contact Information:**
   - Email and phone are optional but recommended
   - Contact information is used for purchase order communication
   - Contact information may be used for supplier management

3. **Supplier Relationships:**
   - Suppliers can have multiple products
   - Suppliers can have multiple purchase orders
   - Supplier deletion may require reassigning products (business rule dependent)

---

## Related Repositories

- **ProductRepository:** For products supplied by supplier
- **PurchaseOrderRepository:** For purchase orders from supplier
- **AuditLogRepository:** For logging supplier operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `update(supplier: Supplier): Promise<Supplier>` - Update supplier (if update functionality is needed)
- `delete(id: UUID): Promise<void>` - Delete supplier (if business rules allow)
- `getSupplierStatistics(supplierId: UUID): Promise<SupplierStatistics>` - Get supplier statistics

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

