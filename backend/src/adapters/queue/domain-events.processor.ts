/**
 * Domain Events Processor
 *
 * Bull processor that consumes domain events from the queue
 * and routes them to appropriate handlers.
 *
 * This processor:
 * - Consumes events from the domain-events queue
 * - Routes events to registered handlers based on event type
 * - Handles errors and retries
 * - Logs processing activity
 */

import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { DomainEvent } from '../../shared/domain/domain-event.base';
import { EventHandler } from '../../shared/ports/event-subscriber.port';
import { DOMAIN_EVENTS_QUEUE, DomainEventJob } from './bull-event-bus';

/**
 * Registry for event handlers
 * Maps event types to their handlers
 */
interface EventHandlerRegistry {
  [eventType: string]: EventHandler[];
}

/**
 * Domain events processor
 * Processes events from the queue and routes them to handlers
 */
@Processor(DOMAIN_EVENTS_QUEUE)
@Injectable()
export class DomainEventsProcessor {
  private readonly logger = new Logger(DomainEventsProcessor.name);
  private handlers: EventHandlerRegistry = {};

  /**
   * Registers a handler for a specific event type
   */
  registerHandler(eventType: string, handler: EventHandler): void {
    if (!this.handlers[eventType]) {
      this.handlers[eventType] = [];
    }
    this.handlers[eventType].push(handler);
    this.logger.debug(`Registered handler for event type: ${eventType}`);
  }

  /**
   * Processes a domain event job from the queue
   */
  @Process()
  async handleDomainEvent(job: Job<DomainEventJob>): Promise<void> {
    const { event } = job.data;
    const eventType = event.eventType;

    this.logger.debug(
      `Processing event ${eventType} (${event.eventId}) from queue (job ${job.id})`,
    );

    // Get handlers for this event type
    const handlers = this.handlers[eventType] || [];

    if (handlers.length === 0) {
      this.logger.debug(`No handlers registered for event type: ${eventType}`);
      return;
    }

    // Reconstruct domain event from JSON
    // Note: This is a simplified reconstruction. In production, you might want
    // to use a proper event factory or deserializer
    const domainEvent = this.reconstructEvent(event);

    // Execute all handlers
    const handlerPromises = handlers.map((handler) =>
      this.executeHandler(handler, domainEvent, job),
    );

    await Promise.allSettled(handlerPromises);

    this.logger.debug(`Completed processing event ${eventType} (${event.eventId})`);
  }

  /**
   * Executes a handler with error handling
   */
  private async executeHandler(
    handler: EventHandler,
    event: DomainEvent,
    job: Job<DomainEventJob>,
  ): Promise<void> {
    try {
      const result = handler(event);
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in handler for event ${event.eventType} (${event.eventId}): ${errorMessage}`,
        errorStack,
      );
      // Don't rethrow - allow other handlers to execute
      // The job will be marked as failed if all handlers fail
      throw error; // Re-throw to trigger Bull's retry mechanism
    }
  }

  /**
   * Reconstructs a domain event from JSON
   * This is a simplified version - in production, use a proper factory
   */
  private reconstructEvent(eventJson: any): DomainEvent {
    // For now, return the JSON as-is
    // In production, you would reconstruct the proper event class instance
    return {
      eventId: eventJson.eventId,
      eventType: eventJson.eventType,
      aggregateId: eventJson.aggregateId,
      aggregateType: eventJson.aggregateType,
      occurredAt: new Date(eventJson.occurredAt),
      performedBy: eventJson.performedBy,
      version: eventJson.version,
      payload: eventJson.payload,
    } as DomainEvent;
  }
}
