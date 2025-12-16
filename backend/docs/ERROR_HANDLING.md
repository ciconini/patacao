# Error Handling Implementation

## Overview

Phase 3.2 Error Handling has been completed. This document describes the error handling architecture and how to use it.

## Architecture

### 1. Application Error Base Classes

**Location:** `backend/src/shared/errors/application-error.base.ts`

Centralized error classes for use across all application use cases:

- `ApplicationError` - Base class for all application errors
- `ValidationError` - Invalid input data (400)
- `UnauthorizedError` - Authentication required (401)
- `ForbiddenError` - Insufficient permissions (403)
- `NotFoundError` - Resource not found (404)
- `ConflictError` - Resource conflict (409)
- `DuplicateError` - Duplicate entry (409)
- `AccountLockedError` - Account temporarily locked (401)
- `RateLimitError` - Too many requests (429)
- `InsufficientStockError` - Not enough inventory (409)
- `BusinessRuleViolationError` - Business rule violation (400)
- `RepositoryError` - Database/persistence error (500)
- `DomainError` - Domain layer error (400)

### 2. Global Exception Filter

**Location:** `backend/src/shared/presentation/filters/http-exception.filter.ts`

The `HttpExceptionFilter` catches all exceptions and formats them into standardized responses:

- Handles `ApplicationError` instances from use cases
- Handles NestJS `HttpException` instances
- Handles `class-validator` validation errors gracefully
- Logs errors at appropriate levels (warn for 4xx, error for 5xx)
- Provides standardized error response format

### 3. Error Mapper

**Location:** `backend/src/shared/presentation/errors/http-error.mapper.ts`

Maps application error codes to HTTP status codes and exceptions:

- Maps error codes to appropriate HTTP status codes
- Creates standardized error responses
- Includes error details when available

### 4. Standardized Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "statusCode": 400,
    "details": {
      // Optional additional details
    }
  },
  "path": "/api/v1/endpoint",
  "method": "POST",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Usage

### In Use Cases

Use the centralized error classes:

```typescript
import { ValidationError, NotFoundError, ConflictError } from '../../shared/errors/application-error.base';

// Throw validation error
if (!input.email) {
  throw new ValidationError('Email is required');
}

// Throw not found error
const user = await this.userRepository.findById(userId);
if (!user) {
  throw new NotFoundError('User not found');
}

// Throw conflict error with details
if (await this.productRepository.findBySku(sku)) {
  throw new ConflictError('SKU already exists', { sku });
}
```

### Error Logging

The exception filter automatically logs errors:

- **4xx errors (Client errors)**: Logged at `warn` level
- **5xx errors (Server errors)**: Logged at `error` level with stack traces

Logs include:
- Error message
- HTTP method and path
- IP address
- User agent
- Error details (if available)

### Validation Errors

`class-validator` validation errors are automatically handled:

```typescript
// DTO with validation
export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

// If validation fails, the filter returns:
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "statusCode": 400,
    "details": {
      "fields": ["email", "password"],
      "messages": [
        "email must be an email",
        "password must be longer than or equal to 8 characters"
      ]
    }
  },
  "path": "/api/v1/users",
  "method": "POST",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Error Code Mapping

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Authentication required |
| `INVALID_CREDENTIALS` | 401 | Invalid credentials |
| `ACCOUNT_LOCKED` | 401 | Account temporarily locked |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `DUPLICATE_ENTRY` | 409 | Duplicate entry |
| `CONFLICT` | 409 | Resource conflict |
| `INSUFFICIENT_STOCK` | 409 | Not enough inventory |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `REPOSITORY_ERROR` | 500 | Database error |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Migration Guide

### Migrating Existing Use Cases

If your use cases define their own error classes, migrate them to use the centralized classes:

**Before:**
```typescript
export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
    this.name = 'ValidationError';
  }
}
```

**After:**
```typescript
import { ValidationError } from '../../shared/errors/application-error.base';

// Just use it directly
throw new ValidationError('Invalid input');
```

## Best Practices

1. **Use appropriate error types**: Choose the error class that best matches the situation
2. **Provide meaningful messages**: Error messages should be clear and actionable
3. **Include details when helpful**: Use the `details` parameter for additional context
4. **Don't expose sensitive information**: Avoid logging or returning sensitive data in error messages
5. **Log appropriately**: The filter handles logging automatically, but you can add additional logging in use cases if needed

## Testing

To test error handling:

1. **Validation errors**: Send invalid data to any endpoint
2. **Not found errors**: Request a non-existent resource
3. **Authorization errors**: Make requests without authentication or with insufficient permissions
4. **Server errors**: Trigger internal errors (e.g., database connection failures)

## Future Enhancements

Potential improvements:

- Error tracking integration (e.g., Sentry)
- Error rate limiting
- Custom error pages for web clients
- Error notification system
- Error analytics dashboard

