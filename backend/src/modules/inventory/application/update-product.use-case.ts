/**
 * Update Product Use Case (UC-INV-006)
 *
 * Application use case for updating an existing product's information.
 * This use case orchestrates domain entities to update products with partial updates.
 *
 * Responsibilities:
 * - Validate user authorization (Manager or Owner role)
 * - Validate product exists
 * - Validate input data and business rules
 * - Validate supplier exists if provided
 * - Update Product domain entity (partial updates)
 * - Persist updated product via repository
 * - Create audit log entry with before/after values
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Product } from '../domain/product.entity';
import { Supplier } from '../domain/supplier.entity';
import { VATRate } from '../../shared/domain/vat-rate.value-object';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  update(product: Product): Promise<Product>;
}

export interface SupplierRepository {
  findById(id: string): Promise<Supplier | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface UpdateProductInput {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  unitPrice?: number;
  vatRate?: number;
  stockTracked?: boolean;
  reorderThreshold?: number;
  supplierId?: string;
  performedBy: string; // User ID
}

// Output model
export interface UpdateProductOutput {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unitPrice: number;
  vatRate: number;
  stockTracked: boolean;
  reorderThreshold?: number;
  supplierId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Result type
export interface UpdateProductResult {
  success: boolean;
  product?: UpdateProductOutput;
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
 * Update Product Use Case
 */
export class UpdateProductUseCase {
  private static readonly MAX_NAME_LENGTH = 255;
  private static readonly MAX_DESCRIPTION_LENGTH = 2000;
  private static readonly MAX_CATEGORY_LENGTH = 128;

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly supplierRepository: SupplierRepository,
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
   * Executes the update product use case
   *
   * @param input - Input data for updating product
   * @returns Result containing updated product or error
   */
  async execute(input: UpdateProductInput): Promise<UpdateProductResult> {
    try {
      // 1. Validate user exists and has Manager or Owner role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate at least one field is provided for update
      this.validateAtLeastOneField(input);

      // 3. Load existing product
      const product = await this.productRepository.findById(input.id);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // 4. Capture before state for audit log
      const beforeState = this.captureBeforeState(product);

      // 5. Validate and load supplier if provided
      if (input.supplierId !== undefined) {
        if (input.supplierId) {
          await this.validateAndLoadSupplier(input.supplierId);
        }
      }

      // 6. Validate field constraints for provided fields
      this.validateFieldConstraints(input);

      // 7. Apply updates to product entity (partial updates)
      this.applyUpdates(product, input);

      // 8. Persist updated product via repository
      const savedProduct = await this.productRepository.update(product);

      // 9. Create audit log entry with before/after values
      await this.createAuditLog(savedProduct, beforeState, input.performedBy);

      // 10. Return success result
      return {
        success: true,
        product: this.mapToOutput(savedProduct, input.supplierId),
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
      throw new ForbiddenError('Only Manager or Owner role can update products');
    }
  }

  /**
   * Validates at least one field is provided for update
   */
  private validateAtLeastOneField(input: UpdateProductInput): void {
    const hasField =
      input.name !== undefined ||
      input.description !== undefined ||
      input.category !== undefined ||
      input.unitPrice !== undefined ||
      input.vatRate !== undefined ||
      input.stockTracked !== undefined ||
      input.reorderThreshold !== undefined ||
      input.supplierId !== undefined;

    if (!hasField) {
      throw new ValidationError('At least one field must be provided for update');
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
   * Validates field constraints for provided fields
   */
  private validateFieldConstraints(input: UpdateProductInput): void {
    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        throw new ValidationError('Product name cannot be empty');
      }
      if (input.name.length > UpdateProductUseCase.MAX_NAME_LENGTH) {
        throw new ValidationError(
          `Name cannot exceed ${UpdateProductUseCase.MAX_NAME_LENGTH} characters`,
        );
      }
    }

    if (input.description !== undefined && input.description !== null) {
      if (input.description.length > UpdateProductUseCase.MAX_DESCRIPTION_LENGTH) {
        throw new ValidationError(
          `Description cannot exceed ${UpdateProductUseCase.MAX_DESCRIPTION_LENGTH} characters`,
        );
      }
    }

    if (input.category !== undefined && input.category !== null) {
      if (input.category.length > UpdateProductUseCase.MAX_CATEGORY_LENGTH) {
        throw new ValidationError(
          `Category cannot exceed ${UpdateProductUseCase.MAX_CATEGORY_LENGTH} characters`,
        );
      }
    }

    if (input.unitPrice !== undefined) {
      if (input.unitPrice < 0) {
        throw new ValidationError('Unit price must be >= 0');
      }
    }

    if (input.vatRate !== undefined) {
      try {
        new VATRate(input.vatRate);
      } catch (error: any) {
        throw new ValidationError(`VAT rate must be between 0 and 100: ${error.message}`);
      }
    }

    if (input.reorderThreshold !== undefined && input.reorderThreshold !== null) {
      if (!Number.isInteger(input.reorderThreshold) || input.reorderThreshold < 0) {
        throw new ValidationError('Reorder threshold must be >= 0');
      }
    }
  }

  /**
   * Captures before state for audit log
   */
  private captureBeforeState(product: Product): Record<string, any> {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      unitPrice: product.unitPrice,
      vatRate: product.vatRate,
      stockTracked: product.stockTracked,
      reorderThreshold: product.reorderThreshold,
    };
  }

  /**
   * Applies updates to product entity (partial updates)
   */
  private applyUpdates(product: Product, input: UpdateProductInput): void {
    if (input.name !== undefined) {
      product.updateName(input.name);
    }

    if (input.description !== undefined) {
      product.updateDescription(input.description);
    }

    if (input.category !== undefined) {
      product.updateCategory(input.category);
    }

    if (input.unitPrice !== undefined) {
      product.updateUnitPrice(input.unitPrice);
    }

    if (input.vatRate !== undefined) {
      product.updateVatRate(input.vatRate);
    }

    if (input.stockTracked !== undefined) {
      if (input.stockTracked) {
        product.enableStockTracking();
      } else {
        product.disableStockTracking();
      }
    }

    if (input.reorderThreshold !== undefined) {
      product.updateReorderThreshold(input.reorderThreshold);
    }

    // Note: SKU cannot be changed (immutable)
    // Note: supplierId would need to be stored separately or added to Product entity
  }

  /**
   * Creates audit log entry for product update
   */
  private async createAuditLog(
    product: Product,
    beforeState: Record<string, any>,
    performedBy: string,
  ): Promise<void> {
    try {
      const afterState = this.captureBeforeState(product); // Reuse method to get after state

      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Product',
        product.id,
        AuditAction.UPDATE,
        performedBy,
        {
          before: beforeState,
          after: afterState,
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
   * Maps Product domain entity to output model
   */
  private mapToOutput(product: Product, supplierId?: string): UpdateProductOutput {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      unitPrice: product.unitPrice,
      vatRate: product.vatRate,
      stockTracked: product.stockTracked,
      reorderThreshold: product.reorderThreshold,
      supplierId, // Note: Product entity doesn't have supplierId, this would need to be stored separately or added to entity
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): UpdateProductResult {
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
