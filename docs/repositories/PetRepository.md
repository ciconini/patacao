# Repository Interface Contract: PetRepository

## Overview

The `PetRepository` interface defines the contract for pet data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for pet entity operations.

**Entity:** `Pet`  
**Table:** `pets`  
**Module:** Administrative

## Entity Structure

Based on the ER model, the `Pet` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `customer_id` (UUID, NOT NULL, FK -> customers(id)) - Owner of the pet
- `name` (VARCHAR(255), NOT NULL) - Pet's name
- `species` (VARCHAR(64), NOT NULL) - Species (e.g., "dog", "cat", "bird")
- `breed` (VARCHAR(128), NULL) - Breed name
- `date_of_birth` (DATETIME, NULL) - Date of birth
- `microchip_id` (VARCHAR(64), NULL) - Microchip identification number
- `medical_notes` (TEXT, NULL) - Medical notes and history
- `vaccination` (JSON, NULL) - Vaccination records array
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NULL) - Last update timestamp

**Indexes:**
- Primary key on `id`
- Index on `customer_id`
- Index on `microchip_id` (for uniqueness checks)

**Relationships:**
- Pet 1 — 1 Customer (via `customer_id`)
- Pet 1 — 0..* Appointment (via `appointments.pet_id`)
- Pet 1 — 0..* ServiceNote (via service notes)

---

## Method Specifications

### 1. `save(pet: Pet): Promise<Pet>`

**Purpose:**  
Persist a new pet entity or update an existing pet entity. This method handles both creation and update operations based on whether the pet has an existing `id`.

**Input Parameters:**
- `pet` (Pet): Pet entity to persist
  - For new pets: `id` is null/undefined, all required fields must be present
  - For updates: `id` must be valid UUID of existing pet
  - Required fields: `customer_id`, `name`, `species`
  - Optional fields: `breed`, `date_of_birth`, `microchip_id`, `medical_notes`, `vaccination`

**Output Type:**
- `Promise<Pet>`: Returns the persisted pet entity with all fields populated, including generated `id` (if new), `created_at`, and `updated_at` timestamps

**Error Conditions:**
- `PetValidationError`: If required fields are missing or invalid
- `CustomerNotFoundError`: If `customer_id` does not exist in `customers` table
- `DuplicateMicrochipError`: If `microchip_id` is provided and already exists for another pet (if uniqueness enforced)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction if part of a larger operation (e.g., inline customer creation)
- Transaction should be managed by the calling use case or application service

**Notes on Expected Behaviour:**
- For new pets: Generates UUID for `id`, sets `created_at` and `updated_at` to current timestamp
- For updates: Updates `updated_at` timestamp, preserves `created_at` and `id`
- Validates foreign key constraint: `customer_id` must exist in `customers` table
- If `microchip_id` is provided, may check for uniqueness (business rule dependent)
- Returns the complete pet entity with all fields, including calculated `age` if `date_of_birth` is present (calculation done in domain/service layer)

**Related Use Cases:**
- UC-ADMIN-008: Create Pet

---

### 2. `findById(id: UUID): Promise<Pet | null>`

**Purpose:**  
Retrieve a pet entity by its unique identifier. Used for pet lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Pet identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Pet | null>`: Returns the pet entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete pet entity with all fields
- Returns `null` if pet with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by customer or other criteria (pure ID lookup)

**Related Use Cases:**
- UC-ADMIN-008: Create Pet (validation)
- UC-SVC-002: Create Appointment (pet validation)
- UC-SVC-006: Search Appointments (denormalization)

---

### 3. `belongsToCustomer(petId: UUID, customerId: UUID): Promise<boolean>`

**Purpose:**  
Verify that a pet belongs to a specific customer. Used for authorization and validation in appointment creation and other operations.

**Input Parameters:**
- `petId` (UUID): Pet identifier
  - Must be valid UUID format
- `customerId` (UUID): Customer identifier
  - Must be valid UUID format

**Output Type:**
- `Promise<boolean>`: Returns `true` if pet belongs to customer, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If either `petId` or `customerId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns `false` if pet does not exist (pet must exist to belong to customer)
- Returns `false` if customer does not exist (validation should occur separately)
- Uses indexed `customer_id` field for efficient lookup
- Should be optimized query (SELECT COUNT or EXISTS) rather than loading full entity

**Related Use Cases:**
- UC-SVC-002: Create Appointment (customer-pet relationship validation)

---

### 4. `findByCustomerId(customerId: UUID): Promise<Pet[]>`

**Purpose:**  
Retrieve all pets belonging to a specific customer. Used for customer detail views, pet selection in appointments, and customer management.

**Input Parameters:**
- `customerId` (UUID): Customer identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Pet[]>`: Returns array of pet entities belonging to the customer
  - Returns empty array `[]` if customer has no pets
  - Returns empty array `[]` if customer does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `customerId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses indexed `customer_id` field for efficient lookup
- Returns pets in no specific order (sorting should be done in application layer if needed)
- Returns all pets regardless of other criteria (no filtering by active status, etc.)
- Should be efficient query using index on `customer_id`

**Sorting and Filtering Rules:**
- No default sorting applied
- No filtering applied (returns all pets for customer)
- Application layer may sort by `name`, `species`, `created_at`, etc.

**Related Use Cases:**
- Customer detail views
- Pet selection in appointment creation
- Customer management operations

---

### 5. `countByCustomerId(customerId: UUID): Promise<number>`

**Purpose:**  
Count the number of pets belonging to a specific customer. Used for validation before customer deletion/archival and business rule enforcement.

**Input Parameters:**
- `customerId` (UUID): Customer identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<number>`: Returns count of pets (integer >= 0)
  - Returns `0` if customer has no pets
  - Returns `0` if customer does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `customerId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses indexed `customer_id` field for efficient COUNT query
- Should use COUNT(*) or COUNT(id) for performance
- Returns integer count, never negative
- Does not filter by any criteria (counts all pets for customer)

**Related Use Cases:**
- UC-ADMIN-007: Archive Customer (check for linked pets before deletion)

---

### 6. `findByMicrochipId(microchipId: string): Promise<Pet | null>`

**Purpose:**  
Retrieve a pet by its microchip identification number. Used for microchip uniqueness validation and pet lookup by microchip.

**Input Parameters:**
- `microchipId` (string): Microchip identification number
  - Must be non-empty string
  - Format validation should be done in application layer (ISO 11784/11785 or country-specific)
  - Case-sensitive or case-insensitive based on business rules

**Output Type:**
- `Promise<Pet | null>`: Returns the pet entity if found, `null` if not found

**Error Conditions:**
- `InvalidInputError`: If `microchipId` is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses index on `microchip_id` for efficient lookup
- Returns `null` if no pet with given microchip ID exists
- Returns `null` if microchip ID is not set (NULL in database)
- Should handle case sensitivity based on business rules (typically case-insensitive)
- Used for uniqueness validation before pet creation/update

**Related Use Cases:**
- UC-ADMIN-008: Create Pet (microchip uniqueness validation)

---

### 7. `update(pet: Pet): Promise<Pet>`

**Purpose:**  
Update an existing pet entity. This method is an alternative to `save()` when explicit update semantics are preferred. Updates only provided fields (partial update support).

**Input Parameters:**
- `pet` (Pet): Pet entity with updated fields
  - `id` must be valid UUID of existing pet
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)

**Output Type:**
- `Promise<Pet>`: Returns the updated pet entity with all fields

**Error Conditions:**
- `PetNotFoundError`: If pet with given `id` does not exist
- `PetValidationError`: If updated fields are invalid
- `CustomerNotFoundError`: If `customer_id` is being updated and new customer does not exist
- `DuplicateMicrochipError`: If `microchip_id` is being updated and already exists for another pet
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction if part of a larger operation
- Transaction should be managed by the calling use case or application service

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Preserves `created_at` timestamp
- Updates `updated_at` timestamp to current time
- Validates foreign key constraints if `customer_id` is being updated
- Validates microchip uniqueness if `microchip_id` is being updated
- Returns complete updated pet entity

**Related Use Cases:**
- Future: Update Pet use case

---

### 8. `delete(id: UUID): Promise<void>`

**Purpose:**  
Permanently delete a pet entity from the database. Used for pet removal when no referential constraints prevent deletion.

**Input Parameters:**
- `id` (UUID): Pet identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<void>`: Returns void on successful deletion

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `PetNotFoundError`: If pet with given `id` does not exist
- `ReferentialIntegrityError`: If pet has linked appointments or service notes (business rule dependent)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- May require cascade delete or referential integrity checks

**Notes on Expected Behaviour:**
- Permanently removes pet record from database
- Should check for referential integrity constraints (appointments, service notes)
- May throw error if pet has linked records (business rule dependent)
- Does not return deleted entity (void return)
- Should be logged in audit trail (handled by application layer)

**Related Use Cases:**
- Future: Delete Pet use case
- UC-ADMIN-007: Archive Customer (may delete pets as part of customer deletion)

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`
   - Index on `customer_id` for `findByCustomerId()`, `countByCustomerId()`, `belongsToCustomer()`
   - Index on `microchip_id` for `findByMicrochipId()`

2. **Query Optimization:**
   - Use efficient queries (COUNT, EXISTS) for validation methods
   - Avoid loading full entities when only existence or count is needed
   - Consider pagination for `findByCustomerId()` if customer has many pets

### Data Integrity

1. **Foreign Key Constraints:**
   - `customer_id` must reference existing customer (enforced by database)
   - Deletion of customer may cascade or restrict pet deletion (business rule dependent)

2. **Uniqueness:**
   - `microchip_id` uniqueness may be enforced at database level or application level
   - Primary key `id` is always unique

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`, `update`, `delete`) should be within transactions

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations

### GDPR and Data Privacy

- Pet records may contain personal data (medical notes, microchip ID)
- Repository should support data export and deletion for GDPR compliance
- Medical notes may require encryption at rest (handled by infrastructure layer)

---

## Related Repositories

- **CustomerRepository:** For customer validation and lookup
- **AppointmentRepository:** For checking pet appointments before deletion
- **AuditLogRepository:** For logging pet operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `search(criteria: PetSearchCriteria, pagination: Pagination): Promise<PaginatedResult<Pet>>` - Advanced search with filters
- `findBySpecies(species: string): Promise<Pet[]>` - Find pets by species
- `findPetsWithUpcomingVaccinations(dateRange: DateRange): Promise<Pet[]>` - Find pets needing vaccinations
- `bulkUpdate(pets: Pet[]): Promise<Pet[]>` - Bulk update operations
- `archive(id: UUID): Promise<Pet>` - Soft delete/archive pet (if business rule requires)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

