/**
 * Void Invoice Use Case (UC-FIN-004)
 * 
 * Application use case for voiding an issued invoice.
 * This use case orchestrates domain entities to void invoices.
 * 
 * Responsibilities:
 * - Validate user authorization (Manager, Accountant, or Owner role)
 * - Validate invoice is in issued or paid status
 * - Validate void reason
 * - Check for blocking transactions
 * - Cancel invoice using domain entity method
 * - Create audit log entry with reason
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

export interface TransactionRepository {
  findByInvoiceId(invoiceId: string): Promise<Array<{ id: string; status: string }>>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface VoidInvoiceInput {
  id: string; // Invoice ID
  reason: string; // Required reason for voiding
  performedBy: string; // User ID
}

// Output model
export interface VoidInvoiceOutput {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  updatedAt: Date;
}

// Result type
export interface VoidInvoiceResult {
  success: boolean;
  invoice?: VoidInvoiceOutput;
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
 * Void Invoice Use Case
 */
export class VoidInvoiceUseCase {
  private static readonly MAX_REASON_LENGTH = 500;

  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly transactionRepository: TransactionRepository,
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
   * Executes the void invoice use case
   * 
   * @param input - Input data for voiding invoice
   * @returns Result containing voided invoice or error
   */
  async execute(input: VoidInvoiceInput): Promise<VoidInvoiceResult> {
    try {
      // 1. Validate user exists and has Manager, Accountant, or Owner role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate void reason
      this.validateReason(input.reason);

      // 3. Load invoice by ID
      const invoice = await this.invoiceRepository.findById(input.id);
      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }

      // 4. Validate invoice is in issued or paid status
      if (invoice.status !== InvoiceStatus.ISSUED && invoice.status !== InvoiceStatus.PAID) {
        throw new ValidationError('Only issued or paid invoices can be voided');
      }

      // 5. Check for blocking transactions (business rule dependent)
      await this.checkBlockingTransactions(invoice.id);

      // 6. Capture current invoice state for audit log
      const beforeStatus = invoice.status;

      // 7. Cancel invoice using domain entity method
      invoice.cancel();

      // 8. Persist updated invoice
      const savedInvoice = await this.invoiceRepository.update(invoice);

      // 9. Create audit log entry with reason and before/after status
      await this.createAuditLog(savedInvoice, beforeStatus, input.reason, input.performedBy);

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
   * Validates user authorization (must have Manager, Accountant, or Owner role)
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
        return role.isManager() || role.isAccountant() || role.isOwner();
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError('Only Manager, Accountant, or Owner role can void invoices');
    }
  }

  /**
   * Validates void reason
   */
  private validateReason(reason: string): void {
    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('Reason is required for voiding invoice');
    }

    if (reason.length > VoidInvoiceUseCase.MAX_REASON_LENGTH) {
      throw new ValidationError(`Reason cannot exceed ${VoidInvoiceUseCase.MAX_REASON_LENGTH} characters`);
    }
  }

  /**
   * Checks for blocking transactions
   */
  private async checkBlockingTransactions(invoiceId: string): Promise<void> {
    try {
      const transactions = await this.transactionRepository.findByInvoiceId(invoiceId);
      
      // Check if any transactions are in a state that blocks voiding
      // Business rule: completed transactions may block voiding
      const blockingTransactions = transactions.filter(tx => {
        // Example: completed transactions block voiding
        // Adjust based on actual business rules
        return tx.status === 'completed';
      });

      if (blockingTransactions.length > 0) {
        throw new ConflictError('Invoice cannot be voided due to linked transactions. Reverse transactions first');
      }
    } catch (error) {
      // If error is ConflictError, rethrow it
      if (error instanceof ConflictError) {
        throw error;
      }
      // If transaction repository is not available or error occurs, continue
      // (business rule dependent - may allow voiding without transaction check)
      console.warn('Could not check transactions for invoice:', error);
    }
  }

  /**
   * Creates audit log entry for invoice voiding
   */
  private async createAuditLog(
    invoice: Invoice,
    beforeStatus: InvoiceStatus,
    reason: string,
    performedBy: string
  ): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Invoice',
        invoice.id,
        AuditAction.DELETE, // Using DELETE for voiding
        performedBy,
        {
          before: {
            status: beforeStatus,
            invoiceNumber: invoice.invoiceNumber,
          },
          after: {
            status: invoice.status,
            invoiceNumber: invoice.invoiceNumber,
            voidReason: reason,
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
  private mapToOutput(invoice: Invoice): VoidInvoiceOutput {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      updatedAt: invoice.updatedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): VoidInvoiceResult {
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

