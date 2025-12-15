# Use Case UC-AUTH-003: Password Reset Request

## 1. Objective

Initiate a password reset flow by requesting a password reset token. System sends a password reset email to the user with a secure token link. This use case handles the initial request; token validation and password update are handled separately.

## 2. Actors and Permissions

**Primary Actor:** Any User (forgot password scenario)

**Secondary Actors:** None

**Required Permissions:**
- No authentication required (public endpoint)
- User account must exist and be active

**Authorization Rules:**
- Public endpoint (no authentication required)
- System validates email and account status
- Rate limiting prevents abuse

## 3. Preconditions

1. User has a valid email address registered in the system
2. User account exists and is active (not archived)
3. Email service is available for sending reset emails
4. System has available storage capacity for reset tokens

## 4. Postconditions

1. Password reset token is generated and stored
2. Reset token expiration timestamp is set
3. Password reset email is queued/sent to user
4. Audit log entry is created recording the reset request
5. User receives email with password reset link (if email exists)

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `email` | String | Yes | Valid email format | User email address |

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Request success indicator |
| `message` | String | Generic success message (security: same message regardless of email existence) |

**Note:** System returns generic success message regardless of whether email exists (security best practice to prevent user enumeration).

## 7. Main Flow

1. System receives password reset request with `email`
2. System validates `email` format (valid email address)
3. If email format is invalid:
   - System returns error `400 Bad Request`
   - Error message: "Invalid email format"
   - Use case terminates
4. System checks rate limiting for password reset requests (IP-based or email-based)
5. If rate limit exceeded:
   - System returns error `429 Too Many Requests`
   - Error message: "Too many password reset requests. Please try again later"
   - Use case terminates
6. System loads user by `email`
7. If user not found:
   - System returns generic success message (security: prevent user enumeration)
   - System creates audit log entry for reset request attempt (with email, but user not found)
   - Use case completes (no email sent)
8. System verifies user account is active (not archived)
9. If user is archived:
   - System returns generic success message (security: prevent user enumeration)
   - System creates audit log entry for reset request attempt
   - Use case completes (no email sent)
10. System generates secure password reset token (cryptographically secure random token)
11. System sets token expiration (e.g., 1 hour from now)
12. System stores reset token in database:
    - `user_id`: User ID
    - `token_hash`: Hash of reset token (for security)
    - `expires_at`: Token expiration timestamp
    - `used`: false
    - `created_at`: Current timestamp
13. System queues/sends password reset email to user:
    - Email contains reset link with token
    - Link format: `/auth/password-reset/confirm?token={token}`
    - Email includes expiration time and security warnings
14. System creates audit log entry with action `password_reset_requested`, entity_type `User`, entity_id, IP address, and timestamp
15. System returns generic success message (same message regardless of email existence)

## 8. Alternative Flows

### 8.1. Invalid Email Format
- **Trigger:** Step 3 detects invalid email format
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Invalid email format"
  - Use case terminates

### 8.2. Rate Limit Exceeded
- **Trigger:** Step 5 detects rate limit exceeded
- **Action:**
  - System returns error `429 Too Many Requests`
  - Error message: "Too many password reset requests. Please try again later"
  - Use case terminates

### 8.3. User Not Found
- **Trigger:** Step 7 detects user does not exist
- **Action:**
  - System returns generic success message (security: prevent user enumeration)
  - System creates audit log entry
  - Use case completes (no email sent)

### 8.4. User Account Archived
- **Trigger:** Step 9 detects user is archived
- **Action:**
  - System returns generic success message (security: prevent user enumeration)
  - System creates audit log entry
  - Use case completes (no email sent)

### 8.5. Email Service Unavailable
- **Trigger:** Step 13 fails to queue/send email
- **Action:**
  - System logs error
  - System returns generic success message (user experience)
  - System creates audit log entry
  - Use case completes (token stored, email may be retried)

## 9. Business Rules

**BR1:** Password reset requests are rate-limited to prevent abuse and email spam.

**BR2:** Generic success messages are returned regardless of email existence to prevent user enumeration attacks.

**BR3:** Reset tokens are cryptographically secure and have short expiration (e.g., 1 hour).

**BR4:** Reset tokens are hashed before storage. Plain text tokens are never stored.

**BR5:** Only one active reset token per user at a time. Previous tokens are invalidated when new request is made.

**BR6:** All password reset requests must be logged in audit logs for security monitoring.

**BR7:** Reset emails include security warnings and expiration information.

**BR8:** Reset tokens cannot be reused. Once used, token is marked as used and cannot be used again.

**BR9:** Archived users cannot request password resets (but generic message is returned for security).

**BR10:** Email service failures should not expose errors to user. System logs errors internally.

## 10. Validation Rules

1. **Email Validation:**
   - Must conform to RFC 5322 email format
   - Case-insensitive
   - Maximum 255 characters

2. **Rate Limiting:**
   - Maximum N requests per IP address per time window (e.g., 3 requests per hour)
   - Maximum N requests per email per time window (e.g., 3 requests per hour)

3. **Token Generation:**
   - Cryptographically secure random token (minimum 32 bytes)
   - Token is hashed before storage (SHA-256 or similar)
   - Token expiration: 1 hour from creation

4. **Token Storage:**
   - Token hash stored in database
   - Expiration timestamp stored
   - Used flag initialized to false

5. **Email Content:**
   - Reset link with token
   - Expiration time
   - Security warnings
   - Instructions for user

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_EMAIL` | "Invalid email format" | Email format is invalid |
| 429 | `RATE_LIMIT_EXCEEDED` | "Too many password reset requests" | Rate limit exceeded |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error (generic message returned to user) |

## 12. Events Triggered

**Domain Events:**
- `PasswordResetRequested` event is published with payload:
  - `user_id` (UUID, nullable if user not found)
  - `email` (String)
  - `ip_address` (String)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="User", action="password_reset_requested", IP address
- Password reset email queued/sent (asynchronous)

**Integration Events:**
- Email service integration (queue email for delivery)

## 13. Repository Methods Required

**UserRepository Interface:**
- `findByEmail(email: string): Promise<User | null>` - Load user by email

**PasswordResetTokenRepository Interface:**
- `invalidateExistingTokens(userId: UUID): Promise<void>` - Invalidate existing tokens
- `save(token: PasswordResetToken): Promise<PasswordResetToken>` - Store reset token

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**RateLimiter Interface:**
- `checkRateLimit(identifier: string, action: string): Promise<boolean>` - Check rate limit
- `incrementAttempts(identifier: string, action: string): Promise<void>` - Increment attempts

**TokenGenerator Interface:**
- `generateResetToken(): Promise<string>` - Generate secure reset token

**EmailService Interface:**
- `sendPasswordResetEmail(email: string, token: string, expiresAt: DateTime): Promise<void>` - Send reset email

## 14. Notes or Limitations

1. **Security:** Generic success messages prevent user enumeration attacks. Always return same message regardless of email existence.

2. **Rate Limiting:** Rate limiting prevents abuse and email spam. Consider IP-based and email-based limits.

3. **Token Security:** Reset tokens must be cryptographically secure and have short expiration. Tokens are hashed before storage.

4. **Email Delivery:** Email delivery is asynchronous. Failures should not expose errors to user.

5. **Token Invalidation:** Only one active reset token per user. Previous tokens are invalidated when new request is made.

6. **Audit Logging:** All password reset requests must be logged for security monitoring and compliance.

7. **Performance:** Password reset request must respond quickly. Email sending is asynchronous.

8. **Future Enhancements:** Consider adding:
   - SMS-based password reset (alternative to email)
   - Security questions (additional verification)
   - Password reset notifications

9. **GDPR Compliance:** Password reset requests may contain personal data. Ensure audit logs comply with GDPR retention policies.

10. **Error Handling:** Email service failures should be logged but not exposed to user. System returns generic success message.

