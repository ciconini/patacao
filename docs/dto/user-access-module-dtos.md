# Data Transfer Object (DTO) Definitions: User Access Module

## Overview

This document defines all Data Transfer Objects (DTOs) used for input/output operations in the User Access Module of the Petshop Management System. DTOs are used for API requests and responses, following Clean/Hexagonal Architecture principles.

**Module:** User Access  
**Context:** Petshop Management System (Portugal)  
**Architecture:** Clean/Hexagonal Architecture

---

## Authentication DTOs

### LoginDTO

**Purpose:**  
Input DTO for user login/authentication.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `email` | String | - | Yes | - | Valid email format | User email address (or username if supported) |
| `password` | String | - | Yes | - | Min 8 chars, non-empty | User password (plain text) |

**Note:** System accepts either `email` or `username` for login (business rule dependent). Email is primary identifier.

**Example Payload:**
```json
{
  "email": "staff@patacao.pt",
  "password": "SecurePass123!"
}
```

---

### LoginResponseDTO

**Purpose:**  
Output DTO for successful login response.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `access_token` | String | - | Yes | - | Valid JWT token | JWT access token (short-lived, e.g., 15 minutes) |
| `refresh_token` | String | - | Yes | - | Valid refresh token | Refresh token (long-lived, e.g., 7 days) |
| `user` | UserInfoDTO | - | Yes | - | Valid user object | User information |
| `expires_in` | Integer | - | Yes | - | >= 0 | Access token expiration time in seconds |

**UserInfoDTO Structure:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | User identifier |
| `email` | String | - | Yes | - | Max 255 chars | User email |
| `full_name` | String | - | Yes | - | Max 255 chars | User full name |
| `roles` | Array[String] | - | Yes | - | Min 1 role | User roles |

**Example Payload:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "user": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "email": "staff@patacao.pt",
    "full_name": "Maria Santos",
    "roles": ["Staff"]
  },
  "expires_in": 900
}
```

---

### LogoutDTO

**Purpose:**  
Input DTO for user logout.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `refresh_token` | String | - | No | - | Valid refresh token | Refresh token to revoke (optional) |

**Note:** Logout can be performed with just the access token (current session). Optionally, refresh token can be provided to revoke it as well.

**Example Payload:**
```json
{
  "refresh_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

---

### LogoutResponseDTO

**Purpose:**  
Output DTO for logout response.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `success` | Boolean | - | Yes | - | true/false | Logout success indicator |
| `message` | String | - | Yes | - | Max 255 chars | Logout confirmation message |

**Example Payload:**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

---

### RefreshTokenDTO

**Purpose:**  
Input DTO for refreshing access token.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `refresh_token` | String | - | Yes | - | Valid refresh token | Refresh token from previous login |

**Example Payload:**
```json
{
  "refresh_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

---

### RefreshTokenResponseDTO

**Purpose:**  
Output DTO for token refresh response.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `access_token` | String | - | Yes | - | Valid JWT token | New JWT access token |
| `refresh_token` | String | - | Yes | - | Valid refresh token | New refresh token (may be same or rotated) |
| `expires_in` | Integer | - | Yes | - | >= 0 | Access token expiration time in seconds |

**Example Payload:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7",
  "expires_in": 900
}
```

---

### PasswordResetRequestDTO

**Purpose:**  
Input DTO for requesting a password reset.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `email` | String | - | Yes | - | Valid email format | User email address |

**Example Payload:**
```json
{
  "email": "staff@patacao.pt"
}
```

---

### PasswordResetRequestResponseDTO

**Purpose:**  
Output DTO for password reset request response.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `success` | Boolean | - | Yes | - | true/false | Request success indicator |
| `message` | String | - | Yes | - | Max 255 chars | Generic success message (security: same message regardless of email existence) |

**Note:** System returns generic success message regardless of whether email exists (security best practice to prevent user enumeration).

**Example Payload:**
```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent"
}
```

---

### PasswordResetConfirmDTO

**Purpose:**  
Input DTO for confirming password reset with new password.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `token` | String | - | Yes | - | Valid reset token, non-empty | Password reset token from email |
| `new_password` | String | - | Yes | - | Min 8 chars, complexity rules | New password (plain text) |

**Password Complexity Rules:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character (optional, business rule dependent)

**Example Payload:**
```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
  "new_password": "NewSecurePass123!"
}
```

---

### PasswordResetConfirmResponseDTO

**Purpose:**  
Output DTO for password reset confirmation response.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `success` | Boolean | - | Yes | - | true/false | Password reset success indicator |
| `message` | String | - | Yes | - | Max 255 chars | Success confirmation message |

**Example Payload:**
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

---

## User DTOs

### CreateUserDTO

**Purpose:**  
Input DTO for creating a new user (staff member).

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `email` | String | - | Yes | - | Valid email format, unique, max 255 chars | User email address (used for login) |
| `full_name` | String | - | Yes | - | Max 255 chars, non-empty | User's full name |
| `phone` | String | - | No | - | Max 32 chars, valid phone format | Contact phone number |
| `username` | String | - | No | - | Unique, max 128 chars | Optional username (alternative to email login) |
| `roles` | Array[String] | - | Yes | - | Valid role IDs, min 1 role | Role IDs: "Owner", "Manager", "Staff", "Accountant", "Veterinarian" |
| `store_ids` | Array[UUID] | - | No | - | Must exist | Store IDs user is assigned to |
| `working_hours` | WorkingHoursDTO | - | No | - | Valid weekly schedule | Working hours schedule |
| `service_skills` | Array[UUID] | - | No | - | Must exist | Service IDs user is skilled in |
| `active` | Boolean | - | No | true | true/false | Active status |

**WorkingHoursDTO Structure:** (See Administrative Module DTOs for full definition)

**Example Payload:**
```json
{
  "email": "staff@patacao.pt",
  "full_name": "Maria Santos",
  "phone": "+351 912 345 678",
  "username": "maria.santos",
  "roles": ["Staff"],
  "store_ids": ["660e8400-e29b-41d4-a716-446655440000"],
  "working_hours": {
    "monday": {"start": "09:00", "end": "18:00", "available": true},
    "tuesday": {"start": "09:00", "end": "18:00", "available": true},
    "wednesday": {"start": "09:00", "end": "18:00", "available": true},
    "thursday": {"start": "09:00", "end": "18:00", "available": true},
    "friday": {"start": "09:00", "end": "18:00", "available": true},
    "saturday": {"available": false},
    "sunday": {"available": false}
  },
  "service_skills": ["dd0e8400-e29b-41d4-a716-446655440000"],
  "active": true
}
```

---

### UpdateUserDTO

**Purpose:**  
Input DTO for updating an existing user. All fields are optional (partial update). Email and username are immutable.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `full_name` | String | - | No | - | Max 255 chars, non-empty | Must not be whitespace-only if provided |
| `phone` | String | - | No | - | Max 32 chars, valid phone format | Portuguese phone format if provided |
| `roles` | Array[String] | - | No | - | Valid role IDs, min 1 role | Role IDs if provided (cannot be empty array) |
| `active` | Boolean | - | No | - | true/false | Active status if provided |
| `store_ids` | Array[UUID] | - | No | - | Must exist | Store IDs if provided |
| `working_hours` | WorkingHoursDTO | - | No | - | Valid weekly schedule | Working hours schedule if provided |
| `service_skills` | Array[UUID] | - | No | - | Must exist | Service IDs if provided |

**Note:** `email` and `username` are immutable and cannot be updated.

**Example Payload:**
```json
{
  "full_name": "Maria Santos Silva",
  "phone": "+351 912 999 888",
  "roles": ["Staff", "Veterinarian"],
  "active": true,
  "store_ids": ["660e8400-e29b-41d4-a716-446655440000", "661e8400-e29b-41d4-a716-446655440000"]
}
```

---

### UserResponseDTO

**Purpose:**  
Output DTO for user responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `email` | String | - | Yes | - | Max 255 chars | Email address |
| `full_name` | String | - | Yes | - | Max 255 chars | Full name |
| `phone` | String | - | No | null | Max 32 chars | Phone number (nullable) |
| `username` | String | - | No | null | Max 128 chars | Username (nullable) |
| `roles` | Array[String] | - | Yes | - | Array of role IDs | Assigned role IDs |
| `store_ids` | Array[UUID] | - | No | null | Array of UUIDs | Assigned store IDs (nullable) |
| `working_hours` | WorkingHoursDTO | - | No | null | Valid weekly schedule | Working hours schedule (nullable) |
| `service_skills` | Array[UUID] | - | No | null | Array of UUIDs | Service skill IDs (nullable) |
| `active` | Boolean | - | Yes | true | true/false | Active status |
| `last_login_at` | String | ISO 8601 | No | null | Valid datetime | Last login timestamp (nullable) |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |
| `updated_at` | String | ISO 8601 | No | null | Valid datetime | Last update timestamp (nullable) |

**Note:** `password_hash` is never returned in responses for security.

**Example Payload:**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440000",
  "email": "staff@patacao.pt",
  "full_name": "Maria Santos",
  "phone": "+351 912 345 678",
  "username": "maria.santos",
  "roles": ["Staff"],
  "store_ids": ["660e8400-e29b-41d4-a716-446655440000"],
  "working_hours": {
    "monday": {"start": "09:00", "end": "18:00", "available": true},
    "tuesday": {"start": "09:00", "end": "18:00", "available": true},
    "wednesday": {"start": "09:00", "end": "18:00", "available": true},
    "thursday": {"start": "09:00", "end": "18:00", "available": true},
    "friday": {"start": "09:00", "end": "18:00", "available": true},
    "saturday": {"available": false},
    "sunday": {"available": false}
  },
  "service_skills": ["dd0e8400-e29b-41d4-a716-446655440000"],
  "active": true,
  "last_login_at": "2024-01-20T14:30:00Z",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:45:00Z"
}
```

---

### SearchUsersDTO

**Purpose:**  
Input DTO for searching users with filters and pagination.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `q` | String | - | No | - | Max 255 chars | General search query (searches email, full_name, username) |
| `email` | String | - | No | - | Max 255 chars | Filter by email (partial match) |
| `role` | String | - | No | - | Valid role name | Filter by role (Owner, Manager, Staff, Accountant, Veterinarian) |
| `store_id` | UUID | - | No | - | Valid UUID, must exist | Filter by store assignment |
| `active` | Boolean | - | No | - | true/false | Filter by active status |
| `page` | Integer | - | No | 1 | Min 1 | Page number for pagination |
| `per_page` | Integer | - | No | 20 | Min 1, max 100 | Number of results per page |
| `sort` | String | - | No | "full_name" | Valid sort field | Sort field and direction ("-" prefix for descending) |

**Example Payload:**
```json
{
  "q": "Maria",
  "role": "Staff",
  "store_id": "660e8400-e29b-41d4-a716-446655440000",
  "active": true,
  "page": 1,
  "per_page": 20,
  "sort": "full_name"
}
```

---

### PaginatedUsersResponseDTO

**Purpose:**  
Output DTO for paginated user search results.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `items` | Array[UserResponseDTO] | - | Yes | - | Array of user objects | Matching users |
| `meta` | PaginationMetaDTO | - | Yes | - | Valid pagination metadata | Pagination information |

**Example Payload:**
```json
{
  "items": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440000",
      "email": "staff@patacao.pt",
      "full_name": "Maria Santos",
      "phone": "+351 912 345 678",
      "username": "maria.santos",
      "roles": ["Staff"],
      "store_ids": ["660e8400-e29b-41d4-a716-446655440000"],
      "working_hours": null,
      "service_skills": [],
      "active": true,
      "last_login_at": "2024-01-20T14:30:00Z",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:45:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "per_page": 20,
    "total_pages": 3,
    "has_next": true,
    "has_previous": false
  }
}
```

---

## Role DTOs

### RoleResponseDTO

**Purpose:**  
Output DTO for role responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | String | - | Yes | - | Max 64 chars | Canonical role ID (Owner, Manager, Staff, Accountant, Veterinarian) |
| `name` | String | - | Yes | - | Max 128 chars | Role name |
| `permissions` | Array[String] | - | No | null | Array of permission keys | List of permission keys (nullable) |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |
| `updated_at` | String | ISO 8601 | No | null | Valid datetime | Last update timestamp (nullable) |

**Example Payload:**
```json
{
  "id": "Staff",
  "name": "Staff",
  "permissions": [
    "appointments:create",
    "appointments:read",
    "customers:read",
    "pets:read"
  ],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": null
}
```

---

### RolesResponseDTO

**Purpose:**  
Output DTO for list of roles response.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `roles` | Array[RoleResponseDTO] | - | Yes | - | Array of role objects | List of all available roles |

**Example Payload:**
```json
{
  "roles": [
    {
      "id": "Owner",
      "name": "Owner",
      "permissions": ["*"],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": null
    },
    {
      "id": "Manager",
      "name": "Manager",
      "permissions": [
        "appointments:*",
        "customers:*",
        "pets:*",
        "users:read",
        "users:create"
      ],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": null
    },
    {
      "id": "Staff",
      "name": "Staff",
      "permissions": [
        "appointments:create",
        "appointments:read",
        "customers:read",
        "pets:read"
      ],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": null
    }
  ]
}
```

---

## Session DTOs

### SessionResponseDTO

**Purpose:**  
Output DTO for session responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | Session identifier |
| `user_id` | UUID | - | Yes | - | Valid UUID | User identifier |
| `user_email` | String | - | Yes | - | Max 255 chars | User email (denormalized) |
| `user_full_name` | String | - | Yes | - | Max 255 chars | User full name (denormalized) |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Session creation timestamp |
| `expires_at` | String | ISO 8601 | Yes | - | Valid datetime | Session expiration timestamp |
| `revoked` | Boolean | - | Yes | false | true/false | Revocation status |
| `ip_address` | String | - | No | null | Valid IP address | Client IP address (nullable) |
| `user_agent` | String | - | No | null | Max 512 chars | Client user agent (nullable) |

**Example Payload:**
```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440000",
  "user_id": "990e8400-e29b-41d4-a716-446655440000",
  "user_email": "staff@patacao.pt",
  "user_full_name": "Maria Santos",
  "created_at": "2024-01-20T10:30:00Z",
  "expires_at": "2024-01-27T10:30:00Z",
  "revoked": false,
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0..."
}
```

---

### SessionsResponseDTO

**Purpose:**  
Output DTO for list of sessions response.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `sessions` | Array[SessionResponseDTO] | - | Yes | - | Array of session objects | List of sessions |

**Example Payload:**
```json
{
  "sessions": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440000",
      "user_id": "990e8400-e29b-41d4-a716-446655440000",
      "user_email": "staff@patacao.pt",
      "user_full_name": "Maria Santos",
      "created_at": "2024-01-20T10:30:00Z",
      "expires_at": "2024-01-27T10:30:00Z",
      "revoked": false,
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0..."
    },
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440000",
      "user_id": "990e8400-e29b-41d4-a716-446655440000",
      "user_email": "staff@patacao.pt",
      "user_full_name": "Maria Santos",
      "created_at": "2024-01-19T08:00:00Z",
      "expires_at": "2024-01-26T08:00:00Z",
      "revoked": true,
      "ip_address": "192.168.1.101",
      "user_agent": "Mozilla/5.0..."
    }
  ]
}
```

---

### SearchSessionsDTO

**Purpose:**  
Input DTO for searching sessions with filters.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `user_id` | UUID | - | No | - | Valid UUID | Filter by user |

**Example Payload:**
```json
{
  "user_id": "990e8400-e29b-41d4-a716-446655440000"
}
```

---

## Validation Notes

### Portuguese-Specific Validations

1. **Phone Number:**
   - Portuguese phone format: +351 followed by 9 digits
   - May include spaces or dashes for readability
   - Examples: "+351 21 123 4567", "+351912345678"

### Common Validation Rules

1. **Email:**
   - Standard RFC 5322 email format validation
   - Case-insensitive
   - Max 255 characters
   - Must be unique

2. **Password:**
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one digit
   - At least one special character (optional, business rule dependent)

3. **Date Formats:**
   - DateTimes: ISO 8601 format (e.g., "2024-01-15T10:30:00Z")

4. **UUID:**
   - Standard UUID v4 format
   - Example: "550e8400-e29b-41d4-a716-446655440000"

5. **Role IDs:**
   - Valid values: "Owner", "Manager", "Staff", "Accountant", "Veterinarian"
   - Case-sensitive

### Business Rules

1. **Authentication:**
   - Rate limiting applies to login attempts (IP-based or email-based)
   - Account lockout after multiple failed attempts
   - Generic error messages to prevent user enumeration
   - Sessions are created on successful login
   - Access tokens are short-lived (e.g., 15 minutes)
   - Refresh tokens are long-lived (e.g., 7 days)

2. **User Management:**
   - User must have at least one role to access system
   - Only Owner can create Owner users
   - Email and username are immutable after creation
   - Password hash is never returned in responses

3. **Password Reset:**
   - Reset tokens are time-limited (e.g., 1 hour)
   - Reset tokens are single-use
   - Generic success messages regardless of email existence (security)

4. **Sessions:**
   - Sessions can be revoked individually
   - Revoking a session invalidates associated tokens
   - Sessions expire based on refresh token expiration

5. **Roles:**
   - Roles are predefined (Owner, Manager, Staff, Accountant, Veterinarian)
   - Permissions are associated with roles
   - Users can have multiple roles

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

