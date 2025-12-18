/**
 * Delete Customer Use Case
 *
 * Application use case for deleting a customer (hard delete).
 * This use case orchestrates domain entities and domain services to delete a customer.
 *
 * Responsibilities:
 * - Validate user authorization (Owner or Manager role required)
 * - Validate customer exists
 * - Delete customer via repository (hard delete)
 * - Create audit log entry
 *
 * Note: This is a hard delete. For soft delete, use ArchiveCustomerUseCase instead.
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Inject } from '@nestjs/common';
import { Customer } from '../domain/customer.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { CustomerRepository } from '../ports/customer.repository.port';

// Repository interfaces (ports)
export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

// Input model
export interface DeleteCustomerInput {
  id: string;
  performedBy: string; // User ID
}

// Result type
export interface DeleteCustomerResult {
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
 * Delete Customer Use Case
 */
export class DeleteCustomerUseCase {
  constructor(
    @Inject('CustomerRepository')
    private readonly customerRepository: CustomerRepository,
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    @Inject('AuditLogRepository')
    private readonly auditLogRepository: AuditLogRepository,
    private readonly auditLogDomainService: AuditLogDomainService,
  ) {}

  /**
   * Executes the delete customer use case
   *
   * @param input - Input data for deleting customer
   * @returns Result indicating success or error
   */
  async execute(input: DeleteCustomerInput): Promise<DeleteCustomerResult> {
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
        throw new ForbiddenError('Only Manager or Owner role can delete customers');
      }

      // 3. Retrieve existing customer
      const existingCustomer = await this.customerRepository.findById(input.id);
      if (!existingCustomer) {
        throw new NotFoundError(`Customer with ID ${input.id} not found`);
      }

      // 4. Delete customer (hard delete)
      await this.customerRepository.delete(input.id);

      // 5. Create audit log entry
      await this.createAuditLog(existingCustomer, input.performedBy);

      // 6. Return success result
      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Creates audit log entry for customer deletion
   */
  private async createAuditLog(customer: Customer, performedBy: string): Promise<void> {
    try {
      const auditLogId = this.generateId();
      const result = this.auditLogDomainService.createAuditEntry(
        auditLogId,
        'Customer',
        customer.id,
        AuditAction.DELETE,
        performedBy,
        {
          before: {
            id: customer.id,
            fullName: customer.fullName,
            email: customer.email,
            phone: customer.phone,
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
  private handleError(error: unknown): DeleteCustomerResult {
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

