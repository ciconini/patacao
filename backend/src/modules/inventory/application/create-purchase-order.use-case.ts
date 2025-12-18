/**
 * Create Purchase Order Use Case (UC-INV-011)
 *
 * Application use case for creating a new purchase order.
 * This use case orchestrates domain entities to create purchase orders with line items.
 *
 * Responsibilities:
 * - Validate user authorization (Manager or Owner role)
 * - Validate supplier and store existence
 * - Validate order lines
 * - Create PurchaseOrder domain entity
 * - Persist purchase order via repository
 * - Create audit log entry
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import {
  PurchaseOrder,
  PurchaseOrderStatus,
  PurchaseOrderLine,
} from '../domain/purchase-order.entity';
import { Supplier } from '../domain/supplier.entity';
import { Store } from '../../administrative/domain/store.entity';
import { Product } from '../domain/product.entity';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface PurchaseOrderRepository {
  save(purchaseOrder: PurchaseOrder): Promise<PurchaseOrder>;
}

export interface SupplierRepository {
  findById(id: string): Promise<Supplier | null>;
}

export interface StoreRepository {
  findById(id: string): Promise<Store | null>;
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
export interface CreatePurchaseOrderInput {
  supplierId: string;
  storeId?: string;
  lines: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  status?: 'draft' | 'ordered';
  performedBy: string; // User ID
}

// Output model
export interface CreatePurchaseOrderOutput {
  id: string;
  supplierId: string;
  supplierName: string;
  storeId?: string;
  lines: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  status: PurchaseOrderStatus;
  totalAmount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Result type
export interface CreatePurchaseOrderResult {
  success: boolean;
  purchaseOrder?: CreatePurchaseOrderOutput;
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
 * Create Purchase Order Use Case
 */
export class CreatePurchaseOrderUseCase {
  constructor(
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly supplierRepository: SupplierRepository,
    private readonly storeRepository: StoreRepository,
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
   * Executes the create purchase order use case
   *
   * @param input - Input data for creating purchase order
   * @returns Result containing created purchase order or error
   */
  async execute(input: CreatePurchaseOrderInput): Promise<CreatePurchaseOrderResult> {
    try {
      // 1. Validate user exists and has Manager or Owner role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate required fields
      this.validateRequiredFields(input);

      // 3. Validate and load supplier
      const supplier = await this.validateAndLoadSupplier(input.supplierId);

      // 4. Validate and load store if provided
      let store: Store | null = null;
      if (input.storeId) {
        store = await this.validateAndLoadStore(input.storeId);
      }

      // 5. Validate order lines
      const validatedLines = await this.validateOrderLines(input.lines);

      // 6. Validate status
      const status = this.validateAndNormalizeStatus(input.status);

      // 7. Create PurchaseOrder domain entity
      const purchaseOrder = this.createPurchaseOrderEntity(
        input.supplierId,
        input.storeId,
        validatedLines,
        status,
        input.performedBy,
      );

      // 8. Persist purchase order via repository
      const savedPurchaseOrder = await this.purchaseOrderRepository.save(purchaseOrder);

      // 9. Create audit log entry
      await this.createAuditLog(savedPurchaseOrder, supplier, input.performedBy);

      // 10. Return success result
      return {
        success: true,
        purchaseOrder: this.mapToOutput(savedPurchaseOrder, supplier),
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
      throw new ForbiddenError('Only Manager or Owner role can create purchase orders');
    }
  }

  /**
   * Validates required fields
   */
  private validateRequiredFields(input: CreatePurchaseOrderInput): void {
    if (!input.supplierId || input.supplierId.trim().length === 0) {
      throw new ValidationError('Required field "supplier_id" is missing');
    }

    if (!input.lines || input.lines.length === 0) {
      throw new ValidationError('Purchase order must have at least one line item');
    }
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
   * Validates order lines
   */
  private async validateOrderLines(
    lines: CreatePurchaseOrderInput['lines'],
  ): Promise<PurchaseOrderLine[]> {
    const validatedLines: PurchaseOrderLine[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineIndex = i + 1;

      // Validate product exists
      if (!line.productId || line.productId.trim().length === 0) {
        throw new ValidationError(`Line ${lineIndex}: Product ID is required`);
      }

      const product = await this.productRepository.findById(line.productId);
      if (!product) {
        throw new NotFoundError(`Line ${lineIndex}: Product with ID ${line.productId} not found`);
      }

      // Validate quantity
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        throw new ValidationError(`Line ${lineIndex}: Quantity must be greater than 0`);
      }

      // Validate unit price
      if (line.unitPrice < 0) {
        throw new ValidationError(`Line ${lineIndex}: Unit price must be >= 0`);
      }

      validatedLines.push({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      });
    }

    return validatedLines;
  }

  /**
   * Validates and normalizes status
   */
  private validateAndNormalizeStatus(status?: 'draft' | 'ordered'): PurchaseOrderStatus {
    if (!status) {
      return PurchaseOrderStatus.DRAFT;
    }

    if (status === 'draft') {
      return PurchaseOrderStatus.DRAFT;
    }

    if (status === 'ordered') {
      return PurchaseOrderStatus.ORDERED;
    }

    throw new ValidationError("Status must be 'draft' or 'ordered'");
  }

  /**
   * Creates PurchaseOrder domain entity
   */
  private createPurchaseOrderEntity(
    supplierId: string,
    storeId: string | undefined,
    orderLines: PurchaseOrderLine[],
    status: PurchaseOrderStatus,
    createdBy: string,
  ): PurchaseOrder {
    const purchaseOrderId = this.generateId();
    const now = new Date();

    return new PurchaseOrder(
      purchaseOrderId,
      supplierId,
      createdBy,
      orderLines,
      storeId,
      status,
      now,
      now,
    );
  }

  /**
   * Creates audit log entry for purchase order creation
   */
  private async createAuditLog(
    purchaseOrder: PurchaseOrder,
    supplier: Supplier,
    performedBy: string,
  ): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'PurchaseOrder',
        purchaseOrder.id,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            id: purchaseOrder.id,
            supplierId: purchaseOrder.supplierId,
            supplierName: supplier.name,
            storeId: purchaseOrder.storeId,
            status: purchaseOrder.status,
            linesCount: purchaseOrder.orderLines.length,
            totalAmount: purchaseOrder.calculateTotal(),
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
   * Maps PurchaseOrder domain entity to output model
   */
  private mapToOutput(purchaseOrder: PurchaseOrder, supplier: Supplier): CreatePurchaseOrderOutput {
    return {
      id: purchaseOrder.id,
      supplierId: purchaseOrder.supplierId,
      supplierName: supplier.name,
      storeId: purchaseOrder.storeId,
      lines: purchaseOrder.orderLines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
      status: purchaseOrder.status,
      totalAmount: purchaseOrder.calculateTotal(),
      createdBy: purchaseOrder.createdBy,
      createdAt: purchaseOrder.createdAt,
      updatedAt: purchaseOrder.updatedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): CreatePurchaseOrderResult {
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
