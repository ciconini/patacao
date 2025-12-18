/**
 * Create Service Use Case (UC-SVC-001)
 *
 * Application use case for creating a new service in the service catalog.
 * This use case orchestrates domain entities to create services.
 *
 * Responsibilities:
 * - Validate user authorization (Manager or Owner role)
 * - Validate service data
 * - Validate consumed items if service consumes inventory
 * - Create Service domain entity
 * - Persist service via repository
 * - Create audit log entry
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Service, ConsumedItem } from '../domain/service.entity';
import { Product } from '../../inventory/domain/product.entity';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface ServiceRepository {
  save(service: Service): Promise<Service>;
}

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface CreateServiceInput {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  consumesInventory: boolean;
  consumedItems?: Array<{
    productId: string;
    quantity: number;
  }>;
  requiredResources?: string[];
  tags?: string[];
  performedBy: string; // User ID
}

// Output model
export interface CreateServiceOutput {
  id: string;
  name: string;
  description?: string;
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
export interface CreateServiceResult {
  success: boolean;
  service?: CreateServiceOutput;
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

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

/**
 * Create Service Use Case
 */
export class CreateServiceUseCase {
  private static readonly MAX_NAME_LENGTH = 255;
  private static readonly MAX_DESCRIPTION_LENGTH = 2000;
  private static readonly MAX_REQUIRED_RESOURCES = 50;
  private static readonly MAX_TAGS = 20;
  private static readonly MAX_TAG_LENGTH = 64;
  private static readonly MAX_RESOURCE_ID_LENGTH = 128;

  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly productRepository: ProductRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly auditLogDomainService: AuditLogDomainService,
    private readonly generateId: () => string = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  ) {}

  /**
   * Executes the create service use case
   *
   * @param input - Input data for creating service
   * @returns Result containing created service or error
   */
  async execute(input: CreateServiceInput): Promise<CreateServiceResult> {
    try {
      // 1. Validate user exists and has Manager or Owner role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate required fields
      this.validateRequiredFields(input);

      // 3. Validate service data
      this.validateServiceData(input);

      // 4. Validate consumed items if service consumes inventory
      const validatedConsumedItems = await this.validateConsumedItems(
        input.consumesInventory,
        input.consumedItems,
      );

      // 5. Create Service domain entity
      const service = this.createServiceEntity(input, validatedConsumedItems);

      // 6. Persist service via repository
      const savedService = await this.serviceRepository.save(service);

      // 7. Create audit log entry
      await this.createAuditLog(savedService, input.performedBy);

      // 8. Return success result
      return {
        success: true,
        service: this.mapToOutput(savedService),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization (must have Manager or Owner role)
   */
  private async validateUserAuthorization(userId: string): Promise<void> {
    const user = await this.currentUserRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const hasRequiredRole = user.roleIds.some((roleId) => {
      try {
        const role = RoleId.fromString(roleId);
        if (!role) return false;
        return role.isManager() || role.isOwner();
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError('Only Manager or Owner role can create services');
    }
  }

  /**
   * Validates required fields
   */
  private validateRequiredFields(input: CreateServiceInput): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError('Required field "name" is missing');
    }

    if (input.durationMinutes === undefined || input.durationMinutes === null) {
      throw new ValidationError('Required field "duration_minutes" is missing');
    }

    if (input.price === undefined || input.price === null) {
      throw new ValidationError('Required field "price" is missing');
    }

    if (input.consumesInventory === undefined || input.consumesInventory === null) {
      throw new ValidationError('Required field "consumes_inventory" is missing');
    }
  }

  /**
   * Validates service data
   */
  private validateServiceData(input: CreateServiceInput): void {
    // Validate name
    if (input.name.trim().length === 0) {
      throw new ValidationError('Service name cannot be empty');
    }

    if (input.name.length > CreateServiceUseCase.MAX_NAME_LENGTH) {
      throw new ValidationError(
        `Service name cannot exceed ${CreateServiceUseCase.MAX_NAME_LENGTH} characters`,
      );
    }

    // Validate description
    if (
      input.description &&
      input.description.length > CreateServiceUseCase.MAX_DESCRIPTION_LENGTH
    ) {
      throw new ValidationError(
        `Service description cannot exceed ${CreateServiceUseCase.MAX_DESCRIPTION_LENGTH} characters`,
      );
    }

    // Validate duration
    if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
      throw new ValidationError('Duration must be greater than 0');
    }

    // Validate price
    if (input.price < 0) {
      throw new ValidationError('Price must be >= 0');
    }

    // Validate required resources
    if (input.requiredResources) {
      if (input.requiredResources.length > CreateServiceUseCase.MAX_REQUIRED_RESOURCES) {
        throw new ValidationError(
          `Required resources cannot exceed ${CreateServiceUseCase.MAX_REQUIRED_RESOURCES} items`,
        );
      }

      for (const resourceId of input.requiredResources) {
        if (!resourceId || resourceId.trim().length === 0) {
          throw new ValidationError('Resource ID cannot be empty');
        }

        if (resourceId.length > CreateServiceUseCase.MAX_RESOURCE_ID_LENGTH) {
          throw new ValidationError(
            `Resource ID cannot exceed ${CreateServiceUseCase.MAX_RESOURCE_ID_LENGTH} characters`,
          );
        }
      }
    }

    // Validate tags
    if (input.tags) {
      if (input.tags.length > CreateServiceUseCase.MAX_TAGS) {
        throw new ValidationError(`Tags cannot exceed ${CreateServiceUseCase.MAX_TAGS} items`);
      }

      for (const tag of input.tags) {
        if (!tag || tag.trim().length === 0) {
          throw new ValidationError('Tag cannot be empty');
        }

        if (tag.length > CreateServiceUseCase.MAX_TAG_LENGTH) {
          throw new ValidationError(
            `Tag cannot exceed ${CreateServiceUseCase.MAX_TAG_LENGTH} characters`,
          );
        }
      }
    }
  }

  /**
   * Validates consumed items if service consumes inventory
   */
  private async validateConsumedItems(
    consumesInventory: boolean,
    consumedItems?: CreateServiceInput['consumedItems'],
  ): Promise<ConsumedItem[]> {
    if (!consumesInventory) {
      return [];
    }

    if (!consumedItems || consumedItems.length === 0) {
      throw new ValidationError('Consumed items are required when consumes_inventory is true');
    }

    const validatedItems: ConsumedItem[] = [];

    for (let i = 0; i < consumedItems.length; i++) {
      const item = consumedItems[i];
      const itemIndex = i + 1;

      // Validate product exists
      if (!item.productId || item.productId.trim().length === 0) {
        throw new ValidationError(`Consumed item ${itemIndex}: Product ID is required`);
      }

      const product = await this.productRepository.findById(item.productId);
      if (!product) {
        throw new NotFoundError(
          `Consumed item ${itemIndex}: Product with ID ${item.productId} not found`,
        );
      }

      // Validate quantity
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new ValidationError(`Consumed item ${itemIndex}: Quantity must be greater than 0`);
      }

      validatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
      });
    }

    // Check for duplicate product IDs
    const productIds = validatedItems.map((item) => item.productId);
    const uniqueProductIds = new Set(productIds);
    if (uniqueProductIds.size !== productIds.length) {
      throw new ValidationError('Consumed items cannot have duplicate product IDs');
    }

    return validatedItems;
  }

  /**
   * Creates Service domain entity
   */
  private createServiceEntity(input: CreateServiceInput, consumedItems: ConsumedItem[]): Service {
    const serviceId = this.generateId();
    const now = new Date();

    return new Service(
      serviceId,
      input.name.trim(),
      input.durationMinutes,
      input.price,
      input.description?.trim(),
      input.requiredResources || [],
      input.consumesInventory,
      consumedItems,
      input.tags || [],
      now,
      now,
    );
  }

  /**
   * Creates audit log entry for service creation
   */
  private async createAuditLog(service: Service, performedBy: string): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Service',
        service.id,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            id: service.id,
            name: service.name,
            durationMinutes: service.durationMinutes,
            price: service.price,
            consumesInventory: service.consumesInventory,
            consumedItemsCount: service.consumedItems.length,
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
   * Maps Service domain entity to output model
   */
  private mapToOutput(service: Service): CreateServiceOutput {
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      price: service.price,
      consumesInventory: service.consumesInventory,
      consumedItems: service.consumedItems.map((item) => ({ ...item })),
      requiredResources: [...service.requiredResources],
      tags: [...service.tags],
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): CreateServiceResult {
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
