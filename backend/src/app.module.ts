import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './shared/config/config.module';
import { SharedModule } from './shared/shared.module';
import { DatabaseModule } from './adapters/db/database.module';
import { RedisModule } from './adapters/redis/redis.module';
import { AuthModule } from './shared/auth/auth.module';
import { AdministrativeModule } from './modules/administrative/administrative.module';
import { UsersModule } from './modules/users/users.module';
import { ServicesModule } from './modules/services/services.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { FinancialModule } from './modules/financial/financial.module';
import { RequestLoggerMiddleware } from './shared/presentation/middleware/request-logger.middleware';

@Module({
  imports: [
    ConfigModule, // Custom configuration module with validation
    SharedModule,
    DatabaseModule,
    RedisModule,
    AuthModule,
    // Domain modules (consolidated modules that include all layers)
    AdministrativeModule,
    UsersModule,
    ServicesModule,
    InventoryModule,
    FinancialModule,
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

