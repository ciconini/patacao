# Repository Interface Contract: SessionRepository

## Overview

The `SessionRepository` interface defines the contract for session data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for session entity operations, including session creation, validation, revocation, and expiration management.

**Entity:** `Session`  
**Table:** `sessions`  
**Module:** Users & Access Control

## Entity Structure

Based on the ER model, the `Session` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier (session ID)
- `user_id` (UUID, NOT NULL, FK -> users(id)) - User this session belongs to
- `created_at` (DATETIME, NOT NULL) - Session creation timestamp
- `expires_at` (DATETIME, NOT NULL) - Session expiration timestamp
- `revoked` (BOOLEAN, NOT NULL, DEFAULT FALSE) - Session revocation flag

**Note:** The use cases reference refresh tokens, but the ER model doesn't explicitly show a `refresh_token` field. This may be stored separately or as part of the session entity. Methods are included based on use case requirements.

**Indexes:**
- Primary key on `id`
- Index on `user_id` (for user session lookups)
- Index on `revoked` (for filtering revoked sessions)

**Relationships:**
- Session * — 1 User (via `user_id`)

**Business Rules:**
- Revoking a Session immediately denies access
- Tokens must be short-lived and refresh tokens revocable
- Sessions are retained for audit purposes
- Expired sessions should be cleaned up periodically

---

## Method Specifications

### 1. `save(session: Session): Promise<Session>`

**Purpose:**  
Persist a new session entity. This method handles session creation and is used during user login.

**Input Parameters:**
- `session` (Session): Session entity to persist
  - `id` is null/undefined (new session)
  - Required fields: `user_id`, `created_at`, `expires_at`
  - Optional fields: `revoked` (defaults to false)
  - May include `refresh_token` if stored in session entity

**Output Type:**
- `Promise<Session>`: Returns the persisted session entity with all fields populated, including generated `id`, `created_at`, and `expires_at` timestamps

**Error Conditions:**
- `SessionValidationError`: If required fields are missing or invalid
- `UserNotFoundError`: If `user_id` does not exist
- `InvalidExpirationError`: If `expires_at` is before `created_at`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- User existence validation should be within the same transaction

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `created_at` to current timestamp
- Sets `expires_at` based on session duration (calculated in application layer)
- Sets `revoked` to false by default
- Validates that `user_id` references existing user
- Returns the complete session entity with all fields
- May store refresh token if part of session entity

**Related Use Cases:**
- UC-AUTH-001: User Login

---

### 2. `findById(sessionId: UUID): Promise<Session | null>`

**Purpose:**  
Retrieve a session entity by its unique identifier. Used for session lookup, validation, and detail retrieval.

**Input Parameters:**
- `sessionId` (UUID): Session identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Session | null>`: Returns the session entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `sessionId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete session entity with all fields
- Returns `null` if session with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by revocation or expiration status (returns all sessions)
- Used for session validation and lookup

**Related Use Cases:**
- UC-AUTH-002: User Logout (session lookup)

---

### 3. `findByRefreshToken(refreshToken: string): Promise<Session | null>`

**Purpose:**  
Retrieve a session entity by its refresh token. Used for token refresh operations and session lookup by refresh token.

**Input Parameters:**
- `refreshToken` (string): Refresh token value
  - Must be non-empty string
  - Must not be null or undefined
  - May be hashed token if stored as hash

**Output Type:**
- `Promise<Session | null>`: Returns the session entity if found, `null` if not found

**Error Conditions:**
- `InvalidTokenError`: If `refreshToken` is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Searches for session where refresh token matches (may be hashed comparison)
- Returns session entity if found
- Returns `null` if no session found with given refresh token
- Should check revocation status (application layer responsibility)
- Should check expiration status (application layer responsibility)
- Used for token refresh and session validation

**Sorting and Filtering Rules:**
- Exact token match (may be hashed token comparison)
- No filtering applied (pure token lookup)

**Related Use Cases:**
- UC-AUTH-002: User Logout (find session by refresh token)
- Token refresh operations

---

### 4. `findByUserId(userId: UUID): Promise<Session[]>`

**Purpose:**  
Retrieve all sessions for a specific user. Used for session management, listing user sessions, and bulk revocation.

**Input Parameters:**
- `userId` (UUID): User identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Session[]>`: Returns array of session entities for the user
  - Returns empty array `[]` if user has no sessions
  - Returns empty array `[]` if user does not exist (no error thrown)
  - May include revoked and expired sessions (filtering handled in application layer)

**Error Conditions:**
- `InvalidUUIDError`: If `userId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters sessions where `user_id = userId`
- Uses index on `user_id` for efficient query
- Returns sessions in no specific order (database-dependent)
- Returns all sessions regardless of revocation or expiration status
- Application layer should filter active sessions if needed
- Used for session management and listing

**Sorting and Filtering Rules:**
- No default sorting applied
- Filters by user only
- Application layer may sort by `created_at` descending (most recent first)
- Application layer may filter by `revoked` and `expires_at`

**Related Use Cases:**
- Session listing operations (GET /sessions endpoint)
- User session management

---

### 5. `revoke(sessionId: UUID): Promise<void>`

**Purpose:**  
Mark a session as revoked. Used for session invalidation during logout and security operations.

**Input Parameters:**
- `sessionId` (UUID): Session identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<void>`: Returns void on successful revocation

**Error Conditions:**
- `SessionNotFoundError`: If session with given `id` does not exist
- `InvalidUUIDError`: If `sessionId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Idempotent operation (revoking already revoked session is allowed)

**Notes on Expected Behaviour:**
- Sets `revoked` flag to `true`
- Does not delete session record (retained for audit)
- Idempotent operation (can be called multiple times safely)
- Does not update `expires_at` (session remains expired at original time)
- Used for immediate session invalidation

**Related Use Cases:**
- UC-AUTH-002: User Logout (revoke session)

---

### 6. `revokeByRefreshToken(refreshToken: string): Promise<void>`

**Purpose:**  
Mark a session as revoked by its refresh token. Used for session invalidation when only refresh token is available.

**Input Parameters:**
- `refreshToken` (string): Refresh token value
  - Must be non-empty string
  - Must not be null or undefined
  - May be hashed token if stored as hash

**Output Type:**
- `Promise<void>`: Returns void on successful revocation

**Error Conditions:**
- `SessionNotFoundError`: If session with given refresh token does not exist
- `InvalidTokenError`: If `refreshToken` is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Idempotent operation (revoking already revoked session is allowed)

**Notes on Expected Behaviour:**
- Finds session by refresh token (may be hashed comparison)
- Sets `revoked` flag to `true`
- Does not delete session record (retained for audit)
- Idempotent operation (can be called multiple times safely)
- Used for session invalidation via refresh token

**Related Use Cases:**
- UC-AUTH-002: User Logout (revoke by refresh token)

---

### 7. `revokeAllByUserId(userId: UUID): Promise<void>`

**Purpose:**  
Mark all sessions for a specific user as revoked. Used for account security operations, password reset, and bulk session revocation.

**Input Parameters:**
- `userId` (UUID): User identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<void>`: Returns void on successful revocation

**Error Conditions:**
- `InvalidUUIDError`: If `userId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Bulk update operation should be atomic

**Notes on Expected Behaviour:**
- Updates all sessions where `user_id = userId` and `revoked = false`
- Sets `revoked` flag to `true` for all active sessions
- Does not delete session records (retained for audit)
- Uses index on `user_id` for efficient query
- Used for security operations and password reset

**Related Use Cases:**
- UC-AUTH-004: Password Reset Confirm (revoke all user sessions)

---

### 8. `findActiveByUserId(userId: UUID): Promise<Session[]>`

**Purpose:**  
Retrieve all active (non-revoked and non-expired) sessions for a specific user. Used for session management and active session listing.

**Input Parameters:**
- `userId` (UUID): User identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Session[]>`: Returns array of active session entities for the user
  - Returns empty array `[]` if user has no active sessions
  - Returns empty array `[]` if user does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `userId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters sessions where `user_id = userId` AND `revoked = false` AND `expires_at > current_timestamp`
- Uses indexes on `user_id` and `revoked` for efficient query
- Returns sessions in no specific order (database-dependent)
- Used for active session management

**Sorting and Filtering Rules:**
- Filters by user, revocation status, and expiration
- No default sorting applied
- Application layer may sort by `created_at` descending (most recent first)

**Related Use Cases:**
- Active session listing operations
- Session management

---

### 9. `deleteExpired(): Promise<number>`

**Purpose:**  
Delete expired sessions from the database. Used for cleanup operations and data retention management.

**Input Parameters:**
- None

**Output Type:**
- `Promise<number>`: Returns number of deleted sessions (integer >= 0)

**Error Conditions:**
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Bulk delete operation should be atomic

**Notes on Expected Behaviour:**
- Deletes sessions where `expires_at < current_timestamp`
- May also delete revoked sessions older than retention period (business rule dependent)
- Returns count of deleted sessions
- Used for periodic cleanup operations
- Should be run as background job

**Sorting and Filtering Rules:**
- Filters by expiration timestamp
- May filter by revocation status and age (business rule dependent)

**Related Use Cases:**
- Background cleanup operations
- Data retention management

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()` and `revoke()`
   - Index on `user_id` for `findByUserId()`, `revokeAllByUserId()`, and `findActiveByUserId()`
   - Index on `revoked` for filtering revoked sessions

2. **Query Optimization:**
   - Use efficient queries for session lookups
   - Consider caching active sessions if frequently accessed
   - Optimize bulk operations (revoke all, delete expired)
   - Use batch operations for cleanup

3. **Token Storage:**
   - Refresh tokens may be stored in session entity or separately
   - If stored separately, token lookup may require additional repository or service
   - Consider token hashing for security

### Data Integrity

1. **Foreign Key Constraints:**
   - `user_id` must reference existing user (enforced by database)
   - Sessions cannot be deleted if they have active references (business rule dependent)

2. **Validation:**
   - `expires_at` must be after `created_at`
   - `revoked` must be boolean
   - Session expiration should be validated in application layer

3. **Business Rules:**
   - Sessions are retained for audit purposes (not immediately deleted on revocation)
   - Expired sessions should be cleaned up periodically
   - Revocation is immediate and permanent

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`, `revoke`, `revokeAllByUserId`, `deleteExpired`) should be within transactions
- Bulk operations should be atomic

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Session not found errors should be handled gracefully (idempotent operations)

### Business Rules

1. **Session Lifecycle:**
   - Sessions are created on login
   - Sessions are revoked on logout or security operations
   - Sessions expire based on expiration timestamp
   - Expired sessions are cleaned up periodically

2. **Security:**
   - Revocation is immediate and permanent
   - All user sessions can be revoked for security
   - Sessions are retained for audit trail
   - Token invalidation should be immediate

3. **Token Management:**
   - Access tokens are short-lived (stateless JWT)
   - Refresh tokens are long-lived but revocable
   - Token refresh requires valid refresh token
   - Token revocation invalidates refresh token

---

## Related Repositories

- **UserRepository:** For user validation and session-user relationships
- **AuditLogRepository:** For logging session operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `findByUserIdAndStatus(userId: UUID, revoked: boolean, expired: boolean): Promise<Session[]>` - Find sessions by status
- `countByUserId(userId: UUID): Promise<number>` - Count user sessions
- `updateExpiration(sessionId: UUID, expiresAt: DateTime): Promise<Session>` - Update session expiration
- `findByCreatedDateRange(startDate: Date, endDate: Date): Promise<Session[]>` - Find sessions by creation date range

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

