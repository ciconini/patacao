# Use Case UC-FIN-007: Complete Transaction

## 1. Objective

Complete a pending transaction, finalizing the sale. Completion triggers stock decrement for tracked products, records payment information (if provided), and updates transaction status. This use case handles the final step of POS checkout flow.

## 2. Actors and Permissions

**Primary Actor:** Staff, Manager

**Secondary Actors:** None

**Required Permissions:**
- Role: `Staff`, `Manager`, `Accountant`, or `Owner`
- Permission: `transactions:complete`

**Authorization Rules:**
- `Staff` and `Manager` can complete transactions (POS checkout)
- `Accountant` and `Owner` can also complete transactions
- System must validate role before allowing transaction completion

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Staff`, `Manager`, `Accountant`, or `Owner` role assigned
3. Transaction with specified `id` exists in the system
4. Transaction status is `pending`
5. Products in transaction line items have sufficient stock (if stock_tracked)
6. System has available storage capacity for stock movements

## 4. Postconditions

1. Transaction `payment_status` is updated to `paid_manual` (if payment info provided) or remains `pending`
2. Payment information is recorded (if provided)
3. Stock decrements are created for tracked products in transaction lines
4. Stock movements are recorded in `stock_movements` table
5. Product stock levels are updated (if stock_tracked)
6. `updated_at` timestamp is updated
7. Audit log entry is created recording the completion action
8. Transaction is finalized and ready for reporting

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | Must exist, status="pending" | Transaction identifier |
| `payment_method` | String | No | Max 64 chars | Payment method (e.g., "cash", "card") |
| `paid_at` | DateTime | No | Valid date, not future | Payment date/time (defaults to current time) |
| `external_reference` | String | No | Max 255 chars | External payment reference |

**Payment Information:**
- Payment fields are optional. Transaction can be completed without payment info (payment recorded later).
- If payment info provided, transaction `payment_status` changes to `paid_manual`.

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Transaction identifier |
| `store_id` | UUID | Store identifier |
| `invoice_id` | UUID | Linked invoice identifier |
| `payment_status` | String | Payment status ("paid_manual" or "pending") |
| `payment_method` | String | Payment method (nullable) |
| `paid_at` | DateTime | Payment timestamp (nullable) |
| `external_reference` | String | External payment reference (nullable) |
| `completed_by` | UUID | User who completed the transaction |
| `updated_at` | DateTime | Last update timestamp |
| `stock_movements` | Array[Object] | Created stock movement records |

## 7. Main Flow

1. System receives request to complete transaction with `id` and optional payment data
2. System validates user authentication and role (`Staff`, `Manager`, `Accountant`, or `Owner`)
3. System loads transaction by `id`
4. System verifies transaction exists (return 404 if not found)
5. System verifies transaction status is `pending` (cannot complete already completed transactions)
6. System loads transaction line items
7. For each line item with `product_id`:
   - System loads product to check if `stock_tracked` is true
   - If `stock_tracked`:
     - System checks available stock for product
     - System validates stock is sufficient (available >= quantity)
     - System reserves stock (if reservation system used)
8. System validates payment information if provided:
   - System validates `payment_method` is non-empty if provided
   - System validates `paid_at` is valid date and not future if provided
9. System starts database transaction
10. For each line item with tracked product:
    - System creates stock movement record:
      - `product_id`: Product ID
      - `quantity_change`: Negative quantity (decrement)
      - `reason`: "sale"
      - `performed_by`: Current user ID
      - `location_id`: Store ID
      - `reference_id`: Transaction ID
    - System updates product stock level (decrement quantity)
    - System persists stock movement record
11. System updates transaction:
    - If payment info provided: Set `payment_status` to "paid_manual"
    - Set `payment_method` if provided
    - Set `paid_at` if provided (or current time)
    - Set `external_reference` if provided
    - Set `completed_by` to current user ID
    - Set `updated_at` to current timestamp
12. System persists updated transaction record
13. System commits database transaction
14. System creates audit log entry with action `complete`, entity_type `Transaction`, entity_id, payment details, and performed_by
15. System returns completed transaction object with stock movement records

## 8. Alternative Flows

### 8.1. Transaction Not Found
- **Trigger:** Step 4 finds no transaction with given `id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Transaction not found"
  - Use case terminates

### 8.2. Transaction Not Pending
- **Trigger:** Step 5 detects transaction status is not "pending"
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Transaction is not in pending status. Only pending transactions can be completed"
  - Use case terminates

### 8.3. Insufficient Stock
- **Trigger:** Step 7 detects insufficient stock for a product
- **Action:**
  - System returns error `409 Conflict`
  - Error message: "Insufficient stock for product [product_id]. Available: [available], Required: [quantity]"
  - Use case terminates

### 8.4. Product Not Found
- **Trigger:** Step 7 detects product does not exist
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Product with ID [id] not found"
  - Use case terminates

### 8.5. Invalid Payment Date
- **Trigger:** Step 8 detects invalid or future `paid_at` date
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Payment date must be valid and cannot be in the future"
  - Use case terminates

### 8.6. Database Transaction Failure
- **Trigger:** Step 13 fails to commit transaction
- **Action:**
  - System rolls back database transaction
  - System returns error `500 Internal Server Error`
  - Error message: "An error occurred while completing transaction. Changes were rolled back"
  - Use case terminates

### 8.7. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Staff, Manager, Accountant, or Owner role can complete transactions"
  - Use case terminates

## 9. Business Rules

**BR1:** Transaction completion triggers stock decrement for tracked products. Non-tracked products are not affected.

**BR2:** Stock availability is checked before completion. Insufficient stock prevents completion.

**BR3:** Stock decrement is atomic. All products must have sufficient stock, or transaction fails.

**BR4:** Payment information is optional. Transaction can be completed without payment (payment recorded later).

**BR5:** If payment info provided, transaction `payment_status` changes to `paid_manual`. Otherwise remains `pending`.

**BR6:** Stock movements are created with reason "sale" and reference to transaction ID.

**BR7:** All transaction completion actions must be logged in audit logs for compliance and traceability.

**BR8:** Transaction completion is atomic. Database transaction ensures all-or-nothing completion.

**BR9:** Stock decrement uses FIFO or batch selection based on business rules (expired batches blocked).

**BR10:** Transaction completion does not automatically issue linked invoice. Invoice issuance is separate (see UC-FIN-002).

## 10. Validation Rules

1. **Transaction Status Validation:**
   - Must be "pending"
   - Cannot complete already completed or refunded transactions

2. **Stock Validation (for tracked products):**
   - Available stock must be >= transaction quantity
   - Stock check must be atomic (prevent race conditions)
   - Expired batches cannot be sold

3. **Payment Information Validation (if provided):**
   - `payment_method`: Non-empty string, max 64 chars
   - `paid_at`: Valid date/time, not future
   - `external_reference`: Max 255 chars

4. **Stock Movement Creation:**
   - `quantity_change`: Negative value (decrement)
   - `reason`: "sale"
   - `performed_by`: Current user ID
   - `reference_id`: Transaction ID

5. **User Authorization:**
   - Must have `Staff`, `Manager`, `Accountant`, or `Owner` role
   - Permission check: `transactions:complete`

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_STATUS` | "Transaction is not in pending status" | Transaction cannot be completed |
| 400 | `INVALID_PAYMENT_DATE` | "Payment date must be valid and cannot be in future" | Invalid payment date |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Staff, Manager, Accountant, or Owner role can complete transactions" | User lacks role |
| 404 | `TRANSACTION_NOT_FOUND` | "Transaction not found" | Transaction does not exist |
| 404 | `PRODUCT_NOT_FOUND` | "Product with ID [id] not found" | Product does not exist |
| 409 | `INSUFFICIENT_STOCK` | "Insufficient stock for product" | Stock not available |
| 500 | `TRANSACTION_FAILED` | "An error occurred while completing transaction" | Database transaction failed |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error |

## 12. Events Triggered

**Domain Events:**
- `TransactionCompleted` event is published with payload:
  - `transaction_id` (UUID)
  - `store_id` (UUID)
  - `payment_status` (String)
  - `payment_method` (String, nullable)
  - `completed_by` (User ID)
  - `timestamp` (DateTime)

- `StockDecremented` event is published for each product:
  - `product_id` (UUID)
  - `quantity` (Decimal)
  - `reason` (String: "sale")
  - `transaction_id` (UUID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Transaction", action="complete", payment details
- Stock movement records created for each tracked product

**Integration Events:**
- None (transaction completion is internal operation)

## 13. Repository Methods Required

**TransactionRepository Interface:**
- `findById(id: UUID): Promise<Transaction | null>` - Load existing transaction
- `update(transaction: Transaction): Promise<Transaction>` - Persist updated transaction

**TransactionLineRepository Interface:**
- `findByTransactionId(transactionId: UUID): Promise<TransactionLine[]>` - Load transaction lines

**ProductRepository Interface:**
- `findById(id: UUID): Promise<Product | null>` - Load product and check stock_tracked
- `checkStock(productId: UUID, quantity: Decimal): Promise<boolean>` - Check stock availability
- `decrementStock(productId: UUID, quantity: Decimal): Promise<void>` - Decrement stock level

**StockMovementRepository Interface:**
- `save(stockMovement: StockMovement): Promise<StockMovement>` - Persist stock movement

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user

## 14. Notes or Limitations

1. **Atomic Operation:** Transaction completion must be atomic. Use database transactions to ensure consistency.

2. **Stock Concurrency:** Stock checks must prevent race conditions. Consider optimistic locking or database-level locking.

3. **Payment Optional:** Payment information is optional. Transaction can be completed without payment (payment recorded later via UC-FIN-003).

4. **Stock Decrement:** Only tracked products affect inventory. Non-tracked products are ignored.

5. **Batch Selection:** Stock decrement may use FIFO or batch selection. Expired batches must be blocked.

6. **Performance:** Transaction completion is frequent operation (POS checkout). Ensure efficient database operations.

7. **Error Recovery:** If completion fails, ensure proper rollback of stock decrements and transaction updates.

8. **Future Enhancements:** Consider adding:
   - Partial completion support
   - Stock reservation before completion
   - Automatic invoice issuance on completion
   - Payment gateway integration (future)

9. **Business Rule Dependencies:** Transaction completion depends on:
   - Transaction creation (UC-FIN-006)
   - Inventory module for stock management
   - Financial module for invoice linking

10. **Audit Trail:** All completion actions must be logged for compliance and troubleshooting.

