/**
 * Authentication Interceptor
 * 
 * Injects Bearer token into all authenticated requests
 */

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../modules/users/services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  // Skip token injection for public endpoints
  const publicEndpoints = ['/auth/login', '/auth/refresh', '/auth/password-reset'];
  const isPublicEndpoint = publicEndpoints.some(endpoint => req.url.includes(endpoint));

  // Ensure Content-Type is set for POST/PUT/PATCH requests
  let headers: Record<string, string> = {};
  
  if (token && !isPublicEndpoint) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add Content-Type if not already set and body exists
  if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') && req.body) {
    if (!req.headers.has('Content-Type')) {
      headers['Content-Type'] = 'application/json';
    }
  }

  if (Object.keys(headers).length > 0) {
    const cloned = req.clone({
      setHeaders: headers
    });
    return next(cloned);
  }

  return next(req);
};

