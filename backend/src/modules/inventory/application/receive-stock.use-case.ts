/**
 * Receive Stock Use Case (UC-INV-001)
 *
 * Application use case for receiving stock at a store.
 * This use case orchestrates domain entities to record incoming stock, create stock batches,
 * and create stock movements.
 *
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, or Owner role)
 * - Validate store, supplier, and purchase order existence
 * - Validate receipt lines
 * - Create/update stock batches
 * - Create stock movements with reason RECEIPT
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
import { StockBatch } from '../domain/stock-batch.entity';
import { Product } from '../domain/product.entity';
import { Store } from '../../administrative/domain/store.entity';
import { Supplier } from '../domain/supplier.entity';
import { PurchaseOrder, PurchaseOrderStatus } from '../domain/purchase-order.entity';
import { StockMovementDomainService } from '../domain/stock-movement.domain-service';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface StoreRepository {
  findById(id: string): Promise<Store | null>;
}

export interface SupplierRepository {
  findById(id: string): Promise<Supplier | null>;
}

export interface PurchaseOrderRepository {
  findById(id: string): Promise<PurchaseOrder | null>;
}

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  updateOnHand(productId: string, delta: number): Promise<void>;
}

export interface StockBatchRepository {
  createOrIncrement(params: {
    productId: string;
    batchNumber?: string;
    quantity: number;
    expiryDate?: Date;
    receivedAt: Date;
  }): Promise<StockBatch>;
  findByProductAndBatch(productId: string, batchNumber: string): Promise<StockBatch | null>;
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
export interface ReceiveStockInput {
  storeId: string;
  supplierId?: string;
  purchaseOrderId?: string;
  lines: Array<{
    productId: string;
    quantity: number;
    batchNumber?: string;
    expiryDate?: Date;
    unitCost?: number;
    locationId?: string;
  }>;
  performedBy: string; // User ID
}

// Output model
export interface ReceiveStockOutput {
  receiptId: string;
  storeId: string;
  supplierId?: string;
  purchaseOrderId?: string;
  lines: Array<{
    productId: string;
    quantity: number;
    batchId?: string;
    batchNumber?: string;
    expiryDate?: Date;
  }>;
  stockBatches: Array<{
    id: string;
    productId: string;
    batchNumber?: string;
    expiryDate?: Date;
    quantity: number;
  }>;
  stockMovements: Array<{
    id: string;
    productId: string;
    quantityChange: number;
    reason: StockMovementReason;
    batchId?: string;
    locationId: string;
    referenceId?: string;
  }>;
  createdAt: Date;
}

// Result type
export interface ReceiveStockResult {
  success: boolean;
  receipt?: ReceiveStockOutput;
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

export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super('CONFLICT', message);
    this.name = 'ConflictError';
  }
}

/**
 * Receive Stock Use Case
 */
export class ReceiveStockUseCase {
  private static readonly MAX_BATCH_NUMBER_LENGTH = 128;

  constructor(
    private readonly storeRepository: StoreRepository,
    private readonly supplierRepository: SupplierRepository,
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
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
   * Executes the receive stock use case
   *
   * @param input - Input data for receiving stock
   * @returns Result containing receipt details or error
   */
  async execute(input: ReceiveStockInput): Promise<ReceiveStockResult> {
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

      // 5. Validate and load supplier if provided
      let supplier: Supplier | null = null;
      if (input.supplierId) {
        supplier = await this.validateAndLoadSupplier(input.supplierId);
      }

      // 6. Validate and load purchase order if provided
      let purchaseOrder: PurchaseOrder | null = null;
      if (input.purchaseOrderId) {
        purchaseOrder = await this.validateAndLoadPurchaseOrder(input.purchaseOrderId);
      }

      // 7. Validate receipt lines
      const validatedLines = await this.validateReceiptLines(input.lines, input.storeId);

      // 8. Process receipt (create batches and movements)
      const receiptId = this.generateId();
      const now = new Date();
      const stockBatches: StockBatch[] = [];
      const stockMovements: StockMovement[] = [];

      for (const line of validatedLines) {
        // Create or update stock batch
        const batch = await this.stockBatchRepository.createOrIncrement({
          productId: line.productId,
          batchNumber: line.batchNumber,
          quantity: line.quantity,
          expiryDate: line.expiryDate,
          receivedAt: now,
        });
        stockBatches.push(batch);

        // Create stock movement
        const movement = this.createStockMovement(
          line.productId,
          line.quantity,
          input.storeId,
          line.locationId || input.storeId,
          batch.id,
          receiptId,
          input.purchaseOrderId,
          input.performedBy,
        );

        // Validate movement using domain service
        const product = await this.productRepository.findById(line.productId);
        if (!product) {
          throw new NotFoundError(`Product ${line.productId} not found`);
        }

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
        await this.productRepository.updateOnHand(line.productId, line.quantity);
      }

      // 9. Create audit log entry
      await this.createAuditLog(receiptId, input, stockBatches, stockMovements, input.performedBy);

      // 10. Return success result
      return {
        success: true,
        receipt: this.mapToOutput(
          receiptId,
          input,
          stockBatches,
          stockMovements,
          validatedLines,
          now,
        ),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization (must have Staff, Manager, or Owner role)
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
        return role.isStaff() || role.isManager() || role.isOwner();
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError('Only Staff, Manager, or Owner role can receive stock');
    }
  }

  /**
   * Validates required fields
   */
  private validateRequiredFields(input: ReceiveStockInput): void {
    if (!input.storeId || input.storeId.trim().length === 0) {
      throw new ValidationError('Store ID is required');
    }

    if (!input.lines || input.lines.length === 0) {
      throw new ValidationError('At least one receipt line is required');
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
   * Validates and loads supplier
   */
  private async validateAndLoadSupplier(supplierId: string): Promise<Supplier> {
    const supplier = await this.supplierRepository.findById(supplierId);

    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    return supplier;
  }

  /**
   * Validates and loads purchase order
   */
  private async validateAndLoadPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrder> {
    const purchaseOrder = await this.purchaseOrderRepository.findById(purchaseOrderId);

    if (!purchaseOrder) {
      throw new NotFoundError('Purchase order not found');
    }

    if (!purchaseOrder.canBeReceived()) {
      throw new ConflictError(
        'Purchase order cannot be received. Only ordered purchase orders can be received',
      );
    }

    return purchaseOrder;
  }

  /**
   * Validates receipt lines
   */
  private async validateReceiptLines(
    lines: ReceiveStockInput['lines'],
    storeId: string,
  ): Promise<ReceiveStockInput['lines']> {
    const validatedLines: ReceiveStockInput['lines'] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineIndex = i + 1;

      // Validate product exists
      if (!line.productId || line.productId.trim().length === 0) {
        throw new ValidationError(`Line ${lineIndex}: Product ID is required`);
      }

      const product = await this.productRepository.findById(line.productId);
      if (!product) {
        throw new NotFoundError(`Line ${lineIndex}: Product not found`);
      }

      // Validate quantity
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        throw new ValidationError(`Line ${lineIndex}: Quantity must be a positive integer`);
      }

      // Validate batch number length
      if (
        line.batchNumber &&
        line.batchNumber.length > ReceiveStockUseCase.MAX_BATCH_NUMBER_LENGTH
      ) {
        throw new ValidationError(
          `Line ${lineIndex}: Batch number cannot exceed ${ReceiveStockUseCase.MAX_BATCH_NUMBER_LENGTH} characters`,
        );
      }

      // Validate expiry date is not in the past
      if (line.expiryDate) {
        const expiryDate = new Date(line.expiryDate);
        const now = new Date();
        if (expiryDate < now) {
          throw new ValidationError(`Line ${lineIndex}: Expiry date cannot be in the past`);
        }
      }

      // Validate unit cost
      if (line.unitCost !== undefined && line.unitCost < 0) {
        throw new ValidationError(`Line ${lineIndex}: Unit cost cannot be negative`);
      }

      validatedLines.push(line);
    }

    return validatedLines;
  }

  /**
   * Creates stock movement for receipt
   */
  private createStockMovement(
    productId: string,
    quantity: number,
    storeId: string,
    locationId: string,
    batchId: string | undefined,
    receiptId: string,
    purchaseOrderId: string | undefined,
    performedBy: string,
  ): StockMovement {
    const movementId = this.generateId();
    const now = new Date();

    return new StockMovement(
      movementId,
      productId,
      quantity, // Positive for receipt
      StockMovementReason.RECEIPT,
      performedBy,
      locationId,
      batchId,
      purchaseOrderId || receiptId, // Reference to PO if exists, otherwise receipt ID
      now,
    );
  }

  /**
   * Creates audit log entry for stock receipt
   */
  private async createAuditLog(
    receiptId: string,
    input: ReceiveStockInput,
    stockBatches: StockBatch[],
    stockMovements: StockMovement[],
    performedBy: string,
  ): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'StockReceipt',
        receiptId,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            receiptId,
            storeId: input.storeId,
            supplierId: input.supplierId,
            purchaseOrderId: input.purchaseOrderId,
            linesCount: input.lines.length,
            batchesCount: stockBatches.length,
            movementsCount: stockMovements.length,
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
  private mapToOutput(
    receiptId: string,
    input: ReceiveStockInput,
    stockBatches: StockBatch[],
    stockMovements: StockMovement[],
    validatedLines: ReceiveStockInput['lines'],
    createdAt: Date,
  ): ReceiveStockOutput {
    return {
      receiptId,
      storeId: input.storeId,
      supplierId: input.supplierId,
      purchaseOrderId: input.purchaseOrderId,
      lines: validatedLines.map((line, index) => ({
        productId: line.productId,
        quantity: line.quantity,
        batchId: stockBatches[index]?.id,
        batchNumber: line.batchNumber,
        expiryDate: line.expiryDate,
      })),
      stockBatches: stockBatches.map((batch) => ({
        id: batch.id,
        productId: batch.productId,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantity: batch.quantity,
      })),
      stockMovements: stockMovements.map((movement) => ({
        id: movement.id,
        productId: movement.productId,
        quantityChange: movement.quantityChange,
        reason: movement.reason,
        batchId: movement.batchId,
        locationId: movement.locationId,
        referenceId: movement.referenceId,
      })),
      createdAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): ReceiveStockResult {
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
