/**
 * Dashboard Component
 * 
 * Main dashboard page with welcome message and quick stats
 */

import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../users/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;
  readonly welcomeMessage = computed(() => {
    const user = this.currentUser();
    if (user) {
      return `Bem-vindo, ${user.fullName}!`;
    }
    return 'Bem-vindo!';
  });
}

