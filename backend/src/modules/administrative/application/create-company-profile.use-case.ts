/**
 * Create Company Profile Use Case (UC-ADMIN-001)
 * 
 * Application use case for creating a new company/business profile with fiscal data.
 * This use case orchestrates domain entities and domain services to create a company profile.
 * 
 * Responsibilities:
 * - Validate user authorization (Owner role required)
 * - Validate input data and business rules
 * - Check NIF uniqueness
 * - Create Company domain entity
 * - Persist company via repository
 * - Create audit log entry
 * 
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Company } from '../domain/company.entity';
import { PortugueseNIF } from '../../shared/domain/portuguese-nif.value-object';
import { Address } from '../../shared/domain/address.value-object';
import { VATRate } from '../../shared/domain/vat-rate.value-object';
import { EmailAddress } from '../../shared/domain/email-address.value-object';
import { PhoneNumber } from '../../shared/domain/phone-number.value-object';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface CompanyRepository {
  save(company: Company): Promise<Company>;
  findByNif(nif: string): Promise<Company | null>;
  findById(id: string): Promise<Company | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface CreateCompanyProfileInput {
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
  phone?: string;
  email?: string;
  website?: string;
  performedBy: string; // User ID
}

// Output model
export interface CreateCompanyProfileOutput {
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
export interface CreateCompanyProfileResult {
  success: boolean;
  company?: CreateCompanyProfileOutput;
  error?: {
    code: string;
    message: string;
  };
}

// Application errors
export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string
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

export class DuplicateNifError extends ApplicationError {
  constructor(message: string = 'A company with this NIF already exists') {
    super('DUPLICATE_NIF', message);
    this.name = 'DuplicateNifError';
  }
}

export class RepositoryError extends ApplicationError {
  constructor(message: string = 'An error occurred during persistence') {
    super('REPOSITORY_ERROR', message);
    this.name = 'RepositoryError';
  }
}

/**
 * Create Company Profile Use Case
 */
export class CreateCompanyProfileUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly userRepository: UserRepository,
    private readonly auditLogDomainService: AuditLogDomainService,
    private readonly generateId: () => string = () => {
      // Simple UUID v4 generator (in production, use a proper UUID library)
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  ) {}

  /**
   * Executes the create company profile use case
   * 
   * @param input - Input data for creating company profile
   * @returns Result containing created company or error
   */
  async execute(input: CreateCompanyProfileInput): Promise<CreateCompanyProfileResult> {
    try {
      // 1. Validate user exists and has Owner role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate and normalize input data
      const validatedInput = this.validateInput(input);

      // 3. Check NIF uniqueness
      await this.checkNifUniqueness(validatedInput.nif);

      // 4. Create Company domain entity
      const company = this.createCompanyEntity(validatedInput);

      // 5. Persist company via repository
      const savedCompany = await this.persistCompany(company);

      // 6. Create audit log entry
      await this.createAuditLog(savedCompany, input.performedBy);

      // 7. Return success result
      return {
        success: true,
        company: this.mapToOutput(savedCompany),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization (must have Owner role)
   * 
   * @param userId - User ID to validate
   * @throws UnauthorizedError if user not found
   * @throws ForbiddenError if user does not have Owner role
   */
  private async validateUserAuthorization(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Check if user has Owner role
    const hasOwnerRole = user.roleIds.some(roleId => {
      try {
        const role = RoleId.fromString(roleId);
        return role ? role.isOwner() : false;
      } catch {
        return false;
      }
    });

    if (!hasOwnerRole) {
      throw new ForbiddenError('Only Owner role can create company profiles');
    }
  }

  /**
   * Validates and normalizes input data
   * 
   * @param input - Raw input data
   * @returns Validated and normalized input
   * @throws ValidationError if validation fails
   */
  private validateInput(input: CreateCompanyProfileInput): {
    name: string;
    nif: PortugueseNIF;
    address: Address;
    taxRegime: string;
    defaultVatRate?: VATRate;
    phone?: PhoneNumber;
    email?: EmailAddress;
    website?: string;
    performedBy: string;
  } {
    // Validate required fields
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError('Company name is required');
    }

    if (!input.taxRegime || input.taxRegime.trim().length === 0) {
      throw new ValidationError('Tax regime is required');
    }

    if (!input.address) {
      throw new ValidationError('Address is required');
    }

    // Validate and create value objects
    let nif: PortugueseNIF;
    try {
      nif = new PortugueseNIF(input.nif);
    } catch (error: any) {
      throw new ValidationError(`Invalid NIF: ${error.message}`);
    }

    let address: Address;
    try {
      address = new Address(
        input.address.street,
        input.address.city,
        input.address.postalCode,
        input.address.country
      );
    } catch (error: any) {
      throw new ValidationError(`Invalid address: ${error.message}`);
    }

    let defaultVatRate: VATRate | undefined;
    if (input.defaultVatRate !== undefined) {
      try {
        defaultVatRate = new VATRate(input.defaultVatRate);
      } catch (error: any) {
        throw new ValidationError(`Invalid VAT rate: ${error.message}`);
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

    let email: EmailAddress | undefined;
    if (input.email) {
      try {
        email = new EmailAddress(input.email);
      } catch (error: any) {
        throw new ValidationError(`Invalid email: ${error.message}`);
      }
    }

    // Validate website URL format if provided
    if (input.website) {
      try {
        new URL(input.website);
      } catch {
        throw new ValidationError('Invalid website URL format');
      }
    }

    return {
      name: input.name.trim(),
      nif,
      address,
      taxRegime: input.taxRegime.trim(),
      defaultVatRate,
      phone,
      email,
      website: input.website?.trim(),
      performedBy: input.performedBy,
    };
  }

  /**
   * Checks if NIF is unique
   * 
   * @param nif - Portuguese NIF value object
   * @throws DuplicateNifError if NIF already exists
   */
  private async checkNifUniqueness(nif: PortugueseNIF): Promise<void> {
    const existingCompany = await this.companyRepository.findByNif(nif.value);
    
    if (existingCompany) {
      throw new DuplicateNifError('A company with this NIF already exists');
    }
  }

  /**
   * Creates Company domain entity
   * 
   * @param validatedInput - Validated input data
   * @returns Company domain entity
   */
  private createCompanyEntity(validatedInput: {
    name: string;
    nif: PortugueseNIF;
    address: Address;
    taxRegime: string;
    defaultVatRate?: VATRate;
    phone?: PhoneNumber;
    email?: EmailAddress;
    website?: string;
  }): Company {
    const companyId = this.generateId();
    const now = new Date();

    // Convert value objects to plain types for Company entity constructor
    // (Company entity currently uses plain types, not value objects)
    return new Company(
      companyId,
      validatedInput.name,
      validatedInput.nif.value,
      {
        street: validatedInput.address.street,
        city: validatedInput.address.city,
        postalCode: validatedInput.address.postalCode,
        country: validatedInput.address.country,
      },
      validatedInput.taxRegime,
      validatedInput.defaultVatRate?.value,
      validatedInput.phone?.value,
      validatedInput.email?.value,
      validatedInput.website,
      now,
      now
    );
  }

  /**
   * Persists company via repository
   * 
   * @param company - Company domain entity
   * @returns Persisted company entity
   * @throws RepositoryError if persistence fails
   */
  private async persistCompany(company: Company): Promise<Company> {
    try {
      return await this.companyRepository.save(company);
    } catch (error: any) {
      throw new RepositoryError(`Failed to save company: ${error.message}`);
    }
  }

  /**
   * Creates audit log entry for company creation
   * 
   * @param company - Created company entity
   * @param performedBy - User ID who performed the action
   */
  private async createAuditLog(company: Company, performedBy: string): Promise<void> {
    try {
      // Use AuditLogDomainService to create audit entry
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Company',
        company.id,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            id: company.id,
            name: company.name,
            nif: company.nif,
            taxRegime: company.taxRegime,
          },
        },
        new Date()
      );

      if (result.auditLog) {
        await this.auditLogRepository.save(result.auditLog);
      }
    } catch (error: any) {
      // Log error but don't fail the use case if audit logging fails
      // In production, consider using a separate error handling mechanism
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Maps Company domain entity to output model
   * 
   * @param company - Company domain entity
   * @returns Output model
   */
  private mapToOutput(company: Company): CreateCompanyProfileOutput {
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
   * 
   * @param error - Error that occurred
   * @returns Error result
   */
  private handleError(error: unknown): CreateCompanyProfileResult {
    if (error instanceof ApplicationError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      };
    }

    // Unknown error
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    };
  }
}

