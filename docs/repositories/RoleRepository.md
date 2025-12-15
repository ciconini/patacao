# Repository Interface Contract: RoleRepository

## Overview

The `RoleRepository` interface defines the contract for role data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for role entity operations, including role lookup and validation.

**Entity:** `Role`  
**Table:** `roles`  
**Module:** Users & Access Control

## Entity Structure

Based on the ER model, the `Role` entity has the following attributes:

- `id` (VARCHAR(64), PRIMARY KEY) - Canonical role identifier (Owner, Manager, Staff, Accountant, Veterinarian)
- `name` (VARCHAR(128), NOT NULL) - Role display name
- `permissions` (JSON, NULL) - List of permission keys
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NULL) - Last update timestamp

**Indexes:**
- Primary key on `id` (string, not UUID)

**Relationships:**
- Role 1 — 0..* User (via `user_roles` join table)

**Business Rules:**
- Roles are validated on assignment; a user cannot be role-less
- Sensitive roles (Owner) have restricted creation flows
- Role IDs are canonical strings (not UUIDs): "Owner", "Manager", "Staff", "Accountant", "Veterinarian"
- Permissions are stored as JSON array of permission keys

---

## Method Specifications

### 1. `findById(id: string): Promise<Role | null>`

**Purpose:**  
Retrieve a role entity by its unique identifier. Used for role lookup, validation, and permission checks.

**Input Parameters:**
- `id` (string): Role identifier
  - Must be non-empty string
  - Must not be null or undefined
  - Canonical values: "Owner", "Manager", "Staff", "Accountant", "Veterinarian"

**Output Type:**
- `Promise<Role | null>`: Returns the role entity if found, `null` if not found

**Error Conditions:**
- `InvalidRoleIdError`: If `id` is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete role entity with all fields
- Returns `null` if role with given `id` does not exist
- Should use primary key index for efficient lookup
- Parses JSON field (`permissions`) from database
- Does not filter by any criteria (pure ID lookup)
- Role ID is case-sensitive (exact match)

**Related Use Cases:**
- UC-ADMIN-009: Create User Staff (role validation)
- UC-AUTH-005: Create User (role validation)

---

### 2. `findByIds(ids: string[]): Promise<Role[]>`

**Purpose:**  
Retrieve multiple role entities by their identifiers. Used for batch role validation and loading.

**Input Parameters:**
- `ids` (string[]): Array of role identifiers
  - Must be array of non-empty strings
  - Must not be null or undefined
  - Array can be empty (returns empty array)

**Output Type:**
- `Promise<Role[]>`: Returns array of role entities matching the provided IDs
  - Returns only roles that exist (non-existent IDs are silently ignored)
  - Returns empty array `[]` if no roles found or if input array is empty

**Error Conditions:**
- `InvalidRoleIdError`: If any ID in array is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Queries roles where `id IN (ids)`
- Uses primary key index for efficient lookup
- Returns roles in no specific order (database-dependent)
- Parses JSON field (`permissions`) from database
- Non-existent IDs are silently ignored (no error thrown)
- Used for batch validation of role assignments

**Sorting and Filtering Rules:**
- No default sorting applied
- Returns roles matching provided IDs only
- Application layer may sort by `name` or other criteria

**Related Use Cases:**
- UC-AUTH-005: Create User (verify multiple roles exist)

---

### 3. `findAll(): Promise<Role[]>`

**Purpose:**  
Retrieve all roles in the system. Used for role listing and selection operations.

**Input Parameters:**
- None

**Output Type:**
- `Promise<Role[]>`: Returns array of all role entities
  - Returns empty array `[]` if no roles exist

**Error Conditions:**
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns all roles without filtering
- Returns roles in no specific order (database-dependent)
- Parses JSON field (`permissions`) from database
- Used for role selection in administrative operations
- Typically returns small result set (5 roles: Owner, Manager, Staff, Accountant, Veterinarian)

**Sorting and Filtering Rules:**
- No default sorting applied
- No filtering applied
- Application layer may sort by `name` or `id`

**Related Use Cases:**
- Role listing operations (GET /roles endpoint)
- Role selection in user management

---

### 4. `exists(id: string): Promise<boolean>`

**Purpose:**  
Check if a role with the given ID exists. Used for quick existence validation without loading the full entity.

**Input Parameters:**
- `id` (string): Role identifier
  - Must be non-empty string
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if role exists, `false` otherwise

**Error Conditions:**
- `InvalidRoleIdError`: If `id` is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses efficient EXISTS query or COUNT query
- Returns boolean value (true/false)
- Does not load role entity (more efficient than `findById()` for existence checks)
- Uses primary key index for efficient lookup
- Used for validation before operations that require role existence

**Related Use Cases:**
- Role validation in user creation
- Role validation in permission checks

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`, `findByIds()`, and `exists()`

2. **Query Optimization:**
   - Use efficient queries for existence checks
   - Consider caching role data (roles are relatively static)
   - Use `exists()` instead of `findById()` when only existence check is needed
   - Batch queries for multiple roles using `findByIds()`

3. **Caching:**
   - Roles are relatively static and rarely change
   - Consider caching role data in memory for performance
   - Invalidate cache when roles are updated (if update functionality exists)

### Data Integrity

1. **Foreign Key Constraints:**
   - Users reference roles via `user_roles` join table (enforced by database)
   - Roles cannot be deleted if they have assigned users (business rule dependent)

2. **Validation:**
   - Role ID must be one of the canonical values (validated in application layer)
   - Role ID is case-sensitive
   - Permissions must be valid JSON array if provided

3. **Business Rules:**
   - Roles are predefined and typically not created/updated via repository
   - Role IDs are canonical strings, not UUIDs
   - Sensitive roles (Owner) have restricted assignment flows

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Role data is typically read-only (roles are predefined)

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations

### Business Rules

1. **Canonical Role IDs:**
   - Role IDs are predefined strings: "Owner", "Manager", "Staff", "Accountant", "Veterinarian"
   - Role IDs are case-sensitive
   - New roles are typically added via database migration, not through repository

2. **Permissions:**
   - Permissions are stored as JSON array
   - Permissions define what actions a role can perform
   - Permission structure is application-specific

3. **Role Assignment:**
   - Users must have at least one role
   - Owner role assignment is restricted
   - Roles are assigned via `user_roles` join table (managed by UserRepository)

---

## Related Repositories

- **UserRepository:** For managing user-role assignments (via `user_roles` join table)
- **AuditLogRepository:** For logging role-related operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `findByPermission(permission: string): Promise<Role[]>` - Find roles with specific permission
- `update(role: Role): Promise<Role>` - Update role (if role management is needed)
- `save(role: Role): Promise<Role>` - Create role (if dynamic role creation is needed)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

