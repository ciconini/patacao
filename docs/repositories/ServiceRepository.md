# Repository Interface Contract: ServiceRepository

## Overview

The `ServiceRepository` interface defines the contract for service data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for service entity operations, including CRUD operations, search, and service catalog management.

**Entity:** `Service`  
**Table:** `services`  
**Module:** Services

## Entity Structure

Based on the ER model, the `Service` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `name` (VARCHAR(255), NOT NULL) - Service name
- `description` (TEXT, NULL) - Service description (optional)
- `duration_minutes` (INT, NOT NULL) - Service duration in minutes
- `price` (DECIMAL(12,2), NOT NULL) - Service price
- `consumes_inventory` (BOOLEAN, NOT NULL, DEFAULT FALSE) - Whether service consumes inventory items
- `consumed_items` (JSON, NULL) - Array of consumed products: `[{product_id, quantity}]`
- `tags` (JSON, NULL) - Array of service tags for categorization
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NULL) - Last update timestamp

**Indexes:**
- Primary key on `id`
- Index on `name` (for search operations)

**Relationships:**
- Service 1 — 0..* AppointmentServiceLine (service lines in appointments)
- Service 1 — 0..* User (via `user_service_skills` join table - staff skills)

**Business Rules:**
- If `consumes_inventory` is true, inventory reservation occurs at appointment confirmation; decrement occurs at completion
- Service duration and assigned staff skills must match when auto-assigning staff to appointments
- Service name is required and should be descriptive (duplicate names allowed, business rule dependent)

---

## Method Specifications

### 1. `save(service: Service): Promise<Service>`

**Purpose:**  
Persist a new service entity. This method handles service creation and is used during service catalog management.

**Input Parameters:**
- `service` (Service): Service entity to persist
  - `id` is null/undefined (new service)
  - Required fields: `name`, `duration_minutes`, `price`, `consumes_inventory`
  - Optional fields: `description`, `consumed_items`, `tags`
  - `consumed_items` must be provided if `consumes_inventory` is true

**Output Type:**
- `Promise<Service>`: Returns the persisted service entity with all fields populated, including generated `id`, `created_at`, and `updated_at` timestamps

**Error Conditions:**
- `ServiceValidationError`: If required fields are missing or invalid
- `InvalidNameError`: If `name` is empty or whitespace-only
- `InvalidDurationError`: If `duration_minutes` <= 0
- `InvalidPriceError`: If `price` < 0
- `MissingConsumedItemsError`: If `consumes_inventory` is true but `consumed_items` is not provided
- `ProductNotFoundError`: If product referenced in `consumed_items` does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- May validate product existence for `consumed_items` within the same transaction

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `created_at` and `updated_at` to current timestamp
- Validates that `consumes_inventory` and `consumed_items` are consistent
- Validates product existence for items in `consumed_items` array
- Stores `consumed_items` and `tags` as JSON in database
- Returns the complete service entity with all fields
- Does not validate service name uniqueness (duplicate names allowed)

**Related Use Cases:**
- UC-SVC-001: Create Service

---

### 2. `findById(id: UUID): Promise<Service | null>`

**Purpose:**  
Retrieve a service entity by its unique identifier. Used for service lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Service identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Service | null>`: Returns the service entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete service entity with all fields
- Returns `null` if service with given `id` does not exist
- Should use primary key index for efficient lookup
- Parses JSON fields (`consumed_items`, `tags`) from database
- Does not filter by any criteria (pure ID lookup)

**Related Use Cases:**
- UC-SVC-001: Create Service (validation)
- UC-SVC-002: Create Appointment (service validation)
- UC-SVC-003: Confirm Appointment (check `consumes_inventory`)
- UC-SVC-004: Complete Appointment (check `consumes_inventory`)
- UC-FIN-001: Create Invoice Draft (service validation)
- UC-FIN-006: Create Transaction (service validation)
- UC-ADMIN-009: Create User Staff (service skills validation)

---

### 3. `update(service: Service): Promise<Service>`

**Purpose:**  
Update an existing service entity. Used for modifying service details, pricing, duration, and inventory consumption settings.

**Input Parameters:**
- `service` (Service): Service entity with updated fields
  - `id` must be valid UUID of existing service
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)

**Output Type:**
- `Promise<Service>`: Returns the updated service entity with all fields

**Error Conditions:**
- `ServiceNotFoundError`: If service with given `id` does not exist
- `ServiceValidationError`: If updated fields are invalid
- `InvalidNameError`: If `name` is being updated and is empty or whitespace-only
- `InvalidDurationError`: If `duration_minutes` is being updated and is <= 0
- `InvalidPriceError`: If `price` is being updated and is < 0
- `MissingConsumedItemsError`: If `consumes_inventory` is being set to true but `consumed_items` is not provided
- `ProductNotFoundError`: If product referenced in `consumed_items` does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- May validate product existence for `consumed_items` within the same transaction

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Preserves `created_at` timestamp
- Updates `updated_at` timestamp to current time
- Validates that `consumes_inventory` and `consumed_items` are consistent if being updated
- Validates product existence for items in `consumed_items` array if being updated
- Stores `consumed_items` and `tags` as JSON in database
- Returns complete updated service entity
- Does not validate service name uniqueness (duplicate names allowed)

**Related Use Cases:**
- Future: Update Service use case (implied by PUT /services/{id} endpoint)

---

### 4. `search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<Service>>`

**Purpose:**  
Search and filter service records by various criteria with pagination and sorting. Used for service catalog browsing, service selection in appointments, and service management.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object
  - `query?: string` - Text search query (searches in `name` and `description`)
  - `tag?: string` - Filter by tag (exact match)
  - `consumes_inventory?: boolean` - Filter by inventory consumption flag
  - `min_price?: Decimal` - Minimum price filter
  - `max_price?: Decimal` - Maximum price filter
  - `min_duration?: Integer` - Minimum duration filter (minutes)
  - `max_duration?: Integer` - Maximum duration filter (minutes)
- `pagination` (Pagination): Pagination parameters
  - `page: number` - Page number (min 1, default 1)
  - `per_page: number` - Results per page (min 1, max 100, default 20)
- `sort` (Sort): Sort parameters
  - `field: string` - Sort field ("name", "price", "duration_minutes", "created_at")
  - `direction: 'asc' | 'desc'` - Sort direction (default: "asc")

**Output Type:**
- `Promise<PaginatedResult<Service>>`: Returns paginated result with:
  - `items: Service[]` - Array of service entities matching criteria
  - `meta: PaginationMeta` - Pagination metadata (total, page, per_page, total_pages, has_next, has_previous)

**Error Conditions:**
- `InvalidPaginationError`: If pagination parameters are invalid
- `InvalidSortError`: If sort field is invalid
- `InvalidPriceRangeError`: If `min_price` > `max_price`
- `InvalidDurationRangeError`: If `min_duration` > `max_duration`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Builds query with filters based on criteria
- Text search (`query`) searches in `name` and `description` fields (case-insensitive, partial match)
- Tag filter uses exact match (case-sensitive or case-insensitive, business rule dependent)
- Price and duration filters use range queries (inclusive)
- Uses index on `name` for efficient text search
- Returns services in no specific order if no sort specified (default: `name` ascending)
- Parses JSON fields (`consumed_items`, `tags`) from database
- Returns empty array if no results found

**Pagination Rules:**
- Default page: 1
- Default per_page: 20
- Maximum per_page: 100
- Returns empty array if no results found
- Total count calculated before pagination

**Sorting and Filtering Rules:**
- Valid sort fields: "name", "price", "duration_minutes", "created_at"
- Default sort: "name" ascending (alphabetical)
- Text search is case-insensitive and uses partial matching (LIKE or full-text search)
- Tag filter uses exact match (may be case-sensitive or case-insensitive, business rule dependent)
- Price and duration filters are inclusive (services with price/duration equal to min/max are included)

**Related Use Cases:**
- Service catalog browsing (GET /services endpoint)
- Service selection in appointment creation
- Service management operations

---

### 5. `count(criteria: SearchCriteria): Promise<number>`

**Purpose:**  
Count the number of services matching search criteria. Used for pagination metadata calculation.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object (same as `search()` method)
  - `query?: string` - Text search query
  - `tag?: string` - Filter by tag
  - `consumes_inventory?: boolean` - Filter by inventory consumption flag
  - `min_price?: Decimal` - Minimum price filter
  - `max_price?: Decimal` - Maximum price filter
  - `min_duration?: Integer` - Minimum duration filter
  - `max_duration?: Integer` - Maximum duration filter

**Output Type:**
- `Promise<number>`: Returns count of matching services (integer >= 0)

**Error Conditions:**
- `InvalidPriceRangeError`: If `min_price` > `max_price`
- `InvalidDurationRangeError`: If `min_duration` > `max_duration`
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
- Service catalog browsing (pagination metadata)

---

### 6. `findByName(name: string): Promise<Service | null>`

**Purpose:**  
Retrieve a service entity by its name. Used for name uniqueness checks and service lookup by name.

**Input Parameters:**
- `name` (string): Service name
  - Must be non-empty string
  - Must not be null or undefined
  - Case-sensitive or case-insensitive match (business rule dependent)

**Output Type:**
- `Promise<Service | null>`: Returns the service entity if found, `null` if not found
  - If multiple services with same name exist, returns first match (business rule dependent)

**Error Conditions:**
- `InvalidNameError`: If `name` is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Searches for service where `name` matches exactly
- May be case-sensitive or case-insensitive (business rule dependent)
- Uses index on `name` for efficient lookup
- Returns first match if multiple services with same name exist
- Returns `null` if no service found with given name
- Parses JSON fields (`consumed_items`, `tags`) from database

**Sorting and Filtering Rules:**
- Exact name match (no partial matching)
- Case sensitivity depends on business rules (typically case-insensitive for user convenience)

**Related Use Cases:**
- Service name validation (if uniqueness is required)
- Service lookup by name

---

### 7. `findByTag(tag: string): Promise<Service[]>`

**Purpose:**  
Retrieve all services that have a specific tag. Used for service categorization and filtering.

**Input Parameters:**
- `tag` (string): Service tag
  - Must be non-empty string
  - Must not be null or undefined
  - Exact match (case-sensitive or case-insensitive, business rule dependent)

**Output Type:**
- `Promise<Service[]>`: Returns array of service entities with the specified tag
  - Returns empty array `[]` if no services found with given tag

**Error Conditions:**
- `InvalidTagError`: If `tag` is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Searches for services where `tags` JSON array contains the specified tag
- Uses JSON array containment query (database-dependent)
- Returns all services with the tag, regardless of other tags
- Returns empty array if no services found
- Parses JSON fields (`consumed_items`, `tags`) from database
- Tag matching may be case-sensitive or case-insensitive (business rule dependent)

**Sorting and Filtering Rules:**
- No default sorting applied
- Returns all services with the tag
- Application layer may sort by `name` or other criteria

**Related Use Cases:**
- Service catalog filtering by tag
- Service categorization operations

---

### 8. `findByConsumesInventory(consumesInventory: boolean): Promise<Service[]>`

**Purpose:**  
Retrieve all services that consume inventory or do not consume inventory. Used for filtering services based on inventory consumption behavior.

**Input Parameters:**
- `consumesInventory` (boolean): Inventory consumption flag
  - Must be boolean value (true or false)

**Output Type:**
- `Promise<Service[]>`: Returns array of service entities matching the inventory consumption flag
  - Returns empty array `[]` if no services found

**Error Conditions:**
- `InvalidBooleanError`: If `consumesInventory` is not a boolean value
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters services where `consumes_inventory` equals the provided value
- Uses boolean equality query
- Returns all services matching the flag
- Returns empty array if no services found
- Parses JSON fields (`consumed_items`, `tags`) from database
- Used for inventory management and appointment scheduling workflows

**Sorting and Filtering Rules:**
- No default sorting applied
- Returns all services matching the flag
- Application layer may sort by `name` or other criteria

**Related Use Cases:**
- Inventory management operations
- Appointment scheduling (filtering services that require inventory)

---

### 9. `findAll(): Promise<Service[]>`

**Purpose:**  
Retrieve all services in the catalog. Used for service selection dropdowns, service lists, and service management operations.

**Input Parameters:**
- None

**Output Type:**
- `Promise<Service[]>`: Returns array of all service entities
  - Returns empty array `[]` if no services exist

**Error Conditions:**
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns all services without filtering
- Returns services in no specific order (database-dependent)
- Parses JSON fields (`consumed_items`, `tags`) from database
- Should be used with caution for large catalogs (consider using `search()` with pagination instead)
- Used for small service catalogs or when all services are needed

**Sorting and Filtering Rules:**
- No default sorting applied
- No filtering applied
- Application layer may sort by `name` or other criteria

**Related Use Cases:**
- Service selection in appointment creation
- Service management operations
- Service catalog export

---

### 10. `exists(id: UUID): Promise<boolean>`

**Purpose:**  
Check if a service with the given ID exists. Used for quick existence validation without loading the full entity.

**Input Parameters:**
- `id` (UUID): Service identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if service exists, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses efficient EXISTS query or COUNT query
- Returns boolean value (true/false)
- Does not load service entity (more efficient than `findById()` for existence checks)
- Uses primary key index for efficient lookup
- Used for validation before operations that require service existence

**Related Use Cases:**
- Service validation in appointment creation
- Service validation in transaction creation
- Service validation in invoice creation

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()` and `exists()`
   - Index on `name` for `findByName()` and text search in `search()`
   - Consider composite indexes for common query patterns (e.g., `(consumes_inventory, name)`)

2. **Query Optimization:**
   - Use efficient queries for text search (consider full-text search for large catalogs)
   - Optimize JSON array queries for tag filtering
   - Use pagination for large result sets
   - Use `exists()` instead of `findById()` when only existence check is needed

3. **JSON Field Handling:**
   - `consumed_items` and `tags` are stored as JSON
   - Parse JSON fields when loading entities
   - Validate JSON structure when saving entities
   - Use database-specific JSON functions for efficient queries (e.g., JSON_CONTAINS for tags)

### Data Integrity

1. **Foreign Key Constraints:**
   - `consumed_items` references `products` table (validated in application layer)
   - No direct foreign key constraints on JSON fields (application-level validation required)

2. **Validation:**
   - `name` must be non-empty and not whitespace-only
   - `duration_minutes` must be > 0
   - `price` must be >= 0
   - `consumes_inventory` and `consumed_items` must be consistent
   - Products in `consumed_items` must exist (validated in application layer)

3. **Business Rules:**
   - Service name uniqueness is not enforced (duplicate names allowed)
   - If `consumes_inventory` is true, `consumed_items` must be provided
   - Service duration is used for appointment scheduling
   - Service price can be 0 (free services)

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`, `update`) should be within transactions
- Product validation for `consumed_items` should be within the same transaction as service creation/update

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Product existence errors should be thrown when validating `consumed_items`

### Business Rules

1. **Inventory Consumption:**
   - Services that consume inventory require `consumed_items`
   - Inventory reservation occurs at appointment confirmation
   - Inventory decrement occurs at appointment completion

2. **Service Duration:**
   - Duration is used for appointment scheduling
   - Calendar slots are calculated based on duration
   - Duration must match staff skills when auto-assigning staff

3. **Service Pricing:**
   - Price can be 0 (free services)
   - Price is used in invoices and transactions
   - Price can be overridden in appointment service lines

4. **Service Tags:**
   - Tags enable service categorization and filtering
   - Tags are optional
   - Consider standardizing tag values for consistency

---

## Related Repositories

- **AppointmentServiceLineRepository:** For managing appointment service lines
- **ProductRepository:** For validating products in `consumed_items`
- **UserRepository:** For managing user service skills (via `user_service_skills` join table)
- **AuditLogRepository:** For logging service operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `findByPriceRange(minPrice: Decimal, maxPrice: Decimal): Promise<Service[]>` - Find services in price range
- `findByDurationRange(minDuration: Integer, maxDuration: Integer): Promise<Service[]>` - Find services in duration range
- `findByRequiredResource(resource: string): Promise<Service[]>` - Find services requiring specific resource
- `countByTag(tag: string): Promise<number>` - Count services with specific tag
- `getServiceStatistics(): Promise<ServiceStatistics>` - Get service catalog statistics
- `bulkUpdate(services: Service[]): Promise<Service[]>` - Bulk update services
- `delete(id: UUID): Promise<void>` - Soft delete or hard delete service (if business rules allow)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

