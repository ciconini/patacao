/**
 * Import Customers Use Case (UC-ADMIN-011)
 * 
 * Application use case for importing customer records from CSV or JSON file.
 * This use case orchestrates domain entities and domain services to import customers in bulk.
 * 
 * Responsibilities:
 * - Validate user authorization (Manager or Owner role required)
 * - Validate file format and size
 * - Parse file (CSV or JSON)
 * - Validate each record
 * - Create customers (reusing customer creation logic)
 * - Handle duplicates based on skip_duplicates flag
 * - Generate import summary with errors
 * - Create audit log entry
 * 
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - File system operations (handled by adapters)
 * - Persistence implementation details
 */

import { Customer } from '../domain/customer.entity';
import { Address } from '../../shared/domain/address.value-object';
import { EmailAddress } from '../../shared/domain/email-address.value-object';
import { PhoneNumber } from '../../shared/domain/phone-number.value-object';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface CustomerRepository {
  save(customer: Customer): Promise<Customer>;
  findByEmail(email: string): Promise<Customer | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// File parser interface (port)
export interface FileParser {
  parseCSV(content: string): Promise<Record<string, string>[]>;
  parseJSON(content: string): Promise<Record<string, unknown>[]>;
}

// Input model
export interface ImportCustomersInput {
  fileContent: string; // File content as string (parsed by adapter)
  format: 'csv' | 'json';
  skipDuplicates?: boolean; // Default true
  dryRun?: boolean; // Default false
  performedBy: string; // User ID
}

// Import record model
export interface ImportRecord {
  rowNumber: number;
  data: {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
    consentMarketing?: boolean;
    consentReminders?: boolean;
  };
}

// Import error model
export interface ImportError {
  rowNumber: number;
  field?: string;
  message: string;
  data: Record<string, unknown>;
}

// Output model
export interface ImportCustomersOutput {
  importId: string;
  status: 'completed' | 'failed' | 'partial';
  totalRecords: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: ImportError[];
  createdAt: Date;
}

// Result type
export interface ImportCustomersResult {
  success: boolean;
  data?: ImportCustomersOutput;
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

export class ParseError extends ApplicationError {
  constructor(message: string = 'File could not be parsed') {
    super('PARSE_ERROR', message);
    this.name = 'ParseError';
  }
}

/**
 * Import Customers Use Case
 */
export class ImportCustomersUseCase {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly fileParser: FileParser,
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
   * Executes the import customers use case
   * 
   * @param input - Import input data
   * @returns Result containing import summary or error
   */
  async execute(input: ImportCustomersInput): Promise<ImportCustomersResult> {
    try {
      // 1. Validate user exists and has Manager or Owner role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate file format
      this.validateFileFormat(input.format);

      // 3. Validate file size
      this.validateFileSize(input.fileContent);

      // 4. Parse file
      const records = await this.parseFile(input.fileContent, input.format);

      // 5. Process records
      const result = await this.processRecords(records, input);

      // 6. Create audit log entry
      await this.createAuditLog(result, input.performedBy);

      // 7. Return success result
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization (must have Manager or Owner role)
   * 
   * @param userId - User ID to validate
   * @throws UnauthorizedError if user not found
   * @throws ForbiddenError if user does not have required role
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
      throw new ForbiddenError('Only Manager or Owner role can import customers');
    }
  }

  /**
   * Validates file format
   * 
   * @param format - File format
   * @throws ValidationError if invalid format
   */
  private validateFileFormat(format: string): void {
    if (format !== 'csv' && format !== 'json') {
      throw new ValidationError('File format must be \'csv\' or \'json\'');
    }
  }

  /**
   * Validates file size
   * 
   * @param content - File content
   * @throws ValidationError if file too large
   */
  private validateFileSize(content: string): void {
    const sizeInBytes = new Blob([content]).size;
    if (sizeInBytes > ImportCustomersUseCase.MAX_FILE_SIZE) {
      throw new ValidationError(`File size exceeds maximum limit of ${ImportCustomersUseCase.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }
  }

  /**
   * Parses file content based on format
   * 
   * @param content - File content
   * @param format - File format
   * @returns Parsed records
   * @throws ParseError if parsing fails
   */
  private async parseFile(content: string, format: 'csv' | 'json'): Promise<Record<string, unknown>[]> {
    try {
      if (format === 'csv') {
        return await this.fileParser.parseCSV(content);
      } else {
        return await this.fileParser.parseJSON(content);
      }
    } catch (error: any) {
      throw new ParseError(`File could not be parsed. Please check file format: ${error.message}`);
    }
  }

  /**
   * Processes import records
   * 
   * @param records - Parsed records
   * @param input - Import input
   * @returns Import result
   */
  private async processRecords(
    records: Record<string, unknown>[],
    input: ImportCustomersInput
  ): Promise<ImportCustomersOutput> {
    const importId = this.generateId();
    const skipDuplicates = input.skipDuplicates ?? true;
    const dryRun = input.dryRun ?? false;

    let successful = 0;
    let failed = 0;
    let skipped = 0;
    const errors: ImportError[] = [];

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const rowNumber = i + 1;
      const record = records[i];

      try {
        // Normalize record data
        const normalizedRecord = this.normalizeRecord(record);

        // Validate record
        this.validateRecord(normalizedRecord, rowNumber);

        // Check for duplicate email if skip_duplicates is true
        if (skipDuplicates && normalizedRecord.email) {
          const existingCustomer = await this.customerRepository.findByEmail(normalizedRecord.email);
          if (existingCustomer) {
            skipped++;
            continue;
          }
        }

        // Create customer if not dry run
        if (!dryRun) {
          const customer = await this.createCustomerFromRecord(normalizedRecord, input.performedBy);
          if (customer) {
            successful++;
          } else {
            failed++;
            errors.push({
              rowNumber,
              message: 'Failed to create customer',
              data: record,
            });
          }
        } else {
          // Dry run - just count as successful if valid
          successful++;
        }
      } catch (error: any) {
        failed++;
        errors.push({
          rowNumber,
          field: error.field,
          message: error.message || 'Validation failed',
          data: record,
        });
      }
    }

    // Determine status
    let status: 'completed' | 'failed' | 'partial';
    if (failed === 0) {
      status = 'completed';
    } else if (successful === 0) {
      status = 'failed';
    } else {
      status = 'partial';
    }

    return {
      importId,
      status,
      totalRecords: records.length,
      successful,
      failed,
      skipped,
      errors,
      createdAt: new Date(),
    };
  }

  /**
   * Normalizes record data from parsed format
   * 
   * @param record - Parsed record
   * @returns Normalized import record
   */
  private normalizeRecord(record: Record<string, unknown>): ImportRecord['data'] {
    return {
      fullName: this.getStringValue(record, 'full_name') || this.getStringValue(record, 'fullName'),
      email: this.getStringValue(record, 'email'),
      phone: this.getStringValue(record, 'phone'),
      address: this.getAddressValue(record),
      consentMarketing: this.getBooleanValue(record, 'consent_marketing') || this.getBooleanValue(record, 'consentMarketing'),
      consentReminders: this.getBooleanValue(record, 'consent_reminders') ?? this.getBooleanValue(record, 'consentReminders') ?? true,
    };
  }

  /**
   * Gets string value from record
   */
  private getStringValue(record: Record<string, unknown>, key: string): string | undefined {
    const value = record[key];
    if (value === null || value === undefined) {
      return undefined;
    }
    const str = String(value).trim();
    return str.length > 0 ? str : undefined;
  }

  /**
   * Gets boolean value from record
   */
  private getBooleanValue(record: Record<string, unknown>, key: string): boolean | undefined {
    const value = record[key];
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      if (lower === 'true' || lower === '1' || lower === 'yes') {
        return true;
      }
      if (lower === 'false' || lower === '0' || lower === 'no') {
        return false;
      }
    }
    return undefined;
  }

  /**
   * Gets address value from record
   */
  private getAddressValue(record: Record<string, unknown>): ImportRecord['data']['address'] | undefined {
    // Try structured address object first
    if (record.address && typeof record.address === 'object') {
      const addr = record.address as Record<string, unknown>;
      return {
        street: this.getStringValue(addr, 'street'),
        city: this.getStringValue(addr, 'city'),
        postalCode: this.getStringValue(addr, 'postal_code') || this.getStringValue(addr, 'postalCode'),
        country: this.getStringValue(addr, 'country'),
      };
    }

    // Try flat address fields (CSV format)
    const street = this.getStringValue(record, 'address_street') || this.getStringValue(record, 'addressStreet');
    const city = this.getStringValue(record, 'address_city') || this.getStringValue(record, 'addressCity');
    const postalCode = this.getStringValue(record, 'address_postal_code') || this.getStringValue(record, 'addressPostalCode');
    const country = this.getStringValue(record, 'address_country') || this.getStringValue(record, 'addressCountry');

    if (street || city || postalCode) {
      return { street, city, postalCode, country };
    }

    return undefined;
  }

  /**
   * Validates import record
   * 
   * @param record - Normalized record
   * @param rowNumber - Row number for error reporting
   * @throws ValidationError if validation fails
   */
  private validateRecord(record: ImportRecord['data'], rowNumber: number): void {
    if (!record.fullName || record.fullName.trim().length === 0) {
      throw new ValidationError(`Row ${rowNumber}: Full name is required`);
    }

    if (record.email) {
      try {
        new EmailAddress(record.email);
      } catch (error: any) {
        throw new ValidationError(`Row ${rowNumber}: Invalid email format: ${error.message}`);
      }
    }

    if (record.phone) {
      try {
        new PhoneNumber(record.phone);
      } catch (error: any) {
        throw new ValidationError(`Row ${rowNumber}: Invalid phone format: ${error.message}`);
      }
    }

    if (record.address) {
      if (!record.address.street || !record.address.city || !record.address.postalCode) {
        throw new ValidationError(`Row ${rowNumber}: Address must contain street, city, and postal_code`);
      }
      try {
        new Address(
          record.address.street,
          record.address.city,
          record.address.postalCode,
          record.address.country
        );
      } catch (error: any) {
        throw new ValidationError(`Row ${rowNumber}: Invalid address: ${error.message}`);
      }
    }
  }

  /**
   * Creates customer from import record
   * 
   * @param record - Normalized record
   * @param performedBy - User ID performing the import
   * @returns Created customer or null if failed
   */
  private async createCustomerFromRecord(
    record: ImportRecord['data'],
    performedBy: string
  ): Promise<Customer | null> {
    try {
      const customerId = this.generateId();
      const now = new Date();

      // Create value objects
      let email: EmailAddress | undefined;
      if (record.email) {
        email = new EmailAddress(record.email);
      }

      let phone: PhoneNumber | undefined;
      if (record.phone) {
        phone = new PhoneNumber(record.phone);
      }

      let address: Address | undefined;
      if (record.address && record.address.street && record.address.city && record.address.postalCode) {
        address = new Address(
          record.address.street,
          record.address.city,
          record.address.postalCode,
          record.address.country
        );
      }

      // Create customer entity
      const customer = new Customer(
        customerId,
        record.fullName!,
        email?.value,
        phone?.value,
        address ? {
          street: address.street,
          city: address.city,
          postalCode: address.postalCode,
          country: address.country,
        } : undefined,
        record.consentMarketing ?? false,
        record.consentReminders ?? true,
        now,
        now
      );

      // Persist customer
      return await this.customerRepository.save(customer);
    } catch (error) {
      return null;
    }
  }

  /**
   * Creates audit log entry for import
   * 
   * @param result - Import result
   * @param performedBy - User ID who performed the import
   */
  private async createAuditLog(
    result: ImportCustomersOutput,
    performedBy: string
  ): Promise<void> {
    try {
      const auditResult = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'CustomerImport',
        result.importId,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            importId: result.importId,
            status: result.status,
            totalRecords: result.totalRecords,
            successful: result.successful,
            failed: result.failed,
            skipped: result.skipped,
          },
        },
        new Date()
      );

      if (auditResult.auditLog) {
        await this.auditLogRepository.save(auditResult.auditLog);
      }
    } catch (error: any) {
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Handles errors and converts them to result format
   * 
   * @param error - Error that occurred
   * @returns Error result
   */
  private handleError(error: unknown): ImportCustomersResult {
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

