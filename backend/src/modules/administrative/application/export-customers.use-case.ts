/**
 * Export Customers Use Case
 *
 * Application use case for exporting customer records to CSV or JSON format.
 * This use case orchestrates domain entities and repository ports to export customers.
 *
 * Responsibilities:
 * - Validate user authorization (Manager or Accountant role required)
 * - Apply search filters to get customers
 * - Format customers as CSV or JSON
 * - Return formatted export content
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - File system operations
 * - Persistence implementation details
 */

import { Inject } from '@nestjs/common';
import { RoleId } from '../../shared/domain/role-id.value-object';
import {
  SearchCustomersUseCase,
  SearchCustomersInput,
} from './search-customers.use-case';

// Repository interfaces (ports)
export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface ExportCustomersInput {
  format: 'csv' | 'json';
  q?: string;
  email?: string;
  phone?: string;
  fullName?: string;
  consentMarketing?: boolean;
  consentReminders?: boolean;
  archived?: boolean;
  performedBy: string; // User ID
}

// Output model
export interface ExportCustomersOutput {
  content: string;
  format: 'csv' | 'json';
  filename: string;
  mimeType: string;
  recordCount: number;
}

// Result type
export interface ExportCustomersResult {
  success: boolean;
  data?: ExportCustomersOutput;
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

/**
 * Export Customers Use Case
 */
export class ExportCustomersUseCase {
  private static readonly MAX_EXPORT_RECORDS = 10000; // Limit to prevent memory issues

  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly searchCustomersUseCase: SearchCustomersUseCase,
  ) {}

  /**
   * Executes the export customers use case
   *
   * @param input - Export input data
   * @returns Result containing export content or error
   */
  async execute(input: ExportCustomersInput): Promise<ExportCustomersResult> {
    try {
      // 1. Validate user exists and has required role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate format
      if (input.format !== 'csv' && input.format !== 'json') {
        throw new ValidationError('Format must be either "csv" or "json"');
      }

      // 3. Fetch all customers matching the filters (without pagination limits)
      const allCustomers = await this.fetchAllCustomers(input);

      // 4. Check export size limit
      if (allCustomers.length > ExportCustomersUseCase.MAX_EXPORT_RECORDS) {
        throw new ValidationError(
          `Export exceeds maximum limit of ${ExportCustomersUseCase.MAX_EXPORT_RECORDS} records. Please apply filters to reduce the result set.`,
        );
      }

      // 5. Format customers based on format
      const content = this.formatCustomers(allCustomers, input.format);

      // 6. Generate filename
      const filename = this.generateFilename(input.format);

      // 7. Return success result
      return {
        success: true,
        data: {
          content,
          format: input.format,
          filename,
          mimeType: input.format === 'csv' ? 'text/csv' : 'application/json',
          recordCount: allCustomers.length,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization (must have Manager or Accountant role)
   *
   * @param userId - User ID to validate
   * @throws UnauthorizedError if user not found
   * @throws ForbiddenError if user does not have required role
   */
  private async validateUserAuthorization(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);

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
      throw new ForbiddenError('Only Manager, Accountant, or Owner role can export customers');
    }
  }

  /**
   * Fetches all customers matching the filters
   * Uses pagination to fetch all records
   *
   * @param input - Export input with filters
   * @returns Array of all matching customers
   */
  private async fetchAllCustomers(input: ExportCustomersInput): Promise<any[]> {
    const allCustomers: any[] = [];
    let page = 1;
    const perPage = 1000; // Fetch in batches
    let hasMore = true;

    while (hasMore) {
      const searchInput: SearchCustomersInput = {
        q: input.q,
        email: input.email,
        phone: input.phone,
        fullName: input.fullName,
        consentMarketing: input.consentMarketing,
        consentReminders: input.consentReminders,
        archived: input.archived,
        page,
        perPage,
        sort: 'createdAt',
        performedBy: input.performedBy,
      };

      const result = await this.searchCustomersUseCase.execute(searchInput);

      if (!result.success || !result.data) {
        throw new ApplicationError(
          'SEARCH_ERROR',
          result.error?.message || 'Failed to fetch customers for export',
        );
      }

      allCustomers.push(...result.data.items);

      hasMore = result.data.meta.hasNext;
      page++;

      // Safety check to prevent infinite loops
      if (page > 100) {
        break;
      }
    }

    return allCustomers;
  }

  /**
   * Formats customers as CSV or JSON
   *
   * @param customers - Array of customer data
   * @param format - Export format
   * @returns Formatted content string
   */
  private formatCustomers(customers: any[], format: 'csv' | 'json'): string {
    if (format === 'json') {
      return JSON.stringify(customers, null, 2);
    }

    // CSV format
    if (customers.length === 0) {
      return '';
    }

    // Get all possible fields from customers
    const fields = [
      'id',
      'fullName',
      'email',
      'phone',
      'address.street',
      'address.city',
      'address.postalCode',
      'address.country',
      'consentMarketing',
      'consentReminders',
      'createdAt',
      'updatedAt',
    ];

    // Build CSV header
    const header = fields.join(',');

    // Build CSV rows
    const rows = customers.map((customer) => {
      const values = fields.map((field) => {
        let value: any;

        if (field.includes('.')) {
          // Handle nested fields (e.g., address.street)
          const [parent, child] = field.split('.');
          value = customer[parent]?.[child] || '';
        } else {
          value = customer[field] || '';
        }

        // Format dates
        if (value instanceof Date) {
          value = value.toISOString();
        }

        // Convert boolean to string
        if (typeof value === 'boolean') {
          value = value ? 'true' : 'false';
        }

        // Escape CSV values (handle commas, quotes, newlines)
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      });

      return values.join(',');
    });

    return [header, ...rows].join('\n');
  }

  /**
   * Generates filename for export
   *
   * @param format - Export format
   * @returns Filename string
   */
  private generateFilename(format: 'csv' | 'json'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `customers-export-${timestamp}.${format}`;
  }

  /**
   * Handles errors and converts them to result format
   *
   * @param error - Error that occurred
   * @returns Error result
   */
  private handleError(error: unknown): ExportCustomersResult {
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

