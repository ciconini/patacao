# Authentication Flow — Patacão Petshop

## Overview

This document describes the authentication and session management flow for the Patacão Petshop Management System.

**Authentication Method:** JWT (JSON Web Tokens)  
**Session Storage:** Redis  
**Token Types:** Access token (short-lived), Refresh token (long-lived)

---

## Authentication Components

### Tokens

#### Access Token

- **Lifetime:** 1 hour (configurable)
- **Purpose:** API authentication
- **Storage:** Client (memory or secure storage)
- **Format:** JWT

#### Refresh Token

- **Lifetime:** 7 days (configurable)
- **Purpose:** Obtain new access tokens
- **Storage:** Client (secure storage)
- **Format:** UUID stored in database/Redis

### Session

- **Storage:** Redis
- **Lifetime:** Matches refresh token
- **Revocable:** Yes (logout, security events)

---

## Login Flow

### Step-by-Step

1. **Client Request**
   ```
   POST /api/v1/auth/login
   {
     "email": "user@example.com",
     "password": "password123"
   }
   ```

2. **Server Validation**
   - Validate email format
   - Find user by email
   - Verify password hash
   - Check user active status
   - Check account lock status

3. **Token Generation**
   - Generate access token (JWT)
   - Generate refresh token (UUID)
   - Create session in Redis
   - Store session metadata

4. **Response**
   ```json
   {
     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "refresh_token": "550e8400-e29b-41d4-a716-446655440000",
     "user": {
       "id": "...",
       "email": "user@example.com",
       "full_name": "John Doe",
       "roles": ["Staff"]
     }
   }
   ```

### Session Storage

**Redis Key:** `session:{refresh_token}`

**Value:**
```json
{
  "user_id": "uuid",
  "created_at": "2025-01-15T10:00:00Z",
  "expires_at": "2025-01-22T10:00:00Z",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

---

## Token Refresh Flow

### Step-by-Step

1. **Client Request**
   ```
   POST /api/v1/auth/refresh
   {
     "refresh_token": "550e8400-e29b-41d4-a716-446655440000"
   }
   ```

2. **Server Validation**
   - Validate refresh token format
   - Check session exists in Redis
   - Verify session not revoked
   - Verify session not expired
   - Check user still active

3. **Token Generation**
   - Generate new access token
   - Optionally rotate refresh token
   - Update session expiry

4. **Response**
   ```json
   {
     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "refresh_token": "550e8400-e29b-41d4-a716-446655440000"
   }
   ```

---

## API Request Authentication

### Step-by-Step

1. **Client Request**
   ```
   GET /api/v1/customers
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Server Validation**
   - Extract token from Authorization header
   - Verify token signature
   - Verify token not expired
   - Extract user information
   - Check user still active

3. **Authorization Check**
   - Check user permissions
   - Verify resource access
   - Proceed with request

---

## Logout Flow

### Step-by-Step

1. **Client Request**
   ```
   POST /api/v1/auth/logout
   Authorization: Bearer {access_token}
   {
     "refresh_token": "550e8400-e29b-41d4-a716-446655440000"
   }
   ```

2. **Server Actions**
   - Revoke session in Redis
   - Invalidate refresh token
   - Optionally revoke all user sessions

3. **Response**
   ```
   204 No Content
   ```

---

## Password Reset Flow

### Request Reset

1. **Client Request**
   ```
   POST /api/v1/auth/password-reset/request
   {
     "email": "user@example.com"
   }
   ```

2. **Server Actions**
   - Find user by email
   - Generate reset token
   - Store token (with expiry)
   - Send reset email

3. **Response**
   ```json
   {
     "message": "Se o email existir, um link de redefinição foi enviado"
   }
   ```

### Confirm Reset

1. **Client Request**
   ```
   POST /api/v1/auth/password-reset/confirm
   {
     "token": "reset_token_here",
     "new_password": "newSecurePassword123"
   }
   ```

2. **Server Actions**
   - Validate reset token
   - Check token not expired
   - Hash new password
   - Update user password
   - Invalidate reset token
   - Revoke all user sessions

3. **Response**
   ```json
   {
     "message": "Password reset successful"
   }
   ```

---

## Security Measures

### Rate Limiting

- **Login:** 5 attempts per 15 minutes per IP
- **Password Reset:** 3 requests per hour per email
- **Token Refresh:** 10 requests per minute per user

### Account Lockout

- **Threshold:** 5 failed login attempts
- **Duration:** 30 minutes
- **Notification:** Email to user

### Token Security

- **Access Token:** Short-lived (1 hour)
- **Refresh Token:** Long-lived (7 days), revocable
- **HTTPS Only:** Tokens only over HTTPS
- **HttpOnly Cookies:** If using cookies (future)

---

## Session Management

### Session Lifecycle

1. **Creation:** On successful login
2. **Validation:** On each API request
3. **Refresh:** On token refresh
4. **Revocation:** On logout or security event
5. **Expiration:** Automatic cleanup

### Session Revocation

**Triggers:**
- User logout
- Password change
- Account deactivation
- Security incident
- Admin revocation

**Implementation:**
- Delete session from Redis
- Mark refresh token as revoked
- Invalidate all user sessions (optional)

---

## Error Handling

### Authentication Errors

**401 Unauthorized:**
- Invalid token
- Expired token
- Missing token
- Revoked session

**403 Forbidden:**
- Insufficient permissions
- Account locked
- Account inactive

### Error Responses

```json
{
  "code": "UNAUTHORIZED",
  "message": "Token inválido ou expirado",
  "http_status": 401
}
```

---

## Best Practices

### Client-Side

1. **Token Storage:** Secure storage (not localStorage for sensitive apps)
2. **Token Refresh:** Automatic refresh before expiry
3. **Error Handling:** Handle 401/403 gracefully
4. **Logout:** Clear tokens on logout

### Server-Side

1. **Token Validation:** Always validate tokens
2. **Session Cleanup:** Regular cleanup of expired sessions
3. **Security Logging:** Log all authentication events
4. **Rate Limiting:** Implement rate limiting

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

