# Use Case UC-ADMIN-005: Create Customer

## 1. Objective

Create a new customer record representing a client who owns pets and may book appointments or make purchases. Customer records include contact information and consent flags for marketing and reminders (GDPR compliance).

## 2. Actors and Permissions

**Primary Actor:** Staff, Manager

**Secondary Actors:** None

**Required Permissions:**
- Role: `Staff`, `Manager`, or `Owner`
- Permission: `customers:create`

**Authorization Rules:**
- Users with `Staff`, `Manager`, or `Owner` role can create customers
- System must validate role before allowing customer creation

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Staff`, `Manager`, or `Owner` role assigned
3. System has available storage capacity for new records

## 4. Postconditions

1. A new `Customer` entity is created with a unique UUID `id`
2. Customer record is persisted in the `customers` table
3. `created_at` timestamp is set to current server time
4. `updated_at` is initially set to `created_at`
5. Audit log entry is created recording the creation action
6. Customer is ready to have pets linked and appointments scheduled

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `full_name` | String | Yes | Max 255 chars, non-empty | Customer's full name |
| `email` | String | No | Valid email format, max 255 chars | Customer email address |
| `phone` | String | No | Max 32 chars, valid phone format | Customer phone number |
| `address` | JSON Object | No | Valid address structure | Structured address: `{street: string, city: string, postal_code: string, country?: string}` |
| `consent_marketing` | Boolean | No | true/false | Consent for marketing communications (defaults to false) |
| `consent_reminders` | Boolean | No | true/false | Consent for appointment reminders (defaults to true) |

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
| `id` | UUID | Unique identifier for the created customer |
| `full_name` | String | Customer's full name |
| `email` | String | Email address (nullable) |
| `phone` | String | Phone number (nullable) |
| `address` | JSON Object | Complete address structure (nullable) |
| `consent_marketing` | Boolean | Marketing consent flag |
| `consent_reminders` | Boolean | Reminders consent flag |
| `created_at` | DateTime | Creation timestamp (ISO 8601) |
| `updated_at` | DateTime | Last update timestamp (ISO 8601) |

## 7. Main Flow

1. System receives request to create customer with input data
2. System validates user authentication and role (`Staff`, `Manager`, or `Owner`)
3. System validates required field `full_name` is present
4. System validates `full_name` is non-empty and not whitespace-only
5. System validates `email` format if provided
6. System validates `phone` format if provided
7. System validates `address` JSON structure if provided
8. System sets `consent_marketing` to `false` if not provided (opt-out default)
9. System sets `consent_reminders` to `true` if not provided (opt-in default for reminders)
10. System generates UUID for `id`
11. System sets `created_at` and `updated_at` to current timestamp
12. System persists customer record to `customers` table
13. System creates audit log entry with action `create`, entity_type `Customer`, entity_id, and performed_by
14. System returns created customer object with all fields

## 8. Alternative Flows

### 8.1. Missing Required Field
- **Trigger:** Step 3 detects missing `full_name`
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Required field 'full_name' is missing"
  - Use case terminates

### 8.2. Invalid Name Format
- **Trigger:** Step 4 detects invalid name (empty or whitespace-only)
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Full name cannot be empty"
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

### 8.5. Invalid Address Structure
- **Trigger:** Step 7 detects invalid address JSON
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Address must contain street, city, and postal_code fields"
  - Use case terminates

### 8.6. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Staff, Manager, or Owner role can create customers"
  - Use case terminates

## 9. Business Rules

**BR1:** `consent_marketing` defaults to `false` (opt-out). Customer must explicitly consent to marketing communications (GDPR compliance).

**BR2:** `consent_reminders` defaults to `true` (opt-in). Appointment reminders are considered essential service communications.

**BR3:** `consent_reminders` must be `true` to send appointment reminders by email. System enforces this in Services module.

**BR4:** Customer can have multiple pets linked. Pet creation requires an existing customer (or inline customer creation).

**BR5:** Customer can have multiple appointments. Appointment booking requires an existing customer.

**BR6:** Deleting a customer requires reassigning or deleting linked pets and appointments, or archiving the customer (see UC-ADMIN-007).

**BR7:** All customer creation actions must be logged in audit logs for compliance and GDPR traceability.

**BR8:** Email and phone are optional but at least one contact method is recommended for appointment reminders.

## 10. Validation Rules

1. **Name Validation:**
   - Cannot be empty or whitespace-only
   - Maximum 255 characters
   - Must contain at least one non-whitespace character

2. **Email Validation (if provided):**
   - Must conform to RFC 5322 email format
   - Case-insensitive
   - Maximum 255 characters

3. **Phone Validation (if provided):**
   - Must match Portuguese phone format (optional validation)
   - Format: +351XXXXXXXXX or 9XXXXXXXX
   - Maximum 32 characters

4. **Address Validation (if provided):**
   - `street`: Required if address provided, non-empty string, max 255 chars
   - `city`: Required if address provided, non-empty string, max 128 chars
   - `postal_code`: Required if address provided, Portuguese format (XXXX-XXX), 8 chars
   - `country`: Optional, defaults to "Portugal"

5. **Consent Validation:**
   - `consent_marketing`: Boolean, defaults to `false`
   - `consent_reminders`: Boolean, defaults to `true`

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `MISSING_REQUIRED_FIELD` | "Required field 'full_name' is missing" | Full name not provided |
| 400 | `INVALID_NAME` | "Full name cannot be empty" | Name is empty or whitespace-only |
| 400 | `INVALID_EMAIL` | "Email format is invalid" | Email does not match valid pattern |
| 400 | `INVALID_PHONE` | "Phone format is invalid" | Phone does not match valid pattern |
| 400 | `INVALID_ADDRESS` | "Address structure is invalid" | Address JSON missing required fields |
| 401 | `UNAUTHORIZED` | "Authentication required" | User is not authenticated |
| 403 | `FORBIDDEN` | "Only Staff, Manager, or Owner role can create customers" | User lacks required role |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error during persistence |

## 12. Events Triggered

**Domain Events:**
- `CustomerCreated` event is published with payload:
  - `customer_id` (UUID)
  - `full_name` (String)
  - `email` (String, nullable)
  - `consent_reminders` (Boolean)
  - `created_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Customer", action="create"

**Integration Events:**
- None (customer creation is internal administrative action)

## 13. Repository Methods Required

**CustomerRepository Interface:**
- `save(customer: Customer): Promise<Customer>` - Persist new customer entity
- `findById(id: UUID): Promise<Customer | null>` - Retrieve by ID (for validation)

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user for audit logging

## 14. Notes or Limitations

1. **GDPR Compliance:** Consent flags are critical for GDPR compliance. Ensure consent is explicitly recorded and auditable.

2. **Contact Information:** At least one contact method (email or phone) is recommended but not required. Consider business rules for appointment reminders.

3. **Duplicate Detection:** System does not prevent duplicate customers. Consider adding duplicate detection logic (by email or phone) in future enhancements.

4. **Inline Creation:** Customer creation may occur inline during pet creation or appointment booking. This use case supports standalone creation.

5. **Performance:** Customer creation is frequent operation. Ensure efficient database indexing on `email` and `phone` for search operations.

6. **Data Retention:** Customer data retention follows GDPR requirements. Ensure deletion workflows are available (see UC-ADMIN-007).

7. **Timezone:** All timestamps stored in UTC and converted to Europe/Lisbon for display.

8. **Future Enhancements:** Consider adding:
   - Customer tags/categories
   - Customer notes/history
   - Loyalty program integration
   - Duplicate customer detection and merging

9. **Business Rule Dependencies:** Customer consent flags are used by Services module for reminder sending (BR: reminders require consent_reminders=true).

10. **Validation Flexibility:** Phone and email validation may be relaxed for international customers. Consider business requirements.

