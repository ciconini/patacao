import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { Logger } from './shared/logger/logger.service';
import { HttpExceptionFilter } from './shared/presentation/filters/http-exception.filter';
import { AppConfigService } from './shared/config/config.service';

// Handle unhandled rejections (e.g., from Redis connection attempts)
// This must be set up BEFORE any modules are loaded to catch Redis connection errors
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  // Extract error information from various possible formats
  // Handle nested error objects (reason.error.code) and empty messages
  const errorMessage = reason?.message || reason?.error?.message || String(reason || '');
  const errorCode = reason?.code || reason?.error?.code || reason?.errno || '';
  const errorStack = reason?.stack || reason?.error?.stack || '';
  const errorName = reason?.name || reason?.error?.name || '';
  const errorString = String(reason || '');
  
  // Check if it's a connection error (ECONNREFUSED, ENOTFOUND, etc.)
  // This catches Redis, database, and other connection errors
  const isConnectionError = 
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'ENOTFOUND' ||
    errorCode === 'ETIMEDOUT' ||
    (typeof errorMessage === 'string' && (
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('connect') ||
      errorMessage.includes('connection')
    )) ||
    (typeof errorStack === 'string' && (
      errorStack.includes('ECONNREFUSED') ||
      errorStack.includes('ENOTFOUND') ||
      errorStack.includes('ETIMEDOUT') ||
      errorStack.includes('internalConnectMultiple') ||
      errorStack.includes('afterConnectMultiple')
    )) ||
    (typeof errorString === 'string' && (
      errorString.includes('ECONNREFUSED') ||
      errorString.includes('ENOTFOUND') ||
      errorString.includes('ETIMEDOUT')
    )) ||
    // AggregateError with ECONNREFUSED (common format from Node.js)
    (errorName === 'AggregateError' && (
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ENOTFOUND' ||
      errorCode === 'ETIMEDOUT'
    ));
  
  if (isConnectionError) {
    // Handle the promise synchronously to prevent it from being logged
    // This must be done synchronously to avoid PromiseRejectionHandledWarning
    promise.catch(() => {
      // Silently handle connection errors - they're expected when services are unavailable
    });
    // Return immediately - don't log, don't crash
    return;
  }
  
  // Log other unhandled rejections but don't crash
  console.error('Unhandled Rejection:', reason);
});

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
  const apiPrefix = `api/${configService.apiVersion}`;
  app.setGlobalPrefix(apiPrefix);

  // Swagger/OpenAPI Documentation
  if (configService.nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Patacão Petshop Management System API')
      .setDescription(
        'REST API for managing petshop operations including customers, pets, appointments, inventory, and financial transactions.',
      )
      .setVersion(configService.apiVersion)
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
      )
      .addTag('Authentication', 'User authentication and authorization endpoints')
      .addTag('Administrative', 'Company, store, customer, and pet management')
      .addTag('Users', 'User and staff management')
      .addTag('Services', 'Service and appointment management')
      .addTag('Inventory', 'Product, stock, and supplier management')
      .addTag('Financial', 'Invoice, transaction, and financial export management')
      .addTag('Workers', 'Background worker monitoring and management')
      .addTag('Queues', 'Queue monitoring and management')
      .addTag('Health', 'Health check endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true, // Persist authorization token in browser
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    logger.log(
      `Swagger documentation available at: http://localhost:${configService.port}/${apiPrefix}/docs`,
    );
  }

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

  logger.log(
    `Application is running on: http://localhost:${configService.port}/api/${configService.apiVersion}`,
  );
}

bootstrap();
