# Use Case UC-ADMIN-002: Update Company Profile

## 1. Objective

Update an existing company/business profile. Allows modification of company information while enforcing role-based restrictions on fiscal fields. Core fiscal fields (NIF, tax_regime) can only be updated by Owner role.

## 2. Actors and Permissions

**Primary Actor:** Owner, Manager

**Secondary Actors:** None

**Required Permissions:**
- Role: `Owner` (for all fields including fiscal)
- Role: `Manager` (for non-fiscal fields only)
- Permission: `companies:update` (general)
- Permission: `companies:update:fiscal` (for fiscal fields, Owner only)

**Authorization Rules:**
- `Owner` role can update all fields including fiscal data (NIF, tax_regime)
- `Manager` role can update non-fiscal fields only (name, address, contact info, default_vat_rate)
- System must validate role and field-level permissions before allowing updates

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Owner` or `Manager` role assigned
3. Company with specified `id` exists in the system
4. Company record is not locked or being processed by another operation

## 4. Postconditions

1. Company entity is updated with new field values
2. `updated_at` timestamp is set to current server time
3. Audit log entry is created recording the update action with before/after values
4. If fiscal fields were changed, system may trigger validation checks for existing invoices (business rule dependent)
5. Company changes are immediately available for use in invoice generation and other operations

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | Must exist | Company identifier |
| `name` | String | No | Max 255 chars, non-empty | Company/business name |
| `nif` | String | No | Portuguese NIF format (9 digits), unique | Portuguese fiscal number (Owner only) |
| `address` | JSON Object | No | Valid address structure | Structured address |
| `tax_regime` | String | No | Max 64 chars | Tax regime identifier (Owner only) |
| `default_vat_rate` | Decimal | No | 0.00 to 100.00, precision 5.2 | Default VAT rate percentage |
| `phone` | String | No | Max 32 chars, valid phone format | Contact phone number |
| `email` | String | No | Valid email format, max 255 chars | Contact email address |
| `website` | String | No | Valid URL format, max 255 chars | Company website URL |

**Note:** All fields are optional in the update request. Only provided fields will be updated.

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Company identifier |
| `name` | String | Updated company name |
| `nif` | String | Updated NIF (if changed) |
| `address` | JSON Object | Updated address structure |
| `tax_regime` | String | Updated tax regime |
| `default_vat_rate` | Decimal | Updated default VAT rate |
| `phone` | String | Updated phone number |
| `email` | String | Updated email address |
| `website` | String | Updated website URL |
| `created_at` | DateTime | Original creation timestamp |
| `updated_at` | DateTime | New update timestamp |

## 7. Main Flow

1. System receives request to update company profile with `id` and input data
2. System validates user authentication
3. System loads existing company record by `id`
4. System verifies company exists (return 404 if not found)
5. System checks user role and determines which fields can be updated
6. For each provided field in input:
   - If field is fiscal (NIF, tax_regime) and user is Manager, skip update and log warning
   - If field is non-fiscal or user is Owner, proceed with validation
7. System validates `nif` format if provided (Owner only)
8. System checks `nif` uniqueness if NIF is being changed
9. System validates `address` JSON structure if provided
10. System validates `email` format if provided
11. System validates `website` URL format if provided
12. System validates `default_vat_rate` range if provided
13. System captures current values for audit log (before state)
14. System applies updates to company entity (only provided fields)
15. System sets `updated_at` to current timestamp
16. System persists updated company record
17. System creates audit log entry with action `update`, before/after values, and performed_by
18. System returns updated company object

## 8. Alternative Flows

### 8.1. Company Not Found
- **Trigger:** Step 4 finds no company with given `id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Company not found"
  - Use case terminates

### 8.2. Manager Attempting Fiscal Field Update
- **Trigger:** Step 6 detects Manager trying to update NIF or tax_regime
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Owner role can update fiscal fields (NIF, tax_regime)"
  - Fiscal fields are ignored, non-fiscal updates proceed if valid
  - Use case continues with allowed fields only

### 8.3. NIF Already Exists (on Change)
- **Trigger:** Step 8 detects duplicate NIF
- **Action:**
  - System returns error `409 Conflict`
  - Error message: "A company with this NIF already exists"
  - Use case terminates

### 8.4. Invalid NIF Format
- **Trigger:** Step 7 fails NIF validation
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "NIF format is invalid"
  - Use case terminates

### 8.5. No Fields Provided
- **Trigger:** Request contains only `id`, no update fields
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "At least one field must be provided for update"
  - Use case terminates

### 8.6. Unauthorized Access
- **Trigger:** Step 2 fails authentication
- **Action:**
  - System returns error `401 Unauthorized`
  - Error message: "Authentication required"
  - Use case terminates

## 9. Business Rules

**BR1:** Only `Owner` role users may update core fiscal fields (`nif`, `tax_regime`). This ensures fiscal integrity.

**BR2:** `Manager` role can update non-fiscal fields (name, address, contact info, `default_vat_rate`) but not fiscal identity.

**BR3:** NIF changes require uniqueness validation. If NIF is changed, it must not conflict with existing companies.

**BR4:** Fiscal field changes may affect existing invoices. System should warn if invoices exist with old fiscal data (business rule dependent on invoice immutability).

**BR5:** All company updates must be logged in audit logs with before/after values for compliance.

**BR6:** Partial updates are allowed. Only provided fields are updated; omitted fields retain existing values.

**BR7:** `updated_at` timestamp is always updated, even if no fields changed (edge case).

## 10. Validation Rules

1. **NIF Validation (if provided and Owner role):**
   - Must be exactly 9 digits
   - Must pass Portuguese NIF checksum algorithm
   - Must be unique if changed

2. **Name Validation (if provided):**
   - Cannot be empty or whitespace-only
   - Maximum 255 characters

3. **Email Validation (if provided):**
   - Must conform to RFC 5322 email format
   - Case-insensitive

4. **Phone Validation (if provided):**
   - Must match Portuguese phone format (optional validation)

5. **Website Validation (if provided):**
   - Must be valid URL format

6. **VAT Rate Validation (if provided):**
   - Must be between 0.00 and 100.00
   - Precision: 2 decimal places

7. **Address Validation (if provided):**
   - Must contain required fields: street, city, postal_code
   - Postal code must match Portuguese format

8. **Role-Based Field Access:**
   - Manager cannot update: `nif`, `tax_regime`
   - Owner can update all fields

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_NIF` | "NIF format is invalid" | NIF does not match Portuguese format |
| 400 | `INVALID_ADDRESS` | "Address structure is invalid" | Address JSON missing required fields |
| 400 | `INVALID_EMAIL` | "Email format is invalid" | Email does not match valid pattern |
| 400 | `INVALID_VAT_RATE` | "VAT rate must be between 0.00 and 100.00" | VAT rate outside valid range |
| 400 | `NO_FIELDS_PROVIDED` | "At least one field must be provided for update" | Update request contains no fields to update |
| 401 | `UNAUTHORIZED` | "Authentication required" | User is not authenticated |
| 403 | `FORBIDDEN_FISCAL_FIELD` | "Only Owner role can update fiscal fields" | Manager attempted to update NIF or tax_regime |
| 404 | `COMPANY_NOT_FOUND` | "Company not found" | Company with specified ID does not exist |
| 409 | `DUPLICATE_NIF` | "A company with this NIF already exists" | NIF already exists in system |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error during update |

## 12. Events Triggered

**Domain Events:**
- `CompanyUpdated` event is published with payload:
  - `company_id` (UUID)
  - `updated_fields` (Array of field names)
  - `updated_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Company", action="update", meta containing before/after values

**Integration Events:**
- None (company update is internal administrative action)

## 13. Repository Methods Required

**CompanyRepository Interface:**
- `findById(id: UUID): Promise<Company | null>` - Load existing company
- `update(company: Company): Promise<Company>` - Persist updated company entity
- `findByNif(nif: string): Promise<Company | null>` - Check NIF uniqueness (excluding current company)

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry with before/after values

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user for audit logging

## 14. Notes or Limitations

1. **Fiscal Field Protection:** Fiscal fields (NIF, tax_regime) are protected to prevent accidental changes that could affect invoice compliance.

2. **Partial Updates:** System supports partial updates. Only provided fields are updated, maintaining existing values for omitted fields.

3. **Audit Trail:** All updates are logged with before/after values for compliance and troubleshooting.

4. **Concurrency:** Consider optimistic locking using `updated_at` timestamp to prevent lost updates if multiple users edit simultaneously.

5. **NIF Change Impact:** Changing NIF may affect existing invoices. Consider business rules for handling historical invoices with old NIF.

6. **Performance:** Company updates are infrequent. No special performance optimizations required.

7. **Validation Order:** Validate role permissions before field validation to provide clear error messages.

8. **GDPR:** Company updates may affect data retention and processing. Ensure compliance with GDPR requirements.

9. **Future Enhancements:** Consider adding version history for company profiles, approval workflows for fiscal changes, and integration with Portuguese tax authority APIs for NIF validation.

10. **Transaction Safety:** Company update should be atomic. Use database transactions to ensure consistency.

