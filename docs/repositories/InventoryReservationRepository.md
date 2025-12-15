# Repository Interface Contract: InventoryReservationRepository

## Overview

The `InventoryReservationRepository` interface defines the contract for inventory reservation data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for inventory reservation entity operations, including reservation management, availability checks, and expiration handling.

**Entity:** `InventoryReservation`  
**Table:** `inventory_reservations`  
**Module:** Inventory

## Entity Structure

Based on the ER model, the `InventoryReservation` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `product_id` (UUID, NOT NULL, FK -> products(id)) - Product being reserved
- `quantity` (INT, NOT NULL) - Reserved quantity
- `reserved_for` (UUID, NOT NULL) - Reference to appointment_id or transaction_id (polymorphic)
- `reserved_type` (VARCHAR(32), NOT NULL) - Type of reservation: "appointment" or "transaction"
- `expires_at` (DATETIME, NULL) - Expiration timestamp (optional)
- `created_at` (DATETIME, NOT NULL) - Creation timestamp

**Indexes:**
- Primary key on `id`
- Index on `product_id` (for product reservation lookups)
- Index on `reserved_for` (for appointment/transaction lookups)

**Relationships:**
- InventoryReservation * — 1 Product (via `product_id`)
- InventoryReservation 0..1 — 1 Appointment (via `reserved_for` when `reserved_type = "appointment"`)
- InventoryReservation 0..1 — 1 Transaction (via `reserved_for` when `reserved_type = "transaction"`)

**Business Rules:**
- Reservation reduces available stock for other operations but final decrement happens at sale completion
- Manager can override reservation failures
- Reservations can expire and should be auto-released
- Reservations must be released or consumed (cannot remain active indefinitely)

---

## Method Specifications

### 1. `save(reservation: InventoryReservation): Promise<InventoryReservation>`

**Purpose:**  
Persist a new inventory reservation entity. This method handles reservation creation and is used during appointment confirmation and transaction creation.

**Input Parameters:**
- `reservation` (InventoryReservation): Inventory reservation entity to persist
  - `id` is null/undefined (new reservation)
  - Required fields: `product_id`, `quantity`, `reserved_for`, `reserved_type`
  - Optional fields: `expires_at`

**Output Type:**
- `Promise<InventoryReservation>`: Returns the persisted inventory reservation entity with all fields populated, including generated `id` and `created_at` timestamp

**Error Conditions:**
- `InventoryReservationValidationError`: If required fields are missing or invalid
- `ProductNotFoundError`: If `product_id` does not exist
- `ProductNotStockTrackedError`: If product is not stock_tracked
- `InvalidQuantityError`: If `quantity` <= 0
- `InvalidReservedTypeError`: If `reserved_type` is not "appointment" or "transaction"
- `TargetNotFoundError`: If `reserved_for` does not exist in respective table (appointment or transaction)
- `InvalidExpiryError`: If `expires_at` is in the past
- `InsufficientStockError`: If available stock < `quantity` (business rule dependent, may allow override)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Should be atomic with availability check
- Multiple reservations in same transaction should all succeed or all fail

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `created_at` to current timestamp
- Validates that `product_id` references existing product and product is stock_tracked
- Validates that `reserved_for` references existing appointment or transaction based on `reserved_type`
- Validates `quantity` > 0
- Validates `reserved_type` is "appointment" or "transaction"
- Validates `expires_at` is in the future if provided
- Should check available stock before creating reservation (application layer responsibility)
- Returns the complete inventory reservation entity with all fields

**Related Use Cases:**
- UC-INV-003: Inventory Reservation

---

### 2. `findById(id: UUID): Promise<InventoryReservation | null>`

**Purpose:**  
Retrieve an inventory reservation entity by its unique identifier. Used for reservation lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Inventory reservation identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<InventoryReservation | null>`: Returns the inventory reservation entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete inventory reservation entity with all fields
- Returns `null` if reservation with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by any criteria (pure ID lookup)

**Related Use Cases:**
- UC-INV-010: Release Inventory Reservation (reservation lookup)

---

### 3. `findByAppointmentId(appointmentId: UUID): Promise<InventoryReservation[]>`

**Purpose:**  
Retrieve all inventory reservations for a specific appointment. Used for loading reservations when completing or cancelling appointments.

**Input Parameters:**
- `appointmentId` (UUID): Appointment identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<InventoryReservation[]>`: Returns array of inventory reservation entities for the appointment
  - Returns empty array `[]` if appointment has no reservations
  - Returns empty array `[]` if appointment does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `appointmentId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters reservations where `reserved_for = appointmentId` AND `reserved_type = "appointment"`
- Uses index on `reserved_for` for efficient query
- Returns reservations in no specific order (database-dependent)
- Returns empty array if no reservations found for appointment
- Used for appointment completion and cancellation workflows

**Sorting and Filtering Rules:**
- Filters by appointment ID and reservation type
- No default sorting applied
- Application layer may sort by `created_at` or `product_id`

**Related Use Cases:**
- UC-SVC-004: Complete Appointment (load reservations for consumption)
- UC-SVC-005: Cancel Appointment (load reservations for release)

---

### 4. `findByTransactionId(transactionId: UUID): Promise<InventoryReservation[]>`

**Purpose:**  
Retrieve all inventory reservations for a specific transaction. Used for loading reservations when completing transactions.

**Input Parameters:**
- `transactionId` (UUID): Transaction identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<InventoryReservation[]>`: Returns array of inventory reservation entities for the transaction
  - Returns empty array `[]` if transaction has no reservations
  - Returns empty array `[]` if transaction does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `transactionId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters reservations where `reserved_for = transactionId` AND `reserved_type = "transaction"`
- Uses index on `reserved_for` for efficient query
- Returns reservations in no specific order (database-dependent)
- Returns empty array if no reservations found for transaction
- Used for transaction completion workflows

**Sorting and Filtering Rules:**
- Filters by transaction ID and reservation type
- No default sorting applied
- Application layer may sort by `created_at` or `product_id`

**Related Use Cases:**
- Transaction completion (load reservations for consumption)

---

### 5. `findByProductId(productId: UUID): Promise<InventoryReservation[]>`

**Purpose:**  
Retrieve all active inventory reservations for a specific product. Used for availability calculations and stock management.

**Input Parameters:**
- `productId` (UUID): Product identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<InventoryReservation[]>`: Returns array of active inventory reservation entities for the product
  - Returns empty array `[]` if product has no active reservations
  - Returns empty array `[]` if product does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `productId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters reservations where `product_id = productId`
- May filter out expired reservations (application layer responsibility or repository implementation)
- Uses index on `product_id` for efficient query
- Returns reservations in no specific order (database-dependent)
- Returns empty array if no active reservations found for product
- Used for availability calculations

**Sorting and Filtering Rules:**
- Filters by product only
- May filter by expiration status (business rule dependent)
- No default sorting applied
- Application layer may sort by `created_at` or `expires_at`

**Related Use Cases:**
- Stock availability calculations
- Product reservation management

---

### 6. `checkAvailableStock(productId: UUID, quantity: Integer): Promise<boolean>`

**Purpose:**  
Check if sufficient stock is available for reservation (considering existing reservations). Used for availability validation before creating new reservations.

**Input Parameters:**
- `productId` (UUID): Product identifier
  - Must be valid UUID format
- `quantity` (Integer): Required quantity
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
- May be part of larger transaction (e.g., reservation creation with availability check)

**Notes on Expected Behaviour:**
- Checks if product exists and is stock_tracked
- Calculates available stock (on-hand stock minus active reserved stock)
- Excludes expired reservations from calculation
- Returns `true` if available stock >= `quantity`
- Returns `false` if product does not exist
- Returns `false` if product is not stock_tracked
- Returns `false` if available stock < `quantity`
- Should be fast (< 200ms per N1 requirement)
- Used for availability validation before reservation creation

**Sorting and Filtering Rules:**
- No sorting or filtering applied
- Pure availability check based on stock and reservations

**Related Use Cases:**
- UC-INV-003: Inventory Reservation (availability check)

---

### 7. `release(reservationId: UUID): Promise<void>`

**Purpose:**  
Release an inventory reservation, making the reserved stock available again. Used when appointments are cancelled or reservations are manually released.

**Input Parameters:**
- `reservationId` (UUID): Reservation identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<void>`: Returns void on successful release

**Error Conditions:**
- `InventoryReservationNotFoundError`: If reservation with given `id` does not exist
- `InvalidUUIDError`: If `reservationId` is not a valid UUID format
- `ReservationAlreadyReleasedError`: If reservation is already released (business rule dependent)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Should be atomic with availability update
- Idempotent operation (releasing already released reservation is allowed, business rule dependent)

**Notes on Expected Behaviour:**
- Deletes reservation record or marks as released (implementation dependent)
- Makes reserved stock available again (increases available stock)
- Should verify reservation exists before releasing
- Idempotent operation (can be called multiple times safely if reservation already released)
- Used for reservation cancellation and manual release

**Related Use Cases:**
- UC-INV-010: Release Inventory Reservation
- UC-SVC-005: Cancel Appointment (release reservations)

---

### 8. `consume(reservationId: UUID): Promise<void>`

**Purpose:**  
Mark an inventory reservation as consumed. Used when stock is actually decremented (sale completion, service completion). Reservation is consumed rather than released.

**Input Parameters:**
- `reservationId` (UUID): Reservation identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<void>`: Returns void on successful consumption

**Error Conditions:**
- `InventoryReservationNotFoundError`: If reservation with given `id` does not exist
- `InvalidUUIDError`: If `reservationId` is not a valid UUID format
- `ReservationAlreadyConsumedError`: If reservation is already consumed (business rule dependent)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Should be atomic with stock decrement and stock movement creation
- Idempotent operation (consuming already consumed reservation is allowed, business rule dependent)

**Notes on Expected Behaviour:**
- Marks reservation as consumed (deletes or updates status)
- Reservation is consumed when stock is actually decremented
- Should verify reservation exists before consuming
- Idempotent operation (can be called multiple times safely if reservation already consumed)
- Used in conjunction with stock decrement operations

**Related Use Cases:**
- UC-SVC-004: Complete Appointment (consume reservations when stock decremented)

---

### 9. `findExpired(): Promise<InventoryReservation[]>`

**Purpose:**  
Retrieve all expired inventory reservations. Used for automatic expiration and cleanup operations.

**Input Parameters:**
- None

**Output Type:**
- `Promise<InventoryReservation[]>`: Returns array of expired inventory reservation entities
  - Returns empty array `[]` if no expired reservations found

**Error Conditions:**
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters reservations where `expires_at IS NOT NULL` AND `expires_at < current_timestamp`
- Returns only active reservations (not already released or consumed)
- Returns reservations in no specific order (database-dependent)
- Used for automatic expiration cleanup (background job)

**Sorting and Filtering Rules:**
- Filters by expiration timestamp only
- No default sorting applied
- Application layer may sort by `expires_at` ascending (earliest expiry first)

**Related Use Cases:**
- Automatic reservation expiration (background job)

---

### 10. `update(reservation: InventoryReservation): Promise<InventoryReservation>`

**Purpose:**  
Update an existing inventory reservation entity. Used for modifying reservation quantity, expiration, or status.

**Input Parameters:**
- `reservation` (InventoryReservation): Inventory reservation entity with updated fields
  - `id` must be valid UUID of existing reservation
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)

**Output Type:**
- `Promise<InventoryReservation>`: Returns the updated inventory reservation entity with all fields

**Error Conditions:**
- `InventoryReservationNotFoundError`: If reservation with given `id` does not exist
- `InventoryReservationValidationError`: If updated fields are invalid
- `InvalidQuantityError`: If `quantity` is being updated and is <= 0
- `InvalidExpiryError`: If `expires_at` is being updated and is in the past
- `ImmutableFieldError`: If `product_id`, `reserved_for`, or `reserved_type` is being updated (not allowed)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Preserves `created_at` timestamp
- Does not allow `product_id`, `reserved_for`, or `reserved_type` to be changed (immutable)
- Validates `quantity` > 0 if being updated
- Validates `expires_at` is in the future if being updated
- Returns complete updated inventory reservation entity

**Related Use Cases:**
- Future: Update Inventory Reservation use case

---

### 11. `delete(id: UUID): Promise<void>`

**Purpose:**  
Permanently delete an inventory reservation entity from the database. Used for hard deletion when reservation is released or consumed.

**Input Parameters:**
- `id` (UUID): Reservation identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<void>`: Returns void on successful deletion

**Error Conditions:**
- `InventoryReservationNotFoundError`: If reservation with given `id` does not exist
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Should be atomic with availability update

**Notes on Expected Behaviour:**
- Permanently deletes reservation record from database
- Makes reserved stock available again (increases available stock)
- Hard delete is permanent and cannot be undone
- Should be logged in audit trail (handled in application layer)
- Used for reservation release/consumption (if hard delete is preferred over soft delete)

**Related Use Cases:**
- UC-INV-010: Release Inventory Reservation (if hard delete is used)

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`, `release()`, `consume()`, and `delete()`
   - Index on `product_id` for `findByProductId()` and availability checks
   - Index on `reserved_for` for `findByAppointmentId()` and `findByTransactionId()`

2. **Query Optimization:**
   - Use efficient queries for availability checks
   - Optimize expiration queries with proper date indexes
   - Consider caching availability calculations for frequently accessed products
   - Use batch operations for expiration cleanup

3. **Availability Checks:**
   - Availability checks must be fast (< 200ms per N1 requirement)
   - Consider materialized views or caching for availability calculations
   - Use database-level locking to prevent race conditions

### Data Integrity

1. **Foreign Key Constraints:**
   - `product_id` must reference existing product (enforced by database)
   - `reserved_for` references appointments or transactions (validated in application layer)

2. **Validation:**
   - `quantity` must be > 0
   - `reserved_type` must be "appointment" or "transaction"
   - `expires_at` must be in the future if provided
   - Product must be stock_tracked

3. **Business Rules:**
   - Reservations reduce available stock but not on-hand
   - Reservations must be released or consumed
   - Expired reservations should be auto-released
   - Manager can override insufficient stock rules

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`, `release`, `consume`, `update`, `delete`) should be within transactions
- Reservation creation should be atomic with availability check
- Reservation release/consume should be atomic with availability update

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Availability errors should be thrown when insufficient stock (unless override allowed)

### Business Rules

1. **Reservation Lifecycle:**
   - Reservations are created when stock is reserved (appointment confirmation, transaction creation)
   - Reservations are released when cancelled (appointment cancellation)
   - Reservations are consumed when stock is decremented (sale/service completion)
   - Reservations expire automatically if `expires_at` is set

2. **Stock Availability:**
   - Reservations reduce available stock but not on-hand
   - Available stock = on-hand stock - active reserved stock
   - Expired reservations do not reduce available stock
   - Final stock decrement happens at sale/service completion

3. **Override Rules:**
   - Manager/Owner can override insufficient stock rules
   - Staff cannot override (blocked if insufficient stock)
   - Override behavior is configurable (business rule flag)

---

## Related Repositories

- **ProductRepository:** For product validation and stock tracking checks
- **AppointmentRepository:** For appointment validation (reserved_for)
- **TransactionRepository:** For transaction validation (reserved_for)
- **AuditLogRepository:** For logging reservation operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `findByProductIdAndStatus(productId: UUID, status: string): Promise<InventoryReservation[]>` - Find reservations by status
- `countByProductId(productId: UUID): Promise<number>` - Count active reservations for product
- `bulkRelease(reservationIds: UUID[]): Promise<number>` - Bulk release reservations
- `bulkConsume(reservationIds: UUID[]): Promise<number>` - Bulk consume reservations

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

