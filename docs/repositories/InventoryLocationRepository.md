# Repository Interface Contract: InventoryLocationRepository

## Overview

The `InventoryLocationRepository` interface defines the contract for inventory location data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for inventory location entity operations.

**Entity:** `InventoryLocation`  
**Table:** `inventory_locations`  
**Module:** Administrative / Inventory

**Note:** This entity is optional and provides finer granularity for inventory management within stores. If not used, inventory is managed at the store level.

## Entity Structure

Based on the ER model, the `InventoryLocation` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `store_id` (UUID, NOT NULL, FK -> stores(id)) - Store this location belongs to
- `name` (VARCHAR(255), NOT NULL) - Location name/identifier
- `description` (TEXT, NULL) - Location description (optional)
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NULL) - Last update timestamp

**Indexes:**
- Primary key on `id`
- Index on `store_id` (for store-location relationships)

**Relationships:**
- InventoryLocation 1 — 1 Store (via `store_id`)
- InventoryLocation 1 — 0..* StockMovement (stock movements at location)

**Business Rules:**
- Inventory location must belong to a store
- Location name must be unique within a store (business rule dependent)
- Location is used for finer inventory granularity within stores

---

## Method Specifications

### 1. `save(location: InventoryLocation): Promise<InventoryLocation>`

**Purpose:**  
Persist a new inventory location entity. This method handles location creation and is used during inventory location setup.

**Input Parameters:**
- `location` (InventoryLocation): Inventory location entity to persist
  - `id` is null/undefined (new location)
  - Required fields: `store_id`, `name`
  - Optional fields: `description`

**Output Type:**
- `Promise<InventoryLocation>`: Returns the persisted inventory location entity with all fields populated, including generated `id`, `created_at`, and `updated_at` timestamps

**Error Conditions:**
- `InventoryLocationValidationError`: If required fields are missing or invalid
- `StoreNotFoundError`: If `store_id` does not exist
- `InvalidNameError`: If `name` is empty or whitespace-only
- `DuplicateNameError`: If location name already exists within the same store (business rule dependent)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Store existence validation should be within the same transaction

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `created_at` and `updated_at` to current timestamp
- Validates that `store_id` references existing store
- Validates `name` is non-empty and not whitespace-only
- May validate name uniqueness within store (business rule dependent)
- Returns the complete inventory location entity with all fields

**Related Use Cases:**
- Future: Create Inventory Location use case

---

### 2. `findById(id: UUID): Promise<InventoryLocation | null>`

**Purpose:**  
Retrieve an inventory location entity by its unique identifier. Used for location lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Inventory location identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<InventoryLocation | null>`: Returns the inventory location entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete inventory location entity with all fields
- Returns `null` if location with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by any criteria (pure ID lookup)

**Related Use Cases:**
- Location validation in stock movement operations
- Location detail retrieval

---

### 3. `update(location: InventoryLocation): Promise<InventoryLocation>`

**Purpose:**  
Update an existing inventory location entity. Used for modifying location name and description.

**Input Parameters:**
- `location` (InventoryLocation): Inventory location entity with updated fields
  - `id` must be valid UUID of existing location
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)
  - `store_id` cannot be changed (immutable)

**Output Type:**
- `Promise<InventoryLocation>`: Returns the updated inventory location entity with all fields

**Error Conditions:**
- `InventoryLocationNotFoundError`: If location with given `id` does not exist
- `InventoryLocationValidationError`: If updated fields are invalid
- `InvalidNameError`: If `name` is being updated and is empty or whitespace-only
- `DuplicateNameError`: If `name` is being updated and already exists within the same store (business rule dependent)
- `ImmutableFieldError`: If `store_id` is being updated (not allowed)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Preserves `created_at` timestamp
- Updates `updated_at` timestamp to current time
- Does not allow `store_id` to be changed (immutable)
- May validate name uniqueness within store if name is being updated
- Returns complete updated inventory location entity

**Related Use Cases:**
- Future: Update Inventory Location use case

---

### 4. `findByStoreId(storeId: UUID): Promise<InventoryLocation[]>`

**Purpose:**  
Retrieve all inventory locations belonging to a specific store. Used for store location listing and selection.

**Input Parameters:**
- `storeId` (UUID): Store identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<InventoryLocation[]>`: Returns array of inventory location entities for the store
  - Returns empty array `[]` if store has no locations
  - Returns empty array `[]` if store does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `storeId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters locations where `store_id = storeId`
- Uses index on `store_id` for efficient query
- Returns locations in no specific order (database-dependent)
- Returns empty array if no locations found for store
- Used for store location management and selection

**Sorting and Filtering Rules:**
- No default sorting applied
- Filters by store only
- Application layer may sort by `name` or `created_at`

**Related Use Cases:**
- Store location listing operations
- Location selection in inventory operations

---

### 5. `findByStoreIdAndName(storeId: UUID, name: string): Promise<InventoryLocation | null>`

**Purpose:**  
Retrieve an inventory location by store ID and name. Used for name uniqueness checks and location lookup by name within a store.

**Input Parameters:**
- `storeId` (UUID): Store identifier
  - Must be valid UUID format
- `name` (string): Location name
  - Must be non-empty string
  - Must not be null or undefined

**Output Type:**
- `Promise<InventoryLocation | null>`: Returns the inventory location entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `storeId` is not a valid UUID format
- `InvalidNameError`: If `name` is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Searches for location where `store_id = storeId` and `name` matches exactly
- Uses indexes on `store_id` and potentially `name` for efficient lookup
- Returns first match if multiple locations with same name exist (should not happen if uniqueness enforced)
- Returns `null` if no location found with given store and name
- Used for name uniqueness validation within store

**Sorting and Filtering Rules:**
- Exact name match (case-sensitive or case-insensitive, business rule dependent)
- Filters by store and name

**Related Use Cases:**
- Location name uniqueness validation
- Location lookup by name within store

---

### 6. `delete(id: UUID): Promise<void>`

**Purpose:**  
Permanently delete an inventory location entity from the database. Used for location removal when no longer needed.

**Input Parameters:**
- `id` (UUID): Inventory location identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<void>`: Returns void on successful deletion

**Error Conditions:**
- `InventoryLocationNotFoundError`: If location with given `id` does not exist
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `ReferentialIntegrityError`: If location has linked stock movements (business rule dependent)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Referential integrity checks should be within the same transaction

**Notes on Expected Behaviour:**
- Permanently deletes inventory location record from database
- Does not cascade delete linked stock movements (business rule dependent)
- Should verify no linked stock movements exist before deletion (application layer responsibility)
- Hard delete is permanent and cannot be undone
- Should be logged in audit trail (handled in application layer)

**Related Use Cases:**
- Future: Delete Inventory Location use case

---

### 7. `exists(id: UUID): Promise<boolean>`

**Purpose:**  
Check if an inventory location with the given ID exists. Used for quick existence validation without loading the full entity.

**Input Parameters:**
- `id` (UUID): Inventory location identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if location exists, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses efficient EXISTS query or COUNT query
- Returns boolean value (true/false)
- Does not load location entity (more efficient than `findById()` for existence checks)
- Uses primary key index for efficient lookup
- Used for validation before operations that require location existence

**Related Use Cases:**
- Location validation in stock movement operations

---

### 8. `findAll(): Promise<InventoryLocation[]>`

**Purpose:**  
Retrieve all inventory locations in the system. Used for location listing and selection operations.

**Input Parameters:**
- None

**Output Type:**
- `Promise<InventoryLocation[]>`: Returns array of all inventory location entities
  - Returns empty array `[]` if no locations exist

**Error Conditions:**
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns all locations without filtering
- Returns locations in no specific order (database-dependent)
- Should be used with caution for large numbers of locations (consider filtering by store)
- Used for location selection in administrative operations

**Sorting and Filtering Rules:**
- No default sorting applied
- No filtering applied
- Application layer may sort by `store_id`, `name`, or `created_at`

**Related Use Cases:**
- Location listing operations
- Location selection in administrative workflows

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`, `delete()`, and `exists()`
   - Index on `store_id` for `findByStoreId()` and store filtering

2. **Query Optimization:**
   - Use efficient queries for existence checks
   - Consider caching location data if frequently accessed
   - Use `exists()` instead of `findById()` when only existence check is needed
   - Filter by store when possible to reduce result set size

### Data Integrity

1. **Foreign Key Constraints:**
   - `store_id` must reference existing store (enforced by database)
   - Stock movements may reference location via `location_id` (enforced by database)
   - Locations cannot be deleted if they have linked stock movements (business rule dependent)

2. **Validation:**
   - `name` must be non-empty and not whitespace-only
   - Location name may need to be unique within a store (business rule dependent)
   - `store_id` is immutable (cannot be changed after creation)

3. **Business Rules:**
   - Location provides finer inventory granularity within stores
   - Location is optional (inventory can be managed at store level)
   - Location name should be descriptive and unique within store

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`, `update`, `delete`) should be within transactions
- Store existence validation should be within the same transaction as location creation

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Referential integrity errors should be thrown when attempting to delete location with linked stock movements

### Business Rules

1. **Optional Entity:**
   - Inventory locations are optional
   - If not used, inventory is managed at the store level
   - Provides finer granularity for inventory management

2. **Store Relationship:**
   - Location must belong to a store
   - Store ID is immutable (cannot be changed)
   - Location name should be unique within store

3. **Inventory Management:**
   - Locations are used for stock movement tracking
   - Locations help organize inventory within stores
   - Stock movements reference locations for tracking

---

## Related Repositories

- **StoreRepository:** For store validation and access checks
- **StockMovementRepository:** For stock movements at locations
- **AuditLogRepository:** For logging location operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `search(criteria: SearchCriteria, pagination: Pagination): Promise<PaginatedResult<InventoryLocation>>` - Search locations with filters
- `countByStoreId(storeId: UUID): Promise<number>` - Count locations for a store
- `getLocationStatistics(locationId: UUID): Promise<LocationStatistics>` - Get location statistics
- `bulkUpdate(locations: InventoryLocation[]): Promise<InventoryLocation[]>` - Bulk update locations

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

