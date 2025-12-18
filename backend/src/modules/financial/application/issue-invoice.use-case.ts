/**
 * Issue Invoice Use Case (UC-FIN-002)
 *
 * Application use case for issuing a draft invoice.
 * This use case orchestrates domain entities and domain services to issue invoices.
 *
 * Responsibilities:
 * - Validate user authorization (Manager, Accountant, or Owner role)
 * - Validate invoice is in draft status
 * - Validate company NIF
 * - Generate sequential invoice number
 * - Issue invoice using domain entity method
 * - Create audit log entry
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Invoice, InvoiceStatus } from '../domain/invoice.entity';
import { InvoiceIssuanceDomainService } from '../domain/invoice-issuance.domain-service';
import { Company } from '../../administrative/domain/company.entity';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface InvoiceRepository {
  findById(id: string): Promise<Invoice | null>;
  update(invoice: Invoice): Promise<Invoice>;
  generateInvoiceNumber(companyId: string, storeId: string): Promise<string>;
  findByInvoiceNumber(invoiceNumber: string, companyId: string): Promise<Invoice | null>;
}

export interface CompanyRepository {
  findById(id: string): Promise<Company | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface IssueInvoiceInput {
  id: string; // Invoice ID
  performedBy: string; // User ID
}

// Output model
export interface IssueInvoiceOutput {
  id: string;
  companyId: string;
  storeId: string;
  invoiceNumber: string;
  issuedAt: Date;
  buyerCustomerId?: string | undefined;
  lines: Array<{
    description: string;
    productId?: string;
    serviceId?: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
  }>;
  subtotal: number;
  vatTotal: number;
  total: number;
  status: InvoiceStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Result type
export interface IssueInvoiceResult {
  success: boolean;
  invoice?: IssueInvoiceOutput;
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
 * Issue Invoice Use Case
 */
export class IssueInvoiceUseCase {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly invoiceIssuanceDomainService: InvoiceIssuanceDomainService,
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
   * Executes the issue invoice use case
   *
   * @param input - Input data for issuing invoice
   * @returns Result containing issued invoice or error
   */
  async execute(input: IssueInvoiceInput): Promise<IssueInvoiceResult> {
    try {
      // 1. Validate user exists and has Manager, Accountant, or Owner role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Load invoice by ID
      const invoice = await this.invoiceRepository.findById(input.id);
      if (!invoice) {
        throw new NotFoundError('Invoice not found');
      }

      // 3. Validate invoice is in draft status
      if (invoice.status !== InvoiceStatus.DRAFT) {
        throw new ValidationError(
          'Invoice is not in draft status. Only draft invoices can be issued',
        );
      }

      // 4. Load company
      const company = await this.companyRepository.findById(invoice.companyId);
      if (!company) {
        throw new NotFoundError('Company not found');
      }

      // 5. Validate invoice can be issued using domain service
      const validationResult = this.invoiceIssuanceDomainService.validateInvoiceIssuance(
        invoice,
        company,
      );
      if (!validationResult.canIssue) {
        throw new ValidationError(`Cannot issue invoice: ${validationResult.errors.join(', ')}`);
      }

      // 6. Generate sequential invoice number
      let invoiceNumber: string;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        invoiceNumber = await this.invoiceRepository.generateInvoiceNumber(
          invoice.companyId,
          invoice.storeId,
        );

        // Check if invoice number already exists
        const existingInvoice = await this.invoiceRepository.findByInvoiceNumber(
          invoiceNumber,
          invoice.companyId,
        );
        if (!existingInvoice) {
          break; // Invoice number is unique
        }

        attempts++;
        if (attempts >= maxAttempts) {
          throw new ApplicationError(
            'INVOICE_NUMBER_CONFLICT',
            'Failed to generate unique invoice number',
          );
        }
      }

      // 7. Update invoice number (if different from draft placeholder)
      if (invoice.invoiceNumber !== invoiceNumber!) {
        invoice.updateInvoiceNumber(invoiceNumber!);
      }

      // 8. Issue invoice using domain entity method
      const issuedAt = new Date();
      invoice.issue(issuedAt);

      // 9. Persist updated invoice
      const savedInvoice = await this.invoiceRepository.update(invoice);

      // 10. Create audit log entry with before/after status
      await this.createAuditLog(savedInvoice, InvoiceStatus.DRAFT, input.performedBy);

      // 11. Return success result
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
      throw new ForbiddenError('Only Manager, Accountant, or Owner role can issue invoices');
    }
  }

  /**
   * Creates audit log entry for invoice issuance
   */
  private async createAuditLog(
    invoice: Invoice,
    beforeStatus: InvoiceStatus,
    performedBy: string,
  ): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Invoice',
        invoice.id,
        AuditAction.UPDATE, // Using UPDATE for issuance
        performedBy,
        {
          before: {
            status: beforeStatus,
            invoiceNumber: invoice.invoiceNumber,
          },
          after: {
            status: invoice.status,
            invoiceNumber: invoice.invoiceNumber,
            issuedAt: invoice.issuedAt,
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
   * Maps Invoice domain entity to output model
   */
  private mapToOutput(invoice: Invoice): IssueInvoiceOutput {
    return {
      id: invoice.id,
      companyId: invoice.companyId,
      storeId: invoice.storeId,
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: invoice.issuedAt!,
      buyerCustomerId: invoice.buyerCustomerId,
      lines: invoice.lines.map((line) => ({
        description: line.description,
        productId: line.productId,
        serviceId: line.serviceId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        vatRate: line.vatRate,
      })),
      subtotal: invoice.subtotal,
      vatTotal: invoice.vatTotal,
      total: invoice.total,
      status: invoice.status,
      createdBy: invoice.createdBy,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): IssueInvoiceResult {
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
