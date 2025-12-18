/**
 * Get Service Use Case
 *
 * Application use case for retrieving a service by ID.
 * This use case orchestrates domain entities and repository ports to get a service.
 *
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, or Owner role required)
 * - Retrieve service via repository
 * - Return service data
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Inject } from '@nestjs/common';
import { Service, ConsumedItem } from '../domain/service.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';
import { ServiceRepository } from '../ports/service.repository.port';

// Repository interfaces (ports)
export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface GetServiceInput {
  id: string;
  performedBy: string; // User ID
}

// Output model
export interface GetServiceOutput {
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
}

// Result type
export interface GetServiceResult {
  success: boolean;
  service?: GetServiceOutput;
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
 * Get Service Use Case
 */
export class GetServiceUseCase {
  constructor(
    @Inject('ServiceRepository')
    private readonly serviceRepository: ServiceRepository,
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Executes the get service use case
   *
   * @param input - Input data for getting service
   * @returns Result containing service or error
   */
  async execute(input: GetServiceInput): Promise<GetServiceResult> {
    try {
      // 1. Validate current user exists
      const currentUser = await this.userRepository.findById(input.performedBy);
      if (!currentUser) {
        throw new UnauthorizedError('User not found');
      }

      // 2. Check if user has required role (Staff, Manager, or Owner)
      const hasRequiredRole = currentUser.roleIds.some((roleId) => {
        try {
          const role = RoleId.fromString(roleId);
          if (!role) return false;
          return role.isStaff() || role.isManager() || role.isOwner();
        } catch {
          return false;
        }
      });

      if (!hasRequiredRole) {
        throw new ForbiddenError('Only Staff, Manager, or Owner role can view services');
      }

      // 3. Retrieve service from repository
      const service = await this.serviceRepository.findById(input.id);
      if (!service) {
        throw new NotFoundError(`Service with ID ${input.id} not found`);
      }

      // 4. Return success result
      return {
        success: true,
        service: this.mapToOutput(service),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Maps Service domain entity to output model
   */
  private mapToOutput(service: Service): GetServiceOutput {
    return {
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
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): GetServiceResult {
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

