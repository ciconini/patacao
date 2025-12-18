/**
 * Events Module
 *
 * NestJS module that provides event bus infrastructure.
 * Supports both in-memory and queue-based event buses.
 *
 * Configuration:
 * - Set USE_QUEUE_EVENT_BUS=true to use queue-based event bus (Bull/Redis)
 * - Default: in-memory event bus (synchronous)
 */

import { Module, Global } from '@nestjs/common';
import { InMemoryEventBus } from './in-memory-event-bus';
import { EventBus } from '../ports/event-bus.port';
import { AppConfigService } from '../config/config.service';
import { QueueInfrastructureModule } from '../../adapters/queue/queue-infrastructure.module';
import { BullEventBus } from '../../adapters/queue/bull-event-bus';

@Global()
@Module({
  imports: [
    // Conditionally import queue infrastructure if enabled
    // Note: This is a dynamic import - we'll handle it in the factory
  ],
  providers: [
    InMemoryEventBus,
    {
      provide: 'EventBus',
      useFactory: (
        inMemoryBus: InMemoryEventBus,
        config: AppConfigService,
        bullBus?: BullEventBus,
      ) => {
        // Use queue-based bus if configured, otherwise use in-memory
        if (config.useQueueEventBus && bullBus) {
          return bullBus;
        }
        return inMemoryBus;
      },
      inject: [InMemoryEventBus, AppConfigService, 'BullEventBus'],
    },
    {
      provide: 'EventBusInterface',
      useFactory: (
        inMemoryBus: InMemoryEventBus,
        config: AppConfigService,
        bullBus?: BullEventBus,
      ) => {
        if (config.useQueueEventBus && bullBus) {
          return bullBus;
        }
        return inMemoryBus;
      },
      inject: [InMemoryEventBus, AppConfigService, 'BullEventBus'],
    },
    // Provide BullEventBus as optional (will be undefined if queue module not imported)
    {
      provide: 'BullEventBus',
      useValue: undefined, // Will be overridden if QueueInfrastructureModule is imported
    },
  ],
  exports: [InMemoryEventBus, 'EventBus', 'EventBusInterface'],
})
export class EventsModule {
  /**
   * Static method to create module with queue support
   */
  static withQueue() {
    return {
      module: EventsModule,
      imports: [QueueInfrastructureModule],
      providers: [
        InMemoryEventBus,
        {
          provide: 'BullEventBus',
          useFactory: (bullBus: BullEventBus) => bullBus,
          inject: [BullEventBus],
        },
        {
          provide: 'EventBus',
          useFactory: (
            inMemoryBus: InMemoryEventBus,
            config: AppConfigService,
            bullBus: BullEventBus,
          ) => {
            if (config.useQueueEventBus) {
              return bullBus;
            }
            return inMemoryBus;
          },
          inject: [InMemoryEventBus, AppConfigService, BullEventBus],
        },
        {
          provide: 'EventBusInterface',
          useFactory: (
            inMemoryBus: InMemoryEventBus,
            config: AppConfigService,
            bullBus: BullEventBus,
          ) => {
            if (config.useQueueEventBus) {
              return bullBus;
            }
            return inMemoryBus;
          },
          inject: [InMemoryEventBus, AppConfigService, BullEventBus],
        },
      ],
      exports: [InMemoryEventBus, 'EventBus', 'EventBusInterface'],
    };
  }
}
