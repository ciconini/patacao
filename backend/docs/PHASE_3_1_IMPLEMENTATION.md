# Phase 3.1: Authentication & Authorization - Implementation Summary

## Overview

Phase 3.1 has been completed with all authentication and authorization services, guards, and mechanisms implemented.

## Services Created

### 1. PasswordHasherService
**Location**: `backend/src/shared/auth/password-hasher.service.ts`

- Implements password hashing using bcrypt (12 salt rounds)
- Provides `hash()` and `verify()` methods
- Registered in `AuthModule` as `PasswordHasher` token

### 2. JwtTokenGeneratorService
**Location**: `backend/src/shared/auth/jwt-token-generator.service.ts`

- Generates JWT access tokens with user ID, roles, and session ID
- Generates random refresh tokens (32 bytes, hex encoded)
- Verifies and decodes JWT tokens
- Configurable via environment variables:
  - `JWT_SECRET` (default: 'change-me-in-production')
  - `JWT_EXPIRY_SECONDS` (default: 900 = 15 minutes)
- Registered in `AuthModule` as `TokenGenerator` token

### 3. RateLimiterService
**Location**: `backend/src/shared/auth/rate-limiter.service.ts`

- Uses Redis for distributed rate limiting
- Three rate limiters:
  - **Login**: 5 attempts per 15 minutes
  - **Password Reset**: 3 attempts per hour
  - **General**: 100 requests per minute
- Registered in `AuthModule` as `RateLimiter` token

### 4. PermissionService
**Location**: `backend/src/shared/auth/permission.service.ts`

- Centralized role-based access control (RBAC)
- Role hierarchy: Owner > Manager > Staff
- Methods:
  - `hasRole()` - Check if user has specific role
  - `hasAnyRole()` - Check if user has any of the required roles
  - `hasAllRoles()` - Check if user has all required roles
  - `isOwnerOrManager()` - Convenience method
  - `isOwner()` - Convenience method
  - `canAccessStore()` - Check store access
  - `canAccessOwnResource()` - Check self-access or admin access

## Guards Created

### 1. FirebaseAuthGuard (Already Existed)
**Location**: `backend/src/shared/auth/firebase-auth.guard.ts`

- Verifies Firebase ID tokens
- Attaches user info to request object

### 2. RolesGuard
**Location**: `backend/src/shared/auth/roles.guard.ts`

- Checks if user has required roles
- Usage: `@UseGuards(RolesGuard)` with `@RequireRoles('Owner', 'Manager')` decorator
- Works with FirebaseAuthGuard to extract roles from token

### 3. RateLimitGuard
**Location**: `backend/src/shared/auth/rate-limit.guard.ts`

- Applies rate limiting to routes
- Usage: `@UseGuards(RateLimitGuard)` with `@RateLimit('login')` decorator
- Uses IP address or email as identifier

## Use Cases Created

### RefreshTokenUseCase
**Location**: `backend/src/modules/users/application/refresh-token.use-case.ts`

- Validates refresh token
- Verifies session is still valid
- Generates new access token
- Supports optional refresh token rotation
- Registered in `UsersApplicationModule`

## Controllers Updated

### AuthController
**Location**: `backend/src/modules/users/presentation/controllers/auth.controller.ts`

- Added refresh token endpoint: `POST /api/v1/auth/refresh`
- Added rate limiting to login endpoint
- Added rate limiting to password reset request endpoint

## Module Updates

### AuthModule
**Location**: `backend/src/shared/auth/auth.module.ts`

- Registered all new services and guards
- Exported all services with string tokens for dependency injection
- Made services available globally

## Configuration

### Environment Variables Required

```env
# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRY_SECONDS=900  # 15 minutes

# Redis Configuration (for rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=patacao:
```

## Usage Examples

### Protecting Routes with Roles

```typescript
@Controller('api/v1/companies')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class CompanyController {
  @Post()
  @RequireRoles('Owner')
  async create(@Body() dto: CreateCompanyDto) {
    // Only Owners can create companies
  }
}
```

### Rate Limiting Auth Endpoints

```typescript
@Post('login')
@UseGuards(RateLimitGuard)
@RateLimit('login')
async login(@Body() dto: LoginDto) {
  // Rate limited to 5 attempts per 15 minutes
}
```

### Using Permission Service

```typescript
constructor(private readonly permissionService: PermissionService) {}

async someMethod(userPermissions: UserPermissions) {
  if (this.permissionService.isOwnerOrManager(userPermissions)) {
    // Allow access
  }
}
```

## Next Steps

### Important: Use Case Dependency Injection

The use cases currently define repository and service interfaces locally. To use the new services, use cases need to be updated to inject them using `@Inject()` decorators:

```typescript
constructor(
  @Inject('PasswordHasher') private readonly passwordHasher: PasswordHasher,
  @Inject('TokenGenerator') private readonly tokenGenerator: TokenGenerator,
  @Inject('RateLimiter') private readonly rateLimiter: RateLimiter,
) {}
```

This refactoring should be done incrementally as use cases are tested.

## Testing

All services and guards are ready for testing. The following should be tested:

1. Password hashing and verification
2. JWT token generation and verification
3. Rate limiting (requires Redis)
4. Role-based authorization
5. Refresh token flow
6. Session management

## Notes

- Firebase Authentication is still available alongside JWT authentication
- The system supports both authentication methods (hybrid approach)
- Rate limiting requires Redis to be running
- All services are registered globally via `@Global()` AuthModule

