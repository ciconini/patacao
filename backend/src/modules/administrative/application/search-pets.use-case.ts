/**
 * Search Pets Use Case
 *
 * Application use case for searching and filtering pet records.
 * This use case orchestrates domain entities and repository ports to search pets.
 *
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, Veterinarian, or Owner role required)
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

import { Pet, VaccinationRecord } from '../domain/pet.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';
import {
  PetRepository,
  PetSearchCriteria,
  Pagination,
  Sort,
  PaginatedResult,
} from '../ports/pet.repository.port';

// Repository interfaces (ports)
export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface SearchPetsInput {
  customerId?: string;
  species?: string;
  breed?: string;
  page?: number;
  perPage?: number;
  sort?: string; // e.g., "name", "-name", "created_at", "-created_at"
  performedBy: string; // User ID
}

// Output model
export interface SearchPetsOutput {
  items: Array<{
    id: string;
    customerId: string;
    name: string;
    species?: string | undefined;
    breed?: string | undefined;
    dateOfBirth?: Date | undefined;
    age?: number | undefined;
    microchipId?: string | undefined;
    medicalNotes?: string | undefined;
    vaccination: VaccinationRecord[];
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
export interface SearchPetsResult {
  success: boolean;
  data?: SearchPetsOutput;
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
 * Search Pets Use Case
 */
export class SearchPetsUseCase {
  private static readonly MIN_PAGE = 1;
  private static readonly MIN_PER_PAGE = 1;
  private static readonly MAX_PER_PAGE = 100;
  private static readonly DEFAULT_PER_PAGE = 20;
  private static readonly DEFAULT_SORT_FIELD = 'createdAt';
  private static readonly DEFAULT_SORT_DIRECTION = 'desc';
  private static readonly VALID_SORT_FIELDS = ['name', 'createdAt'];

  constructor(
    private readonly petRepository: PetRepository,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Executes the search pets use case
   *
   * @param input - Search input data
   * @returns Result containing paginated pet list or error
   */
  async execute(input: SearchPetsInput): Promise<SearchPetsResult> {
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
   * Validates user authorization (must have Staff, Manager, Veterinarian, or Owner role)
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
        return (
          role.isStaff() ||
          role.isManager() ||
          role.value === 'Veterinarian' ||
          role.isOwner()
        );
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError(
        'Only Staff, Manager, Veterinarian, or Owner role can search pets',
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
  private validateAndNormalizeCriteria(input: SearchPetsInput): PetSearchCriteria {
    const criteria: PetSearchCriteria = {};

    // Customer ID filter
    if (input.customerId !== undefined) {
      if (!input.customerId || input.customerId.trim().length === 0) {
        throw new ValidationError('Customer ID cannot be empty');
      }
      criteria.customerId = input.customerId.trim();
    }

    // Species filter
    if (input.species !== undefined) {
      if (input.species.trim().length === 0) {
        throw new ValidationError('Species cannot be empty if provided');
      }
      criteria.species = input.species.trim();
    }

    // Breed filter
    if (input.breed !== undefined) {
      if (input.breed.trim().length === 0) {
        throw new ValidationError('Breed cannot be empty if provided');
      }
      criteria.breed = input.breed.trim();
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
  private validateAndNormalizePagination(input: SearchPetsInput): Pagination {
    const page = input.page ?? SearchPetsUseCase.MIN_PAGE;
    const perPage = input.perPage ?? SearchPetsUseCase.DEFAULT_PER_PAGE;

    if (page < SearchPetsUseCase.MIN_PAGE) {
      throw new ValidationError(`Page must be >= ${SearchPetsUseCase.MIN_PAGE}`);
    }

    if (
      perPage < SearchPetsUseCase.MIN_PER_PAGE ||
      perPage > SearchPetsUseCase.MAX_PER_PAGE
    ) {
      throw new ValidationError(
        `Per page must be between ${SearchPetsUseCase.MIN_PER_PAGE} and ${SearchPetsUseCase.MAX_PER_PAGE}`,
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
        field: SearchPetsUseCase.DEFAULT_SORT_FIELD,
        direction: SearchPetsUseCase.DEFAULT_SORT_DIRECTION,
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

    if (!SearchPetsUseCase.VALID_SORT_FIELDS.includes(mappedField)) {
      throw new ValidationError(
        `Invalid sort field: ${field}. Valid fields are: ${SearchPetsUseCase.VALID_SORT_FIELDS.join(', ')}`,
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
    criteria: PetSearchCriteria,
    pagination: Pagination,
    sort: Sort,
  ): Promise<PaginatedResult<Pet>> {
    try {
      return await this.petRepository.search(criteria, pagination, sort);
    } catch (error: any) {
      throw new RepositoryError(`Failed to search pets: ${error.message}`);
    }
  }

  /**
   * Maps repository results to output format
   *
   * @param result - Repository search result
   * @returns Output model
   */
  private mapToOutput(result: PaginatedResult<Pet>): SearchPetsOutput {
    return {
      items: result.items.map((pet) => ({
        id: pet.id,
        customerId: pet.customerId,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        dateOfBirth: pet.dateOfBirth,
        age: pet.calculateAge(),
        microchipId: pet.microchipId,
        medicalNotes: pet.medicalNotes,
        vaccination: [...pet.vaccinationRecords],
        createdAt: pet.createdAt,
        updatedAt: pet.updatedAt,
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
  private handleError(error: unknown): SearchPetsResult {
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

