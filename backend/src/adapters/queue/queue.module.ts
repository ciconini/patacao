/**
 * Queue Module
 *
 * NestJS module that provides Bull queue infrastructure.
 * Configures Redis connection for Bull queues.
 * Handles Redis connection failures gracefully to prevent blocking.
 */

import { Module, Global, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AppConfigService } from '../../shared/config/config.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: AppConfigService) => {
        const logger = new Logger('QueueModule');
        
        const redisConfig = {
          host: config.redisHost,
          port: config.redisPort,
          password: config.redisPassword,
          db: config.redisDb,
          connectTimeout: 1000, // 1 second connection timeout (reduced)
          commandTimeout: 500, // 500ms command timeout (reduced)
          retryStrategy: () => null, // Disable retries - fail fast
          maxRetriesPerRequest: 0, // No retries
          enableOfflineQueue: false, // Don't queue commands when offline
          lazyConnect: true, // Don't connect immediately
          // Add error handler to prevent unhandled rejections
          showFriendlyErrorStack: false,
        };

        // Wrap Redis connection in error handler
        // Note: Bull will create its own Redis client, but we can't intercept it directly
        // The connection errors will be caught by the global unhandled rejection handler
        
        return {
          redis: redisConfig,
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
          settings: {
            // Prevent Bull from blocking on Redis connection
            retryProcessDelay: 5000,
            maxStalledCount: 1,
            // Add settings to handle connection errors gracefully
            stalledInterval: 30000,
          },
        };
      },
      inject: [AppConfigService],
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
