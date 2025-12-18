/**
 * Create Customer Use Case (UC-ADMIN-005)
 *
 * Application use case for creating a new customer record.
 * This use case orchestrates domain entities and domain services to create a customer.
 *
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, or Owner role required)
 * - Validate input data and business rules
 * - Create Customer domain entity
 * - Persist customer via repository
 * - Create audit log entry
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Inject } from '@nestjs/common';
import { Customer } from '../domain/customer.entity';
import { Address } from '../../shared/domain/address.value-object';
import { EmailAddress } from '../../shared/domain/email-address.value-object';
import { PhoneNumber } from '../../shared/domain/phone-number.value-object';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface CustomerRepository {
  save(customer: Customer): Promise<Customer>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface CreateCustomerInput {
  fullName: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country?: string;
  };
  consentMarketing?: boolean;
  consentReminders?: boolean;
  performedBy: string; // User ID
}

// Output model
export interface CreateCustomerOutput {
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
export interface CreateCustomerResult {
  success: boolean;
  customer?: CreateCustomerOutput;
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
  constructor(message: string = 'An error occurred during persistence') {
    super('REPOSITORY_ERROR', message);
    this.name = 'RepositoryError';
  }
}

/**
 * Create Customer Use Case
 */
export class CreateCustomerUseCase {
  constructor(
    @Inject('CustomerRepository')
    private readonly customerRepository: CustomerRepository,
    @Inject('AuditLogRepository')
    private readonly auditLogRepository: AuditLogRepository,
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly auditLogDomainService: AuditLogDomainService,
  ) {}

  /**
   * Generates a UUID v4
   */
  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Executes the create customer use case
   *
   * @param input - Input data for creating customer
   * @returns Result containing created customer or error
   */
  async execute(input: CreateCustomerInput): Promise<CreateCustomerResult> {
    try {
      // 1. Validate user exists and has required role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate and normalize input data
      const validatedInput = this.validateInput(input);

      // 3. Create Customer domain entity
      const customer = this.createCustomerEntity(validatedInput);

      // 4. Persist customer via repository
      const savedCustomer = await this.persistCustomer(customer);

      // 5. Create audit log entry
      await this.createAuditLog(savedCustomer, input.performedBy);

      // 6. Return success result
      return {
        success: true,
        customer: this.mapToOutput(savedCustomer),
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
        return role ? role.isStaff() || role.isManager() || role.isOwner() : false;
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError('Only Staff, Manager, or Owner role can create customers');
    }
  }

  /**
   * Validates and normalizes input data
   *
   * @param input - Raw input data
   * @returns Validated and normalized input
   * @throws ValidationError if validation fails
   */
  private validateInput(input: CreateCustomerInput): {
    fullName: string;
    email?: EmailAddress;
    phone?: PhoneNumber;
    address?: Address;
    consentMarketing: boolean;
    consentReminders: boolean;
  } {
    // Validate required fields
    if (!input.fullName || input.fullName.trim().length === 0) {
      throw new ValidationError('Full name is required and cannot be empty');
    }

    // Validate and create value objects
    let email: EmailAddress | undefined;
    if (input.email) {
      try {
        email = new EmailAddress(input.email);
      } catch (error: any) {
        throw new ValidationError(`Invalid email: ${error.message}`);
      }
    }

    let phone: PhoneNumber | undefined;
    if (input.phone) {
      try {
        phone = new PhoneNumber(input.phone);
      } catch (error: any) {
        throw new ValidationError(`Invalid phone number: ${error.message}`);
      }
    }

    let address: Address | undefined;
    if (input.address) {
      try {
        address = new Address(
          input.address.street,
          input.address.city,
          input.address.postalCode,
          input.address.country,
        );
      } catch (error: any) {
        throw new ValidationError(`Invalid address: ${error.message}`);
      }
    }

    // Set consent defaults (GDPR compliance)
    // consentMarketing defaults to false (opt-out)
    // consentReminders defaults to true (opt-in for essential service communications)
    const consentMarketing = input.consentMarketing ?? false;
    const consentReminders = input.consentReminders ?? true;

    return {
      fullName: input.fullName.trim(),
      email,
      phone,
      address,
      consentMarketing,
      consentReminders,
    };
  }

  /**
   * Creates Customer domain entity
   *
   * @param validatedInput - Validated input data
   * @returns Customer domain entity
   */
  private createCustomerEntity(validatedInput: {
    fullName: string;
    email?: EmailAddress;
    phone?: PhoneNumber;
    address?: Address;
    consentMarketing: boolean;
    consentReminders: boolean;
  }): Customer {
    const customerId = this.generateId();
    const now = new Date();

    return new Customer(
      customerId,
      validatedInput.fullName,
      validatedInput.email?.value,
      validatedInput.phone?.value,
      validatedInput.address
        ? {
            street: validatedInput.address.street,
            city: validatedInput.address.city,
            postalCode: validatedInput.address.postalCode,
            country: validatedInput.address.country,
          }
        : undefined,
      validatedInput.consentMarketing,
      validatedInput.consentReminders,
      now,
      now,
    );
  }

  /**
   * Persists customer via repository
   *
   * @param customer - Customer domain entity
   * @returns Persisted customer entity
   * @throws RepositoryError if persistence fails
   */
  private async persistCustomer(customer: Customer): Promise<Customer> {
    try {
      return await this.customerRepository.save(customer);
    } catch (error: any) {
      throw new RepositoryError(`Failed to save customer: ${error.message}`);
    }
  }

  /**
   * Creates audit log entry for customer creation
   *
   * @param customer - Created customer entity
   * @param performedBy - User ID who performed the action
   */
  private async createAuditLog(customer: Customer, performedBy: string): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Customer',
        customer.id,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            id: customer.id,
            fullName: customer.fullName,
            email: customer.email,
            consentMarketing: customer.consentMarketing,
            consentReminders: customer.consentReminders,
          },
        },
        new Date(),
      );

      if (result.auditLog) {
        await this.auditLogRepository.save(result.auditLog);
      }
    } catch (error: any) {
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Maps Customer domain entity to output model
   *
   * @param customer - Customer domain entity
   * @returns Output model
   */
  private mapToOutput(customer: Customer): CreateCustomerOutput {
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
   *
   * @param error - Error that occurred
   * @returns Error result
   */
  private handleError(error: unknown): CreateCustomerResult {
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
