/**
 * Application Error Base Classes
 *
 * Centralized error classes for use across all application use cases.
 * These errors are thrown by use cases and caught by the global exception filter.
 *
 * This belongs to the Application layer (shared across modules).
 */

/**
 * Base class for all application errors
 */
export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number = 500,
    public readonly details?: Record<string, any>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error - Invalid input data
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

/**
 * Unauthorized error - Authentication required or invalid credentials
 */
export class UnauthorizedError extends ApplicationError {
  constructor(message: string = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
  }
}

/**
 * Forbidden error - Insufficient permissions
 */
export class ForbiddenError extends ApplicationError {
  constructor(message: string = 'Access forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

/**
 * Not found error - Resource not found
 */
export class NotFoundError extends ApplicationError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message, 404);
  }
}

/**
 * Conflict error - Resource conflict (e.g., duplicate)
 */
export class ConflictError extends ApplicationError {
  constructor(message: string = 'Resource conflict', details?: Record<string, any>) {
    super('CONFLICT', message, 409, details);
  }
}

/**
 * Duplicate error - Duplicate entry (specific type of conflict)
 */
export class DuplicateError extends ApplicationError {
  constructor(message: string = 'Duplicate entry', details?: Record<string, any>) {
    super('DUPLICATE_ENTRY', message, 409, details);
  }
}

/**
 * Account locked error - Account temporarily locked
 */
export class AccountLockedError extends ApplicationError {
  constructor(message: string = 'Account temporarily locked') {
    super('ACCOUNT_LOCKED', message, 401);
  }
}

/**
 * Rate limit error - Too many requests
 */
export class RateLimitError extends ApplicationError {
  constructor(message: string = 'Too many requests') {
    super('RATE_LIMIT_EXCEEDED', message, 429);
  }
}

/**
 * Insufficient stock error - Not enough inventory
 */
export class InsufficientStockError extends ApplicationError {
  constructor(message: string = 'Insufficient stock', details?: Record<string, any>) {
    super('INSUFFICIENT_STOCK', message, 409, details);
  }
}

/**
 * Business rule violation error
 */
export class BusinessRuleViolationError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super('BUSINESS_RULE_VIOLATION', message, 400, details);
  }
}

/**
 * Repository error - Database/persistence error
 */
export class RepositoryError extends ApplicationError {
  constructor(
    message: string = 'An error occurred during persistence',
    details?: Record<string, any>,
  ) {
    super('REPOSITORY_ERROR', message, 500, details);
  }
}

/**
 * Domain error - Domain layer error
 */
export class DomainError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super('DOMAIN_ERROR', message, 400, details);
  }
}
