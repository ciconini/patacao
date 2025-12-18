/**
 * Delete User Use Case
 *
 * Application use case for deleting (deactivating) a user account.
 * This use case orchestrates domain entities and domain services to delete a user.
 *
 * Responsibilities:
 * - Validate user authorization (Owner only, with restrictions)
 * - Validate that user can be deleted (not deleting Owners)
 * - Deactivate user account (soft delete)
 * - Create audit log entry
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
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { UserRepository } from '../ports/user.repository.port';
import { CurrentUserRepository } from '../infrastructure/current-user.repository.adapter';

// Repository interfaces (ports)
export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

// Input model
export interface DeleteUserInput {
  id: string;
  performedBy: string; // User ID
}

// Result type
export interface DeleteUserResult {
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
 * Delete User Use Case
 */
export class DeleteUserUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    @Inject('AuditLogRepository')
    private readonly auditLogRepository: AuditLogRepository,
    @Inject('CurrentUserRepository')
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly auditLogDomainService: AuditLogDomainService,
  ) {}

  /**
   * Executes the delete user use case
   *
   * @param input - Input data for deleting user
   * @returns Result indicating success or error
   */
  async execute(input: DeleteUserInput): Promise<DeleteUserResult> {
    try {
      // 1. Validate user exists and has Owner role
      const currentUser = await this.currentUserRepository.findById(input.performedBy);
      if (!currentUser) {
        throw new UnauthorizedError('User not found');
      }

      const isCurrentUserOwner = currentUser.roleIds.some((roleId) => {
        try {
          const role = RoleId.fromString(roleId);
          return role ? role.isOwner() : false;
        } catch {
          return false;
        }
      });

      if (!isCurrentUserOwner) {
        throw new ForbiddenError('Only Owner can delete users');
      }

      // 2. Retrieve existing user
      const existingUser = await this.userRepository.findById(input.id);
      if (!existingUser) {
        throw new NotFoundError(`User with ID ${input.id} not found`);
      }

      // 3. Check if user is an Owner (cannot delete Owners)
      const isTargetUserOwner = existingUser.roleIds.some((roleId) => {
        try {
          const role = RoleId.fromString(roleId);
          return role ? role.isOwner() : false;
        } catch {
          return false;
        }
      });

      if (isTargetUserOwner) {
        throw new ForbiddenError('Cannot delete Owner users');
      }

      // 4. Deactivate user (soft delete)
      existingUser.deactivate();
      await this.userRepository.save(existingUser);

      // 5. Create audit log entry
      await this.createAuditLog(existingUser, input.performedBy);

      // 6. Return success result
      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Creates audit log entry for user deletion
   */
  private async createAuditLog(user: User, performedBy: string): Promise<void> {
    try {
      const auditLogId = this.generateId();
      const result = this.auditLogDomainService.createAuditEntry(
        auditLogId,
        'User',
        user.id,
        AuditAction.DELETE,
        performedBy,
        {
          before: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            active: true,
          },
          after: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            active: false,
          },
        },
        new Date(),
      );

      if (result.auditLog) {
        await this.auditLogRepository.save(result.auditLog);
      }
    } catch (error: any) {
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Generates a UUID
   */
  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): DeleteUserResult {
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

