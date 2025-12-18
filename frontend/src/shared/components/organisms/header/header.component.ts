/**
 * Header Component (Organism)
 * 
 * Application header with user menu and notifications
 */

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../modules/users/services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  showUserMenu = signal(false);

  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = this.authService.isAuthenticated;

  toggleUserMenu(): void {
    this.showUserMenu.update(v => !v);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.toastService.success('Logout realizado com sucesso');
      },
      error: () => {
        // Error already handled in AuthService
      }
    });
  }

  goToProfile(): void {
    const user = this.currentUser();
    if (user) {
      this.router.navigate(['/users', user.id]);
      this.showUserMenu.set(false);
    }
  }
}

