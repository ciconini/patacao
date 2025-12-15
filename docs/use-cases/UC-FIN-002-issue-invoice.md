# Use Case UC-FIN-002: Issue Invoice

## 1. Objective

Issue a draft invoice, making it a legally valid fiscal document. Issuance validates fiscal fields (NIF, invoice numbering), assigns sequential invoice number, sets issue date, and changes status to "issued". Once issued, invoice editing is restricted and void/credit-note flows are required for corrections.

## 2. Actors and Permissions

**Primary Actor:** Manager, Accountant

**Secondary Actors:** None

**Required Permissions:**
- Role: `Manager`, `Accountant`, or `Owner`
- Permission: `invoices:issue`

**Authorization Rules:**
- Only `Manager`, `Accountant`, or `Owner` can issue invoices
- `Staff` role cannot issue invoices (can only create drafts)
- System must validate role and fiscal requirements before allowing issuance

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Manager`, `Accountant`, or `Owner` role assigned
3. Invoice with specified `id` exists in the system
4. Invoice status is `draft`
5. Company has valid NIF (Portuguese format, validated)
6. Invoice has at least one line item
7. Sequential invoice number can be generated (no conflicts)

## 4. Postconditions

1. Invoice status is changed from `draft` to `issued`
2. Sequential `invoice_number` is assigned (validated for uniqueness)
3. `issued_at` timestamp is set to current server time
4. Invoice becomes immutable (editing restricted)
5. Invoice is legally valid fiscal document
6. `updated_at` timestamp is updated
7. Audit log entry is created recording the issuance action
8. Invoice is ready for payment recording or export

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | Must exist, status="draft" | Invoice identifier |

**Note:** No additional input fields required. System validates and assigns invoice number automatically.

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Invoice identifier |
| `company_id` | UUID | Company identifier |
| `store_id` | UUID | Store identifier |
| `invoice_number` | String | Sequential invoice number (finalized) |
| `issued_at` | DateTime | Issue timestamp (ISO 8601) |
| `buyer_customer_id` | UUID | Customer identifier (nullable) |
| `lines` | Array[Object] | Invoice line items |
| `subtotal` | Decimal | Subtotal |
| `vat_total` | Decimal | Total VAT amount |
| `total` | Decimal | Grand total |
| `status` | String | Invoice status ("issued") |
| `created_by` | UUID | User who created the invoice |
| `issued_by` | UUID | User who issued the invoice |
| `created_at` | DateTime | Creation timestamp |
| `updated_at` | DateTime | Last update timestamp |

## 7. Main Flow

1. System receives request to issue invoice with `id`
2. System validates user authentication and role (`Manager`, `Accountant`, or `Owner`)
3. System loads invoice by `id`
4. System verifies invoice exists (return 404 if not found)
5. System verifies invoice status is `draft` (return 400 if not draft)
6. System loads company associated with invoice
7. System validates company NIF exists and is valid Portuguese format
8. System validates company NIF passes Portuguese NIF checksum algorithm
9. System verifies invoice has at least one line item
10. System generates sequential invoice number:
    - System determines invoice number sequence (per company/store configuration)
    - System checks for next available invoice number
    - System validates invoice number uniqueness
    - System assigns invoice number to invoice
11. System sets `status` to "issued"
12. System sets `issued_at` to current timestamp
13. System sets `issued_by` to current user ID (optional field)
14. System sets `updated_at` to current timestamp
15. System persists updated invoice record
16. System creates audit log entry with action `issue`, entity_type `Invoice`, entity_id, before/after status, and performed_by
17. System returns issued invoice object with finalized invoice number

## 8. Alternative Flows

### 8.1. Invoice Not Found
- **Trigger:** Step 4 finds no invoice with given `id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Invoice not found"
  - Use case terminates

### 8.2. Invoice Not in Draft Status
- **Trigger:** Step 5 detects invoice status is not "draft"
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Invoice is not in draft status. Only draft invoices can be issued"
  - Use case terminates

### 8.3. Company NIF Invalid
- **Trigger:** Step 7 or 8 detects invalid or missing NIF
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Company NIF is invalid or missing. Cannot issue invoice without valid NIF"
  - Use case terminates

### 8.4. Invoice Number Conflict
- **Trigger:** Step 10 detects invoice number already exists
- **Action:**
  - System retries with next sequential number
  - If retry fails multiple times, return error `500 Internal Server Error`
  - Error message: "Failed to generate unique invoice number"
  - Use case terminates

### 8.5. No Line Items
- **Trigger:** Step 9 detects invoice has no line items
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Invoice must have at least one line item before issuance"
  - Use case terminates

### 8.6. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Manager, Accountant, or Owner role can issue invoices"
  - Use case terminates

### 8.7. Database Error
- **Trigger:** Step 15 encounters database error during persistence
- **Action:**
  - System returns error `500 Internal Server Error`
  - Error message: "An error occurred while issuing the invoice"
  - Use case terminates

## 9. Business Rules

**BR1:** Invoice cannot be issued without valid company NIF. System must validate NIF format and checksum before issuance.

**BR2:** Invoice numbering must be sequential per company/store configuration. Numbers must be unique and non-gappable (business rule dependent).

**BR3:** Once issued, invoice becomes immutable. Editing is restricted; void/credit-note flows are required for corrections.

**BR4:** Only `Manager`, `Accountant`, or `Owner` can issue invoices. `Staff` can create drafts but cannot issue.

**BR5:** Invoice issuance date (`issued_at`) is set to current server time. Cannot be backdated (business rule dependent).

**BR6:** Issued invoices are legally valid fiscal documents. Must comply with Portuguese fiscal requirements.

**BR7:** All invoice issuance actions must be logged in audit logs with before/after status for compliance.

**BR8:** Invoice number assignment must be atomic to prevent conflicts. Use database transactions or locking.

**BR9:** Issued invoices cannot be deleted. Only void operations are allowed (see UC-FIN-004).

**BR10:** Invoice issuance does not affect payment status. Payment is recorded separately (see UC-FIN-003).

## 10. Validation Rules

1. **Invoice Status Validation:**
   - Must be "draft"
   - Cannot issue already issued, paid, cancelled, or refunded invoices

2. **Company NIF Validation:**
   - Must exist and be non-empty
   - Must be exactly 9 digits
   - Must pass Portuguese NIF checksum algorithm
   - Cannot be all zeros or all same digit

3. **Invoice Number Generation:**
   - Must be sequential (per company/store configuration)
   - Must be unique across all issued invoices
   - Format may include prefix (e.g., "INV-2024-001")
   - Cannot contain gaps (business rule dependent)

4. **Line Items Validation:**
   - Invoice must have at least one line item
   - All line items must be valid (from draft creation)

5. **Date Validation:**
   - `issued_at` is set to current server time
   - Cannot be in the future
   - Timezone: UTC (converted to Europe/Lisbon for display)

6. **User Authorization:**
   - Must have `Manager`, `Accountant`, or `Owner` role
   - Permission check: `invoices:issue`

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_STATUS` | "Invoice is not in draft status" | Invoice cannot be issued |
| 400 | `INVALID_COMPANY_NIF` | "Company NIF is invalid or missing" | Company NIF validation failed |
| 400 | `NO_LINE_ITEMS` | "Invoice must have at least one line item" | Invoice has no lines |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Manager, Accountant, or Owner role can issue invoices" | User lacks role |
| 404 | `INVOICE_NOT_FOUND` | "Invoice not found" | Invoice does not exist |
| 500 | `INVOICE_NUMBER_CONFLICT` | "Failed to generate unique invoice number" | Invoice number generation failed |
| 500 | `INTERNAL_ERROR` | "An error occurred while issuing the invoice" | System error |

## 12. Events Triggered

**Domain Events:**
- `InvoiceIssued` event is published with payload:
  - `invoice_id` (UUID)
  - `invoice_number` (String)
  - `company_id` (UUID)
  - `store_id` (UUID)
  - `total` (Decimal)
  - `issued_by` (User ID)
  - `issued_at` (DateTime)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Invoice", action="issue", before_status="draft", after_status="issued"

**Integration Events:**
- None (invoice issuance is internal operation, but may trigger external notifications in future)

## 13. Repository Methods Required

**InvoiceRepository Interface:**
- `findById(id: UUID): Promise<Invoice | null>` - Load existing invoice
- `update(invoice: Invoice): Promise<Invoice>` - Persist updated invoice
- `generateInvoiceNumber(companyId: UUID, storeId: UUID): Promise<string>` - Generate sequential invoice number
- `findByInvoiceNumber(invoiceNumber: string, companyId: UUID): Promise<Invoice | null>` - Check number uniqueness

**CompanyRepository Interface:**
- `findById(id: UUID): Promise<Company | null>` - Load company and validate NIF

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user

## 14. Notes or Limitations

1. **Invoice Numbering:** Sequential numbering must be atomic to prevent conflicts. Consider database sequences or optimistic locking.

2. **NIF Validation:** Portuguese NIF validation requires implementing checksum algorithm. Consider using validated library.

3. **Immutability:** Once issued, invoice becomes immutable. Ensure proper access controls prevent editing.

4. **Fiscal Compliance:** Issued invoices must comply with Portuguese fiscal requirements. Ensure all required fields are present.

5. **Transaction Safety:** Invoice issuance should be atomic. Use database transactions to ensure consistency.

6. **Performance:** Invoice issuance is frequent operation. Ensure efficient invoice number generation.

7. **Audit Trail:** All issuance actions must be logged for compliance and troubleshooting.

8. **Future Enhancements:** Consider adding:
   - Invoice number prefixes/suffixes
   - Custom numbering sequences per store
   - Backdating support (with proper authorization)
   - Electronic invoice generation (XML format)

9. **Business Rule Dependencies:** Invoice issuance depends on:
   - Administrative module for company NIF validation
   - Proper invoice draft creation (UC-FIN-001)

10. **Error Recovery:** If invoice number generation fails, system should retry with next number. Consider retry limits.

