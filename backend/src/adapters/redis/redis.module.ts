import { Module, Global, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../../shared/config/config.service';

@Global()
@Module({
  imports: [],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (config: AppConfigService) => {
        const logger = new Logger('RedisModule');
        
        const redis = new Redis({
          host: config.redisHost,
          port: config.redisPort,
          password: config.redisPassword,
          db: config.redisDb,
          keyPrefix: 'patacao:',
          connectTimeout: 1000, // 1 second connection timeout
          commandTimeout: 500, // 500ms command timeout
          retryStrategy: () => {
            // Disable retries - fail fast
            return null;
          },
          lazyConnect: true, // Don't connect immediately - connect on first use
          maxRetriesPerRequest: 0, // No retries per request
          enableOfflineQueue: false, // Don't queue commands when offline
          enableReadyCheck: false, // Don't wait for ready state
          showFriendlyErrorStack: false, // Reduce error stack size
        });

        // Handle ALL Redis errors to prevent unhandled rejections
        redis.on('error', (error) => {
          // Log but don't throw - this prevents unhandled rejections
          // This handler catches connection errors and command errors
          logger.warn(`Redis error (non-blocking): ${error.message}`);
        });

        redis.on('connect', () => {
          logger.log('Redis connected');
        });

        redis.on('close', () => {
          logger.warn('Redis connection closed - operations will fail gracefully');
        });

        // Handle connection errors specifically
        redis.on('close', () => {
          // This is already handled above, but keeping for clarity
        });

        return redis;
      },
      inject: [AppConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
