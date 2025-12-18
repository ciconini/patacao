/**
 * Event Publisher Port (Interface)
 *
 * Port for publishing domain events.
 * This is a port in the Hexagonal Architecture pattern.
 * Implementations should be provided in the Infrastructure layer.
 *
 * The Event Publisher is responsible for:
 * - Publishing domain events to the event bus
 * - Supporting both synchronous (in-memory) and asynchronous (queue-based) publishing
 * - Ensuring events are delivered to subscribers
 *
 * This belongs to the Ports/Interfaces layer.
 */

import { DomainEvent } from '../domain/domain-event.base';

/**
 * Event Publisher interface
 * Defines the contract for publishing domain events
 */
export interface EventPublisher {
  /**
   * Publishes a single domain event
   *
   * @param event - Domain event to publish
   * @returns Promise that resolves when event is published
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publishes multiple domain events atomically
   *
   * @param events - Array of domain events to publish
   * @returns Promise that resolves when all events are published
   */
  publishAll(events: DomainEvent[]): Promise<void>;
}
