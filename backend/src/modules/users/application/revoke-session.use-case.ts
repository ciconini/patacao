/**
 * Revoke Session Use Case
 *
 * Application use case for revoking a user session.
 * This use case orchestrates domain entities and repository ports to revoke a session.
 *
 * Responsibilities:
 * - Validate user authorization (Manager or Owner role required)
 * - Retrieve session via repository
 * - Revoke session
 * - Persist changes
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Inject } from '@nestjs/common';
import { Session } from '../domain/session.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';
import { SessionRepository } from '../ports/session.repository.port';
import { CurrentUserRepository } from '../infrastructure/current-user.repository.adapter';

// Input model
export interface RevokeSessionInput {
  sessionId: string;
  performedBy: string; // User ID
}

// Result type
export interface RevokeSessionResult {
  success: boolean;
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
 * Revoke Session Use Case
 */
export class RevokeSessionUseCase {
  constructor(
    @Inject('SessionRepository')
    private readonly sessionRepository: SessionRepository,
    @Inject('CurrentUserRepository')
    private readonly currentUserRepository: CurrentUserRepository,
  ) {}

  /**
   * Executes the revoke session use case
   *
   * @param input - Input data for revoking session
   * @returns Result indicating success or error
   */
  async execute(input: RevokeSessionInput): Promise<RevokeSessionResult> {
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
        throw new ForbiddenError('Only Manager or Owner role can revoke sessions');
      }

      // 2. Retrieve session from repository
      const session = await this.sessionRepository.findById(input.sessionId);
      if (!session) {
        throw new NotFoundError(`Session with ID ${input.sessionId} not found`);
      }

      // 3. Revoke session via repository
      await this.sessionRepository.revoke(input.sessionId);

      // 4. Return success result
      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): RevokeSessionResult {
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

