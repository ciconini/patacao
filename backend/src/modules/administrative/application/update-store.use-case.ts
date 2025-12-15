/**
 * Update Store Use Case (UC-ADMIN-004)
 * 
 * Application use case for updating an existing store's information.
 * This use case orchestrates domain entities and domain services to update a store.
 * 
 * Responsibilities:
 * - Validate user authorization (Owner or Manager role required)
 * - Validate store exists and user has access to its company
 * - Validate input data and business rules
 * - Update Store domain entity
 * - Persist updated store via repository
 * - Create audit log entry with before/after values
 * 
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Store, WeeklyOpeningHours } from '../domain/store.entity';
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
  findById(id: string): Promise<Store | null>;
  update(store: Store): Promise<Store>;
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
export interface UpdateStoreInput {
  id: string;
  name?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country?: string;
  };
  email?: string;
  phone?: string;
  openingHours?: {
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
export interface UpdateStoreOutput {
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
export interface UpdateStoreResult {
  success: boolean;
  store?: UpdateStoreOutput;
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
 * Update Store Use Case
 */
export class UpdateStoreUseCase {
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
   * Executes the update store use case
   * 
   * @param input - Input data for updating store
   * @returns Result containing updated store or error
   */
  async execute(input: UpdateStoreInput): Promise<UpdateStoreResult> {
    try {
      // 1. Validate at least one field is provided
      this.validateAtLeastOneFieldProvided(input);

      // 2. Load existing store
      const existingStore = await this.loadStore(input.id);

      // 3. Load company and validate user access
      const company = await this.validateCompany(existingStore.companyId);
      await this.validateUserAndAccess(input.performedBy, existingStore.companyId);

      // 4. Validate and normalize input data
      const validatedUpdates = this.validateAndNormalizeInput(input);

      // 5. Capture before state for audit log
      const beforeState = this.captureBeforeState(existingStore);

      // 6. Update Store domain entity
      this.updateStoreEntity(existingStore, validatedUpdates);

      // 7. Persist updated store via repository
      const savedStore = await this.persistStore(existingStore);

      // 8. Create audit log entry
      await this.createAuditLog(savedStore, beforeState, input.performedBy);

      // 9. Return success result
      return {
        success: true,
        store: this.mapToOutput(savedStore),
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
  private validateAtLeastOneFieldProvided(input: UpdateStoreInput): void {
    const hasField = 
      input.name !== undefined ||
      input.address !== undefined ||
      input.email !== undefined ||
      input.phone !== undefined ||
      input.openingHours !== undefined ||
      input.timezone !== undefined;

    if (!hasField) {
      throw new ValidationError('At least one field must be provided for update');
    }
  }

  /**
   * Loads existing store by ID
   * 
   * @param storeId - Store ID
   * @returns Store entity
   * @throws NotFoundError if store not found
   */
  private async loadStore(storeId: string): Promise<Store> {
    const store = await this.storeRepository.findById(storeId);
    
    if (!store) {
      throw new NotFoundError('Store not found');
    }

    return store;
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
   * Validates user exists, has required role, and has access to company
   * 
   * @param userId - User ID
   * @param companyId - Company ID
   * @throws UnauthorizedError if user not found
   * @throws ForbiddenError if user lacks required role or access
   */
  private async validateUserAndAccess(userId: string, companyId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const hasOwnerOrManagerRole = user.roleIds.some(roleId => {
      try {
        const role = RoleId.fromString(roleId);
        return role.isOwner() || role.isManager();
      } catch {
        return false;
      }
    });

    if (!hasOwnerOrManagerRole) {
      throw new ForbiddenError('Only Owner or Manager role can update stores');
    }

    // Validate company access
    if (this.userRepository.hasCompanyAccess) {
      const hasAccess = await this.userRepository.hasCompanyAccess(userId, companyId);
      if (!hasAccess) {
        throw new ForbiddenError('You do not have access to this store\'s company');
      }
    }
  }

  /**
   * Validates and normalizes input data
   * 
   * @param input - Raw input data
   * @returns Validated and normalized updates
   * @throws ValidationError if validation fails
   */
  private validateAndNormalizeInput(input: UpdateStoreInput): {
    name?: string;
    address?: Address;
    email?: EmailAddress;
    phone?: PhoneNumber;
    openingHours?: WeeklyOpeningHours;
    timezone?: string;
  } {
    const updates: {
      name?: string;
      address?: Address;
      email?: EmailAddress;
      phone?: PhoneNumber;
      openingHours?: WeeklyOpeningHours;
      timezone?: string;
    } = {};

    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        throw new ValidationError('Store name cannot be empty');
      }
      updates.name = input.name.trim();
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
            input.address.country
          );
        } catch (error: any) {
          throw new ValidationError(`Invalid address: ${error.message}`);
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

    if (input.openingHours !== undefined) {
      updates.openingHours = this.validateOpeningHours(input.openingHours);
    }

    if (input.timezone !== undefined) {
      if (!input.timezone || input.timezone.trim().length === 0) {
        throw new ValidationError('Timezone cannot be empty');
      }
      updates.timezone = input.timezone.trim();
    }

    return updates;
  }

  /**
   * Validates opening hours structure
   * 
   * @param openingHours - Opening hours input
   * @returns Validated WeeklyOpeningHours
   * @throws ValidationError if validation fails
   */
  private validateOpeningHours(openingHours: UpdateStoreInput['openingHours']): WeeklyOpeningHours {
    if (!openingHours) {
      throw new ValidationError('Opening hours cannot be null');
    }

    const validated: WeeklyOpeningHours = {};

    // Validate all 7 days are present
    for (const day of UpdateStoreUseCase.REQUIRED_DAYS) {
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

    return validated;
  }

  /**
   * Captures before state for audit log
   * 
   * @param store - Store entity
   * @returns Before state object
   */
  private captureBeforeState(store: Store): Record<string, unknown> {
    return {
      id: store.id,
      companyId: store.companyId,
      name: store.name,
      timezone: store.timezone,
      email: store.email,
      phone: store.phone,
    };
  }

  /**
   * Updates Store domain entity with validated updates
   * 
   * @param store - Existing store entity
   * @param updates - Validated update data
   */
  private updateStoreEntity(
    store: Store,
    updates: {
      name?: string;
      address?: Address;
      email?: EmailAddress;
      phone?: PhoneNumber;
      openingHours?: WeeklyOpeningHours;
      timezone?: string;
    }
  ): void {
    if (updates.name !== undefined) {
      store.updateName(updates.name);
    }

    if (updates.address !== undefined) {
      if (updates.address) {
        store.updateAddress({
          street: updates.address.street,
          city: updates.address.city,
          postalCode: updates.address.postalCode,
          country: updates.address.country,
        });
      } else {
        // Handle address removal if needed (Store entity may not support this)
        // For now, we'll skip if undefined
      }
    }

    if (updates.email !== undefined) {
      store.updateEmail(updates.email?.value);
    }

    if (updates.phone !== undefined) {
      store.updatePhone(updates.phone?.value);
    }

    if (updates.openingHours !== undefined) {
      store.updateOpeningHours(updates.openingHours);
    }

    if (updates.timezone !== undefined) {
      store.updateTimezone(updates.timezone);
    }
  }

  /**
   * Persists updated store via repository
   * 
   * @param store - Updated store entity
   * @returns Persisted store entity
   * @throws RepositoryError if persistence fails
   */
  private async persistStore(store: Store): Promise<Store> {
    try {
      return await this.storeRepository.update(store);
    } catch (error: any) {
      throw new RepositoryError(`Failed to update store: ${error.message}`);
    }
  }

  /**
   * Creates audit log entry for store update
   * 
   * @param store - Updated store entity
   * @param beforeState - Before state for audit log
   * @param performedBy - User ID who performed the action
   */
  private async createAuditLog(
    store: Store,
    beforeState: Record<string, unknown>,
    performedBy: string
  ): Promise<void> {
    try {
      const afterState: Record<string, unknown> = {
        id: store.id,
        companyId: store.companyId,
        name: store.name,
        timezone: store.timezone,
        email: store.email,
        phone: store.phone,
      };

      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Store',
        store.id,
        AuditAction.UPDATE,
        performedBy,
        this.auditLogDomainService.createUpdateMetadata(beforeState, afterState),
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
  private mapToOutput(store: Store): UpdateStoreOutput {
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
  private handleError(error: unknown): UpdateStoreResult {
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

