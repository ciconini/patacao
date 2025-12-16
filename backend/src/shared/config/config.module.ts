/**
 * Configuration Module
 * 
 * NestJS module that provides configuration management with validation.
 * Validates environment variables on startup and provides typed access.
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { configSchema } from './config.schema';
import { AppConfigService } from './config.service';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: (config: Record<string, unknown>) => {
        const result = configSchema.safeParse(config);
        if (!result.success) {
          console.error('Configuration validation failed:');
          result.error.errors.forEach((error) => {
            console.error(`  - ${error.path.join('.')}: ${error.message}`);
          });
          throw new Error('Invalid configuration. Please check your environment variables.');
        }
        return result.data;
      },
    }),
  ],
  providers: [
    AppConfigService,
    {
      provide: 'AppConfigService',
      useExisting: AppConfigService,
    },
  ],
  exports: [AppConfigService, 'AppConfigService', NestConfigModule],
})
export class ConfigModule {}

