/**
 * Global HTTP Exception Filter
 *
 * Catches all HTTP exceptions and formats them into a standardized response.
 * Also handles application errors and validation errors from class-validator.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  mapApplicationErrorToHttpException,
  createErrorResponse,
} from '../errors/http-error.mapper';
import { ApplicationError } from '../../errors/application-error.base';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(
    @Optional()
    @Inject('Logger')
    private readonly customLogger?: any,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let httpException: HttpException;
    let status: number;
    let errorCode: string;
    let errorMessage: string;
    let errorDetails: Record<string, any> | undefined;

    // Handle ApplicationError instances (from use cases)
    if (exception instanceof ApplicationError) {
      errorCode = exception.code;
      errorMessage = exception.message;
      errorDetails = exception.details;
      status = exception.httpStatus;

      httpException = mapApplicationErrorToHttpException({
        code: errorCode,
        message: errorMessage,
      });

      // Log application errors (but not at error level for client errors)
      if (status >= 500) {
        this.logError(exception, request, status);
      } else {
        this.logWarn(exception, request, status);
      }
    }
    // Handle NestJS HttpException (including BadRequestException from validation)
    else if (exception instanceof HttpException) {
      httpException = exception;
      status = exception.getStatus();
      const responseBody = exception.getResponse();

      // Handle class-validator validation errors
      if (status === HttpStatus.BAD_REQUEST && typeof responseBody === 'object') {
        const validationResponse = responseBody as any;
        if (Array.isArray(validationResponse.message)) {
          // Validation errors from class-validator
          errorCode = 'VALIDATION_ERROR';
          errorMessage = 'Validation failed';
          errorDetails = {
            fields: validationResponse.message.map((msg: string) => {
              // Extract field name from validation message
              const match = msg.match(/^(\w+)\s/);
              return match ? match[1] : msg;
            }),
            messages: validationResponse.message,
          };

          this.logWarn(exception, request, status, errorDetails);
        } else {
          errorCode = 'BAD_REQUEST';
          errorMessage =
            typeof responseBody === 'string'
              ? responseBody
              : validationResponse.message || exception.message;
        }
      } else {
        errorCode = exception.name;
        errorMessage =
          typeof responseBody === 'string'
            ? responseBody
            : (responseBody as any).message || exception.message;
      }

      // Log server errors
      if (status >= 500) {
        this.logError(exception, request, status);
      }
    }
    // Handle generic Error instances
    else if (exception instanceof Error) {
      // Check if it's an application error with code property
      if ('code' in exception && 'message' in exception) {
        errorCode = (exception as any).code;
        errorMessage = exception.message;

        httpException = mapApplicationErrorToHttpException({
          code: errorCode,
          message: errorMessage,
        });
        status = httpException.getStatus();

        this.logWarn(exception, request, status);
      } else {
        // Generic error
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        errorCode = 'INTERNAL_SERVER_ERROR';
        errorMessage = exception.message || 'An unexpected error occurred';

        httpException = new HttpException(
          {
            success: false,
            error: {
              code: errorCode,
              message: errorMessage,
              statusCode: status,
            },
          },
          status,
        );

        this.logError(exception, request, status);
      }
    }
    // Unknown error type
    else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'INTERNAL_SERVER_ERROR';
      errorMessage = 'An unexpected error occurred';

      httpException = new HttpException(
        {
          success: false,
          error: {
            code: errorCode,
            message: errorMessage,
            statusCode: status,
          },
        },
        status,
      );

      this.logError(exception, request, status);
    }

    // Create standardized error response
    const errorResponse = createErrorResponse(httpException, errorCode, errorDetails);

    response.status(status).json({
      ...errorResponse,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs error at error level (for 5xx errors)
   */
  private logError(exception: unknown, request: Request, status: number, details?: any): void {
    const errorDetails = {
      statusCode: status,
      path: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      ...details,
    };

    if (exception instanceof Error) {
      this.logger.error(
        `${exception.message} - ${request.method} ${request.url}`,
        exception.stack,
        errorDetails,
      );
    } else {
      this.logger.error(
        `Unknown error - ${request.method} ${request.url}`,
        JSON.stringify(exception),
        errorDetails,
      );
    }
  }

  /**
   * Logs error at warn level (for 4xx client errors)
   */
  private logWarn(exception: unknown, request: Request, status: number, details?: any): void {
    const errorDetails = {
      statusCode: status,
      path: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      ...details,
    };

    if (exception instanceof Error) {
      this.logger.warn(`${exception.message} - ${request.method} ${request.url}`, errorDetails);
    } else {
      this.logger.warn(`Client error - ${request.method} ${request.url}`, errorDetails);
    }
  }
}
