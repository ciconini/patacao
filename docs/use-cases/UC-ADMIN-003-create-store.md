# Use Case UC-ADMIN-003: Create Store

## 1. Objective

Create a new store location associated with a company. Stores represent physical locations where services are provided, appointments are scheduled, and inventory is managed. Each store has its own opening hours, contact information, and can have staff assigned.

## 2. Actors and Permissions

**Primary Actor:** Owner, Manager

**Secondary Actors:** None

**Required Permissions:**
- Role: `Owner` or `Manager`
- Permission: `stores:create`

**Authorization Rules:**
- Users with `Owner` or `Manager` role can create stores
- Store must be associated with a company that the user has access to
- System must validate company access before allowing store creation

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Owner` or `Manager` role assigned
3. Company with specified `company_id` exists in the system
4. User has access to the specified company (Owner has access to all companies, Manager may have restricted access)
5. System has available storage capacity for new records

## 4. Postconditions

1. A new `Store` entity is created with a unique UUID `id`
2. Store record is persisted in the `stores` table
3. Store is linked to the specified `company_id`
4. `created_at` timestamp is set to current server time
5. `updated_at` is initially set to `created_at`
6. Audit log entry is created recording the creation action
7. Store is ready to have staff assigned and appointments scheduled

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `company_id` | UUID | Yes | Must exist | Company identifier this store belongs to |
| `name` | String | Yes | Max 255 chars, non-empty | Store name/location identifier |
| `address` | JSON Object | No | Valid address structure | Structured address: `{street: string, city: string, postal_code: string, country?: string}` |
| `email` | String | No | Valid email format, max 255 chars | Store contact email |
| `phone` | String | No | Max 32 chars, valid phone format | Store contact phone number |
| `opening_hours` | JSON Object | Yes | Valid weekly schedule structure | Weekly opening hours schedule |
| `timezone` | String | No | Valid IANA timezone | Timezone identifier (defaults to "Europe/Lisbon") |

**Opening Hours JSON Structure:**
```json
{
  "monday": {"open": "09:00", "close": "18:00", "closed": false},
  "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
  "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
  "thursday": {"open": "09:00", "close": "18:00", "closed": false},
  "friday": {"open": "09:00", "close": "18:00", "closed": false},
  "saturday": {"open": "09:00", "close": "13:00", "closed": false},
  "sunday": {"closed": true}
}
```

**Timezone:** IANA timezone identifier (e.g., "Europe/Lisbon", "Europe/Porto")

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier for the created store |
| `company_id` | UUID | Company identifier |
| `name` | String | Store name |
| `address` | JSON Object | Complete address structure (nullable) |
| `email` | String | Email address (nullable) |
| `phone` | String | Phone number (nullable) |
| `opening_hours` | JSON Object | Weekly opening hours schedule |
| `timezone` | String | Timezone identifier |
| `created_at` | DateTime | Creation timestamp (ISO 8601) |
| `updated_at` | DateTime | Last update timestamp (ISO 8601) |

## 7. Main Flow

1. System receives request to create store with input data
2. System validates user authentication and `Owner` or `Manager` role
3. System validates all required fields are present (`company_id`, `name`, `opening_hours`)
4. System loads company by `company_id` to verify existence
5. System verifies user has access to the company (Owner has access to all, Manager may have restrictions)
6. System validates `opening_hours` JSON structure contains all 7 days of week
7. System validates time format in opening_hours (HH:MM format, 24-hour)
8. System validates that close time is after open time for each day (if not closed)
9. System validates `address` JSON structure if provided
10. System validates `email` format if provided
11. System validates `phone` format if provided
12. System validates `timezone` is valid IANA timezone if provided, defaults to "Europe/Lisbon"
13. System generates UUID for `id`
14. System sets `created_at` and `updated_at` to current timestamp
15. System persists store record to `stores` table
16. System creates audit log entry with action `create`, entity_type `Store`, entity_id, and performed_by
17. System returns created store object with all fields

## 8. Alternative Flows

### 8.1. Company Not Found
- **Trigger:** Step 4 finds no company with given `company_id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Company not found"
  - Use case terminates

### 8.2. User Lacks Company Access
- **Trigger:** Step 5 determines user cannot access the company
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "You do not have access to this company"
  - Use case terminates

### 8.3. Invalid Opening Hours Structure
- **Trigger:** Step 6 detects invalid opening_hours JSON
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Opening hours must contain all 7 days of week (monday through sunday)"
  - Use case terminates

### 8.4. Invalid Time Format
- **Trigger:** Step 7 detects invalid time format
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Time must be in HH:MM format (24-hour)"
  - Use case terminates

### 8.5. Close Time Before Open Time
- **Trigger:** Step 8 detects close time before open time
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Close time must be after open time for [day]"
  - Use case terminates

### 8.6. Invalid Address Structure
- **Trigger:** Step 9 detects invalid address JSON
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Address must contain street, city, and postal_code fields"
  - Use case terminates

### 8.7. Missing Required Field
- **Trigger:** Step 3 detects missing required field
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Required field [field_name] is missing"
  - Use case terminates

### 8.8. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Owner or Manager role can create stores"
  - Use case terminates

## 9. Business Rules

**BR1:** Store must be associated with an existing company. Cannot create orphaned stores.

**BR2:** Opening hours define when appointments can be scheduled. Staff schedules cannot place staff outside store opening hours.

**BR3:** Each store can have multiple staff members assigned (many-to-many relationship via join table).

**BR4:** Store timezone defaults to "Europe/Lisbon" if not specified. All times are stored in UTC and converted for display.

**BR5:** Opening hours must include all 7 days of the week, even if marked as closed.

**BR6:** If a day is marked as `closed: true`, `open` and `close` times are ignored.

**BR7:** Store creation establishes a location for inventory management, appointments, and transactions.

**BR8:** All store creation actions must be logged in audit logs for compliance.

## 10. Validation Rules

1. **Company ID Validation:**
   - Must be valid UUID format
   - Must exist in `companies` table
   - User must have access to the company

2. **Name Validation:**
   - Cannot be empty or whitespace-only
   - Maximum 255 characters
   - Must contain at least one non-whitespace character

3. **Opening Hours Validation:**
   - Must contain exactly 7 days: monday, tuesday, wednesday, thursday, friday, saturday, sunday
   - Each day must have `closed` boolean field
   - If `closed: false`, must have `open` and `close` fields in HH:MM format
   - Times must be valid 24-hour format (00:00 to 23:59)
   - Close time must be after open time (or handle overnight shifts if business requires)

4. **Address Validation (if provided):**
   - `street`: Required if address provided, non-empty string, max 255 chars
   - `city`: Required if address provided, non-empty string, max 128 chars
   - `postal_code`: Required if address provided, Portuguese format (XXXX-XXX), 8 chars
   - `country`: Optional, defaults to "Portugal"

5. **Email Validation (if provided):**
   - Must conform to RFC 5322 email format
   - Case-insensitive

6. **Phone Validation (if provided):**
   - Must match Portuguese phone format (optional validation)
   - Format: +351XXXXXXXXX or 9XXXXXXXX

7. **Timezone Validation (if provided):**
   - Must be valid IANA timezone identifier
   - Defaults to "Europe/Lisbon" if not provided

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `MISSING_REQUIRED_FIELD` | "Required field [field] is missing" | One or more required fields not provided |
| 400 | `INVALID_OPENING_HOURS` | "Opening hours must contain all 7 days" | Opening hours JSON missing days or invalid structure |
| 400 | `INVALID_TIME_FORMAT` | "Time must be in HH:MM format" | Time format does not match HH:MM pattern |
| 400 | `INVALID_TIME_RANGE` | "Close time must be after open time" | Close time is before or equal to open time |
| 400 | `INVALID_ADDRESS` | "Address structure is invalid" | Address JSON missing required fields |
| 400 | `INVALID_EMAIL` | "Email format is invalid" | Email does not match valid pattern |
| 400 | `INVALID_TIMEZONE` | "Timezone is invalid" | Timezone identifier not recognized |
| 401 | `UNAUTHORIZED` | "Authentication required" | User is not authenticated |
| 403 | `FORBIDDEN` | "Only Owner or Manager role can create stores" | User lacks required role |
| 403 | `COMPANY_ACCESS_DENIED` | "You do not have access to this company" | User cannot access specified company |
| 404 | `COMPANY_NOT_FOUND` | "Company not found" | Company with specified ID does not exist |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error during persistence |

## 12. Events Triggered

**Domain Events:**
- `StoreCreated` event is published with payload:
  - `store_id` (UUID)
  - `company_id` (UUID)
  - `name` (String)
  - `timezone` (String)
  - `created_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Store", action="create"

**Integration Events:**
- None (store creation is internal administrative action)

## 13. Repository Methods Required

**StoreRepository Interface:**
- `save(store: Store): Promise<Store>` - Persist new store entity
- `findByCompanyId(companyId: UUID): Promise<Store[]>` - List stores for company (for validation)

**CompanyRepository Interface:**
- `findById(id: UUID): Promise<Company | null>` - Verify company exists

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user for audit logging
- `hasCompanyAccess(userId: UUID, companyId: UUID): Promise<boolean>` - Check user access to company

## 14. Notes or Limitations

1. **Opening Hours Complexity:** Opening hours structure supports simple daily schedules. Future enhancements may include:
   - Multiple time slots per day (e.g., lunch break)
   - Holiday schedules
   - Seasonal variations
   - Overnight shifts (close time after midnight)

2. **Timezone Handling:** All times stored in UTC. Timezone field is used for display and appointment scheduling calculations.

3. **Staff Assignment:** Store creation does not assign staff. Staff assignment is a separate use case (UC-ADMIN-010 or similar).

4. **Inventory Locations:** Stores can have multiple inventory locations (warehouse, retail floor, etc.). This is handled separately.

5. **Address Optional:** Store address is optional but recommended for appointment scheduling and customer communication.

6. **Performance:** Store creation is infrequent. No special performance optimizations required.

7. **Concurrency:** No explicit locking required. Company existence check handles basic validation.

8. **Future Enhancements:** Consider adding:
   - Store capacity limits (max concurrent appointments)
   - Store-specific VAT rates
   - Store-specific service catalogs
   - Store status (active, closed, maintenance)

9. **Business Rule Dependencies:** Opening hours are used by Services module for appointment scheduling validation (BR: appointments must be within opening hours).

10. **GDPR:** Store data may contain location information. Ensure GDPR compliance for data storage and processing.

