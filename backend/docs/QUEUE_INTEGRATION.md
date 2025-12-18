# Queue Integration

## Overview

Phase 6.3 Queue Integration has been implemented. This document describes the queue-based event bus infrastructure using Bull (Redis-based queue system).

## Architecture

### 1. Queue Module

**Location:** `backend/src/adapters/queue/queue.module.ts`

Provides Bull queue infrastructure:
- Configures Redis connection for Bull
- Sets default job options (retries, backoff, cleanup)
- Global module for application-wide access

### 2. Bull Event Bus

**Location:** `backend/src/adapters/queue/bull-event-bus.ts`

Queue-based implementation of the `EventBus` port:
- Publishes events to Redis queue asynchronously
- Supports job retry with exponential backoff
- Job persistence in Redis
- Idempotent job IDs (using event ID)

### 3. Domain Events Processor

**Location:** `backend/src/adapters/queue/domain-events.processor.ts`

Bull processor that:
- Consumes events from the `domain-events` queue
- Routes events to registered handlers
- Handles errors and retries
- Logs processing activity

### 4. Queue Infrastructure Module

**Location:** `backend/src/adapters/queue/queue-infrastructure.module.ts`

NestJS module that:
- Registers Bull queues
- Provides `BullEventBus` and `DomainEventsProcessor`
- Exports queue infrastructure

## Configuration

### Environment Variables

Add to `.env`:

```bash
# Enable queue-based event bus (default: false)
USE_QUEUE_EVENT_BUS=true

# Redis configuration (already configured for rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Module Setup

The `EventsModule` now supports both in-memory and queue-based event buses:

```typescript
// In app.module.ts
imports: [
  QueueModule, // Queue infrastructure
  EventsModule.withQueue(), // Event bus with queue support
]
```

The event bus implementation is selected based on `USE_QUEUE_EVENT_BUS`:
- `false` (default): Uses `InMemoryEventBus` (synchronous)
- `true`: Uses `BullEventBus` (asynchronous, queue-based)

## Usage

### Publishing Events

Events are published the same way regardless of implementation:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { EventBus } from '../../shared/ports/event-bus.port';
import { InvoiceIssuedEvent } from '../../shared/domain/events';

@Injectable()
export class IssueInvoiceUseCase {
  constructor(
    @Inject('EventBus')
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: IssueInvoiceInput): Promise<IssueInvoiceOutput> {
    // ... business logic ...

    const event = new InvoiceIssuedEvent(
      invoice.id,
      invoice.invoiceNumber,
      invoice.companyId,
      invoice.storeId,
      invoice.total,
      input.performedBy,
      invoice.issuedAt!,
    );

    // This will publish to queue if USE_QUEUE_EVENT_BUS=true
    // Otherwise, it will publish synchronously in-memory
    await this.eventBus.publish(event);

    return { invoice };
  }
}
```

### Registering Event Handlers

For queue-based events, handlers should be registered with the processor:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DomainEventsProcessor } from '../../adapters/queue/domain-events.processor';
import { InvoiceIssuedEvent } from '../../shared/domain/events';

@Injectable()
export class InvoiceNotificationService implements OnModuleInit {
  constructor(
    private readonly eventProcessor: DomainEventsProcessor,
  ) {}

  onModuleInit() {
    // Register handler for invoice issued events
    this.eventProcessor.registerHandler(
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

## Queue Monitoring

### REST API Endpoints

```bash
# Get queue statistics
GET /api/v1/queues/stats

# Get failed jobs
GET /api/v1/queues/failed

# Retry a failed job
POST /api/v1/queues/failed/:jobId/retry

# Remove a failed job
DELETE /api/v1/queues/failed/:jobId

# Clean completed jobs
POST /api/v1/queues/clean
```

### Queue Statistics Response

```json
{
  "queue": "domain-events",
  "stats": {
    "waiting": 5,
    "active": 2,
    "completed": 150,
    "failed": 3
  }
}
```

## Job Configuration

### Default Job Options

- **Attempts**: 3 retries
- **Backoff**: Exponential (2s, 4s, 8s)
- **Completed Jobs**: Kept for 24 hours or last 1000 jobs
- **Failed Jobs**: Kept for 7 days

### Custom Job Options

You can customize job options when publishing:

```typescript
// In BullEventBus, jobs are created with:
{
  jobId: event.eventId, // Idempotent job ID
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
}
```

## Benefits of Queue-Based Events

1. **Asynchronous Processing**: Events are processed asynchronously, not blocking the request
2. **Reliability**: Failed events are retried automatically
3. **Scalability**: Multiple workers can process events in parallel
4. **Durability**: Events are persisted in Redis, surviving application restarts
5. **Monitoring**: Queue statistics and job status are available via API

## Migration Path

### From In-Memory to Queue

1. Set `USE_QUEUE_EVENT_BUS=true` in `.env`
2. Register event handlers with `DomainEventsProcessor`
3. Restart the application
4. Events will now be published to the queue

### Backward Compatibility

The same `EventBus` interface is used, so no changes are needed in use cases. The implementation is swapped based on configuration.

## Testing

### Unit Tests

Mock the `EventBus` interface as before:

```typescript
const mockEventBus: EventBus = {
  publish: jest.fn(),
  publishAll: jest.fn(),
  // ...
};
```

### Integration Tests

For integration tests with queues:

```typescript
import { getQueueToken } from '@nestjs/bull';
import { Test } from '@nestjs/testing';

const module = await Test.createTestingModule({
  imports: [
    QueueModule,
    BullModule.registerQueue({ name: DOMAIN_EVENTS_QUEUE }),
  ],
  // ...
}).compile();

const queue = module.get(getQueueToken(DOMAIN_EVENTS_QUEUE));
// Test queue operations
```

## Future Enhancements

1. **Multiple Queues**: Separate queues for different event types (e.g., `invoice-events`, `appointment-events`)
2. **Priority Queues**: High-priority events processed first
3. **Dead Letter Queue**: Failed events after max retries moved to DLQ
4. **Event Sourcing**: Store all events for event sourcing pattern
5. **Bull Board**: Web UI for queue monitoring

## Troubleshooting

### Events Not Processing

1. Check Redis connection: `redis-cli ping`
2. Check queue statistics: `GET /api/v1/queues/stats`
3. Check failed jobs: `GET /api/v1/queues/failed`
4. Verify `USE_QUEUE_EVENT_BUS=true` is set

### High Queue Backlog

1. Increase worker instances
2. Optimize event handlers
3. Consider separate queues for different event types

### Failed Jobs

1. Check job failure reason: `GET /api/v1/queues/failed`
2. Retry failed jobs: `POST /api/v1/queues/failed/:jobId/retry`
3. Fix handler errors and redeploy

