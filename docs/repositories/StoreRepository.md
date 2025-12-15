# Repository Interface Contract: StoreRepository

## Overview

The `StoreRepository` interface defines the contract for store data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for store entity operations, including store management, opening hours validation, and company relationships.

**Entity:** `Store`  
**Table:** `stores`  
**Module:** Administrative

## Entity Structure

Based on the ER model, the `Store` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `company_id` (UUID, NOT NULL, FK -> companies(id)) - Company this store belongs to
- `name` (VARCHAR(255), NOT NULL) - Store name/location identifier
- `address` (JSON, NULL) - Structured address: `{street, city, postal_code, country}`
- `email` (VARCHAR(255), NULL) - Store contact email
- `phone` (VARCHAR(32), NULL) - Store contact phone number
- `opening_hours` (JSON, NOT NULL) - Structured weekly schedule
- `timezone` (VARCHAR(64), NOT NULL, DEFAULT 'Europe/Lisbon') - Timezone identifier (IANA timezone)
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NULL) - Last update timestamp

**Indexes:**
- Primary key on `id`
- Index on `company_id` (for company-store relationships)

**Relationships:**
- Store 1 — 1 Company (via `company_id`)
- Store 1 — 0..* User (staff assigned to store via join table)
- Store 1 — 0..* InventoryLocation (inventory locations within store)
- Store 1 — 0..* Appointment (appointments at store)
- Store 1 — 0..* Transaction (transactions at store)
- Store 1 — 0..* Invoice (invoices for store)

**Business Rules:**
- Staff schedules cannot place staff outside `opening_hours` for that Store
- Invoice numbering and fiscal settings can be store-scoped if configured; otherwise inherit Company defaults
- Opening hours must be valid weekly schedule structure
- Timezone must be valid IANA timezone identifier

---

## Method Specifications

### 1. `save(store: Store): Promise<Store>`

**Purpose:**  
Persist a new store entity. This method handles store creation and is used during store setup.

**Input Parameters:**
- `store` (Store): Store entity to persist
  - `id` is null/undefined (new store)
  - Required fields: `company_id`, `name`, `opening_hours`, `timezone`
  - Optional fields: `address`, `email`, `phone`

**Output Type:**
- `Promise<Store>`: Returns the persisted store entity with all fields populated, including generated `id`, `created_at`, and `updated_at` timestamps

**Error Conditions:**
- `StoreValidationError`: If required fields are missing or invalid
- `CompanyNotFoundError`: If `company_id` does not exist
- `InvalidOpeningHoursError`: If `opening_hours` structure is invalid
- `InvalidTimezoneError`: If `timezone` is not a valid IANA timezone
- `InvalidAddressError`: If `address` structure is invalid
- `InvalidEmailError`: If `email` format is invalid
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Company existence validation should be within the same transaction

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `created_at` and `updated_at` to current timestamp
- Validates that `company_id` references existing company
- Validates `opening_hours` JSON structure (weekly schedule)
- Validates `timezone` is valid IANA timezone identifier
- Stores `address` and `opening_hours` as JSON in database
- Sets default timezone to 'Europe/Lisbon' if not provided
- Returns the complete store entity with all fields

**Related Use Cases:**
- UC-ADMIN-003: Create Store

---

### 2. `findById(id: UUID): Promise<Store | null>`

**Purpose:**  
Retrieve a store entity by its unique identifier. Used for store lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Store identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Store | null>`: Returns the store entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete store entity with all fields
- Returns `null` if store with given `id` does not exist
- Should use primary key index for efficient lookup
- Parses JSON fields (`address`, `opening_hours`) from database
- Does not filter by any criteria (pure ID lookup)

**Related Use Cases:**
- UC-ADMIN-003: Create Store (validation)
- UC-ADMIN-004: Update Store
- UC-ADMIN-009: Create User Staff (store validation)
- UC-SVC-002: Create Appointment (store validation, opening hours)
- UC-FIN-001: Create Invoice Draft (store validation)
- UC-FIN-006: Create Transaction (store validation)
- UC-INV-001: Receive Stock (store validation)
- UC-INV-002: Stock Adjustment (store validation)
- UC-INV-011: Create Purchase Order (store validation)
- UC-INV-012: Receive Purchase Order (store validation)

---

### 3. `update(store: Store): Promise<Store>`

**Purpose:**  
Update an existing store entity. Used for modifying store information, opening hours, contact details, and timezone.

**Input Parameters:**
- `store` (Store): Store entity with updated fields
  - `id` must be valid UUID of existing store
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)
  - `company_id` cannot be changed (immutable)

**Output Type:**
- `Promise<Store>`: Returns the updated store entity with all fields

**Error Conditions:**
- `StoreNotFoundError`: If store with given `id` does not exist
- `StoreValidationError`: If updated fields are invalid
- `InvalidOpeningHoursError`: If `opening_hours` is being updated and structure is invalid
- `InvalidTimezoneError`: If `timezone` is being updated and is not valid IANA timezone
- `InvalidAddressError`: If `address` is being updated and structure is invalid
- `InvalidEmailError`: If `email` is being updated and format is invalid
- `ImmutableFieldError`: If `company_id` is being updated (not allowed)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Preserves `created_at` timestamp
- Updates `updated_at` timestamp to current time
- Does not allow `company_id` to be changed (immutable)
- Validates `opening_hours` JSON structure if being updated
- Validates `timezone` if being updated
- Stores `address` and `opening_hours` as JSON in database if being updated
- Returns complete updated store entity

**Related Use Cases:**
- UC-ADMIN-004: Update Store

---

### 4. `findByCompanyId(companyId: UUID): Promise<Store[]>`

**Purpose:**  
Retrieve all stores belonging to a specific company. Used for company store listing and validation.

**Input Parameters:**
- `companyId` (UUID): Company identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Store[]>`: Returns array of store entities for the company
  - Returns empty array `[]` if company has no stores
  - Returns empty array `[]` if company does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `companyId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters stores where `company_id = companyId`
- Uses index on `company_id` for efficient query
- Returns stores in no specific order (database-dependent)
- Parses JSON fields (`address`, `opening_hours`) from database
- Returns empty array if no stores found for company
- Used for company store management and validation

**Sorting and Filtering Rules:**
- No default sorting applied
- Filters by company only
- Application layer may sort by `name` or `created_at`

**Related Use Cases:**
- UC-ADMIN-003: Create Store (list stores for company validation)
- Company store listing operations

---

### 5. `findByIds(ids: UUID[]): Promise<Store[]>`

**Purpose:**  
Retrieve multiple store entities by their identifiers. Used for batch store validation and loading.

**Input Parameters:**
- `ids` (UUID[]): Array of store identifiers
  - Must be array of valid UUIDs
  - Must not be null or undefined
  - Array can be empty (returns empty array)

**Output Type:**
- `Promise<Store[]>`: Returns array of store entities matching the provided IDs
  - Returns only stores that exist (non-existent IDs are silently ignored)
  - Returns empty array `[]` if no stores found or if input array is empty

**Error Conditions:**
- `InvalidUUIDError`: If any ID in array is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Queries stores where `id IN (ids)`
- Uses primary key index for efficient lookup
- Returns stores in no specific order (database-dependent)
- Parses JSON fields (`address`, `opening_hours`) from database
- Non-existent IDs are silently ignored (no error thrown)
- Used for batch validation of store assignments

**Sorting and Filtering Rules:**
- No default sorting applied
- Returns stores matching provided IDs only
- Application layer may sort by `name` or other criteria

**Related Use Cases:**
- UC-AUTH-005: Create User (verify multiple stores exist)

---

### 6. `isWithinOpeningHours(storeId: UUID, datetime: DateTime): Promise<boolean>`

**Purpose:**  
Check if a given datetime falls within the store's opening hours. Used for appointment scheduling validation and store availability checks.

**Input Parameters:**
- `storeId` (UUID): Store identifier
  - Must be valid UUID format
- `datetime` (DateTime): Date and time to check
  - Must be valid datetime
  - Should be in store's timezone or UTC (conversion handled in application layer)

**Output Type:**
- `Promise<boolean>`: Returns `true` if datetime is within opening hours, `false` otherwise
  - Returns `false` if store does not exist

**Error Conditions:**
- `InvalidUUIDError`: If `storeId` is not a valid UUID format
- `InvalidDateTimeError`: If `datetime` is invalid
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Loads store by `storeId` and retrieves `opening_hours` JSON
- Parses `opening_hours` structure to determine day of week and time slots
- Checks if `datetime` falls within any opening time slot for that day
- Considers store `timezone` for time calculations
- Returns `false` if store does not exist
- Returns `false` if datetime is outside all opening hours for that day
- Used for appointment scheduling validation

**Sorting and Filtering Rules:**
- No sorting or filtering applied
- Pure availability check based on opening hours structure

**Related Use Cases:**
- UC-SVC-002: Create Appointment (opening hours validation)

---

### 7. `belongsToCompany(storeId: UUID, companyId: UUID): Promise<boolean>`

**Purpose:**  
Check if a store belongs to a specific company. Used for company access validation and authorization checks.

**Input Parameters:**
- `storeId` (UUID): Store identifier
  - Must be valid UUID format
- `companyId` (UUID): Company identifier
  - Must be valid UUID format

**Output Type:**
- `Promise<boolean>`: Returns `true` if store belongs to company, `false` otherwise
  - Returns `false` if store or company does not exist

**Error Conditions:**
- `InvalidUUIDError`: If `storeId` or `companyId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Queries store where `id = storeId` and `company_id = companyId`
- Uses indexes on `id` and `company_id` for efficient lookup
- Returns `true` if store exists and belongs to company
- Returns `false` if store does not exist
- Returns `false` if store exists but belongs to different company
- Used for authorization and access control

**Related Use Cases:**
- UC-FIN-001: Create Invoice Draft (store-company relationship validation)

---

### 8. `findAll(): Promise<Store[]>`

**Purpose:**  
Retrieve all stores in the system. Used for store listing and selection operations.

**Input Parameters:**
- None

**Output Type:**
- `Promise<Store[]>`: Returns array of all store entities
  - Returns empty array `[]` if no stores exist

**Error Conditions:**
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns all stores without filtering
- Returns stores in no specific order (database-dependent)
- Parses JSON fields (`address`, `opening_hours`) from database
- Should be used with caution for large numbers of stores (consider pagination)
- Used for store selection in administrative operations

**Sorting and Filtering Rules:**
- No default sorting applied
- No filtering applied
- Application layer may sort by `name`, `company_id`, or `created_at`

**Related Use Cases:**
- Store listing operations
- Store selection in administrative workflows

---

### 9. `exists(id: UUID): Promise<boolean>`

**Purpose:**  
Check if a store with the given ID exists. Used for quick existence validation without loading the full entity.

**Input Parameters:**
- `id` (UUID): Store identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if store exists, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses efficient EXISTS query or COUNT query
- Returns boolean value (true/false)
- Does not load store entity (more efficient than `findById()` for existence checks)
- Uses primary key index for efficient lookup
- Used for validation before operations that require store existence

**Related Use Cases:**
- Store validation in appointment creation
- Store validation in transaction creation
- Store validation in invoice creation

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`, `exists()`, and `findByIds()`
   - Index on `company_id` for `findByCompanyId()` and `belongsToCompany()`

2. **Query Optimization:**
   - Use efficient queries for existence checks
   - Consider caching store data if frequently accessed
   - Use `exists()` instead of `findById()` when only existence check is needed
   - Batch queries for multiple stores using `findByIds()`

3. **Opening Hours Validation:**
   - Opening hours validation may require parsing JSON structure
   - Consider caching parsed opening hours for frequently accessed stores
   - Timezone conversions should be handled efficiently

### Data Integrity

1. **Foreign Key Constraints:**
   - `company_id` must reference existing company (enforced by database)
   - Stores cannot be deleted if they have linked appointments, transactions, or invoices (business rule dependent)

2. **Validation:**
   - `opening_hours` must have valid weekly schedule structure (validated in application layer)
   - `timezone` must be valid IANA timezone identifier (validated in application layer)
   - `company_id` is immutable (cannot be changed after creation)

3. **Business Rules:**
   - Opening hours changes may affect existing appointments (business rule validation in application layer)
   - Staff schedules must be within store opening hours
   - Store is the location for appointments, transactions, and inventory operations

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`, `update`) should be within transactions
- Company existence validation should be within the same transaction as store creation

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Opening hours and timezone validation should occur in application layer before repository call

### Business Rules

1. **Opening Hours:**
   - Opening hours are stored as JSON weekly schedule
   - Opening hours validation is critical for appointment scheduling
   - Changes to opening hours may require validation of existing appointments

2. **Timezone:**
   - Default timezone is 'Europe/Lisbon'
   - Timezone is used for display and appointment scheduling calculations
   - All times stored in UTC, timezone used for conversion

3. **Company Relationship:**
   - Store must belong to a company
   - Company ID is immutable (cannot be changed)
   - Store inherits fiscal settings from company if not store-scoped

---

## Related Repositories

- **CompanyRepository:** For company validation and access checks
- **UserRepository:** For staff-store assignments
- **InventoryLocationRepository:** For inventory locations within store
- **AppointmentRepository:** For appointments at store
- **TransactionRepository:** For transactions at store
- **InvoiceRepository:** For invoices for store
- **AuditLogRepository:** For logging store operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `search(criteria: SearchCriteria, pagination: Pagination): Promise<PaginatedResult<Store>>` - Search stores with filters
- `findByTimezone(timezone: string): Promise<Store[]>` - Find stores by timezone
- `getStoreStatistics(storeId: UUID): Promise<StoreStatistics>` - Get store statistics
- `delete(id: UUID): Promise<void>` - Soft delete or hard delete store (if business rules allow)
- `getOpeningHours(storeId: UUID, dateRange: DateRange): Promise<OpeningHours>` - Get opening hours for date range

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

