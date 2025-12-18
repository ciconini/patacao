/**
 * Get Store Use Case
 *
 * Application use case for retrieving a store by ID.
 * This use case orchestrates domain entities and repository ports to get a store.
 *
 * Responsibilities:
 * - Validate user authorization (Manager or Owner role required)
 * - Validate store exists and user has access to its company
 * - Retrieve store via repository
 * - Return store data
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Inject } from '@nestjs/common';
import { Store, WeeklyOpeningHours } from '../domain/store.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';
import { StoreRepository } from '../ports/store.repository.port';

// Repository interfaces (ports)
export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
  hasCompanyAccess?(userId: string, companyId: string): Promise<boolean>;
}

// Input model
export interface GetStoreInput {
  id: string;
  performedBy: string; // User ID
}

// Output model
export interface GetStoreOutput {
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
}

// Result type
export interface GetStoreResult {
  success: boolean;
  store?: GetStoreOutput;
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

export class NotFoundError extends ApplicationError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

/**
 * Get Store Use Case
 */
export class GetStoreUseCase {
  constructor(
    @Inject('StoreRepository')
    private readonly storeRepository: StoreRepository,
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Executes the get store use case
   *
   * @param input - Input data for getting store
   * @returns Result containing store or error
   */
  async execute(input: GetStoreInput): Promise<GetStoreResult> {
    try {
      // 1. Validate current user exists
      const currentUser = await this.userRepository.findById(input.performedBy);
      if (!currentUser) {
        throw new UnauthorizedError('User not found');
      }

      // 2. Check if user has Manager or Owner role
      const hasManagerOrOwnerRole = currentUser.roleIds.some((roleId) => {
        try {
          const role = RoleId.fromString(roleId);
          return role ? role.isManager() || role.isOwner() : false;
        } catch {
          return false;
        }
      });

      if (!hasManagerOrOwnerRole) {
        throw new ForbiddenError('Only Manager or Owner role can view stores');
      }

      // 3. Retrieve store from repository
      const store = await this.storeRepository.findById(input.id);
      if (!store) {
        throw new NotFoundError(`Store with ID ${input.id} not found`);
      }

      // 4. Check if user has access to the store's company
      if (this.userRepository.hasCompanyAccess) {
        const hasAccess = await this.userRepository.hasCompanyAccess(
          input.performedBy,
          store.companyId,
        );
        if (!hasAccess) {
          throw new ForbiddenError('User does not have access to this store');
        }
      }

      // 5. Return success result
      return {
        success: true,
        store: this.mapToOutput(store),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Maps Store domain entity to output model
   */
  private mapToOutput(store: Store): GetStoreOutput {
    return {
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
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): GetStoreResult {
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

