import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './shared/config/config.module';
import { SharedModule } from './shared/shared.module';
import { DatabaseModule } from './adapters/db/database.module';
import { RedisModule } from './adapters/redis/redis.module';
import { AuthModule } from './shared/auth/auth.module';
import { AdministrativePresentationModule } from './modules/administrative/presentation/administrative.presentation.module';
import { UsersPresentationModule } from './modules/users/presentation/users.presentation.module';
import { ServicesPresentationModule } from './modules/services/presentation/services.presentation.module';
import { InventoryPresentationModule } from './modules/inventory/presentation/inventory.presentation.module';
import { FinancialPresentationModule } from './modules/financial/presentation/financial.presentation.module';
import { RequestLoggerMiddleware } from './shared/presentation/middleware/request-logger.middleware';

@Module({
  imports: [
    ConfigModule, // Custom configuration module with validation
    SharedModule,
    DatabaseModule,
    RedisModule,
    AuthModule,
    // Domain modules
    AdministrativePresentationModule,
    UsersPresentationModule,
    ServicesPresentationModule,
    InventoryPresentationModule,
    FinancialPresentationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}

