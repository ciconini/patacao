# Use Case UC-ADMIN-009: Create User (Staff)

## 1. Objective

Create a new system user account representing staff, manager, accountant, veterinarian, or owner. User accounts enable system access with role-based permissions. Staff users can be assigned to stores and have working hours and service skills configured.

## 2. Actors and Permissions

**Primary Actor:** Owner, Manager

**Secondary Actors:** None

**Required Permissions:**
- Role: `Owner` or `Manager`
- Permission: `users:create`
- Special: Only `Owner` can create `Owner` role users

**Authorization Rules:**
- `Owner` and `Manager` can create users with roles: `Staff`, `Manager`, `Accountant`, `Veterinarian`
- Only `Owner` can create users with `Owner` role
- System must validate role permissions before allowing user creation

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Owner` or `Manager` role assigned
3. If creating `Owner` role user, current user must be `Owner`
4. Email address is unique (not already used by another user)
5. System has available storage capacity for new records

## 4. Postconditions

1. A new `User` entity is created with a unique UUID `id`
2. User record is persisted in the `users` table
3. User is assigned specified roles (via `user_roles` join table)
4. User is assigned to specified stores (via join table) if `store_ids` provided
5. User service skills are assigned (via `user_service_skills` join table) if `service_skills` provided
6. `created_at` timestamp is set to current server time
7. `updated_at` is initially set to `created_at`
8. `active` flag is set to `true` by default
9. Audit log entry is created recording the creation action
10. User account is ready (password setup may be separate workflow)

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `email` | String | Yes | Valid email format, unique, max 255 chars | User email address (used for login) |
| `full_name` | String | Yes | Max 255 chars, non-empty | User's full name |
| `phone` | String | No | Max 32 chars, valid phone format | Contact phone number |
| `username` | String | No | Unique, max 128 chars | Optional username (alternative to email login) |
| `roles` | Array[String] | Yes | Valid role IDs, min 1 role | Role IDs: "Owner", "Manager", "Staff", "Accountant", "Veterinarian" |
| `store_ids` | Array[UUID] | No | Must exist | Store IDs user is assigned to |
| `working_hours` | JSON Object | No | Valid weekly schedule | Working hours schedule (similar to store opening_hours) |
| `service_skills` | Array[UUID] | No | Must exist | Service IDs user is skilled in |
| `active` | Boolean | No | true/false | Active status (defaults to true) |

**Working Hours JSON Structure:**
```json
{
  "monday": {"start": "09:00", "end": "18:00", "available": true},
  "tuesday": {"start": "09:00", "end": "18:00", "available": true},
  "wednesday": {"start": "09:00", "end": "18:00", "available": true},
  "thursday": {"start": "09:00", "end": "18:00", "available": true},
  "friday": {"start": "09:00", "end": "18:00", "available": true},
  "saturday": {"available": false},
  "sunday": {"available": false}
}
```

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier for the created user |
| `email` | String | Email address |
| `full_name` | String | Full name |
| `phone` | String | Phone number (nullable) |
| `username` | String | Username (nullable) |
| `roles` | Array[String] | Assigned role IDs |
| `store_ids` | Array[UUID] | Assigned store IDs |
| `working_hours` | JSON Object | Working hours schedule (nullable) |
| `service_skills` | Array[UUID] | Service skill IDs (nullable) |
| `active` | Boolean | Active status |
| `created_at` | DateTime | Creation timestamp (ISO 8601) |
| `updated_at` | DateTime | Last update timestamp (ISO 8601) |

**Note:** Password hash is not returned in output for security.

## 7. Main Flow

1. System receives request to create user with input data
2. System validates user authentication and `Owner` or `Manager` role
3. System validates all required fields are present (`email`, `full_name`, `roles`)
4. System validates `email` format and uniqueness
5. System validates `username` uniqueness if provided
6. System validates `roles` array contains at least one role
7. System validates each role ID is valid ("Owner", "Manager", "Staff", "Accountant", "Veterinarian")
8. System checks if creating `Owner` role user and current user is not `Owner` → return 403
9. System validates `store_ids` exist if provided
10. System validates `service_skills` exist if provided
11. System validates `working_hours` JSON structure if provided (all 7 days, time format)
12. System validates time format in working_hours if provided
13. System validates that end time is after start time for each day (if available)
14. System generates UUID for `id`
15. System sets `active` to `true` if not provided
16. System sets `created_at` and `updated_at` to current timestamp
17. System persists user record to `users` table
18. System creates `user_roles` join table entries for each role
19. System creates store assignment join table entries if `store_ids` provided
20. System creates `user_service_skills` join table entries if `service_skills` provided
21. System creates audit log entry with action `create`, entity_type `User`, entity_id, and performed_by
22. System returns created user object (without password hash)

## 8. Alternative Flows

### 8.1. Email Already Exists
- **Trigger:** Step 4 detects duplicate email
- **Action:**
  - System returns error `409 Conflict`
  - Error message: "A user with this email already exists"
  - Use case terminates

### 8.2. Username Already Exists
- **Trigger:** Step 5 detects duplicate username
- **Action:**
  - System returns error `409 Conflict`
  - Error message: "A user with this username already exists"
  - Use case terminates

### 8.3. Invalid Role Assignment
- **Trigger:** Step 8 detects non-Owner trying to create Owner user
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Owner role can create Owner users"
  - Use case terminates

### 8.4. Invalid Role ID
- **Trigger:** Step 7 detects invalid role ID
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Invalid role ID: [role_id]. Valid roles are: Owner, Manager, Staff, Accountant, Veterinarian"
  - Use case terminates

### 8.5. No Roles Provided
- **Trigger:** Step 6 detects empty roles array
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "At least one role must be assigned"
  - Use case terminates

### 8.6. Store Not Found
- **Trigger:** Step 9 detects store_id does not exist
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Store with ID [store_id] not found"
  - Use case terminates

### 8.7. Service Not Found
- **Trigger:** Step 10 detects service_id does not exist
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Service with ID [service_id] not found"
  - Use case terminates

### 8.8. Invalid Working Hours Structure
- **Trigger:** Step 11 detects invalid working_hours JSON
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Working hours must contain all 7 days of week"
  - Use case terminates

### 8.9. Missing Required Field
- **Trigger:** Step 3 detects missing required field
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Required field [field_name] is missing"
  - Use case terminates

### 8.10. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Owner or Manager role can create users"
  - Use case terminates

## 9. Business Rules

**BR1:** A user must have at least one role to access the system. Cannot create role-less users.

**BR2:** Only `Owner` can create `Owner` users. This prevents privilege escalation.

**BR3:** Email must be unique across all users. Email is used for authentication.

**BR4:** Username is optional but must be unique if provided. Username can be used as alternative to email for login.

**BR5:** Staff schedules cannot place staff outside store opening hours. System validates working hours against store opening hours (business rule enforced in Services module).

**BR6:** Service skills link users to services they can perform. Used for automatic staff assignment in appointment scheduling.

**BR7:** User is active by default. Inactive users cannot log in.

**BR8:** Password setup is typically a separate workflow (password reset flow or initial setup email).

**BR9:** All user creation actions must be logged in audit logs for security and compliance.

**BR10:** Store assignments link users to stores they work at. Users can be assigned to multiple stores.

## 10. Validation Rules

1. **Email Validation:**
   - Must conform to RFC 5322 email format
   - Must be unique across all users
   - Case-insensitive uniqueness check
   - Maximum 255 characters

2. **Username Validation (if provided):**
   - Must be unique across all users
   - Maximum 128 characters
   - Cannot be empty or whitespace-only

3. **Full Name Validation:**
   - Cannot be empty or whitespace-only
   - Maximum 255 characters

4. **Phone Validation (if provided):**
   - Must match Portuguese phone format (optional validation)
   - Maximum 32 characters

5. **Roles Validation:**
   - Must contain at least one role
   - Each role must be valid: "Owner", "Manager", "Staff", "Accountant", "Veterinarian"
   - Owner role creation restricted to Owner users only

6. **Store IDs Validation (if provided):**
   - Each store_id must exist in `stores` table
   - User must have access to assign users to these stores (business rule dependent)

7. **Service Skills Validation (if provided):**
   - Each service_id must exist in `services` table

8. **Working Hours Validation (if provided):**
   - Must contain exactly 7 days: monday through sunday
   - Each day must have `available` boolean field
   - If `available: true`, must have `start` and `end` fields in HH:MM format
   - Times must be valid 24-hour format
   - End time must be after start time

9. **Active Status Validation:**
   - Must be boolean value
   - Defaults to `true` if not provided

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `MISSING_REQUIRED_FIELD` | "Required field [field] is missing" | Required field not provided |
| 400 | `INVALID_EMAIL` | "Email format is invalid" | Email does not match valid pattern |
| 400 | `INVALID_ROLE` | "Invalid role ID: [role]" | Role ID not recognized |
| 400 | `NO_ROLES` | "At least one role must be assigned" | Roles array is empty |
| 400 | `INVALID_WORKING_HOURS` | "Working hours must contain all 7 days" | Working hours JSON invalid |
| 400 | `INVALID_TIME_FORMAT` | "Time must be in HH:MM format" | Time format invalid |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Owner or Manager role can create users" | User lacks role |
| 403 | `OWNER_ROLE_RESTRICTED` | "Only Owner role can create Owner users" | Non-Owner attempting Owner creation |
| 404 | `STORE_NOT_FOUND` | "Store with ID [id] not found" | Store does not exist |
| 404 | `SERVICE_NOT_FOUND` | "Service with ID [id] not found" | Service does not exist |
| 409 | `DUPLICATE_EMAIL` | "A user with this email already exists" | Email already in use |
| 409 | `DUPLICATE_USERNAME` | "A user with this username already exists" | Username already in use |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error |

## 12. Events Triggered

**Domain Events:**
- `UserCreated` event is published with payload:
  - `user_id` (UUID)
  - `email` (String)
  - `roles` (Array of role IDs)
  - `created_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="User", action="create"

**Integration Events:**
- `UserAccountCreated` event may trigger password setup email (separate workflow)

## 13. Repository Methods Required

**UserRepository Interface:**
- `save(user: User): Promise<User>` - Persist new user entity
- `findByEmail(email: string): Promise<User | null>` - Check email uniqueness
- `findByUsername(username: string): Promise<User | null>` - Check username uniqueness
- `assignRoles(userId: UUID, roleIds: string[]): Promise<void>` - Create user_roles entries
- `assignStores(userId: UUID, storeIds: UUID[]): Promise<void>` - Create store assignment entries
- `assignServiceSkills(userId: UUID, serviceIds: UUID[]): Promise<void>` - Create user_service_skills entries

**RoleRepository Interface:**
- `findById(id: string): Promise<Role | null>` - Verify role exists

**StoreRepository Interface:**
- `findById(id: UUID): Promise<Store | null>` - Verify store exists

**ServiceRepository Interface:**
- `findById(id: UUID): Promise<Service | null>` - Verify service exists

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

## 14. Notes or Limitations

1. **Password Setup:** Password is not set during user creation. Separate workflow handles password setup (password reset email or admin-set temporary password).

2. **Role Restrictions:** Owner role creation is restricted to prevent privilege escalation. Ensure proper authorization checks.

3. **Store Access:** User store assignments may be restricted by company access. Consider business rules for cross-company assignments.

4. **Working Hours Validation:** Working hours should be validated against store opening hours. This validation may occur in Services module.

5. **Service Skills:** Service skills link users to services they can perform. Used for automatic staff assignment in appointment scheduling.

6. **Performance:** User creation is infrequent. Ensure efficient database operations for join table entries.

7. **Transaction Safety:** User creation involves multiple table inserts. Use database transactions to ensure atomicity.

8. **Future Enhancements:** Consider adding:
   - User photo/avatar
   - User preferences/settings
   - User notes/comments
   - Bulk user creation/import
   - User groups/teams

9. **Security:** User creation is sensitive operation. Ensure proper audit logging and access controls.

10. **Business Rule Dependencies:** User roles and store assignments are used by Services module for appointment scheduling and staff allocation.

