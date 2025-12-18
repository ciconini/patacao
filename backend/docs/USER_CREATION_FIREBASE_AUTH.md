# User Creation with Firebase Auth Integration

## Overview

When creating users via the `POST /api/v1/users` endpoint, the system can automatically create a corresponding Firebase Auth user if a password is provided. This ensures that users created through the admin interface can immediately log in to the system.

## How It Works

### User Creation Flow

1. **Admin creates user** via `POST /api/v1/users` with optional `password` field
2. **User created in Firestore** - Internal user entity is created with roles, stores, etc.
3. **Firebase Auth user created** (if password provided) - Firebase Auth user is created with email and password
4. **Firebase UID linked** - The Firebase UID is stored in the user's Firestore document
5. **Custom claims set** - User roles and store IDs are set as custom claims on the Firebase Auth user

### Password Handling

**With Password**:
- If `password` is provided in the request, a Firebase Auth user is created immediately
- User can log in right away using their email and password
- Firebase Auth user is linked to the internal user entity

**Without Password**:
- If `password` is omitted, only the Firestore user is created
- User must go through the password reset flow to set their password
- Firebase Auth user will be created during the password reset process (if implemented)

## API Usage

### Create User with Password (Recommended)

```http
POST /api/v1/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "staff@example.com",
  "fullName": "Jane Smith",
  "phone": "+1234567890",
  "password": "SecurePassword123!",
  "roles": ["Staff"],
  "storeIds": ["store-uuid-1"],
  "workingHours": {
    "monday": { "start": "09:00", "end": "17:00", "available": true },
    "tuesday": { "start": "09:00", "end": "17:00", "available": true },
    // ... other days
  }
}
```

**Response**: `201 Created`
```json
{
  "id": "user-uuid",
  "email": "staff@example.com",
  "fullName": "Jane Smith",
  "roles": ["Staff"],
  "storeIds": ["store-uuid-1"],
  "active": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

### Create User without Password

```http
POST /api/v1/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "staff@example.com",
  "fullName": "Jane Smith",
  "roles": ["Staff"],
  "storeIds": ["store-uuid-1"]
  // No password field
}
```

**Note**: User will need to use password reset flow to set their password before they can log in.

## Implementation Details

### Use Case: CreateUserUseCase

The `CreateUserUseCase` includes Firebase Auth integration:

1. **Validates input** - Email, roles, stores, etc.
2. **Creates Firestore user** - Saves user entity to Firestore
3. **Creates Firebase Auth user** (if password provided):
   - Calls `FirebaseAuthIntegrationService.createFirebaseUser()`
   - Links Firebase UID via `FirebaseUserLookupService.linkFirebaseUid()`
   - Sets custom claims via `FirebaseAuthIntegrationService.setUserRoles()`

### Error Handling

- **Firebase Auth unavailable**: User is still created in Firestore, but no Firebase Auth user is created. A warning is logged.
- **Email already exists in Firebase**: The existing Firebase Auth user is linked to the new internal user.
- **Firebase Auth creation fails**: User creation in Firestore succeeds, but Firebase Auth user creation fails. Error is logged but doesn't block user creation.

### Custom Claims

When a Firebase Auth user is created, custom claims are automatically set:

```json
{
  "roles": {
    "Staff": true,
    "Manager": true
  },
  "storeIds": ["store-uuid-1", "store-uuid-2"]
}
```

These claims are included in Firebase ID tokens and can be used for authorization on both frontend and backend.

## Security Considerations

1. **Password Requirements**: Ensure passwords meet security requirements (minimum length, complexity, etc.) - this should be validated on the frontend before sending to the API.

2. **Password Transmission**: Passwords are sent over HTTPS. Consider implementing additional security measures for sensitive environments.

3. **Password Storage**: Passwords are stored in Firebase Auth (not in Firestore). Firebase handles password hashing and security.

4. **Initial Password**: Consider implementing a password reset requirement on first login for users created with initial passwords.

## Troubleshooting

### User Created but Can't Log In

1. **Check Firebase Auth**: Verify the user exists in Firebase Auth console
2. **Check Firebase UID**: Verify `firebaseUid` field is set in the user's Firestore document
3. **Check Custom Claims**: Verify roles are set correctly in Firebase Auth
4. **Check Logs**: Look for errors during Firebase Auth user creation

### Firebase Auth User Not Created

1. **Check password field**: Ensure `password` was provided in the request
2. **Check Firebase integration**: Verify `FirebaseAuthIntegrationService` is available
3. **Check logs**: Look for warnings or errors about Firebase Auth integration

## Related Documentation

- [Firebase Auth Integration Guide](../FIREBASE_AUTH_INTEGRATION.md)
- [REST API Endpoints](../../docs/api/rest-endpoints.md)
- [User Management Use Cases](../src/modules/users/application/create-user.use-case.ts)

