/**
 * Error Interceptor
 * 
 * Handles HTTP errors globally:
 * - 401: Redirect to login
 * - 403: Show forbidden error
 * - 409: Handle conflicts
 * - 500: Show server error
 */

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Unauthorized - redirect to login
        router.navigate(['/login']);
        toastService.error('Sessão expirada. Por favor, faça login novamente.');
      } else if (error.status === 403) {
        // Forbidden
        toastService.error('Você não tem permissão para realizar esta ação.');
      } else if (error.status === 409) {
        // Conflict - handled by component
        // Don't show generic error, let component handle it
      } else if (error.status >= 500) {
        // Server error
        toastService.error('Erro no servidor. Por favor, tente novamente mais tarde.');
      } else if (error.status === 0) {
        // Network error
        toastService.error('Erro de conexão. Verifique sua internet.');
      }

      return throwError(() => error);
    })
  );
};

