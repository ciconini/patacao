/**
 * Response Types
 * 
 * Common response types used across the application
 */

import { PaginatedResponse } from './api.types';

/**
 * Standard API response wrapper
 */
export type ApiResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
};

/**
 * Paginated list response
 */
export type PaginatedListResponse<T> = PaginatedResponse<T>;

