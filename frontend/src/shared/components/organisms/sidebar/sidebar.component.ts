/**
 * Sidebar Component (Organism)
 * 
 * Main navigation sidebar with role-based menu items
 */

import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../modules/users/services/auth.service';

interface MenuItem {
  label: string;
  icon: string;
  route?: string; // Optional if it's a parent with children
  children?: MenuItem[]; // Submenu items
  roles?: string[]; // If specified, only show for these roles
  requiresStore?: boolean; // If true, only show if user has store access
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  isCollapsed = signal(false);
  expandedMenus = signal<Set<string>>(new Set());

  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = this.authService.isAuthenticated;

  // Menu items based on role
  readonly menuItems = computed<MenuItem[]>(() => {
    const user = this.currentUser();
    if (!user) return [];

    const items: MenuItem[] = [
      {
        label: 'Dashboard',
        icon: 'fas fa-home',
        route: '/dashboard'
      }
    ];

    // Services module - Staff, Manager, Veterinarian, Owner
    if (this.hasAnyRole(['Staff', 'Manager', 'Veterinarian', 'Owner'])) {
      items.push({
        label: 'Agendamentos',
        icon: 'fas fa-calendar',
        route: '/appointments',
        requiresStore: true
      });
    }

    // Financial module - Staff, Manager, Accountant, Owner
    if (this.hasAnyRole(['Staff', 'Manager', 'Accountant', 'Owner'])) {
      items.push({
        label: 'Financeiro',
        icon: 'fas fa-euro-sign',
        route: '/financial',
        requiresStore: true
      });
    }

    // Inventory module - Staff, Manager, Owner
    if (this.hasAnyRole(['Staff', 'Manager', 'Owner'])) {
      items.push({
        label: 'Inventário',
        icon: 'fas fa-boxes',
        route: '/inventory',
        requiresStore: true
      });
    }

    // Administrative module - Manager, Owner
    if (this.hasAnyRole(['Manager', 'Owner'])) {
      items.push({
        label: 'Administração',
        icon: 'fas fa-cog',
        route: '/admin',
        roles: ['Manager', 'Owner'],
        children: [
          {
            label: 'Clientes',
            icon: 'fas fa-users',
            route: '/admin/customers',
            roles: ['Manager', 'Owner']
          },
          {
            label: 'Pets',
            icon: 'fas fa-paw',
            route: '/admin/pets',
            roles: ['Manager', 'Owner']
          },
          {
            label: 'Empresa',
            icon: 'fas fa-building',
            route: '/admin/company',
            roles: ['Manager', 'Owner']
          },
          {
            label: 'Lojas',
            icon: 'fas fa-store',
            route: '/admin/stores',
            roles: ['Manager', 'Owner']
          }
        ]
      });
    }

    return items.filter(item => {
      // Filter by role if specified
      if (item.roles && !this.hasAnyRole(item.roles)) {
        return false;
      }
      // Filter by store access if required
      if (item.requiresStore && !this.hasStoreAccess()) {
        return false;
      }
      return true;
    });
  });

  toggleCollapse(): void {
    this.isCollapsed.update(v => !v);
  }

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  hasActiveChild(item: MenuItem): boolean {
    if (!item.children) return false;
    return item.children.some(child => child.route && this.isActive(child.route));
  }

  isMenuExpanded(item: MenuItem): boolean {
    if (!item.children) return false;
    // Auto-expand if any child is active
    if (this.hasActiveChild(item)) {
      return true;
    }
    return this.expandedMenus().has(item.label);
  }

  toggleMenu(item: MenuItem): void {
    if (!item.children) return;
    const current = this.expandedMenus();
    const updated = new Set(current);
    if (updated.has(item.label)) {
      updated.delete(item.label);
    } else {
      updated.add(item.label);
    }
    this.expandedMenus.set(updated);
  }

  private hasAnyRole(roles: string[]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return roles.some(role => user.roleIds.includes(role));
  }

  private hasStoreAccess(): boolean {
    const user = this.currentUser();
    if (!user) return false;
    // Owner and Manager have access to all stores
    if (this.hasAnyRole(['Owner', 'Manager'])) {
      return true;
    }
    return user.storeIds.length > 0;
  }
}

