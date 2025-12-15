# Firebase Authentication Integration Guide

## Overview

Firebase Authentication has been integrated into the backend to support token verification and user management. This integration allows the backend to verify Firebase ID tokens issued by the Firebase Auth SDK (typically used on the frontend/client side).

## Architecture

The integration follows a **hybrid approach**:

1. **Frontend/Client**: Uses Firebase Auth SDK to authenticate users (email/password, OAuth, etc.)
2. **Backend**: Verifies Firebase ID tokens using Firebase Admin SDK
3. **User Management**: Backend still manages user data (roles, permissions, profiles) in Firestore

## Components Created

### 1. FirebaseAuthService
**Location**: `backend/src/shared/auth/firebase-auth.service.ts`

Service for verifying Firebase ID tokens and managing Firebase Auth users.

**Key Methods**:
- `verifyIdToken(idToken: string)` - Verifies a Firebase ID token
- `getUserByUid(uid: string)` - Gets user information from Firebase Auth
- `createCustomToken(uid: string, claims?)` - Creates custom tokens
- `setCustomClaims(uid: string, claims)` - Sets custom claims (roles, permissions)
- `revokeRefreshTokens(uid: string)` - Revokes all refresh tokens
- `deleteUser(uid: string)` - Deletes a user from Firebase Auth

### 2. FirebaseAuthGuard
**Location**: `backend/src/shared/auth/firebase-auth.guard.ts`

NestJS guard that automatically verifies Firebase ID tokens from the `Authorization: Bearer <token>` header.

**Usage**:
```typescript
@Controller('api/v1/protected')
@UseGuards(FirebaseAuthGuard)
export class ProtectedController {
  @Get('profile')
  getProfile(@Request() req: AuthenticatedRequest) {
    // req.user contains the decoded Firebase token payload
    // req.firebaseUid contains the Firebase user UID
    return { user: req.user };
  }
}
```

### 3. AuthModule
**Location**: `backend/src/shared/auth/auth.module.ts`

NestJS module that provides authentication services and guards globally.

## Integration Options

### Option 1: Hybrid Approach (Recommended)

**Keep both authentication systems**:
- **Custom Auth**: For backend-managed users (staff, managers) with email/password
- **Firebase Auth**: For client-side authentication (can be used for customer-facing apps)

**Benefits**:
- Flexibility to use either system
- Backend maintains full control over staff authentication
- Can use Firebase Auth for customer portals or mobile apps

**Implementation**:
- Use `FirebaseAuthGuard` for routes that accept Firebase tokens
- Use custom auth guards for routes that use custom JWT tokens
- Map Firebase UID to your internal User entity when needed

### Option 2: Full Firebase Auth Migration

**Replace custom authentication with Firebase Auth**:
- All users authenticate via Firebase Auth
- Backend only verifies tokens
- User data still stored in Firestore (linked by Firebase UID)

**Benefits**:
- Single authentication system
- Firebase handles password reset, email verification, etc.
- Supports multiple auth providers (Google, Facebook, etc.)

**Implementation Steps**:
1. Create users in Firebase Auth when creating User entities
2. Link Firebase UID to User entity in Firestore
3. Update login use case to use Firebase Auth
4. Replace custom JWT tokens with Firebase ID tokens

## Current State

### What's Already Set Up

✅ **Firebase Admin SDK**: Configured and initialized  
✅ **FirebaseAuthService**: Created and ready to use  
✅ **FirebaseAuthGuard**: Created for protecting routes  
✅ **AuthModule**: Registered in AppModule  

### What Needs to Be Done

#### 1. Link Firebase UID to User Entity

Update the `User` entity or create a mapping to link Firebase UID:

```typescript
// Option A: Add firebaseUid field to User entity
interface User {
  id: string;
  firebaseUid?: string; // Link to Firebase Auth user
  // ... other fields
}

// Option B: Create a mapping collection in Firestore
// Collection: user_firebase_mapping
// Document: { userId: string, firebaseUid: string }
```

#### 2. Update User Creation Flow

When creating a user, also create a Firebase Auth user:

```typescript
// In CreateUserUseCase or similar
const firebaseUser = await firebaseAuthService.createUser({
  email: userData.email,
  password: userData.password,
  displayName: userData.fullName,
});

// Link Firebase UID to User entity
user.firebaseUid = firebaseUser.uid;
await userRepository.save(user);

// Set custom claims (roles)
await firebaseAuthService.setCustomClaims(firebaseUser.uid, {
  roles: userData.roleIds,
});
```

#### 3. Create User Lookup Service

Create a service to find internal User by Firebase UID:

```typescript
async findUserByFirebaseUid(firebaseUid: string): Promise<User | null> {
  // Query Firestore for user with matching firebaseUid
  // Or query user_firebase_mapping collection
}
```

#### 4. Update Authentication Guards

Create a guard that:
1. Verifies Firebase token
2. Looks up internal User entity
3. Attaches User entity to request for authorization checks

#### 5. Update Login Use Case (if migrating)

If migrating to full Firebase Auth:
- Remove password verification logic
- Use Firebase Auth to sign in users
- Return Firebase ID token instead of custom JWT

## Usage Examples

### Protecting a Route with Firebase Auth

```typescript
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { FirebaseAuthGuard, AuthenticatedRequest } from '../../shared/auth/firebase-auth.guard';

@Controller('api/v1/protected')
@UseGuards(FirebaseAuthGuard)
export class ProtectedController {
  @Get('me')
  getCurrentUser(@Request() req: AuthenticatedRequest) {
    // req.user contains Firebase token payload
    // req.firebaseUid contains Firebase user UID
    return {
      uid: req.firebaseUid,
      email: req.user?.email,
      name: req.user?.name,
    };
  }
}
```

### Verifying Token Manually

```typescript
import { FirebaseAuthService } from '../../shared/auth/firebase-auth.service';

constructor(
  private readonly firebaseAuthService: FirebaseAuthService,
) {}

async someMethod(idToken: string) {
  const result = await this.firebaseAuthService.verifyIdToken(idToken);
  
  if (result.valid && result.payload) {
    const uid = result.payload.uid;
    // Use uid to look up user, check permissions, etc.
  }
}
```

### Setting Custom Claims (Roles)

```typescript
// When assigning roles to a user
await this.firebaseAuthService.setCustomClaims(firebaseUid, {
  roles: ['Owner', 'Manager'],
  storeIds: ['store-1', 'store-2'],
});

// Custom claims will be included in subsequent token verifications
// Access via: result.payload.roles, result.payload.storeIds
```

## Environment Variables

No additional environment variables are required. The Firebase Admin SDK uses the same configuration as Firestore:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT_KEY`
- `USE_FIREBASE_EMULATOR` (for local development)

## Testing

### Test Firebase Auth Token Verification

Create a test script to verify tokens:

```typescript
// src/cli/test-firebase-auth.ts
import { FirebaseAuthService } from '../shared/auth/firebase-auth.service';

// Test token verification
const result = await firebaseAuthService.verifyIdToken('your-firebase-id-token');
console.log('Token valid:', result.valid);
console.log('Payload:', result.payload);
```

### Using Firebase Emulator

1. Start Firebase Emulator:
   ```bash
   npm run firebase:emulators
   ```

2. Set environment variable:
   ```bash
   export USE_FIREBASE_EMULATOR=true
   export FIREBASE_EMULATOR_HOST=localhost:9099
   ```

3. Test with emulator tokens

## Next Steps

1. **Decide on integration approach** (Hybrid vs Full Migration)
2. **Link Firebase UID to User entities** (add field or mapping)
3. **Update user creation flow** to create Firebase Auth users
4. **Create user lookup service** to find User by Firebase UID
5. **Update guards** to attach User entity to requests
6. **Test token verification** with real Firebase tokens
7. **Update API documentation** to reflect authentication method

## Notes

- Firebase ID tokens expire after 1 hour (default)
- Refresh tokens can be used to get new ID tokens
- Custom claims are cached in tokens (may take up to 1 hour to propagate)
- Firebase Auth supports multiple providers (email/password, Google, Facebook, etc.)
- Backend can still manage user data (roles, permissions) separately from Firebase Auth

