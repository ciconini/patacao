# Use Case UC-AUTH-004: Password Reset Confirm

## 1. Objective

Confirm password reset by validating the reset token and updating the user's password. This use case completes the password reset flow initiated by UC-AUTH-003.

## 2. Actors and Permissions

**Primary Actor:** Any User (resetting password)

**Secondary Actors:** None

**Required Permissions:**
- No authentication required (public endpoint)
- Valid password reset token required

**Authorization Rules:**
- Public endpoint (no authentication required)
- System validates reset token and expiration
- Rate limiting prevents abuse

## 3. Preconditions

1. User has a valid password reset token (from email link)
2. Reset token exists in the system and is not expired
3. Reset token has not been used
4. User account exists and is active

## 4. Postconditions

1. User's password is updated with new password hash
2. Reset token is marked as used (cannot be reused)
3. All user sessions are revoked (force re-login)
4. Audit log entry is created recording the password reset
5. User can log in with new password

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `token` | String | Yes | Valid reset token | Password reset token from email |
| `new_password` | String | Yes | Min 8 chars, complexity rules | New password (plain text) |

**Password Complexity Rules:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character (optional, business rule dependent)

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Password reset success indicator |
| `message` | String | Success confirmation message |

## 7. Main Flow

1. System receives password reset confirmation with `token` and `new_password`
2. System validates `token` is provided and non-empty
3. System validates `new_password` is provided and non-empty
4. System validates `new_password` meets complexity requirements:
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one digit
   - At least one special character (if required)
5. If password does not meet requirements:
   - System returns error `400 Bad Request`
   - Error message: "Password does not meet complexity requirements"
   - Use case terminates
6. System hashes the reset token (same algorithm used when storing)
7. System loads password reset token record by token hash
8. System verifies token exists
9. If token not found:
   - System returns error `401 Unauthorized`
   - Error message: "Invalid or expired reset token"
   - Use case terminates
10. System verifies token is not expired (`expires_at` > current time)
11. If token is expired:
    - System returns error `401 Unauthorized`
    - Error message: "Invalid or expired reset token"
    - System marks token as expired (optional cleanup)
    - Use case terminates
12. System verifies token has not been used (`used` flag is false)
13. If token already used:
    - System returns error `401 Unauthorized`
    - Error message: "Reset token has already been used"
    - Use case terminates
14. System loads user by `user_id` from token record
15. System verifies user exists and is active
16. If user not found or archived:
    - System returns error `404 Not Found`
    - Error message: "User not found"
    - Use case terminates
17. System checks if new password is different from current password (optional security check)
18. System hashes new password using secure algorithm (bcrypt/argon2)
19. System begins database transaction
20. System updates user password hash
21. System marks reset token as used (`used` = true)
22. System revokes all active sessions for user (force re-login)
23. System commits database transaction
24. System creates audit log entry with action `password_reset_completed`, entity_type `User`, entity_id, IP address, and timestamp
25. System returns success response

## 8. Alternative Flows

### 8.1. Missing Token
- **Trigger:** Step 2 detects token is missing or empty
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Reset token is required"
  - Use case terminates

### 8.2. Missing Password
- **Trigger:** Step 3 detects password is missing or empty
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "New password is required"
  - Use case terminates

### 8.3. Password Complexity Failure
- **Trigger:** Step 5 detects password does not meet complexity requirements
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Password does not meet complexity requirements: [specific requirements]"
  - Use case terminates

### 8.4. Token Not Found
- **Trigger:** Step 9 detects token does not exist
- **Action:**
  - System returns error `401 Unauthorized`
  - Error message: "Invalid or expired reset token"
  - Use case terminates

### 8.5. Token Expired
- **Trigger:** Step 11 detects token is expired
- **Action:**
  - System returns error `401 Unauthorized`
  - Error message: "Invalid or expired reset token"
  - System marks token as expired (optional)
  - Use case terminates

### 8.6. Token Already Used
- **Trigger:** Step 13 detects token has been used
- **Action:**
  - System returns error `401 Unauthorized`
  - Error message: "Reset token has already been used"
  - Use case terminates

### 8.7. User Not Found
- **Trigger:** Step 16 detects user does not exist or is archived
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "User not found"
  - Use case terminates

### 8.8. Database Transaction Failure
- **Trigger:** Step 23 fails to commit transaction
- **Action:**
  - System rolls back database transaction
  - System returns error `500 Internal Server Error`
  - Error message: "An error occurred while resetting password. Changes were rolled back"
  - Use case terminates

## 9. Business Rules

**BR1:** Reset tokens are single-use. Once used, token cannot be reused.

**BR2:** Reset tokens expire after a short period (e.g., 1 hour). Expired tokens cannot be used.

**BR3:** New password must meet complexity requirements (minimum length, character types).

**BR4:** Password reset invalidates all active sessions. User must re-login with new password.

**BR5:** All password reset completions must be logged in audit logs for security monitoring.

**BR6:** Password hashing uses secure algorithms (bcrypt/argon2). Plain text passwords are never stored.

**BR7:** Password reset is atomic. All operations (password update, token marking, session revocation) succeed or fail together.

**BR8:** Optional: System can check if new password is different from current password (security best practice).

**BR9:** Rate limiting may apply to prevent abuse (business rule dependent).

**BR10:** Password reset does not unlock locked accounts. Account lockout requires separate unlock process.

## 10. Validation Rules

1. **Token Validation:**
   - Must be provided and non-empty
   - Must exist in database
   - Must not be expired
   - Must not be already used

2. **Password Validation:**
   - Must be provided and non-empty
   - Minimum 8 characters
   - At least one uppercase letter (A-Z)
   - At least one lowercase letter (a-z)
   - At least one digit (0-9)
   - At least one special character (optional, business rule dependent)

3. **User Validation:**
   - User must exist
   - User account must be active (not archived)

4. **Token Expiration:**
   - Token expiration: 1 hour from creation (configurable)
   - Expired tokens cannot be used

5. **Password Hashing:**
   - Secure algorithm: bcrypt (cost factor 10+) or argon2
   - Password is hashed before storage
   - Plain text password is never stored

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `MISSING_TOKEN` | "Reset token is required" | Token not provided |
| 400 | `MISSING_PASSWORD` | "New password is required" | Password not provided |
| 400 | `WEAK_PASSWORD` | "Password does not meet complexity requirements" | Password too weak |
| 401 | `INVALID_TOKEN` | "Invalid or expired reset token" | Token invalid, expired, or used |
| 404 | `USER_NOT_FOUND` | "User not found" | User does not exist or archived |
| 500 | `TRANSACTION_FAILED` | "An error occurred while resetting password" | Database transaction failed |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error |

## 12. Events Triggered

**Domain Events:**
- `PasswordResetCompleted` event is published with payload:
  - `user_id` (UUID)
  - `ip_address` (String)
  - `timestamp` (DateTime)

- `UserSessionsRevoked` event is published:
  - `user_id` (UUID)
  - `reason` (String: "password_reset")
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="User", action="password_reset_completed", IP address
- All user sessions revoked
- Password reset token marked as used

**Integration Events:**
- None (password reset is internal operation)

## 13. Repository Methods Required

**PasswordResetTokenRepository Interface:**
- `findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>` - Load token by hash
- `markAsUsed(tokenId: UUID): Promise<void>` - Mark token as used

**UserRepository Interface:**
- `findById(userId: UUID): Promise<User | null>` - Load user by ID
- `updatePassword(userId: UUID, passwordHash: string): Promise<void>` - Update password hash
- `verifyPassword(userId: UUID, password: string): Promise<boolean>` - Verify current password (optional check)

**SessionRepository Interface:**
- `revokeAllByUserId(userId: UUID): Promise<void>` - Revoke all user sessions

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**PasswordHasher Interface:**
- `hash(password: string): Promise<string>` - Hash password
- `verify(password: string, hash: string): Promise<boolean>` - Verify password (optional check)

**TokenHasher Interface:**
- `hash(token: string): Promise<string>` - Hash reset token for lookup

## 14. Notes or Limitations

1. **Security:** Reset tokens are single-use and expire quickly. Tokens are hashed before storage.

2. **Password Complexity:** Enforce strong password requirements. Consider business rules for special character requirements.

3. **Session Revocation:** Password reset invalidates all sessions. User must re-login with new password.

4. **Transaction Safety:** Password reset is atomic. All operations succeed or fail together.

5. **Performance:** Password hashing is CPU-intensive. Consider async processing or rate limiting.

6. **Audit Logging:** All password reset completions must be logged for security monitoring and compliance.

7. **Error Messages:** Generic error messages for invalid tokens prevent token enumeration attacks.

8. **Future Enhancements:** Consider adding:
   - Password history (prevent reuse of recent passwords)
   - Password strength meter
   - Two-factor authentication after password reset

9. **GDPR Compliance:** Password reset events may contain personal data. Ensure audit logs comply with GDPR retention policies.

10. **Token Cleanup:** Consider cleanup job to remove expired tokens periodically.

