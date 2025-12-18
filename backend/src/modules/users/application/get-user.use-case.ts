/**
 * Get User Use Case
 *
 * Application use case for retrieving a user by ID.
 * This use case orchestrates domain entities and repository ports to get a user.
 *
 * Responsibilities:
 * - Validate user authorization (Manager, Owner, or self)
 * - Retrieve user via repository
 * - Return user data
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Inject } from '@nestjs/common';
import { User } from '../domain/user.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';
import { UserRepository } from '../ports/user.repository.port';
import { CurrentUserRepository } from '../infrastructure/current-user.repository.adapter';

// Input model
export interface GetUserInput {
  id: string;
  performedBy: string; // User ID
}

// Output model
export interface GetUserOutput {
  id: string;
  email: string;
  fullName: string;
  phone?: string | undefined;
  username?: string | undefined;
  roles: string[];
  storeIds: string[];
  workingHours?: any;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Result type
export interface GetUserResult {
  success: boolean;
  user?: GetUserOutput;
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

export class NotFoundError extends ApplicationError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

/**
 * Get User Use Case
 */
export class GetUserUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    @Inject('CurrentUserRepository')
    private readonly currentUserRepository: CurrentUserRepository,
  ) {}

  /**
   * Executes the get user use case
   *
   * @param input - Input data for getting user
   * @returns Result containing user or error
   */
  async execute(input: GetUserInput): Promise<GetUserResult> {
    try {
      // 1. Validate current user exists
      const currentUser = await this.currentUserRepository.findById(input.performedBy);
      if (!currentUser) {
        throw new UnauthorizedError('User not found');
      }

      // 2. Check if user is accessing their own data
      const isSelf = currentUser.id === input.id;

      // 3. Check if user has Manager or Owner role
      const hasManagerOrOwnerRole = currentUser.roleIds.some((roleId) => {
        try {
          const role = RoleId.fromString(roleId);
          return role ? role.isManager() || role.isOwner() : false;
        } catch {
          return false;
        }
      });

      // 4. Check if user has Accountant role (can view users)
      const hasAccountantRole = currentUser.roleIds.some((roleId) => {
        try {
          const role = RoleId.fromString(roleId);
          return role ? role.value === 'Accountant' : false;
        } catch {
          return false;
        }
      });

      // 5. Authorization check: must be self, Manager, Owner, or Accountant
      if (!isSelf && !hasManagerOrOwnerRole && !hasAccountantRole) {
        throw new ForbiddenError('Insufficient permissions to view user');
      }

      // 6. Retrieve user from repository
      const user = await this.userRepository.findById(input.id);
      if (!user) {
        throw new NotFoundError(`User with ID ${input.id} not found`);
      }

      // 7. Return success result
      return {
        success: true,
        user: this.mapToOutput(user),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Maps User domain entity to output model
   */
  private mapToOutput(user: User): GetUserOutput {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      username: user.username,
      roles: [...user.roleIds],
      storeIds: [...user.storeIds],
      workingHours: user.workingHours,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): GetUserResult {
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

