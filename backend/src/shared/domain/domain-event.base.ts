/**
 * Domain Event Base Class
 *
 * Base class for all domain events in the system.
 * Domain events represent something that happened in the domain that domain experts care about.
 *
 * Following Domain-Driven Design principles:
 * - Events are immutable
 * - Events contain all data needed to understand what happened
 * - Events are named in past tense (e.g., InvoiceIssued, CustomerCreated)
 *
 * This belongs to the Domain Layer (Shared Kernel).
 */

/**
 * Base interface for all domain events
 */
export interface DomainEvent {
  /**
   * Unique event identifier
   */
  readonly eventId: string;

  /**
   * Event type/name (e.g., "InvoiceIssued", "CustomerCreated")
   */
  readonly eventType: string;

  /**
   * Aggregate root ID that raised this event
   */
  readonly aggregateId: string;

  /**
   * Aggregate root type (e.g., "Invoice", "Customer")
   */
  readonly aggregateType: string;

  /**
   * Timestamp when the event occurred
   */
  readonly occurredAt: Date;

  /**
   * User ID who triggered the event (if applicable)
   */
  readonly performedBy?: string;

  /**
   * Event version (for event sourcing compatibility)
   */
  readonly version: number;

  /**
   * Event payload (domain-specific data)
   */
  readonly payload: Record<string, any>;
}

/**
 * Base class for domain events
 * Provides common properties and utilities
 */
export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly aggregateType: string;
  public readonly occurredAt: Date;
  public readonly performedBy?: string;
  public readonly version: number;
  public readonly payload: Record<string, any>;

  constructor(
    aggregateId: string,
    aggregateType: string,
    payload: Record<string, any>,
    performedBy?: string,
    eventId?: string,
  ) {
    this.eventId = eventId || this.generateEventId();
    this.eventType = this.constructor.name;
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.occurredAt = new Date();
    this.performedBy = performedBy;
    this.version = 1;
    this.payload = Object.freeze({ ...payload }); // Immutable payload
  }

  /**
   * Generates a unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Converts event to JSON for serialization
   */
  toJSON(): DomainEvent {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      occurredAt: this.occurredAt,
      performedBy: this.performedBy,
      version: this.version,
      payload: this.payload,
    };
  }
}
