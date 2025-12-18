/**
 * Base API Service
 * 
 * Provides HTTP client wrapper with base URL configuration
 * and common request/response handling
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpContext } from '@angular/common/http';
import { Observable, throwError, timeout } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse, PaginatedResponse, ApiRequestParams } from '../types/api.types';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly requestTimeout = 10000; // 10 seconds

  /**
   * GET request
   */
  get<T>(endpoint: string, params?: ApiRequestParams): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const httpParams = this.buildParams(params);
    
    return this.http.get<ApiResponse<T>>(url, { params: httpParams }).pipe(
      map(response => this.extractData(response)),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * GET request for paginated data
   */
  getPaginated<T>(endpoint: string, params?: ApiRequestParams): Observable<PaginatedResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const httpParams = this.buildParams(params);
    
    return this.http.get<ApiResponse<PaginatedResponse<T>>>(url, { params: httpParams }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error('Invalid paginated response format');
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, body?: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Debug logging in development
    if (!environment.production) {
      console.log('API POST Request:', { url, body });
    }
    
    return this.http.post<ApiResponse<T>>(url, body, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      timeout(this.requestTimeout),
      map(response => {
        if (!environment.production) {
          console.log('API POST Response:', response);
        }
        return this.extractData(response);
      }),
      catchError(error => {
        if (!environment.production) {
          console.error('API POST Error:', error);
        }
        return this.handleError(error);
      })
    );
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, body?: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    return this.http.put<ApiResponse<T>>(url, body).pipe(
      map(response => this.extractData(response)),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, body?: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    return this.http.patch<ApiResponse<T>>(url, body).pipe(
      map(response => this.extractData(response)),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    return this.http.delete<ApiResponse<T>>(url).pipe(
      map(response => this.extractData(response)),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Extract data from API response
   * Handles both wrapped ({ success: true, data: ... }) and direct responses
   */
  private extractData<T>(response: ApiResponse<T> | T): T {
    // Check if response is wrapped in ApiResponse format
    if (response && typeof response === 'object' && 'success' in response) {
      const apiResponse = response as ApiResponse<T>;
      
      if (apiResponse.success && apiResponse.data !== undefined) {
        return apiResponse.data;
      }
      
      if (apiResponse.error) {
        throw new Error(apiResponse.error.message || 'API request failed');
      }
      
      throw new Error('Invalid API response format');
    }
    
    // Response is direct (not wrapped) - return as-is
    return response as T;
  }

  /**
   * Build HTTP params from request params
   */
  private buildParams(params?: ApiRequestParams): HttpParams {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key];
        if (value !== null && value !== undefined && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    
    return httpParams;
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    let errorCode = 'UNKNOWN_ERROR';
    let statusCode = 500;

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      errorMessage = 'Request timeout. Please check your connection and try again.';
      errorCode = 'TIMEOUT_ERROR';
      statusCode = 0;
    }
    // Handle network errors (CORS, connection refused, etc.)
    else if (error.status === 0 || error.message?.includes('Failed to fetch')) {
      errorMessage = 'Network error. Please check if the backend server is running and CORS is configured correctly.';
      errorCode = 'NETWORK_ERROR';
      statusCode = 0;
    }
    // Handle API errors
    else if (error.error) {
      if (error.error.error) {
        errorMessage = error.error.error.message || errorMessage;
        errorCode = error.error.error.code || errorCode;
        statusCode = error.error.error.statusCode || error.status || statusCode;
      } else if (error.error.message) {
        errorMessage = error.error.message;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    if (error.status) {
      statusCode = error.status;
    }

    // Log error for debugging
    if (!environment.production) {
      console.error('API Error:', {
        code: errorCode,
        message: errorMessage,
        statusCode,
        originalError: error
      });
    }

    const apiError = {
      code: errorCode,
      message: errorMessage,
      statusCode,
      details: error.error?.error?.details || {}
    };

    return throwError(() => apiError);
  }
}

