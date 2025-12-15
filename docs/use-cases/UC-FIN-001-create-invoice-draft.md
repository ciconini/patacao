# Use Case UC-FIN-001: Create Invoice (Draft)

## 1. Objective

Create a new invoice in draft status. Draft invoices can be edited before issuance and are used for POS checkout flows and manual invoice creation. Invoice includes line items (products/services), VAT calculation, and links to company, store, and optionally customer.

## 2. Actors and Permissions

**Primary Actor:** Staff, Manager, Accountant

**Secondary Actors:** None

**Required Permissions:**
- Role: `Staff`, `Manager`, `Accountant`, or `Owner`
- Permission: `invoices:create` or `invoices:create:draft`

**Authorization Rules:**
- `Staff` can create draft invoices only
- `Manager`, `Accountant`, and `Owner` can create draft invoices
- System must validate role before allowing invoice creation

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Staff`, `Manager`, `Accountant`, or `Owner` role assigned
3. Company with specified `company_id` exists and has valid NIF
4. Store with specified `store_id` exists and belongs to the company
5. Customer with specified `buyer_customer_id` exists if provided
6. Products/services referenced in lines exist if `product_id`/`service_id` provided
7. System has available storage capacity for new records

## 4. Postconditions

1. A new `Invoice` entity is created with status `draft`
2. Invoice record is persisted in the `invoices` table
3. Invoice lines are created in `invoice_lines` table
4. Invoice totals (subtotal, vat_total, total) are calculated and stored
5. `invoice_number` is generated but not finalized (may be sequential placeholder)
6. `created_at` timestamp is set to current server time
7. `updated_at` is initially set to `created_at`
8. Audit log entry is created recording the creation action
9. Invoice is ready for editing or issuance

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `company_id` | UUID | Yes | Must exist | Company identifier |
| `store_id` | UUID | Yes | Must exist | Store identifier |
| `buyer_customer_id` | UUID | No | Must exist if provided | Customer identifier (buyer) |
| `lines` | Array[Object] | Yes | Min 1 line item | Array of invoice line items |
| `status` | String | No | "draft" only | Invoice status (defaults to "draft") |

**Invoice Line Item Structure:**
```json
{
  "description": "Product or service description",
  "product_id": "UUID (optional)",
  "service_id": "UUID (optional)",
  "quantity": 1,
  "unit_price": 10.00,
  "vat_rate": 23.00
}
```

**Line Item Fields:**
- `description` (String, required): Line item description
- `product_id` (UUID, optional): Product identifier (if product line)
- `service_id` (UUID, optional): Service identifier (if service line)
- `quantity` (Decimal, required): Quantity (min 0.01)
- `unit_price` (Decimal, required): Unit price (min 0.00)
- `vat_rate` (Decimal, required): VAT rate percentage (0.00 to 100.00)

**Note:** Either `product_id` or `service_id` can be provided, but not both. At least one line item must be provided.

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier for the created invoice |
| `company_id` | UUID | Company identifier |
| `store_id` | UUID | Store identifier |
| `invoice_number` | String | Invoice number (may be placeholder for draft) |
| `issued_at` | DateTime | Issue date (null for draft) |
| `buyer_customer_id` | UUID | Customer identifier (nullable) |
| `lines` | Array[Object] | Invoice line items |
| `subtotal` | Decimal | Subtotal (sum of line totals before VAT) |
| `vat_total` | Decimal | Total VAT amount |
| `total` | Decimal | Grand total (subtotal + VAT) |
| `status` | String | Invoice status ("draft") |
| `paid_at` | DateTime | Payment date (null for draft) |
| `payment_method` | String | Payment method (null for draft) |
| `external_reference` | String | External payment reference (null for draft) |
| `created_by` | UUID | User who created the invoice |
| `created_at` | DateTime | Creation timestamp (ISO 8601) |
| `updated_at` | DateTime | Last update timestamp (ISO 8601) |

## 7. Main Flow

1. System receives request to create invoice with input data
2. System validates user authentication and role (`Staff`, `Manager`, `Accountant`, or `Owner`)
3. System validates required fields are present (`company_id`, `store_id`, `lines`)
4. System validates `lines` array contains at least one item
5. System loads company by `company_id` to verify existence and NIF validity
6. System loads store by `store_id` to verify existence and company association
7. System validates store belongs to company
8. System validates customer exists if `buyer_customer_id` provided
9. For each line item:
   - System validates `description` is non-empty
   - System validates `quantity` > 0
   - System validates `unit_price` >= 0
   - System validates `vat_rate` between 0.00 and 100.00
   - System validates either `product_id` or `service_id` provided (not both)
   - System validates product/service exists if ID provided
   - System calculates line total: `quantity * unit_price`
   - System calculates line VAT: `line_total * (vat_rate / 100)`
10. System calculates invoice subtotal: sum of all line totals
11. System calculates invoice VAT total: sum of all line VAT amounts
12. System calculates invoice total: `subtotal + vat_total`
13. System applies Portuguese VAT rounding rules (round to 2 decimal places)
14. System generates UUID for `id`
15. System generates placeholder `invoice_number` (e.g., "DRAFT-{timestamp}" or sequential placeholder)
16. System sets `status` to "draft"
17. System sets `created_by` to current user ID
18. System sets `created_at` and `updated_at` to current timestamp
19. System persists invoice record to `invoices` table
20. System persists invoice line records to `invoice_lines` table
21. System creates audit log entry with action `create`, entity_type `Invoice`, entity_id, and performed_by
22. System returns created invoice object with all fields

## 8. Alternative Flows

### 8.1. Company Not Found
- **Trigger:** Step 5 finds no company with given `company_id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Company not found"
  - Use case terminates

### 8.2. Company NIF Invalid
- **Trigger:** Step 5 detects company has invalid or missing NIF
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Company NIF is invalid or missing. Cannot create invoice"
  - Use case terminates

### 8.3. Store Not Found
- **Trigger:** Step 6 finds no store with given `store_id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Store not found"
  - Use case terminates

### 8.4. Store Not Belonging to Company
- **Trigger:** Step 7 detects store does not belong to company
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Store does not belong to the specified company"
  - Use case terminates

### 8.5. Customer Not Found
- **Trigger:** Step 8 finds no customer with given `buyer_customer_id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Customer not found"
  - Use case terminates

### 8.6. No Line Items
- **Trigger:** Step 4 detects empty `lines` array
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Invoice must have at least one line item"
  - Use case terminates

### 8.7. Invalid Line Item
- **Trigger:** Step 9 detects invalid line item (missing description, invalid quantity/price/VAT)
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Invalid line item: [specific error]"
  - Use case terminates

### 8.8. Product/Service Not Found
- **Trigger:** Step 9 detects product_id or service_id does not exist
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Product/Service with ID [id] not found"
  - Use case terminates

### 8.9. Invalid VAT Rate
- **Trigger:** Step 9 detects VAT rate outside valid range
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "VAT rate must be between 0.00 and 100.00"
  - Use case terminates

### 8.10. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Staff, Manager, Accountant, or Owner role can create invoices"
  - Use case terminates

## 9. Business Rules

**BR1:** Draft invoices can be edited before issuance. Once issued, editing is restricted (see UC-FIN-002).

**BR2:** Invoice must have at least one line item. Empty invoices are not allowed.

**BR3:** VAT calculation follows Portuguese VAT rules. Common rates: 0%, 6%, 13%, 23%.

**BR4:** Invoice totals are calculated automatically from line items. Manual override is not allowed.

**BR5:** `invoice_number` for draft invoices may be a placeholder. Final sequential number is assigned on issuance.

**BR6:** Customer (`buyer_customer_id`) is optional for draft invoices but recommended for proper accounting.

**BR7:** Product/service IDs in lines are optional but recommended for inventory tracking and reporting.

**BR8:** All invoice creation actions must be logged in audit logs for compliance.

**BR9:** Draft invoices do not affect inventory stock. Stock decrement occurs on transaction completion (see UC-FIN-006).

**BR10:** Invoice creation does not generate financial transactions. Transactions are created separately (see UC-FIN-005).

## 10. Validation Rules

1. **Company Validation:**
   - Must exist in `companies` table
   - Must have valid NIF (Portuguese format, 9 digits)

2. **Store Validation:**
   - Must exist in `stores` table
   - Must belong to specified company

3. **Customer Validation (if provided):**
   - Must exist in `customers` table
   - Customer must not be archived (business rule dependent)

4. **Line Items Validation:**
   - Minimum 1 line item required
   - Each line must have:
     - `description`: Non-empty string, max 500 chars
     - `quantity`: Decimal > 0, precision 2 decimal places
     - `unit_price`: Decimal >= 0, precision 2 decimal places
     - `vat_rate`: Decimal between 0.00 and 100.00, precision 2 decimal places
   - Either `product_id` or `service_id` (not both, both optional)
   - Product/service must exist if ID provided

5. **VAT Calculation:**
   - Line VAT: `(quantity * unit_price) * (vat_rate / 100)`
   - Round to 2 decimal places using Portuguese rounding rules
   - Invoice VAT total: sum of all line VAT amounts

6. **Total Calculation:**
   - Line total: `quantity * unit_price`
   - Invoice subtotal: sum of all line totals
   - Invoice total: `subtotal + vat_total`

7. **Status Validation:**
   - Must be "draft" (or defaults to "draft")
   - Cannot create invoice with "issued" status directly

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `MISSING_REQUIRED_FIELD` | "Required field [field] is missing" | Required field not provided |
| 400 | `INVALID_LINES` | "Invoice must have at least one line item" | Empty lines array |
| 400 | `INVALID_LINE_ITEM` | "Invalid line item: [error]" | Line item validation failed |
| 400 | `INVALID_VAT_RATE` | "VAT rate must be between 0.00 and 100.00" | VAT rate outside valid range |
| 400 | `INVALID_QUANTITY` | "Quantity must be greater than 0" | Invalid quantity |
| 400 | `INVALID_PRICE` | "Unit price must be >= 0" | Invalid price |
| 400 | `STORE_COMPANY_MISMATCH` | "Store does not belong to the specified company" | Store/company mismatch |
| 400 | `INVALID_COMPANY_NIF` | "Company NIF is invalid or missing" | Company NIF invalid |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Staff, Manager, Accountant, or Owner role can create invoices" | User lacks role |
| 404 | `COMPANY_NOT_FOUND` | "Company not found" | Company does not exist |
| 404 | `STORE_NOT_FOUND` | "Store not found" | Store does not exist |
| 404 | `CUSTOMER_NOT_FOUND` | "Customer not found" | Customer does not exist |
| 404 | `PRODUCT_NOT_FOUND` | "Product with ID [id] not found" | Product does not exist |
| 404 | `SERVICE_NOT_FOUND` | "Service with ID [id] not found" | Service does not exist |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error |

## 12. Events Triggered

**Domain Events:**
- `InvoiceCreated` event is published with payload:
  - `invoice_id` (UUID)
  - `company_id` (UUID)
  - `store_id` (UUID)
  - `status` (String: "draft")
  - `total` (Decimal)
  - `created_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Invoice", action="create"

**Integration Events:**
- None (draft invoice creation is internal operation)

## 13. Repository Methods Required

**InvoiceRepository Interface:**
- `save(invoice: Invoice): Promise<Invoice>` - Persist new invoice entity
- `findById(id: UUID): Promise<Invoice | null>` - Retrieve by ID

**InvoiceLineRepository Interface:**
- `saveLines(invoiceId: UUID, lines: InvoiceLine[]): Promise<InvoiceLine[]>` - Persist invoice lines

**CompanyRepository Interface:**
- `findById(id: UUID): Promise<Company | null>` - Verify company exists and NIF valid

**StoreRepository Interface:**
- `findById(id: UUID): Promise<Store | null>` - Verify store exists
- `belongsToCompany(storeId: UUID, companyId: UUID): Promise<boolean>` - Verify store-company relationship

**CustomerRepository Interface:**
- `findById(id: UUID): Promise<Customer | null>` - Verify customer exists

**ProductRepository Interface:**
- `findById(id: UUID): Promise<Product | null>` - Verify product exists

**ServiceRepository Interface:**
- `findById(id: UUID): Promise<Service | null>` - Verify service exists

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

## 14. Notes or Limitations

1. **Draft Status:** Draft invoices are editable and do not have final invoice numbers. Final numbering occurs on issuance.

2. **VAT Calculation:** VAT calculation must follow Portuguese rounding rules. Ensure consistent rounding across all calculations.

3. **Transaction Safety:** Invoice creation involves multiple table inserts (invoice + lines). Use database transactions to ensure atomicity.

4. **Performance:** Invoice creation is frequent operation (POS checkout). Ensure efficient database operations and indexing.

5. **Inventory Impact:** Draft invoice creation does not affect inventory. Stock decrement occurs on transaction completion.

6. **Invoice Numbering:** Draft invoices may use placeholder numbers. Sequential numbering is assigned on issuance (see UC-FIN-002).

7. **Future Enhancements:** Consider adding:
   - Discounts per line item
   - Global discounts
   - Payment terms
   - Due dates
   - Recurring invoices

8. **Business Rule Dependencies:** Invoice creation depends on:
   - Administrative module for company/store/customer data
   - Inventory module for product data
   - Services module for service data

9. **Compliance:** Draft invoices are not fiscal documents. Only issued invoices are legally valid.

10. **Error Handling:** Provide detailed error messages for validation failures to enable quick correction.

