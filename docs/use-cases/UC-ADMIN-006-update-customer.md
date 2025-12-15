# Use Case UC-ADMIN-006: Update Customer

## 1. Objective

Update an existing customer's information including contact details, address, and consent flags. Updates to consent flags affect marketing communications and appointment reminders.

## 2. Actors and Permissions

**Primary Actor:** Staff, Manager

**Secondary Actors:** None

**Required Permissions:**
- Role: `Staff`, `Manager`, or `Owner`
- Permission: `customers:update`

**Authorization Rules:**
- Users with `Staff`, `Manager`, or `Owner` role can update customers
- System must validate role before allowing customer updates

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Staff`, `Manager`, or `Owner` role assigned
3. Customer with specified `id` exists in the system
4. Customer record is not locked or being processed by another operation

## 4. Postconditions

1. Customer entity is updated with new field values
2. `updated_at` timestamp is set to current server time
3. Audit log entry is created recording the update action with before/after values
4. If consent flags changed, system may update communication preferences (business rule dependent)
5. Customer changes are immediately available for use in appointments and transactions

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | Must exist | Customer identifier |
| `full_name` | String | No | Max 255 chars, non-empty | Customer's full name |
| `email` | String | No | Valid email format, max 255 chars | Customer email address |
| `phone` | String | No | Max 32 chars, valid phone format | Customer phone number |
| `address` | JSON Object | No | Valid address structure | Structured address |
| `consent_marketing` | Boolean | No | true/false | Consent for marketing communications |
| `consent_reminders` | Boolean | No | true/false | Consent for appointment reminders |

**Note:** All fields are optional in the update request. Only provided fields will be updated.

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Customer identifier |
| `full_name` | String | Updated full name |
| `email` | String | Updated email address (nullable) |
| `phone` | String | Updated phone number (nullable) |
| `address` | JSON Object | Updated address structure (nullable) |
| `consent_marketing` | Boolean | Updated marketing consent flag |
| `consent_reminders` | Boolean | Updated reminders consent flag |
| `created_at` | DateTime | Original creation timestamp |
| `updated_at` | DateTime | New update timestamp |

## 7. Main Flow

1. System receives request to update customer with `id` and input data
2. System validates user authentication
3. System loads existing customer record by `id`
4. System verifies customer exists (return 404 if not found)
5. System checks user role (`Staff`, `Manager`, or `Owner`)
6. For each provided field in input, validate according to field rules
7. System validates `full_name` is non-empty if provided
8. System validates `email` format if provided
9. System validates `phone` format if provided
10. System validates `address` JSON structure if provided
11. System validates `consent_marketing` is boolean if provided
12. System validates `consent_reminders` is boolean if provided
13. System captures current values for audit log (before state)
14. System applies updates to customer entity (only provided fields)
15. System sets `updated_at` to current timestamp
16. System persists updated customer record
17. System creates audit log entry with action `update`, before/after values, and performed_by
18. System returns updated customer object

## 8. Alternative Flows

### 8.1. Customer Not Found
- **Trigger:** Step 4 finds no customer with given `id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Customer not found"
  - Use case terminates

### 8.2. Invalid Name Format
- **Trigger:** Step 7 detects invalid name (empty or whitespace-only)
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Full name cannot be empty"
  - Use case terminates

### 8.3. Invalid Email Format
- **Trigger:** Step 8 detects invalid email format
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Email format is invalid"
  - Use case terminates

### 8.4. Invalid Phone Format
- **Trigger:** Step 9 detects invalid phone format
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Phone format is invalid"
  - Use case terminates

### 8.5. Invalid Address Structure
- **Trigger:** Step 10 detects invalid address JSON
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Address must contain street, city, and postal_code fields"
  - Use case terminates

### 8.6. No Fields Provided
- **Trigger:** Request contains only `id`, no update fields
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "At least one field must be provided for update"
  - Use case terminates

### 8.7. Unauthorized Access
- **Trigger:** Step 2 fails authentication
- **Action:**
  - System returns error `401 Unauthorized`
  - Error message: "Authentication required"
  - Use case terminates

## 9. Business Rules

**BR1:** Partial updates are allowed. Only provided fields are updated; omitted fields retain existing values.

**BR2:** Consent flag changes affect future communications. If `consent_reminders` is set to `false`, future appointment reminders will not be sent.

**BR3:** Consent flag changes must be logged in audit logs for GDPR compliance and traceability.

**BR4:** Email and phone updates do not affect existing appointments or transactions. Historical records retain original contact information.

**BR5:** All customer updates must be logged in audit logs with before/after values for compliance.

**BR6:** `updated_at` timestamp is always updated, even if no fields changed (edge case).

**BR7:** Customer updates do not cascade to linked pets. Pet records maintain their own data.

## 10. Validation Rules

1. **Name Validation (if provided):**
   - Cannot be empty or whitespace-only
   - Maximum 255 characters

2. **Email Validation (if provided):**
   - Must conform to RFC 5322 email format
   - Case-insensitive
   - Maximum 255 characters

3. **Phone Validation (if provided):**
   - Must match Portuguese phone format (optional validation)
   - Maximum 32 characters

4. **Address Validation (if provided):**
   - Must contain required fields: street, city, postal_code
   - Postal code must match Portuguese format

5. **Consent Validation (if provided):**
   - Must be boolean value (true/false)
   - Cannot be null

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_NAME` | "Full name cannot be empty" | Name is empty or whitespace-only |
| 400 | `INVALID_EMAIL` | "Email format is invalid" | Email does not match valid pattern |
| 400 | `INVALID_PHONE` | "Phone format is invalid" | Phone does not match valid pattern |
| 400 | `INVALID_ADDRESS` | "Address structure is invalid" | Address JSON missing required fields |
| 400 | `NO_FIELDS_PROVIDED` | "At least one field must be provided for update" | No fields to update |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Staff, Manager, or Owner role can update customers" | User lacks required role |
| 404 | `CUSTOMER_NOT_FOUND` | "Customer not found" | Customer does not exist |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error |

## 12. Events Triggered

**Domain Events:**
- `CustomerUpdated` event is published with payload:
  - `customer_id` (UUID)
  - `updated_fields` (Array of field names)
  - `consent_changes` (Object with consent flag changes, if any)
  - `updated_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Customer", action="update", meta containing before/after values

**Integration Events:**
- None (customer update is internal administrative action)

## 13. Repository Methods Required

**CustomerRepository Interface:**
- `findById(id: UUID): Promise<Customer | null>` - Load existing customer
- `update(customer: Customer): Promise<Customer>` - Persist updated customer entity

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry with before/after values

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user for audit logging

## 14. Notes or Limitations

1. **GDPR Compliance:** Consent flag updates are critical for GDPR compliance. Ensure all consent changes are logged and auditable.

2. **Partial Updates:** System supports partial updates. Only provided fields are updated.

3. **Audit Trail:** All updates are logged with before/after values for compliance and troubleshooting.

4. **Concurrency:** Consider optimistic locking using `updated_at` timestamp to prevent lost updates.

5. **Consent Impact:** Changing `consent_reminders` to `false` affects future appointment reminders. Consider notifying customer or staff.

6. **Performance:** Customer updates are frequent operations. Ensure efficient database operations.

7. **Data Integrity:** Customer updates do not cascade to linked entities (pets, appointments). Historical records maintain original data.

8. **Future Enhancements:** Consider adding:
   - Customer history/notes tracking
   - Bulk update capabilities
   - Customer merge functionality
   - Consent change notifications

9. **Business Rule Dependencies:** Consent flags are used by Services module for reminder sending.

10. **Transaction Safety:** Customer update should be atomic. Use database transactions to ensure consistency.

