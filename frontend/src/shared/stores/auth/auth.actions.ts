/**
 * Auth Actions
 * 
 * NgRx actions for authentication
 */

import { createAction, props } from '@ngrx/store';
import { User } from '../../../modules/users/services/auth.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginSuccess {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshTokenSuccess {
  accessToken: string;
  refreshToken: string;
}

// Login actions
export const login = createAction(
  '[Auth] Login',
  props<LoginRequest>()
);

export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<LoginSuccess>()
);

export const loginFailure = createAction(
  '[Auth] Login Failure',
  props<{ error: string }>()
);

// Logout actions
export const logout = createAction('[Auth] Logout');
export const logoutSuccess = createAction('[Auth] Logout Success');

// Token refresh actions
export const refreshToken = createAction('[Auth] Refresh Token');
export const refreshTokenSuccess = createAction(
  '[Auth] Refresh Token Success',
  props<RefreshTokenSuccess>()
);
export const refreshTokenFailure = createAction(
  '[Auth] Refresh Token Failure',
  props<{ error: string }>()
);

// User actions
export const setUser = createAction(
  '[Auth] Set User',
  props<{ user: User }>()
);

export const clearAuth = createAction('[Auth] Clear Auth');

