# Background Workers

## Overview

Phase 6.2 Background Workers has been implemented. This document describes the background worker infrastructure and how to use it.

## Architecture

### 1. Worker Base Class

**Location:** `backend/src/workers/worker-base.ts`

All workers extend `WorkerBase` which provides:
- Lifecycle management (OnModuleInit, OnModuleDestroy)
- Error handling and logging
- Health check capabilities
- Prevents concurrent execution

### 2. Workers Module

**Location:** `backend/src/workers/workers.module.ts`

NestJS module that:
- Imports `ScheduleModule` for cron jobs
- Registers all workers
- Provides `WorkersController` for monitoring

### 3. Implemented Workers

#### Appointment Reminder Worker

**Location:** `backend/src/workers/appointment-reminder.worker.ts`

- **Schedule:** Runs every hour
- **Purpose:** Sends reminders for appointments scheduled in the next 24 hours
- **Features:**
  - Checks appointments between 23-24 hours from now
  - Respects customer consent preferences (`consentReminders`)
  - Loads related entities (customer, pet, service, store)
  - Prepares reminder messages

**TODO:**
- Implement email/SMS sending (when email service is available)
- Add `reminderSent` field to Appointment entity
- Implement repository method for date range queries

#### Financial Export Worker

**Location:** `backend/src/workers/financial-export.worker.ts`

- **Schedule:** Manual trigger or via queue
- **Purpose:** Processes pending financial exports in the background
- **Features:**
  - Generates CSV/JSON export files
  - Fetches invoices, transactions, and credit notes for the period
  - Uploads to SFTP (when configured)
  - Updates export status

**Methods:**
- `processExport(exportId: string)`: Process a specific export
- `execute()`: Process all pending exports

**TODO:**
- Implement repository methods: `findByPeriod` for invoices, transactions, credit notes
- Implement SFTP upload adapter
- Add export status updates

#### Stock Reconciliation Worker

**Location:** `backend/src/workers/stock-reconciliation.worker.ts`

- **Schedule:** Daily at 2 AM
- **Purpose:** Performs periodic stock reconciliation checks
- **Features:**
  - Identifies products with stock discrepancies
  - Checks low stock levels
  - Generates reconciliation reports

**TODO:**
- Implement stock calculation from movements
- Add discrepancy reporting (alerts/notifications)
- Implement low stock alerts

## Usage

### Scheduling

Workers use `@nestjs/schedule` for cron-based scheduling:

```typescript
@Cron(CronExpression.EVERY_HOUR)
async handleCron() {
  await this.run();
}
```

### Manual Triggering

Workers can be manually triggered via the REST API:

```bash
# Trigger appointment reminder worker
POST /api/v1/workers/appointment-reminder/trigger

# Trigger financial export worker
POST /api/v1/workers/financial-export/trigger

# Process specific export
POST /api/v1/workers/financial-export/process/:exportId

# Trigger stock reconciliation worker
POST /api/v1/workers/stock-reconciliation/trigger
```

### Health Monitoring

Check worker health status:

```bash
GET /api/v1/workers/health
```

Response:
```json
{
  "workers": [
    {
      "name": "AppointmentReminderWorker",
      "isRunning": false
    },
    {
      "name": "FinancialExportWorker",
      "isRunning": false
    },
    {
      "name": "StockReconciliationWorker",
      "isRunning": false
    }
  ]
}
```

## Worker Lifecycle

1. **Initialization:** Workers are initialized when the module loads
2. **Scheduling:** Cron jobs are registered automatically
3. **Execution:** Workers run on schedule or manual trigger
4. **Error Handling:** Errors are logged but don't stop the worker
5. **Concurrency:** Workers prevent concurrent execution

## Best Practices

1. **Idempotency:** Workers should be idempotent (safe to run multiple times)
2. **Error Handling:** Always catch and log errors, don't crash the worker
3. **Logging:** Log start, completion, and errors with context
4. **Resource Management:** Clean up resources in `onModuleDestroy`
5. **Testing:** Test workers in isolation with mocked dependencies

## Future Enhancements

### Queue-Based Workers

For Phase 6.3, workers can be migrated to use Bull (Redis-based queue):

```typescript
@Processor('financial-export')
export class FinancialExportProcessor {
  @Process('process-export')
  async handleProcessExport(job: Job<{ exportId: string }>) {
    await this.worker.processExport(job.data.exportId);
  }
}
```

### Worker Monitoring

- Add metrics collection (execution time, success rate)
- Integrate with monitoring tools (Prometheus, Grafana)
- Add alerting for failed workers

### Email/SMS Integration

- Implement email service adapter
- Implement SMS service adapter
- Add templates for reminders and notifications

## Testing

### Unit Tests

```typescript
describe('AppointmentReminderWorker', () => {
  let worker: AppointmentReminderWorker;
  let appointmentRepository: jest.Mocked<AppointmentRepository>;

  beforeEach(() => {
    appointmentRepository = createMockRepository<AppointmentRepository>(['searchAppointments']);
    worker = new AppointmentReminderWorker(
      appointmentRepository,
      // ... other dependencies
    );
  });

  it('should send reminders for upcoming appointments', async () => {
    appointmentRepository.searchAppointments.mockResolvedValue({
      items: [createTestAppointment(...)],
      meta: { total: 1 },
    });

    await worker['execute']();

    // Assert reminders were sent
  });
});
```

### Integration Tests

Test workers with real repositories and Firebase emulator.

