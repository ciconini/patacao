/**
 * Roles Guard
 *
 * NestJS guard that checks if a user has the required roles to access a route.
 * This guard should be used in combination with FirebaseAuthGuard.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService, Role } from './permission.service';
import { AuthenticatedRequest } from './firebase-auth.guard';

export const ROLES_KEY = 'roles';
export const RequireRoles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      // No roles required, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract roles from Firebase token custom claims
    // Firebase custom claims are stored as an object: { Owner: true, Manager: true }
    let userRoles: Role[] = [];

    if (user.roles) {
      if (typeof user.roles === 'object' && !Array.isArray(user.roles)) {
        // Extract role keys where value is true
        userRoles = Object.keys(user.roles).filter((key) => user.roles[key] === true) as Role[];
      } else if (Array.isArray(user.roles)) {
        userRoles = user.roles as Role[];
      }
    }

    const userPermissions = {
      userId: user.uid,
      roles: userRoles,
    };

    const hasRequiredRole = this.permissionService.hasAnyRole(userPermissions, requiredRoles);

    if (!hasRequiredRole) {
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
