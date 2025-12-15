# Use Case UC-SVC-003: Confirm Appointment

## 1. Objective

Confirm a booked appointment, changing its status from "booked" to "confirmed". Confirmation triggers inventory reservations for services that consume inventory items. Confirmed appointments are committed and ready for check-in.

## 2. Actors and Permissions

**Primary Actor:** Staff, Manager

**Secondary Actors:** None

**Required Permissions:**
- Role: `Staff`, `Manager`, or `Owner`
- Permission: `appointments:confirm`

**Authorization Rules:**
- `Staff` and `Manager` can confirm appointments
- System must validate role before allowing confirmation
- User must have access to the appointment's store

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Staff`, `Manager`, or `Owner` role assigned
3. Appointment with specified `id` exists
4. Appointment status is `booked` (cannot confirm already confirmed, completed, or cancelled appointments)
5. Services in appointment that consume inventory have sufficient available stock (unless Manager override)
6. System has available storage capacity for inventory reservations

## 4. Postconditions

1. Appointment status is changed from `booked` to `confirmed`
2. Inventory reservations are created for services that consume inventory (if `consumes_inventory=true`)
3. Available stock is reduced by reserved quantities
4. `updated_at` timestamp is updated
5. Audit log entry is created recording the confirmation action
6. Appointment is ready for check-in or completion

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | Must exist, status="booked" | Appointment identifier |

**Note:** No additional input fields required. System confirms the appointment identified by `id`.

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Appointment identifier |
| `status` | String | Appointment status ("confirmed") |
| `confirmed_at` | DateTime | Confirmation timestamp |
| `confirmed_by` | UUID | User who confirmed the appointment |
| `inventory_reservations` | Array[Object] | Created inventory reservations (if any) |
| `updated_at` | DateTime | Last update timestamp |

## 7. Main Flow

1. System receives request to confirm appointment with `id`
2. System validates user authentication and role (`Staff`, `Manager`, or `Owner`)
3. System loads appointment by `id`
4. System verifies appointment exists (return 404 if not found)
5. System verifies appointment status is `booked` (cannot confirm already confirmed/completed/cancelled)
6. System verifies user has access to appointment's store
7. System loads appointment service lines
8. For each service line:
   - System loads service to check if `consumes_inventory` is true
   - If `consumes_inventory` is true:
     - System loads `consumed_items` from service
     - For each consumed item:
       - System checks available stock for product
       - System validates stock is sufficient (available >= quantity * service line quantity)
       - If insufficient stock and user is Staff: block confirmation
       - If insufficient stock and user is Manager/Owner: allow override (business rule flag)
9. System begins database transaction
10. For each service that consumes inventory:
    - For each consumed item:
      - System creates inventory reservation:
        - `product_id`: Product ID
        - `quantity`: consumed_item.quantity * service_line.quantity
        - `reserved_for_id`: Appointment ID
        - `reserved_for_type`: "appointment"
        - `expires_at`: Appointment end_at + buffer (optional)
11. System updates appointment status to "confirmed"
12. System sets `confirmed_at` to current timestamp (optional field)
13. System sets `confirmed_by` to current user ID (optional field)
14. System sets `updated_at` to current timestamp
15. System persists updated appointment record
16. System commits database transaction
17. System creates audit log entry with action `confirm`, entity_type `Appointment`, entity_id, and performed_by
18. System returns confirmed appointment object with inventory reservations

## 8. Alternative Flows

### 8.1. Appointment Not Found
- **Trigger:** Step 4 finds no appointment with given `id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Appointment not found"
  - Use case terminates

### 8.2. Appointment Not in Booked Status
- **Trigger:** Step 5 detects appointment status is not "booked"
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Only booked appointments can be confirmed"
  - Use case terminates

### 8.3. User Lacks Store Access
- **Trigger:** Step 6 determines user cannot access appointment's store
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "You do not have access to this appointment's store"
  - Use case terminates

### 8.4. Insufficient Stock (Staff)
- **Trigger:** Step 8 detects insufficient stock and user is Staff
- **Action:**
  - System returns error `409 Conflict`
  - Error message: "Insufficient stock for service [service_name]. Available: [available], Required: [required]"
  - Use case terminates

### 8.5. Insufficient Stock (Manager Override)
- **Trigger:** Step 8 detects insufficient stock and user is Manager/Owner
- **Action:**
  - System allows override (business rule dependent)
  - System creates reservations with override flag
  - Use case continues

### 8.6. Product Not Found
- **Trigger:** Step 8 detects consumed product does not exist
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Product with ID [id] not found"
  - Use case terminates

### 8.7. Database Transaction Failure
- **Trigger:** Step 16 fails to commit transaction
- **Action:**
  - System rolls back database transaction
  - System returns error `500 Internal Server Error`
  - Error message: "An error occurred while confirming appointment. Changes were rolled back"
  - Use case terminates

### 8.8. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Staff, Manager, or Owner role can confirm appointments"
  - Use case terminates

## 9. Business Rules

**BR1:** Only booked appointments can be confirmed. Confirmed, completed, or cancelled appointments cannot be confirmed again.

**BR2:** Confirmation triggers inventory reservations for services that consume inventory. Reservations reduce available stock but not on-hand stock.

**BR3:** If available stock is insufficient, Staff cannot confirm. Manager/Owner can override insufficient stock (business rule dependent).

**BR4:** Inventory reservations are linked to the appointment. Reservations are released if appointment is cancelled.

**BR5:** Reservation quantity = consumed_item.quantity * service_line.quantity (for each service line).

**BR6:** All confirmation actions must be logged in audit logs for compliance.

**BR7:** Confirmed appointments are committed and ready for check-in. Status change is irreversible without cancellation.

**BR8:** Reservation expiry can be set to appointment end time + buffer (optional, business rule dependent).

## 10. Validation Rules

1. **Appointment Status Validation:**
   - Must be "booked"
   - Cannot confirm already confirmed, completed, or cancelled appointments

2. **Store Access Validation:**
   - User must have access to appointment's store

3. **Inventory Stock Validation:**
   - For each service with `consumes_inventory=true`:
     - For each consumed item:
       - Available stock >= (consumed_item.quantity * service_line.quantity)
       - Stock check must be atomic (prevent race conditions)

4. **User Authorization:**
   - Must have `Staff`, `Manager`, or `Owner` role
   - Permission check: `appointments:confirm`

5. **Reservation Creation:**
   - `product_id`: Must exist
   - `quantity`: Calculated from consumed items and service line quantity
   - `reserved_for_id`: Appointment ID
   - `reserved_for_type`: "appointment"
   - `expires_at`: Optional, can be appointment end time + buffer

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_STATUS` | "Only booked appointments can be confirmed" | Appointment not in booked status |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Staff, Manager, or Owner role can confirm appointments" | User lacks required role |
| 403 | `STORE_ACCESS_DENIED` | "You do not have access to this appointment's store" | Store access denied |
| 404 | `APPOINTMENT_NOT_FOUND` | "Appointment not found" | Appointment does not exist |
| 404 | `PRODUCT_NOT_FOUND` | "Product with ID [id] not found" | Product does not exist |
| 409 | `INSUFFICIENT_STOCK` | "Insufficient stock for service" | Not enough available stock (Staff) |
| 500 | `TRANSACTION_FAILED` | "An error occurred while confirming appointment" | Database transaction failed |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error |

## 12. Events Triggered

**Domain Events:**
- `AppointmentConfirmed` event is published with payload:
  - `appointment_id` (UUID)
  - `store_id` (UUID)
  - `customer_id` (UUID)
  - `pet_id` (UUID)
  - `confirmed_by` (User ID)
  - `confirmed_at` (DateTime)
  - `timestamp` (DateTime)

- `InventoryReserved` event is published for each reservation:
  - `reservation_id` (UUID)
  - `product_id` (UUID)
  - `quantity` (Integer)
  - `reserved_for_id` (UUID: appointment_id)
  - `reserved_for_type` (String: "appointment")
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Appointment", action="confirm"
- Inventory reservation records created (see UC-INV-003)

**Integration Events:**
- Appointment reminder may be scheduled (background job, separate workflow)

## 13. Repository Methods Required

**AppointmentRepository Interface:**
- `findById(id: UUID): Promise<Appointment | null>` - Load existing appointment
- `update(appointment: Appointment): Promise<Appointment>` - Persist updated appointment

**AppointmentServiceLineRepository Interface:**
- `findByAppointmentId(appointmentId: UUID): Promise<AppointmentServiceLine[]>` - Load service lines

**ServiceRepository Interface:**
- `findById(id: UUID): Promise<Service | null>` - Load service and check consumes_inventory

**InventoryReservationRepository Interface:**
- `save(reservation: InventoryReservation): Promise<InventoryReservation>` - Create reservation
- `checkAvailableStock(productId: UUID, quantity: Integer): Promise<boolean>` - Check stock availability

**ProductRepository Interface:**
- `findById(id: UUID): Promise<Product | null>` - Verify product exists

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user
- `hasStoreAccess(userId: UUID, storeId: UUID): Promise<boolean>` - Check store access

## 14. Notes or Limitations

1. **Inventory Reservation:** Confirmation creates inventory reservations. Reservations are released if appointment is cancelled.

2. **Stock Availability:** Stock checks must be atomic to prevent race conditions. Use database transactions and locking.

3. **Manager Override:** Manager/Owner can override insufficient stock. Consider business rules for when override is allowed.

4. **Reservation Quantity:** Reservation quantity = consumed_item.quantity * service_line.quantity. Ensure correct calculation.

5. **Performance:** Confirmation must respond within 500ms (N1 requirement). Optimize stock availability checks.

6. **Transaction Safety:** Confirmation involves multiple operations (appointment update + reservations). Use database transactions to ensure atomicity.

7. **Future Enhancements:** Consider adding:
   - Confirmation notifications to customer
   - Confirmation reminders
   - Bulk confirmation
   - Confirmation approval workflow

8. **Business Rule Dependencies:** Appointment confirmation depends on:
   - Appointment creation (UC-SVC-002)
   - Inventory module for stock availability and reservations

9. **Error Recovery:** If confirmation fails, ensure proper rollback of reservations and appointment status.

10. **Audit Trail:** All confirmation actions must be logged for compliance and troubleshooting.

