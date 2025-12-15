# Use Case UC-FIN-003: Mark Invoice as Paid

## 1. Objective

Record manual payment for an issued invoice. Updates invoice payment status, records payment method, payment date, and external reference. This use case handles manual payment recording (no in-app payment capture). Payment marking can be performed by cashiers (Staff) or managers.

## 2. Actors and Permissions

**Primary Actor:** Staff, Manager, Accountant

**Secondary Actors:** None

**Required Permissions:**
- Role: `Staff`, `Manager`, `Accountant`, or `Owner`
- Permission: `invoices:mark-paid` or `invoices:update:payment`

**Authorization Rules:**
- `Staff` can mark invoices as paid (cashier function)
- `Manager` and `Accountant` can mark invoices as paid and override existing payments
- System must validate role before allowing payment marking

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Staff`, `Manager`, `Accountant`, or `Owner` role assigned
3. Invoice with specified `id` exists in the system
4. Invoice status is `issued` (cannot mark draft invoices as paid)
5. Invoice is not already marked as `paid` (unless Manager/Accountant override)

## 4. Postconditions

1. Invoice `payment_status` is updated to reflect payment
2. `paid_at` timestamp is set to specified date or current time
3. `payment_method` is recorded
4. `external_reference` is recorded (if provided)
5. Invoice status may change to `paid` (business rule dependent)
6. `updated_at` timestamp is updated
7. Audit log entry is created recording the payment action
8. Invoice payment information is available for financial exports

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | Must exist, status="issued" | Invoice identifier |
| `payment_method` | String | Yes | Max 64 chars | Payment method (e.g., "cash", "card", "transfer", "check") |
| `paid_at` | DateTime | No | Valid date, not future | Payment date/time (defaults to current time) |
| `external_reference` | String | No | Max 255 chars | External payment reference (transaction ID, check number, etc.) |

**Payment Method Values:**
- Common values: "cash", "card", "transfer", "check", "mb_way", "multibanco"
- System may validate against allowed payment methods list

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Invoice identifier |
| `invoice_number` | String | Invoice number |
| `status` | String | Invoice status ("paid" or "issued") |
| `paid_at` | DateTime | Payment timestamp |
| `payment_method` | String | Payment method |
| `external_reference` | String | External payment reference (nullable) |
| `paid_by` | UUID | User who recorded payment |
| `updated_at` | DateTime | Last update timestamp |

## 7. Main Flow

1. System receives request to mark invoice as paid with `id` and payment data
2. System validates user authentication and role (`Staff`, `Manager`, `Accountant`, or `Owner`)
3. System loads invoice by `id`
4. System verifies invoice exists (return 404 if not found)
5. System verifies invoice status is `issued` (cannot mark draft as paid)
6. System verifies invoice is not already `paid` (unless Manager/Accountant override allowed)
7. System validates `payment_method` is provided and non-empty
8. System validates `payment_method` against allowed values (optional validation)
9. System validates `paid_at` is valid date and not in future if provided
10. System sets `paid_at` to provided value or current timestamp
11. System sets `payment_method` to provided value
12. System sets `external_reference` to provided value (if provided)
13. System sets `paid_by` to current user ID
14. System updates invoice status to `paid` (or keeps `issued` with payment info, business rule dependent)
15. System sets `updated_at` to current timestamp
16. System persists updated invoice record
17. System creates audit log entry with action `mark-paid`, entity_type `Invoice`, entity_id, payment details, and performed_by
18. System returns updated invoice object with payment information

## 8. Alternative Flows

### 8.1. Invoice Not Found
- **Trigger:** Step 4 finds no invoice with given `id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Invoice not found"
  - Use case terminates

### 8.2. Invoice Not Issued
- **Trigger:** Step 5 detects invoice status is not "issued"
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Only issued invoices can be marked as paid"
  - Use case terminates

### 8.3. Invoice Already Paid
- **Trigger:** Step 6 detects invoice is already marked as paid
- **Action:**
  - If user is Manager/Accountant/Owner: Allow override (continue flow)
  - If user is Staff: Return error `409 Conflict`
  - Error message: "Invoice is already marked as paid. Only Manager/Accountant can override"
  - Use case terminates (for Staff)

### 8.4. Missing Payment Method
- **Trigger:** Step 7 detects missing `payment_method`
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Payment method is required"
  - Use case terminates

### 8.5. Invalid Payment Date
- **Trigger:** Step 9 detects invalid or future `paid_at` date
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Payment date must be valid and cannot be in the future"
  - Use case terminates

### 8.6. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Staff, Manager, Accountant, or Owner role can mark invoices as paid"
  - Use case terminates

## 9. Business Rules

**BR1:** Only issued invoices can be marked as paid. Draft invoices must be issued first.

**BR2:** Payment marking is manual. No actual money transfer occurs in the system.

**BR3:** `Staff` can mark invoices as paid. `Manager` and `Accountant` can override existing payments.

**BR4:** Payment information (`payment_method`, `paid_at`, `external_reference`) is required for accounting reconciliation.

**BR5:** `paid_at` defaults to current time if not provided. Cannot be in the future.

**BR6:** Invoice status may change to `paid` or remain `issued` with payment info (business rule dependent).

**BR7:** All payment marking actions must be logged in audit logs for compliance and traceability.

**BR8:** Payment marking does not affect invoice immutability. Issued invoice data cannot be edited.

**BR9:** External reference is optional but recommended for reconciliation (transaction ID, check number, etc.).

**BR10:** Payment method values should be standardized for reporting and exports.

## 10. Validation Rules

1. **Invoice Status Validation:**
   - Must be "issued"
   - Cannot mark draft, cancelled, or refunded invoices as paid

2. **Payment Method Validation:**
   - Must be provided and non-empty
   - Maximum 64 characters
   - May validate against allowed values list

3. **Payment Date Validation:**
   - Must be valid date/time format if provided
   - Cannot be in the future
   - Defaults to current timestamp if not provided

4. **External Reference Validation:**
   - Maximum 255 characters
   - Optional field

5. **User Authorization:**
   - `Staff`: Can mark unpaid invoices as paid
   - `Manager`/`Accountant`/`Owner`: Can mark paid and override existing payments

6. **Already Paid Check:**
   - If invoice already paid and user is Staff: Block operation
   - If invoice already paid and user is Manager/Accountant/Owner: Allow override

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_STATUS` | "Only issued invoices can be marked as paid" | Invoice not in issued status |
| 400 | `MISSING_PAYMENT_METHOD` | "Payment method is required" | Payment method not provided |
| 400 | `INVALID_PAYMENT_DATE` | "Payment date must be valid and cannot be in future" | Invalid payment date |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Staff, Manager, Accountant, or Owner role can mark invoices as paid" | User lacks role |
| 404 | `INVOICE_NOT_FOUND` | "Invoice not found" | Invoice does not exist |
| 409 | `ALREADY_PAID` | "Invoice is already marked as paid" | Invoice already paid (Staff override blocked) |
| 500 | `INTERNAL_ERROR` | "An error occurred while marking invoice as paid" | System error |

## 12. Events Triggered

**Domain Events:**
- `InvoicePaymentRecorded` event is published with payload:
  - `invoice_id` (UUID)
  - `invoice_number` (String)
  - `payment_method` (String)
  - `paid_at` (DateTime)
  - `external_reference` (String, nullable)
  - `recorded_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Invoice", action="mark-paid", payment details

**Integration Events:**
- None (payment recording is manual, no external payment gateway integration)

## 13. Repository Methods Required

**InvoiceRepository Interface:**
- `findById(id: UUID): Promise<Invoice | null>` - Load existing invoice
- `update(invoice: Invoice): Promise<Invoice>` - Persist updated invoice

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user

## 14. Notes or Limitations

1. **Manual Payment:** Payment recording is manual. No actual money transfer occurs. System records payment information only.

2. **Payment Override:** Manager/Accountant can override existing payments. Consider business rules for payment corrections.

3. **Payment Methods:** Payment method values should be standardized. Consider configuration for allowed payment methods.

4. **External Reference:** External reference is critical for reconciliation. Encourage users to provide transaction IDs or check numbers.

5. **Status Management:** Invoice status may remain "issued" with payment info or change to "paid". Clarify business rules.

6. **Audit Trail:** All payment actions must be logged for compliance and reconciliation.

7. **Future Enhancements:** Consider adding:
   - Partial payment support
   - Payment installments
   - Payment reminders
   - Payment history tracking

8. **Business Rule Dependencies:** Payment marking depends on invoice issuance (UC-FIN-002).

9. **Transaction Safety:** Payment marking should be atomic. Use database transactions.

10. **Performance:** Payment marking is frequent operation. Ensure efficient database operations.

