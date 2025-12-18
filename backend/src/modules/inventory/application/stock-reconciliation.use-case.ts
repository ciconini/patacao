/**
 * Stock Reconciliation Use Case (UC-INV-004)
 *
 * Application use case for performing stock reconciliation (stock count).
 * This use case orchestrates domain entities to compare counted quantities with system quantities
 * and create adjustments for variances.
 *
 * Responsibilities:
 * - Validate user authorization (Manager or Owner role)
 * - Validate store/location access
 * - Validate count entries
 * - Calculate variances (counted - system)
 * - Create stock movements for variances
 * - Update product on-hand quantities
 * - Persist all changes via repositories
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
import { StockBatch } from '../domain/stock-batch.entity';
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
  getOnHand(productId: string, locationId: string): Promise<number>;
  updateOnHand(productId: string, delta: number): Promise<void>;
}

export interface StockBatchRepository {
  findByProductAndBatch(productId: string, batchNumber: string): Promise<StockBatch | null>;
  findByProduct(productId: string): Promise<StockBatch[]>;
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
export interface StockReconciliationInput {
  storeId: string;
  locationId?: string; // Optional inventory location, defaults to store
  counts: Array<{
    productId: string;
    countedQuantity: number;
    batchNumber?: string; // Optional: if counting by batch
  }>;
  performedBy: string; // User ID
}

// Output model
export interface StockReconciliationOutput {
  reconciliationId: string;
  storeId: string;
  locationId: string;
  counts: Array<{
    productId: string;
    productName: string;
    systemQuantity: number;
    countedQuantity: number;
    variance: number;
    batchNumber?: string;
  }>;
  adjustments: Array<{
    stockMovementId: string;
    productId: string;
    quantityChange: number;
    reason: StockMovementReason;
  }>;
  createdAt: Date;
}

// Result type
export interface StockReconciliationResult {
  success: boolean;
  reconciliation?: StockReconciliationOutput;
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
 * Stock Reconciliation Use Case
 */
export class StockReconciliationUseCase {
  constructor(
    private readonly storeRepository: StoreRepository,
    private readonly productRepository: ProductRepository,
    private readonly stockBatchRepository: StockBatchRepository,
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
   * Executes the stock reconciliation use case
   *
   * @param input - Input data for stock reconciliation
   * @returns Result containing reconciliation details or error
   */
  async execute(input: StockReconciliationInput): Promise<StockReconciliationResult> {
    try {
      // 1. Validate user exists and has Manager or Owner role
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

      // 5. Validate count entries
      const validatedCounts = await this.validateCountEntries(
        input.counts,
        input.storeId,
        input.locationId,
      );

      // 6. Calculate variances and create adjustments
      const reconciliationId = this.generateId();
      const locationId = input.locationId || input.storeId;
      const now = new Date();
      const countResults: StockReconciliationOutput['counts'] = [];
      const adjustments: StockReconciliationOutput['adjustments'] = [];
      const stockMovements: StockMovement[] = [];

      for (const count of validatedCounts) {
        // Get system quantity
        let systemQuantity: number;
        if (count.batchNumber) {
          // Batch-specific count
          const batch = await this.stockBatchRepository.findByProductAndBatch(
            count.productId,
            count.batchNumber,
          );
          if (!batch) {
            throw new NotFoundError(
              `Batch ${count.batchNumber} not found for product ${count.productId}`,
            );
          }
          systemQuantity = batch.quantity;
        } else {
          // Product-level count
          systemQuantity = await this.productRepository.getOnHand(count.productId, locationId);
        }

        // Calculate variance
        const variance = count.countedQuantity - systemQuantity;

        // Get product for name
        const product = await this.productRepository.findById(count.productId);
        if (!product) {
          throw new NotFoundError(`Product ${count.productId} not found`);
        }

        countResults.push({
          productId: count.productId,
          productName: product.name,
          systemQuantity,
          countedQuantity: count.countedQuantity,
          variance,
          batchNumber: count.batchNumber,
        });

        // Create adjustment movement if variance != 0
        if (variance !== 0) {
          // Validate negative adjustment won't result in negative stock
          if (variance < 0) {
            const absoluteVariance = Math.abs(variance);
            if (absoluteVariance > systemQuantity) {
              throw new ValidationError(
                `Adjustment for product ${product.name} would result in negative stock. ` +
                  `System quantity: ${systemQuantity}, Variance: ${variance}`,
              );
            }
          }

          // Create stock movement for variance
          const movement = this.createStockMovement(
            count.productId,
            variance, // Positive adds, negative removes
            locationId,
            count.batchNumber,
            reconciliationId,
            input.performedBy,
          );

          // Validate movement using domain service
          const validationResult = this.stockMovementDomainService.validateMovementLegality(
            movement,
            product,
          );

          if (!validationResult.isValid) {
            throw new ValidationError(
              `Invalid stock movement for product ${product.name}: ${validationResult.errors.join(', ')}`,
            );
          }

          // Persist movement
          const savedMovement = await this.stockMovementRepository.save(movement);
          stockMovements.push(savedMovement);

          // Update product on-hand quantity
          await this.productRepository.updateOnHand(count.productId, variance);

          adjustments.push({
            stockMovementId: savedMovement.id,
            productId: savedMovement.productId,
            quantityChange: savedMovement.quantityChange,
            reason: savedMovement.reason,
          });
        }
      }

      // 7. Create audit log entry
      await this.createAuditLog(
        reconciliationId,
        input,
        countResults,
        adjustments,
        input.performedBy,
      );

      // 8. Return success result
      return {
        success: true,
        reconciliation: {
          reconciliationId,
          storeId: input.storeId,
          locationId,
          counts: countResults,
          adjustments,
          createdAt: now,
        },
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
      throw new ForbiddenError('Only Manager or Owner role can reconcile stock');
    }
  }

  /**
   * Validates required fields
   */
  private validateRequiredFields(input: StockReconciliationInput): void {
    if (!input.storeId || input.storeId.trim().length === 0) {
      throw new ValidationError('Store ID is required');
    }

    if (!input.counts || input.counts.length === 0) {
      throw new ValidationError('At least one count entry is required');
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
   * Validates count entries
   */
  private async validateCountEntries(
    counts: StockReconciliationInput['counts'],
    storeId: string,
    locationId?: string,
  ): Promise<StockReconciliationInput['counts']> {
    const validatedCounts: StockReconciliationInput['counts'] = [];

    for (let i = 0; i < counts.length; i++) {
      const count = counts[i];
      const countIndex = i + 1;

      // Validate product exists
      if (!count.productId || count.productId.trim().length === 0) {
        throw new ValidationError(`Count ${countIndex}: Product ID is required`);
      }

      const product = await this.productRepository.findById(count.productId);
      if (!product) {
        throw new NotFoundError(`Count ${countIndex}: Product not found`);
      }

      // Validate product is stock-tracked
      if (!product.stockTracked) {
        throw new ValidationError(
          `Count ${countIndex}: Product ${product.name} (${product.sku}) is not stock-tracked. ` +
            `Reconciliation can only be performed for stock-tracked products.`,
        );
      }

      // Validate counted quantity
      if (!Number.isInteger(count.countedQuantity) || count.countedQuantity < 0) {
        throw new ValidationError(
          `Count ${countIndex}: Counted quantity must be a non-negative integer`,
        );
      }

      // Validate batch if provided
      if (count.batchNumber) {
        const batch = await this.stockBatchRepository.findByProductAndBatch(
          count.productId,
          count.batchNumber,
        );
        if (!batch) {
          throw new NotFoundError(
            `Count ${countIndex}: Batch ${count.batchNumber} not found for product ${product.name}`,
          );
        }
      }

      validatedCounts.push(count);
    }

    return validatedCounts;
  }

  /**
   * Creates stock movement for reconciliation variance
   */
  private createStockMovement(
    productId: string,
    variance: number, // Positive adds, negative removes
    locationId: string,
    batchNumber: string | undefined,
    reconciliationId: string,
    performedBy: string,
  ): StockMovement {
    const movementId = this.generateId();
    const now = new Date();

    // Use ADJUSTMENT reason for reconciliation (or could use a specific RECONCILIATION reason if added)
    return new StockMovement(
      movementId,
      productId,
      variance,
      StockMovementReason.ADJUSTMENT, // Reconciliation adjustments use ADJUSTMENT reason
      performedBy,
      locationId,
      undefined, // batchId - would need to be resolved from batchNumber if needed
      reconciliationId, // Reference to reconciliation session
      now,
    );
  }

  /**
   * Creates audit log entry for stock reconciliation
   */
  private async createAuditLog(
    reconciliationId: string,
    input: StockReconciliationInput,
    counts: StockReconciliationOutput['counts'],
    adjustments: StockReconciliationOutput['adjustments'],
    performedBy: string,
  ): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'StockReconciliation',
        reconciliationId,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            reconciliationId,
            storeId: input.storeId,
            locationId: input.locationId || input.storeId,
            countsCount: counts.length,
            adjustmentsCount: adjustments.length,
            variances: counts
              .filter((c) => c.variance !== 0)
              .map((c) => ({
                productId: c.productId,
                variance: c.variance,
              })),
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
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): StockReconciliationResult {
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
