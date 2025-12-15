/**
 * Receive Purchase Order Use Case (UC-INV-012)
 * 
 * Application use case for receiving goods against a purchase order.
 * This use case orchestrates domain entities to receive purchase orders, create stock batches,
 * and create stock movements.
 * 
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, or Owner role)
 * - Validate purchase order exists and is in ordered status
 * - Validate received lines match PO lines
 * - Validate quantities don't exceed ordered quantities
 * - Create/update stock batches
 * - Create stock movements with reason RECEIPT
 * - Update purchase order status
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

import { PurchaseOrder, PurchaseOrderStatus } from '../domain/purchase-order.entity';
import { StockMovement, StockMovementReason } from '../domain/stock-movement.entity';
import { StockBatch } from '../domain/stock-batch.entity';
import { Product } from '../domain/product.entity';
import { Store } from '../../administrative/domain/store.entity';
import { StockMovementDomainService } from '../domain/stock-movement.domain-service';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface PurchaseOrderRepository {
  findById(id: string): Promise<PurchaseOrder | null>;
  update(purchaseOrder: PurchaseOrder): Promise<PurchaseOrder>;
}

export interface StoreRepository {
  findById(id: string): Promise<Store | null>;
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
export interface ReceivePurchaseOrderInput {
  id: string; // Purchase order ID
  storeId?: string; // Optional: defaults to PO store
  receivedLines: Array<{
    productId: string;
    quantity: number;
    batchNumber?: string;
    expiryDate?: Date;
  }>;
  performedBy: string; // User ID
}

// Output model
export interface ReceivePurchaseOrderOutput {
  purchaseOrderId: string;
  status: PurchaseOrderStatus;
  receivedLines: Array<{
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
    referenceId: string;
  }>;
  receivedAt: Date;
  receivedBy: string;
}

// Result type
export interface ReceivePurchaseOrderResult {
  success: boolean;
  receipt?: ReceivePurchaseOrderOutput;
  error?: {
    code: string;
    message: string;
  };
}

// Application errors
export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string
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
 * Receive Purchase Order Use Case
 */
export class ReceivePurchaseOrderUseCase {
  private static readonly MAX_BATCH_NUMBER_LENGTH = 128;

  constructor(
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
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
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  ) {}

  /**
   * Executes the receive purchase order use case
   * 
   * @param input - Input data for receiving purchase order
   * @returns Result containing receipt details or error
   */
  async execute(input: ReceivePurchaseOrderInput): Promise<ReceivePurchaseOrderResult> {
    try {
      // 1. Validate user exists and has required role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate required fields
      this.validateRequiredFields(input);

      // 3. Load purchase order
      const purchaseOrder = await this.purchaseOrderRepository.findById(input.id);
      if (!purchaseOrder) {
        throw new NotFoundError('Purchase order not found');
      }

      // 4. Validate PO status is ordered
      if (purchaseOrder.status !== PurchaseOrderStatus.ORDERED) {
        throw new ValidationError("Purchase order must be in 'ordered' status to receive goods");
      }

      // 5. Determine store (use provided store or PO store)
      const storeId = input.storeId || purchaseOrder.storeId;
      if (!storeId) {
        throw new ValidationError('Store ID is required. Either provide store_id or ensure PO has a store_id');
      }

      // 6. Validate store exists
      const store = await this.validateAndLoadStore(storeId);

      // 7. Validate user has store access
      const hasAccess = await this.currentUserRepository.hasStoreAccess(
        input.performedBy,
        storeId
      );
      if (!hasAccess) {
        throw new ForbiddenError('You do not have access to this store');
      }

      // 8. Validate received lines
      const validatedLines = await this.validateReceivedLines(
        input.receivedLines,
        purchaseOrder,
        storeId
      );

      // 9. Process receipt (create batches and movements)
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
          storeId,
          batch.id,
          purchaseOrder.id,
          input.performedBy
        );

        // Validate movement using domain service
        const product = await this.productRepository.findById(line.productId);
        if (!product) {
          throw new NotFoundError(`Product ${line.productId} not found`);
        }

        const validationResult = this.stockMovementDomainService.validateMovementLegality(
          movement,
          product
        );

        if (!validationResult.isValid) {
          throw new ValidationError(
            `Invalid stock movement for product ${product.name}: ${validationResult.errors.join(', ')}`
          );
        }

        // Persist movement
        const savedMovement = await this.stockMovementRepository.save(movement);
        stockMovements.push(savedMovement);

        // Update product on-hand quantity
        await this.productRepository.updateOnHand(line.productId, line.quantity);
      }

      // 10. Check if all PO lines are fully received and update status
      // Note: This is simplified - in a real system, you'd track received quantities per line
      // For now, we'll mark as received if all lines were received in this operation
      // This would need to be enhanced to support partial receipts properly
      if (this.areAllLinesFullyReceived(purchaseOrder, validatedLines)) {
        purchaseOrder.markAsReceived();
        await this.purchaseOrderRepository.update(purchaseOrder);
      }

      // 11. Create audit log entry
      await this.createAuditLog(
        purchaseOrder.id,
        input,
        stockBatches,
        stockMovements,
        input.performedBy
      );

      // 12. Return success result
      return {
        success: true,
        receipt: this.mapToOutput(
          purchaseOrder,
          validatedLines,
          stockBatches,
          stockMovements,
          input.performedBy,
          now
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

    const hasRequiredRole = user.roleIds.some(roleId => {
      try {
        const role = RoleId.fromString(roleId);
        if (!role) return false;
        return role.isStaff() || role.isManager() || role.isOwner();
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError('Only Staff, Manager, or Owner role can receive purchase orders');
    }
  }

  /**
   * Validates required fields
   */
  private validateRequiredFields(input: ReceivePurchaseOrderInput): void {
    if (!input.id || input.id.trim().length === 0) {
      throw new ValidationError('Purchase order ID is required');
    }

    if (!input.receivedLines || input.receivedLines.length === 0) {
      throw new ValidationError('At least one received line is required');
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
   * Validates received lines
   */
  private async validateReceivedLines(
    receivedLines: ReceivePurchaseOrderInput['receivedLines'],
    purchaseOrder: PurchaseOrder,
    storeId: string
  ): Promise<ReceivePurchaseOrderInput['receivedLines']> {
    const validatedLines: ReceivePurchaseOrderInput['receivedLines'] = [];
    const poLinesByProduct = new Map<string, { quantity: number }>();

    // Build map of PO lines by product ID
    for (const poLine of purchaseOrder.orderLines) {
      const existing = poLinesByProduct.get(poLine.productId);
      if (existing) {
        existing.quantity += poLine.quantity;
      } else {
        poLinesByProduct.set(poLine.productId, { quantity: poLine.quantity });
      }
    }

    // Track received quantities per product
    const receivedQuantitiesByProduct = new Map<string, number>();

    for (let i = 0; i < receivedLines.length; i++) {
      const line = receivedLines[i];
      const lineIndex = i + 1;

      // Validate product exists
      if (!line.productId || line.productId.trim().length === 0) {
        throw new ValidationError(`Line ${lineIndex}: Product ID is required`);
      }

      const product = await this.productRepository.findById(line.productId);
      if (!product) {
        throw new NotFoundError(`Line ${lineIndex}: Product not found`);
      }

      // Validate product is in PO
      const poLine = poLinesByProduct.get(line.productId);
      if (!poLine) {
        throw new ValidationError(`Line ${lineIndex}: Product ${product.name} is not in this purchase order`);
      }

      // Validate quantity
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        throw new ValidationError(`Line ${lineIndex}: Quantity must be a positive integer`);
      }

      // Track received quantity for this product
      const currentReceived = receivedQuantitiesByProduct.get(line.productId) || 0;
      const totalReceived = currentReceived + line.quantity;

      // Validate total received doesn't exceed ordered
      if (totalReceived > poLine.quantity) {
        throw new ValidationError(
          `Line ${lineIndex}: Received quantity ${totalReceived} exceeds ordered quantity ${poLine.quantity} for product ${product.name}`
        );
      }

      receivedQuantitiesByProduct.set(line.productId, totalReceived);

      // Validate batch number length
      if (line.batchNumber && line.batchNumber.length > ReceivePurchaseOrderUseCase.MAX_BATCH_NUMBER_LENGTH) {
        throw new ValidationError(
          `Line ${lineIndex}: Batch number cannot exceed ${ReceivePurchaseOrderUseCase.MAX_BATCH_NUMBER_LENGTH} characters`
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

      validatedLines.push(line);
    }

    return validatedLines;
  }

  /**
   * Checks if all PO lines are fully received
   * Note: This is simplified - in a real system, you'd track received quantities per line
   */
  private areAllLinesFullyReceived(
    purchaseOrder: PurchaseOrder,
    receivedLines: ReceivePurchaseOrderInput['receivedLines']
  ): boolean {
    // Simplified check: if we received all products in the PO, consider it fully received
    // In a real system, you'd need to track partial receipts and compare received vs ordered quantities
    const receivedProductIds = new Set(receivedLines.map(line => line.productId));
    const poProductIds = new Set(purchaseOrder.orderLines.map(line => line.productId));

    if (receivedProductIds.size !== poProductIds.size) {
      return false;
    }

    for (const productId of poProductIds) {
      if (!receivedProductIds.has(productId)) {
        return false;
      }
    }

    // Note: This doesn't check if quantities match - that would require tracking received quantities
    // For now, we assume if all products are present, it's fully received
    return true;
  }

  /**
   * Creates stock movement for receipt
   */
  private createStockMovement(
    productId: string,
    quantity: number,
    locationId: string,
    batchId: string | undefined,
    purchaseOrderId: string,
    performedBy: string
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
      purchaseOrderId, // Reference to PO
      now
    );
  }

  /**
   * Creates audit log entry for purchase order receipt
   */
  private async createAuditLog(
    purchaseOrderId: string,
    input: ReceivePurchaseOrderInput,
    stockBatches: StockBatch[],
    stockMovements: StockMovement[],
    performedBy: string
  ): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'PurchaseOrder',
        purchaseOrderId,
        AuditAction.UPDATE, // Using UPDATE as we're updating PO status
        performedBy,
        {
          after: {
            purchaseOrderId,
            action: 'received',
            storeId: input.storeId,
            receivedLinesCount: input.receivedLines.length,
            batchesCount: stockBatches.length,
            movementsCount: stockMovements.length,
          },
        },
        new Date()
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
    purchaseOrder: PurchaseOrder,
    validatedLines: ReceivePurchaseOrderInput['receivedLines'],
    stockBatches: StockBatch[],
    stockMovements: StockMovement[],
    receivedBy: string,
    receivedAt: Date
  ): ReceivePurchaseOrderOutput {
    return {
      purchaseOrderId: purchaseOrder.id,
      status: purchaseOrder.status,
      receivedLines: validatedLines.map((line, index) => ({
        productId: line.productId,
        quantity: line.quantity,
        batchId: stockBatches[index]?.id,
        batchNumber: line.batchNumber,
        expiryDate: line.expiryDate,
      })),
      stockBatches: stockBatches.map(batch => ({
        id: batch.id,
        productId: batch.productId,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantity: batch.quantity,
      })),
      stockMovements: stockMovements.map(movement => ({
        id: movement.id,
        productId: movement.productId,
        quantityChange: movement.quantityChange,
        reason: movement.reason,
        batchId: movement.batchId,
        locationId: movement.locationId,
        referenceId: movement.referenceId || '',
      })),
      receivedAt,
      receivedBy,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): ReceivePurchaseOrderResult {
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

