/**
 * Create Financial Export Use Case (UC-FIN-008)
 *
 * Application use case for creating a financial export containing invoices, transactions, and credit notes.
 * This use case orchestrates domain entities to generate financial exports for accounting purposes.
 *
 * Responsibilities:
 * - Validate user authorization (Accountant or Owner role)
 * - Validate export period and format
 * - Query invoices, transactions, and credit notes for period
 * - Generate export file (CSV or JSON)
 * - Store export file (local or SFTP)
 * - Create FinancialExport domain entity
 * - Persist export via repository
 * - Create audit log entry
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - File system operations (handled by adapters)
 * - Persistence implementation details
 */

import { FinancialExport, ExportFormat } from '../domain/financial-export.entity';
import { Invoice } from '../domain/invoice.entity';
import { Transaction } from '../domain/transaction.entity';
import { CreditNote } from '../domain/credit-note.entity';
import { Company } from '../../administrative/domain/company.entity';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface FinancialExportRepository {
  save(exportEntity: FinancialExport): Promise<FinancialExport>;
}

export interface CompanyRepository {
  findById(id: string): Promise<Company | null>;
}

export interface InvoiceRepository {
  findByCompanyAndPeriod(
    companyId: string,
    start: Date,
    end: Date,
    includeVoided: boolean,
  ): Promise<Invoice[]>;
}

export interface TransactionRepository {
  findByCompanyAndPeriod(companyId: string, start: Date, end: Date): Promise<Transaction[]>;
}

export interface CreditNoteRepository {
  findByInvoiceIds(invoiceIds: string[]): Promise<CreditNote[]>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// File storage service interface (port)
export interface FileStorageService {
  saveFile(content: string, fileName: string): Promise<string>; // Returns file path
  uploadToSFTP(content: string, fileName: string, sftpConfig: SFTPConfig): Promise<string>; // Returns SFTP reference
}

export interface SFTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  remotePath: string;
}

// Export file generator interface (port)
export interface ExportFileGenerator {
  generateCSV(data: ExportData): Promise<string>;
  generateJSON(data: ExportData): Promise<string>;
}

export interface ExportData {
  invoices: Invoice[];
  transactions: Transaction[];
  creditNotes: CreditNote[];
  periodStart: Date;
  periodEnd: Date;
  companyId: string;
}

// Input model
export interface CreateFinancialExportInput {
  companyId: string;
  periodStart: Date;
  periodEnd: Date;
  format: 'csv' | 'json';
  includeVoided?: boolean; // Default false
  deliveryMethod?: 'download' | 'sftp'; // Default 'download'
  performedBy: string; // User ID
}

// Output model
export interface CreateFinancialExportOutput {
  id: string;
  companyId: string;
  periodStart: Date;
  periodEnd: Date;
  format: ExportFormat;
  status: 'completed' | 'pending' | 'processing' | 'failed';
  filePath?: string | undefined;
  sftpReference?: string | undefined;
  recordCount: number;
  createdBy: string;
  createdAt: Date;
  downloadUrl?: string; // If deliveryMethod is 'download'
}

// Result type
export interface CreateFinancialExportResult {
  success: boolean;
  export?: CreateFinancialExportOutput;
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
 * Create Financial Export Use Case
 */
export class CreateFinancialExportUseCase {
  private static readonly MAX_PERIOD_DAYS = 365; // 1 year maximum

  constructor(
    private readonly financialExportRepository: FinancialExportRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly creditNoteRepository: CreditNoteRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly fileStorageService: FileStorageService,
    private readonly exportFileGenerator: ExportFileGenerator,
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
   * Executes the create financial export use case
   *
   * @param input - Input data for creating export
   * @returns Result containing created export or error
   */
  async execute(input: CreateFinancialExportInput): Promise<CreateFinancialExportResult> {
    try {
      // 1. Validate user exists and has Accountant or Owner role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate required fields
      this.validateRequiredFields(input);

      // 3. Validate and normalize dates
      const { periodStart, periodEnd } = this.validateAndNormalizePeriod(
        input.periodStart,
        input.periodEnd,
      );

      // 4. Validate format
      const format = this.validateFormat(input.format);

      // 5. Validate and load company
      const company = await this.validateAndLoadCompany(input.companyId);

      // 6. Query invoices for period
      const invoices = await this.invoiceRepository.findByCompanyAndPeriod(
        input.companyId,
        periodStart,
        periodEnd,
        input.includeVoided ?? false,
      );

      // 7. Query transactions for period
      const transactions = await this.transactionRepository.findByCompanyAndPeriod(
        input.companyId,
        periodStart,
        periodEnd,
      );

      // 8. Query credit notes for invoices in period
      const invoiceIds = invoices.map((inv) => inv.id);
      const creditNotes =
        invoiceIds.length > 0 ? await this.creditNoteRepository.findByInvoiceIds(invoiceIds) : [];

      // 9. Check if any records found
      const recordCount = invoices.length + transactions.length + creditNotes.length;
      if (recordCount === 0) {
        throw new NotFoundError('No financial records found for the specified period');
      }

      // 10. Generate export file
      const exportData: ExportData = {
        invoices,
        transactions,
        creditNotes,
        periodStart,
        periodEnd,
        companyId: input.companyId,
      };

      const fileContent =
        format === ExportFormat.CSV
          ? await this.exportFileGenerator.generateCSV(exportData)
          : await this.exportFileGenerator.generateJSON(exportData);

      // 11. Store export file
      const fileName = this.generateFileName(input.companyId, periodStart, periodEnd, format);
      const deliveryMethod = input.deliveryMethod ?? 'download';

      let filePath: string | undefined;
      let sftpReference: string | undefined;
      let downloadUrl: string | undefined;

      if (deliveryMethod === 'sftp') {
        // Upload to SFTP (would need SFTP config, simplified here)
        sftpReference = await this.fileStorageService.uploadToSFTP(
          fileContent,
          fileName,
          {} as SFTPConfig, // SFTP config would come from configuration
        );
      } else {
        // Save locally
        filePath = await this.fileStorageService.saveFile(fileContent, fileName);
        downloadUrl = `/exports/${fileName}`; // Simplified download URL
      }

      // 12. Create FinancialExport domain entity
      const exportEntity = this.createFinancialExportEntity(
        input.companyId,
        periodStart,
        periodEnd,
        format,
        filePath,
        sftpReference,
        input.performedBy,
      );

      // 13. Persist export via repository
      const savedExport = await this.financialExportRepository.save(exportEntity);

      // 14. Create audit log entry
      await this.createAuditLog(savedExport, recordCount, input.performedBy);

      // 15. Return success result
      return {
        success: true,
        export: this.mapToOutput(savedExport, recordCount, downloadUrl),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization (must have Accountant or Owner role)
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
        return role.isAccountant() || role.isOwner();
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError('Only Accountant or Owner role can create financial exports');
    }
  }

  /**
   * Validates required fields
   */
  private validateRequiredFields(input: CreateFinancialExportInput): void {
    if (!input.companyId || input.companyId.trim().length === 0) {
      throw new ValidationError('Company ID is required');
    }

    if (!input.periodStart) {
      throw new ValidationError('Period start date is required');
    }

    if (!input.periodEnd) {
      throw new ValidationError('Period end date is required');
    }

    if (!input.format) {
      throw new ValidationError('Format is required');
    }
  }

  /**
   * Validates and normalizes period dates
   */
  private validateAndNormalizePeriod(
    periodStart: Date,
    periodEnd: Date,
  ): { periodStart: Date; periodEnd: Date } {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    if (isNaN(start.getTime())) {
      throw new ValidationError('Period start date must be a valid date');
    }

    if (isNaN(end.getTime())) {
      throw new ValidationError('Period end date must be a valid date');
    }

    if (start > end) {
      throw new ValidationError('Period start date must be before or equal to end date');
    }

    // Validate period range
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // +1 to include both days

    if (diffDays > CreateFinancialExportUseCase.MAX_PERIOD_DAYS) {
      throw new ValidationError(
        `Export period cannot exceed ${CreateFinancialExportUseCase.MAX_PERIOD_DAYS} days`,
      );
    }

    return { periodStart: start, periodEnd: end };
  }

  /**
   * Validates export format
   */
  private validateFormat(format: string): ExportFormat {
    if (format === 'csv' || format === 'CSV') {
      return ExportFormat.CSV;
    }
    if (format === 'json' || format === 'JSON') {
      return ExportFormat.JSON;
    }
    throw new ValidationError("Format must be 'csv' or 'json'");
  }

  /**
   * Validates and loads company
   */
  private async validateAndLoadCompany(companyId: string): Promise<Company> {
    const company = await this.companyRepository.findById(companyId);

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    return company;
  }

  /**
   * Generates export file name
   */
  private generateFileName(
    companyId: string,
    start: Date,
    end: Date,
    format: ExportFormat,
  ): string {
    const startStr = start.toISOString().split('T')[0]; // YYYY-MM-DD
    const endStr = end.toISOString().split('T')[0]; // YYYY-MM-DD
    const extension = format === ExportFormat.CSV ? 'csv' : 'json';
    return `financial-export-${companyId}-${startStr}-${endStr}.${extension}`;
  }

  /**
   * Creates FinancialExport domain entity
   */
  private createFinancialExportEntity(
    companyId: string,
    periodStart: Date,
    periodEnd: Date,
    format: ExportFormat,
    filePath: string | undefined,
    sftpReference: string | undefined,
    createdBy: string,
  ): FinancialExport {
    const exportId = this.generateId();
    const now = new Date();

    const exportEntity = new FinancialExport(
      exportId,
      companyId,
      createdBy,
      format,
      periodStart,
      periodEnd,
      filePath,
      sftpReference,
      now,
    );

    return exportEntity;
  }

  /**
   * Creates audit log entry for export creation
   */
  private async createAuditLog(
    exportEntity: FinancialExport,
    recordCount: number,
    performedBy: string,
  ): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'FinancialExport',
        exportEntity.id,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            id: exportEntity.id,
            companyId: exportEntity.companyId,
            periodStart: exportEntity.periodStart,
            periodEnd: exportEntity.periodEnd,
            format: exportEntity.format,
            recordCount,
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
   * Maps FinancialExport domain entity to output model
   */
  private mapToOutput(
    exportEntity: FinancialExport,
    recordCount: number,
    downloadUrl?: string,
  ): CreateFinancialExportOutput {
    return {
      id: exportEntity.id,
      companyId: exportEntity.companyId,
      periodStart: exportEntity.periodStart!,
      periodEnd: exportEntity.periodEnd!,
      format: exportEntity.format,
      status: exportEntity.isGenerated() ? 'completed' : 'pending',
      filePath: exportEntity.filePath,
      sftpReference: exportEntity.sftpReference,
      recordCount,
      createdBy: exportEntity.createdBy,
      createdAt: exportEntity.createdAt,
      downloadUrl,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): CreateFinancialExportResult {
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
