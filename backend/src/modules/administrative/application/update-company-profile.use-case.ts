/**
 * Update Company Profile Use Case (UC-ADMIN-002)
 *
 * Application use case for updating an existing company/business profile.
 * This use case orchestrates domain entities and domain services to update a company profile
 * while enforcing role-based restrictions on fiscal fields.
 *
 * Responsibilities:
 * - Validate user authorization (Owner or Manager role)
 * - Validate field-level permissions (fiscal fields require Owner role)
 * - Validate input data and business rules
 * - Check NIF uniqueness if NIF is being changed
 * - Update Company domain entity
 * - Persist updated company via repository
 * - Create audit log entry with before/after values
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
  findById(id: string): Promise<Company | null>;
  update(company: Company): Promise<Company>;
  findByNif(nif: string): Promise<Company | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface UpdateCompanyProfileInput {
  id: string;
  name?: string;
  nif?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country?: string;
  };
  taxRegime?: string;
  defaultVatRate?: number;
  phone?: string;
  email?: string;
  website?: string;
  performedBy: string; // User ID
}

// Output model
export interface UpdateCompanyProfileOutput {
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
export interface UpdateCompanyProfileResult {
  success: boolean;
  company?: UpdateCompanyProfileOutput;
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
 * Update Company Profile Use Case
 */
export class UpdateCompanyProfileUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
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
   * Executes the update company profile use case
   *
   * @param input - Input data for updating company profile
   * @returns Result containing updated company or error
   */
  async execute(input: UpdateCompanyProfileInput): Promise<UpdateCompanyProfileResult> {
    try {
      // 1. Validate at least one field is provided
      this.validateAtLeastOneFieldProvided(input);

      // 2. Load existing company
      const existingCompany = await this.loadCompany(input.id);

      // 3. Validate user exists and get role
      const user = await this.validateUser(input.performedBy);
      const isOwner = this.isOwnerRole(user.roleIds);
      const isManager = this.isManagerRole(user.roleIds);

      if (!isOwner && !isManager) {
        throw new ForbiddenError('Only Owner or Manager role can update company profiles');
      }

      // 4. Validate fiscal field access (Manager cannot update fiscal fields)
      this.validateFiscalFieldAccess(input, isOwner);

      // 5. Validate and normalize input data
      const validatedUpdates = await this.validateAndNormalizeInput(
        input,
        existingCompany,
        isOwner,
      );

      // 6. Check NIF uniqueness if NIF is being changed
      if (validatedUpdates.nif && existingCompany.nif !== validatedUpdates.nif.value) {
        await this.checkNifUniqueness(validatedUpdates.nif, existingCompany.id);
      }

      // 7. Capture before state for audit log
      const beforeState = this.captureBeforeState(existingCompany);

      // 8. Update Company domain entity
      const updatedCompany = this.updateCompanyEntity(existingCompany, validatedUpdates);

      // 9. Persist updated company via repository
      const savedCompany = await this.persistCompany(updatedCompany);

      // 10. Create audit log entry
      await this.createAuditLog(savedCompany, beforeState, input.performedBy);

      // 11. Return success result
      return {
        success: true,
        company: this.mapToOutput(savedCompany),
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
  private validateAtLeastOneFieldProvided(input: UpdateCompanyProfileInput): void {
    const hasField =
      input.name !== undefined ||
      input.nif !== undefined ||
      input.address !== undefined ||
      input.taxRegime !== undefined ||
      input.defaultVatRate !== undefined ||
      input.phone !== undefined ||
      input.email !== undefined ||
      input.website !== undefined;

    if (!hasField) {
      throw new ValidationError('At least one field must be provided for update');
    }
  }

  /**
   * Loads existing company by ID
   *
   * @param companyId - Company ID
   * @returns Company entity
   * @throws NotFoundError if company not found
   */
  private async loadCompany(companyId: string): Promise<Company> {
    const company = await this.companyRepository.findById(companyId);

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    return company;
  }

  /**
   * Validates user exists
   *
   * @param userId - User ID
   * @returns User data
   * @throws UnauthorizedError if user not found
   */
  private async validateUser(userId: string): Promise<{ id: string; roleIds: string[] }> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return user;
  }

  /**
   * Checks if user has Owner role
   *
   * @param roleIds - User role IDs
   * @returns True if user has Owner role
   */
  private isOwnerRole(roleIds: string[]): boolean {
    return roleIds.some((roleId) => {
      try {
        const role = RoleId.fromString(roleId);
        return role ? role.isOwner() : false;
      } catch {
        return false;
      }
    });
  }

  /**
   * Checks if user has Manager role
   *
   * @param roleIds - User role IDs
   * @returns True if user has Manager role
   */
  private isManagerRole(roleIds: string[]): boolean {
    return roleIds.some((roleId) => {
      try {
        const role = RoleId.fromString(roleId);
        return role ? role.isManager() : false;
      } catch {
        return false;
      }
    });
  }

  /**
   * Validates fiscal field access (Manager cannot update fiscal fields)
   *
   * @param input - Input data
   * @param isOwner - Whether user is Owner
   * @throws ForbiddenError if Manager tries to update fiscal fields
   */
  private validateFiscalFieldAccess(input: UpdateCompanyProfileInput, isOwner: boolean): void {
    if (!isOwner && (input.nif !== undefined || input.taxRegime !== undefined)) {
      throw new ForbiddenError('Only Owner role can update fiscal fields (NIF, tax_regime)');
    }
  }

  /**
   * Validates and normalizes input data
   *
   * @param input - Raw input data
   * @param existingCompany - Existing company entity
   * @param isOwner - Whether user is Owner
   * @returns Validated and normalized updates
   * @throws ValidationError if validation fails
   */
  private async validateAndNormalizeInput(
    input: UpdateCompanyProfileInput,
    existingCompany: Company,
    isOwner: boolean,
  ): Promise<{
    name?: string;
    nif?: PortugueseNIF;
    address?: Address;
    taxRegime?: string;
    defaultVatRate?: VATRate;
    phone?: PhoneNumber;
    email?: EmailAddress;
    website?: string;
  }> {
    const updates: {
      name?: string;
      nif?: PortugueseNIF;
      address?: Address;
      taxRegime?: string;
      defaultVatRate?: VATRate;
      phone?: PhoneNumber;
      email?: EmailAddress;
      website?: string;
    } = {};

    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        throw new ValidationError('Company name cannot be empty');
      }
      updates.name = input.name.trim();
    }

    if (input.nif !== undefined && isOwner) {
      try {
        updates.nif = new PortugueseNIF(input.nif);
      } catch (error: any) {
        throw new ValidationError(`Invalid NIF: ${error.message}`);
      }
    }

    if (input.address !== undefined) {
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

    if (input.taxRegime !== undefined && isOwner) {
      if (!input.taxRegime || input.taxRegime.trim().length === 0) {
        throw new ValidationError('Tax regime cannot be empty');
      }
      updates.taxRegime = input.taxRegime.trim();
    }

    if (input.defaultVatRate !== undefined) {
      try {
        updates.defaultVatRate = new VATRate(input.defaultVatRate);
      } catch (error: any) {
        throw new ValidationError(`Invalid VAT rate: ${error.message}`);
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

    if (input.website !== undefined) {
      if (input.website === null || input.website === '') {
        updates.website = undefined;
      } else {
        try {
          new URL(input.website);
          updates.website = input.website.trim();
        } catch {
          throw new ValidationError('Invalid website URL format');
        }
      }
    }

    return updates;
  }

  /**
   * Checks if NIF is unique (excluding current company)
   *
   * @param nif - Portuguese NIF value object
   * @param excludeCompanyId - Company ID to exclude from uniqueness check
   * @throws DuplicateNifError if NIF already exists
   */
  private async checkNifUniqueness(nif: PortugueseNIF, excludeCompanyId: string): Promise<void> {
    const existingCompany = await this.companyRepository.findByNif(nif.value);

    if (existingCompany && existingCompany.id !== excludeCompanyId) {
      throw new DuplicateNifError('A company with this NIF already exists');
    }
  }

  /**
   * Captures before state for audit log
   *
   * @param company - Company entity
   * @returns Before state object
   */
  private captureBeforeState(company: Company): Record<string, unknown> {
    return {
      id: company.id,
      name: company.name,
      nif: company.nif,
      taxRegime: company.taxRegime,
      defaultVatRate: company.defaultVatRate,
      phone: company.phone,
      email: company.email,
      website: company.website,
    };
  }

  /**
   * Updates Company domain entity with validated updates
   *
   * @param existingCompany - Existing company entity
   * @param updates - Validated update data
   * @returns Updated company entity
   */
  private updateCompanyEntity(
    existingCompany: Company,
    updates: {
      name?: string;
      nif?: PortugueseNIF;
      address?: Address;
      taxRegime?: string;
      defaultVatRate?: VATRate;
      phone?: PhoneNumber;
      email?: EmailAddress;
      website?: string;
    },
  ): Company {
    // Use Company entity's update methods
    if (updates.name !== undefined) {
      existingCompany.updateName(updates.name);
    }

    if (updates.nif !== undefined) {
      existingCompany.updateNif(updates.nif.value);
    }

    if (updates.address !== undefined) {
      existingCompany.updateAddress({
        street: updates.address.street,
        city: updates.address.city,
        postalCode: updates.address.postalCode,
        country: updates.address.country,
      });
    }

    if (updates.taxRegime !== undefined) {
      existingCompany.updateTaxRegime(updates.taxRegime);
    }

    if (updates.defaultVatRate !== undefined) {
      existingCompany.updateDefaultVatRate(updates.defaultVatRate.value);
    }

    if (updates.phone !== undefined) {
      existingCompany.updatePhone(updates.phone.value);
    }

    if (updates.email !== undefined) {
      existingCompany.updateEmail(updates.email.value);
    }

    if (updates.website !== undefined) {
      existingCompany.updateWebsite(updates.website);
    }

    return existingCompany;
  }

  /**
   * Persists updated company via repository
   *
   * @param company - Updated company entity
   * @returns Persisted company entity
   * @throws RepositoryError if persistence fails
   */
  private async persistCompany(company: Company): Promise<Company> {
    try {
      return await this.companyRepository.update(company);
    } catch (error: any) {
      throw new RepositoryError(`Failed to update company: ${error.message}`);
    }
  }

  /**
   * Creates audit log entry for company update
   *
   * @param company - Updated company entity
   * @param beforeState - Before state for audit log
   * @param performedBy - User ID who performed the action
   */
  private async createAuditLog(
    company: Company,
    beforeState: Record<string, unknown>,
    performedBy: string,
  ): Promise<void> {
    try {
      const afterState: Record<string, unknown> = {
        id: company.id,
        name: company.name,
        nif: company.nif,
        taxRegime: company.taxRegime,
        defaultVatRate: company.defaultVatRate,
        phone: company.phone,
        email: company.email,
        website: company.website,
      };

      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Company',
        company.id,
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
   * Maps Company domain entity to output model
   *
   * @param company - Company domain entity
   * @returns Output model
   */
  private mapToOutput(company: Company): UpdateCompanyProfileOutput {
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
  private handleError(error: unknown): UpdateCompanyProfileResult {
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
