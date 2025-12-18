/**
 * Auth Effects
 * 
 * Side effects for authentication actions
 * 
 * Note: AuthService currently handles API calls and dispatches actions directly.
 * Effects are kept for future use if we need to centralize side effects.
 */

import { Injectable, inject } from '@angular/core';
import { Actions } from '@ngrx/effects';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);

  // AuthService handles API calls and dispatches actions directly
  // Effects can be added here for additional side effects (e.g., logging, analytics)
}

