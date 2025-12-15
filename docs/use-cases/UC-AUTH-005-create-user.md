# Use Case UC-AUTH-005: Create User

## 1. Objective

Create a new user account with email, full name, roles, and optional contact information. User creation is restricted to Managers and Owners. New users must have at least one role assigned and are created in active status.

## 2. Actors and Permissions

**Primary Actor:** Manager, Owner

**Secondary Actors:** None

**Required Permissions:**
- Role: `Manager` or `Owner`
- Permission: `users:create`

**Authorization Rules:**
- Only `Manager` or `Owner` can create users
- `Owner` role creation is restricted to existing `Owner` users (BR1)
- System must validate role before allowing user creation

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Manager` or `Owner` role assigned
3. Email address is unique (not already registered)
4. Roles referenced in `roles` array exist
5. Stores referenced in `store_ids` array exist (if provided)
6. System has available storage capacity for new records

## 4. Postconditions

1. A new `User` entity is created with a unique UUID `id`
2. User record is persisted in the `users` table
3. User roles are assigned (at least one role required)
4. User-store assignments are created (if stores provided)
5. User is created in active status
6. `created_at` timestamp is set to current server time
7. Audit log entry is created recording the creation action
8. User account is ready (password must be set separately via invitation or reset)

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `email` | String | Yes | Valid email, unique | User email address |
| `full_name` | String | Yes | Max 255 chars, non-empty | User full name |
| `phone` | String | No | Max 32 chars | Contact phone number |
| `username` | String | No | Max 64 chars, unique if provided | Username (optional) |
| `roles` | Array[String] | Yes | Min 1 role, must exist | Array of role IDs or names |
| `store_ids` | Array[UUID] | No | Must exist if provided | Array of store IDs for assignment |
| `working_hours` | Object | No | Valid schedule format | Working hours schedule (optional) |

**Working Hours Structure (optional):**
```json
{
  "monday": { "start": "09:00", "end": "17:00" },
  "tuesday": { "start": "09:00", "end": "17:00" },
  ...
}
```

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier for the created user |
| `email` | String | User email |
| `full_name` | String | User full name |
| `phone` | String | Contact phone (nullable) |
| `username` | String | Username (nullable) |
| `roles` | Array[String] | Assigned roles |
| `store_ids` | Array[UUID] | Assigned stores (nullable) |
| `working_hours` | Object | Working hours schedule (nullable) |
| `active` | Boolean | Active status (true) |
| `created_at` | DateTime | Creation timestamp (ISO 8601) |
| `updated_at` | DateTime | Last update timestamp (ISO 8601) |

## 7. Main Flow

1. System receives request to create user with input data
2. System validates user authentication and role (`Manager` or `Owner`)
3. System validates required fields are present (`email`, `full_name`, `roles`)
4. System validates `email` format (valid email address)
5. System validates `email` is unique (not already registered)
6. System validates `full_name` is non-empty and not whitespace-only
7. System validates `roles` array contains at least one role
8. System validates all roles in `roles` array exist
9. System checks if any role is `Owner`:
   - If `Owner` role in array and current user is not `Owner`:
     - System returns error `403 Forbidden`
     - Error message: "Only Owner can create Owner users"
     - Use case terminates
10. System validates `username` is unique if provided
11. System validates `store_ids` array if provided:
    - All store IDs must exist
    - User must have access to assign stores (business rule dependent)
12. System validates `working_hours` format if provided
13. System generates UUID for `id`
14. System sets `active` to true
15. System sets `created_at` and `updated_at` to current timestamp
16. System hashes a temporary password or leaves password_hash null (password set via invitation)
17. System begins database transaction
18. System persists user record to `users` table
19. System creates user-role assignments
20. System creates user-store assignments (if stores provided)
21. System commits database transaction
22. System creates audit log entry with action `create`, entity_type `User`, entity_id, roles, and performed_by
23. System returns created user object (password_hash excluded from response)

## 8. Alternative Flows

### 8.1. Missing Required Field
- **Trigger:** Step 3 detects missing required field
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Required field [field_name] is missing"
  - Use case terminates

### 8.2. Invalid Email Format
- **Trigger:** Step 4 detects invalid email format
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Invalid email format"
  - Use case terminates

### 8.3. Email Already Exists
- **Trigger:** Step 5 detects email is already registered
- **Action:**
  - System returns error `409 Conflict`
  - Error message: "Email is already registered"
  - Use case terminates

### 8.4. Invalid Name Format
- **Trigger:** Step 6 detects invalid name (empty or whitespace-only)
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Full name cannot be empty"
  - Use case terminates

### 8.5. No Roles Provided
- **Trigger:** Step 7 detects empty `roles` array
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "At least one role must be assigned"
  - Use case terminates

### 8.6. Role Not Found
- **Trigger:** Step 8 detects role does not exist
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Role [role_name] not found"
  - Use case terminates

### 8.7. Unauthorized Owner Creation
- **Trigger:** Step 9 detects non-Owner attempting to create Owner
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Owner can create Owner users"
  - Use case terminates

### 8.8. Username Already Exists
- **Trigger:** Step 10 detects username is already taken
- **Action:**
  - System returns error `409 Conflict`
  - Error message: "Username is already taken"
  - Use case terminates

### 8.9. Store Not Found
- **Trigger:** Step 11 detects store does not exist
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Store with ID [id] not found"
  - Use case terminates

### 8.10. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Manager or Owner role can create users"
  - Use case terminates

## 9. Business Rules

**BR1:** Only `Owner` can create `Owner` users. Managers cannot create Owner accounts.

**BR2:** User must have at least one role assigned. Role-less users cannot access the system.

**BR3:** Email must be unique. Duplicate emails are not allowed.

**BR4:** Username is optional but must be unique if provided.

**BR5:** User is created in active status. Inactive users cannot log in.

**BR6:** Password is not set during creation. Password must be set via invitation email or password reset.

**BR7:** All user creation actions must be logged in audit logs for compliance.

**BR8:** User-store assignments are optional. Users can be assigned to multiple stores.

**BR9:** Working hours are optional. Used for staff scheduling and availability.

**BR10:** Role assignments are validated. Invalid roles cannot be assigned.

## 10. Validation Rules

1. **Email Validation:**
   - Must conform to RFC 5322 email format
   - Must be unique (not already registered)
   - Case-insensitive
   - Maximum 255 characters

2. **Full Name Validation:**
   - Cannot be empty or whitespace-only
   - Maximum 255 characters
   - Must contain at least one non-whitespace character

3. **Phone Validation (if provided):**
   - Maximum 32 characters
   - Valid phone format (optional validation)

4. **Username Validation (if provided):**
   - Maximum 64 characters
   - Must be unique if provided
   - Alphanumeric and underscore allowed (business rule dependent)

5. **Roles Validation:**
   - Minimum 1 role required
   - All roles must exist in system
   - Owner role creation restricted to Owner users

6. **Store Validation (if provided):**
   - All store IDs must exist
   - User must have access to assign stores (business rule dependent)

7. **Working Hours Validation (if provided):**
   - Valid schedule format
   - Time format: HH:MM (24-hour)

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `MISSING_REQUIRED_FIELD` | "Required field [field] is missing" | Required field not provided |
| 400 | `INVALID_EMAIL` | "Invalid email format" | Email format is invalid |
| 400 | `INVALID_NAME` | "Full name cannot be empty" | Name is empty |
| 400 | `NO_ROLES` | "At least one role must be assigned" | No roles provided |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Manager or Owner role can create users" | User lacks required role |
| 403 | `OWNER_CREATION_RESTRICTED` | "Only Owner can create Owner users" | Non-Owner attempting Owner creation |
| 404 | `ROLE_NOT_FOUND` | "Role [role_name] not found" | Role does not exist |
| 404 | `STORE_NOT_FOUND` | "Store with ID [id] not found" | Store does not exist |
| 409 | `EMAIL_EXISTS` | "Email is already registered" | Email already in use |
| 409 | `USERNAME_EXISTS` | "Username is already taken" | Username already in use |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error during persistence |

## 12. Events Triggered

**Domain Events:**
- `UserCreated` event is published with payload:
  - `user_id` (UUID)
  - `email` (String)
  - `full_name` (String)
  - `roles` (Array[String])
  - `created_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="User", action="create", roles

**Integration Events:**
- User invitation email may be queued (separate workflow, business rule dependent)

## 13. Repository Methods Required

**UserRepository Interface:**
- `save(user: User): Promise<User>` - Persist new user entity
- `findByEmail(email: string): Promise<User | null>` - Check email uniqueness
- `findByUsername(username: string): Promise<User | null>` - Check username uniqueness

**RoleRepository Interface:**
- `findById(id: string): Promise<Role | null>` - Verify role exists
- `findByIds(ids: string[]): Promise<Role[]>` - Verify multiple roles exist

**StoreRepository Interface:**
- `findById(id: UUID): Promise<Store | null>` - Verify store exists
- `findByIds(ids: UUID[]): Promise<Store[]>` - Verify multiple stores exist

**UserRoleRepository Interface:**
- `assignRoles(userId: UUID, roleIds: string[]): Promise<void>` - Assign roles to user

**UserStoreRepository Interface:**
- `assignStores(userId: UUID, storeIds: UUID[]): Promise<void>` - Assign stores to user

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

## 14. Notes or Limitations

1. **Password Management:** Password is not set during creation. User must set password via invitation email or password reset.

2. **Owner Creation:** Only existing Owner users can create Owner accounts. This prevents privilege escalation.

3. **Role Assignment:** User must have at least one role. Role-less users cannot access the system.

4. **Email Uniqueness:** Email must be unique. Consider case-insensitive comparison.

5. **Transaction Safety:** User creation involves multiple table inserts (user + roles + stores). Use database transactions to ensure atomicity.

6. **Performance:** User creation is infrequent. No special performance optimizations required.

7. **Future Enhancements:** Consider adding:
   - User invitation workflow (email with setup link)
   - Bulk user creation
   - User import from CSV
   - Default role assignments per store

8. **Business Rule Dependencies:** User creation depends on:
   - Role definitions (must exist)
   - Store definitions (if assigning stores)

9. **Audit Trail:** All user creation actions must be logged for compliance and security monitoring.

10. **GDPR Compliance:** User creation involves personal data. Ensure compliance with GDPR requirements for data storage and consent.

