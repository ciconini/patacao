/**
 * Create Store Use Case (UC-ADMIN-003)
 * 
 * Application use case for creating a new store location associated with a company.
 * This use case orchestrates domain entities and domain services to create a store.
 * 
 * Responsibilities:
 * - Validate user authorization (Owner or Manager role required)
 * - Validate company exists and user has access
 * - Validate input data and business rules
 * - Create Store domain entity
 * - Persist store via repository
 * - Create audit log entry
 * 
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Store, WeeklyOpeningHours, DayOpeningHours } from '../domain/store.entity';
import { Company } from '../domain/company.entity';
import { Address } from '../../shared/domain/address.value-object';
import { EmailAddress } from '../../shared/domain/email-address.value-object';
import { PhoneNumber } from '../../shared/domain/phone-number.value-object';
import { OpeningHours } from '../../shared/domain/opening-hours.value-object';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface StoreRepository {
  save(store: Store): Promise<Store>;
}

export interface CompanyRepository {
  findById(id: string): Promise<Company | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
  hasCompanyAccess?(userId: string, companyId: string): Promise<boolean>;
}

// Input model
export interface CreateStoreInput {
  companyId: string;
  name: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country?: string;
  };
  email?: string;
  phone?: string;
  openingHours: {
    monday?: { open?: string; close?: string; closed?: boolean };
    tuesday?: { open?: string; close?: string; closed?: boolean };
    wednesday?: { open?: string; close?: string; closed?: boolean };
    thursday?: { open?: string; close?: string; closed?: boolean };
    friday?: { open?: string; close?: string; closed?: boolean };
    saturday?: { open?: string; close?: string; closed?: boolean };
    sunday?: { open?: string; close?: string; closed?: boolean };
  };
  timezone?: string;
  performedBy: string; // User ID
}

// Output model
export interface CreateStoreOutput {
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
export interface CreateStoreResult {
  success: boolean;
  store?: CreateStoreOutput;
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
 * Create Store Use Case
 */
export class CreateStoreUseCase {
  private static readonly DEFAULT_TIMEZONE = 'Europe/Lisbon';
  private static readonly REQUIRED_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

  constructor(
    private readonly storeRepository: StoreRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly userRepository: UserRepository,
    private readonly auditLogDomainService: AuditLogDomainService,
    private readonly generateId: () => string = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  ) {}

  /**
   * Executes the create store use case
   * 
   * @param input - Input data for creating store
   * @returns Result containing created store or error
   */
  async execute(input: CreateStoreInput): Promise<CreateStoreResult> {
    try {
      // 1. Validate user exists and has Owner or Manager role
      const user = await this.validateUserAuthorization(input.performedBy);

      // 2. Validate and load company
      const company = await this.validateCompany(input.companyId);

      // 3. Validate user has access to company
      await this.validateCompanyAccess(input.performedBy, input.companyId);

      // 4. Validate and normalize input data
      const validatedInput = this.validateInput(input);

      // 5. Create Store domain entity
      const store = this.createStoreEntity(validatedInput, input.companyId);

      // 6. Persist store via repository
      const savedStore = await this.persistStore(store);

      // 7. Create audit log entry
      await this.createAuditLog(savedStore, input.performedBy);

      // 8. Return success result
      return {
        success: true,
        store: this.mapToOutput(savedStore),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization (must have Owner or Manager role)
   * 
   * @param userId - User ID to validate
   * @returns User data
   * @throws UnauthorizedError if user not found
   * @throws ForbiddenError if user does not have required role
   */
  private async validateUserAuthorization(userId: string): Promise<{ id: string; roleIds: string[] }> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const hasOwnerOrManagerRole = user.roleIds.some(roleId => {
      try {
        const role = RoleId.fromString(roleId);
        return role ? (role.isOwner() || role.isManager()) : false;
      } catch {
        return false;
      }
    });

    if (!hasOwnerOrManagerRole) {
      throw new ForbiddenError('Only Owner or Manager role can create stores');
    }

    return user;
  }

  /**
   * Validates and loads company
   * 
   * @param companyId - Company ID
   * @returns Company entity
   * @throws NotFoundError if company not found
   */
  private async validateCompany(companyId: string): Promise<Company> {
    const company = await this.companyRepository.findById(companyId);
    
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    return company;
  }

  /**
   * Validates user has access to company
   * 
   * @param userId - User ID
   * @param companyId - Company ID
   * @throws ForbiddenError if user does not have access
   */
  private async validateCompanyAccess(userId: string, companyId: string): Promise<void> {
    // If hasCompanyAccess method exists, use it
    if (this.userRepository.hasCompanyAccess) {
      const hasAccess = await this.userRepository.hasCompanyAccess(userId, companyId);
      if (!hasAccess) {
        throw new ForbiddenError('You do not have access to this company');
      }
    }
    // Otherwise, Owner and Manager roles are assumed to have access to all companies
    // This is a business rule that can be refined later
  }

  /**
   * Validates and normalizes input data
   * 
   * @param input - Raw input data
   * @returns Validated and normalized input
   * @throws ValidationError if validation fails
   */
  private validateInput(input: CreateStoreInput): {
    name: string;
    address?: Address;
    email?: EmailAddress;
    phone?: PhoneNumber;
    openingHours: WeeklyOpeningHours;
    timezone: string;
  } {
    // Validate required fields
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError('Store name is required');
    }

    if (!input.openingHours) {
      throw new ValidationError('Opening hours are required');
    }

    // Validate opening hours structure
    const validatedOpeningHours = this.validateOpeningHours(input.openingHours);

    // Validate and create value objects
    let address: Address | undefined;
    if (input.address) {
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
    }

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

    // Validate timezone
    const timezone = input.timezone || CreateStoreUseCase.DEFAULT_TIMEZONE;
    // Basic timezone validation (in production, use a proper timezone library)
    if (!timezone || timezone.trim().length === 0) {
      throw new ValidationError('Timezone cannot be empty');
    }

    return {
      name: input.name.trim(),
      address,
      email,
      phone,
      openingHours: validatedOpeningHours,
      timezone,
    };
  }

  /**
   * Validates opening hours structure
   * 
   * @param openingHours - Opening hours input
   * @returns Validated WeeklyOpeningHours
   * @throws ValidationError if validation fails
   */
  private validateOpeningHours(openingHours: CreateStoreInput['openingHours']): WeeklyOpeningHours {
    const validated: any = {};

    // Validate all 7 days are present
    for (const day of CreateStoreUseCase.REQUIRED_DAYS) {
      const dayHours = openingHours[day];
      
      if (!dayHours) {
        throw new ValidationError(`Opening hours must contain all 7 days of week. Missing: ${day}`);
      }

      const isClosed = dayHours.closed === true;

      if (isClosed) {
        validated[day] = { isOpen: false };
      } else {
        // If not closed, must have open and close times
        if (!dayHours.open || !dayHours.close) {
          throw new ValidationError(`Opening hours for ${day} must have open and close times when not closed`);
        }

        // Validate time format using OpeningHours value object
        try {
          const openingHoursVO = OpeningHours.open(dayHours.open, dayHours.close);
          validated[day] = {
            isOpen: true,
            openTime: openingHoursVO.openTime!,
            closeTime: openingHoursVO.closeTime!,
          };
        } catch (error: any) {
          throw new ValidationError(`Invalid opening hours for ${day}: ${error.message}`);
        }
      }
    }

    return validated as WeeklyOpeningHours;
  }

  /**
   * Creates Store domain entity
   * 
   * @param validatedInput - Validated input data
   * @param companyId - Company ID
   * @returns Store domain entity
   */
  private createStoreEntity(
    validatedInput: {
      name: string;
      address?: Address;
      email?: EmailAddress;
      phone?: PhoneNumber;
      openingHours: WeeklyOpeningHours;
      timezone: string;
    },
    companyId: string
  ): Store {
    const storeId = this.generateId();
    const now = new Date();

    return new Store(
      storeId,
      companyId,
      validatedInput.name,
      validatedInput.openingHours,
      validatedInput.address ? {
        street: validatedInput.address.street,
        city: validatedInput.address.city,
        postalCode: validatedInput.address.postalCode,
        country: validatedInput.address.country,
      } : undefined,
      validatedInput.email?.value,
      validatedInput.phone?.value,
      validatedInput.timezone,
      now,
      now
    );
  }

  /**
   * Persists store via repository
   * 
   * @param store - Store domain entity
   * @returns Persisted store entity
   * @throws RepositoryError if persistence fails
   */
  private async persistStore(store: Store): Promise<Store> {
    try {
      return await this.storeRepository.save(store);
    } catch (error: any) {
      throw new RepositoryError(`Failed to save store: ${error.message}`);
    }
  }

  /**
   * Creates audit log entry for store creation
   * 
   * @param store - Created store entity
   * @param performedBy - User ID who performed the action
   */
  private async createAuditLog(store: Store, performedBy: string): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Store',
        store.id,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            id: store.id,
            companyId: store.companyId,
            name: store.name,
            timezone: store.timezone,
          },
        },
        new Date()
      );

      if (result.auditLog) {
        await this.auditLogRepository.save(result.auditLog);
      }
    } catch (error: any) {
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Maps Store domain entity to output model
   * 
   * @param store - Store domain entity
   * @returns Output model
   */
  private mapToOutput(store: Store): CreateStoreOutput {
    return {
      id: store.id,
      companyId: store.companyId,
      name: store.name,
      address: store.address ? {
        street: store.address.street,
        city: store.address.city,
        postalCode: store.address.postalCode,
        country: store.address.country,
      } : undefined,
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
   * 
   * @param error - Error that occurred
   * @returns Error result
   */
  private handleError(error: unknown): CreateStoreResult {
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

