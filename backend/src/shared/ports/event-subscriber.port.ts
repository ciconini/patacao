/**
 * Event Subscriber Port (Interface)
 *
 * Port for subscribing to domain events.
 * This is a port in the Hexagonal Architecture pattern.
 * Implementations should be provided in the Infrastructure layer.
 *
 * The Event Subscriber is responsible for:
 * - Subscribing to specific event types
 * - Handling events when they are published
 * - Supporting both synchronous and asynchronous event handling
 *
 * This belongs to the Ports/Interfaces layer.
 */

import { DomainEvent } from '../domain/domain-event.base';

/**
 * Event handler function type
 * Handlers receive the event and can perform side effects
 */
export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

/**
 * Event Subscriber interface
 * Defines the contract for subscribing to domain events
 */
export interface EventSubscriber {
  /**
   * Subscribes to a specific event type
   *
   * @param eventType - Event type to subscribe to (e.g., "InvoiceIssued")
   * @param handler - Handler function to call when event is published
   * @returns Subscription ID (for unsubscribing)
   */
  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): string;

  /**
   * Unsubscribes from events
   *
   * @param subscriptionId - Subscription ID returned from subscribe()
   */
  unsubscribe(subscriptionId: string): void;

  /**
   * Gets all subscribed event types
   *
   * @returns Array of event type names
   */
  getSubscribedEventTypes(): string[];
}
