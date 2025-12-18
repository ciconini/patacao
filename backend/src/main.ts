import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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
