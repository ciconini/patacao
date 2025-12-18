/**
 * Queue Module
 *
 * NestJS module that provides Bull queue infrastructure.
 * Configures Redis connection for Bull queues.
 */

import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AppConfigService } from '../../shared/config/config.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: AppConfigService) => ({
        redis: {
          host: config.redisHost,
          port: config.redisPort,
          password: config.redisPassword,
          db: config.redisDb,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 1000, // Keep last 1000 completed jobs
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
          },
        },
      }),
      inject: [AppConfigService],
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
