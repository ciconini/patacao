/**
 * Mark Invoice Paid Use Case (UC-FIN-003)
 * 
 * Application use case for recording manual payment for an issued invoice.
 * This use case orchestrates domain entities to mark invoices as paid.
 * 
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, Accountant, or Owner role)
 * - Validate invoice is in issued status
 * - Validate payment information
 * - Mark invoice as paid using domain entity method
 * - Create audit log entry
 * 
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Invoice, InvoiceStatus } from '../domain/invoice.entity';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface InvoiceRepository {
  findById(id: string): Promise<Invoice | null>;
  update(invoice: Invoice): Promise<Invoice>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface MarkInvoicePaidInput {
  id: string; // Invoice ID
  paymentMethod: string;
  paidAt?: Date; // Optional, defaults to current time
  externalReference?: string;
  performedBy: string; // User ID
}

// Output model
export interface MarkInvoicePaidOutput {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  paidAt: Date;
  paymentMethod: string;
  externalReference?: string | undefined;
  updatedAt: Date;
}

// Result type
export interface MarkInvoicePaidResult {
  success: boolean;
  invoice?: MarkInvoicePaidOutput;
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

export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super('CONFLICT', message);
    this.name = 'ConflictError';
  }
}

/**
 * Mark Invoice Paid Use Case
 */
export class MarkInvoicePaidUseCase {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
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
   * Executes the mark invoice paid use case
   * 
   * @param input - Input data for marking invoice as paid
   * @returns Result containing updated invoice or error
   */
  async execute(input: MarkInvoicePaidInput): Promise<MarkInvoicePaidResult> {
    try {
      // 1. Validate user exists and has required role
      const currentUser = await this.validateUserAuthorization(input.performedBy);

      // 2. Validate payment method
      this.validatePaymentMethod(input.paymentMethod);

      // 3. Validate payment date
      const paidAt = this.validatePaymentDate(input.paidAt);

      // 4. Load invoice by ID
      const invoice = await this.invoiceRepository.findById(input.id);
      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }

      // 5. Validate invoice is in issued status (or allow override if already paid)
      if (invoice.status === InvoiceStatus.PAID) {
        const canOverride = this.canOverridePayment(currentUser.roleIds);
        if (!canOverride) {
          throw new ConflictError('Invoice is already marked as paid. Only Manager/Accountant/Owner can override');
        }
      } else if (invoice.status !== InvoiceStatus.ISSUED) {
        throw new ValidationError('Only issued invoices can be marked as paid');
      }

      // 7. Mark invoice as paid using domain entity method
      invoice.markAsPaid(paidAt, input.paymentMethod, input.externalReference);

      // 8. Persist updated invoice
      const savedInvoice = await this.invoiceRepository.update(invoice);

      // 9. Create audit log entry
      await this.createAuditLog(savedInvoice, input.performedBy);

      // 10. Return success result
      return {
        success: true,
        invoice: this.mapToOutput(savedInvoice),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization (must have Staff, Manager, Accountant, or Owner role)
   */
  private async validateUserAuthorization(userId: string): Promise<{ id: string; roleIds: string[] }> {
    const user = await this.currentUserRepository.findById(userId);
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const hasRequiredRole = user.roleIds.some(roleId => {
      try {
        const role = RoleId.fromString(roleId);
        if (!role) return false;
        return role.isStaff() || role.isManager() || role.isAccountant() || role.isOwner();
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError('Only Staff, Manager, Accountant, or Owner role can mark invoices as paid');
    }

    return user;
  }

  /**
   * Checks if user can override existing payments
   */
  private canOverridePayment(roleIds: string[]): boolean {
    return roleIds.some(roleId => {
      try {
        const role = RoleId.fromString(roleId);
        if (!role) return false;
        return role.isManager() || role.isAccountant() || role.isOwner();
      } catch {
        return false;
      }
    });
  }

  /**
   * Validates payment method
   */
  private validatePaymentMethod(paymentMethod: string): void {
    if (!paymentMethod || paymentMethod.trim().length === 0) {
      throw new ValidationError('Payment method is required');
    }

    if (paymentMethod.length > 64) {
      throw new ValidationError('Payment method cannot exceed 64 characters');
    }
  }

  /**
   * Validates payment date
   */
  private validatePaymentDate(paidAt?: Date): Date {
    if (!paidAt) {
      return new Date(); // Default to current time
    }

    const paymentDate = new Date(paidAt);
    const now = new Date();

    if (isNaN(paymentDate.getTime())) {
      throw new ValidationError('Payment date must be a valid date');
    }

    if (paymentDate > now) {
      throw new ValidationError('Payment date must be valid and cannot be in the future');
    }

    return paymentDate;
  }

  /**
   * Creates audit log entry for payment recording
   */
  private async createAuditLog(invoice: Invoice, performedBy: string): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Invoice',
        invoice.id,
        AuditAction.UPDATE, // Using UPDATE for payment marking
        performedBy,
        {
          after: {
            action: 'mark_paid',
            invoiceNumber: invoice.invoiceNumber,
            paymentMethod: invoice.paymentMethod,
            paidAt: invoice.paidAt,
            externalReference: invoice.externalReference,
            status: invoice.status,
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
   * Maps Invoice domain entity to output model
   */
  private mapToOutput(invoice: Invoice): MarkInvoicePaidOutput {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      paidAt: invoice.paidAt!,
      paymentMethod: invoice.paymentMethod!,
      externalReference: invoice.externalReference,
      updatedAt: invoice.updatedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): MarkInvoicePaidResult {
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

