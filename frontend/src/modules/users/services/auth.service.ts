/**
 * Authentication Service
 * 
 * Manages authentication state, tokens, and user session
 * This is a placeholder - will be fully implemented in Phase 2
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthApiService, LoginRequest } from '../api/auth.api.service';
import * as AuthActions from '../../../shared/stores/auth/auth.actions';
import { AppState } from '../../../shared/stores';

export interface User {
  id: string;
  email: string;
  fullName: string;
  roleIds: string[];
  storeIds: string[];
  active: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly accessTokenKey = 'access_token';
  private readonly refreshTokenKey = 'refresh_token';
  private readonly userKey = 'current_user';

  // Signals for reactive state
  private readonly _isAuthenticated = signal<boolean>(false);
  private readonly _currentUser = signal<User | null>(null);

  // Computed signals
  readonly isAuthenticated = computed(() => this._isAuthenticated());
  readonly currentUser = computed(() => this._currentUser());

  constructor() {
    // Check if user is already authenticated on service init
    this.checkAuthState();
  }

  /**
   * Get access token from storage
   */
  getAccessToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(this.accessTokenKey);
    }
    return null;
  }

  /**
   * Get refresh token from storage
   */
  getRefreshToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(this.refreshTokenKey);
    }
    return null;
  }

  /**
   * Get current user from storage
   */
  getCurrentUser(): User | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      const userStr = localStorage.getItem(this.userKey);
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Store authentication tokens
   */
  setTokens(tokens: AuthTokens): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.accessTokenKey, tokens.accessToken);
      localStorage.setItem(this.refreshTokenKey, tokens.refreshToken);
      this._isAuthenticated.set(true);
    }
  }

  /**
   * Store user data
   */
  setUser(user: User): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
      this._currentUser.set(user);
    }
  }

  /**
   * Clear authentication data
   */
  clearAuth(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.accessTokenKey);
      localStorage.removeItem(this.refreshTokenKey);
      localStorage.removeItem(this.userKey);
      this._isAuthenticated.set(false);
      this._currentUser.set(null);
    }
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this._currentUser();
    if (!user) return false;
    return user.roleIds.includes(role);
  }

  /**
   * Check if user has access to store
   */
  hasStoreAccess(storeId: string): boolean {
    const user = this._currentUser();
    if (!user) return false;
    // Owner and Manager have access to all stores
    if (this.hasRole('Owner') || this.hasRole('Manager')) {
      return true;
    }
    return user.storeIds.includes(storeId);
  }

  /**
   * Check authentication state on init
   */
  private checkAuthState(): void {
    const token = this.getAccessToken();
    const user = this.getCurrentUser();
    
    if (token && user) {
      this._isAuthenticated.set(true);
      this._currentUser.set(user);
    }
  }

  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly store = inject(Store<AppState>);

  /**
   * Login user
   */
  login(email: string, password: string): Observable<User> {
    const loginRequest: LoginRequest = { email, password };
    
    return this.authApi.login(loginRequest).pipe(
      tap((response) => {
        // Store tokens
        this.setTokens({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken
        });

        // Map API response to User interface
        // Note: API returns 'roles' but we need 'roleIds' and 'storeIds'
        // For now, we'll use roles as roleIds and fetch storeIds separately if needed
        const user: User = {
          id: response.user.id,
          email: response.user.email,
          fullName: response.user.fullName,
          roleIds: response.user.roles, // API returns roles as role IDs
          storeIds: [], // Will be populated when we fetch full user profile
          active: true
        };

        this.setUser(user);
        
        // Dispatch NgRx action
        this.store.dispatch(AuthActions.loginSuccess({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          user
        }));
      }),
      map((response) => {
        const user: User = {
          id: response.user.id,
          email: response.user.email,
          fullName: response.user.fullName,
          roleIds: response.user.roles,
          storeIds: [],
          active: true
        };
        return user;
      }),
      catchError((error) => {
        this.store.dispatch(AuthActions.loginFailure({ error: error.message || 'Login failed' }));
        return throwError(() => error);
      })
    );
  }

  /**
   * Logout user
   */
  logout(): Observable<void> {
    const refreshToken = this.getRefreshToken();
    
    this.store.dispatch(AuthActions.logout());
    
    return this.authApi.logout(refreshToken || undefined).pipe(
      tap(() => {
        this.clearAuth();
        this.store.dispatch(AuthActions.logoutSuccess());
        this.router.navigate(['/login']);
      }),
      catchError((error) => {
        // Even if logout API fails, clear local auth
        this.clearAuth();
        this.store.dispatch(AuthActions.logoutSuccess());
        this.router.navigate(['/login']);
        return of(undefined);
      })
    );
  }

  /**
   * Refresh access token
   */
  refreshToken(): Observable<AuthTokens> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    this.store.dispatch(AuthActions.refreshToken());
    
    return this.authApi.refreshToken(refreshToken).pipe(
      map((response) => {
        const tokens: AuthTokens = {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken || refreshToken // Use new refresh token if provided, otherwise keep old one
        };
        
        this.setTokens(tokens);
        this.store.dispatch(AuthActions.refreshTokenSuccess(tokens));
        return tokens;
      }),
      catchError((error) => {
        this.clearAuth();
        this.store.dispatch(AuthActions.refreshTokenFailure({ error: error.message || 'Token refresh failed' }));
        this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  /**
   * Request password reset
   */
  requestPasswordReset(email: string): Observable<void> {
    return this.authApi.requestPasswordReset(email).pipe(
      map(() => undefined)
    );
  }

  /**
   * Confirm password reset
   */
  confirmPasswordReset(token: string, newPassword: string): Observable<void> {
    return this.authApi.confirmPasswordReset(token, newPassword).pipe(
      map(() => undefined)
    );
  }
}

