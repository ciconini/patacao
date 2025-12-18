/**
 * Invoice Domain Events
 *
 * Domain events related to Invoice aggregate.
 * These events are raised when significant things happen to invoices.
 */

import { BaseDomainEvent } from '../domain-event.base';

/**
 * InvoiceIssued Event
 * Raised when an invoice is issued (moved from draft to issued status)
 */
export class InvoiceIssuedEvent extends BaseDomainEvent {
  constructor(
    invoiceId: string,
    invoiceNumber: string,
    companyId: string,
    storeId: string,
    total: number,
    issuedBy: string,
    issuedAt: Date,
  ) {
    super(
      invoiceId,
      'Invoice',
      {
        invoiceNumber,
        companyId,
        storeId,
        total,
        issuedAt: issuedAt.toISOString(),
      },
      issuedBy,
    );
  }
}

/**
 * InvoicePaid Event
 * Raised when an invoice is marked as paid
 */
export class InvoicePaidEvent extends BaseDomainEvent {
  constructor(
    invoiceId: string,
    invoiceNumber: string,
    paymentMethod: string,
    paidAt: Date,
    paidBy: string,
  ) {
    super(
      invoiceId,
      'Invoice',
      {
        invoiceNumber,
        paymentMethod,
        paidAt: paidAt.toISOString(),
      },
      paidBy,
    );
  }
}

/**
 * InvoiceVoided Event
 * Raised when an invoice is voided
 */
export class InvoiceVoidedEvent extends BaseDomainEvent {
  constructor(invoiceId: string, invoiceNumber: string, reason: string, voidedBy: string) {
    super(
      invoiceId,
      'Invoice',
      {
        invoiceNumber,
        reason,
      },
      voidedBy,
    );
  }
}
