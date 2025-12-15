/**
 * Search Stock Movements Use Case (UC-INV-009)
 * 
 * Application use case for searching and filtering stock movement records.
 * This use case orchestrates domain entities and repository ports to search stock movements.
 * 
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, Accountant, or Owner role)
 * - Validate search criteria and pagination parameters
 * - Execute search via repository
 * - Enrich results with denormalized data (product name, user name, location name)
 * - Return paginated results with metadata
 * 
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { StockMovement, StockMovementReason } from '../domain/stock-movement.entity';
import { Product } from '../domain/product.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface StockMovementRepository {
  search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<StockMovement>>;
}

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
}

export interface UserRepository {
  findById(id: string): Promise<{ id: string; fullName: string } | null>;
}

export interface StoreRepository {
  findById(id: string): Promise<{ id: string; name: string } | null>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Search criteria model
export interface SearchCriteria {
  productId?: string;
  from?: Date;
  to?: Date;
  reason?: StockMovementReason;
  locationId?: string;
  performedBy?: string;
  referenceId?: string;
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
export interface SearchStockMovementsInput {
  productId?: string;
  from?: Date;
  to?: Date;
  reason?: string;
  locationId?: string;
  performedBy?: string;
  referenceId?: string;
  page?: number;
  perPage?: number;
  sort?: string; // e.g., "created_at", "-created_at"
  performedByUser: string; // User ID performing the search
}

// Output model
export interface SearchStockMovementsOutput {
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    batchId?: string;
    batchNumber?: string;
    quantityChange: number;
    reason: StockMovementReason;
    performedBy: string;
    performedByName: string;
    locationId: string;
    locationName: string;
    referenceId?: string;
    referenceType?: string;
    createdAt: Date;
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
export interface SearchStockMovementsResult {
  success: boolean;
  data?: SearchStockMovementsOutput;
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
 * Search Stock Movements Use Case
 */
export class SearchStockMovementsUseCase {
  private static readonly MIN_PAGE = 1;
  private static readonly MIN_PER_PAGE = 1;
  private static readonly MAX_PER_PAGE = 100;
  private static readonly DEFAULT_PER_PAGE = 20;
  private static readonly DEFAULT_SORT = 'created_at';
  private static readonly VALID_SORT_FIELDS = ['created_at'];
  private static readonly VALID_REASONS = [
    StockMovementReason.RECEIPT,
    StockMovementReason.SALE,
    StockMovementReason.ADJUSTMENT,
    StockMovementReason.TRANSFER,
    StockMovementReason.RESERVATION_RELEASE,
  ];

  constructor(
    private readonly stockMovementRepository: StockMovementRepository,
    private readonly productRepository: ProductRepository,
    private readonly userRepository: UserRepository,
    private readonly storeRepository: StoreRepository,
    private readonly currentUserRepository: CurrentUserRepository
  ) {}

  /**
   * Executes the search stock movements use case
   * 
   * @param input - Input data for searching stock movements
   * @returns Result containing paginated stock movement list or error
   */
  async execute(input: SearchStockMovementsInput): Promise<SearchStockMovementsResult> {
    try {
      // 1. Validate user exists and has required role
      await this.validateUserAuthorization(input.performedByUser);

      // 2. Validate and normalize pagination parameters
      const pagination = this.validateAndNormalizePagination(input.page, input.perPage);

      // 3. Validate and normalize sort parameter
      const sort = this.validateAndNormalizeSort(input.sort);

      // 4. Validate date range
      this.validateDateRange(input.from, input.to);

      // 5. Validate reason if provided
      const reason = this.validateReason(input.reason);

      // 6. Build search criteria
      const criteria = this.buildSearchCriteria(input, reason);

      // 7. Execute search via repository
      const result = await this.stockMovementRepository.search(criteria, pagination, sort);

      // 8. Enrich results with denormalized data
      const enrichedItems = await this.enrichWithDenormalizedData(result.items);

      // 9. Return success result
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
      throw new ForbiddenError('Only Staff, Manager, Accountant, or Owner role can search stock movements');
    }
  }

  /**
   * Validates and normalizes pagination parameters
   */
  private validateAndNormalizePagination(page?: number, perPage?: number): Pagination {
    const normalizedPage = page !== undefined && page >= SearchStockMovementsUseCase.MIN_PAGE
      ? page
      : SearchStockMovementsUseCase.MIN_PAGE;

    const normalizedPerPage = perPage !== undefined &&
      perPage >= SearchStockMovementsUseCase.MIN_PER_PAGE &&
      perPage <= SearchStockMovementsUseCase.MAX_PER_PAGE
      ? perPage
      : SearchStockMovementsUseCase.DEFAULT_PER_PAGE;

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
        field: SearchStockMovementsUseCase.DEFAULT_SORT,
        direction: 'desc', // Default: most recent first
      };
    }

    const isDescending = sort.startsWith('-');
    const field = isDescending ? sort.substring(1) : sort;

    if (!SearchStockMovementsUseCase.VALID_SORT_FIELDS.includes(field)) {
      throw new ValidationError(
        `Invalid sort field. Valid fields: ${SearchStockMovementsUseCase.VALID_SORT_FIELDS.join(', ')}`
      );
    }

    return {
      field,
      direction: isDescending ? 'desc' : 'asc',
    };
  }

  /**
   * Validates date range
   */
  private validateDateRange(from?: Date, to?: Date): void {
    if (from && to && from > to) {
      throw new ValidationError('Start date must be before or equal to end date');
    }
  }

  /**
   * Validates reason if provided
   */
  private validateReason(reason?: string): StockMovementReason | undefined {
    if (!reason) {
      return undefined;
    }

    const validReason = SearchStockMovementsUseCase.VALID_REASONS.find(
      r => r === reason
    );

    if (!validReason) {
      throw new ValidationError(
        `Invalid reason. Valid values: ${SearchStockMovementsUseCase.VALID_REASONS.join(', ')}`
      );
    }

    return validReason;
  }

  /**
   * Builds search criteria from input
   */
  private buildSearchCriteria(
    input: SearchStockMovementsInput,
    reason?: StockMovementReason
  ): SearchCriteria {
    const criteria: SearchCriteria = {};

    if (input.productId) {
      criteria.productId = input.productId;
    }

    if (input.from) {
      criteria.from = new Date(input.from);
    }

    if (input.to) {
      criteria.to = new Date(input.to);
    }

    if (reason) {
      criteria.reason = reason;
    }

    if (input.locationId) {
      criteria.locationId = input.locationId;
    }

    if (input.performedBy) {
      criteria.performedBy = input.performedBy;
    }

    if (input.referenceId) {
      criteria.referenceId = input.referenceId;
    }

    return criteria;
  }

  /**
   * Enriches stock movements with denormalized data
   */
  private async enrichWithDenormalizedData(
    movements: StockMovement[]
  ): Promise<SearchStockMovementsOutput['items']> {
    const enrichedItems: SearchStockMovementsOutput['items'] = [];

    // Collect unique IDs for batch loading
    const productIds = new Set<string>();
    const userIds = new Set<string>();
    const locationIds = new Set<string>();

    for (const movement of movements) {
      productIds.add(movement.productId);
      userIds.add(movement.performedBy);
      locationIds.add(movement.locationId);
    }

    // Load all products, users, and stores in parallel
    const [products, users, stores] = await Promise.all([
      this.loadProducts(Array.from(productIds)),
      this.loadUsers(Array.from(userIds)),
      this.loadStores(Array.from(locationIds)),
    ]);

    // Enrich each movement
    for (const movement of movements) {
      const product = products.get(movement.productId);
      const user = users.get(movement.performedBy);
      const store = stores.get(movement.locationId);

      // Determine reference type (heuristic based on reference ID pattern or business logic)
      const referenceType = this.determineReferenceType(movement.referenceId);

      enrichedItems.push({
        id: movement.id,
        productId: movement.productId,
        productName: product?.name || 'Unknown Product',
        productSku: product?.sku || 'Unknown SKU',
        batchId: movement.batchId,
        batchNumber: undefined, // Would need to load from StockBatch repository if needed
        quantityChange: movement.quantityChange,
        reason: movement.reason,
        performedBy: movement.performedBy,
        performedByName: user?.fullName || 'Unknown User',
        locationId: movement.locationId,
        locationName: store?.name || 'Unknown Location',
        referenceId: movement.referenceId,
        referenceType,
        createdAt: movement.createdAt,
      });
    }

    return enrichedItems;
  }

  /**
   * Loads products by IDs
   */
  private async loadProducts(productIds: string[]): Promise<Map<string, Product>> {
    const products = new Map<string, Product>();

    await Promise.all(
      productIds.map(async (id) => {
        const product = await this.productRepository.findById(id);
        if (product) {
          products.set(id, product);
        }
      })
    );

    return products;
  }

  /**
   * Loads users by IDs
   */
  private async loadUsers(userIds: string[]): Promise<Map<string, { id: string; fullName: string }>> {
    const users = new Map<string, { id: string; fullName: string }>();

    await Promise.all(
      userIds.map(async (id) => {
        const user = await this.userRepository.findById(id);
        if (user) {
          users.set(id, user);
        }
      })
    );

    return users;
  }

  /**
   * Loads stores by IDs
   */
  private async loadStores(locationIds: string[]): Promise<Map<string, { id: string; name: string }>> {
    const stores = new Map<string, { id: string; name: string }>();

    await Promise.all(
      locationIds.map(async (id) => {
        const store = await this.storeRepository.findById(id);
        if (store) {
          stores.set(id, store);
        }
      })
    );

    return stores;
  }

  /**
   * Determines reference type from reference ID (heuristic)
   */
  private determineReferenceType(referenceId?: string): string | undefined {
    if (!referenceId) {
      return undefined;
    }

    // This is a heuristic - in a real system, you might have a reference type field
    // or check against different repositories to determine the type
    // For now, return undefined as the actual type would need to be determined
    // based on business logic or additional repository lookups
    return undefined;
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): SearchStockMovementsResult {
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

