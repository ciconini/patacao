# Use Case UC-FIN-004: Void Invoice

## 1. Objective

Void an issued invoice, making it invalid while preserving the original invoice data for audit purposes. Voiding is restricted to Manager and Accountant roles and requires a reason. Voided invoices cannot be edited or used for further operations but remain in the system for compliance and audit trails.

## 2. Actors and Permissions

**Primary Actor:** Manager, Accountant

**Secondary Actors:** None

**Required Permissions:**
- Role: `Manager`, `Accountant`, or `Owner`
- Permission: `invoices:void`

**Authorization Rules:**
- Only `Manager`, `Accountant`, or `Owner` can void invoices
- `Staff` role cannot void invoices
- System must validate role before allowing void operation

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Manager`, `Accountant`, or `Owner` role assigned
3. Invoice with specified `id` exists in the system
4. Invoice status is `issued` or `paid` (cannot void draft, already voided, or refunded invoices)
5. Invoice is not linked to completed transactions that cannot be reversed (business rule dependent)

## 4. Postconditions

1. Invoice status is changed to `cancelled` (or `voided` if separate status)
2. Invoice becomes immutable and cannot be edited
3. Void reason is recorded in audit log
4. `updated_at` timestamp is updated
5. Audit log entry is created recording the void action with reason
6. Invoice remains in system for audit and compliance purposes
7. Voided invoice is excluded from financial exports (or marked as voided)

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | Must exist, status="issued" or "paid" | Invoice identifier |
| `reason` | String | Yes | Max 500 chars, non-empty | Reason for voiding the invoice |

**Void Reasons:**
- Common reasons: "Error in invoice", "Customer cancellation", "Duplicate invoice", "Payment issue", "Other"

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Invoice identifier |
| `invoice_number` | String | Invoice number (preserved) |
| `status` | String | Invoice status ("cancelled" or "voided") |
| `voided_at` | DateTime | Void timestamp |
| `voided_by` | UUID | User who voided the invoice |
| `void_reason` | String | Reason for voiding |
| `updated_at` | DateTime | Last update timestamp |

## 7. Main Flow

1. System receives request to void invoice with `id` and `reason`
2. System validates user authentication and role (`Manager`, `Accountant`, or `Owner`)
3. System loads invoice by `id`
4. System verifies invoice exists (return 404 if not found)
5. System verifies invoice status is `issued` or `paid` (cannot void draft, cancelled, or refunded)
6. System validates `reason` is provided and non-empty
7. System validates `reason` length (max 500 characters)
8. System checks if invoice is linked to transactions (business rule dependent)
9. System validates transactions can be reversed or are not blocking void (business rule dependent)
10. System captures current invoice state for audit log
11. System sets invoice status to `cancelled` (or `voided` if separate status)
12. System sets `voided_at` to current timestamp (optional field)
13. System sets `voided_by` to current user ID (optional field)
14. System sets `updated_at` to current timestamp
15. System persists updated invoice record
16. System creates audit log entry with action `void`, entity_type `Invoice`, entity_id, reason, before/after status, and performed_by
17. System returns voided invoice object with void information

## 8. Alternative Flows

### 8.1. Invoice Not Found
- **Trigger:** Step 4 finds no invoice with given `id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Invoice not found"
  - Use case terminates

### 8.2. Invoice Not in Valid Status
- **Trigger:** Step 5 detects invoice status is not "issued" or "paid"
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Only issued or paid invoices can be voided"
  - Use case terminates

### 8.3. Missing Reason
- **Trigger:** Step 6 detects missing `reason`
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Reason is required for voiding invoice"
  - Use case terminates

### 8.4. Reason Too Long
- **Trigger:** Step 7 detects reason exceeds 500 characters
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Reason cannot exceed 500 characters"
  - Use case terminates

### 8.5. Transaction Blocking Void
- **Trigger:** Step 9 detects invoice linked to transactions that cannot be reversed
- **Action:**
  - System returns error `409 Conflict`
  - Error message: "Invoice cannot be voided due to linked transactions. Reverse transactions first"
  - Use case terminates

### 8.6. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Manager, Accountant, or Owner role can void invoices"
  - Use case terminates

## 9. Business Rules

**BR1:** Only `Manager`, `Accountant`, or `Owner` can void invoices. `Staff` cannot void invoices.

**BR2:** Only issued or paid invoices can be voided. Draft invoices should be deleted instead.

**BR3:** Void reason is required for audit and compliance purposes. Cannot void without reason.

**BR4:** Voided invoices become immutable. Cannot edit or use voided invoices for further operations.

**BR5:** Voided invoices remain in system for audit and compliance. Cannot be deleted.

**BR6:** Voided invoices are excluded from financial exports or marked as voided in exports.

**BR7:** All void operations must be logged in audit logs with reason for compliance and traceability.

**BR8:** If invoice is linked to transactions, system may require transaction reversal before voiding (business rule dependent).

**BR9:** Void operation is irreversible. Consider confirmation workflow for critical invoices.

**BR10:** Voided invoice number cannot be reused. Sequential numbering continues from next number.

## 10. Validation Rules

1. **Invoice Status Validation:**
   - Must be "issued" or "paid"
   - Cannot void draft, cancelled, or refunded invoices

2. **Reason Validation:**
   - Must be provided and non-empty
   - Maximum 500 characters
   - Should be descriptive for audit purposes

3. **User Authorization:**
   - Must have `Manager`, `Accountant`, or `Owner` role
   - Permission check: `invoices:void`

4. **Transaction Validation (business rule dependent):**
   - Check if invoice linked to transactions
   - Validate transactions can be reversed or are not blocking void

5. **Date Validation:**
   - `voided_at` is set to current timestamp
   - Cannot be backdated

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_STATUS` | "Only issued or paid invoices can be voided" | Invoice not in valid status |
| 400 | `MISSING_REASON` | "Reason is required for voiding invoice" | Reason not provided |
| 400 | `REASON_TOO_LONG` | "Reason cannot exceed 500 characters" | Reason too long |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Manager, Accountant, or Owner role can void invoices" | User lacks role |
| 404 | `INVOICE_NOT_FOUND` | "Invoice not found" | Invoice does not exist |
| 409 | `TRANSACTION_BLOCKING` | "Invoice cannot be voided due to linked transactions" | Transactions block void |
| 500 | `INTERNAL_ERROR` | "An error occurred while voiding invoice" | System error |

## 12. Events Triggered

**Domain Events:**
- `InvoiceVoided` event is published with payload:
  - `invoice_id` (UUID)
  - `invoice_number` (String)
  - `reason` (String)
  - `voided_by` (User ID)
  - `voided_at` (DateTime)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Invoice", action="void", reason, before_status, after_status="cancelled"

**Integration Events:**
- None (void operation is internal, but may trigger notifications in future)

## 13. Repository Methods Required

**InvoiceRepository Interface:**
- `findById(id: UUID): Promise<Invoice | null>` - Load existing invoice
- `update(invoice: Invoice): Promise<Invoice>` - Persist updated invoice

**TransactionRepository Interface (optional):**
- `findByInvoiceId(invoiceId: UUID): Promise<Transaction[]>` - Check linked transactions

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user

## 14. Notes or Limitations

1. **Irreversibility:** Void operation is irreversible. Consider confirmation workflow for critical invoices.

2. **Transaction Handling:** If invoice linked to transactions, consider business rules for handling transactions before voiding.

3. **Audit Trail:** Void reason is critical for audit and compliance. Ensure detailed logging.

4. **Status Management:** Invoice status changes to "cancelled" or "voided". Clarify business rules for status values.

5. **Financial Exports:** Voided invoices should be excluded from financial exports or marked as voided.

6. **Invoice Number:** Voided invoice numbers cannot be reused. Sequential numbering continues.

7. **Future Enhancements:** Consider adding:
   - Void confirmation workflow
   - Bulk void operations
   - Void reason templates
   - Void impact analysis (linked transactions, stock movements)

8. **Business Rule Dependencies:** Void operation depends on invoice issuance (UC-FIN-002).

9. **Transaction Safety:** Void operation should be atomic. Use database transactions.

10. **Performance:** Void operation is infrequent. No special performance optimizations required.

