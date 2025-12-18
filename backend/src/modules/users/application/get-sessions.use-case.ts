/**
 * Get Sessions Use Case
 *
 * Application use case for retrieving user sessions.
 * This use case orchestrates domain entities and repository ports to get sessions.
 *
 * Responsibilities:
 * - Validate user authorization (Manager or Owner role required)
 * - Retrieve sessions via repository
 * - Return sessions data
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
export interface GetSessionsInput {
  userId?: string; // Optional: filter by user ID
  performedBy: string; // User ID performing the action
}

// Output model
export interface GetSessionsOutput {
  sessions: Array<{
    id: string;
    userId: string;
    createdAt: Date;
    expiresAt?: Date;
    revoked: boolean;
    revokedAt?: Date;
  }>;
}

// Result type
export interface GetSessionsResult {
  success: boolean;
  data?: GetSessionsOutput;
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
 * Get Sessions Use Case
 */
export class GetSessionsUseCase {
  constructor(
    @Inject('SessionRepository')
    private readonly sessionRepository: SessionRepository,
    @Inject('CurrentUserRepository')
    private readonly currentUserRepository: CurrentUserRepository,
  ) {}

  /**
   * Executes the get sessions use case
   *
   * @param input - Input data for getting sessions
   * @returns Result containing sessions or error
   */
  async execute(input: GetSessionsInput): Promise<GetSessionsResult> {
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
        throw new ForbiddenError('Only Manager or Owner role can view sessions');
      }

      // 2. Retrieve sessions from repository
      let sessions: Session[];
      if (input.userId) {
        sessions = await this.sessionRepository.findByUserId(input.userId);
      } else {
        // If no userId specified, get all sessions (would need a findAll method)
        // For now, we'll require userId to be specified
        throw new ApplicationError('VALIDATION_ERROR', 'userId parameter is required');
      }

      // 3. Return success result
      return {
        success: true,
        data: {
          sessions: sessions.map((session) => this.mapToOutput(session)),
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Maps Session domain entity to output model
   */
  private mapToOutput(session: Session): {
    id: string;
    userId: string;
    createdAt: Date;
    expiresAt?: Date;
    revoked: boolean;
    revokedAt?: Date;
  } {
    return {
      id: session.id,
      userId: session.userId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      revoked: session.revoked,
      revokedAt: session.revokedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): GetSessionsResult {
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

