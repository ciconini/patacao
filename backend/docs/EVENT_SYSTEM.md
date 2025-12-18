# Event System

## Overview

Phase 6.1 Event System has been implemented. This document describes the domain event architecture and how to use it.

## Architecture

### 1. Domain Event Base

**Location:** `backend/src/shared/domain/domain-event.base.ts`

All domain events extend `BaseDomainEvent` which provides:
- Unique event ID
- Event type (class name)
- Aggregate root information
- Timestamp
- Performed by (user ID)
- Immutable payload

### 2. Event Bus Ports

**Location:** `backend/src/shared/ports/`

- **`EventPublisher`**: Interface for publishing events
- **`EventSubscriber`**: Interface for subscribing to events
- **`EventBus`**: Combined interface for both publishing and subscribing

### 3. In-Memory Event Bus

**Location:** `backend/src/shared/infrastructure/in-memory-event-bus.ts`

Initial implementation with:
- Synchronous event publishing
- Multiple subscribers per event type
- Error handling (errors in handlers don't stop other handlers)
- Subscription management

### 4. Domain Events

**Location:** `backend/src/shared/domain/events/`

Pre-defined domain events:
- **Invoice Events**: `InvoiceIssued`, `InvoicePaid`, `InvoiceVoided`
- **Transaction Events**: `TransactionCompleted`, `StockDecremented`
- **Customer Events**: `CustomerCreated`, `CustomerArchived`
- **Appointment Events**: `AppointmentCreated`, `AppointmentConfirmed`, `AppointmentCompleted`, `AppointmentCancelled`

## Usage

### Publishing Events in Use Cases

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { EventBus } from '../../shared/ports/event-bus.port';
import { InvoiceIssuedEvent } from '../../shared/domain/events';

@Injectable()
export class IssueInvoiceUseCase {
  constructor(
    @Inject('EventBus')
    private readonly eventBus: EventBus,
    // ... other dependencies
  ) {}

  async execute(input: IssueInvoiceInput): Promise<IssueInvoiceOutput> {
    // ... business logic ...

    // Publish domain event
    const event = new InvoiceIssuedEvent(
      invoice.id,
      invoice.invoiceNumber,
      invoice.companyId,
      invoice.storeId,
      invoice.total,
      input.performedBy,
      invoice.issuedAt!,
    );

    await this.eventBus.publish(event);

    return { invoice };
  }
}
```

### Subscribing to Events

```typescript
import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { EventBus } from '../../shared/ports/event-bus.port';
import { InvoiceIssuedEvent } from '../../shared/domain/events';

@Injectable()
export class InvoiceNotificationService implements OnModuleInit {
  constructor(
    @Inject('EventBus')
    private readonly eventBus: EventBus,
  ) {}

  onModuleInit() {
    // Subscribe to invoice issued events
    this.eventBus.subscribe(
      InvoiceIssuedEvent.name,
      async (event: InvoiceIssuedEvent) => {
        await this.sendInvoiceNotification(event);
      },
    );
  }

  private async sendInvoiceNotification(event: InvoiceIssuedEvent) {
    // Send email notification, etc.
  }
}
```

### Publishing Multiple Events

```typescript
const events: DomainEvent[] = [
  new TransactionCompletedEvent(...),
  new StockDecrementedEvent(...),
];

await this.eventBus.publishAll(events);
```

## Event Structure

All domain events follow this structure:

```typescript
{
  eventId: string;           // Unique event ID
  eventType: string;         // Event class name
  aggregateId: string;       // ID of the aggregate root
  aggregateType: string;     // Type of aggregate (e.g., "Invoice")
  occurredAt: Date;          // When the event occurred
  performedBy?: string;      // User ID who triggered it
  version: number;           // Event version (for event sourcing)
  payload: Record<string, any>; // Event-specific data
}
```

## Best Practices

1. **Event Naming**: Use past tense (e.g., `InvoiceIssued`, not `IssueInvoice`)
2. **Immutable Events**: Events are immutable once created
3. **Event Payload**: Include all data needed to understand what happened
4. **Error Handling**: Event handlers should handle errors gracefully
5. **Idempotency**: Event handlers should be idempotent when possible

## Future: Queue-Based Event Bus

The current in-memory implementation is synchronous. For production, you can:

1. **Create Queue-Based Implementation**:
   - Implement `EventBus` interface using Bull (Redis) or RabbitMQ
   - Events are published to a queue
   - Background workers consume events asynchronously

2. **Migration Path**:
   - Keep the same `EventBus` interface
   - Swap implementation in `EventsModule`
   - No changes needed in use cases

## Example: Queue-Based Event Bus (Future)

```typescript
@Injectable()
export class QueueEventBus implements EventBus {
  constructor(
    @Inject('QUEUE') private readonly queue: Queue,
  ) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.queue.add('domain-event', event.toJSON());
  }

  // ... other methods
}
```

## Testing

### Mock Event Bus

```typescript
const mockEventBus: EventBus = {
  publish: jest.fn(),
  publishAll: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  getSubscribedEventTypes: jest.fn(),
  clearSubscriptions: jest.fn(),
};
```

### Testing Event Publishing

```typescript
it('should publish InvoiceIssued event', async () => {
  const result = await useCase.execute(input);
  
  expect(mockEventBus.publish).toHaveBeenCalledWith(
    expect.any(InvoiceIssuedEvent)
  );
});
```

## Integration with Use Cases

Events should be published after successful domain operations:

1. Load domain entities
2. Execute domain logic
3. Persist changes
4. **Publish domain events** ← Here
5. Return result

This ensures events are only published for successful operations.

