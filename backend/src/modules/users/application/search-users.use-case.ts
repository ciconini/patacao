/**
 * Search Users Use Case (UC-AUTH-006)
 *
 * Application use case for searching and filtering user accounts.
 * This use case orchestrates domain entities and repository ports to search users.
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

import { User } from '../domain/user.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface UserRepository {
  search(
    criteria: SearchCriteria,
    pagination: Pagination,
    sort: Sort,
  ): Promise<PaginatedResult<User>>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Search criteria model
export interface SearchCriteria {
  q?: string; // General search query
  email?: string;
  role?: string;
  storeId?: string;
  active?: boolean;
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
export interface SearchUsersInput {
  q?: string;
  email?: string;
  role?: string;
  storeId?: string;
  active?: boolean;
  page?: number;
  perPage?: number;
  sort?: string; // e.g., "full_name", "-full_name", "created_at", "-created_at"
  performedBy: string; // User ID
}

// Output model
export interface SearchUsersOutput {
  items: Array<{
    id: string;
    email: string;
    fullName: string;
    phone?: string | undefined;
    username?: string | undefined;
    roles: string[];
    storeIds: string[];
    active: boolean;
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
export interface SearchUsersResult {
  success: boolean;
  data?: SearchUsersOutput;
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

/**
 * Search Users Use Case
 */
export class SearchUsersUseCase {
  private static readonly MIN_PAGE = 1;
  private static readonly MIN_PER_PAGE = 1;
  private static readonly MAX_PER_PAGE = 100;
  private static readonly DEFAULT_PER_PAGE = 20;
  private static readonly DEFAULT_SORT_FIELD = 'full_name';
  private static readonly DEFAULT_SORT_DIRECTION = 'asc';
  private static readonly VALID_SORT_FIELDS = ['full_name', 'email', 'created_at'];
  private static readonly MAX_QUERY_LENGTH = 255;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly currentUserRepository: CurrentUserRepository,
  ) {}

  /**
   * Executes the search users use case
   *
   * @param input - Search input data
   * @returns Result containing paginated user list or error
   */
  async execute(input: SearchUsersInput): Promise<SearchUsersResult> {
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
      const result = await this.userRepository.search(criteria, pagination, sort);

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
      throw new ForbiddenError('Only Manager or Owner role can search users');
    }
  }

  /**
   * Validates and normalizes search criteria
   */
  private validateAndNormalizeCriteria(input: SearchUsersInput): SearchCriteria {
    const criteria: SearchCriteria = {};

    if (input.q !== undefined) {
      if (input.q.length > SearchUsersUseCase.MAX_QUERY_LENGTH) {
        throw new ValidationError(
          `Search query cannot exceed ${SearchUsersUseCase.MAX_QUERY_LENGTH} characters`,
        );
      }
      criteria.q = input.q.trim();
    }

    if (input.email !== undefined) {
      if (input.email.length > 255) {
        throw new ValidationError('Email cannot exceed 255 characters');
      }
      criteria.email = input.email.trim().toLowerCase();
    }

    if (input.role !== undefined) {
      // Validate role is valid
      try {
        const role = RoleId.fromString(input.role);
        if (!role) {
          throw new ValidationError(`Invalid role: ${input.role}`);
        }
        criteria.role = role.value;
      } catch (error: any) {
        throw new ValidationError(`Invalid role: ${input.role}`);
      }
    }

    if (input.storeId !== undefined) {
      criteria.storeId = input.storeId.trim();
    }

    if (input.active !== undefined) {
      if (typeof input.active !== 'boolean') {
        throw new ValidationError('Active must be a boolean value');
      }
      criteria.active = input.active;
    }

    return criteria;
  }

  /**
   * Validates and normalizes pagination parameters
   */
  private validateAndNormalizePagination(input: SearchUsersInput): Pagination {
    const page = input.page ?? SearchUsersUseCase.MIN_PAGE;
    const perPage = input.perPage ?? SearchUsersUseCase.DEFAULT_PER_PAGE;

    if (page < SearchUsersUseCase.MIN_PAGE) {
      throw new ValidationError(`Page must be >= ${SearchUsersUseCase.MIN_PAGE}`);
    }

    if (perPage < SearchUsersUseCase.MIN_PER_PAGE || perPage > SearchUsersUseCase.MAX_PER_PAGE) {
      throw new ValidationError(
        `Per page must be between ${SearchUsersUseCase.MIN_PER_PAGE} and ${SearchUsersUseCase.MAX_PER_PAGE}`,
      );
    }

    return { page, perPage };
  }

  /**
   * Validates and normalizes sort parameter
   */
  private validateAndNormalizeSort(sortString?: string): Sort {
    if (!sortString) {
      return {
        field: SearchUsersUseCase.DEFAULT_SORT_FIELD,
        direction: SearchUsersUseCase.DEFAULT_SORT_DIRECTION,
      };
    }

    const isDescending = sortString.startsWith('-');
    const field = isDescending ? sortString.substring(1) : sortString;

    if (!SearchUsersUseCase.VALID_SORT_FIELDS.includes(field)) {
      throw new ValidationError(
        `Invalid sort field: ${field}. Valid fields are: ${SearchUsersUseCase.VALID_SORT_FIELDS.join(', ')}`,
      );
    }

    return {
      field,
      direction: isDescending ? 'desc' : 'asc',
    };
  }

  /**
   * Maps repository results to output format
   */
  private mapToOutput(result: PaginatedResult<User>): SearchUsersOutput {
    return {
      items: result.items.map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        username: user.username,
        roles: [...user.roleIds],
        storeIds: [...user.storeIds],
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      meta: result.meta,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): SearchUsersResult {
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
