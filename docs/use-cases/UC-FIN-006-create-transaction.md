# Use Case UC-FIN-006: Create Transaction (POS)

## 1. Objective

Create a new transaction representing a POS (Point of Sale) checkout or sale. Transaction includes line items (products/services), creates a draft invoice, and prepares for stock decrement on completion. Transaction represents a shopping cart that can be completed later or immediately.

## 2. Actors and Permissions

**Primary Actor:** Staff, Manager

**Secondary Actors:** None

**Required Permissions:**
- Role: `Staff`, `Manager`, `Accountant`, or `Owner`
- Permission: `transactions:create`

**Authorization Rules:**
- `Staff` and `Manager` can create transactions (POS checkout)
- `Accountant` and `Owner` can also create transactions
- System must validate role before allowing transaction creation

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Staff`, `Manager`, `Accountant`, or `Owner` role assigned
3. Store with specified `store_id` exists
4. Products/services referenced in line items exist if IDs provided
5. Customer with specified `customer_id` exists if provided
6. System has available storage capacity for new records

## 4. Postconditions

1. A new `Transaction` entity is created with status `pending`
2. Transaction record is persisted in the `transactions` table
3. Transaction line items are created in `transaction_lines` table
4. A draft invoice is created and linked to the transaction (business rule dependent)
5. Transaction totals are calculated and stored
6. `created_at` timestamp is set to current server time
7. `updated_at` is initially set to `created_at`
8. Audit log entry is created recording the creation action
9. Transaction is ready for completion (stock decrement and payment recording)

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `store_id` | UUID | Yes | Must exist | Store identifier |
| `customer_id` | UUID | No | Must exist if provided | Customer identifier (buyer) |
| `lines` | Array[Object] | Yes | Min 1 line item | Array of transaction line items |
| `create_invoice` | Boolean | No | true/false | Create draft invoice (defaults to true) |

**Transaction Line Item Structure:**
```json
{
  "product_id": "UUID (optional)",
  "service_id": "UUID (optional)",
  "quantity": 1,
  "unit_price": 10.00
}
```

**Line Item Fields:**
- `product_id` (UUID, optional): Product identifier (if product line)
- `service_id` (UUID, optional): Service identifier (if service line)
- `quantity` (Decimal, required): Quantity (min 0.01)
- `unit_price` (Decimal, required): Unit price (min 0.00)

**Note:** Either `product_id` or `service_id` can be provided, but not both. At least one line item must be provided.

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier for the created transaction |
| `store_id` | UUID | Store identifier |
| `invoice_id` | UUID | Linked invoice identifier (if created) |
| `lines` | Array[Object] | Transaction line items |
| `total_amount` | Decimal | Transaction total amount |
| `payment_status` | String | Payment status ("pending") |
| `created_by` | UUID | User who created the transaction |
| `created_at` | DateTime | Creation timestamp (ISO 8601) |
| `updated_at` | DateTime | Last update timestamp (ISO 8601) |

## 7. Main Flow

1. System receives request to create transaction with input data
2. System validates user authentication and role (`Staff`, `Manager`, `Accountant`, or `Owner`)
3. System validates required fields are present (`store_id`, `lines`)
4. System validates `lines` array contains at least one item
5. System loads store by `store_id` to verify existence
6. System validates customer exists if `customer_id` provided
7. For each line item:
   - System validates `quantity` > 0
   - System validates `unit_price` >= 0
   - System validates either `product_id` or `service_id` provided (not both)
   - System validates product/service exists if ID provided
   - System calculates line total: `quantity * unit_price`
8. System calculates transaction total: sum of all line totals
9. System generates UUID for `id`
10. System sets `payment_status` to "pending"
11. System sets `created_by` to current user ID
12. System sets `created_at` and `updated_at` to current timestamp
13. System persists transaction record to `transactions` table
14. System persists transaction line records to `transaction_lines` table
15. If `create_invoice` is true (default):
    - System creates draft invoice using transaction data (see UC-FIN-001)
    - System links invoice to transaction via `invoice_id`
16. System creates audit log entry with action `create`, entity_type `Transaction`, entity_id, and performed_by
17. System returns created transaction object with all fields including `invoice_id` if created

## 8. Alternative Flows

### 8.1. Store Not Found
- **Trigger:** Step 5 finds no store with given `store_id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Store not found"
  - Use case terminates

### 8.2. Customer Not Found
- **Trigger:** Step 6 finds no customer with given `customer_id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Customer not found"
  - Use case terminates

### 8.3. No Line Items
- **Trigger:** Step 4 detects empty `lines` array
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Transaction must have at least one line item"
  - Use case terminates

### 8.4. Invalid Line Item
- **Trigger:** Step 7 detects invalid line item (invalid quantity/price, missing product/service)
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Invalid line item: [specific error]"
  - Use case terminates

### 8.5. Product/Service Not Found
- **Trigger:** Step 7 detects product_id or service_id does not exist
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Product/Service with ID [id] not found"
  - Use case terminates

### 8.6. Invoice Creation Failed
- **Trigger:** Step 15 fails to create invoice
- **Action:**
  - System may continue without invoice (business rule dependent)
  - Or return error `500 Internal Server Error`
  - Error message: "Failed to create invoice for transaction"
  - Use case terminates (if invoice required)

### 8.7. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Staff, Manager, Accountant, or Owner role can create transactions"
  - Use case terminates

## 9. Business Rules

**BR1:** Transaction represents a POS checkout or sale. Can be completed immediately or later.

**BR2:** Transaction must have at least one line item. Empty transactions are not allowed.

**BR3:** Transaction creates a draft invoice by default (`create_invoice=true`). Invoice can be issued later.

**BR4:** Transaction does not affect inventory stock until completion. Stock decrement occurs on transaction completion (see UC-FIN-007).

**BR5:** Transaction payment status is "pending" until completion. Payment is recorded on completion.

**BR6:** Transaction can include both products and services in line items.

**BR7:** All transaction creation actions must be logged in audit logs for compliance.

**BR8:** Transaction totals are calculated from line items. No manual override allowed.

**BR9:** Customer is optional for transactions but recommended for proper accounting and reporting.

**BR10:** Transaction completion triggers stock decrement for tracked products (see UC-FIN-007).

## 10. Validation Rules

1. **Store Validation:**
   - Must exist in `stores` table

2. **Customer Validation (if provided):**
   - Must exist in `customers` table
   - Customer must not be archived (business rule dependent)

3. **Line Items Validation:**
   - Minimum 1 line item required
   - Each line must have:
     - `quantity`: Decimal > 0, precision 2 decimal places
     - `unit_price`: Decimal >= 0, precision 2 decimal places
   - Either `product_id` or `service_id` (not both, both optional)
   - Product/service must exist if ID provided

4. **Total Calculation:**
   - Line total: `quantity * unit_price`
   - Transaction total: sum of all line totals
   - Precision: 2 decimal places

5. **Invoice Creation:**
   - If `create_invoice=true` (default), create draft invoice
   - Invoice includes transaction line items
   - Invoice linked to transaction via `invoice_id`

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `MISSING_REQUIRED_FIELD` | "Required field [field] is missing" | Required field not provided |
| 400 | `INVALID_LINES` | "Transaction must have at least one line item" | Empty lines array |
| 400 | `INVALID_LINE_ITEM` | "Invalid line item: [error]" | Line item validation failed |
| 400 | `INVALID_QUANTITY` | "Quantity must be greater than 0" | Invalid quantity |
| 400 | `INVALID_PRICE` | "Unit price must be >= 0" | Invalid price |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Staff, Manager, Accountant, or Owner role can create transactions" | User lacks role |
| 404 | `STORE_NOT_FOUND` | "Store not found" | Store does not exist |
| 404 | `CUSTOMER_NOT_FOUND` | "Customer not found" | Customer does not exist |
| 404 | `PRODUCT_NOT_FOUND` | "Product with ID [id] not found" | Product does not exist |
| 404 | `SERVICE_NOT_FOUND` | "Service with ID [id] not found" | Service does not exist |
| 500 | `INVOICE_CREATION_FAILED` | "Failed to create invoice for transaction" | Invoice creation failed |
| 500 | `INTERNAL_ERROR` | "An error occurred while creating transaction" | System error |

## 12. Events Triggered

**Domain Events:**
- `TransactionCreated` event is published with payload:
  - `transaction_id` (UUID)
  - `store_id` (UUID)
  - `invoice_id` (UUID, nullable)
  - `total_amount` (Decimal)
  - `created_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Transaction", action="create"
- If invoice created: `InvoiceCreated` event (see UC-FIN-001)

**Integration Events:**
- None (transaction creation is internal operation)

## 13. Repository Methods Required

**TransactionRepository Interface:**
- `save(transaction: Transaction): Promise<Transaction>` - Persist new transaction entity
- `findById(id: UUID): Promise<Transaction | null>` - Retrieve by ID

**TransactionLineRepository Interface:**
- `saveLines(transactionId: UUID, lines: TransactionLine[]): Promise<TransactionLine[]>` - Persist transaction lines

**StoreRepository Interface:**
- `findById(id: UUID): Promise<Store | null>` - Verify store exists

**CustomerRepository Interface:**
- `findById(id: UUID): Promise<Customer | null>` - Verify customer exists

**ProductRepository Interface:**
- `findById(id: UUID): Promise<Product | null>` - Verify product exists

**ServiceRepository Interface:**
- `findById(id: UUID): Promise<Service | null>` - Verify service exists

**InvoiceRepository Interface:**
- `save(invoice: Invoice): Promise<Invoice>` - Create draft invoice if needed

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

## 14. Notes or Limitations

1. **Invoice Creation:** Transaction creates draft invoice by default. Invoice can be issued later (see UC-FIN-002).

2. **Stock Impact:** Transaction creation does not affect inventory. Stock decrement occurs on completion (see UC-FIN-007).

3. **Transaction Safety:** Transaction creation involves multiple table inserts. Use database transactions to ensure atomicity.

4. **Performance:** Transaction creation is frequent operation (POS checkout). Ensure efficient database operations.

5. **Future Enhancements:** Consider adding:
   - Discounts per line item
   - Global discounts
   - Tax calculation (VAT)
   - Payment methods at creation
   - Transaction templates

6. **Business Rule Dependencies:** Transaction creation depends on:
   - Administrative module for store/customer data
   - Inventory module for product data
   - Services module for service data
   - Financial module for invoice creation

7. **Completion Flow:** Transaction completion (UC-FIN-007) handles stock decrement and payment recording.

8. **Error Handling:** Provide detailed error messages for validation failures to enable quick correction.

9. **Customer Optional:** Customer is optional but recommended. Consider business rules for anonymous sales.

10. **Line Item Flexibility:** Line items can include products, services, or both. Ensure proper handling of both types.

