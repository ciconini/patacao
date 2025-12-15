# Use Case UC-ADMIN-001: Create Company Profile

## 1. Objective

Create a new company/business profile with fiscal data required for invoice generation. This establishes the primary business entity that owns stores and defines fiscal settings used across the system.

## 2. Actors and Permissions

**Primary Actor:** Owner

**Secondary Actors:** None

**Required Permissions:**
- Role: `Owner` (exclusive)
- Permission: `companies:create`

**Authorization Rules:**
- Only users with `Owner` role can create company profiles
- System must validate that the authenticated user has `Owner` role before proceeding

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Owner` role assigned
3. No company profile exists for this user's organization (or system allows multiple companies per owner)
4. System has available storage capacity for new records

## 4. Postconditions

1. A new `Company` entity is created with a unique UUID `id`
2. Company record is persisted in the `companies` table
3. `created_at` timestamp is set to current server time
4. `updated_at` is initially set to `created_at`
5. Audit log entry is created recording the creation action
6. Company is ready to have stores associated with it

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | String | Yes | Max 255 chars, non-empty | Company/business name |
| `nif` | String | Yes | Portuguese NIF format (9 digits), unique | Portuguese fiscal number (Número de Identificação Fiscal) |
| `address` | JSON Object | Yes | Valid address structure | Structured address: `{street: string, city: string, postal_code: string, country?: string}` |
| `tax_regime` | String | Yes | Max 64 chars | Tax regime identifier (e.g., "Simplificado", "Normal") |
| `default_vat_rate` | Decimal | No | 0.00 to 100.00, precision 5.2 | Default VAT rate percentage (e.g., 23.00 for 23%) |
| `phone` | String | No | Max 32 chars, valid phone format | Contact phone number |
| `email` | String | No | Valid email format, max 255 chars | Contact email address |
| `website` | String | No | Valid URL format, max 255 chars | Company website URL |

**Address JSON Structure:**
```json
{
  "street": "Rua Example, 123",
  "city": "Lisboa",
  "postal_code": "1000-001",
  "country": "Portugal"
}
```

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier for the created company |
| `name` | String | Company name |
| `nif` | String | Portuguese NIF |
| `address` | JSON Object | Complete address structure |
| `tax_regime` | String | Tax regime |
| `default_vat_rate` | Decimal | Default VAT rate (nullable) |
| `phone` | String | Phone number (nullable) |
| `email` | String | Email address (nullable) |
| `website` | String | Website URL (nullable) |
| `created_at` | DateTime | Creation timestamp (ISO 8601) |
| `updated_at` | DateTime | Last update timestamp (ISO 8601) |

## 7. Main Flow

1. System receives request to create company profile with input data
2. System validates user authentication and `Owner` role
3. System validates all required fields are present
4. System validates `nif` format (9 digits, Portuguese NIF validation algorithm)
5. System checks `nif` uniqueness in database
6. System validates `address` JSON structure contains required fields
7. System validates `email` format if provided
8. System validates `website` URL format if provided
9. System validates `default_vat_rate` is within valid range if provided
10. System generates UUID for `id`
11. System sets `created_at` and `updated_at` to current timestamp
12. System persists company record to `companies` table
13. System creates audit log entry with action `create`, entity_type `Company`, entity_id, and performed_by
14. System returns created company object with all fields

## 8. Alternative Flows

### 8.1. NIF Already Exists
- **Trigger:** Step 5 detects duplicate NIF
- **Action:** 
  - System returns error `409 Conflict`
  - Error message: "A company with this NIF already exists"
  - Use case terminates

### 8.2. Invalid NIF Format
- **Trigger:** Step 4 fails NIF validation
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "NIF format is invalid. Must be 9 digits and pass Portuguese NIF validation"
  - Use case terminates

### 8.3. Missing Required Field
- **Trigger:** Step 3 detects missing required field
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Required field [field_name] is missing"
  - Use case terminates

### 8.4. Invalid Address Structure
- **Trigger:** Step 6 detects invalid address JSON
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Address must contain street, city, and postal_code fields"
  - Use case terminates

### 8.5. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Owner role can create company profiles"
  - Use case terminates

## 9. Business Rules

**BR1:** NIF must be unique across all companies in the system. Duplicate NIFs are not allowed.

**BR2:** NIF must validate against Portuguese NIF format (9 digits) and pass checksum validation algorithm.

**BR3:** Only `Owner` role users may create company profiles. This is a security constraint.

**BR4:** Company creation automatically establishes the fiscal entity that will be used for invoice generation.

**BR5:** `default_vat_rate` is optional but recommended. If not provided, individual products/services must specify VAT rates.

**BR6:** Address structure must include at minimum: street, city, and postal_code. Country defaults to "Portugal" if not specified.

**BR7:** All company creation actions must be logged in audit logs for compliance and traceability.

## 10. Validation Rules

1. **NIF Validation:**
   - Must be exactly 9 digits
   - Must pass Portuguese NIF checksum algorithm
   - Cannot be all zeros or all same digit

2. **Name Validation:**
   - Cannot be empty or whitespace-only
   - Maximum 255 characters
   - Must contain at least one non-whitespace character

3. **Email Validation:**
   - Must conform to RFC 5322 email format if provided
   - Case-insensitive uniqueness check (if system enforces unique emails per company)

4. **Phone Validation:**
   - Must match Portuguese phone format if provided (optional validation)
   - Format: +351XXXXXXXXX or 9XXXXXXXX

5. **Website Validation:**
   - Must be valid URL format (http:// or https://)
   - Must be resolvable domain (optional check)

6. **VAT Rate Validation:**
   - Must be between 0.00 and 100.00
   - Precision: 2 decimal places
   - Common Portuguese VAT rates: 0%, 6%, 13%, 23%

7. **Address Validation:**
   - `street`: Required, non-empty string, max 255 chars
   - `city`: Required, non-empty string, max 128 chars
   - `postal_code`: Required, Portuguese format (XXXX-XXX), 8 chars
   - `country`: Optional, defaults to "Portugal"

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_NIF` | "NIF format is invalid" | NIF does not match Portuguese format or fails checksum |
| 400 | `MISSING_REQUIRED_FIELD` | "Required field [field] is missing" | One or more required fields are not provided |
| 400 | `INVALID_ADDRESS` | "Address structure is invalid" | Address JSON missing required fields or invalid format |
| 400 | `INVALID_EMAIL` | "Email format is invalid" | Email does not match valid email pattern |
| 400 | `INVALID_VAT_RATE` | "VAT rate must be between 0.00 and 100.00" | VAT rate outside valid range |
| 401 | `UNAUTHORIZED` | "Authentication required" | User is not authenticated |
| 403 | `FORBIDDEN` | "Only Owner role can create company profiles" | User lacks required role/permission |
| 409 | `DUPLICATE_NIF` | "A company with this NIF already exists" | NIF already exists in system |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error during persistence or processing |

## 12. Events Triggered

**Domain Events:**
- `CompanyCreated` event is published with payload:
  - `company_id` (UUID)
  - `nif` (String)
  - `name` (String)
  - `created_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Company", action="create"

**Integration Events:**
- None (company creation is internal administrative action)

## 13. Repository Methods Required

**CompanyRepository Interface:**
- `save(company: Company): Promise<Company>` - Persist new company entity
- `findByNif(nif: string): Promise<Company | null>` - Check NIF uniqueness
- `findById(id: UUID): Promise<Company | null>` - Retrieve by ID (for validation)

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user for audit logging

## 14. Notes or Limitations

1. **Single Company Limitation:** The system may be designed to support only one company per installation. If so, this use case should check if a company already exists and return an error.

2. **NIF Validation:** Portuguese NIF validation requires implementing the official checksum algorithm. Consider using a validated library or service.

3. **Fiscal Compliance:** Company creation establishes fiscal identity. Ensure all fiscal fields are accurate as they will be used in invoice generation.

4. **Timezone:** All timestamps should be stored in UTC and converted to Europe/Lisbon timezone for display.

5. **Address Format:** Address is stored as JSON for flexibility. Consider future internationalization needs.

6. **Default VAT Rate:** If `default_vat_rate` is not provided, the system should use product/service-specific VAT rates. Consider business rules for VAT application.

7. **Concurrency:** No explicit locking required for company creation as NIF uniqueness check handles conflicts.

8. **Performance:** Company creation is infrequent operation. No special performance optimizations required.

9. **GDPR:** Company data may contain personal information of business owners. Ensure GDPR compliance for data storage and processing.

10. **Future Enhancements:** Consider adding support for multiple tax regimes, VAT exemptions, and international address formats.

