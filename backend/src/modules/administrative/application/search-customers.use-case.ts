/**
 * Search Customers Use Case (UC-ADMIN-010)
 *
 * Application use case for searching and filtering customer records.
 * This use case orchestrates domain entities and repository ports to search customers.
 *
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, Accountant, or Owner role required)
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

import { Inject } from '@nestjs/common';
import { Customer } from '../domain/customer.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface CustomerRepository {
  search(
    criteria: SearchCriteria,
    pagination: Pagination,
    sort: Sort,
  ): Promise<PaginatedResult<Customer>>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Search criteria model
export interface SearchCriteria {
  q?: string; // General search query
  email?: string;
  phone?: string;
  fullName?: string;
  consentMarketing?: boolean;
  consentReminders?: boolean;
  archived?: boolean;
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
export interface SearchCustomersInput {
  q?: string;
  email?: string;
  phone?: string;
  fullName?: string;
  consentMarketing?: boolean;
  consentReminders?: boolean;
  archived?: boolean;
  page?: number;
  perPage?: number;
  sort?: string; // e.g., "name", "-name", "created_at", "-created_at"
  performedBy: string; // User ID
}

// Output model
export interface SearchCustomersOutput {
  items: Array<{
    id: string;
    fullName: string;
    email?: string | undefined;
    phone?: string | undefined;
    address?: {
      street: string;
      city: string;
      postalCode: string;
      country?: string;
    };
    consentMarketing: boolean;
    consentReminders: boolean;
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
export interface SearchCustomersResult {
  success: boolean;
  data?: SearchCustomersOutput;
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
 * Search Customers Use Case
 */
export class SearchCustomersUseCase {
  private static readonly MIN_PAGE = 1;
  private static readonly MIN_PER_PAGE = 1;
  private static readonly MAX_PER_PAGE = 100;
  private static readonly DEFAULT_PER_PAGE = 20;
  private static readonly DEFAULT_SORT_FIELD = 'created_at';
  private static readonly DEFAULT_SORT_DIRECTION = 'desc';
  private static readonly VALID_SORT_FIELDS = ['name', 'email', 'created_at'];
  private static readonly MAX_QUERY_LENGTH = 255;

  constructor(
    @Inject('CustomerRepository')
    private readonly customerRepository: CustomerRepository,
    @Inject('CurrentUserRepository')
    private readonly currentUserRepository: CurrentUserRepository,
  ) {}

  /**
   * Executes the search customers use case
   *
   * @param input - Search input data
   * @returns Result containing paginated customer list or error
   */
  async execute(input: SearchCustomersInput): Promise<SearchCustomersResult> {
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
   * Validates user authorization (must have Staff, Manager, Accountant, or Owner role)
   *
   * @param userId - User ID to validate
   * @throws UnauthorizedError if user not found
   * @throws ForbiddenError if user does not have required role
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
        'Only Staff, Manager, Accountant, or Owner role can search customers',
      );
    }
  }

  /**
   * Validates and normalizes search criteria
   *
   * @param input - Search input
   * @returns Validated search criteria
   * @throws ValidationError if validation fails
   */
  private validateAndNormalizeCriteria(input: SearchCustomersInput): SearchCriteria {
    const criteria: SearchCriteria = {};

    // General search query
    if (input.q !== undefined) {
      if (input.q.length > SearchCustomersUseCase.MAX_QUERY_LENGTH) {
        throw new ValidationError(
          `Search query cannot exceed ${SearchCustomersUseCase.MAX_QUERY_LENGTH} characters`,
        );
      }
      criteria.q = input.q.trim();
    }

    // Email filter
    if (input.email !== undefined) {
      // Basic email format validation
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(input.email)) {
        throw new ValidationError('Invalid email format');
      }
      criteria.email = input.email.trim().toLowerCase();
    }

    // Phone filter
    if (input.phone !== undefined) {
      if (input.phone.length > 32) {
        throw new ValidationError('Phone number cannot exceed 32 characters');
      }
      criteria.phone = input.phone.trim();
    }

    // Full name filter
    if (input.fullName !== undefined) {
      if (input.fullName.length > 255) {
        throw new ValidationError('Full name cannot exceed 255 characters');
      }
      criteria.fullName = input.fullName.trim();
    }

    // Consent filters
    if (input.consentMarketing !== undefined) {
      if (typeof input.consentMarketing !== 'boolean') {
        throw new ValidationError('Consent marketing must be a boolean value');
      }
      criteria.consentMarketing = input.consentMarketing;
    }

    if (input.consentReminders !== undefined) {
      if (typeof input.consentReminders !== 'boolean') {
        throw new ValidationError('Consent reminders must be a boolean value');
      }
      criteria.consentReminders = input.consentReminders;
    }

    // Archive filter (defaults to false - exclude archived)
    criteria.archived = input.archived ?? false;

    return criteria;
  }

  /**
   * Validates and normalizes pagination parameters
   *
   * @param input - Search input
   * @returns Validated pagination
   * @throws ValidationError if validation fails
   */
  private validateAndNormalizePagination(input: SearchCustomersInput): Pagination {
    const page = input.page ?? SearchCustomersUseCase.MIN_PAGE;
    const perPage = input.perPage ?? SearchCustomersUseCase.DEFAULT_PER_PAGE;

    if (page < SearchCustomersUseCase.MIN_PAGE) {
      throw new ValidationError(`Page must be >= ${SearchCustomersUseCase.MIN_PAGE}`);
    }

    if (
      perPage < SearchCustomersUseCase.MIN_PER_PAGE ||
      perPage > SearchCustomersUseCase.MAX_PER_PAGE
    ) {
      throw new ValidationError(
        `Per page must be between ${SearchCustomersUseCase.MIN_PER_PAGE} and ${SearchCustomersUseCase.MAX_PER_PAGE}`,
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
        field: SearchCustomersUseCase.DEFAULT_SORT_FIELD,
        direction: SearchCustomersUseCase.DEFAULT_SORT_DIRECTION,
      };
    }

    // Parse sort string (e.g., "-name" -> field: "name", direction: "desc")
    const isDescending = sortString.startsWith('-');
    const field = isDescending ? sortString.substring(1) : sortString;

    if (!SearchCustomersUseCase.VALID_SORT_FIELDS.includes(field)) {
      throw new ValidationError(
        `Invalid sort field: ${field}. Valid fields are: ${SearchCustomersUseCase.VALID_SORT_FIELDS.join(', ')}`,
      );
    }

    return {
      field,
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
    criteria: SearchCriteria,
    pagination: Pagination,
    sort: Sort,
  ): Promise<PaginatedResult<Customer>> {
    try {
      return await this.customerRepository.search(criteria, pagination, sort);
    } catch (error: any) {
      throw new RepositoryError(`Failed to search customers: ${error.message}`);
    }
  }

  /**
   * Maps repository results to output format
   *
   * @param result - Repository search result
   * @returns Output model
   */
  private mapToOutput(result: PaginatedResult<Customer>): SearchCustomersOutput {
    return {
      items: result.items.map((customer) => ({
        id: customer.id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address
          ? {
              street: customer.address.street,
              city: customer.address.city,
              postalCode: customer.address.postalCode,
              country: customer.address.country,
            }
          : undefined,
        consentMarketing: customer.consentMarketing,
        consentReminders: customer.consentReminders,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
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
  private handleError(error: unknown): SearchCustomersResult {
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
