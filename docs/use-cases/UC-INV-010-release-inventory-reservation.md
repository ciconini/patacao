# Use Case UC-INV-010: Release Inventory Reservation

## 1. Objective

Release a previously created inventory reservation, making the reserved stock available again for other operations. Reservations are released when appointments are cancelled, transactions are abandoned, or reservations expire. This use case complements UC-INV-003 (Create Inventory Reservation).

## 2. Actors and Permissions

**Primary Actor:** Staff, Manager

**Secondary Actors:** None

**Required Permissions:**
- Role: `Staff`, `Manager`, or `Owner`
- Permission: `inventory-reservations:release`

**Authorization Rules:**
- Users with `Staff`, `Manager`, or `Owner` role can release reservations
- System must validate role before allowing reservation release
- Users can release reservations they created or have permission to manage

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Staff`, `Manager`, or `Owner` role assigned
3. Inventory reservation with specified `id` exists in the system
4. Reservation is not already released or consumed

## 4. Postconditions

1. Inventory reservation is marked as released (or deleted, business rule dependent)
2. Available stock is increased by the reserved quantity
3. Reservation is no longer blocking other operations
4. `updated_at` timestamp is updated (if reservation record retained)
5. Audit log entry is created recording the release action
6. Stock becomes available for new reservations or sales

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | Must exist | Reservation identifier |

**Note:** No additional input fields required. System releases the reservation identified by `id`.

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Reservation identifier |
| `product_id` | UUID | Product that was reserved |
| `quantity` | Integer | Quantity that was released |
| `released_at` | DateTime | Release timestamp |
| `released_by` | UUID | User who released the reservation |
| `status` | String | Reservation status ("released") |

## 7. Main Flow

1. System receives request to release reservation with `id`
2. System validates user authentication and role (`Staff`, `Manager`, or `Owner`)
3. System loads reservation record by `id`
4. System verifies reservation exists (return 404 if not found)
5. System verifies reservation is not already released or consumed
6. System loads product associated with reservation
7. System verifies product exists and is stock_tracked
8. System captures current reservation state for audit log
9. System increases available stock by reserved quantity (release the hold)
10. System marks reservation as released (or deletes reservation, business rule dependent)
11. System sets `released_at` to current timestamp (if reservation retained)
12. System sets `released_by` to current user ID (if reservation retained)
13. System sets `updated_at` to current timestamp (if reservation retained)
14. System persists reservation record (if retained) or deletes it (if business rule requires deletion)
15. System creates audit log entry with action `release`, entity_type `InventoryReservation`, entity_id, and performed_by
16. System returns released reservation object (or success confirmation if deleted)

## 8. Alternative Flows

### 8.1. Reservation Not Found
- **Trigger:** Step 4 finds no reservation with given `id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Inventory reservation not found"
  - Use case terminates

### 8.2. Reservation Already Released
- **Trigger:** Step 5 detects reservation is already released
- **Action:**
  - System returns error `409 Conflict`
  - Error message: "Reservation is already released"
  - Use case terminates

### 8.3. Reservation Already Consumed
- **Trigger:** Step 5 detects reservation was consumed (stock decremented)
- **Action:**
  - System returns error `409 Conflict`
  - Error message: "Reservation cannot be released as stock has already been consumed"
  - Use case terminates

### 8.4. Product Not Found
- **Trigger:** Step 7 detects product does not exist
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Product not found"
  - Use case terminates

### 8.5. Product Not Stock Tracked
- **Trigger:** Step 7 detects product is not stock_tracked
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Product is not stock tracked. Reservation release not applicable"
  - Use case terminates

### 8.6. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Staff, Manager, or Owner role can release reservations"
  - Use case terminates

## 9. Business Rules

**BR1:** Reservations can only be released if they are still active (not already released or consumed).

**BR2:** Releasing a reservation increases available stock by the reserved quantity. Stock becomes available for new reservations or sales.

**BR3:** Reservations are automatically released when:
   - Expiry date is reached (if expires_at was set)
   - Appointment is cancelled
   - Transaction is abandoned

**BR4:** Manual release is required when:
   - User explicitly cancels a reservation
   - Reservation needs to be released for other purposes

**BR5:** All reservation release actions must be logged in audit logs for compliance and traceability.

**BR6:** Reservation release does not create a stock movement. Stock movement occurs only when stock is actually decremented (on sale completion).

**BR7:** Released reservations may be retained for audit purposes or deleted (business rule dependent).

**BR8:** Available stock calculation must account for released reservations immediately.

## 10. Validation Rules

1. **Reservation Existence:**
   - Reservation must exist in database
   - Reservation must not be already released
   - Reservation must not be already consumed

2. **Product Validation:**
   - Product must exist
   - Product must be stock_tracked

3. **User Authorization:**
   - Must have `Staff`, `Manager`, or `Owner` role
   - Permission check: `inventory-reservations:release`

4. **Reservation State:**
   - Status must be "active" or "pending" (not "released" or "consumed")

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `PRODUCT_NOT_STOCK_TRACKED` | "Product is not stock tracked" | Product does not track stock |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Staff, Manager, or Owner role can release reservations" | User lacks required role |
| 404 | `RESERVATION_NOT_FOUND` | "Inventory reservation not found" | Reservation does not exist |
| 404 | `PRODUCT_NOT_FOUND` | "Product not found" | Product does not exist |
| 409 | `ALREADY_RELEASED` | "Reservation is already released" | Reservation already released |
| 409 | `ALREADY_CONSUMED` | "Reservation cannot be released as stock has already been consumed" | Stock already decremented |
| 500 | `INTERNAL_ERROR` | "An error occurred while releasing reservation" | System error |

## 12. Events Triggered

**Domain Events:**
- `InventoryReservationReleased` event is published with payload:
  - `reservation_id` (UUID)
  - `product_id` (UUID)
  - `quantity` (Integer)
  - `released_by` (User ID)
  - `released_at` (DateTime)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="InventoryReservation", action="release"

**Integration Events:**
- None (reservation release is internal operation)

## 13. Repository Methods Required

**InventoryReservationRepository Interface:**
- `findById(id: UUID): Promise<InventoryReservation | null>` - Load existing reservation
- `update(reservation: InventoryReservation): Promise<InventoryReservation>` - Update reservation status
- `delete(id: UUID): Promise<void>` - Delete reservation (if business rule requires deletion)

**ProductRepository Interface:**
- `findById(id: UUID): Promise<Product | null>` - Verify product exists and stock_tracked

**AvailabilityService Interface:**
- `releaseReservation(productId: UUID, quantity: Integer): Promise<void>` - Release reserved stock

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user

## 14. Notes or Limitations

1. **Reservation Lifecycle:** Reservations can be in states: active, released, consumed. Only active reservations can be released.

2. **Stock Availability:** Releasing a reservation immediately makes stock available. Ensure atomic operation to prevent race conditions.

3. **Automatic Release:** System should automatically release expired reservations (background job). This use case handles manual release.

4. **Consumption vs Release:** Reservations are consumed when stock is decremented (on sale completion). Release is different - it makes stock available without decrementing.

5. **Audit Trail:** All release actions must be logged for compliance and troubleshooting.

6. **Performance:** Reservation release is frequent operation. Ensure efficient database operations and availability calculations.

7. **Concurrency:** Multiple users may attempt to release the same reservation. Use optimistic locking or database-level locking.

8. **Future Enhancements:** Consider adding:
   - Bulk release operations
   - Release reason tracking
   - Partial release support
   - Release notifications

9. **Business Rule Dependencies:** Reservation release integrates with:
   - Appointment cancellation (automatic release)
   - Transaction abandonment (automatic release)
   - Expiry management (automatic release)

10. **Transaction Safety:** Reservation release should be atomic. Use database transactions to ensure consistency between reservation status and available stock.

