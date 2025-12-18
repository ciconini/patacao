/**
 * Create Transaction Use Case (UC-FIN-006)
 *
 * Application use case for creating a new transaction (POS checkout).
 * This use case orchestrates domain entities to create transactions and optionally draft invoices.
 *
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, Accountant, or Owner role)
 * - Validate store and customer existence
 * - Validate transaction line items
 * - Create Transaction domain entity
 * - Optionally create draft invoice
 * - Persist transaction via repository
 * - Create audit log entry
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Transaction, PaymentStatus, TransactionLineItem } from '../domain/transaction.entity';
import { Invoice, InvoiceStatus, InvoiceLine } from '../domain/invoice.entity';
import { Store } from '../../administrative/domain/store.entity';
import { Customer } from '../../administrative/domain/customer.entity';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface TransactionRepository {
  save(transaction: Transaction): Promise<Transaction>;
}

export interface StoreRepository {
  findById(id: string): Promise<Store | null>;
}

export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
}

export interface ProductRepository {
  findById(
    id: string,
  ): Promise<{ id: string; name: string; unitPrice: number; vatRate: number } | null>;
}

export interface ServiceRepository {
  findById(id: string): Promise<{ id: string; name: string; price: number } | null>;
}

export interface InvoiceRepository {
  save(invoice: Invoice): Promise<Invoice>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface CreateTransactionInput {
  storeId: string;
  customerId?: string;
  lines: Array<{
    productId?: string;
    serviceId?: string;
    quantity: number;
    unitPrice: number;
    description?: string;
  }>;
  createInvoice?: boolean; // Default true
  performedBy: string; // User ID
}

// Output model
export interface CreateTransactionOutput {
  id: string;
  storeId: string;
  invoiceId: string;
  lines: TransactionLineItem[];
  totalAmount: number;
  paymentStatus: PaymentStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Result type
export interface CreateTransactionResult {
  success: boolean;
  transaction?: CreateTransactionOutput;
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
 * Create Transaction Use Case
 */
export class CreateTransactionUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly storeRepository: StoreRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly productRepository: ProductRepository,
    private readonly serviceRepository: ServiceRepository,
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
   * Executes the create transaction use case
   *
   * @param input - Input data for creating transaction
   * @returns Result containing created transaction or error
   */
  async execute(input: CreateTransactionInput): Promise<CreateTransactionResult> {
    try {
      // 1. Validate user exists and has required role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate required fields
      this.validateRequiredFields(input);

      // 3. Validate and load store
      const store = await this.validateAndLoadStore(input.storeId);

      // 4. Validate and load customer if provided
      let customer: Customer | null = null;
      if (input.customerId) {
        customer = await this.validateAndLoadCustomer(input.customerId);
      }

      // 5. Validate and normalize transaction lines
      const validatedLines = await this.validateAndNormalizeLines(input.lines);

      // 6. Create draft invoice if requested (default true)
      let invoice: Invoice | null = null;
      const createInvoice = input.createInvoice !== false; // Default true

      if (createInvoice) {
        invoice = await this.createDraftInvoice(
          store.companyId,
          input.storeId,
          input.customerId,
          validatedLines,
          input.performedBy,
        );
      } else {
        // If no invoice, we still need an invoice ID for transaction
        // For now, we'll require invoice creation (business rule)
        throw new ValidationError('Transaction must have an associated invoice');
      }

      // 7. Create Transaction domain entity
      const transaction = this.createTransactionEntity(
        input.storeId,
        invoice.id,
        validatedLines,
        input.performedBy,
      );

      // 8. Persist transaction via repository
      const savedTransaction = await this.transactionRepository.save(transaction);

      // 9. Create audit log entry
      await this.createAuditLog(savedTransaction, input.performedBy);

      // 10. Return success result
      return {
        success: true,
        transaction: this.mapToOutput(savedTransaction),
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

    const hasRequiredRole = user.roleIds.some((roleId) => {
      try {
        const role = RoleId.fromString(roleId);
        if (!role) return false;
        return role.isStaff() || role.isManager() || role.isAccountant() || role.isOwner();
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError(
        'Only Staff, Manager, Accountant, or Owner role can create transactions',
      );
    }
  }

  /**
   * Validates required fields
   */
  private validateRequiredFields(input: CreateTransactionInput): void {
    if (!input.storeId || input.storeId.trim().length === 0) {
      throw new ValidationError('Store ID is required');
    }

    if (!input.lines || input.lines.length === 0) {
      throw new ValidationError('Transaction must have at least one line item');
    }
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
   * Validates and normalizes transaction lines
   */
  private async validateAndNormalizeLines(
    lines: CreateTransactionInput['lines'],
  ): Promise<TransactionLineItem[]> {
    const validatedLines: TransactionLineItem[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineIndex = i + 1;

      // Validate quantity
      if (line.quantity <= 0) {
        throw new ValidationError(`Line ${lineIndex}: Quantity must be greater than 0`);
      }

      // Validate unit price
      if (line.unitPrice < 0) {
        throw new ValidationError(`Line ${lineIndex}: Unit price must be >= 0`);
      }

      // Validate product_id and service_id (not both, at least one)
      if (!line.productId && !line.serviceId) {
        throw new ValidationError(
          `Line ${lineIndex}: Must specify either product_id or service_id`,
        );
      }

      if (line.productId && line.serviceId) {
        throw new ValidationError(
          `Line ${lineIndex}: Cannot specify both product_id and service_id`,
        );
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
        productId: line.productId,
        serviceId: line.serviceId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        description: line.description,
      });
    }

    return validatedLines;
  }

  /**
   * Creates draft invoice for transaction
   */
  private async createDraftInvoice(
    companyId: string,
    storeId: string,
    customerId: string | undefined,
    lines: TransactionLineItem[],
    createdBy: string,
  ): Promise<Invoice> {
    // Convert transaction lines to invoice lines
    const invoiceLines: InvoiceLine[] = [];

    for (const line of lines) {
      // Get product/service details for description and VAT
      let description = line.description;
      let vatRate = 23; // Default VAT rate

      if (line.productId) {
        const product = await this.productRepository.findById(line.productId);
        if (product) {
          description = description || product.name;
          vatRate = product.vatRate;
        }
      } else if (line.serviceId) {
        const service = await this.serviceRepository.findById(line.serviceId);
        if (service) {
          description = description || service.name;
          // Services typically use standard VAT rate (adjust based on business rules)
          vatRate = 23; // Default, could be from service entity if available
        }
      }

      if (!description) {
        description = line.productId ? 'Product' : 'Service';
      }

      invoiceLines.push({
        description,
        productId: line.productId,
        serviceId: line.serviceId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        vatRate,
      });
    }

    // Create draft invoice
    const invoiceId = this.generateId();
    const invoiceNumber = this.generateDraftInvoiceNumber();
    const now = new Date();

    const invoice = new Invoice(
      invoiceId,
      companyId,
      storeId,
      invoiceNumber,
      createdBy,
      customerId,
      invoiceLines,
      InvoiceStatus.DRAFT,
      undefined, // issuedAt
      undefined, // paidAt
      undefined, // paymentMethod
      undefined, // externalReference
      now,
      now,
    );

    return await this.invoiceRepository.save(invoice);
  }

  /**
   * Generates placeholder invoice number for draft
   */
  private generateDraftInvoiceNumber(): string {
    const timestamp = Date.now();
    return `DRAFT-${timestamp}`;
  }

  /**
   * Creates Transaction domain entity
   */
  private createTransactionEntity(
    storeId: string,
    invoiceId: string,
    lines: TransactionLineItem[],
    createdBy: string,
  ): Transaction {
    const transactionId = this.generateId();
    const now = new Date();

    return new Transaction(
      transactionId,
      storeId,
      invoiceId,
      createdBy,
      lines,
      PaymentStatus.PENDING,
      now,
      now,
    );
  }

  /**
   * Creates audit log entry for transaction creation
   */
  private async createAuditLog(transaction: Transaction, performedBy: string): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Transaction',
        transaction.id,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            id: transaction.id,
            storeId: transaction.storeId,
            invoiceId: transaction.invoiceId,
            totalAmount: transaction.totalAmount,
            paymentStatus: transaction.paymentStatus,
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
   * Maps Transaction domain entity to output model
   */
  private mapToOutput(transaction: Transaction): CreateTransactionOutput {
    return {
      id: transaction.id,
      storeId: transaction.storeId,
      invoiceId: transaction.invoiceId,
      lines: transaction.lineItems.map((item) => ({ ...item })),
      totalAmount: transaction.totalAmount,
      paymentStatus: transaction.paymentStatus,
      createdBy: transaction.createdBy,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): CreateTransactionResult {
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
