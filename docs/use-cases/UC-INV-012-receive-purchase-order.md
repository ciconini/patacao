# Use Case UC-INV-012: Receive Purchase Order

## 1. Objective

Receive goods against a purchase order, creating stock batches, stock movements, and updating PO status. This use case handles the receiving workflow when goods arrive from a supplier. It differs from general stock receipt (UC-INV-001) as it links to a specific purchase order and may handle partial receipts.

## 2. Actors and Permissions

**Primary Actor:** Staff, Manager

**Secondary Actors:** None

**Required Permissions:**
- Role: `Staff`, `Manager`, or `Owner`
- Permission: `purchase-orders:receive`

**Authorization Rules:**
- `Staff` and `Manager` can receive purchase orders
- System must validate role before allowing PO receiving
- User must have access to the store where goods are received

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Staff`, `Manager`, or `Owner` role assigned
3. Purchase order with specified `id` exists
4. PO status is `ordered` (cannot receive draft POs)
5. Store with specified `store_id` exists (if different from PO store)
6. Products in received lines exist and match PO lines
7. System has available storage capacity for new records

## 4. Postconditions

1. Stock batches are created/updated for each received line (with optional batch/expiry)
2. Stock movements are created with positive `quantity_change` and reason `receipt`
3. Purchase order status is updated (to `received` if fully received, or remains `ordered` if partial)
4. Received quantities are recorded against PO lines
5. Product on-hand quantities increase accordingly
6. `updated_at` timestamp is updated
7. Audit log entry is created recording the receiving action

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | Must exist, status="ordered" | Purchase order identifier |
| `store_id` | UUID | No | Must exist if provided | Store receiving goods (defaults to PO store) |
| `received_lines` | Array[Object] | Yes | Min 1 line | Array of received line items |

**Received Line Item Structure:**
```json
{
  "product_id": "UUID",
  "quantity": 10,
  "batch_number": "BATCH-001",
  "expiry_date": "2025-12-31"
}
```

**Received Line Fields:**
- `product_id` (UUID, required): Product identifier (must match PO line)
- `quantity` (Integer, required): Quantity received (min 1, <= ordered quantity)
- `batch_number` (String, optional): Batch number for tracking
- `expiry_date` (Date, optional): Expiry date (not in past)

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `purchase_order_id` | UUID | Purchase order identifier |
| `status` | String | Updated PO status ("ordered" or "received") |
| `received_lines` | Array[Object] | Received lines with batch information |
| `stock_batches` | Array[Object] | Created/updated stock batches |
| `stock_movements` | Array[Object] | Created stock movements |
| `received_at` | DateTime | Receiving timestamp |
| `received_by` | UUID | User who received the goods |

## 7. Main Flow

1. System receives request to receive purchase order with `id` and received lines
2. System validates user authentication and role (`Staff`, `Manager`, or `Owner`)
3. System loads purchase order by `id`
4. System verifies PO exists (return 404 if not found)
5. System verifies PO status is `ordered` (cannot receive draft POs)
6. System validates `received_lines` array contains at least one item
7. System validates store exists if `store_id` provided (defaults to PO store)
8. For each received line:
   - System validates `product_id` matches a PO line
   - System validates `quantity` > 0 and <= ordered quantity (not yet received)
   - System validates `batch_number` length if provided
   - System validates `expiry_date` is not in past if provided
9. System begins database transaction
10. For each received line:
    - System creates or updates stock batch (product_id, batch_number, expiry_date, quantity += received)
    - System creates stock movement (reason=`receipt`, +quantity, reference_id=PO id, location_id=store)
    - System updates PO line received quantity
11. System updates product on-hand quantities (if aggregated field)
12. System checks if all PO lines are fully received
13. If all lines fully received: System updates PO status to `received`
14. System sets `updated_at` to current timestamp
15. System commits database transaction
16. System creates audit log entry with action `receive`, entity_type `PurchaseOrder`, entity_id, and performed_by
17. System returns receiving summary with batches and movements

## 8. Alternative Flows

### 8.1. Purchase Order Not Found
- **Trigger:** Step 4 finds no PO with given `id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Purchase order not found"
  - Use case terminates

### 8.2. PO Not in Ordered Status
- **Trigger:** Step 5 detects PO status is not "ordered"
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Purchase order must be in 'ordered' status to receive goods"
  - Use case terminates

### 8.3. No Received Lines
- **Trigger:** Step 6 detects empty `received_lines` array
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "At least one received line is required"
  - Use case terminates

### 8.4. Product Not in PO
- **Trigger:** Step 8 detects product_id does not match any PO line
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Product [product_id] is not in this purchase order"
  - Use case terminates

### 8.5. Quantity Exceeds Ordered
- **Trigger:** Step 8 detects received quantity > ordered quantity (not yet received)
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Received quantity [qty] exceeds ordered quantity [ordered] for product [product_id]"
  - Use case terminates

### 8.6. Invalid Expiry Date
- **Trigger:** Step 8 detects expiry_date in past
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Expiry date cannot be in the past"
  - Use case terminates

### 8.7. Store Not Found
- **Trigger:** Step 7 detects store does not exist
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Store not found"
  - Use case terminates

### 8.8. Database Transaction Failure
- **Trigger:** Step 15 fails to commit transaction
- **Action:**
  - System rolls back database transaction
  - System returns error `500 Internal Server Error`
  - Error message: "An error occurred while receiving purchase order. Changes were rolled back"
  - Use case terminates

### 8.9. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Staff, Manager, or Owner role can receive purchase orders"
  - Use case terminates

## 9. Business Rules

**BR1:** Purchase orders must be in `ordered` status before receiving. Draft POs cannot be received.

**BR2:** Received quantity cannot exceed ordered quantity (considering already received quantities). Partial receipts are allowed.

**BR3:** PO status changes to `received` only when all lines are fully received. Partial receipts keep status as `ordered`.

**BR4:** Stock batches are created/updated with batch numbers and expiry dates if provided.

**BR5:** Stock movements are created with reason `receipt` and reference to purchase order ID.

**BR6:** All receiving actions must be logged in audit logs for compliance and traceability.

**BR7:** Receiving is atomic. All lines must be processed successfully, or transaction is rolled back.

**BR8:** Store defaults to PO store if not provided. Goods can be received at different store if specified.

**BR9:** Expired items cannot be received. Expiry date must be in future or today.

**BR10:** PO receiving creates stock batches and movements similar to general stock receipt, but linked to PO.

## 10. Validation Rules

1. **Purchase Order Validation:**
   - Must exist in `purchase_orders` table
   - Status must be "ordered"

2. **Store Validation:**
   - Must exist if provided
   - Defaults to PO store if not provided

3. **Received Lines Validation:**
   - Minimum 1 line required
   - Each line must have:
     - `product_id`: Must match a PO line product_id
     - `quantity`: Integer > 0, <= (ordered quantity - already received quantity)
     - `batch_number`: Maximum 128 characters if provided
     - `expiry_date`: Not in past if provided

4. **Quantity Validation:**
   - Received quantity <= ordered quantity (considering already received)
   - Cannot receive more than ordered

5. **Batch/Expiry Validation:**
   - Batch number optional but recommended for traceability
   - Expiry date must be valid date, not in past

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_STATUS` | "Purchase order must be in 'ordered' status" | PO not in ordered status |
| 400 | `INVALID_LINES` | "At least one received line is required" | Empty received_lines array |
| 400 | `PRODUCT_NOT_IN_PO` | "Product is not in this purchase order" | Product doesn't match PO line |
| 400 | `QUANTITY_EXCEEDS_ORDERED` | "Received quantity exceeds ordered quantity" | Too much quantity received |
| 400 | `INVALID_EXPIRY` | "Expiry date cannot be in the past" | Past expiry date |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Staff, Manager, or Owner role can receive purchase orders" | User lacks required role |
| 404 | `PO_NOT_FOUND` | "Purchase order not found" | PO does not exist |
| 404 | `STORE_NOT_FOUND` | "Store not found" | Store does not exist |
| 500 | `TRANSACTION_FAILED` | "An error occurred while receiving purchase order" | Database transaction failed |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error |

## 12. Events Triggered

**Domain Events:**
- `PurchaseOrderReceived` event is published with payload:
  - `purchase_order_id` (UUID)
  - `supplier_id` (UUID)
  - `store_id` (UUID)
  - `received_lines` (Array)
  - `received_by` (User ID)
  - `received_at` (DateTime)
  - `timestamp` (DateTime)

- `StockReceived` event is published (similar to UC-INV-001):
  - `product_id` (UUID)
  - `quantity` (Integer)
  - `reference_id` (UUID: PO id)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="PurchaseOrder", action="receive"
- Stock movement records created for each received line

**Integration Events:**
- None (PO receiving is internal operation)

## 13. Repository Methods Required

**PurchaseOrderRepository Interface:**
- `findById(id: UUID): Promise<PurchaseOrder | null>` - Load existing PO
- `update(purchaseOrder: PurchaseOrder): Promise<PurchaseOrder>` - Update PO status
- `findLinesByPOId(poId: UUID): Promise<PurchaseOrderLine[]>` - Load PO lines

**PurchaseOrderLineRepository Interface:**
- `updateReceivedQuantity(lineId: UUID, receivedQuantity: Integer): Promise<void>` - Update received quantity

**StockBatchRepository Interface:**
- `createOrIncrement(batchInput: StockBatchInput): Promise<StockBatch>` - Create/update batch

**StockMovementRepository Interface:**
- `save(movement: StockMovement): Promise<StockMovement>` - Persist stock movement

**ProductRepository Interface:**
- `findById(id: UUID): Promise<Product | null>` - Verify product exists
- `updateOnHand(productId: UUID, delta: Integer): Promise<void>` - Update on-hand (if aggregated)

**StoreRepository Interface:**
- `findById(id: UUID): Promise<Store | null>` - Verify store exists

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

## 14. Notes or Limitations

1. **Partial Receipts:** System supports partial receipts. PO status remains "ordered" until all lines are fully received.

2. **Quantity Tracking:** System tracks received quantity per PO line. Cannot receive more than ordered (considering already received).

3. **Atomic Operation:** PO receiving must be atomic. All lines processed successfully or transaction rolled back.

4. **Stock Creation:** Receiving creates stock batches and movements similar to general stock receipt (UC-INV-001), but linked to PO.

5. **Store Flexibility:** Goods can be received at different store than PO store if specified.

6. **Performance:** PO receiving is infrequent. Ensure efficient database operations and batch creation.

7. **Future Enhancements:** Consider adding:
   - Receiving against specific PO line (line-level receiving)
   - Over-receiving tolerance (business rule dependent)
   - Quality inspection workflow
   - Receiving notes/comments
   - Receiving date vs PO date tracking

8. **Business Rule Dependencies:** PO receiving depends on:
   - Purchase order creation (UC-INV-011)
   - Stock batch management
   - Stock movement creation

9. **Transaction Safety:** PO receiving involves multiple table inserts/updates. Use database transactions to ensure atomicity.

10. **Audit Trail:** All receiving actions must be logged for compliance and procurement tracking.

