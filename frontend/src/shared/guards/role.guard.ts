/**
 * Role Guard
 * 
 * Protects routes based on user roles
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../../modules/users/services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    const user = authService.currentUser();
    if (!user) {
      router.navigate(['/login']);
      return false;
    }

    // Check if user has at least one of the required roles
    const hasRequiredRole = allowedRoles.some(role => authService.hasRole(role));
    
    if (!hasRequiredRole) {
      router.navigate(['/dashboard']); // Redirect to dashboard if no permission
      return false;
    }

    return true;
  };
};

