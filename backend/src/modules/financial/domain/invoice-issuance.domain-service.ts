/**
 * InvoiceIssuanceDomainService
 * 
 * Domain service responsible for validating invoice issuance rules and state transitions.
 * This service validates that invoices can be issued, enforces immutability after issuance,
 * and validates state transitions according to business rules.
 * 
 * Responsibilities:
 * - Validate Company NIF presence for invoice issuance
 * - Validate invoice state transitions
 * - Enforce immutability after issuance
 * - Validate issuance prerequisites
 * 
 * Collaborating Entities:
 * - Invoice: The invoice entity being issued or transitioned
 * - Company: The company entity that issues the invoice (provides NIF validation)
 * 
 * Business Rules Enforced:
 * - BR: Invoice cannot be `issued` without valid Company `nif` and sequential `invoice_number`
 * - BR: Once `issued`, editing is restricted; void/credit-note flows are required to correct
 * - BR: Invoice must be in DRAFT status to be issued
 * - BR: Invoice must have at least one line item to be issued
 * - BR: Valid state transitions:
 *   - DRAFT -> ISSUED
 *   - ISSUED -> PAID
 *   - PAID -> REFUNDED
 *   - DRAFT/ISSUED -> CANCELLED (but not PAID or REFUNDED)
 * - BR: Company NIF must be valid (Portuguese NIF format) for invoicing
 * 
 * Invariants:
 * - Company must have a valid NIF for invoice issuance
 * - Invoice must be in DRAFT status to be issued
 * - Invoice must have at least one line item to be issued
 * - Invoice number must be present (validated at entity level)
 * - Once issued, invoice cannot be modified (only status transitions allowed)
 * 
 * Edge Cases:
 * - Company with missing NIF
 * - Company with invalid NIF format
 * - Invoice already issued (cannot issue again)
 * - Invoice in PAID status (cannot modify)
 * - Invoice in CANCELLED status (cannot modify or issue)
 * - Invoice in REFUNDED status (cannot modify)
 * - Invoice with no line items
 * - Attempting invalid state transitions
 * - Issuing invoice with invalid invoice number
 */

import { Invoice, InvoiceStatus } from './invoice.entity';
import { Company } from '../../administrative/domain/company.entity';

export interface IssuanceValidationResult {
  canIssue: boolean;
  errors: string[];
  warnings: string[];
}

export interface StateTransitionValidationResult {
  canTransition: boolean;
  errors: string[];
  warnings: string[];
}

export class InvoiceIssuanceDomainService {
  /**
   * Validates if an invoice can be issued.
   * 
   * This method performs comprehensive validation including:
   * - Company NIF validation
   * - Invoice status validation
   * - Invoice line items validation
   * - Invoice number presence validation
   * 
   * Business Rule: Invoice cannot be issued without valid Company NIF and sequential invoice_number
   * 
   * @param invoice - The invoice to validate for issuance
   * @param company - The company that issues the invoice
   * @returns Validation result with errors and warnings
   * @throws Error if invoice or company is not provided
   */
  validateInvoiceIssuance(
    invoice: Invoice,
    company: Company
  ): IssuanceValidationResult {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    if (!company) {
      throw new Error('Company entity is required');
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate Company NIF
    const nifValidation = this.validateCompanyNif(company);
    if (!nifValidation.isValid) {
      errors.push(...nifValidation.errors);
    }

    // Validate invoice status
    if (invoice.status !== InvoiceStatus.DRAFT) {
      errors.push(
        `Invoice cannot be issued. Current status: ${invoice.status}. ` +
        `Invoice must be in DRAFT status to be issued.`
      );
    }

    // Validate invoice has line items
    if (invoice.lines.length === 0) {
      errors.push('Invoice cannot be issued without line items');
    }

    // Validate invoice number is present
    if (!invoice.invoiceNumber || invoice.invoiceNumber.trim().length === 0) {
      errors.push('Invoice number is required for issuance');
    }

    // Validate company ID matches
    if (invoice.companyId !== company.id) {
      errors.push(
        `Invoice company ID (${invoice.companyId}) does not match provided company ID (${company.id})`
      );
    }

    // Check if invoice is already issued
    if (invoice.status === InvoiceStatus.ISSUED) {
      warnings.push('Invoice is already issued');
    }

    // Check if invoice is in a terminal state
    if (invoice.status === InvoiceStatus.PAID) {
      errors.push('Cannot issue an invoice that is already paid');
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      errors.push('Cannot issue an invoice that is cancelled');
    }

    if (invoice.status === InvoiceStatus.REFUNDED) {
      errors.push('Cannot issue an invoice that is refunded');
    }

    return {
      canIssue: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates that a Company has a valid NIF for invoice issuance.
   * 
   * Business Rule: Invoice cannot be issued without valid Company NIF
   * Business Rule: NIF must validate against Portuguese NIF format when used for invoicing
   * 
   * @param company - The company to validate
   * @returns Validation result
   */
  validateCompanyNif(company: Company): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!company) {
      errors.push('Company entity is required');
      return { isValid: false, errors };
    }

    // Check if NIF is present
    if (!company.nif || company.nif.trim().length === 0) {
      errors.push('Company NIF is required for invoice issuance');
      return { isValid: false, errors };
    }

    // Check if NIF is valid (Company entity validates format)
    if (!company.hasValidNif()) {
      errors.push(
        `Company NIF "${company.nif}" is not valid. ` +
        `NIF must be in Portuguese format for invoice issuance.`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates if an invoice state transition is allowed.
   * 
   * Valid transitions:
   * - DRAFT -> ISSUED
   * - ISSUED -> PAID
   * - PAID -> REFUNDED
   * - DRAFT/ISSUED -> CANCELLED (but not PAID or REFUNDED)
   * 
   * @param invoice - The invoice
   * @param targetStatus - The target status to transition to
   * @returns Validation result
   */
  validateStateTransition(
    invoice: Invoice,
    targetStatus: InvoiceStatus
  ): StateTransitionValidationResult {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const currentStatus = invoice.status;

    // Same status - no transition needed
    if (currentStatus === targetStatus) {
      warnings.push(`Invoice is already in ${targetStatus} status`);
      return {
        canTransition: true,
        errors,
        warnings,
      };
    }

    // Validate specific transitions
    switch (targetStatus) {
      case InvoiceStatus.ISSUED:
        if (currentStatus !== InvoiceStatus.DRAFT) {
          errors.push(
            `Cannot transition from ${currentStatus} to ISSUED. ` +
            `Only DRAFT invoices can be issued.`
          );
        }
        break;

      case InvoiceStatus.PAID:
        if (currentStatus !== InvoiceStatus.ISSUED) {
          errors.push(
            `Cannot transition from ${currentStatus} to PAID. ` +
            `Only ISSUED invoices can be marked as paid.`
          );
        }
        break;

      case InvoiceStatus.REFUNDED:
        if (currentStatus !== InvoiceStatus.PAID) {
          errors.push(
            `Cannot transition from ${currentStatus} to REFUNDED. ` +
            `Only PAID invoices can be refunded.`
          );
        }
        break;

      case InvoiceStatus.CANCELLED:
        if (currentStatus === InvoiceStatus.PAID) {
          errors.push(
            `Cannot cancel a PAID invoice. Use refund flow instead.`
          );
        } else if (currentStatus === InvoiceStatus.REFUNDED) {
          errors.push(
            `Cannot cancel a REFUNDED invoice.`
          );
        } else if (currentStatus === InvoiceStatus.CANCELLED) {
          warnings.push('Invoice is already cancelled');
        }
        // DRAFT and ISSUED can be cancelled
        break;

      case InvoiceStatus.DRAFT:
        // Cannot transition back to DRAFT from any other status
        errors.push(
          `Cannot transition from ${currentStatus} to DRAFT. ` +
          `Once issued, invoices cannot be returned to draft status. ` +
          `Use void/credit-note flows to correct issued invoices.`
        );
        break;

      default:
        errors.push(`Unknown target status: ${targetStatus}`);
    }

    return {
      canTransition: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates if an invoice can be modified.
   * 
   * Business Rule: Once issued, editing is restricted; void/credit-note flows are required to correct
   * 
   * @param invoice - The invoice to check
   * @returns True if invoice can be modified
   */
  canModifyInvoice(invoice: Invoice): boolean {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    // Only DRAFT invoices can be modified
    return invoice.status === InvoiceStatus.DRAFT;
  }

  /**
   * Validates if an invoice can be issued (convenience method).
   * 
   * @param invoice - The invoice to check
   * @param company - The company that issues the invoice
   * @returns True if invoice can be issued
   */
  canIssueInvoice(invoice: Invoice, company: Company): boolean {
    const validation = this.validateInvoiceIssuance(invoice, company);
    return validation.canIssue;
  }

  /**
   * Validates if an invoice can be marked as paid.
   * 
   * @param invoice - The invoice to check
   * @returns True if invoice can be marked as paid
   */
  canMarkAsPaid(invoice: Invoice): boolean {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    return invoice.status === InvoiceStatus.ISSUED;
  }

  /**
   * Validates if an invoice can be refunded.
   * 
   * @param invoice - The invoice to check
   * @returns True if invoice can be refunded
   */
  canRefundInvoice(invoice: Invoice): boolean {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    return invoice.status === InvoiceStatus.PAID;
  }

  /**
   * Validates if an invoice can be cancelled.
   * 
   * @param invoice - The invoice to check
   * @returns True if invoice can be cancelled
   */
  canCancelInvoice(invoice: Invoice): boolean {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    const validation = this.validateStateTransition(invoice, InvoiceStatus.CANCELLED);
    return validation.canTransition;
  }

  /**
   * Gets all valid target statuses for an invoice from its current status.
   * 
   * @param invoice - The invoice to check
   * @returns Array of valid target statuses
   */
  getValidTargetStatuses(invoice: Invoice): InvoiceStatus[] {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    const validStatuses: InvoiceStatus[] = [];
    const currentStatus = invoice.status;

    switch (currentStatus) {
      case InvoiceStatus.DRAFT:
        validStatuses.push(InvoiceStatus.ISSUED, InvoiceStatus.CANCELLED);
        break;

      case InvoiceStatus.ISSUED:
        validStatuses.push(InvoiceStatus.PAID, InvoiceStatus.CANCELLED);
        break;

      case InvoiceStatus.PAID:
        validStatuses.push(InvoiceStatus.REFUNDED);
        break;

      case InvoiceStatus.CANCELLED:
      case InvoiceStatus.REFUNDED:
        // Terminal states - no valid transitions
        break;
    }

    return validStatuses;
  }

  /**
   * Validates that an invoice is immutable (already issued or in terminal state).
   * 
   * Business Rule: Once issued, editing is restricted
   * 
   * @param invoice - The invoice to check
   * @returns True if invoice is immutable
   */
  isInvoiceImmutable(invoice: Invoice): boolean {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    return invoice.status !== InvoiceStatus.DRAFT;
  }

  /**
   * Validates that an invoice is in a terminal state (cannot be further modified or transitioned).
   * 
   * @param invoice - The invoice to check
   * @returns True if invoice is in terminal state
   */
  isInvoiceInTerminalState(invoice: Invoice): boolean {
    if (!invoice) {
      throw new Error('Invoice entity is required');
    }

    return invoice.status === InvoiceStatus.CANCELLED ||
           invoice.status === InvoiceStatus.REFUNDED;
  }

  /**
   * Validates all prerequisites for invoice issuance.
   * 
   * This is a comprehensive check that combines all issuance validations.
   * 
   * @param invoice - The invoice to validate
   * @param company - The company that issues the invoice
   * @returns Validation result with detailed information
   */
  validateIssuancePrerequisites(
    invoice: Invoice,
    company: Company
  ): IssuanceValidationResult {
    return this.validateInvoiceIssuance(invoice, company);
  }
}

