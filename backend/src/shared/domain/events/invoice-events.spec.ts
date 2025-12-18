/**
 * Invoice Events Tests
 * 
 * Unit tests for invoice-related domain events.
 */

import { InvoiceIssuedEvent } from './invoice-events';
import { InvoicePaidEvent } from './invoice-events';
import { InvoiceVoidedEvent } from './invoice-events';

describe('InvoiceIssuedEvent', () => {
  it('should create an InvoiceIssuedEvent with correct properties', () => {
    const issuedAt = new Date('2024-01-15T10:00:00Z');
    const event = new InvoiceIssuedEvent(
      'invoice-123',
      'INV-001',
      'company-456',
      'store-789',
      100.50,
      'user-001',
      issuedAt,
    );

    expect(event.aggregateId).toBe('invoice-123');
    expect(event.aggregateType).toBe('Invoice');
    expect(event.eventType).toBe('InvoiceIssuedEvent');
    expect(event.performedBy).toBe('user-001');
    expect(event.payload).toMatchObject({
      invoiceNumber: 'INV-001',
      companyId: 'company-456',
      storeId: 'store-789',
      total: 100.50,
      issuedAt: issuedAt.toISOString(),
    });
  });

  it('should serialize issuedAt as ISO string in payload', () => {
    const issuedAt = new Date('2024-01-15T10:00:00Z');
    const event = new InvoiceIssuedEvent(
      'invoice-123',
      'INV-001',
      'company-456',
      'store-789',
      100.50,
      'user-001',
      issuedAt,
    );

    expect(event.payload.issuedAt).toBe(issuedAt.toISOString());
  });
});

describe('InvoicePaidEvent', () => {
  it('should create an InvoicePaidEvent with correct properties', () => {
    const paidAt = new Date('2024-01-16T14:30:00Z');
    const event = new InvoicePaidEvent(
      'invoice-123',
      'INV-001',
      'CARD',
      paidAt,
      'user-002',
    );

    expect(event.aggregateId).toBe('invoice-123');
    expect(event.aggregateType).toBe('Invoice');
    expect(event.eventType).toBe('InvoicePaidEvent');
    expect(event.performedBy).toBe('user-002');
    expect(event.payload).toMatchObject({
      invoiceNumber: 'INV-001',
      paymentMethod: 'CARD',
      paidAt: paidAt.toISOString(),
    });
  });
});

describe('InvoiceVoidedEvent', () => {
  it('should create an InvoiceVoidedEvent with correct properties', () => {
    const event = new InvoiceVoidedEvent(
      'invoice-123',
      'INV-001',
      'Customer requested cancellation',
      'user-003',
    );

    expect(event.aggregateId).toBe('invoice-123');
    expect(event.aggregateType).toBe('Invoice');
    expect(event.eventType).toBe('InvoiceVoidedEvent');
    expect(event.performedBy).toBe('user-003');
    expect(event.payload).toMatchObject({
      invoiceNumber: 'INV-001',
      reason: 'Customer requested cancellation',
    });
  });
});

