/**
 * Domain Event Base Tests
 * 
 * Unit tests for the base domain event class and interface.
 */

import { BaseDomainEvent, DomainEvent } from './domain-event.base';
import { InvoiceIssuedEvent } from './events/invoice-events';

describe('BaseDomainEvent', () => {
  describe('Event Creation', () => {
    it('should create an event with all required properties', () => {
      const event = new InvoiceIssuedEvent(
        'invoice-123',
        'INV-001',
        'company-456',
        'store-789',
        100.50,
        'user-001',
        new Date('2024-01-15T10:00:00Z'),
      );

      expect(event.eventId).toBeDefined();
      expect(event.eventType).toBe('InvoiceIssuedEvent');
      expect(event.aggregateId).toBe('invoice-123');
      expect(event.aggregateType).toBe('Invoice');
      expect(event.occurredAt).toBeInstanceOf(Date);
      expect(event.performedBy).toBe('user-001');
      expect(event.version).toBe(1);
      expect(event.payload).toBeDefined();
    });

    it('should generate unique event IDs', () => {
      const event1 = new InvoiceIssuedEvent(
        'invoice-1',
        'INV-001',
        'company-1',
        'store-1',
        100,
        'user-1',
        new Date(),
      );
      const event2 = new InvoiceIssuedEvent(
        'invoice-2',
        'INV-002',
        'company-2',
        'store-2',
        200,
        'user-2',
        new Date(),
      );

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should use provided event ID if given', () => {
      const customEventId = 'custom-event-id-123';
      // Note: InvoiceIssuedEvent doesn't accept eventId, but BaseDomainEvent does
      // We'll test with a direct BaseDomainEvent instance
      class TestEvent extends BaseDomainEvent {
        constructor(aggregateId: string, payload: Record<string, any>, performedBy?: string, eventId?: string) {
          super(aggregateId, 'TestAggregate', payload, performedBy, eventId);
        }
      }

      const event = new TestEvent('agg-1', { test: 'data' }, 'user-1', customEventId);
      expect(event.eventId).toBe(customEventId);
    });

    it('should set occurredAt to current time', () => {
      const before = new Date();
      const event = new InvoiceIssuedEvent(
        'invoice-123',
        'INV-001',
        'company-456',
        'store-789',
        100.50,
        'user-001',
        new Date(),
      );
      const after = new Date();

      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should make payload immutable', () => {
      const event = new InvoiceIssuedEvent(
        'invoice-123',
        'INV-001',
        'company-456',
        'store-789',
        100.50,
        'user-001',
        new Date(),
      );

      expect(() => {
        (event.payload as any).newField = 'test';
      }).toThrow();
    });
  });

  describe('toJSON', () => {
    it('should serialize event to JSON format', () => {
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

      const json = event.toJSON();

      expect(json).toMatchObject({
        eventId: event.eventId,
        eventType: 'InvoiceIssuedEvent',
        aggregateId: 'invoice-123',
        aggregateType: 'Invoice',
        performedBy: 'user-001',
        version: 1,
      });
      expect(json.occurredAt).toBeInstanceOf(Date);
      expect(json.payload).toMatchObject({
        invoiceNumber: 'INV-001',
        companyId: 'company-456',
        storeId: 'store-789',
        total: 100.50,
        issuedAt: issuedAt.toISOString(),
      });
    });

    it('should include all event properties in JSON', () => {
      const event = new InvoiceIssuedEvent(
        'invoice-123',
        'INV-001',
        'company-456',
        'store-789',
        100.50,
        'user-001',
        new Date(),
      );

      const json = event.toJSON();
      const keys = Object.keys(json);

      expect(keys).toContain('eventId');
      expect(keys).toContain('eventType');
      expect(keys).toContain('aggregateId');
      expect(keys).toContain('aggregateType');
      expect(keys).toContain('occurredAt');
      expect(keys).toContain('performedBy');
      expect(keys).toContain('version');
      expect(keys).toContain('payload');
    });
  });

  describe('Event Types', () => {
    it('should have correct event type from class name', () => {
      const event = new InvoiceIssuedEvent(
        'invoice-123',
        'INV-001',
        'company-456',
        'store-789',
        100.50,
        'user-001',
        new Date(),
      );

      expect(event.eventType).toBe('InvoiceIssuedEvent');
    });
  });
});

