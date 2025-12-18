/**
 * Stock Adjustment Use Case (UC-INV-002)
 *
 * Application use case for recording manual stock adjustments.
 * This use case orchestrates domain entities to create stock movements for adjustments.
 *
 * Responsibilities:
 * - Validate user authorization (Manager or Owner role, Staff only if explicitly permitted)
 * - Validate store/location access
 * - Validate product exists and is stock-tracked
 * - Validate adjustment quantity and reason
 * - Create stock movement with reason ADJUSTMENT
 * - Update product on-hand quantity
 * - Persist changes via repositories
 * - Create audit log entry
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { StockMovement, StockMovementReason } from '../domain/stock-movement.entity';
import { Product } from '../domain/product.entity';
import { Store } from '../../administrative/domain/store.entity';
import { StockMovementDomainService } from '../domain/stock-movement.domain-service';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface StoreRepository {
  findById(id: string): Promise<Store | null>;
}

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  updateOnHand(productId: string, delta: number): Promise<void>;
  getOnHand(productId: string, locationId: string): Promise<number>;
}

export interface StockMovementRepository {
  save(movement: StockMovement): Promise<StockMovement>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
  hasStoreAccess(userId: string, storeId: string): Promise<boolean>;
}

// Input model
export interface StockAdjustmentInput {
  storeId: string;
  locationId?: string; // Optional inventory location, defaults to store
  productId: string;
  quantityChange: number; // Positive for increment, negative for decrement
  reason: string; // Required reason for adjustment
  referenceId?: string; // Optional reference (e.g., recount session)
  performedBy: string; // User ID
}

// Output model
export interface StockAdjustmentOutput {
  stockMovementId: string;
  productId: string;
  quantityChange: number;
  reason: string;
  performedBy: string;
  locationId: string;
  referenceId?: string;
  createdAt: Date;
}

// Result type
export interface StockAdjustmentResult {
  success: boolean;
  adjustment?: StockAdjustmentOutput;
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
 * Stock Adjustment Use Case
 */
export class StockAdjustmentUseCase {
  private static readonly MAX_REASON_LENGTH = 255;
  private static readonly ALLOW_STAFF_ADJUSTMENTS = false; // Business rule: Staff blocked by default

  constructor(
    private readonly storeRepository: StoreRepository,
    private readonly productRepository: ProductRepository,
    private readonly stockMovementRepository: StockMovementRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly stockMovementDomainService: StockMovementDomainService,
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
   * Executes the stock adjustment use case
   *
   * @param input - Input data for stock adjustment
   * @returns Result containing adjustment details or error
   */
  async execute(input: StockAdjustmentInput): Promise<StockAdjustmentResult> {
    try {
      // 1. Validate user exists and has required role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate required fields
      this.validateRequiredFields(input);

      // 3. Validate and load store
      const store = await this.validateAndLoadStore(input.storeId);

      // 4. Validate user has store access
      const hasAccess = await this.currentUserRepository.hasStoreAccess(
        input.performedBy,
        input.storeId,
      );
      if (!hasAccess) {
        throw new ForbiddenError('You do not have access to this store');
      }

      // 5. Validate and load product
      const product = await this.validateAndLoadProduct(input.productId);

      // 6. Validate product is stock-tracked
      if (!product.stockTracked) {
        throw new ValidationError(
          `Product ${product.name} (${product.sku}) is not stock-tracked. Adjustments can only be made for stock-tracked products.`,
        );
      }

      // 7. Validate negative adjustment won't result in negative stock
      const locationId = input.locationId || input.storeId;
      if (input.quantityChange < 0) {
        const currentStock = await this.productRepository.getOnHand(input.productId, locationId);
        const absoluteChange = Math.abs(input.quantityChange);
        if (absoluteChange > currentStock) {
          throw new ValidationError(
            `Adjustment would result in negative stock. Current stock: ${currentStock}, Adjustment: ${input.quantityChange}`,
          );
        }
      }

      // 8. Create stock movement
      const movement = this.createStockMovement(
        input.productId,
        input.quantityChange,
        locationId,
        input.reason,
        input.referenceId,
        input.performedBy,
      );

      // 9. Validate movement using domain service
      const validationResult = this.stockMovementDomainService.validateMovementLegality(
        movement,
        product,
      );

      if (!validationResult.isValid) {
        throw new ValidationError(`Invalid stock movement: ${validationResult.errors.join(', ')}`);
      }

      // 10. Persist stock movement
      const savedMovement = await this.stockMovementRepository.save(movement);

      // 11. Update product on-hand quantity
      await this.productRepository.updateOnHand(input.productId, input.quantityChange);

      // 12. Create audit log entry
      await this.createAuditLog(savedMovement, input.performedBy);

      // 13. Return success result
      return {
        success: true,
        adjustment: this.mapToOutput(savedMovement, locationId),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization (Manager or Owner role, Staff only if explicitly permitted)
   */
  private async validateUserAuthorization(userId: string): Promise<void> {
    const user = await this.currentUserRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Check if user has Manager or Owner role
    const hasManagerOrOwnerRole = user.roleIds.some((roleId) => {
      try {
        const role = RoleId.fromString(roleId);
        if (!role) return false;
        return role.isManager() || role.isOwner();
      } catch {
        return false;
      }
    });

    // Check if user has Staff role
    const hasStaffRole = user.roleIds.some((roleId) => {
      try {
        const role = RoleId.fromString(roleId);
        if (!role) return false;
        return role.isStaff();
      } catch {
        return false;
      }
    });

    // Staff can only adjust if explicitly permitted
    if (hasStaffRole && !hasManagerOrOwnerRole) {
      if (!StockAdjustmentUseCase.ALLOW_STAFF_ADJUSTMENTS) {
        throw new ForbiddenError(
          'You do not have permission to adjust stock. Only Manager or Owner role can adjust stock.',
        );
      }
    }

    // If user has neither Manager/Owner nor Staff role, deny access
    if (!hasManagerOrOwnerRole && !hasStaffRole) {
      throw new ForbiddenError(
        'You do not have permission to adjust stock. Only Manager or Owner role can adjust stock.',
      );
    }
  }

  /**
   * Validates required fields
   */
  private validateRequiredFields(input: StockAdjustmentInput): void {
    if (!input.storeId || input.storeId.trim().length === 0) {
      throw new ValidationError('Store ID is required');
    }

    if (!input.productId || input.productId.trim().length === 0) {
      throw new ValidationError('Product ID is required');
    }

    if (!Number.isInteger(input.quantityChange) || input.quantityChange === 0) {
      throw new ValidationError('Quantity change cannot be zero and must be an integer');
    }

    if (!input.reason || input.reason.trim().length === 0) {
      throw new ValidationError('Reason is required for stock adjustment');
    }

    if (input.reason.length > StockAdjustmentUseCase.MAX_REASON_LENGTH) {
      throw new ValidationError(
        `Reason cannot exceed ${StockAdjustmentUseCase.MAX_REASON_LENGTH} characters`,
      );
    }
  }

  /**
   * Validates and loads store
   */
  private async validateAndLoadStore(storeId: string): Promise<Store> {
    const store = await this.storeRepository.findById(storeId);

    if (!store) {
      throw new NotFoundError('Store not found');
    }

    return store;
  }

  /**
   * Validates and loads product
   */
  private async validateAndLoadProduct(productId: string): Promise<Product> {
    const product = await this.productRepository.findById(productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return product;
  }

  /**
   * Creates stock movement for adjustment
   */
  private createStockMovement(
    productId: string,
    quantityChange: number,
    locationId: string,
    reason: string,
    referenceId: string | undefined,
    performedBy: string,
  ): StockMovement {
    const movementId = this.generateId();
    const now = new Date();

    return new StockMovement(
      movementId,
      productId,
      quantityChange, // Can be positive or negative
      StockMovementReason.ADJUSTMENT,
      performedBy,
      locationId,
      undefined, // batchId - adjustments typically not batch-specific
      referenceId,
      now,
    );
  }

  /**
   * Creates audit log entry for stock adjustment
   */
  private async createAuditLog(movement: StockMovement, performedBy: string): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'StockMovement',
        movement.id,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            id: movement.id,
            productId: movement.productId,
            quantityChange: movement.quantityChange,
            reason: movement.reason,
            locationId: movement.locationId,
            referenceId: movement.referenceId,
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
   * Maps to output model
   */
  private mapToOutput(movement: StockMovement, locationId: string): StockAdjustmentOutput {
    return {
      stockMovementId: movement.id,
      productId: movement.productId,
      quantityChange: movement.quantityChange,
      reason: StockMovementReason.ADJUSTMENT,
      performedBy: movement.performedBy,
      locationId,
      referenceId: movement.referenceId,
      createdAt: movement.createdAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): StockAdjustmentResult {
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
