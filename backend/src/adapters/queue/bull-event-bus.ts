/**
 * Bull Event Bus Implementation
 *
 * Queue-based implementation of the EventBus port using Bull (Redis).
 * Publishes domain events to Redis queues for asynchronous processing.
 *
 * Features:
 * - Asynchronous event publishing
 * - Job retry with exponential backoff
 * - Job persistence in Redis
 * - Support for multiple queues (one per event type or grouped)
 *
 * This belongs to the Infrastructure/Adapters layer.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { DomainEvent } from '../../shared/domain/domain-event.base';
import { EventBus } from '../../shared/ports/event-bus.port';
import { EventHandler } from '../../shared/ports/event-subscriber.port';

/**
 * Queue name for domain events
 */
export const DOMAIN_EVENTS_QUEUE = 'domain-events';

/**
 * Job data structure for domain events
 */
export interface DomainEventJob {
  event: DomainEvent;
}

/**
 * Bull-based event bus implementation
 * Publishes events to Redis queue for asynchronous processing
 */
@Injectable()
export class BullEventBus implements EventBus {
  private readonly logger = new Logger(BullEventBus.name);
  private subscriptions: Map<string, EventHandler[]> = new Map();
  private subscriptionCounter = 0;

  constructor(
    @InjectQueue(DOMAIN_EVENTS_QUEUE)
    private readonly eventQueue: Queue<DomainEventJob>,
  ) {}

  /**
   * Publishes a single domain event to the queue
   */
  async publish(event: DomainEvent): Promise<void> {
    try {
      // Convert event to JSON format
      const eventJson: DomainEvent = {
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        occurredAt: event.occurredAt,
        performedBy: event.performedBy,
        version: event.version,
        payload: event.payload,
      };

      const job = await this.eventQueue.add(
        {
          event: eventJson,
        },
        {
          jobId: event.eventId, // Use event ID as job ID for idempotency
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      this.logger.debug(
        `Published event ${event.eventType} (${event.eventId}) to queue as job ${job.id}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Check if it's a Redis connection error
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect')) {
        this.logger.warn(
          `Redis unavailable - event ${event.eventType} (${event.eventId}) not queued (non-blocking)`,
        );
        // Don't throw - fail gracefully when Redis is unavailable
        return;
      }
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to publish event ${event.eventType} (${event.eventId}): ${errorMessage}`,
        errorStack,
      );
      // Only throw for non-connection errors
      throw error;
    }
  }

  /**
   * Publishes multiple domain events to the queue
   */
  async publishAll(events: DomainEvent[]): Promise<void> {
    const jobs = events.map((event) => {
      const eventJson: DomainEvent = {
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        occurredAt: event.occurredAt,
        performedBy: event.performedBy,
        version: event.version,
        payload: event.payload,
      };
      return {
        name: event.eventType,
        data: {
          event: eventJson,
        },
        opts: {
          jobId: event.eventId,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      };
    });

    try {
      await this.eventQueue.addBulk(jobs);
      this.logger.debug(`Published ${events.length} event(s) to queue`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Check if it's a Redis connection error
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connect')) {
        this.logger.warn(
          `Redis unavailable - ${events.length} event(s) not queued (non-blocking)`,
        );
        // Don't throw - fail gracefully when Redis is unavailable
        return;
      }
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to publish ${events.length} event(s): ${errorMessage}`, errorStack);
      // Only throw for non-connection errors
      throw error;
    }
  }

  /**
   * Subscribes to a specific event type
   * Note: In a queue-based system, subscriptions are handled by processors
   * This method is kept for interface compatibility but handlers should be registered
   * via event processors
   */
  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): string {
    const subscriptionId = `sub_${++this.subscriptionCounter}_${Date.now()}`;

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    this.subscriptions.get(eventType)!.push(handler as EventHandler);

    this.logger.debug(`Subscribed to event type: ${eventType} (subscription: ${subscriptionId})`);
    this.logger.warn(
      `Note: Queue-based subscriptions should use event processors. This subscription is for compatibility only.`,
    );

    return subscriptionId;
  }

  /**
   * Unsubscribes from events
   */
  unsubscribe(subscriptionId: string): void {
    for (const [eventType, handlers] of this.subscriptions.entries()) {
      const index = handlers.findIndex((_, idx) => `sub_${idx}_${Date.now()}` === subscriptionId);
      if (index !== -1) {
        handlers.splice(index, 1);
        this.logger.debug(
          `Unsubscribed from event type: ${eventType} (subscription: ${subscriptionId})`,
        );

        if (handlers.length === 0) {
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
   * Clears all subscriptions
   */
  clearSubscriptions(): void {
    this.subscriptions.clear();
    this.logger.debug('All subscriptions cleared');
  }

  /**
   * Gets queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.eventQueue.getWaitingCount(),
      this.eventQueue.getActiveCount(),
      this.eventQueue.getCompletedCount(),
      this.eventQueue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
    };
  }
}
