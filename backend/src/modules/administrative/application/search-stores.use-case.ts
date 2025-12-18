/**
 * Search Stores Use Case
 *
 * Application use case for searching and filtering store records.
 * This use case orchestrates domain entities and repository ports to search stores.
 *
 * Responsibilities:
 * - Validate user authorization (Manager or Owner role required)
 * - Validate search criteria and pagination parameters
 * - Execute search via repository
 * - Return paginated results with metadata
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Store, WeeklyOpeningHours } from '../domain/store.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';
import {
  StoreRepository,
  StoreSearchCriteria,
  Pagination,
  Sort,
  PaginatedResult,
} from '../ports/store.repository.port';

// Repository interfaces (ports)
export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface SearchStoresInput {
  companyId?: string;
  page?: number;
  perPage?: number;
  sort?: string; // e.g., "name", "-name", "created_at", "-created_at"
  performedBy: string; // User ID
}

// Output model
export interface SearchStoresOutput {
  items: Array<{
    id: string;
    companyId: string;
    name: string;
    address?: {
      street: string;
      city: string;
      postalCode: string;
      country?: string;
    };
    email?: string | undefined;
    phone?: string | undefined;
    openingHours: WeeklyOpeningHours;
    timezone: string;
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
export interface SearchStoresResult {
  success: boolean;
  data?: SearchStoresOutput;
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

export class RepositoryError extends ApplicationError {
  constructor(message: string = 'An error occurred during search') {
    super('REPOSITORY_ERROR', message);
    this.name = 'RepositoryError';
  }
}

/**
 * Search Stores Use Case
 */
export class SearchStoresUseCase {
  private static readonly MIN_PAGE = 1;
  private static readonly MIN_PER_PAGE = 1;
  private static readonly MAX_PER_PAGE = 100;
  private static readonly DEFAULT_PER_PAGE = 20;
  private static readonly DEFAULT_SORT_FIELD = 'createdAt';
  private static readonly DEFAULT_SORT_DIRECTION = 'desc';
  private static readonly VALID_SORT_FIELDS = ['name', 'createdAt'];

  constructor(
    private readonly storeRepository: StoreRepository,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Executes the search stores use case
   *
   * @param input - Search input data
   * @returns Result containing paginated store list or error
   */
  async execute(input: SearchStoresInput): Promise<SearchStoresResult> {
    try {
      // 1. Validate user exists and has required role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate and normalize search criteria
      const criteria = this.validateAndNormalizeCriteria(input);

      // 3. Validate and normalize pagination
      const pagination = this.validateAndNormalizePagination(input);

      // 4. Validate and normalize sort
      const sort = this.validateAndNormalizeSort(input.sort);

      // 5. Execute search via repository
      const result = await this.executeSearch(criteria, pagination, sort);

      // 6. Map results to output format
      const output = this.mapToOutput(result);

      // 7. Return success result
      return {
        success: true,
        data: output,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization (must have Manager or Owner role)
   *
   * @param userId - User ID to validate
   * @throws UnauthorizedError if user not found
   * @throws ForbiddenError if user does not have required role
   */
  private async validateUserAuthorization(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);

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
      throw new ForbiddenError('Only Manager or Owner role can search stores');
    }
  }

  /**
   * Validates and normalizes search criteria
   *
   * @param input - Search input
   * @returns Validated search criteria
   * @throws ValidationError if validation fails
   */
  private validateAndNormalizeCriteria(input: SearchStoresInput): StoreSearchCriteria {
    const criteria: StoreSearchCriteria = {};

    // Company ID filter
    if (input.companyId !== undefined) {
      if (!input.companyId || input.companyId.trim().length === 0) {
        throw new ValidationError('Company ID cannot be empty');
      }
      criteria.companyId = input.companyId.trim();
    }

    return criteria;
  }

  /**
   * Validates and normalizes pagination parameters
   *
   * @param input - Search input
   * @returns Validated pagination
   * @throws ValidationError if validation fails
   */
  private validateAndNormalizePagination(input: SearchStoresInput): Pagination {
    const page = input.page ?? SearchStoresUseCase.MIN_PAGE;
    const perPage = input.perPage ?? SearchStoresUseCase.DEFAULT_PER_PAGE;

    if (page < SearchStoresUseCase.MIN_PAGE) {
      throw new ValidationError(`Page must be >= ${SearchStoresUseCase.MIN_PAGE}`);
    }

    if (
      perPage < SearchStoresUseCase.MIN_PER_PAGE ||
      perPage > SearchStoresUseCase.MAX_PER_PAGE
    ) {
      throw new ValidationError(
        `Per page must be between ${SearchStoresUseCase.MIN_PER_PAGE} and ${SearchStoresUseCase.MAX_PER_PAGE}`,
      );
    }

    return { page, perPage };
  }

  /**
   * Validates and normalizes sort parameter
   *
   * @param sortString - Sort string (e.g., "name", "-name", "created_at")
   * @returns Validated sort object
   * @throws ValidationError if validation fails
   */
  private validateAndNormalizeSort(sortString?: string): Sort {
    if (!sortString) {
      return {
        field: SearchStoresUseCase.DEFAULT_SORT_FIELD,
        direction: SearchStoresUseCase.DEFAULT_SORT_DIRECTION,
      };
    }

    // Parse sort string (e.g., "-name" -> field: "name", direction: "desc")
    const isDescending = sortString.startsWith('-');
    const field = isDescending ? sortString.substring(1) : sortString;

    // Map API field names to repository field names
    const fieldMapping: Record<string, string> = {
      name: 'name',
      created_at: 'createdAt',
      createdAt: 'createdAt',
    };

    const mappedField = fieldMapping[field] || field;

    if (!SearchStoresUseCase.VALID_SORT_FIELDS.includes(mappedField)) {
      throw new ValidationError(
        `Invalid sort field: ${field}. Valid fields are: ${SearchStoresUseCase.VALID_SORT_FIELDS.join(', ')}`,
      );
    }

    return {
      field: mappedField,
      direction: isDescending ? 'desc' : 'asc',
    };
  }

  /**
   * Executes search via repository
   *
   * @param criteria - Search criteria
   * @param pagination - Pagination parameters
   * @param sort - Sort parameters
   * @returns Paginated search results
   * @throws RepositoryError if search fails
   */
  private async executeSearch(
    criteria: StoreSearchCriteria,
    pagination: Pagination,
    sort: Sort,
  ): Promise<PaginatedResult<Store>> {
    try {
      return await this.storeRepository.search(criteria, pagination, sort);
    } catch (error: any) {
      throw new RepositoryError(`Failed to search stores: ${error.message}`);
    }
  }

  /**
   * Maps repository results to output format
   *
   * @param result - Repository search result
   * @returns Output model
   */
  private mapToOutput(result: PaginatedResult<Store>): SearchStoresOutput {
    return {
      items: result.items.map((store) => ({
        id: store.id,
        companyId: store.companyId,
        name: store.name,
        address: store.address
          ? {
              street: store.address.street,
              city: store.address.city,
              postalCode: store.address.postalCode,
              country: store.address.country,
            }
          : undefined,
        email: store.email,
        phone: store.phone,
        openingHours: store.openingHours,
        timezone: store.timezone,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
      })),
      meta: result.meta,
    };
  }

  /**
   * Handles errors and converts them to result format
   *
   * @param error - Error that occurred
   * @returns Error result
   */
  private handleError(error: unknown): SearchStoresResult {
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

