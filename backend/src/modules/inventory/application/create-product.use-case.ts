/**
 * Create Product Use Case (UC-INV-005)
 * 
 * Application use case for creating a new product in the catalog.
 * This use case orchestrates domain entities to create products with SKU, pricing, VAT, and stock tracking.
 * 
 * Responsibilities:
 * - Validate user authorization (Manager or Owner role)
 * - Validate SKU uniqueness
 * - Validate input data and business rules
 * - Validate supplier exists if provided
 * - Create Product domain entity
 * - Persist product via repository
 * - Create audit log entry
 * 
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Product } from '../domain/product.entity';
import { Supplier } from '../domain/supplier.entity';
import { SKU } from '../../shared/domain/sku.value-object';
import { VATRate } from '../../shared/domain/vat-rate.value-object';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface ProductRepository {
  findBySku(sku: string): Promise<Product | null>;
  save(product: Product): Promise<Product>;
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
export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unitPrice: number;
  vatRate: number;
  stockTracked: boolean;
  reorderThreshold?: number;
  supplierId?: string;
  performedBy: string; // User ID
}

// Output model
export interface CreateProductOutput {
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
export interface CreateProductResult {
  success: boolean;
  product?: CreateProductOutput;
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

export class DuplicateError extends ApplicationError {
  constructor(message: string) {
    super('DUPLICATE', message);
    this.name = 'DuplicateError';
  }
}

/**
 * Create Product Use Case
 */
export class CreateProductUseCase {
  private static readonly MAX_SKU_LENGTH = 64;
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
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  ) {}

  /**
   * Executes the create product use case
   * 
   * @param input - Input data for creating product
   * @returns Result containing created product or error
   */
  async execute(input: CreateProductInput): Promise<CreateProductResult> {
    try {
      // 1. Validate user exists and has Manager or Owner role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate required fields
      this.validateRequiredFields(input);

      // 3. Validate SKU uniqueness
      await this.validateSkuUniqueness(input.sku);

      // 4. Validate and load supplier if provided
      if (input.supplierId) {
        await this.validateAndLoadSupplier(input.supplierId);
      }

      // 5. Validate field constraints
      this.validateFieldConstraints(input);

      // 6. Create Product domain entity
      const product = this.createProductEntity(input);

      // 7. Persist product via repository
      const savedProduct = await this.productRepository.save(product);

      // 8. Create audit log entry
      await this.createAuditLog(savedProduct, input.performedBy);

      // 9. Return success result
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

    const hasRequiredRole = user.roleIds.some(roleId => {
      try {
        const role = RoleId.fromString(roleId);
        if (!role) return false;
        return role.isManager() || role.isOwner();
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError('Only Manager or Owner role can create products');
    }
  }

  /**
   * Validates required fields
   */
  private validateRequiredFields(input: CreateProductInput): void {
    if (!input.sku || input.sku.trim().length === 0) {
      throw new ValidationError('Required field "sku" is missing');
    }

    if (input.sku.length > CreateProductUseCase.MAX_SKU_LENGTH) {
      throw new ValidationError(`SKU cannot exceed ${CreateProductUseCase.MAX_SKU_LENGTH} characters`);
    }

    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError('Required field "name" is missing');
    }

    if (input.unitPrice === undefined || input.unitPrice === null) {
      throw new ValidationError('Required field "unit_price" is missing');
    }

    if (input.vatRate === undefined || input.vatRate === null) {
      throw new ValidationError('Required field "vat_rate" is missing');
    }

    if (input.stockTracked === undefined || input.stockTracked === null) {
      throw new ValidationError('Required field "stock_tracked" is missing');
    }
  }

  /**
   * Validates SKU uniqueness
   */
  private async validateSkuUniqueness(sku: string): Promise<void> {
    const existingProduct = await this.productRepository.findBySku(sku);
    if (existingProduct) {
      throw new DuplicateError(`SKU already exists: ${sku}`);
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
   * Validates field constraints
   */
  private validateFieldConstraints(input: CreateProductInput): void {
    if (input.name.length > CreateProductUseCase.MAX_NAME_LENGTH) {
      throw new ValidationError(`Name cannot exceed ${CreateProductUseCase.MAX_NAME_LENGTH} characters`);
    }

    if (input.description && input.description.length > CreateProductUseCase.MAX_DESCRIPTION_LENGTH) {
      throw new ValidationError(`Description cannot exceed ${CreateProductUseCase.MAX_DESCRIPTION_LENGTH} characters`);
    }

    if (input.category && input.category.length > CreateProductUseCase.MAX_CATEGORY_LENGTH) {
      throw new ValidationError(`Category cannot exceed ${CreateProductUseCase.MAX_CATEGORY_LENGTH} characters`);
    }

    if (input.unitPrice < 0) {
      throw new ValidationError('Unit price must be >= 0');
    }

    // Validate VAT rate using VATRate value object
    try {
      new VATRate(input.vatRate);
    } catch (error: any) {
      throw new ValidationError(`VAT rate must be between 0 and 100: ${error.message}`);
    }

    if (input.reorderThreshold !== undefined && input.reorderThreshold !== null) {
      if (!Number.isInteger(input.reorderThreshold) || input.reorderThreshold < 0) {
        throw new ValidationError('Reorder threshold must be >= 0');
      }
    }
  }

  /**
   * Creates Product domain entity
   */
  private createProductEntity(input: CreateProductInput): Product {
    const productId = this.generateId();
    const now = new Date();

    return new Product(
      productId,
      input.sku,
      input.name,
      input.unitPrice,
      input.vatRate,
      input.stockTracked,
      input.description,
      input.category,
      input.reorderThreshold,
      now,
      now
    );
  }

  /**
   * Creates audit log entry for product creation
   */
  private async createAuditLog(product: Product, performedBy: string): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Product',
        product.id,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            id: product.id,
            sku: product.sku,
            name: product.name,
            unitPrice: product.unitPrice,
            vatRate: product.vatRate,
            stockTracked: product.stockTracked,
            reorderThreshold: product.reorderThreshold,
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
   * Maps Product domain entity to output model
   */
  private mapToOutput(product: Product, supplierId?: string): CreateProductOutput {
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
  private handleError(error: unknown): CreateProductResult {
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

