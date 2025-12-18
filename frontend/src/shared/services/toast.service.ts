/**
 * Toast Service
 * 
 * Service for displaying toast notifications using PrimeNG Toast
 */

import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
// PrimeNG MessageService will be imported when PrimeNG is configured
// For now, using console as fallback

export type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  // TODO: Inject MessageService when PrimeNG is configured
  // private readonly messageService = inject(MessageService);

  /**
   * Show success toast
   */
  success(message: string, title?: string): void {
    this.show('success', message, title);
  }

  /**
   * Show info toast
   */
  info(message: string, title?: string): void {
    this.show('info', message, title);
  }

  /**
   * Show warning toast
   */
  warn(message: string, title?: string): void {
    this.show('warn', message, title);
  }

  /**
   * Show error toast
   */
  error(message: string, title?: string): void {
    this.show('error', message, title);
  }

  /**
   * Show toast with custom severity
   */
  show(severity: ToastSeverity, message: string, title?: string): void {
    // TODO: Use PrimeNG MessageService when configured
    // For now, use console in development
    if (!environment.production) {
      console.log(`[${severity.toUpperCase()}] ${title || this.getDefaultTitle(severity)}: ${message}`);
    }
    
    // When PrimeNG is configured, uncomment:
    // this.messageService.add({
    //   severity,
    //   summary: title || this.getDefaultTitle(severity),
    //   detail: message,
    //   life: severity === 'error' ? 5000 : 3000
    // });
  }

  /**
   * Clear all toasts
   */
  clear(): void {
    // TODO: Use PrimeNG MessageService when configured
    // this.messageService.clear();
  }

  private getDefaultTitle(severity: ToastSeverity): string {
    const titles: Record<ToastSeverity, string> = {
      success: 'Sucesso',
      info: 'Informação',
      warn: 'Aviso',
      error: 'Erro'
    };
    return titles[severity];
  }
}

