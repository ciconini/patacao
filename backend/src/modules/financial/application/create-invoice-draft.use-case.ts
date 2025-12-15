/**
 * Create Invoice Draft Use Case (UC-FIN-001)
 * 
 * Application use case for creating a new invoice in draft status.
 * This use case orchestrates domain entities and domain services to create draft invoices.
 * 
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, Accountant, or Owner role)
 * - Validate company, store, and customer existence
 * - Validate invoice line items
 * - Create Invoice domain entity
 * - Calculate invoice totals using InvoiceCalculationDomainService
 * - Persist invoice via repository
 * - Create audit log entry
 * 
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Invoice, InvoiceStatus, InvoiceLine } from '../domain/invoice.entity';
import { InvoiceCalculationDomainService } from '../domain/invoice-calculation.domain-service';
import { Company } from '../../administrative/domain/company.entity';
import { Store } from '../../administrative/domain/store.entity';
import { Customer } from '../../administrative/domain/customer.entity';
import { VATRate } from '../../shared/domain/vat-rate.value-object';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface InvoiceRepository {
  save(invoice: Invoice): Promise<Invoice>;
}

export interface CompanyRepository {
  findById(id: string): Promise<Company | null>;
}

export interface StoreRepository {
  findById(id: string): Promise<Store | null>;
}

export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
}

export interface ProductRepository {
  findById(id: string): Promise<{ id: string } | null>;
}

export interface ServiceRepository {
  findById(id: string): Promise<{ id: string } | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface CreateInvoiceDraftInput {
  companyId: string;
  storeId: string;
  buyerCustomerId?: string;
  lines: Array<{
    description: string;
    productId?: string;
    serviceId?: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
  }>;
  performedBy: string; // User ID
}

// Output model
export interface CreateInvoiceDraftOutput {
  id: string;
  companyId: string;
  storeId: string;
  invoiceNumber: string;
  issuedAt?: Date | undefined;
  buyerCustomerId?: string | undefined;
  lines: InvoiceLine[];
  subtotal: number;
  vatTotal: number;
  total: number;
  status: InvoiceStatus;
  paidAt?: Date | undefined;
  paymentMethod?: string | undefined;
  externalReference?: string | undefined;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Result type
export interface CreateInvoiceDraftResult {
  success: boolean;
  invoice?: CreateInvoiceDraftOutput;
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

/**
 * Create Invoice Draft Use Case
 */
export class CreateInvoiceDraftUseCase {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly storeRepository: StoreRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly productRepository: ProductRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly invoiceCalculationDomainService: InvoiceCalculationDomainService,
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
   * Executes the create invoice draft use case
   * 
   * @param input - Input data for creating invoice draft
   * @returns Result containing created invoice or error
   */
  async execute(input: CreateInvoiceDraftInput): Promise<CreateInvoiceDraftResult> {
    try {
      // 1. Validate user exists and has required role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate required fields
      this.validateRequiredFields(input);

      // 3. Validate and load company
      const company = await this.validateAndLoadCompany(input.companyId);

      // 4. Validate and load store
      const store = await this.validateAndLoadStore(input.storeId);

      // 5. Validate store belongs to company
      this.validateStoreBelongsToCompany(store, company);

      // 6. Validate and load customer if provided
      let customer: Customer | null = null;
      if (input.buyerCustomerId) {
        customer = await this.validateAndLoadCustomer(input.buyerCustomerId);
      }

      // 7. Validate and normalize invoice lines
      const validatedLines = await this.validateAndNormalizeLines(input.lines);

      // 8. Generate placeholder invoice number
      const invoiceNumber = this.generateDraftInvoiceNumber();

      // 9. Create Invoice domain entity
      const invoice = this.createInvoiceEntity(
        input.companyId,
        input.storeId,
        invoiceNumber,
        input.buyerCustomerId,
        validatedLines,
        input.performedBy
      );

      // 10. Persist invoice via repository
      const savedInvoice = await this.invoiceRepository.save(invoice);

      // 11. Create audit log entry
      await this.createAuditLog(savedInvoice, input.performedBy);

      // 12. Return success result
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
  private async validateUserAuthorization(userId: string): Promise<void> {
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
      throw new ForbiddenError('Only Staff, Manager, Accountant, or Owner role can create invoices');
    }
  }

  /**
   * Validates required fields
   */
  private validateRequiredFields(input: CreateInvoiceDraftInput): void {
    if (!input.companyId || input.companyId.trim().length === 0) {
      throw new ValidationError('Company ID is required');
    }

    if (!input.storeId || input.storeId.trim().length === 0) {
      throw new ValidationError('Store ID is required');
    }

    if (!input.lines || input.lines.length === 0) {
      throw new ValidationError('Invoice must have at least one line item');
    }
  }

  /**
   * Validates and loads company
   */
  private async validateAndLoadCompany(companyId: string): Promise<Company> {
    const company = await this.companyRepository.findById(companyId);
    
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Validate company has NIF (required for invoicing, but not blocking draft creation)
    // NIF validation will be enforced on issuance

    return company;
  }

  /**
   * Validates and loads store
   */
  private async validateAndLoadStore(storeId: string): Promise<Store> {
    const store = await this.storeRepository.findById(storeId);
    
    if (!store) {
      throw new NotFoundError('Store not found');
    }

    return store;
  }

  /**
   * Validates store belongs to company
   */
  private validateStoreBelongsToCompany(store: Store, company: Company): void {
    if (store.companyId !== company.id) {
      throw new ValidationError('Store does not belong to the specified company');
    }
  }

  /**
   * Validates and loads customer
   */
  private async validateAndLoadCustomer(customerId: string): Promise<Customer> {
    const customer = await this.customerRepository.findById(customerId);
    
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return customer;
  }

  /**
   * Validates and normalizes invoice lines
   */
  private async validateAndNormalizeLines(
    lines: CreateInvoiceDraftInput['lines']
  ): Promise<InvoiceLine[]> {
    const validatedLines: InvoiceLine[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineIndex = i + 1;

      // Validate description
      if (!line.description || line.description.trim().length === 0) {
        throw new ValidationError(`Line ${lineIndex}: Description is required`);
      }

      if (line.description.length > 500) {
        throw new ValidationError(`Line ${lineIndex}: Description cannot exceed 500 characters`);
      }

      // Validate quantity
      if (line.quantity <= 0) {
        throw new ValidationError(`Line ${lineIndex}: Quantity must be greater than 0`);
      }

      // Validate unit price
      if (line.unitPrice < 0) {
        throw new ValidationError(`Line ${lineIndex}: Unit price must be >= 0`);
      }

      // Validate VAT rate
      try {
        const vatRate = new VATRate(line.vatRate);
        // VATRate value object validates range
      } catch (error: any) {
        throw new ValidationError(`Line ${lineIndex}: ${error.message}`);
      }

      // Validate product_id and service_id (not both, at least one optional)
      if (line.productId && line.serviceId) {
        throw new ValidationError(`Line ${lineIndex}: Cannot specify both product_id and service_id`);
      }

      // Validate product exists if provided
      if (line.productId) {
        const product = await this.productRepository.findById(line.productId);
        if (!product) {
          throw new NotFoundError(`Product with ID ${line.productId} not found`);
        }
      }

      // Validate service exists if provided
      if (line.serviceId) {
        const service = await this.serviceRepository.findById(line.serviceId);
        if (!service) {
          throw new NotFoundError(`Service with ID ${line.serviceId} not found`);
        }
      }

      validatedLines.push({
        description: line.description.trim(),
        productId: line.productId,
        serviceId: line.serviceId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        vatRate: line.vatRate,
      });
    }

    return validatedLines;
  }

  /**
   * Generates placeholder invoice number for draft
   */
  private generateDraftInvoiceNumber(): string {
    const timestamp = Date.now();
    return `DRAFT-${timestamp}`;
  }

  /**
   * Creates Invoice domain entity
   */
  private createInvoiceEntity(
    companyId: string,
    storeId: string,
    invoiceNumber: string,
    buyerCustomerId: string | undefined,
    lines: InvoiceLine[],
    createdBy: string
  ): Invoice {
    const invoiceId = this.generateId();
    const now = new Date();

    return new Invoice(
      invoiceId,
      companyId,
      storeId,
      invoiceNumber,
      createdBy,
      buyerCustomerId,
      lines,
      InvoiceStatus.DRAFT,
      undefined, // issuedAt - not set for draft
      undefined, // paidAt - not set for draft
      undefined, // paymentMethod - not set for draft
      undefined, // externalReference - not set for draft
      now,
      now
    );
  }

  /**
   * Creates audit log entry for invoice creation
   */
  private async createAuditLog(invoice: Invoice, performedBy: string): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Invoice',
        invoice.id,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            companyId: invoice.companyId,
            storeId: invoice.storeId,
            status: invoice.status,
            total: invoice.total,
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
  private mapToOutput(invoice: Invoice): CreateInvoiceDraftOutput {
    return {
      id: invoice.id,
      companyId: invoice.companyId,
      storeId: invoice.storeId,
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: invoice.issuedAt,
      buyerCustomerId: invoice.buyerCustomerId,
      lines: invoice.lines.map(line => ({ ...line })),
      subtotal: invoice.subtotal,
      vatTotal: invoice.vatTotal,
      total: invoice.total,
      status: invoice.status,
      paidAt: invoice.paidAt,
      paymentMethod: invoice.paymentMethod,
      externalReference: invoice.externalReference,
      createdBy: invoice.createdBy,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): CreateInvoiceDraftResult {
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

