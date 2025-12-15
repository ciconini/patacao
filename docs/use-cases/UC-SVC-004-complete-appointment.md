# Use Case UC-SVC-004: Complete Appointment

## 1. Objective

Complete a confirmed or checked-in appointment, changing its status to "completed". Completion triggers inventory decrement for services that consume inventory, records service notes, and finalizes the appointment. Completed appointments can be used for invoicing and payment recording.

## 2. Actors and Permissions

**Primary Actor:** Staff, Veterinarian

**Secondary Actors:** None

**Required Permissions:**
- Role: `Staff`, `Veterinarian`, `Manager`, or `Owner`
- Permission: `appointments:complete`

**Authorization Rules:**
- `Staff` and `Veterinarian` can complete appointments
- `Manager` and `Owner` can also complete appointments
- System must validate role before allowing completion
- User must have access to the appointment's store

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Staff`, `Veterinarian`, `Manager`, or `Owner` role assigned
3. Appointment with specified `id` exists
4. Appointment status is `confirmed` or `checked_in` (cannot complete booked, completed, or cancelled appointments)
5. Inventory reservations exist for services that consume inventory (if applicable)
6. System has available storage capacity for stock movements

## 4. Postconditions

1. Appointment status is changed to `completed`
2. Inventory reservations are released (or consumed)
3. Stock movements are created for services that consume inventory (decrement stock)
4. Service notes are recorded (if provided)
5. `updated_at` timestamp is updated
6. Audit log entry is created recording the completion action
7. Appointment is finalized and ready for invoicing

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | Must exist, status="confirmed" or "checked_in" | Appointment identifier |
| `notes` | String | No | Max 5000 chars | Service notes (groomer/vet notes) |
| `consumed_items` | Array[Object] | No | Required if service consumes inventory | Actual consumed items (may differ from reservation) |

**Consumed Items Structure (if service consumes inventory):**
```json
[
  {
    "product_id": "UUID",
    "quantity": 2,
    "batch_id": "UUID (optional)"
  }
]
```

**Consumed Item Fields:**
- `product_id` (UUID, required): Product identifier
- `quantity` (Integer, required): Actual quantity consumed (may differ from reservation)
- `batch_id` (UUID, optional): Specific batch used (for expiry tracking)

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Appointment identifier |
| `status` | String | Appointment status ("completed") |
| `completed_at` | DateTime | Completion timestamp |
| `completed_by` | UUID | User who completed the appointment |
| `notes` | String | Service notes (nullable) |
| `stock_movements` | Array[Object] | Created stock movements (if any) |
| `updated_at` | DateTime | Last update timestamp |

## 7. Main Flow

1. System receives request to complete appointment with `id` and optional data
2. System validates user authentication and role (`Staff`, `Veterinarian`, `Manager`, or `Owner`)
3. System loads appointment by `id`
4. System verifies appointment exists (return 404 if not found)
5. System verifies appointment status is `confirmed` or `checked_in` (cannot complete booked, completed, or cancelled)
6. System verifies user has access to appointment's store
7. System loads appointment service lines
8. System validates `notes` length if provided (max 5000 chars)
9. System begins database transaction
10. For each service line:
    - System loads service to check if `consumes_inventory` is true
    - If `consumes_inventory` is true:
      - System loads inventory reservations for this appointment
      - If `consumed_items` provided:
        - System validates consumed items match service consumed_items structure
        - System creates stock movements for actual consumed quantities
      - Else:
        - System uses reserved quantities to create stock movements
      - For each consumed item:
        - System creates stock movement:
          - `product_id`: Product ID
          - `quantity_change`: Negative quantity (decrement)
          - `reason`: "sale" or "service"
          - `performed_by`: Current user ID
          - `location_id`: Store ID
          - `reference_id`: Appointment ID
          - `batch_id`: Batch ID if provided
        - System updates product stock level (decrement)
        - System releases or consumes inventory reservation
11. System updates appointment status to "completed"
12. System sets `notes` if provided
13. System sets `completed_at` to current timestamp (optional field)
14. System sets `completed_by` to current user ID (optional field)
15. System sets `updated_at` to current timestamp
16. System persists updated appointment record
17. System commits database transaction
18. System creates audit log entry with action `complete`, entity_type `Appointment`, entity_id, notes, and performed_by
19. System returns completed appointment object with stock movements

## 8. Alternative Flows

### 8.1. Appointment Not Found
- **Trigger:** Step 4 finds no appointment with given `id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Appointment not found"
  - Use case terminates

### 8.2. Appointment Not in Valid Status
- **Trigger:** Step 5 detects appointment status is not "confirmed" or "checked_in"
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Only confirmed or checked-in appointments can be completed"
  - Use case terminates

### 8.3. User Lacks Store Access
- **Trigger:** Step 6 determines user cannot access appointment's store
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "You do not have access to this appointment's store"
  - Use case terminates

### 8.4. Notes Too Long
- **Trigger:** Step 8 detects notes exceed 5000 characters
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Notes cannot exceed 5000 characters"
  - Use case terminates

### 8.5. Insufficient Stock
- **Trigger:** Step 10 detects insufficient stock for consumed items
- **Action:**
  - System returns error `409 Conflict`
  - Error message: "Insufficient stock for product [product_id]. Available: [available], Required: [required]"
  - Use case terminates

### 8.6. Invalid Consumed Items
- **Trigger:** Step 10 detects consumed_items do not match service structure
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Consumed items do not match service consumed_items structure"
  - Use case terminates

### 8.7. Database Transaction Failure
- **Trigger:** Step 17 fails to commit transaction
- **Action:**
  - System rolls back database transaction
  - System returns error `500 Internal Server Error`
  - Error message: "An error occurred while completing appointment. Changes were rolled back"
  - Use case terminates

### 8.8. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Staff, Veterinarian, Manager, or Owner role can complete appointments"
  - Use case terminates

## 9. Business Rules

**BR1:** Only confirmed or checked-in appointments can be completed. Booked, completed, or cancelled appointments cannot be completed.

**BR2:** Completion triggers inventory decrement for services that consume inventory. Stock movements are created with reason "sale" or "service".

**BR3:** Actual consumed quantities may differ from reserved quantities. System uses provided `consumed_items` if available, otherwise uses reserved quantities.

**BR4:** Inventory reservations are released or consumed upon completion. Reservations are no longer needed after stock is decremented.

**BR5:** Service notes are optional but recommended. Notes are stored against the appointment and linked to pet history.

**BR6:** All completion actions must be logged in audit logs for compliance and medical record traceability.

**BR7:** Completed appointments are finalized. Status change is irreversible without cancellation/void workflow.

**BR8:** Stock decrement must be atomic. All products must have sufficient stock, or transaction fails.

**BR9:** Batch selection for consumed items follows FIFO or expiry rules. Expired batches cannot be used.

**BR10:** Completion does not automatically create invoice. Invoicing is handled separately in Financial module.

## 10. Validation Rules

1. **Appointment Status Validation:**
   - Must be "confirmed" or "checked_in"
   - Cannot complete booked, completed, or cancelled appointments

2. **Store Access Validation:**
   - User must have access to appointment's store

3. **Notes Validation (if provided):**
   - Maximum 5000 characters
   - Can contain structured or free-form text

4. **Consumed Items Validation (if provided):**
   - Must match service consumed_items structure
   - Each item must have:
     - `product_id`: Must exist
     - `quantity`: Integer > 0
     - `batch_id`: Must exist if provided

5. **Stock Validation:**
   - Available stock must be sufficient for consumed quantities
   - Expired batches cannot be used
   - Stock check must be atomic

6. **User Authorization:**
   - Must have `Staff`, `Veterinarian`, `Manager`, or `Owner` role
   - Permission check: `appointments:complete`

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_STATUS` | "Only confirmed or checked-in appointments can be completed" | Appointment not in valid status |
| 400 | `NOTES_TOO_LONG` | "Notes cannot exceed 5000 characters" | Notes too long |
| 400 | `INVALID_CONSUMED_ITEMS` | "Consumed items do not match service structure" | Consumed items invalid |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Staff, Veterinarian, Manager, or Owner role can complete appointments" | User lacks required role |
| 403 | `STORE_ACCESS_DENIED` | "You do not have access to this appointment's store" | Store access denied |
| 404 | `APPOINTMENT_NOT_FOUND` | "Appointment not found" | Appointment does not exist |
| 404 | `PRODUCT_NOT_FOUND` | "Product with ID [id] not found" | Product does not exist |
| 409 | `INSUFFICIENT_STOCK` | "Insufficient stock for product" | Not enough stock available |
| 500 | `TRANSACTION_FAILED` | "An error occurred while completing appointment" | Database transaction failed |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error |

## 12. Events Triggered

**Domain Events:**
- `AppointmentCompleted` event is published with payload:
  - `appointment_id` (UUID)
  - `store_id` (UUID)
  - `customer_id` (UUID)
  - `pet_id` (UUID)
  - `completed_by` (User ID)
  - `completed_at` (DateTime)
  - `timestamp` (DateTime)

- `StockDecremented` event is published for each product:
  - `product_id` (UUID)
  - `quantity` (Integer)
  - `reason` (String: "sale" or "service")
  - `appointment_id` (UUID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Appointment", action="complete", notes
- Stock movement records created for each consumed product
- Inventory reservations released or consumed

**Integration Events:**
- None (completion is internal operation, but may trigger invoicing workflow in future)

## 13. Repository Methods Required

**AppointmentRepository Interface:**
- `findById(id: UUID): Promise<Appointment | null>` - Load existing appointment
- `update(appointment: Appointment): Promise<Appointment>` - Persist updated appointment

**AppointmentServiceLineRepository Interface:**
- `findByAppointmentId(appointmentId: UUID): Promise<AppointmentServiceLine[]>` - Load service lines

**ServiceRepository Interface:**
- `findById(id: UUID): Promise<Service | null>` - Load service and check consumes_inventory

**InventoryReservationRepository Interface:**
- `findByAppointmentId(appointmentId: UUID): Promise<InventoryReservation[]>` - Load reservations
- `release(reservationId: UUID): Promise<void>` - Release reservation
- `consume(reservationId: UUID): Promise<void>` - Mark reservation as consumed

**StockMovementRepository Interface:**
- `save(movement: StockMovement): Promise<StockMovement>` - Persist stock movement

**ProductRepository Interface:**
- `findById(id: UUID): Promise<Product | null>` - Verify product exists
- `checkStock(productId: UUID, quantity: Integer): Promise<boolean>` - Check stock availability
- `decrementStock(productId: UUID, quantity: Integer, batchId?: UUID): Promise<void>` - Decrement stock

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user
- `hasStoreAccess(userId: UUID, storeId: UUID): Promise<boolean>` - Check store access

## 14. Notes or Limitations

1. **Inventory Decrement:** Completion triggers stock decrement for services that consume inventory. Stock movements are created with reason "sale" or "service".

2. **Actual vs Reserved Quantities:** Actual consumed quantities may differ from reserved quantities. System uses provided `consumed_items` if available.

3. **Batch Selection:** Batch selection for consumed items follows FIFO or expiry rules. Expired batches cannot be used.

4. **Transaction Safety:** Completion involves multiple operations (appointment update + stock movements + reservation release). Use database transactions to ensure atomicity.

5. **Performance:** Completion must respond within reasonable time. Optimize stock decrement operations.

6. **Service Notes:** Notes are stored against appointment and linked to pet history. Consider structured note formats for medical records.

7. **Future Enhancements:** Consider adding:
   - Service note templates
   - Photo attachments
   - Service completion checklist
   - Automatic invoice generation
   - Completion notifications

8. **Business Rule Dependencies:** Appointment completion depends on:
   - Appointment confirmation (UC-SVC-003)
   - Inventory module for stock decrement
   - Financial module for invoicing (separate workflow)

9. **Error Recovery:** If completion fails, ensure proper rollback of stock decrements and appointment status.

10. **Audit Trail:** All completion actions must be logged for compliance and medical record traceability.

