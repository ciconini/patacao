# Use Case UC-AUTH-002: User Logout

## 1. Objective

Log out an authenticated user by invalidating the current session and optionally revoking refresh tokens. Logout terminates access for the current session and records the logout event in audit logs.

## 2. Actors and Permissions

**Primary Actor:** Any Authenticated User

**Secondary Actors:** None

**Required Permissions:**
- User must be authenticated (valid access token)
- User can log out their own session
- Managers/Owners can log out other users' sessions (via session revocation)

**Authorization Rules:**
- Authenticated users can log out their own session
- System validates access token before allowing logout
- Optional: Managers/Owners can revoke other users' sessions (separate use case)

## 3. Preconditions

1. User is authenticated and has a valid access token
2. Session exists in the system
3. System authentication service is available

## 4. Postconditions

1. Current session is invalidated (marked as revoked or deleted)
2. Access token is invalidated (cannot be used for further requests)
3. Refresh token is optionally revoked (if provided)
4. Session record is updated with revocation timestamp
5. Audit log entry is created recording the logout action
6. User must re-authenticate to access protected endpoints

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `refresh_token` | String | No | Valid refresh token | Refresh token to revoke (optional) |

**Note:** Logout can be performed with just the access token (current session). Optionally, refresh token can be provided to revoke it as well.

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Logout success indicator |
| `message` | String | Logout confirmation message |

## 7. Main Flow

1. System receives logout request with access token (from Authorization header)
2. System validates access token (extract user ID and session ID from token)
3. System verifies access token is valid and not expired
4. If token is invalid or expired:
   - System returns error `401 Unauthorized`
   - Error message: "Invalid or expired token"
   - Use case terminates
5. System loads session by session ID (from token or session lookup)
6. System verifies session exists and is active (not already revoked)
7. If session not found or already revoked:
   - System returns success (idempotent operation)
   - Use case completes
8. System marks session as revoked:
   - Set `revoked_at` to current timestamp
   - Set `active` flag to false (if applicable)
9. If `refresh_token` is provided in request body:
   - System validates refresh token
   - System finds session associated with refresh token
   - System revokes refresh token (marks session as revoked)
10. System creates audit log entry with action `logout`, entity_type `User`, entity_id, IP address, and timestamp
11. System returns success response

## 8. Alternative Flows

### 8.1. Invalid or Expired Token
- **Trigger:** Step 4 detects token is invalid or expired
- **Action:**
  - System returns error `401 Unauthorized`
  - Error message: "Invalid or expired token"
  - Use case terminates

### 8.2. Session Already Revoked
- **Trigger:** Step 7 detects session is already revoked
- **Action:**
  - System returns success (idempotent operation)
  - Use case completes normally

### 8.3. Invalid Refresh Token
- **Trigger:** Step 9 detects refresh token is invalid
- **Action:**
  - System ignores invalid refresh token (optional)
  - System continues with session revocation
  - Use case completes normally

## 9. Business Rules

**BR1:** Logout invalidates the current session. Access token cannot be used after logout.

**BR2:** Refresh token revocation is optional. If provided, refresh token is also revoked.

**BR3:** Logout is idempotent. Multiple logout requests for the same session return success.

**BR4:** All logout actions must be logged in audit logs for security monitoring.

**BR5:** Session revocation immediately terminates access. User must re-authenticate to access protected endpoints.

**BR6:** Multiple concurrent sessions are allowed per user. Logout affects only the current session.

**BR7:** Managers/Owners can revoke other users' sessions via session management (separate use case).

**BR8:** Logout does not delete session records. Sessions are marked as revoked for audit purposes.

## 10. Validation Rules

1. **Access Token Validation:**
   - Must be valid JWT token
   - Must not be expired
   - Must contain valid user ID and session ID

2. **Refresh Token Validation (if provided):**
   - Must be valid refresh token
   - Must be associated with user's session
   - Must not be already revoked

3. **Session Validation:**
   - Session must exist in database
   - Session must be active (not already revoked)

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 401 | `INVALID_TOKEN` | "Invalid or expired token" | Access token is invalid or expired |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error during logout |

## 12. Events Triggered

**Domain Events:**
- `UserLoggedOut` event is published with payload:
  - `user_id` (UUID)
  - `session_id` (UUID)
  - `ip_address` (String)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="User", action="logout", IP address
- Session record updated with revocation timestamp

**Integration Events:**
- None (logout is internal operation)

## 13. Repository Methods Required

**SessionRepository Interface:**
- `findById(sessionId: UUID): Promise<Session | null>` - Load session by ID
- `findByRefreshToken(refreshToken: string): Promise<Session | null>` - Find session by refresh token
- `revoke(sessionId: UUID): Promise<void>` - Mark session as revoked
- `revokeByRefreshToken(refreshToken: string): Promise<void>` - Revoke session by refresh token

**TokenValidator Interface:**
- `validateAccessToken(token: string): Promise<TokenPayload | null>` - Validate and decode access token
- `extractSessionId(token: string): Promise<UUID | null>` - Extract session ID from token

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

## 14. Notes or Limitations

1. **Idempotency:** Logout is idempotent. Multiple logout requests for the same session return success.

2. **Token Invalidation:** Access tokens are stateless (JWT). Invalidation requires token blacklisting or short expiration. Consider token blacklist for immediate invalidation.

3. **Refresh Token Revocation:** Refresh tokens are stored in database and can be revoked immediately.

4. **Session Retention:** Session records are retained for audit purposes. Consider data retention policies.

5. **Performance:** Logout must respond quickly. Optimize session lookup and update operations.

6. **Security:** Logout should invalidate tokens immediately. Consider token blacklist for stateless tokens.

7. **Future Enhancements:** Consider adding:
   - Logout from all devices
   - Logout notifications
   - Session timeout warnings

8. **Audit Trail:** All logout actions must be logged for security monitoring and compliance.

9. **Concurrent Sessions:** Logout affects only the current session. Other concurrent sessions remain active.

10. **Error Handling:** Invalid tokens should return 401. Already revoked sessions should return success (idempotent).

