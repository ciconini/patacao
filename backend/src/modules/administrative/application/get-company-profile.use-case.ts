/**
 * Get Company Profile Use Case
 *
 * Application use case for retrieving a company profile by ID.
 * This use case orchestrates domain entities and repository ports to get a company.
 *
 * Responsibilities:
 * - Validate user authorization (Manager or Owner role required)
 * - Retrieve company via repository
 * - Return company data
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Inject } from '@nestjs/common';
import { Company } from '../domain/company.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';
import { CompanyRepository } from '../ports/company.repository.port';

// Repository interfaces (ports)
export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface GetCompanyProfileInput {
  id: string;
  performedBy: string; // User ID
}

// Output model
export interface GetCompanyProfileOutput {
  id: string;
  name: string;
  nif: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country?: string;
  };
  taxRegime: string;
  defaultVatRate?: number;
  phone?: string | undefined;
  email?: string | undefined;
  website?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

// Result type
export interface GetCompanyProfileResult {
  success: boolean;
  company?: GetCompanyProfileOutput;
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
 * Get Company Profile Use Case
 */
export class GetCompanyProfileUseCase {
  constructor(
    @Inject('CompanyRepository')
    private readonly companyRepository: CompanyRepository,
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Executes the get company profile use case
   *
   * @param input - Input data for getting company
   * @returns Result containing company or error
   */
  async execute(input: GetCompanyProfileInput): Promise<GetCompanyProfileResult> {
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
        throw new ForbiddenError('Only Manager or Owner role can view company profiles');
      }

      // 3. Retrieve company from repository
      const company = await this.companyRepository.findById(input.id);
      if (!company) {
        throw new NotFoundError(`Company with ID ${input.id} not found`);
      }

      // 4. Return success result
      return {
        success: true,
        company: this.mapToOutput(company),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Maps Company domain entity to output model
   */
  private mapToOutput(company: Company): GetCompanyProfileOutput {
    return {
      id: company.id,
      name: company.name,
      nif: company.nif,
      address: {
        street: company.address.street,
        city: company.address.city,
        postalCode: company.address.postalCode,
        country: company.address.country,
      },
      taxRegime: company.taxRegime,
      defaultVatRate: company.defaultVatRate,
      phone: company.phone,
      email: company.email,
      website: company.website,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): GetCompanyProfileResult {
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

