/**
 * Auth API Service
 * 
 * API service for authentication endpoints
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../shared/services/api.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    roles: string[];
  };
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetRequestResponse {
  success: boolean;
  message: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface PasswordResetConfirmResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private readonly apiService = inject(ApiService);

  /**
   * Login user
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.apiService.post<LoginResponse>('/auth/login', credentials);
  }

  /**
   * Logout user
   */
  logout(refreshToken?: string): Observable<void> {
    return this.apiService.post<void>('/auth/logout', refreshToken ? { refreshToken } : {});
  }

  /**
   * Refresh access token
   */
  refreshToken(refreshToken: string): Observable<RefreshTokenResponse> {
    return this.apiService.post<RefreshTokenResponse>('/auth/refresh', { refreshToken });
  }

  /**
   * Request password reset
   */
  requestPasswordReset(email: string): Observable<PasswordResetRequestResponse> {
    return this.apiService.post<PasswordResetRequestResponse>('/auth/password-reset/request', { email });
  }

  /**
   * Confirm password reset
   */
  confirmPasswordReset(token: string, newPassword: string): Observable<PasswordResetConfirmResponse> {
    return this.apiService.post<PasswordResetConfirmResponse>('/auth/password-reset/confirm', {
      token,
      newPassword
    });
  }
}

