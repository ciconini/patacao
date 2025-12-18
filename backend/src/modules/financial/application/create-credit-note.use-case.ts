/**
 * Create Credit Note Use Case (UC-FIN-005)
 *
 * Application use case for creating a credit note linked to an invoice.
 * This use case orchestrates domain entities to create credit notes for refunds and corrections.
 *
 * Responsibilities:
 * - Validate user authorization (Manager, Accountant, or Owner role)
 * - Validate invoice exists and is in valid status
 * - Calculate outstanding amount considering existing credit notes
 * - Validate credit note amount
 * - Create CreditNote domain entity
 * - Persist credit note via repository
 * - Create audit log entry
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { CreditNote } from '../domain/credit-note.entity';
import { Invoice, InvoiceStatus } from '../domain/invoice.entity';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface CreditNoteRepository {
  save(creditNote: CreditNote): Promise<CreditNote>;
  findByInvoiceId(invoiceId: string): Promise<CreditNote[]>;
  sumByInvoiceId(invoiceId: string): Promise<number>;
}

export interface InvoiceRepository {
  findById(id: string): Promise<Invoice | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface CreateCreditNoteInput {
  invoiceId: string;
  reason: string;
  amount: number;
  performedBy: string; // User ID
}

// Output model
export interface CreateCreditNoteOutput {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  issuedAt: Date;
  reason: string;
  amount: number;
  createdBy: string;
  createdAt: Date;
}

// Result type
export interface CreateCreditNoteResult {
  success: boolean;
  creditNote?: CreateCreditNoteOutput;
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

/**
 * Create Credit Note Use Case
 */
export class CreateCreditNoteUseCase {
  private static readonly MAX_REASON_LENGTH = 500;

  constructor(
    private readonly creditNoteRepository: CreditNoteRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly currentUserRepository: CurrentUserRepository,
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
   * Executes the create credit note use case
   *
   * @param input - Input data for creating credit note
   * @returns Result containing created credit note or error
   */
  async execute(input: CreateCreditNoteInput): Promise<CreateCreditNoteResult> {
    try {
      // 1. Validate user exists and has Manager, Accountant, or Owner role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate required fields
      this.validateRequiredFields(input);

      // 3. Load invoice by ID
      const invoice = await this.invoiceRepository.findById(input.invoiceId);
      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }

      // 4. Validate invoice is in issued or paid status
      if (invoice.status !== InvoiceStatus.ISSUED && invoice.status !== InvoiceStatus.PAID) {
        throw new ValidationError('Credit note can only be created for issued or paid invoices');
      }

      // 5. Calculate outstanding amount
      const outstandingAmount = await this.calculateOutstandingAmount(invoice.id, invoice.total);

      // 6. Validate credit note amount
      this.validateAmount(input.amount, invoice.total, outstandingAmount);

      // 7. Create CreditNote domain entity
      const creditNote = this.createCreditNoteEntity(
        input.invoiceId,
        input.amount,
        input.reason,
        input.performedBy,
      );

      // 8. Issue credit note (set issued_at)
      creditNote.issue();

      // 9. Persist credit note via repository
      const savedCreditNote = await this.creditNoteRepository.save(creditNote);

      // 10. Create audit log entry
      await this.createAuditLog(savedCreditNote, invoice, input.performedBy);

      // 11. Return success result
      return {
        success: true,
        creditNote: this.mapToOutput(savedCreditNote, invoice),
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

    const hasRequiredRole = user.roleIds.some((roleId) => {
      try {
        const role = RoleId.fromString(roleId);
        if (!role) return false;
        return role.isManager() || role.isAccountant() || role.isOwner();
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError('Only Manager, Accountant, or Owner role can create credit notes');
    }
  }

  /**
   * Validates required fields
   */
  private validateRequiredFields(input: CreateCreditNoteInput): void {
    if (!input.invoiceId || input.invoiceId.trim().length === 0) {
      throw new ValidationError('Invoice ID is required');
    }

    if (!input.reason || input.reason.trim().length === 0) {
      throw new ValidationError('Reason is required for credit note');
    }

    if (input.reason.length > CreateCreditNoteUseCase.MAX_REASON_LENGTH) {
      throw new ValidationError(
        `Reason cannot exceed ${CreateCreditNoteUseCase.MAX_REASON_LENGTH} characters`,
      );
    }

    if (input.amount <= 0) {
      throw new ValidationError('Credit note amount must be greater than 0');
    }
  }

  /**
   * Calculates outstanding amount for invoice
   */
  private async calculateOutstandingAmount(
    invoiceId: string,
    invoiceTotal: number,
  ): Promise<number> {
    const existingCreditNotesSum = await this.creditNoteRepository.sumByInvoiceId(invoiceId);
    return invoiceTotal - existingCreditNotesSum;
  }

  /**
   * Validates credit note amount
   */
  private validateAmount(amount: number, invoiceTotal: number, outstandingAmount: number): void {
    if (amount > invoiceTotal) {
      throw new ValidationError('Credit note amount cannot exceed invoice total');
    }

    if (amount > outstandingAmount) {
      throw new ValidationError(
        `Credit note amount cannot exceed outstanding amount. Outstanding: ${outstandingAmount.toFixed(2)}`,
      );
    }
  }

  /**
   * Creates CreditNote domain entity
   */
  private createCreditNoteEntity(
    invoiceId: string,
    amount: number,
    reason: string,
    createdBy: string,
  ): CreditNote {
    const creditNoteId = this.generateId();
    const now = new Date();

    return new CreditNote(
      creditNoteId,
      invoiceId,
      amount,
      createdBy,
      now, // issuedAt - set immediately
      reason,
      now, // createdAt
    );
  }

  /**
   * Creates audit log entry for credit note creation
   */
  private async createAuditLog(
    creditNote: CreditNote,
    invoice: Invoice,
    performedBy: string,
  ): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'CreditNote',
        creditNote.id,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            id: creditNote.id,
            invoiceId: creditNote.invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            amount: creditNote.amount,
            reason: creditNote.reason,
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
   * Maps CreditNote domain entity to output model
   */
  private mapToOutput(creditNote: CreditNote, invoice: Invoice): CreateCreditNoteOutput {
    return {
      id: creditNote.id,
      invoiceId: creditNote.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: creditNote.issuedAt!,
      reason: creditNote.reason!,
      amount: creditNote.amount,
      createdBy: creditNote.createdBy,
      createdAt: creditNote.createdAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): CreateCreditNoteResult {
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
