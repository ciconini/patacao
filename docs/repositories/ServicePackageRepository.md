# Repository Interface Contract: ServicePackageRepository

## Overview

The `ServicePackageRepository` interface defines the contract for service package data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for service package entity operations.

**Entity:** `ServicePackage`  
**Table:** `service_packages`  
**Module:** Services

**Note:** This entity is optional and represents service bundles that can be sold together at a bundle price.

## Entity Structure

Based on the ER model, the `ServicePackage` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `name` (VARCHAR(255), NOT NULL) - Package name
- `description` (TEXT, NULL) - Package description (optional)
- `services` (JSON, NOT NULL) - Ordered list of service IDs and quantities: `[{service_id, qty}]`
- `bundle_price` (DECIMAL(12,2), NULL) - Bundle price (optional, if not provided, sum of individual service prices)
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NULL) - Last update timestamp

**Indexes:**
- Primary key on `id`
- Index on `name` (for search operations, if needed)

**Relationships:**
- ServicePackage 1 — 0..* Service (composition via `services` JSON array)

**Business Rules:**
- Packages create separate AppointmentServiceLine entries for each included Service when booked
- Bundle price is optional; if not provided, total is sum of individual service prices
- Services array must contain at least one service
- Service IDs in package must reference existing services

---

## Method Specifications

### 1. `save(package: ServicePackage): Promise<ServicePackage>`

**Purpose:**  
Persist a new service package entity. This method handles package creation and is used during service package setup.

**Input Parameters:**
- `package` (ServicePackage): Service package entity to persist
  - `id` is null/undefined (new package)
  - Required fields: `name`, `services`
  - Optional fields: `description`, `bundle_price`

**Output Type:**
- `Promise<ServicePackage>`: Returns the persisted service package entity with all fields populated, including generated `id`, `created_at`, and `updated_at` timestamps

**Error Conditions:**
- `ServicePackageValidationError`: If required fields are missing or invalid
- `InvalidNameError`: If `name` is empty or whitespace-only
- `InvalidServicesError`: If `services` array is empty or invalid
- `ServiceNotFoundError`: If service referenced in `services` array does not exist
- `InvalidBundlePriceError`: If `bundle_price` is negative
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Service existence validation should be within the same transaction

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `created_at` and `updated_at` to current timestamp
- Validates that all service IDs in `services` array reference existing services
- Validates `services` array is non-empty
- Stores `services` as JSON in database
- Returns the complete service package entity with all fields

**Related Use Cases:**
- Future: Create Service Package use case

---

### 2. `findById(id: UUID): Promise<ServicePackage | null>`

**Purpose:**  
Retrieve a service package entity by its unique identifier. Used for package lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Service package identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<ServicePackage | null>`: Returns the service package entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete service package entity with all fields
- Returns `null` if package with given `id` does not exist
- Should use primary key index for efficient lookup
- Parses JSON field (`services`) from database
- Does not filter by any criteria (pure ID lookup)

**Related Use Cases:**
- Service package lookup
- Service package validation in appointment creation

---

### 3. `update(package: ServicePackage): Promise<ServicePackage>`

**Purpose:**  
Update an existing service package entity. Used for modifying package details, services, and bundle price.

**Input Parameters:**
- `package` (ServicePackage): Service package entity with updated fields
  - `id` must be valid UUID of existing package
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)

**Output Type:**
- `Promise<ServicePackage>`: Returns the updated service package entity with all fields

**Error Conditions:**
- `ServicePackageNotFoundError`: If package with given `id` does not exist
- `ServicePackageValidationError`: If updated fields are invalid
- `InvalidNameError`: If `name` is being updated and is empty or whitespace-only
- `InvalidServicesError`: If `services` is being updated and array is empty or invalid
- `ServiceNotFoundError`: If service referenced in updated `services` array does not exist
- `InvalidBundlePriceError`: If `bundle_price` is being updated and is negative
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Service existence validation should be within the same transaction if services are being updated

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Preserves `created_at` timestamp
- Updates `updated_at` timestamp to current time
- Validates service IDs if `services` array is being updated
- Stores `services` as JSON in database if being updated
- Returns complete updated service package entity

**Related Use Cases:**
- Future: Update Service Package use case

---

### 4. `findAll(): Promise<ServicePackage[]>`

**Purpose:**  
Retrieve all service packages in the system. Used for package listing and selection operations.

**Input Parameters:**
- None

**Output Type:**
- `Promise<ServicePackage[]>`: Returns array of all service package entities
  - Returns empty array `[]` if no packages exist

**Error Conditions:**
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns all packages without filtering
- Returns packages in no specific order (database-dependent)
- Parses JSON field (`services`) from database
- Used for package selection in appointment creation

**Sorting and Filtering Rules:**
- No default sorting applied
- No filtering applied
- Application layer may sort by `name` or `created_at`

**Related Use Cases:**
- Service package listing operations (GET /service-packages endpoint)
- Package selection in appointment creation

---

### 5. `exists(id: UUID): Promise<boolean>`

**Purpose:**  
Check if a service package with the given ID exists. Used for quick existence validation without loading the full entity.

**Input Parameters:**
- `id` (UUID): Service package identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if package exists, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses efficient EXISTS query or COUNT query
- Returns boolean value (true/false)
- Does not load package entity (more efficient than `findById()` for existence checks)
- Uses primary key index for efficient lookup
- Used for validation before operations that require package existence

**Related Use Cases:**
- Package validation in appointment creation

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()` and `exists()`
   - Index on `name` for search operations (if implemented)

2. **Query Optimization:**
   - Use efficient queries for existence checks
   - Consider caching package data if frequently accessed
   - Use `exists()` instead of `findById()` when only existence check is needed

3. **JSON Field Handling:**
   - `services` is stored as JSON
   - Parse JSON fields when loading entities
   - Validate JSON structure when saving entities
   - Consider indexing service IDs within JSON if database supports it

### Data Integrity

1. **Foreign Key Constraints:**
   - Service IDs in `services` JSON array reference `services` table (validated in application layer)
   - No direct foreign key constraints on JSON fields (application-level validation required)

2. **Validation:**
   - `name` must be non-empty and not whitespace-only
   - `services` array must be non-empty
   - Service IDs in `services` array must exist (validated in application layer)
   - `bundle_price` must be >= 0 if provided

3. **Business Rules:**
   - Package must contain at least one service
   - Bundle price is optional (defaults to sum of individual service prices)
   - Packages create separate appointment service lines when booked

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`, `update`) should be within transactions
- Service existence validation should be within the same transaction as package creation/update

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Service existence errors should be thrown when validating `services` array

### Business Rules

1. **Package Composition:**
   - Packages contain ordered list of services with quantities
   - Services are stored as JSON array: `[{service_id, qty}]`
   - Package must contain at least one service

2. **Pricing:**
   - Bundle price is optional
   - If bundle price not provided, total is sum of individual service prices
   - Bundle price can be less than sum of individual prices (discount)

3. **Booking:**
   - When package is booked, separate AppointmentServiceLine entries are created for each service
   - Each service line uses service price or price override
   - Package bundle price is not directly used in appointment (individual service prices are used)

---

## Related Repositories

- **ServiceRepository:** For validating services referenced in package
- **AppointmentServiceLineRepository:** For creating service lines when package is booked
- **AuditLogRepository:** For logging package operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `search(criteria: SearchCriteria, pagination: Pagination): Promise<PaginatedResult<ServicePackage>>` - Search packages with filters
- `findByName(name: string): Promise<ServicePackage | null>` - Find package by name
- `findByServiceId(serviceId: UUID): Promise<ServicePackage[]>` - Find packages containing specific service
- `delete(id: UUID): Promise<void>` - Delete package (if business rules allow)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

