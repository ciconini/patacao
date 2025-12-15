# Appointment Domain Entity

## Entity Description

The `Appointment` entity represents a scheduled appointment for a pet service in the petshop management system. This entity represents the booking of services between customers, their pets, and staff members at a specific store location.

**Key Characteristics:**
- Pure domain entity with no framework dependencies
- Encapsulates business rules and invariants
- Represents scheduled appointments with status lifecycle
- Supports recurring appointments via recurrence groups
- Tracks staff assignments and appointment notes
- Validates time ranges and duration

## Properties

### Required Properties
- **`id`** (string, UUID): Unique identifier for the appointment
- **`storeId`** (string, UUID): Reference to the Store entity (invariant: must exist)
- **`customerId`** (string, UUID): Reference to the Customer entity (invariant: must exist)
- **`petId`** (string, UUID): Reference to the Pet entity (invariant: must exist)
- **`startAt`** (Date): Appointment start date and time
- **`endAt`** (Date): Appointment end date and time
- **`status`** (AppointmentStatus): Current appointment status (default BOOKED)

### Optional Properties
- **`createdBy`** (string, UUID): User ID who created the appointment
- **`staffId`** (string, UUID): User ID of assigned staff member
- **`notes`** (string): Additional notes about the appointment
- **`recurrenceId`** (string): Recurrence group identifier for recurring appointments

### Metadata Properties
- **`createdAt`** (Date): Timestamp when the appointment was created
- **`updatedAt`** (Date): Timestamp of the last update

### AppointmentStatus Enum
```typescript
enum AppointmentStatus {
  BOOKED = 'booked',              // Initial booking
  CONFIRMED = 'confirmed',        // Confirmed by staff/customer
  CHECKED_IN = 'checked_in',      // Customer/pet has arrived
  COMPLETED = 'completed',        // Service completed
  CANCELLED = 'cancelled',        // Appointment cancelled
  NEEDS_RESCHEDULE = 'needs-reschedule' // Needs to be rescheduled
}
```

## Constructor Rules

### Required Parameters
1. **`id`**: Must be a non-empty string (UUID format recommended)
2. **`storeId`**: Must be a non-empty string - **invariant**: Appointment must be linked to a Store
3. **`customerId`**: Must be a non-empty string - **invariant**: Appointment must be linked to a Customer
4. **`petId`**: Must be a non-empty string - **invariant**: Appointment must be linked to a Pet
5. **`startAt`**: Must be a valid Date, must be before `endAt`
6. **`endAt`**: Must be a valid Date, must be after `startAt`

### Optional Parameters
- All other properties are optional and can be set later via behavior methods
- **`status`**: Defaults to BOOKED

### Validation Rules
- **ID Validation**: Throws error if `id` is empty or null
- **Store ID Validation**: Throws error if `storeId` is empty or null
- **Customer ID Validation**: Throws error if `customerId` is empty or null
- **Pet ID Validation**: Throws error if `petId` is empty or null
- **Time Range Validation**: 
  - Start time must be before end time
  - Duration must be greater than zero
- **Status Transitions**: Status changes must follow valid transitions

### Example Constructor Usage
```typescript
// Minimal required fields
const appointment = new Appointment(
  'uuid-123',
  'store-uuid-456',
  'customer-uuid-789',
  'pet-uuid-012',
  new Date('2024-12-20T10:00:00Z'),
  new Date('2024-12-20T11:00:00Z')
);

// Full constructor
const appointment = new Appointment(
  'uuid-123',
  'store-uuid-456',
  'customer-uuid-789',
  'pet-uuid-012',
  new Date('2024-12-20T10:00:00Z'),
  new Date('2024-12-20T11:00:00Z'),
  AppointmentStatus.BOOKED,
  'user-uuid-345',
  'staff-uuid-678',
  'Regular grooming appointment',
  'recurrence-uuid-901',
  new Date('2024-12-15T09:00:00Z'),
  new Date('2024-12-15T09:00:00Z')
);
```

## Methods

### Getters (Read-Only Access)
All properties are accessed through getters that return copies to maintain encapsulation.

### Behavior Methods

#### Scheduling
- **`reschedule(startAt: Date, endAt: Date)`**: Updates both start and end times (validates range)
- **`updateStartTime(startAt: Date)`**: Updates start time, keeping same duration
- **`updateEndTime(endAt: Date)`**: Updates end time (validates after start time)

#### Status Management
- **`confirm()`**: Confirms the appointment (BOOKED → CONFIRMED)
- **`checkIn()`**: Marks appointment as checked in (CONFIRMED/BOOKED → CHECKED_IN)
- **`complete()`**: Marks appointment as completed (CHECKED_IN/CONFIRMED → COMPLETED)
- **`cancel()`**: Cancels the appointment (cannot cancel COMPLETED)
- **`markNeedsReschedule()`**: Marks appointment as needing reschedule

#### Staff Assignment
- **`assignStaff(staffId: string)`**: Assigns a staff member to the appointment
- **`unassignStaff()`**: Removes staff assignment
- **`hasAssignedStaff()`**: Checks if staff is assigned

#### Notes and Recurrence
- **`updateNotes(notes: string | undefined)`**: Updates appointment notes
- **`linkToRecurrence(recurrenceId: string)`**: Links appointment to recurrence group
- **`unlinkFromRecurrence()`**: Removes recurrence link
- **`isRecurring()`**: Checks if appointment is part of a recurrence group

#### Calculations
- **`getDurationMinutes()`**: Returns duration in minutes
- **`getDurationHours()`**: Returns duration in hours (decimal)

#### Status Checks
- **`isPast(referenceDate?: Date)`**: Checks if appointment is in the past
- **`isFuture(referenceDate?: Date)`**: Checks if appointment is in the future
- **`isOngoing(referenceDate?: Date)`**: Checks if appointment is currently ongoing
- **`canBeModified()`**: Checks if appointment can be modified
- **`canBeCancelled()`**: Checks if appointment can be cancelled
- **`isActive()`**: Checks if appointment is active (not cancelled or completed)

#### Conflict Detection
- **`overlapsWith(other: Appointment)`**: Checks if two appointments overlap in time
  - Returns true if same store and same staff (if both assigned) and times overlap

## Invariants

### Core Invariants (Always Enforced)
1. **Store Linkage**: An Appointment **must** be linked to a Store (`storeId` cannot be empty)
   - Enforced in constructor
   - Cannot be changed after creation (immutable property)

2. **Customer Linkage**: An Appointment **must** be linked to a Customer (`customerId` cannot be empty)
   - Enforced in constructor
   - Cannot be changed after creation (immutable property)

3. **Pet Linkage**: An Appointment **must** be linked to a Pet (`petId` cannot be empty)
   - Enforced in constructor
   - Cannot be changed after creation (immutable property)

4. **Time Range**: Start time **must** be before end time
   - Enforced in constructor and all time update methods
   - Duration must be greater than zero

5. **Status Transitions**: Status changes must follow valid transitions:
   - BOOKED → CONFIRMED, CHECKED_IN, CANCELLED, NEEDS_RESCHEDULE
   - CONFIRMED → CHECKED_IN, CANCELLED, NEEDS_RESCHEDULE
   - CHECKED_IN → COMPLETED, CANCELLED
   - Cannot transition from COMPLETED or CANCELLED to other states

### Business Rules
1. **Store Opening Hours**: Appointment should fall within Store opening hours (enforced at use case/domain service level)
2. **Staff Working Hours**: If staff is assigned, appointment should fall within staff working hours (enforced at use case/domain service level)
3. **Double-Booking Prevention**: Double-booking is prevented at repository/use case level by checking overlaps
4. **Recurring Appointments**: Recurring appointments are linked via `recurrenceId` but are distinct instances
5. **Modification Restrictions**: Completed and cancelled appointments cannot be modified

## Example Lifecycle

### 1. Appointment Booking
**Scenario**: A customer books an appointment for their pet.

```
1. Appointment entity is instantiated:
   - id: "appt-001"
   - storeId: "store-001"
   - customerId: "customer-001"
   - petId: "pet-001"
   - startAt: 2024-12-20T10:00:00Z
   - endAt: 2024-12-20T11:00:00Z
   - status: BOOKED
   - createdBy: "user-001"
   - createdAt: 2024-12-15T09:00:00Z
   - updatedAt: 2024-12-15T09:00:00Z

2. Entity validates:
   ✓ storeId is not empty
   ✓ customerId is not empty
   ✓ petId is not empty
   ✓ startAt is before endAt
   ✓ duration is greater than zero
```

### 2. Confirmation
**Scenario**: Staff confirms the appointment.

```
1. confirm()
   → status: CONFIRMED
   → updatedAt: 2024-12-16T10:00:00Z
```

### 3. Staff Assignment
**Scenario**: A staff member is assigned to the appointment.

```
1. assignStaff("staff-001")
   → staffId: "staff-001"
   → updatedAt: 2024-12-16T11:00:00Z

2. hasAssignedStaff() → true
```

### 4. Check-In
**Scenario**: Customer arrives with their pet for the appointment.

```
1. checkIn()
   → status: CHECKED_IN
   → updatedAt: 2024-12-20T10:05:00Z
```

### 5. Completion
**Scenario**: Service is completed.

```
1. complete()
   → status: COMPLETED
   → updatedAt: 2024-12-20T11:00:00Z

2. canBeModified() → false
3. canBeCancelled() → false
```

### 6. Rescheduling
**Scenario**: Appointment needs to be moved to a different time.

```
1. reschedule(
     new Date('2024-12-21T14:00:00Z'),
     new Date('2024-12-21T15:00:00Z')
   )
   → startAt: 2024-12-21T14:00:00Z
   → endAt: 2024-12-21T15:00:00Z
   → updatedAt: 2024-12-18T09:00:00Z

2. getDurationMinutes() → 60
3. getDurationHours() → 1.0
```

### 7. Recurring Appointment
**Scenario**: Customer books a recurring weekly appointment.

```
1. linkToRecurrence("recurrence-001")
   → recurrenceId: "recurrence-001"
   → updatedAt: 2024-12-15T09:30:00Z

2. isRecurring() → true
```

### 8. Cancellation
**Scenario**: Customer cancels the appointment.

```
1. cancel()
   → status: CANCELLED
   → updatedAt: 2024-12-19T15:00:00Z

2. isActive() → false
3. canBeModified() → false
```

### 9. Time Status Checks
**Scenario**: System checks appointment status relative to current time.

```
1. Current time: 2024-12-20T09:00:00Z
   isFuture() → true
   isPast() → false
   isOngoing() → false

2. Current time: 2024-12-20T10:30:00Z
   isFuture() → false
   isPast() → false
   isOngoing() → true

3. Current time: 2024-12-20T12:00:00Z
   isFuture() → false
   isPast() → true
   isOngoing() → false
```

### 10. Overlap Detection
**Scenario**: System checks if two appointments conflict.

```
1. Appointment A: store-001, staff-001, 10:00-11:00
2. Appointment B: store-001, staff-001, 10:30-11:30
3. A.overlapsWith(B) → true (same store, same staff, times overlap)

4. Appointment C: store-001, staff-002, 10:00-11:00
5. A.overlapsWith(C) → false (different staff)

6. Appointment D: store-002, staff-001, 10:00-11:00
7. A.overlapsWith(D) → false (different store)
```

### 11. Error Scenarios
**Scenario**: Attempting invalid operations.

```
1. new Appointment("", "store-001", "customer-001", "pet-001", start, end)
   → Error: "Appointment ID is required"

2. new Appointment("appt-001", "", "customer-001", "pet-001", start, end)
   → Error: "Store ID is required - an Appointment must be linked to a Store"

3. new Appointment("appt-001", "store-001", "customer-001", "pet-001", end, start)
   → Error: "Appointment start time must be before end time"

4. complete() on BOOKED status
   → Error: "Cannot complete appointment with status: booked"

5. cancel() on COMPLETED status
   → Error: "Cannot cancel a completed appointment"

6. reschedule() on COMPLETED status
   → Error: (via canBeModified check) - cannot modify completed appointment
```

## Design Decisions

1. **Immutable Identity**: `id`, `storeId`, `customerId`, and `petId` are immutable to maintain referential integrity
2. **Encapsulation**: All properties are private with getters returning copies to prevent external mutation
3. **Validation at Boundaries**: All validation happens in constructor and update methods
4. **Status Lifecycle**: Status enum with controlled transitions ensures valid state changes
5. **Time Management**: Start and end times are always validated together to ensure consistency
6. **Duration Calculation**: Duration is calculated, not stored, to ensure accuracy
7. **Recurrence Support**: Recurring appointments are linked but remain distinct instances
8. **Staff Assignment**: Optional staff assignment supports flexible scheduling
9. **Overlap Detection**: Entity-level overlap detection for same store/staff combinations
10. **Modification Restrictions**: Completed and cancelled appointments cannot be modified
11. **Timestamp Management**: Automatic `updatedAt` tracking on every modification

## Usage Notes

- This entity is framework-agnostic and can be used in any context
- Repository implementations should handle persistence concerns
- Double-booking prevention should be enforced at repository/use case level using `overlapsWith()` method
- Store opening hours and staff working hours validation should be done at domain service/use case level
- Status transitions are enforced at entity level, but business rules about when transitions can occur may be at use case level
- Recurring appointments are created as separate instances linked via `recurrenceId`
- Domain events can be published when significant state changes occur (outside entity scope)

