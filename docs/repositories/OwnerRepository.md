# Repository Interface Contract: OwnerRepository

## Overview

The `OwnerRepository` interface defines the contract for Owner-specific user operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture.

**Important Note:** "Owner" is not a separate entity in the ER model. It is a Role that Users can have (one of: Owner, Manager, Staff, Accountant, Veterinarian). This repository provides specialized operations for querying and managing users with the Owner role, offering convenience methods that filter by the Owner role.

**Base Entity:** `User` (with Owner role)  
**Table:** `users` (filtered by role via `user_roles` join table)  
**Module:** Users & Access Control

## Entity Structure

Owners are Users with the "Owner" role assigned. The underlying entity structure is the same as the `User` entity:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `email` (VARCHAR(255), NOT NULL, UNIQUE) - User email address
- `full_name` (VARCHAR(255), NOT NULL) - User's full name
- `phone` (VARCHAR(32), NULL) - Contact phone number
- `username` (VARCHAR(128), NULL, UNIQUE) - Username (optional)
- `password_hash` (VARCHAR(255), NULL) - Hashed password
- `active` (BOOLEAN, NOT NULL, DEFAULT TRUE) - Active status flag
- `working_hours` (JSON, NULL) - Working hours schedule
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NULL) - Last update timestamp
- `last_login_at` (DATETIME, NULL) - Last login timestamp

**Role Assignment:**
- Users with Owner role have an entry in `user_roles` join table with `role_id = 'Owner'`

**Indexes:**
- Primary key on `id`
- Unique index on `email`
- Unique index on `username` (if provided)
- Index on `user_roles.role_id` for role filtering

**Relationships:**
- Owner (User) 1 — 1..* Role (includes Owner role)
- Owner (User) 1 — 0..* Store (may be assigned to stores)
- Owner (User) 1 — 0..* Session (active sessions)

**Business Rules:**
- Only existing Owner users can create new Owner users (prevents privilege escalation)
- Owner users have elevated permissions across all stores and modules
- Owner deletion may be restricted (business rule dependent)

---

## Method Specifications

### 1. `findAll(): Promise<User[]>`

**Purpose:**  
Retrieve all users who have the Owner role assigned. Used for owner management and administrative operations.

**Input Parameters:**
- None

**Output Type:**
- `Promise<User[]>`: Returns array of User entities with Owner role
  - Returns empty array `[]` if no Owner users exist
  - Each user has Owner role in their roles array

**Error Conditions:**
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Queries `users` table joined with `user_roles` where `role_id = 'Owner'`
- Returns all active and inactive Owner users (no filtering by active status)
- Returns complete user entities with all fields
- Excludes `password_hash` from results (security, handled by application layer)
- Results may be sorted by `full_name` or `created_at` (business rule dependent)
- Uses index on `user_roles.role_id` for efficient query

**Sorting and Filtering Rules:**
- No default sorting applied (or sorted by `full_name` ascending, business rule dependent)
- No filtering applied (returns all Owner users regardless of active status)

**Related Use Cases:**
- Owner management operations
- Owner transfer/assignment workflows

---

### 2. `findById(id: UUID): Promise<User | null>`

**Purpose:**  
Retrieve a user by ID and verify they have the Owner role. Used for Owner validation and detail retrieval.

**Input Parameters:**
- `id` (UUID): User identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<User | null>`: Returns the user entity if found and has Owner role, `null` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Loads user by ID
- Verifies user has Owner role assigned (checks `user_roles` join table)
- Returns `null` if user does not exist
- Returns `null` if user exists but does not have Owner role
- Returns complete user entity with Owner role in roles array
- Uses primary key index for efficient lookup

**Related Use Cases:**
- Owner validation in authorization checks
- Owner detail retrieval

---

### 3. `findByEmail(email: string): Promise<User | null>`

**Purpose:**  
Retrieve a user by email and verify they have the Owner role. Used for Owner authentication and validation.

**Input Parameters:**
- `email` (string): User email address
  - Must be valid email format (validation in application layer)
  - Case-insensitive comparison
  - Must not be null or undefined

**Output Type:**
- `Promise<User | null>`: Returns the user entity if found and has Owner role, `null` otherwise

**Error Conditions:**
- `InvalidInputError`: If `email` is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Loads user by email using unique index
- Verifies user has Owner role assigned (checks `user_roles` join table)
- Returns `null` if user does not exist
- Returns `null` if user exists but does not have Owner role
- Email comparison is case-insensitive
- Returns complete user entity with Owner role in roles array

**Related Use Cases:**
- Owner authentication
- Owner email validation

---

### 4. `count(): Promise<number>`

**Purpose:**  
Count the total number of users with the Owner role. Used for business rule validation (e.g., ensuring at least one Owner exists).

**Input Parameters:**
- None

**Output Type:**
- `Promise<number>`: Returns count of Owner users (integer >= 0)

**Error Conditions:**
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Counts users with Owner role via `user_roles` join table
- Uses efficient COUNT query with index on `role_id`
- Returns integer count, never negative
- Counts all Owner users regardless of active status
- Used for business rule validation (e.g., prevent deleting last Owner)

**Related Use Cases:**
- Owner deletion validation (ensure at least one Owner remains)
- Owner management operations

---

### 5. `exists(id: UUID): Promise<boolean>`

**Purpose:**  
Check if a user with the given ID has the Owner role. Used for quick Owner role validation without loading full entity.

**Input Parameters:**
- `id` (UUID): User identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if user exists and has Owner role, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses efficient EXISTS or COUNT query
- Returns `false` if user does not exist
- Returns `false` if user exists but does not have Owner role
- Does not load full user entity (optimized check)
- Uses indexes for efficient query

**Related Use Cases:**
- Owner role validation in authorization checks
- Permission verification

---

### 6. `isLastOwner(userId: UUID): Promise<boolean>`

**Purpose:**  
Check if a user is the last remaining Owner in the system. Used to prevent deletion of the last Owner (business rule).

**Input Parameters:**
- `userId` (UUID): User identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if user is the last Owner, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If `userId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Counts total Owner users
- If count is 1 and the user with given ID has Owner role, returns `true`
- Returns `false` if there are multiple Owners
- Returns `false` if user does not have Owner role
- Uses efficient COUNT query
- Used to enforce business rule: cannot delete last Owner

**Related Use Cases:**
- Owner deletion validation
- Owner transfer workflows

---

### 7. `findActiveOwners(): Promise<User[]>`

**Purpose:**  
Retrieve all active users who have the Owner role. Used for owner management when only active owners are relevant.

**Input Parameters:**
- None

**Output Type:**
- `Promise<User[]>`: Returns array of active User entities with Owner role
  - Returns empty array `[]` if no active Owner users exist

**Error Conditions:**
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Queries `users` table joined with `user_roles` where `role_id = 'Owner'` and `active = true`
- Filters by active status
- Returns complete user entities with all fields
- Excludes `password_hash` from results (security)
- Results may be sorted by `full_name` (business rule dependent)
- Uses indexes for efficient query

**Sorting and Filtering Rules:**
- Filters by `active = true`
- No default sorting applied (or sorted by `full_name` ascending)

**Related Use Cases:**
- Active owner management
- Owner assignment operations

---

### 8. `canCreateOwner(currentUserId: UUID): Promise<boolean>`

**Purpose:**  
Check if the current user has permission to create new Owner users. Only existing Owners can create new Owners.

**Input Parameters:**
- `currentUserId` (UUID): Current user identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if current user has Owner role and can create Owners, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If `currentUserId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Checks if current user has Owner role assigned
- Returns `true` only if user has Owner role
- Returns `false` if user does not exist
- Returns `false` if user exists but does not have Owner role
- Uses efficient EXISTS query
- Enforces business rule: only Owners can create Owners

**Related Use Cases:**
- UC-AUTH-005: Create User (Owner creation authorization)
- UC-ADMIN-009: Create User (Staff) (Owner creation authorization)

---

### 9. `transferOwnership(fromUserId: UUID, toUserId: UUID): Promise<void>`

**Purpose:**  
Transfer ownership by removing Owner role from one user and assigning it to another. Used for ownership transfer workflows.

**Input Parameters:**
- `fromUserId` (UUID): User identifier to remove Owner role from
  - Must be valid UUID format
  - Must have Owner role
- `toUserId` (UUID): User identifier to assign Owner role to
  - Must be valid UUID format
  - Must exist and be active (business rule dependent)

**Output Type:**
- `Promise<void>`: Returns void on successful transfer

**Error Conditions:**
- `InvalidUUIDError`: If either `fromUserId` or `toUserId` is not a valid UUID format
- `UserNotFoundError`: If either user does not exist
- `NotOwnerError`: If `fromUserId` does not have Owner role
- `AlreadyOwnerError`: If `toUserId` already has Owner role
- `LastOwnerError`: If `fromUserId` is the last Owner and cannot transfer
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Must be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Both role removal and assignment must succeed or transaction is rolled back

**Notes on Expected Behaviour:**
- Removes Owner role from `fromUserId` (deletes entry from `user_roles`)
- Assigns Owner role to `toUserId` (creates entry in `user_roles`)
- Validates that `fromUserId` has Owner role
- Validates that `toUserId` does not already have Owner role
- May validate that at least one Owner remains (business rule dependent)
- Updates `updated_at` timestamps for both users
- Atomic operation: both operations succeed or fail together

**Related Use Cases:**
- Future: Transfer Ownership use case

---

### 10. `removeOwnerRole(userId: UUID): Promise<void>`

**Purpose:**  
Remove the Owner role from a user. Used for demoting an Owner or ownership transfer.

**Input Parameters:**
- `userId` (UUID): User identifier
  - Must be valid UUID format
  - Must have Owner role

**Output Type:**
- `Promise<void>`: Returns void on successful removal

**Error Conditions:**
- `InvalidUUIDError`: If `userId` is not a valid UUID format
- `UserNotFoundError`: If user does not exist
- `NotOwnerError`: If user does not have Owner role
- `LastOwnerError`: If user is the last Owner and cannot be demoted
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- May be part of larger transaction (e.g., ownership transfer)

**Notes on Expected Behaviour:**
- Removes Owner role entry from `user_roles` join table
- Validates that user has Owner role before removal
- Validates that user is not the last Owner (business rule)
- Updates user `updated_at` timestamp
- User must have at least one role remaining (validated in application layer)

**Related Use Cases:**
- Owner demotion
- Ownership transfer workflows

---

### 11. `assignOwnerRole(userId: UUID): Promise<void>`

**Purpose:**  
Assign the Owner role to a user. Used for promoting a user to Owner or creating new Owner users.

**Input Parameters:**
- `userId` (UUID): User identifier
  - Must be valid UUID format
  - User must exist

**Output Type:**
- `Promise<void>`: Returns void on successful assignment

**Error Conditions:**
- `InvalidUUIDError`: If `userId` is not a valid UUID format
- `UserNotFoundError`: If user does not exist
- `AlreadyOwnerError`: If user already has Owner role
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- May be part of larger transaction (e.g., user creation with Owner role)

**Notes on Expected Behaviour:**
- Creates entry in `user_roles` join table with `role_id = 'Owner'`
- Sets `assigned_at` timestamp
- Validates that user does not already have Owner role
- Updates user `updated_at` timestamp
- User can have multiple roles (Owner role is added to existing roles)

**Related Use Cases:**
- UC-AUTH-005: Create User (Owner role assignment)
- Owner promotion workflows

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`
   - Unique index on `email` for `findByEmail()`
   - Index on `user_roles.role_id` for role filtering
   - Index on `user_roles.user_id` for user-role lookups

2. **Query Optimization:**
   - Use efficient queries (COUNT, EXISTS) for validation methods
   - Join `users` with `user_roles` for role filtering
   - Avoid loading full entities when only existence or count is needed

### Data Integrity

1. **Role Assignment:**
   - Owner role is assigned via `user_roles` join table
   - User must exist before assigning Owner role
   - User can have multiple roles (Owner + other roles)

2. **Business Rules:**
   - Only existing Owner users can create new Owner users
   - Cannot delete the last Owner (business rule)
   - Owner deletion may be restricted (business rule dependent)

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`transferOwnership`, `removeOwnerRole`, `assignOwnerRole`) should be within transactions
- Multi-step operations (ownership transfer) require transactions

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations

### Security Considerations

1. **Authorization:**
   - Owner role provides elevated permissions
   - Only Owners can create other Owners (prevents privilege escalation)
   - Owner operations should be logged in audit trail

2. **Sensitive Operations:**
   - Ownership transfer is a sensitive operation
   - Owner role assignment/demotion should be logged
   - Password hashes are never returned in results

### Relationship to UserRepository

This repository provides Owner-specific convenience methods. The underlying operations could also be performed using `UserRepository` with role filtering:

- `findAll()` is equivalent to `UserRepository.search({ role: 'Owner' })`
- `findById()` is equivalent to `UserRepository.findById()` + role check
- `exists()` is equivalent to `UserRepository.search({ role: 'Owner' })` + ID filter

This repository provides a specialized interface for Owner operations, improving code clarity and maintainability.

---

## Related Repositories

- **UserRepository:** Base repository for User entity operations
- **RoleRepository:** For role validation and lookup
- **AuditLogRepository:** For logging Owner operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `findOwnersByStore(storeId: UUID): Promise<User[]>` - Find Owners assigned to specific store
- `getOwnerPermissions(userId: UUID): Promise<Permission[]>` - Get Owner-specific permissions
- `validateOwnerAccess(userId: UUID, resource: string): Promise<boolean>` - Validate Owner access to resource

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

