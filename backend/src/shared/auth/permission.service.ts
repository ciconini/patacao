/**
 * Permission Service
 * 
 * Centralized service for checking user permissions and roles.
 * This service provides role-based access control (RBAC) functionality.
 */

import { Injectable } from '@nestjs/common';

export type Role = 'Owner' | 'Manager' | 'Staff' | 'Accountant' | 'Veterinarian';

export interface UserPermissions {
  userId: string;
  roles: Role[];
  storeIds?: string[];
}

@Injectable()
export class PermissionService {
  /**
   * Role hierarchy (higher roles inherit permissions from lower roles)
   */
  private readonly roleHierarchy: Record<Role, Role[]> = {
    Owner: ['Owner', 'Manager', 'Staff', 'Accountant', 'Veterinarian'],
    Manager: ['Manager', 'Staff'],
    Staff: ['Staff'],
    Accountant: ['Accountant'],
    Veterinarian: ['Veterinarian'],
  };

  /**
   * Checks if a user has a specific role
   * 
   * @param userPermissions - User permissions
   * @param requiredRole - Required role
   * @returns True if user has the role or a higher role
   */
  hasRole(userPermissions: UserPermissions, requiredRole: Role): boolean {
    const userRoles = userPermissions.roles || [];
    
    for (const userRole of userRoles) {
      const inheritedRoles = this.roleHierarchy[userRole] || [];
      if (inheritedRoles.includes(requiredRole)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Checks if a user has any of the required roles
   * 
   * @param userPermissions - User permissions
   * @param requiredRoles - Array of required roles (OR condition)
   * @returns True if user has at least one of the required roles
   */
  hasAnyRole(userPermissions: UserPermissions, requiredRoles: Role[]): boolean {
    return requiredRoles.some(role => this.hasRole(userPermissions, role));
  }

  /**
   * Checks if a user has all of the required roles
   * 
   * @param userPermissions - User permissions
   * @param requiredRoles - Array of required roles (AND condition)
   * @returns True if user has all of the required roles
   */
  hasAllRoles(userPermissions: UserPermissions, requiredRoles: Role[]): boolean {
    return requiredRoles.every(role => this.hasRole(userPermissions, role));
  }

  /**
   * Checks if a user is the owner or manager
   * 
   * @param userPermissions - User permissions
   * @returns True if user is Owner or Manager
   */
  isOwnerOrManager(userPermissions: UserPermissions): boolean {
    return this.hasAnyRole(userPermissions, ['Owner', 'Manager']);
  }

  /**
   * Checks if a user is the owner
   * 
   * @param userPermissions - User permissions
   * @returns True if user is Owner
   */
  isOwner(userPermissions: UserPermissions): boolean {
    return this.hasRole(userPermissions, 'Owner');
  }

  /**
   * Checks if a user can access a specific store
   * 
   * @param userPermissions - User permissions
   * @param storeId - Store ID to check
   * @returns True if user has access to the store (Owner/Manager have access to all stores)
   */
  canAccessStore(userPermissions: UserPermissions, storeId: string): boolean {
    // Owners and Managers have access to all stores
    if (this.isOwnerOrManager(userPermissions)) {
      return true;
    }

    // Other roles need explicit store assignment
    const userStoreIds = userPermissions.storeIds || [];
    return userStoreIds.includes(storeId);
  }

  /**
   * Checks if a user can access their own resource
   * 
   * @param userPermissions - User permissions
   * @param resourceUserId - User ID of the resource owner
   * @returns True if user is accessing their own resource or is Owner/Manager
   */
  canAccessOwnResource(userPermissions: UserPermissions, resourceUserId: string): boolean {
    // Users can always access their own resources
    if (userPermissions.userId === resourceUserId) {
      return true;
    }

    // Owners and Managers can access any resource
    return this.isOwnerOrManager(userPermissions);
  }
}

