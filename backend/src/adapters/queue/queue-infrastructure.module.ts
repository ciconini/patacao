/**
 * Queue Infrastructure Module
 *
 * NestJS module that provides queue infrastructure for domain events.
 * Registers Bull queues, processors, and the queue-based event bus.
 * Handles Redis connection failures gracefully.
 */

import { Module, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueModule } from './queue.module';
import { BullEventBus, DOMAIN_EVENTS_QUEUE } from './bull-event-bus';
import { DomainEventsProcessor } from './domain-events.processor';
import { QueueController } from './queue.controller';

@Module({
  imports: [
    QueueModule,
    // Register queue - connection errors will be handled by global error handlers
    BullModule.registerQueue({
      name: DOMAIN_EVENTS_QUEUE,
    }),
  ],
  controllers: [QueueController],
  providers: [
    BullEventBus,
    DomainEventsProcessor,
    {
      provide: 'QueueEventBus',
      useExisting: BullEventBus,
    },
  ],
  exports: [BullEventBus, DomainEventsProcessor, 'QueueEventBus', BullModule],
})
export class QueueInfrastructureModule {
  private readonly logger = new Logger(QueueInfrastructureModule.name);

  constructor() {
    // Log that queue module is initialized (connection errors will be handled elsewhere)
    this.logger.log('Queue infrastructure module initialized (Redis connection errors handled gracefully)');
  }
}
