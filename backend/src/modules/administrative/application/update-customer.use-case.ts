/**
 * Update Customer Use Case (UC-ADMIN-006)
 *
 * Application use case for updating an existing customer's information.
 * This use case orchestrates domain entities and domain services to update a customer.
 *
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, or Owner role required)
 * - Validate input data and business rules
 * - Update Customer domain entity
 * - Persist updated customer via repository
 * - Create audit log entry with before/after values
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Customer } from '../domain/customer.entity';
import { Address } from '../../shared/domain/address.value-object';
import { EmailAddress } from '../../shared/domain/email-address.value-object';
import { PhoneNumber } from '../../shared/domain/phone-number.value-object';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
  update(customer: Customer): Promise<Customer>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface UpdateCustomerInput {
  id: string;
  fullName?: string;
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
export interface UpdateCustomerOutput {
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
export interface UpdateCustomerResult {
  success: boolean;
  customer?: UpdateCustomerOutput;
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

export class NotFoundError extends ApplicationError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

export class RepositoryError extends ApplicationError {
  constructor(message: string = 'An error occurred during persistence') {
    super('REPOSITORY_ERROR', message);
    this.name = 'RepositoryError';
  }
}

/**
 * Update Customer Use Case
 */
export class UpdateCustomerUseCase {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly userRepository: UserRepository,
    private readonly auditLogDomainService: AuditLogDomainService,
    private readonly generateId: () => string = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  ) {}

  /**
   * Executes the update customer use case
   *
   * @param input - Input data for updating customer
   * @returns Result containing updated customer or error
   */
  async execute(input: UpdateCustomerInput): Promise<UpdateCustomerResult> {
    try {
      // 1. Validate at least one field is provided
      this.validateAtLeastOneFieldProvided(input);

      // 2. Load existing customer
      const existingCustomer = await this.loadCustomer(input.id);

      // 3. Validate user exists and has required role
      await this.validateUserAuthorization(input.performedBy);

      // 4. Validate and normalize input data
      const validatedUpdates = this.validateAndNormalizeInput(input);

      // 5. Capture before state for audit log
      const beforeState = this.captureBeforeState(existingCustomer);

      // 6. Update Customer domain entity
      this.updateCustomerEntity(existingCustomer, validatedUpdates);

      // 7. Persist updated customer via repository
      const savedCustomer = await this.persistCustomer(existingCustomer);

      // 8. Create audit log entry
      await this.createAuditLog(savedCustomer, beforeState, input.performedBy);

      // 9. Return success result
      return {
        success: true,
        customer: this.mapToOutput(savedCustomer),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates that at least one field is provided for update
   *
   * @param input - Input data
   * @throws ValidationError if no fields provided
   */
  private validateAtLeastOneFieldProvided(input: UpdateCustomerInput): void {
    const hasField =
      input.fullName !== undefined ||
      input.email !== undefined ||
      input.phone !== undefined ||
      input.address !== undefined ||
      input.consentMarketing !== undefined ||
      input.consentReminders !== undefined;

    if (!hasField) {
      throw new ValidationError('At least one field must be provided for update');
    }
  }

  /**
   * Loads existing customer by ID
   *
   * @param customerId - Customer ID
   * @returns Customer entity
   * @throws NotFoundError if customer not found
   */
  private async loadCustomer(customerId: string): Promise<Customer> {
    const customer = await this.customerRepository.findById(customerId);

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return customer;
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
      throw new ForbiddenError('Only Staff, Manager, or Owner role can update customers');
    }
  }

  /**
   * Validates and normalizes input data
   *
   * @param input - Raw input data
   * @returns Validated and normalized updates
   * @throws ValidationError if validation fails
   */
  private validateAndNormalizeInput(input: UpdateCustomerInput): {
    fullName?: string;
    email?: EmailAddress;
    phone?: PhoneNumber;
    address?: Address;
    consentMarketing?: boolean;
    consentReminders?: boolean;
  } {
    const updates: {
      fullName?: string;
      email?: EmailAddress;
      phone?: PhoneNumber;
      address?: Address;
      consentMarketing?: boolean;
      consentReminders?: boolean;
    } = {};

    if (input.fullName !== undefined) {
      if (!input.fullName || input.fullName.trim().length === 0) {
        throw new ValidationError('Full name cannot be empty');
      }
      updates.fullName = input.fullName.trim();
    }

    if (input.email !== undefined) {
      if (input.email === null || input.email === '') {
        updates.email = undefined;
      } else {
        try {
          updates.email = new EmailAddress(input.email);
        } catch (error: any) {
          throw new ValidationError(`Invalid email: ${error.message}`);
        }
      }
    }

    if (input.phone !== undefined) {
      if (input.phone === null || input.phone === '') {
        updates.phone = undefined;
      } else {
        try {
          updates.phone = new PhoneNumber(input.phone);
        } catch (error: any) {
          throw new ValidationError(`Invalid phone number: ${error.message}`);
        }
      }
    }

    if (input.address !== undefined) {
      if (input.address === null) {
        updates.address = undefined;
      } else {
        try {
          updates.address = new Address(
            input.address.street,
            input.address.city,
            input.address.postalCode,
            input.address.country,
          );
        } catch (error: any) {
          throw new ValidationError(`Invalid address: ${error.message}`);
        }
      }
    }

    if (input.consentMarketing !== undefined) {
      if (typeof input.consentMarketing !== 'boolean') {
        throw new ValidationError('Consent marketing must be a boolean value');
      }
      updates.consentMarketing = input.consentMarketing;
    }

    if (input.consentReminders !== undefined) {
      if (typeof input.consentReminders !== 'boolean') {
        throw new ValidationError('Consent reminders must be a boolean value');
      }
      updates.consentReminders = input.consentReminders;
    }

    return updates;
  }

  /**
   * Captures before state for audit log
   *
   * @param customer - Customer entity
   * @returns Before state object
   */
  private captureBeforeState(customer: Customer): Record<string, unknown> {
    return {
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      consentMarketing: customer.consentMarketing,
      consentReminders: customer.consentReminders,
    };
  }

  /**
   * Updates Customer domain entity with validated updates
   *
   * @param customer - Existing customer entity
   * @param updates - Validated update data
   */
  private updateCustomerEntity(
    customer: Customer,
    updates: {
      fullName?: string;
      email?: EmailAddress;
      phone?: PhoneNumber;
      address?: Address;
      consentMarketing?: boolean;
      consentReminders?: boolean;
    },
  ): void {
    if (updates.fullName !== undefined) {
      customer.updateFullName(updates.fullName);
    }

    if (updates.email !== undefined) {
      customer.updateEmail(updates.email?.value);
    }

    if (updates.phone !== undefined) {
      customer.updatePhone(updates.phone?.value);
    }

    if (updates.address !== undefined) {
      customer.updateAddress(
        updates.address
          ? {
              street: updates.address.street,
              city: updates.address.city,
              postalCode: updates.address.postalCode,
              country: updates.address.country,
            }
          : undefined,
      );
    }

    if (updates.consentMarketing !== undefined) {
      customer.updateConsentMarketing(updates.consentMarketing);
    }

    if (updates.consentReminders !== undefined) {
      customer.updateConsentReminders(updates.consentReminders);
    }
  }

  /**
   * Persists updated customer via repository
   *
   * @param customer - Updated customer entity
   * @returns Persisted customer entity
   * @throws RepositoryError if persistence fails
   */
  private async persistCustomer(customer: Customer): Promise<Customer> {
    try {
      return await this.customerRepository.update(customer);
    } catch (error: any) {
      throw new RepositoryError(`Failed to update customer: ${error.message}`);
    }
  }

  /**
   * Creates audit log entry for customer update
   *
   * @param customer - Updated customer entity
   * @param beforeState - Before state for audit log
   * @param performedBy - User ID who performed the action
   */
  private async createAuditLog(
    customer: Customer,
    beforeState: Record<string, unknown>,
    performedBy: string,
  ): Promise<void> {
    try {
      const afterState: Record<string, unknown> = {
        id: customer.id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        consentMarketing: customer.consentMarketing,
        consentReminders: customer.consentReminders,
      };

      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Customer',
        customer.id,
        AuditAction.UPDATE,
        performedBy,
        this.auditLogDomainService.createUpdateMetadata(beforeState, afterState),
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
  private mapToOutput(customer: Customer): UpdateCustomerOutput {
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
  private handleError(error: unknown): UpdateCustomerResult {
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
