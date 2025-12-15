# Use Case UC-ADMIN-004: Update Store

## 1. Objective

Update an existing store's information including name, address, contact details, opening hours, and timezone. Opening hours changes may affect existing appointments and staff schedules.

## 2. Actors and Permissions

**Primary Actor:** Owner, Manager

**Secondary Actors:** None

**Required Permissions:**
- Role: `Owner` or `Manager`
- Permission: `stores:update`

**Authorization Rules:**
- Users with `Owner` or `Manager` role can update stores
- User must have access to the store's company
- System must validate company access before allowing updates

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Owner` or `Manager` role assigned
3. Store with specified `id` exists in the system
4. User has access to the store's company
5. Store record is not locked or being processed by another operation

## 4. Postconditions

1. Store entity is updated with new field values
2. `updated_at` timestamp is set to current server time
3. Audit log entry is created recording the update action with before/after values
4. If opening hours changed, system may validate existing appointments against new hours (business rule dependent)
5. Store changes are immediately available for appointment scheduling and other operations

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | Must exist | Store identifier |
| `name` | String | No | Max 255 chars, non-empty | Store name/location identifier |
| `address` | JSON Object | No | Valid address structure | Structured address |
| `email` | String | No | Valid email format, max 255 chars | Store contact email |
| `phone` | String | No | Max 32 chars, valid phone format | Store contact phone number |
| `opening_hours` | JSON Object | No | Valid weekly schedule structure | Weekly opening hours schedule |
| `timezone` | String | No | Valid IANA timezone | Timezone identifier |

**Note:** All fields are optional in the update request. Only provided fields will be updated.

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Store identifier |
| `company_id` | UUID | Company identifier (unchanged) |
| `name` | String | Updated store name |
| `address` | JSON Object | Updated address structure |
| `email` | String | Updated email address |
| `phone` | String | Updated phone number |
| `opening_hours` | JSON Object | Updated opening hours schedule |
| `timezone` | String | Updated timezone identifier |
| `created_at` | DateTime | Original creation timestamp |
| `updated_at` | DateTime | New update timestamp |

## 7. Main Flow

1. System receives request to update store with `id` and input data
2. System validates user authentication
3. System loads existing store record by `id`
4. System verifies store exists (return 404 if not found)
5. System loads company associated with store
6. System verifies user has access to the company
7. System checks user role (Owner or Manager)
8. For each provided field in input, validate according to field rules
9. System validates `opening_hours` JSON structure if provided (all 7 days, time format)
10. System validates time format in opening_hours if provided
11. System validates that close time is after open time for each day (if not closed)
12. System validates `address` JSON structure if provided
13. System validates `email` format if provided
14. System validates `phone` format if provided
15. System validates `timezone` is valid IANA timezone if provided
16. System captures current values for audit log (before state)
17. System applies updates to store entity (only provided fields)
18. System sets `updated_at` to current timestamp
19. System persists updated store record
20. System creates audit log entry with action `update`, before/after values, and performed_by
21. System returns updated store object

## 8. Alternative Flows

### 8.1. Store Not Found
- **Trigger:** Step 4 finds no store with given `id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Store not found"
  - Use case terminates

### 8.2. User Lacks Company Access
- **Trigger:** Step 6 determines user cannot access the store's company
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "You do not have access to this store's company"
  - Use case terminates

### 8.3. Invalid Opening Hours Structure
- **Trigger:** Step 9 detects invalid opening_hours JSON
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Opening hours must contain all 7 days of week"
  - Use case terminates

### 8.4. Invalid Time Format
- **Trigger:** Step 10 detects invalid time format
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Time must be in HH:MM format (24-hour)"
  - Use case terminates

### 8.5. Close Time Before Open Time
- **Trigger:** Step 11 detects close time before open time
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Close time must be after open time for [day]"
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

**BR1:** Store updates must maintain referential integrity. `company_id` cannot be changed (would require separate use case or business process).

**BR2:** Opening hours changes may affect existing appointments. System should warn if appointments exist outside new opening hours (business rule dependent).

**BR3:** Staff schedules cannot place staff outside store opening hours. If opening hours are reduced, validate staff schedules.

**BR4:** Partial updates are allowed. Only provided fields are updated; omitted fields retain existing values.

**BR5:** All store updates must be logged in audit logs with before/after values for compliance.

**BR6:** Timezone changes affect appointment scheduling calculations. System should handle timezone conversions correctly.

**BR7:** `updated_at` timestamp is always updated, even if no fields changed (edge case).

## 10. Validation Rules

1. **Name Validation (if provided):**
   - Cannot be empty or whitespace-only
   - Maximum 255 characters

2. **Opening Hours Validation (if provided):**
   - Must contain exactly 7 days: monday through sunday
   - Each day must have `closed` boolean field
   - If `closed: false`, must have `open` and `close` fields in HH:MM format
   - Times must be valid 24-hour format (00:00 to 23:59)
   - Close time must be after open time

3. **Address Validation (if provided):**
   - Must contain required fields: street, city, postal_code
   - Postal code must match Portuguese format

4. **Email Validation (if provided):**
   - Must conform to RFC 5322 email format

5. **Phone Validation (if provided):**
   - Must match Portuguese phone format (optional validation)

6. **Timezone Validation (if provided):**
   - Must be valid IANA timezone identifier

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_OPENING_HOURS` | "Opening hours must contain all 7 days" | Opening hours JSON invalid |
| 400 | `INVALID_TIME_FORMAT` | "Time must be in HH:MM format" | Time format invalid |
| 400 | `INVALID_TIME_RANGE` | "Close time must be after open time" | Time range invalid |
| 400 | `INVALID_ADDRESS` | "Address structure is invalid" | Address JSON invalid |
| 400 | `INVALID_EMAIL` | "Email format is invalid" | Email format invalid |
| 400 | `INVALID_TIMEZONE` | "Timezone is invalid" | Timezone identifier invalid |
| 400 | `NO_FIELDS_PROVIDED` | "At least one field must be provided" | No fields to update |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Owner or Manager role can update stores" | User lacks role |
| 403 | `COMPANY_ACCESS_DENIED` | "You do not have access to this store's company" | User cannot access company |
| 404 | `STORE_NOT_FOUND` | "Store not found" | Store does not exist |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error |

## 12. Events Triggered

**Domain Events:**
- `StoreUpdated` event is published with payload:
  - `store_id` (UUID)
  - `updated_fields` (Array of field names)
  - `updated_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Store", action="update", meta containing before/after values

**Integration Events:**
- None (store update is internal administrative action)

## 13. Repository Methods Required

**StoreRepository Interface:**
- `findById(id: UUID): Promise<Store | null>` - Load existing store
- `update(store: Store): Promise<Store>` - Persist updated store entity

**CompanyRepository Interface:**
- `findById(id: UUID): Promise<Company | null>` - Load company for access check

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user
- `hasCompanyAccess(userId: UUID, companyId: UUID): Promise<boolean>` - Check company access

## 14. Notes or Limitations

1. **Opening Hours Impact:** Changing opening hours may invalidate existing appointments. Consider business rules for handling conflicts.

2. **Company ID Immutability:** `company_id` cannot be changed via this use case. Moving a store to a different company would require a separate process.

3. **Partial Updates:** System supports partial updates. Only provided fields are updated.

4. **Audit Trail:** All updates are logged with before/after values for compliance.

5. **Concurrency:** Consider optimistic locking using `updated_at` timestamp to prevent lost updates.

6. **Performance:** Store updates are infrequent. No special performance optimizations required.

7. **Validation Order:** Validate company access before field validation to provide clear error messages.

8. **Future Enhancements:** Consider adding:
   - Validation warnings for opening hours changes affecting appointments
   - Bulk update capabilities
   - Store status management (active, closed, maintenance)

9. **Transaction Safety:** Store update should be atomic. Use database transactions to ensure consistency.

10. **Business Rule Dependencies:** Opening hours are used by Services module for appointment scheduling validation.

