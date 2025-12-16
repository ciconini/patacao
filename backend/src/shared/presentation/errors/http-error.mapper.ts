/**
 * HTTP Error Mapper
 * 
 * Maps application errors to HTTP status codes and responses.
 */

import {
  HttpStatus,
  HttpException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

/**
 * Maps application error codes to HTTP exceptions
 */
export function mapApplicationErrorToHttpException(error: {
  code: string;
  message: string;
}): HttpException {
  switch (error.code) {
    // Validation Errors (400)
    case 'VALIDATION_ERROR':
    case 'INVALID_INPUT':
    case 'MISSING_REQUIRED_FIELD':
    case 'BUSINESS_RULE_VIOLATION':
    case 'INVALID_STATUS':
    case 'DOMAIN_ERROR':
      return new BadRequestException(error.message);
    
    // Authentication Errors (401)
    case 'UNAUTHORIZED':
    case 'INVALID_CREDENTIALS':
    case 'ACCOUNT_LOCKED':
    case 'TOKEN_EXPIRED':
    case 'TOKEN_INVALID':
      return new UnauthorizedException(error.message);
    
    // Authorization Errors (403)
    case 'FORBIDDEN':
    case 'INSUFFICIENT_PERMISSIONS':
      return new ForbiddenException(error.message);
    
    // Not Found Errors (404)
    case 'NOT_FOUND':
    case 'RESOURCE_NOT_FOUND':
      return new NotFoundException(error.message);
    
    // Conflict Errors (409)
    case 'DUPLICATE_NIF':
    case 'DUPLICATE_EMAIL':
    case 'DUPLICATE_SKU':
    case 'DUPLICATE_USERNAME':
    case 'DUPLICATE_ENTRY':
    case 'CONFLICT':
    case 'INSUFFICIENT_STOCK':
    case 'INVENTORY_CONFLICT':
      return new ConflictException(error.message);
    
    // Rate Limiting (429)
    case 'RATE_LIMIT_EXCEEDED':
      return new HttpException(error.message, HttpStatus.TOO_MANY_REQUESTS);
    
    // Server Errors (500)
    case 'REPOSITORY_ERROR':
    case 'DATABASE_ERROR':
    case 'EXTERNAL_SERVICE_ERROR':
    case 'INTERNAL_ERROR':
    default:
      return new InternalServerErrorException(error.message);
  }
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: HttpException,
  errorCode?: string,
  details?: Record<string, any>
) {
  const response = error.getResponse();
  const statusCode = error.getStatus();
  
  // Extract message from response
  let message: string;
  if (typeof response === 'string') {
    message = response;
  } else if (typeof response === 'object' && response !== null) {
    const responseObj = response as any;
    if (Array.isArray(responseObj.message)) {
      // Validation errors array
      message = responseObj.message.join(', ');
    } else {
      message = responseObj.message || error.message;
    }
  } else {
    message = error.message;
  }

  const errorResponse: any = {
    success: false,
    error: {
      code: errorCode || error.name || 'UNKNOWN_ERROR',
      message,
      statusCode,
    },
  };

  // Add details if provided
  if (details && Object.keys(details).length > 0) {
    errorResponse.error.details = details;
  }

  return errorResponse;
}

