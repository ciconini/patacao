/**
 * Queue Infrastructure Module
 *
 * NestJS module that provides queue infrastructure for domain events.
 * Registers Bull queues, processors, and the queue-based event bus.
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueModule } from './queue.module';
import { BullEventBus, DOMAIN_EVENTS_QUEUE } from './bull-event-bus';
import { DomainEventsProcessor } from './domain-events.processor';
import { QueueController } from './queue.controller';

@Module({
  imports: [
    QueueModule,
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
export class QueueInfrastructureModule {}
