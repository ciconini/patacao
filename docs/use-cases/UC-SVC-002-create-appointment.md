# Use Case UC-SVC-002: Create Appointment

## 1. Objective

Create a new appointment for a customer's pet with one or more services, assigned staff (optional), and scheduled time. Appointment creation validates store opening hours, staff availability, and prevents double-booking conflicts. Supports recurring appointments and inventory reservation for services that consume stock.

## 2. Actors and Permissions

**Primary Actor:** Staff, Manager

**Secondary Actors:** None

**Required Permissions:**
- Role: `Staff`, `Manager`, or `Owner`
- Permission: `appointments:create`

**Authorization Rules:**
- `Staff` and `Manager` can create appointments
- System must validate role before allowing appointment creation
- User must have access to the store where appointment is created

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Staff`, `Manager`, or `Owner` role assigned
3. Store with specified `store_id` exists
4. Customer with specified `customer_id` exists and is not archived
5. Pet with specified `pet_id` exists and belongs to customer
6. Services referenced in `services` array exist
7. Staff with specified `staff_id` exists and is assigned to store (if provided)
8. System has available storage capacity for new records

## 4. Postconditions

1. A new `Appointment` entity is created with status `booked`
2. Appointment record is persisted in the `appointments` table
3. Appointment service lines are created in `appointment_service_lines` table
4. Appointment is scheduled within store opening hours and staff working hours (if staff assigned)
5. No double-booking conflicts exist
6. Inventory reservations are created for services that consume inventory (if appointment confirmed)
7. `created_at` timestamp is set to current server time
8. Audit log entry is created recording the creation action
9. Appointment is ready for confirmation, check-in, or completion

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `store_id` | UUID | Yes | Must exist | Store identifier |
| `customer_id` | UUID | Yes | Must exist | Customer identifier |
| `pet_id` | UUID | Yes | Must exist | Pet identifier |
| `start_at` | DateTime | Yes | Valid datetime, not past | Appointment start time |
| `end_at` | DateTime | Yes | Valid datetime, > start_at | Appointment end time |
| `staff_id` | UUID | No | Must exist, assigned to store | Assigned staff member |
| `services` | Array[Object] | Yes | Min 1 service | Array of services for appointment |
| `notes` | String | No | Max 2000 chars | Appointment notes |
| `recurrence` | Object | No | Valid recurrence pattern | Recurrence configuration (optional) |

**Service Line Structure:**
```json
{
  "service_id": "UUID",
  "quantity": 1,
  "price_override": 25.00
}
```

**Service Line Fields:**
- `service_id` (UUID, required): Service identifier (must exist)
- `quantity` (Integer, required): Quantity (default 1, min 1)
- `price_override` (Decimal, optional): Override service price (>= 0)

**Recurrence Structure (optional):**
```json
{
  "pattern": "daily" | "weekly" | "custom",
  "interval": 1,
  "end_date": "2025-12-31",
  "count": 10
}
```

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier for the created appointment |
| `store_id` | UUID | Store identifier |
| `customer_id` | UUID | Customer identifier |
| `pet_id` | UUID | Pet identifier |
| `start_at` | DateTime | Appointment start time |
| `end_at` | DateTime | Appointment end time |
| `status` | String | Appointment status ("booked") |
| `staff_id` | UUID | Assigned staff (nullable) |
| `services` | Array[Object] | Appointment service lines |
| `notes` | String | Appointment notes (nullable) |
| `recurrence_id` | UUID | Recurrence group identifier (nullable) |
| `created_by` | UUID | User who created the appointment |
| `created_at` | DateTime | Creation timestamp (ISO 8601) |
| `updated_at` | DateTime | Last update timestamp (ISO 8601) |

## 7. Main Flow

1. System receives request to create appointment with input data
2. System validates user authentication and role (`Staff`, `Manager`, or `Owner`)
3. System validates required fields are present (`store_id`, `customer_id`, `pet_id`, `start_at`, `end_at`, `services`)
4. System validates `services` array contains at least one item
5. System loads store by `store_id` to verify existence and opening hours
6. System verifies user has access to the store
7. System loads customer by `customer_id` to verify existence and not archived
8. System loads pet by `pet_id` to verify existence and customer ownership
9. System validates pet belongs to customer
10. For each service in `services`:
    - System validates `service_id` exists
    - System validates `quantity` > 0 (defaults to 1)
    - System validates `price_override` >= 0 if provided
11. System validates `start_at` is not in the past
12. System validates `end_at` > `start_at`
13. System calculates total duration from services (sum of service durations * quantities)
14. System validates appointment duration matches `end_at - start_at` (with tolerance, business rule dependent)
15. System validates appointment time is within store opening hours
16. If `staff_id` provided:
    - System validates staff exists and is assigned to store
    - System validates appointment time is within staff working hours
    - System checks for staff double-booking conflicts
17. System checks for store-level conflicts (overlapping appointments, resource conflicts)
18. If recurrence provided:
    - System validates recurrence pattern
    - System creates recurrence group
    - System creates multiple appointment instances (one per occurrence)
19. System begins database transaction
20. System generates UUID for appointment `id`
21. System sets `status` to "booked"
22. System sets `created_by` to current user ID
23. System sets `created_at` and `updated_at` to current timestamp
24. System persists appointment record
25. System persists appointment service line records
26. System commits database transaction
27. System creates audit log entry with action `create`, entity_type `Appointment`, entity_id, and performed_by
28. System returns created appointment object

## 8. Alternative Flows

### 8.1. Store Not Found
- **Trigger:** Step 5 finds no store with given `store_id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Store not found"
  - Use case terminates

### 8.2. User Lacks Store Access
- **Trigger:** Step 6 determines user cannot access the store
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "You do not have access to this store"
  - Use case terminates

### 8.3. Customer Not Found
- **Trigger:** Step 7 finds no customer with given `customer_id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Customer not found"
  - Use case terminates

### 8.4. Customer Archived
- **Trigger:** Step 7 detects customer is archived
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Cannot create appointment for archived customer"
  - Use case terminates

### 8.5. Pet Not Found
- **Trigger:** Step 8 finds no pet with given `pet_id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Pet not found"
  - Use case terminates

### 8.6. Pet Not Belonging to Customer
- **Trigger:** Step 9 detects pet does not belong to customer
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Pet does not belong to the specified customer"
  - Use case terminates

### 8.7. Service Not Found
- **Trigger:** Step 10 detects service does not exist
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Service with ID [id] not found"
  - Use case terminates

### 8.8. Invalid Time Range
- **Trigger:** Step 12 detects `end_at` <= `start_at`
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "End time must be after start time"
  - Use case terminates

### 8.9. Start Time in Past
- **Trigger:** Step 11 detects `start_at` is in the past
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Appointment start time cannot be in the past"
  - Use case terminates

### 8.10. Outside Store Opening Hours
- **Trigger:** Step 15 detects appointment time outside store opening hours
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Appointment must be scheduled within store opening hours"
  - Use case terminates

### 8.11. Outside Staff Working Hours
- **Trigger:** Step 16 detects appointment time outside staff working hours
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Appointment must be scheduled within staff working hours"
  - Use case terminates

### 8.12. Double-Booking Conflict
- **Trigger:** Step 16 or 17 detects staff or resource double-booking
- **Action:**
  - System returns error `409 Conflict`
  - Error message: "Appointment conflicts with existing appointment. Staff/resource is already booked"
  - Use case terminates

### 8.13. Invalid Recurrence Pattern
- **Trigger:** Step 18 detects invalid recurrence pattern
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Invalid recurrence pattern"
  - Use case terminates

### 8.14. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Staff, Manager, or Owner role can create appointments"
  - Use case terminates

## 9. Business Rules

**BR1:** Appointments must be scheduled within store opening hours. System validates time against store's weekly schedule.

**BR2:** If staff is assigned, appointment must be within staff working hours. Staff schedules cannot place staff outside their working hours.

**BR3:** Double-booking is prevented. System checks for overlapping appointments for the same staff or required resources.

**BR4:** Appointment duration should match sum of service durations (with tolerance). `end_at - start_at` should accommodate all services.

**BR5:** Recurring appointments create distinct appointment instances linked via `recurrence_id`. Each instance can be individually modified or cancelled.

**BR6:** Inventory reservations are created at appointment confirmation (not at booking). See UC-SVC-004.

**BR7:** Pet must belong to the specified customer. System validates customer-pet relationship.

**BR8:** All appointment creation actions must be logged in audit logs for compliance.

**BR9:** Appointment status starts as "booked". Confirmation, check-in, and completion are separate operations.

**BR10:** Price calculation sums service lines using `price_override` when present, otherwise service price.

## 10. Validation Rules

1. **Store Validation:**
   - Must exist in `stores` table
   - User must have access to store
   - Opening hours must be defined

2. **Customer Validation:**
   - Must exist in `customers` table
   - Must not be archived

3. **Pet Validation:**
   - Must exist in `pets` table
   - Must belong to specified customer

4. **Service Validation:**
   - Minimum 1 service required
   - Each service must exist
   - Quantity must be > 0 (defaults to 1)
   - Price override must be >= 0 if provided

5. **Time Validation:**
   - `start_at`: Must be valid datetime, not in past
   - `end_at`: Must be valid datetime, > start_at
   - Appointment must be within store opening hours
   - If staff assigned: must be within staff working hours

6. **Staff Validation (if provided):**
   - Must exist in `users` table
   - Must be assigned to store
   - Must not have conflicting appointments

7. **Conflict Validation:**
   - No overlapping appointments for same staff
   - No overlapping appointments for same required resources
   - Use optimistic locking or database-level locking

8. **Recurrence Validation (if provided):**
   - Pattern must be valid: "daily", "weekly", or "custom"
   - Interval must be > 0
   - End date or count must be provided

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `MISSING_REQUIRED_FIELD` | "Required field [field] is missing" | Required field not provided |
| 400 | `INVALID_TIME_RANGE` | "End time must be after start time" | Invalid time range |
| 400 | `START_TIME_IN_PAST` | "Appointment start time cannot be in the past" | Start time is past |
| 400 | `OUTSIDE_OPENING_HOURS` | "Appointment must be scheduled within store opening hours" | Time outside hours |
| 400 | `OUTSIDE_STAFF_HOURS` | "Appointment must be scheduled within staff working hours" | Time outside hours |
| 400 | `PET_NOT_BELONGS_TO_CUSTOMER` | "Pet does not belong to the specified customer" | Customer-pet mismatch |
| 400 | `CUSTOMER_ARCHIVED` | "Cannot create appointment for archived customer" | Customer archived |
| 400 | `INVALID_RECURRENCE` | "Invalid recurrence pattern" | Recurrence invalid |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Staff, Manager, or Owner role can create appointments" | User lacks role |
| 403 | `STORE_ACCESS_DENIED` | "You do not have access to this store" | Store access denied |
| 404 | `STORE_NOT_FOUND` | "Store not found" | Store does not exist |
| 404 | `CUSTOMER_NOT_FOUND` | "Customer not found" | Customer does not exist |
| 404 | `PET_NOT_FOUND` | "Pet not found" | Pet does not exist |
| 404 | `SERVICE_NOT_FOUND` | "Service with ID [id] not found" | Service does not exist |
| 404 | `STAFF_NOT_FOUND` | "Staff with ID [id] not found" | Staff does not exist |
| 409 | `DOUBLE_BOOKING_CONFLICT` | "Appointment conflicts with existing appointment" | Staff/resource conflict |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error |

## 12. Events Triggered

**Domain Events:**
- `AppointmentCreated` event is published with payload:
  - `appointment_id` (UUID)
  - `store_id` (UUID)
  - `customer_id` (UUID)
  - `pet_id` (UUID)
  - `start_at` (DateTime)
  - `end_at` (DateTime)
  - `status` (String: "booked")
  - `staff_id` (UUID, nullable)
  - `created_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Appointment", action="create"

**Integration Events:**
- None (appointment creation is internal operation, but may trigger reminder scheduling in future)

## 13. Repository Methods Required

**AppointmentRepository Interface:**
- `save(appointment: Appointment): Promise<Appointment>` - Persist new appointment entity
- `findConflicts(storeId: UUID, staffId: UUID | null, startAt: DateTime, endAt: DateTime, excludeId?: UUID): Promise<Appointment[]>` - Check for conflicts
- `findByRecurrenceId(recurrenceId: UUID): Promise<Appointment[]>` - Find recurring appointments

**AppointmentServiceLineRepository Interface:**
- `saveLines(appointmentId: UUID, lines: AppointmentServiceLine[]): Promise<AppointmentServiceLine[]>` - Persist service lines

**StoreRepository Interface:**
- `findById(id: UUID): Promise<Store | null>` - Verify store exists and get opening hours
- `isWithinOpeningHours(storeId: UUID, datetime: DateTime): Promise<boolean>` - Check opening hours

**CustomerRepository Interface:**
- `findById(id: UUID): Promise<Customer | null>` - Verify customer exists

**PetRepository Interface:**
- `findById(id: UUID): Promise<Pet | null>` - Verify pet exists
- `belongsToCustomer(petId: UUID, customerId: UUID): Promise<boolean>` - Verify customer-pet relationship

**ServiceRepository Interface:**
- `findById(id: UUID): Promise<Service | null>` - Verify service exists

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Verify staff exists
- `isAssignedToStore(userId: UUID, storeId: UUID): Promise<boolean>` - Verify staff-store assignment
- `isWithinWorkingHours(userId: UUID, datetime: DateTime): Promise<boolean>` - Check working hours

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

## 14. Notes or Limitations

1. **Conflict Detection:** Double-booking detection must be atomic. Use database transactions and optimistic locking to prevent race conditions.

2. **Recurring Appointments:** Recurring appointments create multiple appointment instances. Each instance is independent and can be modified separately.

3. **Inventory Reservation:** Inventory reservations are created at appointment confirmation (not at booking). See UC-SVC-004.

4. **Time Validation:** Appointment times must account for timezone (Europe/Lisbon). All times stored in UTC.

5. **Performance:** Appointment creation must respond within 500ms (N1 requirement). Optimize conflict detection queries with proper indexes.

6. **Concurrency:** Multiple users may attempt to book the same slot. Use optimistic locking or database-level locking to prevent conflicts.

7. **Future Enhancements:** Consider adding:
   - Automatic staff assignment based on skills and availability
   - Resource conflict detection (rooms, equipment)
   - Appointment templates
   - Waitlist functionality
   - Appointment reminders (triggered separately)

8. **Business Rule Dependencies:** Appointment creation depends on:
   - Administrative module for store/customer/pet data
   - Users module for staff data and working hours
   - Services module for service data

9. **Transaction Safety:** Appointment creation involves multiple table inserts. Use database transactions to ensure atomicity.

10. **Error Handling:** Provide detailed error messages for validation failures, especially for conflict detection, to enable quick resolution.

