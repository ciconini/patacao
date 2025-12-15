# Repository Interface Contract: AppointmentRepository

## Overview

The `AppointmentRepository` interface defines the contract for appointment data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for appointment entity operations, including scheduling, conflict detection, and appointment lifecycle management.

**Entity:** `Appointment`  
**Table:** `appointments`  
**Module:** Services

## Entity Structure

Based on the ER model, the `Appointment` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `store_id` (UUID, NOT NULL, FK -> stores(id)) - Store where appointment takes place
- `customer_id` (UUID, NOT NULL, FK -> customers(id)) - Customer booking the appointment
- `pet_id` (UUID, NOT NULL, FK -> pets(id)) - Pet receiving the service
- `start_at` (DATETIME, NOT NULL) - Appointment start time
- `end_at` (DATETIME, NOT NULL) - Appointment end time
- `status` (VARCHAR(32), NOT NULL) - Appointment status (booked, confirmed, checked_in, completed, cancelled, needs-reschedule)
- `created_by` (UUID, NULL, FK -> users(id)) - User who created the appointment
- `staff_id` (UUID, NULL, FK -> users(id)) - Assigned staff member
- `notes` (TEXT, NULL) - Appointment notes
- `recurrence_id` (UUID, NULL) - Recurrence group identifier (for recurring appointments)
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NULL) - Last update timestamp

**Indexes:**
- Primary key on `id`
- Index on `store_id`
- Index on `start_at` (for date range queries and conflict detection)
- Index on `staff_id` (for staff calendar views)

**Relationships:**
- Appointment 1 — 1 Store (via `store_id`)
- Appointment 1 — 1 Customer (via `customer_id`)
- Appointment 1 — 1 Pet (via `pet_id`)
- Appointment 0..1 — 1 Staff (User) (via `staff_id`)
- Appointment 1 — 1..* AppointmentServiceLine (service lines)
- Appointment 0..1 — 0..* InventoryReservation (if services consume inventory)

**Status Values:**
- `booked`: Appointment booked but not confirmed
- `confirmed`: Appointment confirmed (inventory reserved if applicable)
- `checked_in`: Customer checked in
- `completed`: Appointment completed
- `cancelled`: Appointment cancelled
- `needs-reschedule`: Appointment needs rescheduling

---

## Method Specifications

### 1. `save(appointment: Appointment): Promise<Appointment>`

**Purpose:**  
Persist a new appointment entity. This method handles appointment creation and is used during initial booking.

**Input Parameters:**
- `appointment` (Appointment): Appointment entity to persist
  - `id` is null/undefined (new appointment)
  - Required fields: `store_id`, `customer_id`, `pet_id`, `start_at`, `end_at`, `status`
  - Optional fields: `created_by`, `staff_id`, `notes`, `recurrence_id`
  - `status` should be "booked" for new appointments

**Output Type:**
- `Promise<Appointment>`: Returns the persisted appointment entity with all fields populated, including generated `id`, `created_at`, and `updated_at` timestamps

**Error Conditions:**
- `AppointmentValidationError`: If required fields are missing or invalid
- `StoreNotFoundError`: If `store_id` does not exist
- `CustomerNotFoundError`: If `customer_id` does not exist
- `PetNotFoundError`: If `pet_id` does not exist
- `StaffNotFoundError`: If `staff_id` is provided and does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- May be part of larger transaction (e.g., appointment creation with service lines)

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `created_at` and `updated_at` to current timestamp
- Sets `status` to "booked" if not provided
- Validates foreign key constraints (store, customer, pet, staff)
- Does not create service lines (handled by AppointmentServiceLineRepository)
- Does not check for conflicts (handled separately by `findConflicts()`)
- Returns the complete appointment entity with all fields

**Related Use Cases:**
- UC-SVC-002: Create Appointment

---

### 2. `findById(id: UUID): Promise<Appointment | null>`

**Purpose:**  
Retrieve an appointment entity by its unique identifier. Used for appointment lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Appointment identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Appointment | null>`: Returns the appointment entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete appointment entity with all fields
- Returns `null` if appointment with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by status or other criteria (pure ID lookup)
- May include service lines in response (eager loading, business rule dependent)

**Related Use Cases:**
- UC-SVC-002: Create Appointment (validation)
- UC-SVC-003: Confirm Appointment
- UC-SVC-004: Complete Appointment
- UC-SVC-005: Cancel Appointment
- UC-SVC-006: Search Appointments (denormalization)

---

### 3. `update(appointment: Appointment): Promise<Appointment>`

**Purpose:**  
Update an existing appointment entity. Used for status changes, rescheduling, and other appointment modifications.

**Input Parameters:**
- `appointment` (Appointment): Appointment entity with updated fields
  - `id` must be valid UUID of existing appointment
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)

**Output Type:**
- `Promise<Appointment>`: Returns the updated appointment entity with all fields

**Error Conditions:**
- `AppointmentNotFoundError`: If appointment with given `id` does not exist
- `AppointmentValidationError`: If updated fields are invalid
- `StoreNotFoundError`: If `store_id` is being updated and new store does not exist
- `StaffNotFoundError`: If `staff_id` is being updated and new staff does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- May be part of larger transaction (e.g., reschedule with conflict check)

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Preserves `created_at` timestamp
- Updates `updated_at` timestamp to current time
- Validates foreign key constraints if `store_id` or `staff_id` is being updated
- Does not update service lines (handled by AppointmentServiceLineRepository)
- Returns complete updated appointment entity

**Related Use Cases:**
- UC-SVC-003: Confirm Appointment (status update)
- UC-SVC-004: Complete Appointment (status update)
- UC-SVC-005: Cancel Appointment (status update)
- Future: Update Appointment use case
- Future: Reschedule Appointment use case

---

### 4. `findConflicts(storeId: UUID, staffId: UUID | null, startAt: DateTime, endAt: DateTime, excludeId?: UUID): Promise<Appointment[]>`

**Purpose:**  
Find appointments that conflict with the given time range, store, and optionally staff. Used for double-booking prevention during appointment creation and rescheduling.

**Input Parameters:**
- `storeId` (UUID): Store identifier
  - Must be valid UUID format
- `staffId` (UUID | null): Staff identifier (optional)
  - If provided: checks for staff conflicts
  - If null: checks only store-level conflicts
- `startAt` (DateTime): Start time of appointment
  - Must be valid datetime
- `endAt` (DateTime): End time of appointment
  - Must be valid datetime
  - Must be > `startAt`
- `excludeId` (UUID, optional): Appointment ID to exclude from conflict check
  - Used when updating/rescheduling existing appointment
  - Excludes the appointment being updated from conflict results

**Output Type:**
- `Promise<Appointment[]>`: Returns array of conflicting appointments
  - Returns empty array `[]` if no conflicts found
  - Conflicts are appointments that overlap with the given time range

**Error Conditions:**
- `InvalidUUIDError`: If `storeId` or `staffId` is not a valid UUID format
- `InvalidDateTimeError`: If `startAt` or `endAt` is invalid
- `InvalidTimeRangeError`: If `endAt` <= `startAt`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- Should be executed within a read transaction for consistency
- May be part of larger transaction (e.g., appointment creation with conflict check)

**Notes on Expected Behaviour:**
- Finds appointments that overlap with the given time range
- Overlap detection: appointments where `(start_at < endAt) AND (end_at > startAt)`
- Filters by `store_id` (always)
- Filters by `staff_id` if provided (staff-specific conflicts)
- Excludes appointments with status "cancelled" (cancelled appointments don't block)
- Excludes appointment with `excludeId` if provided (for updates)
- Uses indexes on `store_id`, `staff_id`, and `start_at` for efficient queries
- Returns conflicting appointments with all fields
- Should be atomic to prevent race conditions (use database-level locking if needed)

**Conflict Detection Logic:**
- Two appointments conflict if their time ranges overlap
- Overlap formula: `(appointment1.start_at < appointment2.end_at) AND (appointment1.end_at > appointment2.start_at)`
- Cancelled appointments are not considered conflicts

**Related Use Cases:**
- UC-SVC-002: Create Appointment (conflict detection)
- Future: Reschedule Appointment (conflict detection)

---

### 5. `findByRecurrenceId(recurrenceId: UUID): Promise<Appointment[]>`

**Purpose:**  
Retrieve all appointment instances belonging to a recurring appointment series. Used for managing recurring appointments and series operations.

**Input Parameters:**
- `recurrenceId` (UUID): Recurrence group identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Appointment[]>`: Returns array of appointment entities with the same `recurrence_id`
  - Returns empty array `[]` if no appointments found with given recurrence ID
  - Appointments are distinct instances linked via `recurrence_id`

**Error Conditions:**
- `InvalidUUIDError`: If `recurrenceId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Queries appointments where `recurrence_id = recurrenceId`
- Returns all appointments in the series regardless of status
- Returns appointments in no specific order (sorting should be done in application layer)
- Each appointment is an independent instance (can be modified or cancelled individually)
- Used for recurring appointment management (e.g., cancel entire series, modify series)

**Sorting and Filtering Rules:**
- No default sorting applied
- No filtering applied (returns all appointments in series)
- Application layer may sort by `start_at` for chronological order

**Related Use Cases:**
- UC-SVC-002: Create Appointment (recurring appointments)
- Recurring appointment management operations

---

### 6. `search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<Appointment>>`

**Purpose:**  
Search and filter appointment records by various criteria with pagination and sorting. Used for calendar views, appointment management, and reporting.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object
  - `store_id?: UUID` - Filter by store
  - `staff_id?: UUID` - Filter by assigned staff
  - `customer_id?: UUID` - Filter by customer
  - `pet_id?: UUID` - Filter by pet
  - `start_date?: Date` - Start date for date range filter
  - `end_date?: Date` - End date for date range filter
  - `status?: string` - Filter by appointment status
- `pagination` (Pagination): Pagination parameters
  - `page: number` - Page number (min 1, default 1)
  - `per_page: number` - Results per page (min 1, max 100, default 20)
- `sort` (Sort): Sort parameters
  - `field: string` - Sort field ("start_at", "created_at")
  - `direction: 'asc' | 'desc'` - Sort direction (default: "asc")

**Output Type:**
- `Promise<PaginatedResult<Appointment>>`: Returns paginated result with:
  - `items: Appointment[]` - Array of appointment entities matching criteria
  - `meta: PaginationMeta` - Pagination metadata (total, page, per_page, total_pages, has_next, has_previous)

**Error Conditions:**
- `InvalidPaginationError`: If pagination parameters are invalid
- `InvalidSortError`: If sort field is invalid
- `InvalidDateRangeError`: If `start_date` > `end_date`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Builds query with filters based on criteria
- Date range filters use `start_at` field (appointments with `start_at` between `start_date` and `end_date`)
- Status filtering uses exact match
- Uses indexes on `store_id`, `staff_id`, `start_at` for efficient queries
- Returns appointments in no specific order if no sort specified (default: `start_at` ascending)
- May include denormalized data (customer name, pet name, staff name) in response (business rule dependent)
- Excludes cancelled appointments from results (business rule dependent, or include based on criteria)

**Pagination Rules:**
- Default page: 1
- Default per_page: 20
- Maximum per_page: 100
- Returns empty array if no results found
- Total count calculated before pagination

**Sorting and Filtering Rules:**
- Valid sort fields: "start_at", "created_at"
- Default sort: "start_at" ascending (earliest first)
- Date range filters are inclusive (appointments on start and end dates are included)
- Status filter uses exact match (case-sensitive)
- Store, staff, customer, pet filters use exact match

**Related Use Cases:**
- UC-SVC-006: Search Appointments

---

### 7. `count(criteria: SearchCriteria): Promise<number>`

**Purpose:**  
Count the number of appointments matching search criteria. Used for pagination metadata calculation.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object (same as `search()` method)
  - `store_id?: UUID` - Filter by store
  - `staff_id?: UUID` - Filter by staff
  - `customer_id?: UUID` - Filter by customer
  - `pet_id?: UUID` - Filter by pet
  - `start_date?: Date` - Start date
  - `end_date?: Date` - End date
  - `status?: string` - Filter by status

**Output Type:**
- `Promise<number>`: Returns count of matching appointments (integer >= 0)

**Error Conditions:**
- `InvalidDateRangeError`: If `start_date` > `end_date`
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
- UC-SVC-006: Search Appointments (pagination metadata)

---

### 8. `countByCustomerId(customerId: UUID): Promise<number>`

**Purpose:**  
Count the number of appointments for a specific customer. Used for validation before customer deletion/archival and business rule enforcement.

**Input Parameters:**
- `customerId` (UUID): Customer identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<number>`: Returns count of appointments for the customer (integer >= 0)
  - Returns `0` if customer has no appointments
  - Returns `0` if customer does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `customerId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Counts appointments where `customer_id = customerId`
- Uses index on `customer_id` for efficient COUNT query
- Should use COUNT(*) or COUNT(id) for performance
- Returns integer count, never negative
- Does not filter by status (counts all appointments regardless of status)
- Used for referential integrity checks before customer deletion

**Related Use Cases:**
- UC-ADMIN-007: Archive Customer (check for linked appointments before deletion)

---

### 9. `findByStoreIdAndDateRange(storeId: UUID, startDate: Date, endDate: Date): Promise<Appointment[]>`

**Purpose:**  
Retrieve all appointments for a specific store within a date range. Used for store calendar views and availability checks.

**Input Parameters:**
- `storeId` (UUID): Store identifier
  - Must be valid UUID format
- `startDate` (Date): Start date of range
  - Must be valid date
- `endDate` (Date): End date of range
  - Must be valid date
  - Must be >= `startDate`

**Output Type:**
- `Promise<Appointment[]>`: Returns array of appointment entities for the store in the date range
  - Returns empty array `[]` if no appointments found

**Error Conditions:**
- `InvalidUUIDError`: If `storeId` is not a valid UUID format
- `InvalidDateRangeError`: If `startDate` > `endDate`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters by `store_id` and `start_at` between `startDate` and `endDate`
- Uses indexes on `store_id` and `start_at` for efficient queries
- Date range is inclusive (appointments on start and end dates are included)
- Returns appointments in no specific order (sorting should be done in application layer)
- May exclude cancelled appointments (business rule dependent)
- Used for calendar views and availability calculations

**Sorting and Filtering Rules:**
- No default sorting applied
- Filters by store and date range only
- Application layer may sort by `start_at` for chronological order

**Related Use Cases:**
- Calendar views
- Availability checks
- Store schedule generation

---

### 10. `findByStaffIdAndDateRange(staffId: UUID, startDate: Date, endDate: Date): Promise<Appointment[]>`

**Purpose:**  
Retrieve all appointments for a specific staff member within a date range. Used for staff calendar views and availability checks.

**Input Parameters:**
- `staffId` (UUID): Staff (User) identifier
  - Must be valid UUID format
- `startDate` (Date): Start date of range
  - Must be valid date
- `endDate` (Date): End date of range
  - Must be valid date
  - Must be >= `startDate`

**Output Type:**
- `Promise<Appointment[]>`: Returns array of appointment entities for the staff member in the date range
  - Returns empty array `[]` if no appointments found

**Error Conditions:**
- `InvalidUUIDError`: If `staffId` is not a valid UUID format
- `InvalidDateRangeError`: If `startDate` > `endDate`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters by `staff_id` and `start_at` between `startDate` and `endDate`
- Uses indexes on `staff_id` and `start_at` for efficient queries
- Date range is inclusive (appointments on start and end dates are included)
- Returns appointments in no specific order (sorting should be done in application layer)
- May exclude cancelled appointments (business rule dependent)
- Used for staff calendar views and availability calculations

**Sorting and Filtering Rules:**
- No default sorting applied
- Filters by staff and date range only
- Application layer may sort by `start_at` for chronological order

**Related Use Cases:**
- Staff calendar views
- Staff availability checks
- Staff schedule generation

---

### 11. `findByCustomerId(customerId: UUID): Promise<Appointment[]>`

**Purpose:**  
Retrieve all appointments for a specific customer. Used for customer history and appointment management.

**Input Parameters:**
- `customerId` (UUID): Customer identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Appointment[]>`: Returns array of appointment entities for the customer
  - Returns empty array `[]` if customer has no appointments
  - Returns empty array `[]` if customer does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `customerId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters by `customer_id`
- Uses index on `customer_id` for efficient query (if index exists)
- Returns appointments in no specific order (sorting should be done in application layer)
- Returns all appointments regardless of status (no filtering)
- May include service lines in response (eager loading, business rule dependent)

**Sorting and Filtering Rules:**
- No default sorting applied
- No filtering applied (returns all appointments for customer)
- Application layer may sort by `start_at` descending (most recent first)

**Related Use Cases:**
- Customer appointment history
- Customer management operations

---

### 12. `findByPetId(petId: UUID): Promise<Appointment[]>`

**Purpose:**  
Retrieve all appointments for a specific pet. Used for pet history and medical record tracking.

**Input Parameters:**
- `petId` (UUID): Pet identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Appointment[]>`: Returns array of appointment entities for the pet
  - Returns empty array `[]` if pet has no appointments
  - Returns empty array `[]` if pet does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `petId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters by `pet_id`
- Uses index on `pet_id` for efficient query (if index exists)
- Returns appointments in no specific order (sorting should be done in application layer)
- Returns all appointments regardless of status (no filtering)
- Used for pet medical history and service tracking

**Sorting and Filtering Rules:**
- No default sorting applied
- No filtering applied (returns all appointments for pet)
- Application layer may sort by `start_at` descending (most recent first)

**Related Use Cases:**
- Pet appointment history
- Pet medical record tracking

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`
   - Index on `store_id` for store filtering
   - Index on `start_at` for date range queries and conflict detection
   - Index on `staff_id` for staff calendar views
   - Consider composite indexes for common query patterns (e.g., `(store_id, start_at)`, `(staff_id, start_at)`)

2. **Query Optimization:**
   - Use efficient queries for conflict detection (overlap detection)
   - Optimize date range queries with proper indexes
   - Consider pagination for large result sets
   - Use EXISTS or COUNT for validation queries

3. **Conflict Detection Performance:**
   - Conflict detection must be fast (< 500ms per N1 requirement)
   - Use database-level locking or optimistic locking to prevent race conditions
   - Consider materialized views or caching for frequently accessed calendar data

### Data Integrity

1. **Foreign Key Constraints:**
   - `store_id` must reference existing store (enforced by database)
   - `customer_id` must reference existing customer (enforced by database)
   - `pet_id` must reference existing pet (enforced by database)
   - `staff_id` must reference existing user if provided (enforced by database)
   - `created_by` must reference existing user if provided (enforced by database)

2. **Time Range Validation:**
   - `end_at` must be > `start_at` (enforced in application layer)
   - Appointment times must be within store opening hours (validated in application layer)
   - Appointment times must be within staff working hours if staff assigned (validated in application layer)

3. **Status Transitions:**
   - Status transitions are validated in application layer
   - Valid transitions: booked → confirmed → checked_in → completed
   - Valid transitions: booked/confirmed/checked_in → cancelled
   - Valid transitions: any → needs-reschedule

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`, `update`) should be within transactions
- Conflict detection should be within the same transaction as appointment creation/update
- Multi-step operations (appointment creation with service lines) require transactions

### Concurrency Control

1. **Conflict Prevention:**
   - Conflict detection must be atomic
   - Use database-level locking (SELECT FOR UPDATE) or optimistic locking
   - Consider using advisory locks or application-level locking for critical sections

2. **Race Conditions:**
   - Multiple users may attempt to book the same slot simultaneously
   - Conflict detection and appointment creation must be atomic
   - Use database transactions with appropriate isolation level

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Conflict errors should be thrown when double-booking is detected

### Business Rules

1. **Double-Booking Prevention:**
   - Appointments cannot overlap for the same staff member
   - Appointments cannot overlap for the same store resources (if applicable)
   - Cancelled appointments do not block other appointments

2. **Recurring Appointments:**
   - Recurring appointments create distinct appointment instances
   - Each instance can be individually modified or cancelled
   - Recurrence ID links instances together

3. **Status Lifecycle:**
   - Appointments start as "booked"
   - Status transitions: booked → confirmed → checked_in → completed
   - Appointments can be cancelled from booked, confirmed, or checked_in status
   - Completed appointments cannot be modified

---

## Related Repositories

- **AppointmentServiceLineRepository:** For managing appointment service lines
- **StoreRepository:** For store validation and opening hours
- **CustomerRepository:** For customer validation
- **PetRepository:** For pet validation
- **UserRepository:** For staff validation and working hours
- **ServiceRepository:** For service validation
- **InventoryReservationRepository:** For inventory reservations linked to appointments
- **AuditLogRepository:** For logging appointment operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `findUpcomingAppointments(storeId: UUID, days: number): Promise<Appointment[]>` - Find upcoming appointments
- `findAppointmentsNeedingReminder(reminderHours: number): Promise<Appointment[]>` - Find appointments needing reminders
- `findNoShowAppointments(dateRange: DateRange): Promise<Appointment[]>` - Find no-show appointments
- `bulkUpdateStatus(appointmentIds: UUID[], status: string): Promise<void>` - Bulk status update
- `findAppointmentsByStatus(status: string, dateRange: DateRange): Promise<Appointment[]>` - Find by status and date range
- `getAppointmentStatistics(storeId: UUID, dateRange: DateRange): Promise<AppointmentStatistics>` - Get appointment statistics

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

