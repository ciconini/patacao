# User Domain Entity

## Entity Description

The `User` entity represents a system user (staff, managers, accountants, veterinarians) in the petshop management system. This entity represents people who log into the system to perform work, distinct from Customers who are clients of the business.

**Key Characteristics:**
- Pure domain entity with no framework dependencies
- Encapsulates business rules and invariants
- Represents system users with authentication and authorization
- Supports role-based access control
- Tracks working hours for staff scheduling
- Manages service skills for service assignment
- Can be assigned to multiple stores

## Properties

### Required Properties
- **`id`** (string, UUID): Unique identifier for the user
- **`email`** (string): Email address (required, must be unique across all users)
- **`fullName`** (string): User's full name (1-255 characters)
- **`roleIds`** (string[]): List of Role IDs (required, must have at least one)

### Optional Properties
- **`phone`** (string): Contact phone number
- **`username`** (string): Username for login (optional, must be unique if provided, 3-128 chars)
- **`passwordHash`** (string): Hashed password (for secure storage, hashing done outside domain)
- **`storeIds`** (string[]): List of Store IDs this user is assigned to
- **`workingHours`** (WeeklySchedule): Weekly working hours schedule for staff
- **`serviceSkills`** (string[]): List of Service IDs or skill tags the user can perform
- **`active`** (boolean): Whether the user account is active (default true)

### Metadata Properties
- **`createdAt`** (Date): Timestamp when the user was created
- **`updatedAt`** (Date): Timestamp of the last update

### WorkingHours Interface
```typescript
interface WorkingHours {
  startTime: string;      // Format: "HH:mm" (e.g., "09:00")
  endTime: string;        // Format: "HH:mm" (e.g., "17:00")
  isAvailable: boolean;   // Whether available on this day
}
```

### WeeklySchedule Interface
```typescript
interface WeeklySchedule {
  monday?: WorkingHours;
  tuesday?: WorkingHours;
  wednesday?: WorkingHours;
  thursday?: WorkingHours;
  friday?: WorkingHours;
  saturday?: WorkingHours;
  sunday?: WorkingHours;
}
```

## Constructor Rules

### Required Parameters
1. **`id`**: Must be a non-empty string (UUID format recommended)
2. **`email`**: Must be a non-empty string, valid email format, max 255 characters, must be unique
3. **`fullName`**: Must be a non-empty string, 1-255 characters
4. **`roleIds`**: Must be a non-empty array with at least one role ID, no duplicates

### Optional Parameters
- All other properties are optional and can be set later via behavior methods
- **`active`**: Defaults to true
- **`storeIds`**: Defaults to empty array
- **`serviceSkills`**: Defaults to empty array

### Validation Rules
- **ID Validation**: Throws error if `id` is empty or null
- **Email Validation**: 
  - Must be non-empty
  - Must be valid email format
  - Max 255 characters
  - Must be unique (enforced at repository/aggregate level)
- **Full Name Validation**: Throws error if `fullName` is empty, null, or exceeds 255 characters
- **Username Validation**: If provided:
  - Must be 3-128 characters
  - Can only contain letters, numbers, underscores, and hyphens
  - Must be unique (enforced at repository/aggregate level)
- **Role IDs Validation**: 
  - Must have at least one role
  - No empty role IDs
  - No duplicate role IDs
- **Working Hours Validation**: If provided:
  - Time format must be "HH:mm" (24-hour format)
  - End time must be after start time
- **Password Hash**: No validation (handled by infrastructure layer)

### Example Constructor Usage
```typescript
// Minimal required fields
const user = new User(
  'uuid-123',
  'staff@patacao.pt',
  'João Silva',
  ['Staff']
);

// Full constructor with all fields
const user = new User(
  'uuid-123',
  'manager@patacao.pt',
  'Maria Santos',
  ['Manager', 'Staff'],
  '+351912345678',
  'msantos',
  'hashed_password_here',
  ['store-001', 'store-002'],
  {
    monday: { startTime: '09:00', endTime: '17:00', isAvailable: true },
    tuesday: { startTime: '09:00', endTime: '17:00', isAvailable: true },
    // ... other days
  },
  ['service-001', 'service-002'],
  true,
  new Date('2024-01-15'),
  new Date('2024-01-15')
);
```

## Methods

### Getters (Read-Only Access)
All properties are accessed through getters that return copies to maintain encapsulation:
- `id`: Returns the user's unique identifier
- `email`: Returns the email address
- `fullName`: Returns the full name
- `phone`: Returns the phone (or undefined)
- `username`: Returns the username (or undefined)
- `passwordHash`: Returns the password hash (or undefined)
- `roleIds`: Returns a copy of the role IDs array
- `storeIds`: Returns a copy of the store IDs array
- `workingHours`: Returns a copy of the working hours schedule (or undefined)
- `serviceSkills`: Returns a copy of the service skills array
- `active`: Returns whether the user is active
- `createdAt`: Returns a copy of the creation timestamp
- `updatedAt`: Returns a copy of the last update timestamp

### Behavior Methods

#### Property Updates
- **`updateEmail(email: string)`**: Updates email address (validates format)
- **`updateFullName(fullName: string)`**: Updates full name (validates non-empty, max 255 chars)
- **`updatePhone(phone: string | undefined)`**: Updates phone number
- **`updateUsername(username: string | undefined)`**: Updates username (validates format)
- **`updatePasswordHash(passwordHash: string | undefined)`**: Updates password hash

#### Role Management
- **`addRole(roleId: string)`**: Adds a role to the user
- **`removeRole(roleId: string)`**: Removes a role (validates at least one role remains)
- **`setRoles(roleIds: string[])`**: Replaces all roles (validates at least one)
- **`hasRole(roleId: string)`**: Checks if user has a specific role
- **`isOwner()`**: Checks if user has the Owner role

#### Store Assignment
- **`assignToStore(storeId: string)`**: Assigns user to a store
- **`removeFromStore(storeId: string)`**: Removes user from a store
- **`isAssignedToStore(storeId: string)`**: Checks if user is assigned to a store

#### Working Hours Management
- **`updateWorkingHours(workingHours: WeeklySchedule | undefined)`**: Updates working hours schedule (validates format)
- **`getDayWorkingHours(dayOfWeek)`**: Gets working hours for a specific day
- **`updateDayWorkingHours(dayOfWeek, hours)`**: Updates working hours for a specific day
- **`isAvailableOnDay(dayOfWeek)`**: Checks if user is available on a specific day
- **`isAvailableAtTime(dayOfWeek, time)`**: Checks if user is available at a specific time on a specific day
- **`isTimeRangeWithinWorkingHours(dayOfWeek, startTime, endTime)`**: Checks if a time range falls within working hours

#### Service Skills Management
- **`addServiceSkill(serviceId: string)`**: Adds a service skill
- **`removeServiceSkill(serviceId: string)`**: Removes a service skill
- **`setServiceSkills(serviceSkills: string[])`**: Sets all service skills
- **`hasServiceSkill(serviceId: string)`**: Checks if user has a service skill
- **`canPerformService(serviceId: string)`**: Checks if user can perform a service

#### Account Status
- **`activate()`**: Activates the user account
- **`deactivate()`**: Deactivates the user account

## Invariants

### Core Invariants (Always Enforced)
1. **Role Requirement**: A User **must** have at least one Role to access the system
   - Enforced in constructor and `removeRole()` method
   - Cannot remove the last role

2. **Email Requirement**: Email **must** be non-empty and valid format
   - Enforced in constructor and `updateEmail()` method
   - Must be unique (enforced at repository/aggregate level)

3. **Full Name Requirement**: Full name **must** be non-empty and 1-255 characters
   - Enforced in constructor and `updateFullName()` method

4. **Username Format**: If username is provided, it **must** be:
   - 3-128 characters
   - Alphanumeric with underscores/hyphens only
   - Unique (enforced at repository/aggregate level)

5. **Working Hours Format**: If working hours are provided:
   - Time format must be "HH:mm" (24-hour format)
   - End time must be after start time

6. **No Duplicate Roles**: Role IDs array cannot contain duplicates
   - Enforced in constructor and `setRoles()` method

### Business Rules
1. **Role-Based Access**: User access is determined by their roles
2. **Owner Privileges**: Only users with Owner role can create Owner users or transfer ownership (enforced at use case level)
3. **Session Management**: Session revocation must terminate active sessions (enforced at infrastructure/use case level)
4. **Store Assignment**: Users can be assigned to multiple stores
5. **Service Skills**: Users can have multiple service skills for service assignment
6. **Working Hours**: Used for staff scheduling and appointment assignment

## Example Lifecycle

### 1. User Registration
**Scenario**: A new staff member is hired and needs system access.

```
1. User entity is instantiated:
   - id: "user-001"
   - email: "staff@patacao.pt"
   - fullName: "João Silva"
   - roleIds: ["Staff"]
   - active: true
   - createdAt: 2024-01-15T10:00:00Z
   - updatedAt: 2024-01-15T10:00:00Z

2. Entity validates:
   ✓ id is not empty
   ✓ email is valid format
   ✓ fullName is not empty
   ✓ roleIds has at least one role
   ✓ No duplicate roles
```

### 2. Adding Authentication Credentials
**Scenario**: User sets up login credentials.

```
1. updateUsername("jsilva")
   → Validates username format (3+ chars, alphanumeric)
   → updatedAt: 2024-01-15T10:30:00Z

2. updatePasswordHash("$2b$10$hashed_password_here")
   → Password hash stored (hashing done outside domain)
   → updatedAt: 2024-01-15T10:35:00Z
```

### 3. Role Promotion
**Scenario**: Staff member is promoted to Manager.

```
1. addRole("Manager")
   → roleIds: ["Staff", "Manager"]
   → updatedAt: 2024-01-20T14:00:00Z

2. isOwner() → false
3. hasRole("Manager") → true
```

### 4. Store Assignment
**Scenario**: User is assigned to work at multiple stores.

```
1. assignToStore("store-001")
   → storeIds: ["store-001"]
   → updatedAt: 2024-01-15T11:00:00Z

2. assignToStore("store-002")
   → storeIds: ["store-001", "store-002"]
   → updatedAt: 2024-01-15T11:05:00Z

3. isAssignedToStore("store-001") → true
```

### 5. Working Hours Setup
**Scenario**: Staff member's working schedule is configured.

```
1. updateWorkingHours({
     monday: { startTime: "09:00", endTime: "17:00", isAvailable: true },
     tuesday: { startTime: "09:00", endTime: "17:00", isAvailable: true },
     wednesday: { startTime: "09:00", endTime: "17:00", isAvailable: true },
     thursday: { startTime: "09:00", endTime: "17:00", isAvailable: true },
     friday: { startTime: "09:00", endTime: "17:00", isAvailable: true },
     saturday: { startTime: "09:00", endTime: "13:00", isAvailable: true },
     sunday: { startTime: "09:00", endTime: "13:00", isAvailable: false }
   })
   → Validates time formats
   → Validates end time after start time
   → updatedAt: 2024-01-15T12:00:00Z

2. isAvailableOnDay("monday") → true
3. isAvailableOnDay("sunday") → false

4. isAvailableAtTime("monday", "10:00") → true
5. isAvailableAtTime("monday", "08:00") → false

6. isTimeRangeWithinWorkingHours("monday", "10:00", "11:00") → true
7. isTimeRangeWithinWorkingHours("monday", "08:00", "09:00") → false
```

### 6. Service Skills Assignment
**Scenario**: Veterinarian adds skills for services they can perform.

```
1. addServiceSkill("grooming")
   → serviceSkills: ["grooming"]
   → updatedAt: 2024-01-15T13:00:00Z

2. addServiceSkill("vaccination")
   → serviceSkills: ["grooming", "vaccination"]
   → updatedAt: 2024-01-15T13:05:00Z

3. canPerformService("grooming") → true
4. canPerformService("surgery") → false
```

### 7. Account Deactivation
**Scenario**: User leaves the company, account is deactivated.

```
1. deactivate()
   → active: false
   → updatedAt: 2024-12-01T10:00:00Z

2. User can no longer log in (enforced at infrastructure level)
```

### 8. Role Removal
**Scenario**: User's Manager role is removed, keeping only Staff role.

```
1. removeRole("Manager")
   → roleIds: ["Staff"]
   → updatedAt: 2024-06-01T14:00:00Z

2. Attempt to remove last role:
   removeRole("Staff")
   → Error: "User must have at least one role"
```

### 9. Error Scenarios
**Scenario**: Attempting invalid operations.

```
1. new User("", "staff@patacao.pt", "João Silva", ["Staff"])
   → Error: "User ID is required"

2. new User("user-001", "", "João Silva", ["Staff"])
   → Error: "Email is required"

3. new User("user-001", "invalid-email", "João Silva", ["Staff"])
   → Error: "Invalid email format"

4. new User("user-001", "staff@patacao.pt", "João Silva", [])
   → Error: "User must have at least one role"

5. updateUsername("ab")
   → Error: "Username must be at least 3 characters"

6. updateWorkingHours({
     monday: { startTime: "17:00", endTime: "09:00", isAvailable: true }
   })
   → Error: "End time must be after start time"
```

## Design Decisions

1. **Immutable Identity**: `id` is immutable to maintain referential integrity
2. **Encapsulation**: All properties are private with getters returning copies to prevent external mutation
3. **Validation at Boundaries**: All validation happens in constructor and update methods
4. **Role Management**: Enforces at least one role invariant at entity level
5. **Password Security**: Password hash is stored but hashing is done outside domain layer
6. **Working Hours**: Structured schedule supports staff scheduling and appointment assignment
7. **Service Skills**: Flexible list supports both Service IDs and skill tags
8. **Multi-Store Support**: Users can be assigned to multiple stores
9. **Account Status**: Active flag allows account deactivation without deletion
10. **Timestamp Management**: Automatic `updatedAt` tracking on every modification

## Usage Notes

- This entity is framework-agnostic and can be used in any context
- Repository implementations should handle persistence concerns
- Email and username uniqueness must be enforced at repository/aggregate level
- Password hashing should be done in the infrastructure/application layer
- Use cases should orchestrate entity creation and updates
- Role-based authorization checks should use `hasRole()` or `isOwner()` methods
- Session management and revocation are handled at infrastructure/use case level
- Domain events can be published when significant state changes occur (outside entity scope)

