# Use Case UC-SVC-005: Cancel Appointment

## 1. Objective

Cancel a booked, confirmed, or checked-in appointment, changing its status to "cancelled". Cancellation releases inventory reservations (if any), records cancellation reason, and optionally marks as no-show. Cancelled appointments remain in the system for audit and history purposes.

## 2. Actors and Permissions

**Primary Actor:** Staff, Manager

**Secondary Actors:** None

**Required Permissions:**
- Role: `Staff`, `Manager`, or `Owner`
- Permission: `appointments:cancel`

**Authorization Rules:**
- `Staff` and `Manager` can cancel appointments
- System must validate role before allowing cancellation
- User must have access to the appointment's store

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Staff`, `Manager`, or `Owner` role assigned
3. Appointment with specified `id` exists
4. Appointment status is `booked`, `confirmed`, or `checked_in` (cannot cancel already completed or cancelled appointments)
5. System has available storage capacity for audit records

## 4. Postconditions

1. Appointment status is changed to `cancelled`
2. Inventory reservations are released (if appointment was confirmed)
3. Available stock is increased by reserved quantities (if reservations existed)
4. Cancellation reason is recorded (if provided)
5. No-show flag is set (if `mark_no_show=true`)
6. `updated_at` timestamp is updated
7. Audit log entry is created recording the cancellation action
8. Appointment remains in system for audit and history

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | Must exist, status="booked"/"confirmed"/"checked_in" | Appointment identifier |
| `reason` | String | No | Max 500 chars | Reason for cancellation |
| `mark_no_show` | Boolean | No | true/false | Mark as no-show (defaults to false) |

**Cancellation Reasons:**
- Common reasons: "Customer cancellation", "Staff unavailable", "Pet illness", "Weather", "No-show", "Other"

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Appointment identifier |
| `status` | String | Appointment status ("cancelled") |
| `cancelled_at` | DateTime | Cancellation timestamp |
| `cancelled_by` | UUID | User who cancelled the appointment |
| `reason` | String | Cancellation reason (nullable) |
| `no_show` | Boolean | No-show flag |
| `updated_at` | DateTime | Last update timestamp |

## 7. Main Flow

1. System receives request to cancel appointment with `id` and optional data
2. System validates user authentication and role (`Staff`, `Manager`, or `Owner`)
3. System loads appointment by `id`
4. System verifies appointment exists (return 404 if not found)
5. System verifies appointment status is `booked`, `confirmed`, or `checked_in` (cannot cancel completed or already cancelled)
6. System verifies user has access to appointment's store
7. System validates `reason` length if provided (max 500 chars)
8. System validates `mark_no_show` is boolean if provided
9. System begins database transaction
10. If appointment status is `confirmed` or `checked_in`:
    - System loads inventory reservations for this appointment
    - For each reservation:
      - System releases reservation (see UC-INV-010)
      - System increases available stock by reserved quantity
11. System updates appointment status to "cancelled"
12. System sets `reason` if provided
13. System sets `no_show` flag if `mark_no_show=true`
14. System sets `cancelled_at` to current timestamp (optional field)
15. System sets `cancelled_by` to current user ID (optional field)
16. System sets `updated_at` to current timestamp
17. System persists updated appointment record
18. System commits database transaction
19. System creates audit log entry with action `cancel`, entity_type `Appointment`, entity_id, reason, no_show flag, and performed_by
20. System returns cancelled appointment object

## 8. Alternative Flows

### 8.1. Appointment Not Found
- **Trigger:** Step 4 finds no appointment with given `id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Appointment not found"
  - Use case terminates

### 8.2. Appointment Not in Valid Status
- **Trigger:** Step 5 detects appointment status is "completed" or "cancelled"
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Cannot cancel completed or already cancelled appointments"
  - Use case terminates

### 8.3. User Lacks Store Access
- **Trigger:** Step 6 determines user cannot access appointment's store
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "You do not have access to this appointment's store"
  - Use case terminates

### 8.4. Reason Too Long
- **Trigger:** Step 7 detects reason exceeds 500 characters
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Reason cannot exceed 500 characters"
  - Use case terminates

### 8.5. Database Transaction Failure
- **Trigger:** Step 18 fails to commit transaction
- **Action:**
  - System rolls back database transaction
  - System returns error `500 Internal Server Error`
  - Error message: "An error occurred while cancelling appointment. Changes were rolled back"
  - Use case terminates

### 8.6. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Staff, Manager, or Owner role can cancel appointments"
  - Use case terminates

## 9. Business Rules

**BR1:** Only booked, confirmed, or checked-in appointments can be cancelled. Completed appointments cannot be cancelled (would require void/refund workflow).

**BR2:** Cancellation releases inventory reservations if appointment was confirmed. Available stock is increased by reserved quantities.

**BR3:** Cancellation reason is optional but recommended for audit and business intelligence.

**BR4:** No-show flag can be set to track customer no-shows. No-shows may affect future booking policies (business rule dependent).

**BR5:** All cancellation actions must be logged in audit logs for compliance and business intelligence.

**BR6:** Cancelled appointments remain in the system for audit and history. They cannot be deleted.

**BR7:** Cancellation does not automatically trigger refunds. Refunds must be processed separately in Financial module.

**BR8:** If appointment is part of a recurring series, cancellation affects only the specific instance (not the entire series).

**BR9:** Cancellation releases staff and resource availability immediately for other appointments.

**BR10:** Customer consent for reminders may affect cancellation notifications (business rule dependent).

## 10. Validation Rules

1. **Appointment Status Validation:**
   - Must be "booked", "confirmed", or "checked_in"
   - Cannot cancel completed or already cancelled appointments

2. **Store Access Validation:**
   - User must have access to appointment's store

3. **Reason Validation (if provided):**
   - Maximum 500 characters
   - Can be empty string (nullable)

4. **No-Show Validation (if provided):**
   - Must be boolean value (true/false)
   - Defaults to false if not provided

5. **User Authorization:**
   - Must have `Staff`, `Manager`, or `Owner` role
   - Permission check: `appointments:cancel`

6. **Reservation Release:**
   - Reservations are released if appointment was confirmed
   - Available stock is increased by reserved quantities

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_STATUS` | "Cannot cancel completed or already cancelled appointments" | Appointment not in valid status |
| 400 | `REASON_TOO_LONG` | "Reason cannot exceed 500 characters" | Reason too long |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Staff, Manager, or Owner role can cancel appointments" | User lacks required role |
| 403 | `STORE_ACCESS_DENIED` | "You do not have access to this appointment's store" | Store access denied |
| 404 | `APPOINTMENT_NOT_FOUND` | "Appointment not found" | Appointment does not exist |
| 500 | `TRANSACTION_FAILED` | "An error occurred while cancelling appointment" | Database transaction failed |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error |

## 12. Events Triggered

**Domain Events:**
- `AppointmentCancelled` event is published with payload:
  - `appointment_id` (UUID)
  - `store_id` (UUID)
  - `customer_id` (UUID)
  - `pet_id` (UUID)
  - `reason` (String, nullable)
  - `no_show` (Boolean)
  - `cancelled_by` (User ID)
  - `cancelled_at` (DateTime)
  - `timestamp` (DateTime)

- `InventoryReservationReleased` event is published for each released reservation (if applicable):
  - `reservation_id` (UUID)
  - `product_id` (UUID)
  - `quantity` (Integer)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Appointment", action="cancel", reason, no_show flag

**Integration Events:**
- None (cancellation is internal operation, but may trigger customer notifications in future)

## 13. Repository Methods Required

**AppointmentRepository Interface:**
- `findById(id: UUID): Promise<Appointment | null>` - Load existing appointment
- `update(appointment: Appointment): Promise<Appointment>` - Persist updated appointment

**InventoryReservationRepository Interface:**
- `findByAppointmentId(appointmentId: UUID): Promise<InventoryReservation[]>` - Load reservations
- `release(reservationId: UUID): Promise<void>` - Release reservation

**AvailabilityService Interface:**
- `releaseReservation(productId: UUID, quantity: Integer): Promise<void>` - Release reserved stock

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user
- `hasStoreAccess(userId: UUID, storeId: UUID): Promise<boolean>` - Check store access

## 14. Notes or Limitations

1. **Reservation Release:** Cancellation releases inventory reservations if appointment was confirmed. Available stock is increased immediately.

2. **No-Show Tracking:** No-show flag enables tracking of customer no-shows. Consider business rules for no-show policies.

3. **Transaction Safety:** Cancellation involves multiple operations (appointment update + reservation release). Use database transactions to ensure atomicity.

4. **Performance:** Cancellation must respond within reasonable time. Optimize reservation release operations.

5. **Future Enhancements:** Consider adding:
   - Cancellation notifications to customer
   - Cancellation fees (business rule dependent)
   - Cancellation reason codes
   - Bulk cancellation
   - Cancellation impact analysis

6. **Business Rule Dependencies:** Appointment cancellation depends on:
   - Appointment creation (UC-SVC-002)
   - Inventory module for reservation release

7. **Error Recovery:** If cancellation fails, ensure proper rollback of reservation releases and appointment status.

8. **Audit Trail:** All cancellation actions must be logged for compliance and business intelligence.

9. **Refunds:** Cancellation does not automatically trigger refunds. Refunds must be processed separately in Financial module.

10. **Recurring Appointments:** Cancellation affects only the specific appointment instance, not the entire recurring series.

