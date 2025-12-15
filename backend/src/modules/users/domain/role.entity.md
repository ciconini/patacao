# Role Domain Entity

## Entity Description

The `Role` entity represents a role in the petshop management system for access control and authorization. Roles define what permissions users have in the system. Users are assigned one or more roles that determine their access level and capabilities.

**Key Characteristics:**
- Pure domain entity with no framework dependencies
- Encapsulates business rules and invariants
- Represents access control roles
- Manages permissions as a list of permission keys
- Supports predefined role names (Owner, Manager, Staff, Accountant, Veterinarian)
- Identifies sensitive roles with restricted creation flows

## Properties

### Required Properties
- **`id`** (string): Canonical role identifier (string, not UUID, e.g., "Owner", "Manager", max 64 chars)
- **`name`** (string): Role name (must be one of: Owner, Manager, Staff, Accountant, Veterinarian, max 128 chars)

### Optional Properties
- **`permissions`** (string[]): List of permission keys (defaults to empty array)

### Metadata Properties
- **`createdAt`** (Date): Timestamp when the role was created
- **`updatedAt`** (Date): Timestamp of the last update

### RoleName Enum
```typescript
enum RoleName {
  OWNER = 'Owner',
  MANAGER = 'Manager',
  STAFF = 'Staff',
  ACCOUNTANT = 'Accountant',
  VETERINARIAN = 'Veterinarian',
}
```

## Constructor Rules

### Required Parameters
1. **`id`**: Must be a non-empty string, max 64 characters (canonical identifier, not UUID)
2. **`name`**: Must be a non-empty string, must be one of the predefined role names

### Optional Parameters
- **`permissions`**: Defaults to empty array

### Validation Rules
- **ID Validation**: Throws error if `id` is empty, null, or exceeds 64 characters
- **Name Validation**: 
  - Must be non-empty
  - Must be one of: Owner, Manager, Staff, Accountant, Veterinarian
  - Max 128 characters

### Example Constructor Usage
```typescript
// Minimal required fields
const role = new Role(
  'Owner',
  'Owner'
);

// Full constructor with permissions
const role = new Role(
  'Manager',
  'Manager',
  ['appointments:create', 'appointments:update', 'invoices:view', 'invoices:create'],
  new Date('2024-01-15'),
  new Date('2024-01-15')
);
```

## Methods

### Getters (Read-Only Access)
All properties are accessed through getters that return copies to maintain encapsulation:
- `id`: Returns the role's canonical identifier
- `name`: Returns the role name
- `permissions`: Returns a copy of the permissions array
- `createdAt`: Returns a copy of the creation timestamp
- `updatedAt`: Returns a copy of the last update timestamp

### Behavior Methods

#### Property Updates
- **`updateName(name: string)`**: Updates role name (validates against predefined names)

#### Permission Management
- **`addPermission(permission: string)`**: Adds a permission to the role
- **`removePermission(permission: string)`**: Removes a permission from the role
- **`setPermissions(permissions: string[])`**: Sets all permissions for the role
- **`hasPermission(permission: string)`**: Checks if role has a specific permission
- **`hasAllPermissions(permissions: string[])`**: Checks if role has all specified permissions
- **`hasAnyPermission(permissions: string[])`**: Checks if role has any of the specified permissions
- **`getPermissionCount()`**: Returns the number of permissions

#### Status Checks
- **`isOwner()`**: Checks if this is the Owner role
- **`isSensitive()`**: Checks if this is a sensitive role (Owner) with restricted creation flows

## Invariants

### Core Invariants (Always Enforced)
1. **ID Requirement**: Role ID **must** be non-empty and max 64 characters
   - Enforced in constructor
   - Cannot be changed after creation (immutable property)

2. **Name Requirement**: Role name **must** be:
   - Non-empty
   - One of the predefined role names: Owner, Manager, Staff, Accountant, Veterinarian
   - Max 128 characters
   - Enforced in constructor and `updateName()` method

3. **Permission Validity**: Permissions **must** be non-empty strings when added

### Business Rules
1. **Role Assignment**: Roles are validated on assignment; a user cannot be role-less (enforced at User entity level)
2. **Sensitive Roles**: Sensitive roles (Owner) have restricted creation flows (enforced at use case level)
3. **Permission Keys**: Permissions are stored as string keys that represent specific actions or resources
4. **Role Hierarchy**: Role names indicate hierarchy (Owner > Manager > Staff/Accountant/Veterinarian) but hierarchy logic is at use case level

## Example Lifecycle

### 1. Role Creation
**Scenario**: System roles are created during initialization.

```
1. Owner role is instantiated:
   - id: "Owner"
   - name: "Owner"
   - permissions: []
   - createdAt: 2024-01-15T10:00:00Z
   - updatedAt: 2024-01-15T10:00:00Z

2. Entity validates:
   ✓ id is not empty
   ✓ name is valid (one of predefined names)
```

### 2. Adding Permissions
**Scenario**: Permissions are assigned to roles.

```
1. addPermission("appointments:create")
   → permissions: ["appointments:create"]
   → updatedAt: 2024-01-15T10:30:00Z

2. addPermission("appointments:update")
   → permissions: ["appointments:create", "appointments:update"]
   → updatedAt: 2024-01-15T10:35:00Z

3. addPermission("invoices:view")
   addPermission("invoices:create")
   → permissions: ["appointments:create", "appointments:update", "invoices:view", "invoices:create"]
   → updatedAt: 2024-01-15T10:40:00Z
```

### 3. Permission Checks
**Scenario**: System checks if role has required permissions.

```
1. hasPermission("appointments:create") → true
2. hasPermission("appointments:delete") → false

3. hasAllPermissions(["appointments:create", "appointments:update"]) → true
4. hasAllPermissions(["appointments:create", "appointments:delete"]) → false

5. hasAnyPermission(["appointments:delete", "invoices:view"]) → true
6. hasAnyPermission(["appointments:delete", "invoices:delete"]) → false
```

### 4. Removing Permissions
**Scenario**: Permissions are removed from a role.

```
1. removePermission("invoices:create")
   → permissions: ["appointments:create", "appointments:update", "invoices:view"]
   → updatedAt: 2024-01-15T11:00:00Z

2. getPermissionCount() → 3
```

### 5. Setting All Permissions
**Scenario**: Role permissions are replaced entirely.

```
1. setPermissions([
     "appointments:create",
     "appointments:update",
     "appointments:view",
     "customers:view"
   ])
   → permissions: ["appointments:create", "appointments:update", "appointments:view", "customers:view"]
   → updatedAt: 2024-01-15T12:00:00Z
```

### 6. Sensitive Role Detection
**Scenario**: System identifies sensitive roles for restricted operations.

```
1. Owner role:
   isOwner() → true
   isSensitive() → true

2. Manager role:
   isOwner() → false
   isSensitive() → false
```

### 7. Role Name Update
**Scenario**: Role name is updated (rare, but possible).

```
1. updateName("Senior Manager")
   → Error: "Invalid role name: Senior Manager. Valid names are: Owner, Manager, Staff, Accountant, Veterinarian"

2. updateName("Manager")
   → name: "Manager"
   → updatedAt: 2024-01-20T09:00:00Z
```

### 8. Error Scenarios
**Scenario**: Attempting invalid operations.

```
1. new Role("", "Owner")
   → Error: "Role ID is required"

2. new Role("Owner", "")
   → Error: "Role name is required"

3. new Role("Owner", "InvalidRole")
   → Error: "Invalid role name: InvalidRole. Valid names are: Owner, Manager, Staff, Accountant, Veterinarian"

4. addPermission("")
   → Error: "Permission cannot be empty"
```

## Design Decisions

1. **Immutable Identity**: `id` is immutable to maintain referential integrity
2. **Canonical ID**: Role ID is a string identifier (not UUID) representing canonical role names
3. **Encapsulation**: All properties are private with getters returning copies to prevent external mutation
4. **Validation at Boundaries**: All validation happens in constructor and update methods
5. **Predefined Role Names**: Role names are restricted to predefined values for consistency
6. **Permission Management**: Flexible permission system using string keys
7. **Sensitive Role Detection**: Built-in method to identify sensitive roles (Owner) for restricted operations
8. **Permission Checks**: Multiple methods for checking permissions (single, all, any)
9. **Timestamp Management**: Automatic `updatedAt` tracking on every modification

## Usage Notes

- This entity is framework-agnostic and can be used in any context
- Repository implementations should handle persistence concerns
- Role assignment to users is handled at User entity level
- Sensitive role creation restrictions are enforced at use case level
- Permission keys are string-based and should follow a consistent naming convention (e.g., "resource:action")
- Role hierarchy and permission inheritance logic should be handled at use case/domain service level
- Domain events can be published when significant state changes occur (outside entity scope)
- Role names are case-sensitive and must match exactly one of the predefined values

