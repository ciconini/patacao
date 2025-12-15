# Use Case UC-INV-006: Update Product

## 1. Objective

Update an existing product's information including name, description, pricing, VAT rate, stock tracking flag, reorder threshold, category, and supplier reference. Product updates affect future sales and inventory operations but do not modify historical records.

## 2. Actors and Permissions

**Primary Actor:** Manager, Owner

**Secondary Actors:** None

**Required Permissions:**
- Role: `Manager` or `Owner`
- Permission: `products:update`

**Authorization Rules:**
- Only `Manager` or `Owner` can update products
- `Staff` role cannot update products
- System must validate role before allowing product updates

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Manager` or `Owner` role assigned
3. Product with specified `id` exists in the system
4. Product record is not locked or being processed by another operation

## 4. Postconditions

1. Product entity is updated with new field values
2. `updated_at` timestamp is set to current server time
3. Audit log entry is created recording the update action with before/after values
4. Product changes are immediately available for use in transactions and inventory operations
5. Historical records (invoices, transactions) retain original product data

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | Must exist | Product identifier |
| `name` | String | No | Max 255 chars, non-empty | Product name |
| `description` | String | No | Max 2000 chars | Product description |
| `category` | String | No | Max 128 chars | Product category |
| `unit_price` | Decimal | No | >= 0 | Default unit price |
| `vat_rate` | Decimal | No | 0.00 to 100.00 | VAT rate percentage |
| `stock_tracked` | Boolean | No | true/false | Stock tracking flag |
| `reorder_threshold` | Integer | No | >= 0 | Low-stock threshold |
| `supplier_id` | UUID | No | Must exist if provided | Supplier reference |

**Note:** All fields are optional in the update request. Only provided fields will be updated. SKU cannot be changed (would require new product).

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Product identifier |
| `sku` | String | SKU (unchanged) |
| `name` | String | Updated product name |
| `description` | String | Updated description (nullable) |
| `category` | String | Updated category (nullable) |
| `unit_price` | Decimal | Updated unit price |
| `vat_rate` | Decimal | Updated VAT rate |
| `stock_tracked` | Boolean | Updated stock tracking flag |
| `reorder_threshold` | Integer | Updated reorder threshold (nullable) |
| `supplier_id` | UUID | Updated supplier reference (nullable) |
| `created_at` | DateTime | Original creation timestamp |
| `updated_at` | DateTime | New update timestamp |

## 7. Main Flow

1. System receives request to update product with `id` and input data
2. System validates user authentication and role (`Manager` or `Owner`)
3. System loads existing product record by `id`
4. System verifies product exists (return 404 if not found)
5. For each provided field in input, validate according to field rules
6. System validates `name` is non-empty if provided
7. System validates `unit_price` >= 0 if provided
8. System validates `vat_rate` is between 0.00 and 100.00 if provided
9. System validates `reorder_threshold` >= 0 if provided
10. System validates `supplier_id` exists if provided
11. System captures current values for audit log (before state)
12. System applies updates to product entity (only provided fields)
13. System sets `updated_at` to current timestamp
14. System persists updated product record
15. System creates audit log entry with action `update`, entity_type `Product`, entity_id, before/after values, and performed_by
16. System returns updated product object

## 8. Alternative Flows

### 8.1. Product Not Found
- **Trigger:** Step 4 finds no product with given `id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Product not found"
  - Use case terminates

### 8.2. Invalid Name Format
- **Trigger:** Step 6 detects invalid name (empty or whitespace-only)
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Product name cannot be empty"
  - Use case terminates

### 8.3. Invalid Price
- **Trigger:** Step 7 detects `unit_price` < 0
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Unit price must be >= 0"
  - Use case terminates

### 8.4. Invalid VAT Rate
- **Trigger:** Step 8 detects `vat_rate` outside valid range
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "VAT rate must be between 0.00 and 100.00"
  - Use case terminates

### 8.5. Invalid Reorder Threshold
- **Trigger:** Step 9 detects `reorder_threshold` < 0
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Reorder threshold must be >= 0"
  - Use case terminates

### 8.6. Supplier Not Found
- **Trigger:** Step 10 detects supplier does not exist
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Supplier not found"
  - Use case terminates

### 8.7. No Fields Provided
- **Trigger:** Request contains only `id`, no update fields
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "At least one field must be provided for update"
  - Use case terminates

### 8.8. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Manager or Owner role can update products"
  - Use case terminates

## 9. Business Rules

**BR1:** SKU cannot be changed. SKU is immutable once created. To change SKU, create a new product.

**BR2:** Partial updates are allowed. Only provided fields are updated; omitted fields retain existing values.

**BR3:** Price and VAT changes affect future sales only. Historical invoices and transactions retain original product data.

**BR4:** Changing `stock_tracked` from `true` to `false` does not affect existing stock movements or batches. Future movements may be ignored.

**BR5:** Changing `stock_tracked` from `false` to `true` enables stock tracking for future operations. Existing stock is not automatically initialized.

**BR6:** All product updates must be logged in audit logs with before/after values for compliance.

**BR7:** `updated_at` timestamp is always updated, even if no fields changed (edge case).

**BR8:** Reorder threshold changes affect low-stock alert calculations immediately.

## 10. Validation Rules

1. **Name Validation (if provided):**
   - Cannot be empty or whitespace-only
   - Maximum 255 characters

2. **Description Validation (if provided):**
   - Maximum 2000 characters
   - Can be empty string (nullable)

3. **Category Validation (if provided):**
   - Maximum 128 characters
   - Can be empty string (nullable)

4. **Unit Price Validation (if provided):**
   - Must be decimal >= 0
   - Precision: 2 decimal places

5. **VAT Rate Validation (if provided):**
   - Must be between 0.00 and 100.00
   - Precision: 2 decimal places
   - Common Portuguese VAT rates: 0%, 6%, 13%, 23%

6. **Stock Tracked Validation (if provided):**
   - Must be boolean value (true/false)

7. **Reorder Threshold Validation (if provided):**
   - Must be integer >= 0
   - Can be null (no threshold)

8. **Supplier Validation (if provided):**
   - Must exist in `suppliers` table
   - Can be null (remove supplier reference)

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_NAME` | "Product name cannot be empty" | Name is empty or whitespace-only |
| 400 | `INVALID_PRICE` | "Unit price must be >= 0" | Price is negative |
| 400 | `INVALID_VAT` | "VAT rate must be between 0.00 and 100.00" | VAT rate outside valid range |
| 400 | `INVALID_THRESHOLD` | "Reorder threshold must be >= 0" | Threshold is negative |
| 400 | `NO_FIELDS_PROVIDED` | "At least one field must be provided for update" | No fields to update |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Manager or Owner role can update products" | User lacks required role |
| 404 | `PRODUCT_NOT_FOUND` | "Product not found" | Product does not exist |
| 404 | `SUPPLIER_NOT_FOUND` | "Supplier not found" | Supplier does not exist |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error |

## 12. Events Triggered

**Domain Events:**
- `ProductUpdated` event is published with payload:
  - `product_id` (UUID)
  - `sku` (String)
  - `updated_fields` (Array of field names)
  - `updated_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Product", action="update", meta containing before/after values

**Integration Events:**
- None (product update is internal operation)

## 13. Repository Methods Required

**ProductRepository Interface:**
- `findById(id: UUID): Promise<Product | null>` - Load existing product
- `update(product: Product): Promise<Product>` - Persist updated product entity

**SupplierRepository Interface:**
- `findById(id: UUID): Promise<Supplier | null>` - Verify supplier exists

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry with before/after values

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user for audit logging

## 14. Notes or Limitations

1. **SKU Immutability:** SKU cannot be changed. This ensures referential integrity with historical records and external systems.

2. **Partial Updates:** System supports partial updates. Only provided fields are updated, maintaining existing values for omitted fields.

3. **Audit Trail:** All updates are logged with before/after values for compliance and troubleshooting.

4. **Concurrency:** Consider optimistic locking using `updated_at` timestamp to prevent lost updates.

5. **Price Changes:** Price and VAT changes affect future sales only. Historical invoices and transactions are not modified.

6. **Stock Tracking Changes:** Changing stock_tracked flag does not affect existing stock data. Consider business rules for handling existing stock when disabling tracking.

7. **Performance:** Product updates are infrequent. No special performance optimizations required.

8. **Future Enhancements:** Consider adding:
   - Price history tracking
   - Bulk update capabilities
   - Product versioning
   - Approval workflow for price changes

9. **Business Rule Dependencies:** Product updates may affect:
   - Low-stock alerts (reorder_threshold changes)
   - Future transactions (price/VAT changes)
   - Inventory operations (stock_tracked changes)

10. **Transaction Safety:** Product update should be atomic. Use database transactions to ensure consistency.

