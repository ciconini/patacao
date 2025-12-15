# Session Domain Entity

## Entity Description

The `Session` entity represents an authentication session for a user in the petshop management system. This entity tracks user sessions for access control and security purposes. Sessions can be revoked to immediately deny access, and can have expiration dates for short-lived token management.

**Key Characteristics:**
- Pure domain entity with no framework dependencies
- Encapsulates business rules and invariants
- Represents user authentication sessions
- Supports session revocation for immediate access denial
- Tracks expiration for short-lived token management
- Immutable identity and user linkage

## Properties

### Required Properties
- **`id`** (string, UUID): Unique identifier for the session
- **`userId`** (string, UUID): Reference to the User entity (invariant: must exist)
- **`createdAt`** (Date): Session creation timestamp
- **`revoked`** (boolean): Whether the session is revoked (default false)

### Optional Properties
- **`expiresAt`** (Date): Session expiration timestamp
- **`revokedAt`** (Date): Timestamp when session was revoked

### Metadata Properties
- **`createdAt`**: Timestamp when the session was created (immutable)

## Constructor Rules

### Required Parameters
1. **`id`**: Must be a non-empty string (UUID format recommended)
2. **`userId`**: Must be a non-empty string - **invariant**: Session must be linked to a User

### Optional Parameters
- **`createdAt`**: Defaults to current date/time if not provided
- **`expiresAt`**: Optional expiration timestamp
- **`revoked`**: Defaults to false
- **`revokedAt`**: Required if revoked is true

### Validation Rules
- **ID Validation**: Throws error if `id` is empty or null
- **User ID Validation**: Throws error if `userId` is empty or null
- **Expiration Date Validation**: If provided, `expiresAt` must be after `createdAt`
- **Revocation Validation**: If `revoked` is true, `revokedAt` must be provided

### Example Constructor Usage
```typescript
// Minimal required fields
const session = new Session(
  'uuid-123',
  'user-uuid-456'
);

// Full constructor with expiration
const session = new Session(
  'uuid-123',
  'user-uuid-456',
  new Date('2024-12-15T10:00:00Z'),
  new Date('2024-12-15T11:00:00Z'), // Expires in 1 hour
  false,
  undefined
);

// Revoked session
const session = new Session(
  'uuid-123',
  'user-uuid-456',
  new Date('2024-12-15T10:00:00Z'),
  new Date('2024-12-15T11:00:00Z'),
  true,
  new Date('2024-12-15T10:30:00Z')
);
```

## Methods

### Getters (Read-Only Access)
All properties are accessed through getters that return copies to maintain encapsulation:
- `id`: Returns the session's unique identifier
- `userId`: Returns the user ID (immutable)
- `createdAt`: Returns a copy of the creation timestamp
- `expiresAt`: Returns a copy of the expiration timestamp (or undefined)
- `revoked`: Returns whether the session is revoked
- `revokedAt`: Returns a copy of the revocation timestamp (or undefined)

### Behavior Methods

#### Session Management
- **`setExpirationDate(expiresAt: Date | undefined)`**: Sets or clears the expiration date (validates after createdAt)
- **`revoke()`**: Revokes the session (immediately denies access)

#### Status Checks
- **`isValid(referenceDate?: Date)`**: Checks if session is valid (not revoked and not expired)
- **`isExpired(referenceDate?: Date)`**: Checks if session is expired
- **`isRevoked()`**: Checks if session is revoked

#### Time Calculations
- **`getRemainingTimeMs(referenceDate?: Date)`**: Returns remaining time until expiration in milliseconds
- **`getRemainingTimeSeconds(referenceDate?: Date)`**: Returns remaining time until expiration in seconds
- **`getDurationMs(referenceDate?: Date)`**: Returns session duration in milliseconds
- **`getDurationSeconds(referenceDate?: Date)`**: Returns session duration in seconds

## Invariants

### Core Invariants (Always Enforced)
1. **User Linkage**: A Session **must** be linked to a User (`userId` cannot be empty)
   - Enforced in constructor
   - Cannot be changed after creation (immutable property)

2. **Expiration Date**: If `expiresAt` is provided, it **must** be after `createdAt`
   - Enforced in constructor and `setExpirationDate()` method

3. **Revocation Timestamp**: If `revoked` is true, `revokedAt` **must** be provided
   - Enforced in constructor

4. **Immutability**: `id`, `userId`, and `createdAt` are immutable after creation

### Business Rules
1. **Immediate Revocation**: Revoking a Session immediately denies access
   - Once revoked, `isValid()` always returns false
   - Revocation cannot be undone (immutable state)

2. **Short-Lived Tokens**: Tokens must be short-lived and refresh tokens revocable
   - Expiration dates enable short-lived token management
   - Revocation enables immediate token invalidation

3. **Session Validation**: Session validity requires:
   - Not revoked
   - Not expired (if expiration date is set)

## Example Lifecycle

### 1. Session Creation
**Scenario**: User logs in and a new session is created.

```
1. Session entity is instantiated:
   - id: "session-001"
   - userId: "user-001"
   - createdAt: 2024-12-15T10:00:00Z
   - expiresAt: 2024-12-15T11:00:00Z (1 hour expiration)
   - revoked: false
   - revokedAt: undefined

2. Entity validates:
   ✓ id is not empty
   ✓ userId is not empty
   ✓ expiresAt is after createdAt
```

### 2. Session Validation
**Scenario**: System checks if session is still valid.

```
1. isValid() → true
   → Not revoked
   → Not expired (current time: 2024-12-15T10:30:00Z)

2. isExpired() → false
3. isRevoked() → false
```

### 3. Session Expiration Check
**Scenario**: System checks if session has expired.

```
1. Current time: 2024-12-15T11:30:00Z
2. isExpired() → true
3. isValid() → false (expired)
4. getRemainingTimeMs() → undefined (already expired)
```

### 4. Session Revocation
**Scenario**: User logs out or session is revoked for security reasons.

```
1. revoke()
   → revoked: true
   → revokedAt: 2024-12-15T10:45:00Z

2. isValid() → false (revoked)
3. isRevoked() → true
4. isExpired() → false (but irrelevant, session is revoked)
```

### 5. Time Calculations
**Scenario**: System calculates session duration and remaining time.

```
1. Current time: 2024-12-15T10:30:00Z
2. getRemainingTimeMs() → 1800000 (30 minutes remaining)
3. getRemainingTimeSeconds() → 1800 (30 minutes in seconds)
4. getDurationMs() → 1800000 (30 minutes since creation)
5. getDurationSeconds() → 1800
```

### 6. Expiration Date Update
**Scenario**: Session expiration is extended.

```
1. setExpirationDate(new Date('2024-12-15T12:00:00Z'))
   → expiresAt: 2024-12-15T12:00:00Z
   → Validates expiration is after creation

2. getRemainingTimeSeconds() → 7200 (2 hours remaining)
```

### 7. Revoked Session Behavior
**Scenario**: Attempting to use a revoked session.

```
1. Session is revoked at 2024-12-15T10:45:00Z
2. isValid() → false (always false for revoked sessions)
3. isRevoked() → true
4. getRemainingTimeMs() → undefined (revoked sessions are invalid)
```

### 8. Session Without Expiration
**Scenario**: Session created without expiration date.

```
1. Session created without expiresAt
2. isExpired() → false (never expires)
3. isValid() → true (if not revoked)
4. getRemainingTimeMs() → undefined (no expiration)
```

### 9. Error Scenarios
**Scenario**: Attempting invalid operations.

```
1. new Session("", "user-001")
   → Error: "Session ID is required"

2. new Session("session-001", "")
   → Error: "User ID is required - a Session must be linked to a User"

3. new Session("session-001", "user-001", 
     new Date('2024-12-15T10:00:00Z'),
     new Date('2024-12-15T09:00:00Z'))
   → Error: "Expiration date must be after creation date"

4. new Session("session-001", "user-001",
     new Date('2024-12-15T10:00:00Z'),
     undefined,
     true)
   → Error: "Revoked session must have a revokedAt timestamp"
```

## Design Decisions

1. **Immutable Identity**: `id`, `userId`, and `createdAt` are immutable to maintain referential integrity
2. **Encapsulation**: All properties are private with getters returning copies to prevent external mutation
3. **Validation at Boundaries**: All validation happens in constructor and update methods
4. **Revocation Immutability**: Once revoked, a session cannot be unrevoked (security requirement)
5. **Expiration Management**: Optional expiration dates support short-lived token strategies
6. **Time Calculations**: Helper methods for remaining time and duration calculations
7. **Validation Logic**: `isValid()` combines revocation and expiration checks
8. **Timestamp Management**: Automatic `revokedAt` tracking when session is revoked

## Usage Notes

- This entity is framework-agnostic and can be used in any context
- Repository implementations should handle persistence concerns
- Session revocation is immediate and cannot be undone (security requirement)
- Expiration dates enable short-lived token management strategies
- Token generation and refresh logic should be handled at infrastructure/application layer
- Session validation should use `isValid()` method which checks both revocation and expiration
- Domain events can be published when session is revoked (outside entity scope)
- Multiple sessions can exist for the same user (one-to-many relationship)

