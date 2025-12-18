/**
 * Get Customer Use Case
 *
 * Application use case for retrieving a customer by ID.
 * This use case orchestrates domain entities and repository ports to get a customer.
 *
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, Accountant, or Owner role required)
 * - Retrieve customer via repository
 * - Return customer data
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
import { CustomerRepository } from '../ports/customer.repository.port';

// Repository interfaces (ports)
export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface GetCustomerInput {
  id: string;
  performedBy: string; // User ID
}

// Output model
export interface GetCustomerOutput {
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
}

// Result type
export interface GetCustomerResult {
  success: boolean;
  customer?: GetCustomerOutput;
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
 * Get Customer Use Case
 */
export class GetCustomerUseCase {
  constructor(
    @Inject('CustomerRepository')
    private readonly customerRepository: CustomerRepository,
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Executes the get customer use case
   *
   * @param input - Input data for getting customer
   * @returns Result containing customer or error
   */
  async execute(input: GetCustomerInput): Promise<GetCustomerResult> {
    try {
      // 1. Validate current user exists
      const currentUser = await this.userRepository.findById(input.performedBy);
      if (!currentUser) {
        throw new UnauthorizedError('User not found');
      }

      // 2. Check if user has required role (Staff, Manager, Accountant, or Owner)
      const hasRequiredRole = currentUser.roleIds.some((roleId) => {
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
          'Only Staff, Manager, Accountant, or Owner role can view customers',
        );
      }

      // 3. Retrieve customer from repository
      const customer = await this.customerRepository.findById(input.id);
      if (!customer) {
        throw new NotFoundError(`Customer with ID ${input.id} not found`);
      }

      // 4. Return success result
      return {
        success: true,
        customer: this.mapToOutput(customer),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Maps Customer domain entity to output model
   */
  private mapToOutput(customer: Customer): GetCustomerOutput {
    return {
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
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): GetCustomerResult {
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

