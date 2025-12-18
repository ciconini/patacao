/**
 * Complete Transaction Use Case (UC-FIN-007)
 *
 * Application use case for completing a pending transaction.
 * This use case orchestrates domain entities and domain services to complete transactions.
 *
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, Accountant, or Owner role)
 * - Validate transaction is in pending status
 * - Check stock availability for tracked products
 * - Create stock movements for tracked products
 * - Mark transaction as paid (if payment info provided)
 * - Persist transaction and stock movements
 * - Create audit log entry
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Transaction, PaymentStatus } from '../domain/transaction.entity';
import { StockMovement, StockMovementReason } from '../../inventory/domain/stock-movement.entity';
import { Product } from '../../inventory/domain/product.entity';
import { StockMovementDomainService } from '../../inventory/domain/stock-movement.domain-service';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface TransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  update(transaction: Transaction): Promise<Transaction>;
}

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  checkStock(productId: string, quantity: number): Promise<boolean>;
  decrementStock(productId: string, quantity: number): Promise<void>;
}

export interface StockMovementRepository {
  save(stockMovement: StockMovement): Promise<StockMovement>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface CompleteTransactionInput {
  id: string; // Transaction ID
  paymentMethod?: string;
  paidAt?: Date;
  externalReference?: string;
  performedBy: string; // User ID
}

// Output model
export interface CompleteTransactionOutput {
  id: string;
  storeId: string;
  invoiceId: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: string | undefined;
  paidAt?: Date | undefined;
  externalReference?: string | undefined;
  updatedAt: Date;
  stockMovements: Array<{
    id: string;
    productId: string;
    quantityChange: number;
    reason: StockMovementReason;
  }>;
}

// Result type
export interface CompleteTransactionResult {
  success: boolean;
  transaction?: CompleteTransactionOutput;
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
 * Complete Transaction Use Case
 */
export class CompleteTransactionUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
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
   * Executes the complete transaction use case
   *
   * @param input - Input data for completing transaction
   * @returns Result containing completed transaction or error
   */
  async execute(input: CompleteTransactionInput): Promise<CompleteTransactionResult> {
    try {
      // 1. Validate user exists and has required role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate payment information if provided
      const paidAt = this.validatePaymentDate(input.paidAt);

      // 3. Load transaction by ID
      const transaction = await this.transactionRepository.findById(input.id);
      if (!transaction) {
        throw new NotFoundError('Transaction not found');
      }

      // 4. Validate transaction is in pending status
      if (!transaction.isPending()) {
        throw new ValidationError(
          'Transaction is not in pending status. Only pending transactions can be completed',
        );
      }

      // 5. Check stock availability for tracked products
      const productLineItems = transaction.getProductLineItems();
      const stockMovements: StockMovement[] = [];

      for (const lineItem of productLineItems) {
        if (!lineItem.productId) continue;

        const product = await this.productRepository.findById(lineItem.productId);
        if (!product) {
          throw new NotFoundError(`Product with ID ${lineItem.productId} not found`);
        }

        // Only process stock-tracked products
        if (product.stockTracked) {
          // Check stock availability
          const hasStock = await this.productRepository.checkStock(product.id, lineItem.quantity);
          if (!hasStock) {
            throw new ConflictError(
              `Insufficient stock for product ${product.name} (${product.sku}). Required: ${lineItem.quantity}`,
            );
          }

          // Create stock movement for decrement
          const stockMovement = this.createStockMovement(
            product.id,
            -lineItem.quantity, // Negative for decrement
            transaction.storeId,
            transaction.id,
            input.performedBy,
          );

          // Validate movement legality using domain service
          const validationResult = this.stockMovementDomainService.validateMovementLegality(
            stockMovement,
            product,
          );

          if (!validationResult.isValid) {
            throw new ValidationError(
              `Invalid stock movement for product ${product.name}: ${validationResult.errors.join(', ')}`,
            );
          }

          stockMovements.push(stockMovement);
        }
      }

      // 6. Mark transaction as paid if payment info provided
      if (input.paymentMethod || paidAt || input.externalReference) {
        transaction.markAsPaidManual();
        // Note: Transaction entity doesn't store payment details directly
        // Payment details would be stored in the linked invoice (see UC-FIN-003)
      }

      // 7. Persist stock movements and update product stock
      for (const stockMovement of stockMovements) {
        // Decrement product stock
        await this.productRepository.decrementStock(
          stockMovement.productId,
          Math.abs(stockMovement.quantityChange),
        );

        // Persist stock movement
        await this.stockMovementRepository.save(stockMovement);
      }

      // 8. Persist updated transaction
      const savedTransaction = await this.transactionRepository.update(transaction);

      // 9. Create audit log entry
      await this.createAuditLog(savedTransaction, stockMovements, input.performedBy);

      // 10. Return success result
      return {
        success: true,
        transaction: this.mapToOutput(savedTransaction, stockMovements, input),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization (must have Staff, Manager, Accountant, or Owner role)
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
        return role.isStaff() || role.isManager() || role.isAccountant() || role.isOwner();
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError(
        'Only Staff, Manager, Accountant, or Owner role can complete transactions',
      );
    }
  }

  /**
   * Validates payment date
   */
  private validatePaymentDate(paidAt?: Date): Date | undefined {
    if (!paidAt) {
      return undefined;
    }

    const paymentDate = new Date(paidAt);
    const now = new Date();

    if (isNaN(paymentDate.getTime())) {
      throw new ValidationError('Payment date must be a valid date');
    }

    if (paymentDate > now) {
      throw new ValidationError('Payment date must be valid and cannot be in the future');
    }

    return paymentDate;
  }

  /**
   * Creates stock movement for product decrement
   */
  private createStockMovement(
    productId: string,
    quantityChange: number, // Negative for decrement
    locationId: string,
    referenceId: string,
    performedBy: string,
  ): StockMovement {
    const movementId = this.generateId();
    const now = new Date();

    return new StockMovement(
      movementId,
      productId,
      quantityChange,
      StockMovementReason.SALE,
      performedBy,
      locationId,
      undefined, // batchId
      referenceId, // transaction ID
      now,
    );
  }

  /**
   * Creates audit log entry for transaction completion
   */
  private async createAuditLog(
    transaction: Transaction,
    stockMovements: StockMovement[],
    performedBy: string,
  ): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Transaction',
        transaction.id,
        AuditAction.UPDATE, // Using UPDATE for completion
        performedBy,
        {
          after: {
            action: 'complete',
            transactionId: transaction.id,
            paymentStatus: transaction.paymentStatus,
            stockMovementsCount: stockMovements.length,
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
   * Maps Transaction domain entity to output model
   */
  private mapToOutput(
    transaction: Transaction,
    stockMovements: StockMovement[],
    input: CompleteTransactionInput,
  ): CompleteTransactionOutput {
    return {
      id: transaction.id,
      storeId: transaction.storeId,
      invoiceId: transaction.invoiceId,
      paymentStatus: transaction.paymentStatus,
      paymentMethod: input.paymentMethod,
      paidAt: input.paidAt,
      externalReference: input.externalReference,
      updatedAt: transaction.updatedAt,
      stockMovements: stockMovements.map((movement) => ({
        id: movement.id,
        productId: movement.productId,
        quantityChange: movement.quantityChange,
        reason: movement.reason,
      })),
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): CompleteTransactionResult {
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
