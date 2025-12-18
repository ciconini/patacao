import { Global, Module } from '@nestjs/common';
import { Logger } from './logger/logger.service';
import { AuditLogDomainService } from '../modules/shared/domain/audit-log.domain-service';
import { RequestLoggerMiddleware } from './presentation/middleware/request-logger.middleware';
import { AppConfigService } from './config/config.service';
import { HealthController } from './presentation/controllers/health.controller';

@Global()
@Module({
  imports: [],
  controllers: [HealthController],
  providers: [
    Logger,
    AuditLogDomainService,
    RequestLoggerMiddleware,
    {
      provide: 'Logger',
      useExisting: Logger,
    },
  ],
  exports: [Logger, AuditLogDomainService, RequestLoggerMiddleware, 'Logger'],
})
export class SharedModule {}
