/**
 * Create Supplier Use Case (UC-INV-008)
 * 
 * Application use case for creating a new supplier record.
 * This use case orchestrates domain entities to create suppliers with contact information.
 * 
 * Responsibilities:
 * - Validate user authorization (Manager or Owner role)
 * - Validate input data and business rules
 * - Validate email and phone formats using value objects
 * - Create Supplier domain entity
 * - Persist supplier via repository
 * - Create audit log entry
 * 
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Supplier } from '../domain/supplier.entity';
import { EmailAddress } from '../../shared/domain/email-address.value-object';
import { PhoneNumber } from '../../shared/domain/phone-number.value-object';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface SupplierRepository {
  save(supplier: Supplier): Promise<Supplier>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface CreateSupplierInput {
  name: string;
  contactEmail?: string;
  phone?: string;
  defaultLeadTimeDays?: number;
  performedBy: string; // User ID
}

// Output model
export interface CreateSupplierOutput {
  id: string;
  name: string;
  contactEmail?: string;
  phone?: string;
  defaultLeadTimeDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Result type
export interface CreateSupplierResult {
  success: boolean;
  supplier?: CreateSupplierOutput;
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

/**
 * Create Supplier Use Case
 */
export class CreateSupplierUseCase {
  private static readonly MAX_NAME_LENGTH = 255;

  constructor(
    private readonly supplierRepository: SupplierRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly currentUserRepository: CurrentUserRepository,
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
   * Executes the create supplier use case
   * 
   * @param input - Input data for creating supplier
   * @returns Result containing created supplier or error
   */
  async execute(input: CreateSupplierInput): Promise<CreateSupplierResult> {
    try {
      // 1. Validate user exists and has Manager or Owner role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate required fields
      this.validateRequiredFields(input);

      // 3. Validate field constraints
      this.validateFieldConstraints(input);

      // 4. Create Supplier domain entity
      const supplier = this.createSupplierEntity(input);

      // 5. Persist supplier via repository
      const savedSupplier = await this.supplierRepository.save(supplier);

      // 6. Create audit log entry
      await this.createAuditLog(savedSupplier, input.performedBy);

      // 7. Return success result
      return {
        success: true,
        supplier: this.mapToOutput(savedSupplier),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization (must have Manager or Owner role)
   */
  private async validateUserAuthorization(userId: string): Promise<void> {
    const user = await this.currentUserRepository.findById(userId);
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const hasRequiredRole = user.roleIds.some(roleId => {
      try {
        const role = RoleId.fromString(roleId);
        if (!role) return false;
        return role.isManager() || role.isOwner();
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError('Only Manager or Owner role can create suppliers');
    }
  }

  /**
   * Validates required fields
   */
  private validateRequiredFields(input: CreateSupplierInput): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError("Required field 'name' is missing");
    }
  }

  /**
   * Validates field constraints
   */
  private validateFieldConstraints(input: CreateSupplierInput): void {
    if (input.name.trim().length === 0) {
      throw new ValidationError('Supplier name cannot be empty');
    }

    if (input.name.length > CreateSupplierUseCase.MAX_NAME_LENGTH) {
      throw new ValidationError(`Supplier name cannot exceed ${CreateSupplierUseCase.MAX_NAME_LENGTH} characters`);
    }

    // Validate email format using EmailAddress value object
    if (input.contactEmail) {
      try {
        new EmailAddress(input.contactEmail);
      } catch (error: any) {
        throw new ValidationError(`Email format is invalid: ${error.message}`);
      }
    }

    // Validate phone format using PhoneNumber value object
    if (input.phone) {
      try {
        new PhoneNumber(input.phone);
      } catch (error: any) {
        throw new ValidationError(`Phone format is invalid: ${error.message}`);
      }
    }

    // Validate lead time
    if (input.defaultLeadTimeDays !== undefined && input.defaultLeadTimeDays !== null) {
      if (!Number.isInteger(input.defaultLeadTimeDays) || input.defaultLeadTimeDays < 0) {
        throw new ValidationError('Default lead time must be >= 0');
      }
    }
  }

  /**
   * Creates Supplier domain entity
   */
  private createSupplierEntity(input: CreateSupplierInput): Supplier {
    const supplierId = this.generateId();
    const now = new Date();

    return new Supplier(
      supplierId,
      input.name.trim(),
      input.contactEmail?.trim(),
      input.phone?.trim(),
      input.defaultLeadTimeDays,
      now,
      now
    );
  }

  /**
   * Creates audit log entry for supplier creation
   */
  private async createAuditLog(supplier: Supplier, performedBy: string): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Supplier',
        supplier.id,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            id: supplier.id,
            name: supplier.name,
            contactEmail: supplier.contactEmail,
            phone: supplier.phone,
            defaultLeadTimeDays: supplier.defaultLeadTimeDays,
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
   * Maps Supplier domain entity to output model
   */
  private mapToOutput(supplier: Supplier): CreateSupplierOutput {
    return {
      id: supplier.id,
      name: supplier.name,
      contactEmail: supplier.contactEmail,
      phone: supplier.phone,
      defaultLeadTimeDays: supplier.defaultLeadTimeDays,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): CreateSupplierResult {
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

