/**
 * Search Services Use Case
 *
 * Application use case for searching and filtering service records.
 * This use case orchestrates domain entities and repository ports to search services.
 *
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, or Owner role required)
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

import { Service, ConsumedItem } from '../domain/service.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';
import {
  ServiceRepository,
  ServiceSearchCriteria,
  Pagination,
  Sort,
  PaginatedResult,
} from '../ports/service.repository.port';

// Repository interfaces (ports)
export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface SearchServicesInput {
  q?: string;
  tag?: string;
  consumesInventory?: boolean;
  page?: number;
  perPage?: number;
  sort?: string; // e.g., "name", "-name", "created_at", "-created_at"
  performedBy: string; // User ID
}

// Output model
export interface SearchServicesOutput {
  items: Array<{
    id: string;
    name: string;
    description?: string | undefined;
    durationMinutes: number;
    price: number;
    consumesInventory: boolean;
    consumedItems: ConsumedItem[];
    requiredResources: string[];
    tags: string[];
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
export interface SearchServicesResult {
  success: boolean;
  data?: SearchServicesOutput;
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
 * Search Services Use Case
 */
export class SearchServicesUseCase {
  private static readonly MIN_PAGE = 1;
  private static readonly MIN_PER_PAGE = 1;
  private static readonly MAX_PER_PAGE = 100;
  private static readonly DEFAULT_PER_PAGE = 20;
  private static readonly DEFAULT_SORT_FIELD = 'createdAt';
  private static readonly DEFAULT_SORT_DIRECTION = 'desc';
  private static readonly VALID_SORT_FIELDS = ['name', 'price', 'createdAt'];
  private static readonly MAX_QUERY_LENGTH = 255;

  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Executes the search services use case
   *
   * @param input - Search input data
   * @returns Result containing paginated service list or error
   */
  async execute(input: SearchServicesInput): Promise<SearchServicesResult> {
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
   * Validates user authorization (must have Staff, Manager, or Owner role)
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
        return role.isStaff() || role.isManager() || role.isOwner();
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError('Only Staff, Manager, or Owner role can search services');
    }
  }

  /**
   * Validates and normalizes search criteria
   *
   * @param input - Search input
   * @returns Validated search criteria
   * @throws ValidationError if validation fails
   */
  private validateAndNormalizeCriteria(input: SearchServicesInput): ServiceSearchCriteria {
    const criteria: ServiceSearchCriteria = {};

    // General search query
    if (input.q !== undefined) {
      if (input.q.length > SearchServicesUseCase.MAX_QUERY_LENGTH) {
        throw new ValidationError(
          `Search query cannot exceed ${SearchServicesUseCase.MAX_QUERY_LENGTH} characters`,
        );
      }
      criteria.q = input.q.trim();
    }

    // Tag filter
    if (input.tag !== undefined) {
      if (input.tag.trim().length === 0) {
        throw new ValidationError('Tag cannot be empty if provided');
      }
      criteria.tag = input.tag.trim();
    }

    // Consumes inventory filter
    if (input.consumesInventory !== undefined) {
      if (typeof input.consumesInventory !== 'boolean') {
        throw new ValidationError('Consumes inventory must be a boolean value');
      }
      criteria.consumesInventory = input.consumesInventory;
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
  private validateAndNormalizePagination(input: SearchServicesInput): Pagination {
    const page = input.page ?? SearchServicesUseCase.MIN_PAGE;
    const perPage = input.perPage ?? SearchServicesUseCase.DEFAULT_PER_PAGE;

    if (page < SearchServicesUseCase.MIN_PAGE) {
      throw new ValidationError(`Page must be >= ${SearchServicesUseCase.MIN_PAGE}`);
    }

    if (
      perPage < SearchServicesUseCase.MIN_PER_PAGE ||
      perPage > SearchServicesUseCase.MAX_PER_PAGE
    ) {
      throw new ValidationError(
        `Per page must be between ${SearchServicesUseCase.MIN_PER_PAGE} and ${SearchServicesUseCase.MAX_PER_PAGE}`,
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
        field: SearchServicesUseCase.DEFAULT_SORT_FIELD,
        direction: SearchServicesUseCase.DEFAULT_SORT_DIRECTION,
      };
    }

    // Parse sort string (e.g., "-name" -> field: "name", direction: "desc")
    const isDescending = sortString.startsWith('-');
    const field = isDescending ? sortString.substring(1) : sortString;

    // Map API field names to repository field names
    const fieldMapping: Record<string, string> = {
      name: 'name',
      price: 'price',
      created_at: 'createdAt',
      createdAt: 'createdAt',
    };

    const mappedField = fieldMapping[field] || field;

    if (!SearchServicesUseCase.VALID_SORT_FIELDS.includes(mappedField)) {
      throw new ValidationError(
        `Invalid sort field: ${field}. Valid fields are: ${SearchServicesUseCase.VALID_SORT_FIELDS.join(', ')}`,
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
    criteria: ServiceSearchCriteria,
    pagination: Pagination,
    sort: Sort,
  ): Promise<PaginatedResult<Service>> {
    try {
      return await this.serviceRepository.search(criteria, pagination, sort);
    } catch (error: any) {
      throw new RepositoryError(`Failed to search services: ${error.message}`);
    }
  }

  /**
   * Maps repository results to output format
   *
   * @param result - Repository search result
   * @returns Output model
   */
  private mapToOutput(result: PaginatedResult<Service>): SearchServicesOutput {
    return {
      items: result.items.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: service.price,
        consumesInventory: service.consumesInventory,
        consumedItems: [...service.consumedItems],
        requiredResources: [...service.requiredResources],
        tags: [...service.tags],
        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
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
  private handleError(error: unknown): SearchServicesResult {
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

