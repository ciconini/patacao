import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { Logger } from './shared/logger/logger.service';
import { HttpExceptionFilter } from './shared/presentation/filters/http-exception.filter';
import { AppConfigService } from './shared/config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(AppConfigService);
  const logger = app.get(Logger);

  app.useLogger(logger);

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS
  app.enableCors({
    origin: configService.corsOrigin,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix(`api/${configService.apiVersion}`);

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Validation errors are automatically formatted by class-validator
      // and handled by HttpExceptionFilter
    }),
  );

  await app.listen(configService.port);

  logger.log(`Application is running on: http://localhost:${configService.port}/api/${configService.apiVersion}`);
}

bootstrap();

