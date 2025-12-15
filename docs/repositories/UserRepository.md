# Repository Interface Contract: UserRepository

## Overview

The `UserRepository` interface defines the contract for user data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for user entity operations, including authentication, authorization, and user management.

**Entity:** `User`  
**Table:** `users`  
**Module:** Users & Access Control

## Entity Structure

Based on the ER model, the `User` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `email` (VARCHAR(255), NOT NULL, UNIQUE) - User email address (used for login)
- `full_name` (VARCHAR(255), NOT NULL) - User's full name
- `phone` (VARCHAR(32), NULL) - Contact phone number
- `username` (VARCHAR(128), NULL, UNIQUE) - Username (optional, alternative login)
- `password_hash` (VARCHAR(255), NULL) - Hashed password (secure storage)
- `active` (BOOLEAN, NOT NULL, DEFAULT TRUE) - Active status flag
- `working_hours` (JSON, NULL) - Working hours schedule (for staff)
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NULL) - Last update timestamp
- `last_login_at` (DATETIME, NULL) - Last login timestamp (implied from use cases)

**Indexes:**
- Primary key on `id`
- Unique index on `email`
- Unique index on `username` (if provided)

**Relationships:**
- User 1 — 1..* Role (via `user_roles` join table)
- User 1 — 0..* Store (via `user_stores` join table, staff assignments)
- User 1 — 0..* Service (via `user_service_skills` join table, service skills)
- User 1 — 0..* Session (active sessions)
- User 1 — 0..* Appointment (as assigned staff)
- User 1 — 0..* Invoice (as creator)
- User 1 — 0..* Transaction (as creator)
- User 1 — 0..* StockMovement (as performer)

**Join Tables:**
- `user_roles`: Links users to roles (user_id, role_id, assigned_at)
- `user_stores`: Links users to stores (user_id, store_id) - implied from use cases
- `user_service_skills`: Links users to services (user_id, service_id)

---

## Method Specifications

### 1. `save(user: User): Promise<User>`

**Purpose:**  
Persist a new user entity or update an existing user entity. This method handles both creation and update operations based on whether the user has an existing `id`.

**Input Parameters:**
- `user` (User): User entity to persist
  - For new users: `id` is null/undefined, all required fields must be present
  - For updates: `id` must be valid UUID of existing user
  - Required fields: `email`, `full_name`
  - Optional fields: `phone`, `username`, `password_hash`, `working_hours`, `active`

**Output Type:**
- `Promise<User>`: Returns the persisted user entity with all fields populated, including generated `id` (if new), `created_at`, and `updated_at` timestamps

**Error Conditions:**
- `UserValidationError`: If required fields are missing or invalid
- `DuplicateEmailError`: If `email` already exists for another user
- `DuplicateUsernameError`: If `username` is provided and already exists for another user
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction if part of a larger operation (e.g., user creation with role/store assignments)
- Transaction should be managed by the calling use case or application service

**Notes on Expected Behaviour:**
- For new users: Generates UUID for `id`, sets `created_at` and `updated_at` to current timestamp, sets `active` to `true` by default
- For updates: Updates `updated_at` timestamp, preserves `created_at` and `id`
- Validates email uniqueness (case-insensitive)
- Validates username uniqueness if provided (case-insensitive, business rule dependent)
- Does not assign roles, stores, or service skills (handled by separate methods)
- Returns the complete user entity with all fields (password_hash may be excluded from response by application layer)

**Related Use Cases:**
- UC-AUTH-005: Create User
- UC-ADMIN-009: Create User (Staff)

---

### 2. `findById(id: UUID): Promise<User | null>`

**Purpose:**  
Retrieve a user entity by its unique identifier. Used for user lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): User identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<User | null>`: Returns the user entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete user entity with all fields
- Returns `null` if user with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by active status or other criteria (pure ID lookup)
- May include roles, stores, and service skills in response (eager loading, business rule dependent)

**Related Use Cases:**
- UC-AUTH-001: User Login (after authentication)
- UC-AUTH-004: Password Reset Confirm
- UC-SVC-002: Create Appointment (staff validation)
- Multiple use cases for audit logging and user retrieval

---

### 3. `findByEmail(email: string): Promise<User | null>`

**Purpose:**  
Retrieve a user entity by email address. Used for authentication, email uniqueness validation, and user lookup.

**Input Parameters:**
- `email` (string): User email address
  - Must be valid email format (validation in application layer)
  - Case-insensitive comparison
  - Must not be null or undefined

**Output Type:**
- `Promise<User | null>`: Returns the user entity if found, `null` if not found

**Error Conditions:**
- `InvalidInputError`: If `email` is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses unique index on `email` for efficient lookup
- Email comparison is case-insensitive
- Returns `null` if user with given email does not exist
- Returns complete user entity with all fields
- Used for login authentication and email uniqueness checks

**Related Use Cases:**
- UC-AUTH-001: User Login
- UC-AUTH-003: Password Reset Request
- UC-AUTH-005: Create User (email uniqueness validation)

---

### 4. `findByUsername(username: string): Promise<User | null>`

**Purpose:**  
Retrieve a user entity by username. Used for username uniqueness validation and alternative login method.

**Input Parameters:**
- `username` (string): User username
  - Must be non-empty string
  - Case-insensitive comparison (business rule dependent)
  - Must not be null or undefined

**Output Type:**
- `Promise<User | null>`: Returns the user entity if found, `null` if not found

**Error Conditions:**
- `InvalidInputError`: If `username` is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses unique index on `username` for efficient lookup
- Username comparison may be case-insensitive (business rule dependent)
- Returns `null` if user with given username does not exist
- Returns `null` if username is not set (NULL in database)
- Returns complete user entity with all fields
- Used for username uniqueness checks and alternative login

**Related Use Cases:**
- UC-AUTH-005: Create User (username uniqueness validation)

---

### 5. `search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<User>>`

**Purpose:**  
Search and filter user records by various criteria with pagination and sorting. Used for user management, staff directory, and administrative reporting.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object
  - `q?: string` - General search query (searches email, full_name, username)
  - `email?: string` - Filter by email (partial match)
  - `role?: string` - Filter by role name (Owner, Manager, Staff, Accountant, Veterinarian)
  - `store_id?: UUID` - Filter by store assignment
  - `active?: boolean` - Filter by active status
- `pagination` (Pagination): Pagination parameters
  - `page: number` - Page number (min 1, default 1)
  - `per_page: number` - Results per page (min 1, max 100, default 20)
- `sort` (Sort): Sort parameters
  - `field: string` - Sort field ("full_name", "email", "created_at")
  - `direction: 'asc' | 'desc'` - Sort direction (default: "asc")

**Output Type:**
- `Promise<PaginatedResult<User>>`: Returns paginated result with:
  - `items: User[]` - Array of user entities matching criteria
  - `meta: PaginationMeta` - Pagination metadata (total, page, per_page, total_pages, has_next, has_previous)

**Error Conditions:**
- `InvalidPaginationError`: If pagination parameters are invalid
- `InvalidSortError`: If sort field is invalid
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- General search query (`q`) searches across email, full_name, username (partial match, case-insensitive)
- Role filtering requires join with `user_roles` table
- Store filtering requires join with `user_stores` table
- Returns users in no specific order if no sort specified (default: full_name ascending)
- Excludes `password_hash` from results (security)
- May include roles and stores in response (eager loading, business rule dependent)
- Uses indexes on `email`, `full_name`, `role`, `store_id` for efficient queries

**Pagination Rules:**
- Default page: 1
- Default per_page: 20
- Maximum per_page: 100
- Returns empty array if no results found
- Total count calculated before pagination

**Sorting and Filtering Rules:**
- Valid sort fields: "full_name", "email", "created_at"
- Default sort: "full_name" ascending
- Case-insensitive text search
- Partial match for email and name filters
- Exact match for role and active status filters

**Related Use Cases:**
- UC-AUTH-006: Search Users

---

### 6. `count(criteria: SearchCriteria): Promise<number>`

**Purpose:**  
Count the number of users matching search criteria. Used for pagination metadata calculation.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object (same as `search()` method)
  - `q?: string` - General search query
  - `email?: string` - Filter by email
  - `role?: string` - Filter by role
  - `store_id?: UUID` - Filter by store
  - `active?: boolean` - Filter by active status

**Output Type:**
- `Promise<number>`: Returns count of matching users (integer >= 0)

**Error Conditions:**
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses same filtering logic as `search()` method
- Should use efficient COUNT query
- Returns integer count, never negative
- Does not apply pagination (counts all matching records)

**Related Use Cases:**
- UC-AUTH-006: Search Users (pagination metadata)

---

### 7. `updatePassword(userId: UUID, passwordHash: string): Promise<void>`

**Purpose:**  
Update a user's password hash. Used for password reset and password change operations.

**Input Parameters:**
- `userId` (UUID): User identifier
  - Must be valid UUID format
- `passwordHash` (string): Hashed password
  - Must be non-empty string
  - Should be hashed using secure algorithm (bcrypt/argon2)
  - Hashing is done in application layer, not repository

**Output Type:**
- `Promise<void>`: Returns void on successful update

**Error Conditions:**
- `InvalidUUIDError`: If `userId` is not a valid UUID format
- `UserNotFoundError`: If user with given `id` does not exist
- `InvalidInputError`: If `passwordHash` is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- May be part of larger transaction (e.g., password reset with session revocation)

**Notes on Expected Behaviour:**
- Updates `password_hash` field only
- Updates `updated_at` timestamp
- Does not validate password strength (handled in application layer)
- Does not check password history (business rule dependent)
- Password hash is provided pre-hashed (repository does not hash)

**Related Use Cases:**
- UC-AUTH-004: Password Reset Confirm

---

### 8. `updateLastLogin(userId: UUID): Promise<void>`

**Purpose:**  
Update the last login timestamp for a user. Used after successful authentication.

**Input Parameters:**
- `userId` (UUID): User identifier
  - Must be valid UUID format

**Output Type:**
- `Promise<void>`: Returns void on successful update

**Error Conditions:**
- `InvalidUUIDError`: If `userId` is not a valid UUID format
- `UserNotFoundError`: If user with given `id` does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- May be part of larger transaction (e.g., login with session creation)

**Notes on Expected Behaviour:**
- Updates `last_login_at` timestamp to current server time
- Updates `updated_at` timestamp
- Does not update other fields
- Used for security monitoring and user activity tracking

**Related Use Cases:**
- UC-AUTH-001: User Login

---

### 9. `incrementFailedLoginAttempts(userId: UUID): Promise<void>`

**Purpose:**  
Increment the failed login attempts counter for a user. Used for account lockout protection.

**Input Parameters:**
- `userId` (UUID): User identifier
  - Must be valid UUID format

**Output Type:**
- `Promise<void>`: Returns void on successful update

**Error Conditions:**
- `InvalidUUIDError`: If `userId` is not a valid UUID format
- `UserNotFoundError`: If user with given `id` does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- May use optimistic locking to prevent race conditions

**Notes on Expected Behaviour:**
- Increments failed login attempts counter (stored in user entity or separate table)
- May trigger account lockout if threshold exceeded (business rule)
- Updates `updated_at` timestamp
- Counter is reset on successful login

**Related Use Cases:**
- UC-AUTH-001: User Login (failed attempts)

---

### 10. `resetFailedLoginAttempts(userId: UUID): Promise<void>`

**Purpose:**  
Reset the failed login attempts counter for a user. Used after successful authentication.

**Input Parameters:**
- `userId` (UUID): User identifier
  - Must be valid UUID format

**Output Type:**
- `Promise<void>`: Returns void on successful update

**Error Conditions:**
- `InvalidUUIDError`: If `userId` is not a valid UUID format
- `UserNotFoundError`: If user with given `id` does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- May be part of larger transaction (e.g., login with session creation)

**Notes on Expected Behaviour:**
- Resets failed login attempts counter to 0
- Updates `updated_at` timestamp
- Used after successful login to clear failed attempts

**Related Use Cases:**
- UC-AUTH-001: User Login (successful login)

---

### 11. `lockAccount(userId: UUID, lockoutExpiry: DateTime): Promise<void>`

**Purpose:**  
Lock a user account due to excessive failed login attempts. Used for account security protection.

**Input Parameters:**
- `userId` (UUID): User identifier
  - Must be valid UUID format
- `lockoutExpiry` (DateTime): Account lockout expiration timestamp
  - Must be valid datetime
  - Must be in the future

**Output Type:**
- `Promise<void>`: Returns void on successful update

**Error Conditions:**
- `InvalidUUIDError`: If `userId` is not a valid UUID format
- `UserNotFoundError`: If user with given `id` does not exist
- `InvalidDateTimeError`: If `lockoutExpiry` is invalid or in the past
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service

**Notes on Expected Behaviour:**
- Sets account lockout flag and expiration timestamp
- Updates `updated_at` timestamp
- Locked accounts cannot log in until lockout expires or is manually unlocked
- Lockout expiry is stored in user entity or separate table

**Related Use Cases:**
- UC-AUTH-001: User Login (account lockout)

---

### 12. `isAccountLocked(userId: UUID): Promise<boolean>`

**Purpose:**  
Check if a user account is currently locked. Used for authentication validation.

**Input Parameters:**
- `userId` (UUID): User identifier
  - Must be valid UUID format

**Output Type:**
- `Promise<boolean>`: Returns `true` if account is locked, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If `userId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns `true` if account has lockout flag set and lockout has not expired
- Returns `false` if account is not locked or lockout has expired
- Should use efficient query (check lockout flag and expiry)
- Does not load full user entity (optimized check)

**Related Use Cases:**
- UC-AUTH-001: User Login (lockout check)

---

### 13. `isAssignedToStore(userId: UUID, storeId: UUID): Promise<boolean>`

**Purpose:**  
Verify that a user is assigned to a specific store. Used for staff assignment validation in appointments and store access checks.

**Input Parameters:**
- `userId` (UUID): User identifier
  - Must be valid UUID format
- `storeId` (UUID): Store identifier
  - Must be valid UUID format

**Output Type:**
- `Promise<boolean>`: Returns `true` if user is assigned to store, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If either `userId` or `storeId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Checks `user_stores` join table for assignment
- Returns `false` if user does not exist
- Returns `false` if store does not exist (validation should occur separately)
- Should use efficient query (EXISTS or COUNT) rather than loading full entity
- Uses index on `user_id` and `store_id` in join table

**Related Use Cases:**
- UC-SVC-002: Create Appointment (staff-store assignment validation)

---

### 14. `hasStoreAccess(userId: UUID, storeId: UUID): Promise<boolean>`

**Purpose:**  
Check if a user has access to a specific store. This may include direct store assignment or role-based access (e.g., Owner/Manager can access all stores).

**Input Parameters:**
- `userId` (UUID): User identifier
  - Must be valid UUID format
- `storeId` (UUID): Store identifier
  - Must be valid UUID format

**Output Type:**
- `Promise<boolean>`: Returns `true` if user has access to store, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If either `userId` or `storeId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Checks store assignment via `user_stores` join table
- May check user roles for elevated access (Owner/Manager can access all stores)
- Returns `false` if user does not exist
- Returns `false` if store does not exist (validation should occur separately)
- Business rule dependent: role-based access may override store assignment
- Should use efficient query with role and store checks

**Related Use Cases:**
- UC-INV-001: Receive Stock
- UC-INV-002: Stock Adjustment
- UC-INV-004: Stock Reconciliation
- UC-SVC-003: Confirm Appointment
- UC-SVC-004: Complete Appointment
- UC-SVC-005: Cancel Appointment

---

### 15. `isWithinWorkingHours(userId: UUID, datetime: DateTime): Promise<boolean>`

**Purpose:**  
Check if a given datetime falls within a user's working hours. Used for appointment scheduling validation.

**Input Parameters:**
- `userId` (UUID): User identifier
  - Must be valid UUID format
- `datetime` (DateTime): Datetime to check
  - Must be valid datetime
  - Should include timezone information

**Output Type:**
- `Promise<boolean>`: Returns `true` if datetime is within working hours, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If `userId` is not a valid UUID format
- `InvalidDateTimeError`: If `datetime` is invalid
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Loads user's `working_hours` JSON field
- Parses working hours schedule (weekly schedule format)
- Checks if `datetime` falls within working hours for the day of week
- Returns `false` if user has no working hours defined (business rule dependent)
- Returns `false` if user does not exist
- Timezone handling: working hours may be in user's timezone or store timezone
- Working hours format: JSON object with day-of-week keys and time ranges

**Related Use Cases:**
- UC-SVC-002: Create Appointment (staff working hours validation)

---

### 16. `assignRoles(userId: UUID, roleIds: string[]): Promise<void>`

**Purpose:**  
Assign roles to a user by creating entries in the `user_roles` join table. Used during user creation and role updates.

**Input Parameters:**
- `userId` (UUID): User identifier
  - Must be valid UUID format
  - User must exist
- `roleIds` (string[]): Array of role identifiers
  - Must be non-empty array
  - Each role ID must be valid (Owner, Manager, Staff, Accountant, Veterinarian)
  - Roles must exist (validation in application layer)

**Output Type:**
- `Promise<void>`: Returns void on successful assignment

**Error Conditions:**
- `InvalidUUIDError`: If `userId` is not a valid UUID format
- `UserNotFoundError`: If user with given `id` does not exist
- `InvalidInputError`: If `roleIds` is empty or null
- `RoleNotFoundError`: If any role ID does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- May be part of larger transaction (e.g., user creation with role assignments)
- Should remove existing role assignments before assigning new ones (or merge, business rule dependent)

**Notes on Expected Behaviour:**
- Creates entries in `user_roles` join table
- May remove existing role assignments before assigning new ones (replace mode)
- May merge with existing assignments (merge mode, business rule dependent)
- Sets `assigned_at` timestamp for each role assignment
- User must have at least one role (business rule, validated in application layer)

**Related Use Cases:**
- UC-AUTH-005: Create User
- UC-ADMIN-009: Create User (Staff)

---

### 17. `assignStores(userId: UUID, storeIds: UUID[]): Promise<void>`

**Purpose:**  
Assign stores to a user by creating entries in the `user_stores` join table. Used during user creation and store assignment updates.

**Input Parameters:**
- `userId` (UUID): User identifier
  - Must be valid UUID format
  - User must exist
- `storeIds` (UUID[]): Array of store identifiers
  - Must be non-empty array (if provided)
  - Each store ID must be valid UUID
  - Stores must exist (validation in application layer)

**Output Type:**
- `Promise<void>`: Returns void on successful assignment

**Error Conditions:**
- `InvalidUUIDError`: If `userId` is not a valid UUID format
- `UserNotFoundError`: If user with given `id` does not exist
- `InvalidInputError`: If `storeIds` contains invalid UUIDs
- `StoreNotFoundError`: If any store ID does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- May be part of larger transaction (e.g., user creation with store assignments)
- Should remove existing store assignments before assigning new ones (or merge, business rule dependent)

**Notes on Expected Behaviour:**
- Creates entries in `user_stores` join table
- May remove existing store assignments before assigning new ones (replace mode)
- May merge with existing assignments (merge mode, business rule dependent)
- Store assignments are optional (user may not be assigned to any store)
- Used for staff assignment to stores

**Related Use Cases:**
- UC-AUTH-005: Create User
- UC-ADMIN-009: Create User (Staff)

---

### 18. `assignServiceSkills(userId: UUID, serviceIds: UUID[]): Promise<void>`

**Purpose:**  
Assign service skills to a user by creating entries in the `user_service_skills` join table. Used during user creation and service skills updates.

**Input Parameters:**
- `userId` (UUID): User identifier
  - Must be valid UUID format
  - User must exist
- `serviceIds` (UUID[]): Array of service identifiers
  - Must be non-empty array (if provided)
  - Each service ID must be valid UUID
  - Services must exist (validation in application layer)

**Output Type:**
- `Promise<void>`: Returns void on successful assignment

**Error Conditions:**
- `InvalidUUIDError`: If `userId` is not a valid UUID format
- `UserNotFoundError`: If user with given `id` does not exist
- `InvalidInputError`: If `serviceIds` contains invalid UUIDs
- `ServiceNotFoundError`: If any service ID does not exist
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- May be part of larger transaction (e.g., user creation with service skills)
- Should remove existing service skills before assigning new ones (or merge, business rule dependent)

**Notes on Expected Behaviour:**
- Creates entries in `user_service_skills` join table
- May remove existing service skills before assigning new ones (replace mode)
- May merge with existing assignments (merge mode, business rule dependent)
- Service skills are optional (user may not have any service skills)
- Used for automatic staff assignment in appointment scheduling

**Related Use Cases:**
- UC-ADMIN-009: Create User (Staff)

---

### 19. `update(user: User): Promise<User>`

**Purpose:**  
Update an existing user entity. This method is an alternative to `save()` when explicit update semantics are preferred. Updates only provided fields (partial update support).

**Input Parameters:**
- `user` (User): User entity with updated fields
  - `id` must be valid UUID of existing user
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)

**Output Type:**
- `Promise<User>`: Returns the updated user entity with all fields

**Error Conditions:**
- `UserNotFoundError`: If user with given `id` does not exist
- `UserValidationError`: If updated fields are invalid
- `DuplicateEmailError`: If `email` is being updated and already exists for another user
- `DuplicateUsernameError`: If `username` is being updated and already exists for another user
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction if part of a larger operation
- Transaction should be managed by the calling use case or application service

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Preserves `created_at` timestamp
- Updates `updated_at` timestamp to current time
- Validates email uniqueness if `email` is being updated
- Validates username uniqueness if `username` is being updated
- Does not update roles, stores, or service skills (handled by separate methods)
- Returns complete updated user entity

**Related Use Cases:**
- Future: Update User use case

---

### 20. `delete(id: UUID): Promise<void>`

**Purpose:**  
Permanently delete a user entity from the database. Used for user removal when no referential constraints prevent deletion.

**Input Parameters:**
- `id` (UUID): User identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<void>`: Returns void on successful deletion

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `UserNotFoundError`: If user with given `id` does not exist
- `ReferentialIntegrityError`: If user has linked records (appointments, invoices, transactions, sessions)
- `OwnerDeletionRestrictedError`: If attempting to delete Owner user (business rule)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- May require cascade delete or referential integrity checks
- Should delete related join table entries (user_roles, user_stores, user_service_skills)

**Notes on Expected Behaviour:**
- Permanently removes user record from database
- Should check for referential integrity constraints (appointments, invoices, transactions, sessions)
- May throw error if user has linked records (business rule dependent)
- Should delete related join table entries (user_roles, user_stores, user_service_skills)
- Does not return deleted entity (void return)
- Should be logged in audit trail (handled by application layer)
- Owner deletion may be restricted (business rule)

**Related Use Cases:**
- Future: Delete User use case

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`
   - Unique index on `email` for `findByEmail()`
   - Unique index on `username` for `findByUsername()`
   - Indexes on join tables for `isAssignedToStore()`, role/store filtering

2. **Query Optimization:**
   - Use efficient queries (COUNT, EXISTS) for validation methods
   - Avoid loading full entities when only existence or count is needed
   - Consider pagination for `search()` method
   - Eager loading of roles/stores may be beneficial for some use cases

### Data Integrity

1. **Foreign Key Constraints:**
   - `user_roles.role_id` must reference existing role (enforced by database)
   - `user_stores.store_id` must reference existing store (enforced by database)
   - `user_service_skills.service_id` must reference existing service (enforced by database)

2. **Uniqueness:**
   - `email` is always unique (enforced by database)
   - `username` is unique if provided (enforced by database)
   - Primary key `id` is always unique

3. **Business Rules:**
   - User must have at least one role (enforced in application layer)
   - Only Owner can create Owner users (enforced in application layer)
   - Owner deletion may be restricted (enforced in application layer)

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`, `update`, `delete`, assignment methods) should be within transactions
- Multi-step operations (user creation with roles/stores) require transactions

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations

### Security Considerations

1. **Password Handling:**
   - `password_hash` is never returned in search results
   - Password hashing is done in application layer, not repository
   - Password verification is done in application layer

2. **Sensitive Data:**
   - User data may contain personal information (email, phone, full_name)
   - Repository should support data export and deletion for GDPR compliance
   - Audit logging is handled by application layer

### GDPR and Data Privacy

- User records contain personal data (email, phone, full_name)
- Repository should support data export and deletion for GDPR compliance
- Password hashes should be securely stored and never exposed
- Audit logs track user operations (handled by application layer)

---

## Related Repositories

- **RoleRepository:** For role validation and lookup
- **StoreRepository:** For store validation and lookup
- **ServiceRepository:** For service validation and lookup
- **SessionRepository:** For session management
- **AuditLogRepository:** For logging user operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `findByRole(roleId: string): Promise<User[]>` - Find all users with specific role
- `findByStore(storeId: UUID): Promise<User[]>` - Find all users assigned to store
- `archive(id: UUID): Promise<User>` - Soft delete/archive user (if business rule requires)
- `unlockAccount(userId: UUID): Promise<void>` - Manually unlock user account
- `updateWorkingHours(userId: UUID, workingHours: JSON): Promise<void>` - Update working hours
- `getUserRoles(userId: UUID): Promise<Role[]>` - Get user's roles
- `getUserStores(userId: UUID): Promise<Store[]>` - Get user's assigned stores
- `getUserServiceSkills(userId: UUID): Promise<Service[]>` - Get user's service skills
- `bulkUpdate(users: User[]): Promise<User[]>` - Bulk update operations

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

