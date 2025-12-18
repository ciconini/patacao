/**
 * Get Roles Use Case
 *
 * Application use case for retrieving all roles.
 * This use case orchestrates domain entities and repository ports to get roles.
 *
 * Responsibilities:
 * - Validate user authorization (Manager or Owner role required)
 * - Retrieve all roles via repository
 * - Return roles data
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Inject } from '@nestjs/common';
import { Role } from '../domain/role.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';
import { RoleRepository } from '../ports/role.repository.port';
import { CurrentUserRepository } from '../infrastructure/current-user.repository.adapter';

// Input model
export interface GetRolesInput {
  performedBy: string; // User ID
}

// Output model
export interface GetRolesOutput {
  roles: Array<{
    id: string;
    name: string;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
  }>;
}

// Result type
export interface GetRolesResult {
  success: boolean;
  data?: GetRolesOutput;
  error?: {
    code: string;
    message: string;
  };
}

// Application errors
export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message: string = 'Authentication required') {
    super('UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message: string = 'Access forbidden') {
    super('FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Get Roles Use Case
 */
export class GetRolesUseCase {
  constructor(
    @Inject('RoleRepository')
    private readonly roleRepository: RoleRepository,
    @Inject('CurrentUserRepository')
    private readonly currentUserRepository: CurrentUserRepository,
  ) {}

  /**
   * Executes the get roles use case
   *
   * @param input - Input data for getting roles
   * @returns Result containing roles or error
   */
  async execute(input: GetRolesInput): Promise<GetRolesResult> {
    try {
      // 1. Validate user exists and has Manager or Owner role
      const currentUser = await this.currentUserRepository.findById(input.performedBy);
      if (!currentUser) {
        throw new UnauthorizedError('User not found');
      }

      const hasManagerOrOwnerRole = currentUser.roleIds.some((roleId) => {
        try {
          const role = RoleId.fromString(roleId);
          return role ? role.isManager() || role.isOwner() : false;
        } catch {
          return false;
        }
      });

      if (!hasManagerOrOwnerRole) {
        throw new ForbiddenError('Only Manager or Owner role can view roles');
      }

      // 2. Retrieve all roles from repository
      const roles = await this.roleRepository.findAll();

      // 3. Return success result
      return {
        success: true,
        data: {
          roles: roles.map((role) => this.mapToOutput(role)),
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Maps Role domain entity to output model
   */
  private mapToOutput(role: Role): {
    id: string;
    name: string;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: role.id,
      name: role.name,
      permissions: [...role.permissions],
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): GetRolesResult {
    if (error instanceof ApplicationError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    };
  }
}

