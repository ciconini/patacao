# Use Case UC-INV-011: Create Purchase Order

## 1. Objective

Create a new purchase order (PO) for ordering products from a supplier. Purchase orders track ordered quantities, expected delivery, and link to stock receipts when goods are received. POs support procurement workflow and inventory planning.

## 2. Actors and Permissions

**Primary Actor:** Manager

**Secondary Actors:** Owner

**Required Permissions:**
- Role: `Manager` or `Owner`
- Permission: `purchase-orders:create`

**Authorization Rules:**
- Only `Manager` or `Owner` can create purchase orders
- `Staff` role cannot create purchase orders
- System must validate role before allowing PO creation

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Manager` or `Owner` role assigned
3. Supplier with specified `supplier_id` exists
4. Store with specified `store_id` exists (if provided)
5. Products referenced in order lines exist
6. System has available storage capacity for new records

## 4. Postconditions

1. A new `PurchaseOrder` entity is created with a unique UUID `id`
2. Purchase order record is persisted in the `purchase_orders` table
3. Purchase order lines are created in `purchase_order_lines` table
4. PO status is set to `draft` or `ordered` (business rule dependent)
5. `created_at` timestamp is set to current server time
6. `updated_at` is initially set to `created_at`
7. Audit log entry is created recording the creation action
8. PO is ready for ordering or receiving goods

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `supplier_id` | UUID | Yes | Must exist | Supplier identifier |
| `store_id` | UUID | No | Must exist if provided | Store identifier (destination for goods) |
| `lines` | Array[Object] | Yes | Min 1 line item | Array of purchase order line items |
| `status` | String | No | "draft" or "ordered" | PO status (defaults to "draft") |

**Purchase Order Line Item Structure:**
```json
{
  "product_id": "UUID",
  "quantity": 10,
  "unit_price": 5.50
}
```

**Line Item Fields:**
- `product_id` (UUID, required): Product identifier (must exist)
- `quantity` (Integer, required): Quantity to order (min 1)
- `unit_price` (Decimal, required): Unit price (>= 0)

**Status Values:**
- `draft`: PO is being prepared, can be edited
- `ordered`: PO has been sent to supplier, ready for receiving

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier for the created purchase order |
| `supplier_id` | UUID | Supplier identifier |
| `supplier_name` | String | Supplier name (denormalized) |
| `store_id` | UUID | Store identifier (nullable) |
| `lines` | Array[Object] | Purchase order line items |
| `status` | String | PO status ("draft" or "ordered") |
| `total_amount` | Decimal | Total order amount (sum of line totals) |
| `created_by` | UUID | User who created the PO |
| `created_at` | DateTime | Creation timestamp (ISO 8601) |
| `updated_at` | DateTime | Last update timestamp (ISO 8601) |

## 7. Main Flow

1. System receives request to create purchase order with input data
2. System validates user authentication and role (`Manager` or `Owner`)
3. System validates required fields are present (`supplier_id`, `lines`)
4. System validates `lines` array contains at least one item
5. System loads supplier by `supplier_id` to verify existence
6. System validates store exists if `store_id` provided
7. For each line item:
   - System validates `product_id` exists
   - System validates `quantity` > 0 (integer)
   - System validates `unit_price` >= 0
   - System calculates line total: `quantity * unit_price`
8. System calculates PO total: sum of all line totals
9. System validates `status` is "draft" or "ordered" if provided (defaults to "draft")
10. System generates UUID for `id`
11. System sets `created_by` to current user ID
12. System sets `created_at` and `updated_at` to current timestamp
13. System persists purchase order record to `purchase_orders` table
14. System persists purchase order line records to `purchase_order_lines` table
15. System creates audit log entry with action `create`, entity_type `PurchaseOrder`, entity_id, and performed_by
16. System returns created purchase order object with all fields

## 8. Alternative Flows

### 8.1. Supplier Not Found
- **Trigger:** Step 5 finds no supplier with given `supplier_id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Supplier not found"
  - Use case terminates

### 8.2. Store Not Found
- **Trigger:** Step 6 finds no store with given `store_id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Store not found"
  - Use case terminates

### 8.3. No Line Items
- **Trigger:** Step 4 detects empty `lines` array
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Purchase order must have at least one line item"
  - Use case terminates

### 8.4. Product Not Found
- **Trigger:** Step 7 detects product does not exist
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Product with ID [id] not found"
  - Use case terminates

### 8.5. Invalid Quantity
- **Trigger:** Step 7 detects `quantity` <= 0
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Quantity must be greater than 0"
  - Use case terminates

### 8.6. Invalid Price
- **Trigger:** Step 7 detects `unit_price` < 0
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Unit price must be >= 0"
  - Use case terminates

### 8.7. Invalid Status
- **Trigger:** Step 9 detects invalid status value
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Status must be 'draft' or 'ordered'"
  - Use case terminates

### 8.8. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Manager or Owner role can create purchase orders"
  - Use case terminates

## 9. Business Rules

**BR1:** Purchase orders must have at least one line item. Empty POs are not allowed.

**BR2:** PO status defaults to "draft" if not provided. Draft POs can be edited; ordered POs are more restricted.

**BR3:** Store is optional but recommended. Store indicates where goods will be received.

**BR4:** Unit price in PO may differ from product's default unit_price. PO price is used for costing when goods are received.

**BR5:** All purchase order creation actions must be logged in audit logs for compliance.

**BR6:** PO creation does not affect inventory stock. Stock is added when goods are received (see UC-INV-012).

**BR7:** PO total is calculated from line items. No manual override allowed.

**BR8:** Purchase orders support procurement workflow: draft → ordered → received → closed.

## 10. Validation Rules

1. **Supplier Validation:**
   - Must exist in `suppliers` table

2. **Store Validation (if provided):**
   - Must exist in `stores` table

3. **Line Items Validation:**
   - Minimum 1 line item required
   - Each line must have:
     - `product_id`: Must exist in `products` table
     - `quantity`: Integer > 0
     - `unit_price`: Decimal >= 0, precision 2 decimal places

4. **Status Validation:**
   - Must be "draft" or "ordered" if provided
   - Defaults to "draft"

5. **Total Calculation:**
   - Line total: `quantity * unit_price`
   - PO total: sum of all line totals
   - Precision: 2 decimal places

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `MISSING_REQUIRED_FIELD` | "Required field [field] is missing" | Required field not provided |
| 400 | `INVALID_LINES` | "Purchase order must have at least one line item" | Empty lines array |
| 400 | `INVALID_QUANTITY` | "Quantity must be greater than 0" | Invalid quantity |
| 400 | `INVALID_PRICE` | "Unit price must be >= 0" | Invalid price |
| 400 | `INVALID_STATUS` | "Status must be 'draft' or 'ordered'" | Invalid status value |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Manager or Owner role can create purchase orders" | User lacks required role |
| 404 | `SUPPLIER_NOT_FOUND` | "Supplier not found" | Supplier does not exist |
| 404 | `STORE_NOT_FOUND` | "Store not found" | Store does not exist |
| 404 | `PRODUCT_NOT_FOUND` | "Product with ID [id] not found" | Product does not exist |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error during persistence |

## 12. Events Triggered

**Domain Events:**
- `PurchaseOrderCreated` event is published with payload:
  - `purchase_order_id` (UUID)
  - `supplier_id` (UUID)
  - `store_id` (UUID, nullable)
  - `status` (String)
  - `total_amount` (Decimal)
  - `created_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="PurchaseOrder", action="create"

**Integration Events:**
- None (PO creation is internal operation, but may trigger notifications in future)

## 13. Repository Methods Required

**PurchaseOrderRepository Interface:**
- `save(purchaseOrder: PurchaseOrder): Promise<PurchaseOrder>` - Persist new PO entity
- `findById(id: UUID): Promise<PurchaseOrder | null>` - Retrieve by ID

**PurchaseOrderLineRepository Interface:**
- `saveLines(purchaseOrderId: UUID, lines: PurchaseOrderLine[]): Promise<PurchaseOrderLine[]>` - Persist PO lines

**SupplierRepository Interface:**
- `findById(id: UUID): Promise<Supplier | null>` - Verify supplier exists

**StoreRepository Interface:**
- `findById(id: UUID): Promise<Store | null>` - Verify store exists

**ProductRepository Interface:**
- `findById(id: UUID): Promise<Product | null>` - Verify product exists

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user

## 14. Notes or Limitations

1. **PO Status:** PO status defaults to "draft". Draft POs can be edited; ordered POs may have restrictions.

2. **Store Optional:** Store is optional but recommended. Store indicates destination for received goods.

3. **Price Flexibility:** PO unit price may differ from product's default price. PO price is used for costing.

4. **Transaction Safety:** PO creation involves multiple table inserts (PO + lines). Use database transactions to ensure atomicity.

5. **Performance:** PO creation is infrequent. No special performance optimizations required.

6. **Future Enhancements:** Consider adding:
   - PO numbering/sequencing
   - Expected delivery date
   - PO approval workflow
   - PO templates
   - Email notifications to suppliers
   - PO status history

7. **Business Rule Dependencies:** PO creation depends on:
   - Administrative module for supplier/store data
   - Inventory module for product data

8. **Receiving Goods:** PO receiving is handled separately (see UC-INV-012). Receiving creates stock batches and movements.

9. **Error Handling:** Provide detailed error messages for validation failures to enable quick correction.

10. **Audit Trail:** All PO creation actions must be logged for compliance and procurement tracking.

