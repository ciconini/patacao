# Use Case UC-AUTH-001: User Login

## 1. Objective

Authenticate a user with email/username and password, creating a new session and returning access and refresh tokens. Login validates credentials, checks account status, enforces rate limiting, and records authentication events in audit logs.

## 2. Actors and Permissions

**Primary Actor:** Any User (Staff, Manager, Owner, Accountant, Veterinarian)

**Secondary Actors:** None

**Required Permissions:**
- No authentication required (public endpoint)
- User must have at least one active role assigned
- User account must be active (not archived)

**Authorization Rules:**
- Public endpoint (no authentication required)
- System validates credentials and account status
- Failed login attempts are rate-limited and may trigger account lockout

## 3. Preconditions

1. User has valid email/username and password
2. User account exists in the system
3. User account is active (not archived)
4. User has at least one role assigned
5. System authentication service is available

## 4. Postconditions

1. User is authenticated and session is created
2. Access token and refresh token are generated and returned
3. Session record is created in `sessions` table
4. Last login timestamp is updated
5. Failed login attempt counter is reset (if applicable)
6. Audit log entry is created recording successful login
7. User can access protected endpoints using access token

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `email` | String | Yes | Valid email format | User email address |
| `password` | String | Yes | Min 8 chars | User password (plain text) |

**Note:** System accepts either `email` or `username` for login (business rule dependent). Email is primary identifier.

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `access_token` | String | JWT access token (short-lived, e.g., 15 minutes) |
| `refresh_token` | String | Refresh token (long-lived, e.g., 7 days) |
| `user` | Object | User information |
| `user.id` | UUID | User identifier |
| `user.email` | String | User email |
| `user.full_name` | String | User full name |
| `user.roles` | Array[String] | User roles |
| `expires_in` | Integer | Access token expiration time in seconds |

## 7. Main Flow

1. System receives login request with `email` and `password`
2. System validates `email` format (valid email address)
3. System validates `password` is provided and non-empty
4. System checks rate limiting for login attempts (IP-based or email-based)
5. If rate limit exceeded:
   - System returns error `429 Too Many Requests`
   - System increments failed login counter
   - Use case terminates
6. System loads user by `email` (or username if supported)
7. System verifies user exists
8. If user not found:
   - System increments failed login counter (if tracking by email)
   - System returns error `401 Unauthorized` (generic message for security)
   - System creates audit log entry for failed login attempt
   - Use case terminates
9. System verifies user account is active (not archived)
10. If user is archived:
    - System returns error `401 Unauthorized` (generic message for security)
    - System creates audit log entry for failed login attempt
    - Use case terminates
11. System verifies user has at least one role assigned
12. If user has no roles:
    - System returns error `403 Forbidden`
    - Error message: "User account has no roles assigned"
    - Use case terminates
13. System verifies password against stored `password_hash` using secure hashing algorithm (bcrypt/argon2)
14. If password is incorrect:
    - System increments failed login counter for user
    - System checks if account should be locked (failed attempts >= threshold)
    - If account locked:
      - System sets account lockout flag and lockout expiry
      - System returns error `423 Locked`
      - Error message: "Account temporarily locked due to multiple failed login attempts"
    - Else:
      - System returns error `401 Unauthorized` (generic message for security)
    - System creates audit log entry for failed login attempt
    - Use case terminates
15. System verifies account is not locked (lockout flag and expiry check)
16. If account is locked and lockout not expired:
    - System returns error `423 Locked`
    - Error message: "Account temporarily locked. Please try again later"
    - Use case terminates
17. System generates access token (JWT) with user ID, roles, and expiration
18. System generates refresh token (long-lived, stored securely)
19. System creates session record:
    - `user_id`: User ID
    - `access_token_hash`: Hash of access token (for revocation)
    - `refresh_token_hash`: Hash of refresh token
    - `ip_address`: Client IP address
    - `user_agent`: Client user agent
    - `created_at`: Current timestamp
    - `expires_at`: Refresh token expiration
20. System updates user `last_login_at` timestamp
21. System resets failed login counter for user
22. System creates audit log entry with action `login`, entity_type `User`, entity_id, IP address, and timestamp
23. System returns access token, refresh token, and user information

## 8. Alternative Flows

### 8.1. Invalid Email Format
- **Trigger:** Step 2 detects invalid email format
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Invalid email format"
  - Use case terminates

### 8.2. Missing Password
- **Trigger:** Step 3 detects password is missing or empty
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Password is required"
  - Use case terminates

### 8.3. Rate Limit Exceeded
- **Trigger:** Step 5 detects rate limit exceeded
- **Action:**
  - System returns error `429 Too Many Requests`
  - Error message: "Too many login attempts. Please try again later"
  - System increments failed login counter
  - Use case terminates

### 8.4. User Not Found
- **Trigger:** Step 8 detects user does not exist
- **Action:**
  - System returns error `401 Unauthorized`
  - Error message: "Invalid email or password" (generic for security)
  - System creates audit log entry for failed login
  - Use case terminates

### 8.5. User Account Archived
- **Trigger:** Step 10 detects user is archived
- **Action:**
  - System returns error `401 Unauthorized`
  - Error message: "Invalid email or password" (generic for security)
  - System creates audit log entry for failed login
  - Use case terminates

### 8.6. User Has No Roles
- **Trigger:** Step 12 detects user has no roles
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "User account has no roles assigned"
  - Use case terminates

### 8.7. Incorrect Password
- **Trigger:** Step 14 detects password is incorrect
- **Action:**
  - System increments failed login counter
  - System checks lockout threshold
  - If locked: returns `423 Locked`
  - Else: returns `401 Unauthorized`
  - System creates audit log entry for failed login
  - Use case terminates

### 8.8. Account Locked
- **Trigger:** Step 16 detects account is locked
- **Action:**
  - System returns error `423 Locked`
  - Error message: "Account temporarily locked. Please try again later"
  - Use case terminates

## 9. Business Rules

**BR1:** Login is rate-limited to prevent brute-force attacks. Rate limiting is applied per IP address and/or email address.

**BR2:** Failed login attempts above threshold cause temporary account lockout. Lockout duration increases with repeated failures.

**BR3:** Passwords are stored using secure hashing (bcrypt/argon2). Plain text passwords are never stored.

**BR4:** Access tokens are short-lived (e.g., 15 minutes). Refresh tokens are long-lived (e.g., 7 days) and can be revoked.

**BR5:** User must have at least one active role to access the system. Role-less users cannot log in.

**BR6:** All login attempts (successful and failed) must be logged in audit logs for security monitoring.

**BR7:** Account lockout requires Manager or Owner intervention for manual unlock, or automated delay expires.

**BR8:** Generic error messages are returned for security (do not reveal whether email exists).

**BR9:** Sessions are created for each successful login. Multiple concurrent sessions are allowed per user.

**BR10:** Last login timestamp is updated on successful login for security monitoring.

## 10. Validation Rules

1. **Email Validation:**
   - Must conform to RFC 5322 email format
   - Case-insensitive
   - Maximum 255 characters

2. **Password Validation:**
   - Must be provided and non-empty
   - Minimum 8 characters (enforced at registration/reset, not at login)
   - Password verification uses secure hash comparison

3. **Rate Limiting:**
   - Maximum N attempts per IP address per time window (e.g., 5 attempts per 15 minutes)
   - Maximum N attempts per email per time window (e.g., 5 attempts per 15 minutes)

4. **Account Lockout:**
   - Lockout threshold: N failed attempts (e.g., 5)
   - Lockout duration: Increases with repeated failures (e.g., 15 minutes, 30 minutes, 1 hour)
   - Lockout expiry: Automatically expires after duration

5. **Token Generation:**
   - Access token: JWT with user ID, roles, expiration (short-lived)
   - Refresh token: Cryptographically secure random token (long-lived, stored in database)

6. **Session Creation:**
   - Session record includes: user_id, token hashes, IP address, user agent, timestamps
   - Session expiration matches refresh token expiration

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_EMAIL` | "Invalid email format" | Email format is invalid |
| 400 | `MISSING_PASSWORD` | "Password is required" | Password not provided |
| 401 | `INVALID_CREDENTIALS` | "Invalid email or password" | User not found, archived, or password incorrect |
| 403 | `NO_ROLES` | "User account has no roles assigned" | User has no roles |
| 423 | `ACCOUNT_LOCKED` | "Account temporarily locked" | Account locked due to failed attempts |
| 429 | `RATE_LIMIT_EXCEEDED` | "Too many login attempts" | Rate limit exceeded |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error during authentication |

## 12. Events Triggered

**Domain Events:**
- `UserLoggedIn` event is published with payload:
  - `user_id` (UUID)
  - `email` (String)
  - `ip_address` (String)
  - `user_agent` (String)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="User", action="login", IP address, user agent
- Session record created in `sessions` table
- User `last_login_at` timestamp updated

**Integration Events:**
- None (login is internal operation, but may trigger MFA challenge in future)

## 13. Repository Methods Required

**UserRepository Interface:**
- `findByEmail(email: string): Promise<User | null>` - Load user by email
- `updateLastLogin(userId: UUID): Promise<void>` - Update last login timestamp
- `incrementFailedLoginAttempts(userId: UUID): Promise<void>` - Increment failed attempts
- `resetFailedLoginAttempts(userId: UUID): Promise<void>` - Reset failed attempts
- `lockAccount(userId: UUID, lockoutExpiry: DateTime): Promise<void>` - Lock account
- `isAccountLocked(userId: UUID): Promise<boolean>` - Check if account is locked

**SessionRepository Interface:**
- `save(session: Session): Promise<Session>` - Persist session record

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**RateLimiter Interface:**
- `checkRateLimit(identifier: string, action: string): Promise<boolean>` - Check rate limit
- `incrementAttempts(identifier: string, action: string): Promise<void>` - Increment attempts

**PasswordHasher Interface:**
- `verify(password: string, hash: string): Promise<boolean>` - Verify password against hash

**TokenGenerator Interface:**
- `generateAccessToken(userId: UUID, roles: string[]): Promise<string>` - Generate access token
- `generateRefreshToken(): Promise<string>` - Generate refresh token

## 14. Notes or Limitations

1. **Security:** Generic error messages are returned for invalid credentials to prevent user enumeration attacks.

2. **Rate Limiting:** Rate limiting prevents brute-force attacks. Consider IP-based and email-based limits.

3. **Account Lockout:** Account lockout protects against brute-force attacks. Lockout duration should increase with repeated failures.

4. **Password Hashing:** Passwords must be hashed using secure algorithms (bcrypt/argon2). Never store plain text passwords.

5. **Token Security:** Access tokens are short-lived to minimize exposure. Refresh tokens are long-lived but revocable.

6. **Session Management:** Multiple concurrent sessions are allowed per user. Sessions can be revoked individually.

7. **Audit Logging:** All login attempts (successful and failed) must be logged for security monitoring and compliance.

8. **Performance:** Login must respond within reasonable time (target: < 500ms). Password hashing is CPU-intensive; consider async processing.

9. **Future Enhancements:** Consider adding:
   - Multi-factor authentication (MFA/TOTP)
   - Social login (OAuth)
   - Remember me functionality
   - Device fingerprinting
   - Login notifications

10. **GDPR Compliance:** Login events may contain personal data. Ensure audit logs comply with GDPR retention policies.

