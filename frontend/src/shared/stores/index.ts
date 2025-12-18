/**
 * Store Index
 * 
 * Central export for all store-related modules
 */

export * from './auth/auth.actions';
export * from './auth/auth.effects';
export * from './auth/auth.reducer';
export * from './auth/auth.selectors';
export * from './auth/auth.state';
export * from './ui/ui.state';

// App State interface
import { AuthState } from './auth/auth.state';
import { UIState } from './ui/ui.state';

export interface AppState {
  auth: AuthState;
  ui?: UIState;
}
