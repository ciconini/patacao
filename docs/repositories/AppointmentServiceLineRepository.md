# Repository Interface Contract: AppointmentServiceLineRepository

## Overview

The `AppointmentServiceLineRepository` interface defines the contract for appointment service line data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for appointment service line entity operations.

**Entity:** `AppointmentServiceLine`  
**Table:** `appointment_service_lines`  
**Module:** Services

## Entity Structure

Based on the ER model, the `AppointmentServiceLine` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `appointment_id` (UUID, NOT NULL, FK -> appointments(id)) - Appointment this line belongs to
- `service_id` (UUID, NOT NULL, FK -> services(id)) - Service for this line
- `quantity` (INT, NOT NULL, DEFAULT 1) - Quantity of service
- `price_override` (DECIMAL(12,2), NULL) - Price override (optional, if not provided, uses Service price)
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NULL) - Last update timestamp

**Indexes:**
- Primary key on `id`
- Index on `appointment_id` (for appointment-service line relationships)

**Relationships:**
- AppointmentServiceLine * — 1 Appointment (via `appointment_id`)
- AppointmentServiceLine * — 1 Service (via `service_id`)

**Business Rules:**
- Price calculation for an Appointment sums lines using `price_override` when present, otherwise Service price
- Each appointment can have multiple service lines (one per service)
- Quantity must be >= 1
- Service must exist and be valid

---

## Method Specifications

### 1. `saveLines(appointmentId: UUID, lines: AppointmentServiceLine[]): Promise<AppointmentServiceLine[]>`

**Purpose:**  
Persist multiple appointment service lines for an appointment. This method handles bulk creation of service lines and is used during appointment creation.

**Input Parameters:**
- `appointmentId` (UUID): Appointment identifier
  - Must be valid UUID format
  - Must not be null or undefined
  - Must reference existing appointment
- `lines` (AppointmentServiceLine[]): Array of service line entities to persist
  - Must be non-empty array
  - Each line must have: `service_id`, `quantity` (defaults to 1), optional `price_override`
  - `appointment_id` should match `appointmentId` parameter (or set automatically)

**Output Type:**
- `Promise<AppointmentServiceLine[]>`: Returns array of persisted service line entities with all fields populated, including generated `id`, `created_at`, and `updated_at` timestamps

**Error Conditions:**
- `AppointmentServiceLineValidationError`: If lines array is empty or invalid
- `AppointmentNotFoundError`: If `appointmentId` does not exist
- `ServiceNotFoundError`: If service referenced in any line does not exist
- `InvalidQuantityError`: If any line has `quantity` < 1
- `InvalidPriceOverrideError`: If any line has negative `price_override`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Appointment and service existence validation should be within the same transaction
- All lines must be saved atomically (all or nothing)

**Notes on Expected Behaviour:**
- Generates UUID for each line `id`
- Sets `appointment_id` to `appointmentId` for all lines
- Sets `created_at` and `updated_at` to current timestamp for each line
- Sets `quantity` to 1 if not provided
- Validates that `appointmentId` references existing appointment
- Validates that all service IDs reference existing services
- Validates `quantity` >= 1 for each line
- Validates `price_override` >= 0 if provided
- Returns array of complete service line entities with all fields
- All lines are saved atomically (transaction rollback if any line fails)

**Related Use Cases:**
- UC-SVC-002: Create Appointment (save service lines)

---

### 2. `findByAppointmentId(appointmentId: UUID): Promise<AppointmentServiceLine[]>`

**Purpose:**  
Retrieve all service lines for a specific appointment. Used for loading appointment details, calculating totals, and service line management.

**Input Parameters:**
- `appointmentId` (UUID): Appointment identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<AppointmentServiceLine[]>`: Returns array of service line entities for the appointment
  - Returns empty array `[]` if appointment has no service lines
  - Returns empty array `[]` if appointment does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `appointmentId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters service lines where `appointment_id = appointmentId`
- Uses index on `appointment_id` for efficient query
- Returns service lines in no specific order (database-dependent)
- Returns empty array if no service lines found for appointment
- Used for appointment detail retrieval and price calculation

**Sorting and Filtering Rules:**
- No default sorting applied
- Filters by appointment only
- Application layer may sort by `created_at` or `service_id`

**Related Use Cases:**
- UC-SVC-003: Confirm Appointment (load service lines for inventory reservation)
- UC-SVC-004: Complete Appointment (load service lines for inventory consumption)
- Appointment detail retrieval

---

### 3. `findById(id: UUID): Promise<AppointmentServiceLine | null>`

**Purpose:**  
Retrieve a service line entity by its unique identifier. Used for service line lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Service line identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<AppointmentServiceLine | null>`: Returns the service line entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete service line entity with all fields
- Returns `null` if service line with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by any criteria (pure ID lookup)

**Related Use Cases:**
- Service line lookup and validation

---

### 4. `update(line: AppointmentServiceLine): Promise<AppointmentServiceLine>`

**Purpose:**  
Update an existing service line entity. Used for modifying quantity, price override, or service assignment.

**Input Parameters:**
- `line` (AppointmentServiceLine): Service line entity with updated fields
  - `id` must be valid UUID of existing service line
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)

**Output Type:**
- `Promise<AppointmentServiceLine>`: Returns the updated service line entity with all fields

**Error Conditions:**
- `AppointmentServiceLineNotFoundError`: If service line with given `id` does not exist
- `AppointmentServiceLineValidationError`: If updated fields are invalid
- `ServiceNotFoundError`: If `service_id` is being updated and new service does not exist
- `InvalidQuantityError`: If `quantity` is being updated and is < 1
- `InvalidPriceOverrideError`: If `price_override` is being updated and is negative
- `ImmutableFieldError`: If `appointment_id` is being updated (not allowed)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Service existence validation should be within the same transaction if service is being updated

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Preserves `created_at` timestamp
- Updates `updated_at` timestamp to current time
- Does not allow `appointment_id` to be changed (immutable)
- Validates service existence if `service_id` is being updated
- Validates `quantity` >= 1 if being updated
- Validates `price_override` >= 0 if being updated
- Returns complete updated service line entity

**Related Use Cases:**
- Future: Update Appointment Service Line use case

---

### 5. `delete(id: UUID): Promise<void>`

**Purpose:**  
Permanently delete a service line entity from the database. Used for removing service lines from appointments.

**Input Parameters:**
- `id` (UUID): Service line identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<void>`: Returns void on successful deletion

**Error Conditions:**
- `AppointmentServiceLineNotFoundError`: If service line with given `id` does not exist
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- May require validation that appointment is in editable state (business rule)

**Notes on Expected Behaviour:**
- Permanently deletes service line record from database
- Does not cascade delete appointment (appointment remains)
- Should verify appointment is in editable state (business rule validation in application layer)
- Hard delete is permanent and cannot be undone
- Should be logged in audit trail (handled in application layer)

**Related Use Cases:**
- Future: Delete Appointment Service Line use case

---

### 6. `deleteByAppointmentId(appointmentId: UUID): Promise<number>`

**Purpose:**  
Delete all service lines for a specific appointment. Used for appointment cancellation or service line replacement.

**Input Parameters:**
- `appointmentId` (UUID): Appointment identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<number>`: Returns number of deleted service lines (integer >= 0)

**Error Conditions:**
- `InvalidUUIDError`: If `appointmentId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Bulk delete operation should be atomic

**Notes on Expected Behaviour:**
- Deletes all service lines where `appointment_id = appointmentId`
- Uses index on `appointment_id` for efficient query
- Returns count of deleted service lines
- Returns 0 if no service lines found for appointment
- Used for appointment cancellation or service line replacement
- Should verify appointment is in editable state (business rule validation in application layer)

**Related Use Cases:**
- Appointment cancellation (delete all service lines)
- Service line replacement operations

---

### 7. `countByAppointmentId(appointmentId: UUID): Promise<number>`

**Purpose:**  
Count the number of service lines for a specific appointment. Used for validation and business rule checks.

**Input Parameters:**
- `appointmentId` (UUID): Appointment identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<number>`: Returns count of service lines for the appointment (integer >= 0)
  - Returns `0` if appointment has no service lines
  - Returns `0` if appointment does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `appointmentId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Counts service lines where `appointment_id = appointmentId`
- Uses index on `appointment_id` for efficient COUNT query
- Returns integer count, never negative
- Used for validation (e.g., appointment must have at least one service line)

**Related Use Cases:**
- Appointment validation (ensure appointment has service lines)

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`, `update()`, and `delete()`
   - Index on `appointment_id` for `findByAppointmentId()`, `deleteByAppointmentId()`, and `countByAppointmentId()`

2. **Query Optimization:**
   - Use efficient queries for bulk operations
   - Optimize `saveLines()` for batch inserts
   - Use `countByAppointmentId()` instead of loading all lines when only count is needed

3. **Bulk Operations:**
   - `saveLines()` should use batch insert for performance
   - `deleteByAppointmentId()` should use bulk delete
   - Consider transaction size limits for very large line arrays

### Data Integrity

1. **Foreign Key Constraints:**
   - `appointment_id` must reference existing appointment (enforced by database)
   - `service_id` must reference existing service (enforced by database)
   - Service lines cannot exist without appointment

2. **Validation:**
   - `quantity` must be >= 1
   - `price_override` must be >= 0 if provided
   - Appointment must exist before creating service lines
   - Service must exist before creating service line

3. **Business Rules:**
   - Appointment should have at least one service line (business rule validation in application layer)
   - Price override is optional (defaults to service price)
   - Service lines are immutable after appointment confirmation (business rule dependent)

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`saveLines`, `update`, `delete`, `deleteByAppointmentId`) should be within transactions
- `saveLines()` must be atomic (all lines saved or none)
- Appointment and service existence validation should be within the same transaction as line creation

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Service and appointment existence errors should be thrown when validating references

### Business Rules

1. **Price Calculation:**
   - Price calculation uses `price_override` if present, otherwise Service price
   - Total appointment price is sum of all service line prices (price * quantity)
   - Price override allows custom pricing per appointment

2. **Quantity:**
   - Quantity must be >= 1
   - Quantity represents number of times service is performed
   - Multiple lines can have same service with different quantities

3. **Service Lines:**
   - Each appointment can have multiple service lines
   - Each line represents one service with quantity
   - Service lines are created when appointment is created
   - Service lines may be immutable after appointment confirmation

---

## Related Repositories

- **AppointmentRepository:** For appointment validation and relationships
- **ServiceRepository:** For service validation and price lookup
- **AuditLogRepository:** For logging service line operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `findByServiceId(serviceId: UUID): Promise<AppointmentServiceLine[]>` - Find service lines by service
- `updateQuantity(id: UUID, quantity: number): Promise<AppointmentServiceLine>` - Update quantity only
- `updatePriceOverride(id: UUID, priceOverride: Decimal): Promise<AppointmentServiceLine>` - Update price override only
- `bulkUpdate(lines: AppointmentServiceLine[]): Promise<AppointmentServiceLine[]>` - Bulk update service lines

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

