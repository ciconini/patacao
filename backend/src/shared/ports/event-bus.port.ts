/**
 * Event Bus Port (Interface)
 *
 * Port for the event bus that coordinates event publishing and subscription.
 * This is a port in the Hexagonal Architecture pattern.
 * Implementations should be provided in the Infrastructure layer.
 *
 * The Event Bus is responsible for:
 * - Coordinating event publishing and subscription
 * - Routing events to appropriate subscribers
 * - Supporting both in-memory and queue-based implementations
 *
 * This belongs to the Ports/Interfaces layer.
 */

import { EventPublisher } from './event-publisher.port';
import { EventSubscriber } from './event-subscriber.port';

/**
 * Event Bus interface
 * Combines publisher and subscriber capabilities
 */
export interface EventBus extends EventPublisher, EventSubscriber {
  /**
   * Clears all subscriptions (useful for testing)
   */
  clearSubscriptions(): void;
}
