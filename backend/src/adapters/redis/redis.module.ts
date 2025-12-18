import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../../shared/config/config.service';

@Global()
@Module({
  imports: [],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (config: AppConfigService) => {
        return new Redis({
          host: config.redisHost,
          port: config.redisPort,
          password: config.redisPassword,
          db: config.redisDb,
          keyPrefix: 'patacao:',
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        });
      },
      inject: [AppConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
