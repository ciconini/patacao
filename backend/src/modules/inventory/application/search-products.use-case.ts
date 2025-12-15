/**
 * Search Products Use Case (UC-INV-007)
 * 
 * Application use case for searching and filtering product records.
 * This use case orchestrates domain entities and repository ports to search products.
 * 
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, Accountant, or Owner role)
 * - Validate search criteria and pagination parameters
 * - Execute search via repository
 * - Calculate current stock for stock-tracked products
 * - Return paginated results with metadata
 * 
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Product } from '../domain/product.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface ProductRepository {
  search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<Product>>;
  calculateCurrentStock(productId: string): Promise<number>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Search criteria model
export interface SearchCriteria {
  q?: string; // General search query (searches SKU, name, description)
  sku?: string;
  name?: string;
  category?: string;
  supplierId?: string;
  stockTracked?: boolean;
  lowStock?: boolean; // Filter products below reorder threshold
}

// Pagination model
export interface Pagination {
  page: number;
  perPage: number;
}

// Sort model
export interface Sort {
  field: string;
  direction: 'asc' | 'desc';
}

// Paginated result model
export interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Input model
export interface SearchProductsInput {
  q?: string;
  sku?: string;
  name?: string;
  category?: string;
  supplierId?: string;
  stockTracked?: boolean;
  lowStock?: boolean;
  page?: number;
  perPage?: number;
  sort?: string; // e.g., "name", "-name", "sku", "-sku", "category", "-category", "unit_price", "-unit_price"
  performedBy: string; // User ID
}

// Output model
export interface SearchProductsOutput {
  items: Array<{
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
    currentStock?: number; // Only for stock-tracked products
    createdAt: Date;
    updatedAt: Date;
  }>;
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Result type
export interface SearchProductsResult {
  success: boolean;
  data?: SearchProductsOutput;
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

/**
 * Search Products Use Case
 */
export class SearchProductsUseCase {
  private static readonly MIN_PAGE = 1;
  private static readonly MIN_PER_PAGE = 1;
  private static readonly MAX_PER_PAGE = 100;
  private static readonly DEFAULT_PER_PAGE = 20;
  private static readonly DEFAULT_SORT = 'name';
  private static readonly VALID_SORT_FIELDS = ['name', 'sku', 'category', 'unit_price'];

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly currentUserRepository: CurrentUserRepository
  ) {}

  /**
   * Executes the search products use case
   * 
   * @param input - Input data for searching products
   * @returns Result containing paginated product list or error
   */
  async execute(input: SearchProductsInput): Promise<SearchProductsResult> {
    try {
      // 1. Validate user exists and has required role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate and normalize pagination parameters
      const pagination = this.validateAndNormalizePagination(input.page, input.perPage);

      // 3. Validate and normalize sort parameter
      const sort = this.validateAndNormalizeSort(input.sort);

      // 4. Build search criteria
      const criteria = this.buildSearchCriteria(input);

      // 5. Execute search via repository
      const result = await this.productRepository.search(criteria, pagination, sort);

      // 6. Enrich products with current stock for stock-tracked products
      const enrichedItems = await this.enrichWithCurrentStock(result.items);

      // 7. Return success result
      return {
        success: true,
        data: {
          items: enrichedItems,
          meta: result.meta,
        },
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

    const hasRequiredRole = user.roleIds.some(roleId => {
      try {
        const role = RoleId.fromString(roleId);
        if (!role) return false;
        return role.isStaff() || role.isManager() || role.isAccountant() || role.isOwner();
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError('Only Staff, Manager, Accountant, or Owner role can search products');
    }
  }

  /**
   * Validates and normalizes pagination parameters
   */
  private validateAndNormalizePagination(page?: number, perPage?: number): Pagination {
    const normalizedPage = page !== undefined && page >= SearchProductsUseCase.MIN_PAGE
      ? page
      : SearchProductsUseCase.MIN_PAGE;

    const normalizedPerPage = perPage !== undefined &&
      perPage >= SearchProductsUseCase.MIN_PER_PAGE &&
      perPage <= SearchProductsUseCase.MAX_PER_PAGE
      ? perPage
      : SearchProductsUseCase.DEFAULT_PER_PAGE;

    return {
      page: normalizedPage,
      perPage: normalizedPerPage,
    };
  }

  /**
   * Validates and normalizes sort parameter
   */
  private validateAndNormalizeSort(sort?: string): Sort {
    if (!sort) {
      return {
        field: SearchProductsUseCase.DEFAULT_SORT,
        direction: 'asc',
      };
    }

    const isDescending = sort.startsWith('-');
    const field = isDescending ? sort.substring(1) : sort;

    if (!SearchProductsUseCase.VALID_SORT_FIELDS.includes(field)) {
      throw new ValidationError(
        `Invalid sort field. Valid fields: ${SearchProductsUseCase.VALID_SORT_FIELDS.join(', ')}`
      );
    }

    return {
      field,
      direction: isDescending ? 'desc' : 'asc',
    };
  }

  /**
   * Builds search criteria from input
   */
  private buildSearchCriteria(input: SearchProductsInput): SearchCriteria {
    const criteria: SearchCriteria = {};

    if (input.q) {
      criteria.q = input.q.trim();
    }

    if (input.sku) {
      criteria.sku = input.sku.trim();
    }

    if (input.name) {
      criteria.name = input.name.trim();
    }

    if (input.category) {
      criteria.category = input.category.trim();
    }

    if (input.supplierId) {
      criteria.supplierId = input.supplierId;
    }

    if (input.stockTracked !== undefined) {
      criteria.stockTracked = input.stockTracked;
    }

    if (input.lowStock !== undefined) {
      criteria.lowStock = input.lowStock;
    }

    return criteria;
  }

  /**
   * Enriches products with current stock for stock-tracked products
   */
  private async enrichWithCurrentStock(products: Product[]): Promise<SearchProductsOutput['items']> {
    const enrichedItems: SearchProductsOutput['items'] = [];

    for (const product of products) {
      let currentStock: number | undefined = undefined;

      if (product.stockTracked) {
        try {
          currentStock = await this.productRepository.calculateCurrentStock(product.id);
        } catch (error: any) {
          console.error(`Failed to calculate current stock for product ${product.id}:`, error);
          // Continue without current stock if calculation fails
        }
      }

      enrichedItems.push({
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category,
        unitPrice: product.unitPrice,
        vatRate: product.vatRate,
        stockTracked: product.stockTracked,
        reorderThreshold: product.reorderThreshold,
        supplierId: undefined, // Note: Product entity doesn't have supplierId
        currentStock,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      });
    }

    return enrichedItems;
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): SearchProductsResult {
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

