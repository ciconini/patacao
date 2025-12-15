# Use Case UC-INV-008: Create Supplier

## 1. Objective

Create a new supplier record with contact information and default lead time. Suppliers are used for purchase order management and product supplier references.

## 2. Actors and Permissions

**Primary Actor:** Manager

**Secondary Actors:** Owner

**Required Permissions:**
- Role: `Manager` or `Owner`
- Permission: `suppliers:create`

**Authorization Rules:**
- Only `Manager` or `Owner` can create suppliers
- `Staff` role cannot create suppliers
- System must validate role before allowing supplier creation

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Manager` or `Owner` role assigned
3. System has available storage capacity for new records

## 4. Postconditions

1. A new `Supplier` entity is created with a unique UUID `id`
2. Supplier record is persisted in the `suppliers` table
3. `created_at` timestamp is set to current server time
4. `updated_at` is initially set to `created_at`
5. Audit log entry is created recording the creation action
6. Supplier is ready to be referenced in products and purchase orders

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | String | Yes | Max 255 chars, non-empty | Supplier name |
| `contact_email` | String | No | Valid email format, max 255 chars | Contact email address |
| `phone` | String | No | Max 32 chars, valid phone format | Contact phone number |
| `default_lead_time_days` | Integer | No | >= 0 | Default lead time in days for reorder calculations |

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier for the created supplier |
| `name` | String | Supplier name |
| `contact_email` | String | Contact email (nullable) |
| `phone` | String | Contact phone number (nullable) |
| `default_lead_time_days` | Integer | Default lead time in days (nullable) |
| `created_at` | DateTime | Creation timestamp (ISO 8601) |
| `updated_at` | DateTime | Last update timestamp (ISO 8601) |

## 7. Main Flow

1. System receives request to create supplier with input data
2. System validates user authentication and role (`Manager` or `Owner`)
3. System validates required field `name` is present
4. System validates `name` is non-empty and not whitespace-only
5. System validates `contact_email` format if provided
6. System validates `phone` format if provided
7. System validates `default_lead_time_days` >= 0 if provided
8. System generates UUID for `id`
9. System sets `created_at` and `updated_at` to current timestamp
10. System persists supplier record to `suppliers` table
11. System creates audit log entry with action `create`, entity_type `Supplier`, entity_id, and performed_by
12. System returns created supplier object with all fields

## 8. Alternative Flows

### 8.1. Missing Required Field
- **Trigger:** Step 3 detects missing `name`
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Required field 'name' is missing"
  - Use case terminates

### 8.2. Invalid Name Format
- **Trigger:** Step 4 detects invalid name (empty or whitespace-only)
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Supplier name cannot be empty"
  - Use case terminates

### 8.3. Invalid Email Format
- **Trigger:** Step 5 detects invalid email format
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Email format is invalid"
  - Use case terminates

### 8.4. Invalid Phone Format
- **Trigger:** Step 6 detects invalid phone format
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Phone format is invalid"
  - Use case terminates

### 8.5. Invalid Lead Time
- **Trigger:** Step 7 detects `default_lead_time_days` < 0
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Default lead time must be >= 0"
  - Use case terminates

### 8.6. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Manager or Owner role can create suppliers"
  - Use case terminates

## 9. Business Rules

**BR1:** Supplier name is required and must be unique (business rule dependent - may allow duplicate names).

**BR2:** Contact information (email, phone) is optional but recommended for purchase order communication.

**BR3:** Default lead time is used for reorder quantity calculations and low-stock alert suggestions.

**BR4:** All supplier creation actions must be logged in audit logs for compliance.

**BR5:** Suppliers can be referenced by multiple products and purchase orders.

**BR6:** Supplier deletion may be restricted if referenced by products or purchase orders (business rule dependent).

## 10. Validation Rules

1. **Name Validation:**
   - Cannot be empty or whitespace-only
   - Maximum 255 characters
   - Must contain at least one non-whitespace character
   - Uniqueness check (business rule dependent)

2. **Email Validation (if provided):**
   - Must conform to RFC 5322 email format
   - Case-insensitive
   - Maximum 255 characters

3. **Phone Validation (if provided):**
   - Must match Portuguese phone format (optional validation)
   - Format: +351XXXXXXXXX or 9XXXXXXXX
   - Maximum 32 characters

4. **Lead Time Validation (if provided):**
   - Must be integer >= 0
   - Represents days (e.g., 7 = 7 days lead time)

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `MISSING_REQUIRED_FIELD` | "Required field 'name' is missing" | Name not provided |
| 400 | `INVALID_NAME` | "Supplier name cannot be empty" | Name is empty or whitespace-only |
| 400 | `INVALID_EMAIL` | "Email format is invalid" | Email does not match valid pattern |
| 400 | `INVALID_PHONE` | "Phone format is invalid" | Phone does not match valid pattern |
| 400 | `INVALID_LEAD_TIME` | "Default lead time must be >= 0" | Lead time is negative |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Manager or Owner role can create suppliers" | User lacks required role |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error during persistence |

## 12. Events Triggered

**Domain Events:**
- `SupplierCreated` event is published with payload:
  - `supplier_id` (UUID)
  - `name` (String)
  - `created_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Supplier", action="create"

**Integration Events:**
- None (supplier creation is internal administrative action)

## 13. Repository Methods Required

**SupplierRepository Interface:**
- `save(supplier: Supplier): Promise<Supplier>` - Persist new supplier entity
- `findById(id: UUID): Promise<Supplier | null>` - Retrieve by ID (for validation)

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user for audit logging

## 14. Notes or Limitations

1. **Name Uniqueness:** Supplier name uniqueness may or may not be enforced. Consider business rules for duplicate supplier names.

2. **Contact Information:** Email and phone are optional but recommended for purchase order communication and supplier management.

3. **Lead Time:** Default lead time is used for reorder calculations. Consider business rules for supplier-specific lead times vs product-specific lead times.

4. **Performance:** Supplier creation is infrequent. No special performance optimizations required.

5. **Data Retention:** Supplier data retention follows general data retention policies. Ensure GDPR compliance if supplier data contains personal information.

6. **Future Enhancements:** Consider adding:
   - Supplier address information
   - Supplier payment terms
   - Supplier rating/performance tracking
   - Supplier contact person details
   - Supplier tax information (NIF for Portuguese suppliers)

7. **Business Rule Dependencies:** Supplier creation is used by:
   - Product management (supplier reference)
   - Purchase order management (supplier selection)

8. **Transaction Safety:** Supplier creation should be atomic. Use database transactions to ensure consistency.

9. **Validation Flexibility:** Phone and email validation may be relaxed for international suppliers. Consider business requirements.

10. **Audit Trail:** All supplier creation actions must be logged for compliance and troubleshooting.

