# Use Case UC-FIN-005: Create Credit Note

## 1. Objective

Create a credit note (refund record) linked to an original invoice. Credit notes reduce the outstanding amount of an invoice and are used for refunds, corrections, or adjustments. Credit notes require Manager or Accountant role and must reference a valid issued invoice. Actual money refund is handled outside the system.

## 2. Actors and Permissions

**Primary Actor:** Manager, Accountant

**Secondary Actors:** None

**Required Permissions:**
- Role: `Manager`, `Accountant`, or `Owner`
- Permission: `credit-notes:create`

**Authorization Rules:**
- Only `Manager`, `Accountant`, or `Owner` can create credit notes
- `Staff` role cannot create credit notes
- System must validate role before allowing credit note creation

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Manager`, `Accountant`, or `Owner` role assigned
3. Invoice with specified `invoice_id` exists in the system
4. Invoice status is `issued` or `paid` (cannot create credit note for draft or voided invoices)
5. System has available storage capacity for new records

## 4. Postconditions

1. A new `CreditNote` entity is created with a unique UUID `id`
2. Credit note record is persisted in the `credit_notes` table
3. Credit note is linked to the original invoice via `invoice_id`
4. Credit note amount reduces the outstanding amount of the invoice
5. `issued_at` timestamp is set to current server time
6. `created_at` timestamp is set to current server time
7. Audit log entry is created recording the creation action
8. Credit note is ready for financial exports

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `invoice_id` | UUID | Yes | Must exist, status="issued" or "paid" | Original invoice identifier |
| `reason` | String | Yes | Max 500 chars, non-empty | Reason for credit note |
| `amount` | Decimal | Yes | > 0, <= invoice total | Credit note amount (must not exceed invoice total) |

**Credit Note Reasons:**
- Common reasons: "Refund", "Invoice correction", "Product return", "Service cancellation", "Discount adjustment", "Other"

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier for the created credit note |
| `invoice_id` | UUID | Original invoice identifier |
| `invoice_number` | String | Original invoice number (from invoice) |
| `issued_at` | DateTime | Credit note issue timestamp (ISO 8601) |
| `reason` | String | Reason for credit note |
| `amount` | Decimal | Credit note amount |
| `created_by` | UUID | User who created the credit note |
| `created_at` | DateTime | Creation timestamp (ISO 8601) |

## 7. Main Flow

1. System receives request to create credit note with input data
2. System validates user authentication and role (`Manager`, `Accountant`, or `Owner`)
3. System validates required fields are present (`invoice_id`, `reason`, `amount`)
4. System loads invoice by `invoice_id`
5. System verifies invoice exists (return 404 if not found)
6. System verifies invoice status is `issued` or `paid` (cannot create credit note for draft or voided invoices)
7. System validates `reason` is provided and non-empty
8. System validates `reason` length (max 500 characters)
9. System validates `amount` is greater than 0
10. System validates `amount` does not exceed invoice total (or outstanding amount)
11. System calculates outstanding amount: `invoice.total - sum of existing credit notes`
12. System validates `amount` does not exceed outstanding amount
13. System generates UUID for `id`
14. System sets `issued_at` to current timestamp
15. System sets `created_by` to current user ID
16. System sets `created_at` to current timestamp
17. System persists credit note record to `credit_notes` table
18. System creates audit log entry with action `create`, entity_type `CreditNote`, entity_id, invoice_id, amount, reason, and performed_by
19. System returns created credit note object with all fields

## 8. Alternative Flows

### 8.1. Invoice Not Found
- **Trigger:** Step 5 finds no invoice with given `invoice_id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Invoice not found"
  - Use case terminates

### 8.2. Invoice Not in Valid Status
- **Trigger:** Step 6 detects invoice status is not "issued" or "paid"
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Credit note can only be created for issued or paid invoices"
  - Use case terminates

### 8.3. Missing Required Field
- **Trigger:** Step 3 detects missing required field
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Required field [field_name] is missing"
  - Use case terminates

### 8.4. Missing Reason
- **Trigger:** Step 7 detects missing `reason`
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Reason is required for credit note"
  - Use case terminates

### 8.5. Reason Too Long
- **Trigger:** Step 8 detects reason exceeds 500 characters
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Reason cannot exceed 500 characters"
  - Use case terminates

### 8.6. Invalid Amount
- **Trigger:** Step 9 detects amount <= 0
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Credit note amount must be greater than 0"
  - Use case terminates

### 8.7. Amount Exceeds Invoice Total
- **Trigger:** Step 10 detects amount exceeds invoice total
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Credit note amount cannot exceed invoice total"
  - Use case terminates

### 8.8. Amount Exceeds Outstanding Amount
- **Trigger:** Step 12 detects amount exceeds outstanding amount (considering existing credit notes)
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Credit note amount cannot exceed outstanding amount. Outstanding: [amount]"
  - Use case terminates

### 8.9. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Manager, Accountant, or Owner role can create credit notes"
  - Use case terminates

## 9. Business Rules

**BR1:** Only `Manager`, `Accountant`, or `Owner` can create credit notes. `Staff` cannot create credit notes.

**BR2:** Credit notes can only be created for issued or paid invoices. Cannot create credit notes for draft or voided invoices.

**BR3:** Credit note amount must not exceed invoice total. System validates amount against invoice total and existing credit notes.

**BR4:** Credit note reduces the outstanding amount of the invoice. Outstanding amount = invoice.total - sum of all credit notes.

**BR5:** Credit note reason is required for audit and compliance purposes. Cannot create credit note without reason.

**BR6:** Actual money refund is handled outside the system. Credit note records the refund for accounting purposes only.

**BR7:** All credit note creation actions must be logged in audit logs for compliance and traceability.

**BR8:** Credit notes are included in financial exports and reduce outstanding amounts in accounting reports.

**BR9:** Multiple credit notes can be created for the same invoice (partial refunds). Total credit notes cannot exceed invoice total.

**BR10:** Credit note creation does not affect invoice status. Invoice remains issued/paid regardless of credit notes.

## 10. Validation Rules

1. **Invoice Validation:**
   - Must exist in `invoices` table
   - Status must be "issued" or "paid"
   - Cannot be draft or voided

2. **Reason Validation:**
   - Must be provided and non-empty
   - Maximum 500 characters
   - Should be descriptive for audit purposes

3. **Amount Validation:**
   - Must be greater than 0
   - Must not exceed invoice total
   - Must not exceed outstanding amount (invoice.total - sum of existing credit notes)
   - Precision: 2 decimal places

4. **Outstanding Amount Calculation:**
   - Outstanding = invoice.total - sum of all existing credit notes for invoice
   - Credit note amount must be <= outstanding amount

5. **User Authorization:**
   - Must have `Manager`, `Accountant`, or `Owner` role
   - Permission check: `credit-notes:create`

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `MISSING_REQUIRED_FIELD` | "Required field [field] is missing" | Required field not provided |
| 400 | `INVALID_STATUS` | "Credit note can only be created for issued or paid invoices" | Invoice not in valid status |
| 400 | `MISSING_REASON` | "Reason is required for credit note" | Reason not provided |
| 400 | `REASON_TOO_LONG` | "Reason cannot exceed 500 characters" | Reason too long |
| 400 | `INVALID_AMOUNT` | "Credit note amount must be greater than 0" | Invalid amount |
| 400 | `AMOUNT_EXCEEDS_TOTAL` | "Credit note amount cannot exceed invoice total" | Amount exceeds invoice total |
| 400 | `AMOUNT_EXCEEDS_OUTSTANDING` | "Credit note amount cannot exceed outstanding amount" | Amount exceeds outstanding |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Manager, Accountant, or Owner role can create credit notes" | User lacks role |
| 404 | `INVOICE_NOT_FOUND` | "Invoice not found" | Invoice does not exist |
| 500 | `INTERNAL_ERROR` | "An error occurred while creating credit note" | System error |

## 12. Events Triggered

**Domain Events:**
- `CreditNoteCreated` event is published with payload:
  - `credit_note_id` (UUID)
  - `invoice_id` (UUID)
  - `invoice_number` (String)
  - `amount` (Decimal)
  - `reason` (String)
  - `created_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="CreditNote", action="create", invoice_id, amount, reason

**Integration Events:**
- None (credit note creation is internal operation)

## 13. Repository Methods Required

**CreditNoteRepository Interface:**
- `save(creditNote: CreditNote): Promise<CreditNote>` - Persist new credit note entity
- `findByInvoiceId(invoiceId: UUID): Promise<CreditNote[]>` - Get existing credit notes for invoice
- `sumByInvoiceId(invoiceId: UUID): Promise<Decimal>` - Sum credit note amounts for invoice

**InvoiceRepository Interface:**
- `findById(id: UUID): Promise<Invoice | null>` - Load invoice and verify status

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user

## 14. Notes or Limitations

1. **Refund Handling:** Actual money refund is handled outside the system. Credit note records the refund for accounting only.

2. **Outstanding Amount:** System calculates outstanding amount considering all existing credit notes. Ensure accurate calculation.

3. **Multiple Credit Notes:** Multiple credit notes can be created for the same invoice (partial refunds). Total cannot exceed invoice total.

4. **Invoice Status:** Credit note creation does not affect invoice status. Invoice remains issued/paid.

5. **Financial Exports:** Credit notes are included in financial exports and reduce outstanding amounts in reports.

6. **Audit Trail:** Credit note reason is critical for audit and compliance. Ensure detailed logging.

7. **Future Enhancements:** Consider adding:
   - Credit note templates
   - Partial credit notes per line item
   - Credit note approval workflow
   - Credit note reversal

8. **Business Rule Dependencies:** Credit note creation depends on invoice issuance (UC-FIN-002).

9. **Transaction Safety:** Credit note creation should be atomic. Use database transactions.

10. **Performance:** Credit note creation is infrequent. No special performance optimizations required.

