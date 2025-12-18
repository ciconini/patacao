/**
 * In-Memory Event Bus Implementation
 *
 * In-memory implementation of the EventBus port.
 * This is a simple synchronous event bus for initial implementation.
 *
 * Features:
 * - Synchronous event publishing
 * - Multiple subscribers per event type
 * - Error handling (errors in handlers don't stop other handlers)
 * - Subscription management
 *
 * This belongs to the Infrastructure/Adapters layer.
 */

import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '../domain/domain-event.base';
import { EventBus } from '../ports/event-bus.port';
import { EventHandler } from '../ports/event-subscriber.port';

/**
 * Subscription entry
 */
interface Subscription {
  id: string;
  eventType: string;
  handler: EventHandler;
}

@Injectable()
export class InMemoryEventBus implements EventBus {
  private readonly logger = new Logger(InMemoryEventBus.name);
  private subscriptions: Map<string, Subscription[]> = new Map();
  private subscriptionCounter = 0;

  /**
   * Publishes a single domain event
   * Synchronously calls all registered handlers for the event type
   */
  async publish(event: DomainEvent): Promise<void> {
    const eventType = event.eventType;
    const handlers = this.subscriptions.get(eventType) || [];

    if (handlers.length === 0) {
      this.logger.debug(`No subscribers for event type: ${eventType}`);
      return;
    }

    this.logger.debug(`Publishing event ${eventType} to ${handlers.length} subscriber(s)`);

    // Execute all handlers
    const handlerPromises = handlers.map((subscription) =>
      this.executeHandler(subscription, event),
    );

    await Promise.allSettled(handlerPromises);
  }

  /**
   * Publishes multiple domain events
   */
  async publishAll(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.publish(event)));
  }

  /**
   * Subscribes to a specific event type
   */
  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): string {
    const subscriptionId = `sub_${++this.subscriptionCounter}_${Date.now()}`;

    const subscription: Subscription = {
      id: subscriptionId,
      eventType,
      handler: handler as EventHandler,
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    this.subscriptions.get(eventType)!.push(subscription);

    this.logger.debug(`Subscribed to event type: ${eventType} (subscription: ${subscriptionId})`);

    return subscriptionId;
  }

  /**
   * Unsubscribes from events
   */
  unsubscribe(subscriptionId: string): void {
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      const index = subscriptions.findIndex((sub) => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        this.logger.debug(
          `Unsubscribed from event type: ${eventType} (subscription: ${subscriptionId})`,
        );

        // Clean up empty event type entries
        if (subscriptions.length === 0) {
          this.subscriptions.delete(eventType);
        }
        return;
      }
    }

    this.logger.warn(`Subscription not found: ${subscriptionId}`);
  }

  /**
   * Gets all subscribed event types
   */
  getSubscribedEventTypes(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Clears all subscriptions (useful for testing)
   */
  clearSubscriptions(): void {
    this.subscriptions.clear();
    this.logger.debug('All subscriptions cleared');
  }

  /**
   * Executes a handler with error handling
   */
  private async executeHandler(subscription: Subscription, event: DomainEvent): Promise<void> {
    try {
      const result = subscription.handler(event);
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      this.logger.error(
        `Error in event handler for ${subscription.eventType} (subscription: ${subscription.id}):`,
        error,
      );
      // Don't rethrow - allow other handlers to execute
    }
  }
}
