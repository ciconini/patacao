# Firebase Authentication Integration with Phase 3.1

## Overview

This document describes how Firebase Authentication integrates with Phase 3.1 (Authentication & Authorization) services and guards.

## Architecture

The system uses a **hybrid authentication approach**:

1. **Custom JWT Authentication**: For backend-managed users (staff, managers) with email/password stored in Firestore
2. **Firebase Authentication**: For client-side authentication, with Firebase ID tokens verified by the backend
3. **Unified Authorization**: Both authentication methods use the same authorization guards and permission system

## Components

### 1. FirebaseAuthIntegrationService
**Location**: `backend/src/shared/auth/firebase-auth-integration.service.ts`

Service that bridges Firebase Auth with the internal user system:
- Creates Firebase Auth users
- Links Firebase UIDs to internal User entities
- Sets custom claims (roles) on Firebase users
- Manages Firebase user lifecycle

### 2. FirebaseUserLookupService
**Location**: `backend/src/shared/auth/firebase-user-lookup.service.ts`

Service for finding internal User entities by Firebase UID:
- `findByFirebaseUid(firebaseUid: string)` - Finds User by Firebase UID
- `linkFirebaseUid(userId: string, firebaseUid: string)` - Links Firebase UID to User

### 3. Updated RolesGuard
**Location**: `backend/src/shared/auth/roles.guard.ts`

Now properly extracts roles from Firebase custom claims:
- Handles Firebase custom claims format: `{ Owner: true, Manager: true }`
- Converts to array format for PermissionService
- Works with both Firebase tokens and custom JWT tokens

## User Entity Updates

The `User` entity now supports Firebase UID linking:

```typescript
// Firestore document includes:
{
  id: string;
  email: string;
  // ... other fields
  firebaseUid?: string; // Links to Firebase Auth user
}
```

## Authentication Flows

### Flow 1: Custom JWT Authentication (Backend-Managed)

1. User logs in via `POST /api/v1/auth/login`
2. `UserLoginUseCase` verifies password using `PasswordHasherService`
3. Generates custom JWT token using `JwtTokenGeneratorService`
4. Returns access token and refresh token
5. Client uses custom JWT token in `Authorization: Bearer <token>` header

### Flow 2: Firebase Authentication (Client-Side)

1. Client authenticates using Firebase Auth SDK (email/password, OAuth, etc.)
2. Firebase returns ID token
3. Client sends ID token in `Authorization: Bearer <firebase-id-token>` header
4. `FirebaseAuthGuard` verifies token using `FirebaseAuthService`
5. Extracts roles from custom claims
6. Request proceeds with authorization checks

### Flow 3: Hybrid (Linking Firebase to Internal User)

1. Internal user exists in Firestore
2. Create Firebase Auth user using `FirebaseAuthIntegrationService.createFirebaseUser()`
3. Link Firebase UID to User: `firebaseUserLookupService.linkFirebaseUid(userId, firebaseUid)`
4. Set custom claims (roles): `firebaseAuthIntegrationService.setUserRoles(firebaseUid, roles)`
5. User can now authenticate with either method

## Custom Claims Format

Firebase custom claims are stored as objects:

```typescript
{
  roles: {
    Owner: true,
    Manager: true
  },
  storeIds: ['store-1', 'store-2']
}
```

The `RolesGuard` automatically converts this to an array format for `PermissionService`.

## Usage Examples

### Creating a User with Firebase Auth

```typescript
// In CreateUserUseCase or similar
const firebaseUid = await firebaseAuthIntegrationService.createFirebaseUser({
  email: userData.email,
  password: userData.password,
  displayName: userData.fullName,
});

// Link to internal user
await firebaseUserLookupService.linkFirebaseUid(user.id, firebaseUid);

// Set roles
await firebaseAuthIntegrationService.setUserRoles(firebaseUid, user.roleIds, user.storeIds);
```

### Protecting Routes with Firebase Auth

```typescript
@Controller('api/v1/protected')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class ProtectedController {
  @Get('me')
  @RequireRoles('Owner', 'Manager')
  getCurrentUser(@Request() req: AuthenticatedRequest) {
    // req.user contains Firebase token payload
    // req.firebaseUid contains Firebase user UID
    // Roles are automatically extracted from custom claims
    return { user: req.user };
  }
}
```

### Looking Up Internal User from Firebase Token

```typescript
@Get('profile')
@UseGuards(FirebaseAuthGuard)
async getProfile(@Request() req: AuthenticatedRequest) {
  const firebaseUid = req.firebaseUid;
  
  // Find internal user
  const user = await firebaseUserLookupService.findByFirebaseUid(firebaseUid);
  
  if (!user) {
    throw new NotFoundException('User not found');
  }
  
  return { user };
}
```

## Migration Strategy

### For Existing Users

1. **Option A: Gradual Migration**
   - Keep custom JWT authentication
   - Create Firebase users on-demand when users log in
   - Link Firebase UID to existing User entities

2. **Option B: Full Migration**
   - Create Firebase users for all existing users
   - Link Firebase UIDs
   - Set custom claims
   - Update frontend to use Firebase Auth SDK
   - Deprecate custom JWT authentication

### For New Users

1. Create internal User entity in Firestore
2. Create Firebase Auth user
3. Link Firebase UID to User
4. Set custom claims (roles)
5. User can authenticate with Firebase Auth SDK

## Testing

### Test Firebase Token Verification

```typescript
// Test with Firebase emulator
const result = await firebaseAuthService.verifyIdToken(firebaseIdToken);
console.log('Token valid:', result.valid);
console.log('Roles:', result.payload?.roles);
```

### Test Role Extraction

```typescript
// Test RolesGuard with Firebase token
const user = { uid: 'firebase-uid', roles: { Owner: true } };
// RolesGuard should extract: ['Owner']
```

## Environment Variables

No additional environment variables required. Uses existing Firebase configuration:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT_KEY`
- `USE_FIREBASE_EMULATOR` (for local development)

## Security Considerations

1. **Custom Claims Caching**: Firebase caches custom claims in tokens. Changes may take up to 1 hour to propagate. Force token refresh if immediate updates are needed.

2. **Token Expiration**: Firebase ID tokens expire after 1 hour. Clients should refresh tokens using Firebase Auth SDK.

3. **Role Updates**: When updating user roles, update both:
   - Internal User entity (Firestore)
   - Firebase custom claims

4. **Password Management**: 
   - Custom JWT: Passwords managed in Firestore
   - Firebase Auth: Passwords managed by Firebase (supports password reset, email verification, etc.)

## Next Steps

1. ✅ Firebase Auth integration services created
2. ✅ RolesGuard updated to handle Firebase custom claims
3. ✅ User entity supports firebaseUid field
4. ⏳ Update UserLoginUseCase to optionally create Firebase users
5. ⏳ Update CreateUserUseCase to create Firebase users
6. ⏳ Add migration script for existing users
7. ⏳ Update API documentation

## Notes

- Both authentication methods can coexist
- Authorization (roles, permissions) works the same for both methods
- Firebase Auth provides additional features (OAuth, email verification, password reset)
- Custom JWT provides more control over token format and expiration

