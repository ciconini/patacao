/**
 * In-Memory Event Bus Tests
 * 
 * Unit tests for the in-memory event bus implementation.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { InMemoryEventBus } from './in-memory-event-bus';
import { InvoiceIssuedEvent } from '../domain/events/invoice-events';
import { TransactionCompletedEvent } from '../domain/events/transaction-events';
import { DomainEvent } from '../domain/domain-event.base';

describe('InMemoryEventBus', () => {
  let eventBus: InMemoryEventBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InMemoryEventBus],
    }).compile();

    eventBus = module.get<InMemoryEventBus>(InMemoryEventBus);
  });

  afterEach(() => {
    eventBus.clearSubscriptions();
  });

  describe('Publishing Events', () => {
    it('should publish a single event', async () => {
      const handler = jest.fn();
      eventBus.subscribe('InvoiceIssuedEvent', handler);

      const event = new InvoiceIssuedEvent(
        'invoice-123',
        'INV-001',
        'company-456',
        'store-789',
        100.50,
        'user-001',
        new Date(),
      );

      await eventBus.publish(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should publish multiple events', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.subscribe('InvoiceIssuedEvent', handler1);
      eventBus.subscribe('TransactionCompletedEvent', handler2);

      const event1 = new InvoiceIssuedEvent(
        'invoice-123',
        'INV-001',
        'company-456',
        'store-789',
        100.50,
        'user-001',
        new Date(),
      );
      const event2 = new TransactionCompletedEvent(
        'transaction-123',
        'store-789',
        'invoice-123',
        'PAID',
        'CARD',
        100.50,
        'user-001',
      );

      await eventBus.publishAll([event1, event2]);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith(event1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledWith(event2);
    });

    it('should not throw error if no subscribers exist', async () => {
      const event = new InvoiceIssuedEvent(
        'invoice-123',
        'INV-001',
        'company-456',
        'store-789',
        100.50,
        'user-001',
        new Date(),
      );

      await expect(eventBus.publish(event)).resolves.not.toThrow();
    });

    it('should call all handlers for an event type', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      eventBus.subscribe('InvoiceIssuedEvent', handler1);
      eventBus.subscribe('InvoiceIssuedEvent', handler2);
      eventBus.subscribe('InvoiceIssuedEvent', handler3);

      const event = new InvoiceIssuedEvent(
        'invoice-123',
        'INV-001',
        'company-456',
        'store-789',
        100.50,
        'user-001',
        new Date(),
      );

      await eventBus.publish(event);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });
  });

  describe('Subscribing to Events', () => {
    it('should subscribe to an event type', () => {
      const handler = jest.fn();
      const subscriptionId = eventBus.subscribe('InvoiceIssuedEvent', handler);

      expect(subscriptionId).toBeDefined();
      expect(eventBus.getSubscribedEventTypes()).toContain('InvoiceIssuedEvent');
    });

    it('should return unique subscription IDs', () => {
      const handler = jest.fn();
      const id1 = eventBus.subscribe('InvoiceIssuedEvent', handler);
      const id2 = eventBus.subscribe('InvoiceIssuedEvent', handler);

      expect(id1).not.toBe(id2);
    });

    it('should allow multiple subscriptions to same event type', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.subscribe('InvoiceIssuedEvent', handler1);
      eventBus.subscribe('InvoiceIssuedEvent', handler2);

      expect(eventBus.getSubscribedEventTypes()).toEqual(['InvoiceIssuedEvent']);
    });

    it('should track multiple event types', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.subscribe('InvoiceIssuedEvent', handler1);
      eventBus.subscribe('TransactionCompletedEvent', handler2);

      const types = eventBus.getSubscribedEventTypes();
      expect(types).toContain('InvoiceIssuedEvent');
      expect(types).toContain('TransactionCompletedEvent');
      expect(types.length).toBe(2);
    });
  });

  describe('Unsubscribing from Events', () => {
    it('should unsubscribe from an event type', () => {
      const handler = jest.fn();
      const subscriptionId = eventBus.subscribe('InvoiceIssuedEvent', handler);

      eventBus.unsubscribe(subscriptionId);

      expect(eventBus.getSubscribedEventTypes()).not.toContain('InvoiceIssuedEvent');
    });

    it('should not remove other subscriptions when unsubscribing', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      const id1 = eventBus.subscribe('InvoiceIssuedEvent', handler1);
      const id2 = eventBus.subscribe('InvoiceIssuedEvent', handler2);

      eventBus.unsubscribe(id1);

      expect(eventBus.getSubscribedEventTypes()).toContain('InvoiceIssuedEvent');
    });

    it('should remove event type when last subscription is removed', () => {
      const handler = jest.fn();
      const subscriptionId = eventBus.subscribe('InvoiceIssuedEvent', handler);

      eventBus.unsubscribe(subscriptionId);

      expect(eventBus.getSubscribedEventTypes()).not.toContain('InvoiceIssuedEvent');
    });

    it('should handle unsubscribing from non-existent subscription gracefully', () => {
      expect(() => {
        eventBus.unsubscribe('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should continue processing other handlers if one fails', async () => {
      const failingHandler = jest.fn().mockRejectedValue(new Error('Handler failed'));
      const succeedingHandler = jest.fn();

      eventBus.subscribe('InvoiceIssuedEvent', failingHandler);
      eventBus.subscribe('InvoiceIssuedEvent', succeedingHandler);

      const event = new InvoiceIssuedEvent(
        'invoice-123',
        'INV-001',
        'company-456',
        'store-789',
        100.50,
        'user-001',
        new Date(),
      );

      await eventBus.publish(event);

      expect(failingHandler).toHaveBeenCalledTimes(1);
      expect(succeedingHandler).toHaveBeenCalledTimes(1);
    });

    it('should handle async handler errors', async () => {
      const asyncFailingHandler = jest.fn().mockImplementation(async () => {
        throw new Error('Async handler failed');
      });
      const succeedingHandler = jest.fn();

      eventBus.subscribe('InvoiceIssuedEvent', asyncFailingHandler);
      eventBus.subscribe('InvoiceIssuedEvent', succeedingHandler);

      const event = new InvoiceIssuedEvent(
        'invoice-123',
        'INV-001',
        'company-456',
        'store-789',
        100.50,
        'user-001',
        new Date(),
      );

      await eventBus.publish(event);

      expect(asyncFailingHandler).toHaveBeenCalledTimes(1);
      expect(succeedingHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Clear Subscriptions', () => {
    it('should clear all subscriptions', () => {
      eventBus.subscribe('InvoiceIssuedEvent', jest.fn());
      eventBus.subscribe('TransactionCompletedEvent', jest.fn());

      eventBus.clearSubscriptions();

      expect(eventBus.getSubscribedEventTypes()).toEqual([]);
    });

    it('should not throw error when clearing empty subscriptions', () => {
      expect(() => {
        eventBus.clearSubscriptions();
      }).not.toThrow();
    });
  });

  describe('Event Handler Execution', () => {
    it('should execute synchronous handlers', async () => {
      const handler = jest.fn();
      eventBus.subscribe('InvoiceIssuedEvent', handler);

      const event = new InvoiceIssuedEvent(
        'invoice-123',
        'INV-001',
        'company-456',
        'store-789',
        100.50,
        'user-001',
        new Date(),
      );

      await eventBus.publish(event);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should execute asynchronous handlers', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      eventBus.subscribe('InvoiceIssuedEvent', handler);

      const event = new InvoiceIssuedEvent(
        'invoice-123',
        'INV-001',
        'company-456',
        'store-789',
        100.50,
        'user-001',
        new Date(),
      );

      await eventBus.publish(event);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should pass correct event to handler', async () => {
      const handler = jest.fn();
      eventBus.subscribe('InvoiceIssuedEvent', handler);

      const event = new InvoiceIssuedEvent(
        'invoice-123',
        'INV-001',
        'company-456',
        'store-789',
        100.50,
        'user-001',
        new Date(),
      );

      await eventBus.publish(event);

      expect(handler).toHaveBeenCalledWith(event);
      expect(handler.mock.calls[0][0]).toBeInstanceOf(InvoiceIssuedEvent);
    });
  });
});

