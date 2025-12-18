/**
 * Delete Store Use Case
 *
 * Application use case for deleting a store.
 * This use case orchestrates domain entities and domain services to delete a store.
 *
 * Responsibilities:
 * - Validate user authorization (Owner or Manager role required)
 * - Validate store exists and user has access to its company
 * - Delete store via repository
 * - Create audit log entry
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Inject } from '@nestjs/common';
import { Store } from '../domain/store.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { StoreRepository } from '../ports/store.repository.port';

// Repository interfaces (ports)
export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
  hasCompanyAccess?(userId: string, companyId: string): Promise<boolean>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

// Input model
export interface DeleteStoreInput {
  id: string;
  performedBy: string; // User ID
}

// Result type
export interface DeleteStoreResult {
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
 * Delete Store Use Case
 */
export class DeleteStoreUseCase {
  constructor(
    @Inject('StoreRepository')
    private readonly storeRepository: StoreRepository,
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    @Inject('AuditLogRepository')
    private readonly auditLogRepository: AuditLogRepository,
    private readonly auditLogDomainService: AuditLogDomainService,
  ) {}

  /**
   * Executes the delete store use case
   *
   * @param input - Input data for deleting store
   * @returns Result indicating success or error
   */
  async execute(input: DeleteStoreInput): Promise<DeleteStoreResult> {
    try {
      // 1. Validate current user exists
      const currentUser = await this.userRepository.findById(input.performedBy);
      if (!currentUser) {
        throw new UnauthorizedError('User not found');
      }

      // 2. Check if user has Manager or Owner role
      const hasManagerOrOwnerRole = currentUser.roleIds.some((roleId) => {
        try {
          const role = RoleId.fromString(roleId);
          return role ? role.isManager() || role.isOwner() : false;
        } catch {
          return false;
        }
      });

      if (!hasManagerOrOwnerRole) {
        throw new ForbiddenError('Only Manager or Owner role can delete stores');
      }

      // 3. Retrieve existing store
      const existingStore = await this.storeRepository.findById(input.id);
      if (!existingStore) {
        throw new NotFoundError(`Store with ID ${input.id} not found`);
      }

      // 4. Check if user has access to the store's company
      if (this.userRepository.hasCompanyAccess) {
        const hasAccess = await this.userRepository.hasCompanyAccess(
          input.performedBy,
          existingStore.companyId,
        );
        if (!hasAccess) {
          throw new ForbiddenError('User does not have access to this store');
        }
      }

      // 5. Delete store
      await this.storeRepository.delete(input.id);

      // 6. Create audit log entry
      await this.createAuditLog(existingStore, input.performedBy);

      // 7. Return success result
      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Creates audit log entry for store deletion
   */
  private async createAuditLog(store: Store, performedBy: string): Promise<void> {
    try {
      const auditLogId = this.generateId();
      const result = this.auditLogDomainService.createAuditEntry(
        auditLogId,
        'Store',
        store.id,
        AuditAction.DELETE,
        performedBy,
        {
          before: {
            id: store.id,
            companyId: store.companyId,
            name: store.name,
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
  private handleError(error: unknown): DeleteStoreResult {
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

