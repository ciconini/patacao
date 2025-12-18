/**
 * Update Service Use Case
 *
 * Application use case for updating an existing service's information.
 * This use case orchestrates domain entities and domain services to update a service.
 *
 * Responsibilities:
 * - Validate user authorization (Manager or Owner role required)
 * - Validate service exists
 * - Validate input data and business rules
 * - Update Service domain entity
 * - Persist updated service via repository
 * - Create audit log entry with before/after values
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Inject } from '@nestjs/common';
import { Service, ConsumedItem } from '../domain/service.entity';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';
import { ServiceRepository } from '../ports/service.repository.port';

// Repository interfaces (ports)
export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

// Input model
export interface UpdateServiceInput {
  id: string;
  name?: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  consumesInventory?: boolean;
  consumedItems?: Array<{
    productId: string;
    quantity: number;
  }>;
  requiredResources?: string[];
  tags?: string[];
  performedBy: string; // User ID
}

// Output model
export interface UpdateServiceOutput {
  id: string;
  name: string;
  description?: string | undefined;
  durationMinutes: number;
  price: number;
  consumesInventory: boolean;
  consumedItems: ConsumedItem[];
  requiredResources: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Result type
export interface UpdateServiceResult {
  success: boolean;
  service?: UpdateServiceOutput;
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

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
    this.name = 'ValidationError';
  }
}

/**
 * Update Service Use Case
 */
export class UpdateServiceUseCase {
  constructor(
    @Inject('ServiceRepository')
    private readonly serviceRepository: ServiceRepository,
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    @Inject('AuditLogRepository')
    private readonly auditLogRepository: AuditLogRepository,
    private readonly auditLogDomainService: AuditLogDomainService,
  ) {}

  /**
   * Executes the update service use case
   *
   * @param input - Input data for updating service
   * @returns Result containing updated service or error
   */
  async execute(input: UpdateServiceInput): Promise<UpdateServiceResult> {
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
        throw new ForbiddenError('Only Manager or Owner role can update services');
      }

      // 3. Retrieve existing service
      const existingService = await this.serviceRepository.findById(input.id);
      if (!existingService) {
        throw new NotFoundError(`Service with ID ${input.id} not found`);
      }

      // 4. Store before state for audit log
      const beforeState = {
        id: existingService.id,
        name: existingService.name,
        description: existingService.description,
        durationMinutes: existingService.durationMinutes,
        price: existingService.price,
        consumesInventory: existingService.consumesInventory,
      };

      // 5. Apply updates
      this.applyUpdates(existingService, input);

      // 6. Persist updated service
      const updatedService = await this.serviceRepository.update(existingService);

      // 7. Create audit log entry
      await this.createAuditLog(beforeState, updatedService, input.performedBy);

      // 8. Return success result
      return {
        success: true,
        service: this.mapToOutput(updatedService),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Applies updates to the service entity
   */
  private applyUpdates(service: Service, input: UpdateServiceInput): void {
    if (input.name !== undefined) {
      service.updateName(input.name);
    }

    if (input.description !== undefined) {
      service.updateDescription(input.description);
    }

    if (input.durationMinutes !== undefined) {
      service.updateDuration(input.durationMinutes);
    }

    if (input.price !== undefined) {
      service.updatePrice(input.price);
    }

    if (input.requiredResources !== undefined) {
      service.setRequiredResources(input.requiredResources);
    }

    if (input.tags !== undefined) {
      service.setTags(input.tags);
    }

    // Handle consumed items and inventory consumption
    if (input.consumesInventory !== undefined || input.consumedItems !== undefined) {
      if (input.consumesInventory === false) {
        // Disable inventory consumption
        service.disableInventoryConsumption();
      } else if (input.consumedItems && input.consumedItems.length > 0) {
        // Replace all consumed items
        // First, remove all existing items
        const existingItems = [...service.consumedItems];
        for (const item of existingItems) {
          service.removeConsumedItem(item.productId);
        }

        // Then add new items
        for (const item of input.consumedItems) {
          service.addConsumedItem(item.productId, item.quantity);
        }
      } else if (input.consumesInventory === true && (!input.consumedItems || input.consumedItems.length === 0)) {
        // If enabling but no items provided, keep existing items or throw error
        if (service.consumedItems.length === 0) {
          throw new ValidationError(
            'Service that consumes inventory must have at least one consumed item',
          );
        }
      }
    }
  }

  /**
   * Creates audit log entry for service update
   */
  private async createAuditLog(
    beforeState: any,
    service: Service,
    performedBy: string,
  ): Promise<void> {
    try {
      const auditLogId = this.generateId();
      const result = this.auditLogDomainService.createAuditEntry(
        auditLogId,
        'Service',
        service.id,
        AuditAction.UPDATE,
        performedBy,
        {
          before: beforeState,
          after: {
            id: service.id,
            name: service.name,
            description: service.description,
            durationMinutes: service.durationMinutes,
            price: service.price,
            consumesInventory: service.consumesInventory,
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
   * Maps Service domain entity to output model
   */
  private mapToOutput(service: Service): UpdateServiceOutput {
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      price: service.price,
      consumesInventory: service.consumesInventory,
      consumedItems: [...service.consumedItems],
      requiredResources: [...service.requiredResources],
      tags: [...service.tags],
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): UpdateServiceResult {
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

