/**
 * Logger Service
 * 
 * Enhanced Winston logger with structured logging, log rotation, and filtering.
 * Provides NestJS-compatible logger interface with additional features.
 */

import { Injectable, LoggerService as NestLoggerService, Inject } from '@nestjs/common';
import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import { AppConfigService } from '../config/config.service';

/**
 * Structured log metadata interface
 */
export interface LogMetadata {
  context?: string;
  userId?: string;
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

@Injectable()
export class Logger implements NestLoggerService {
  private logger: winston.Logger;
  private readonly logDir: string;

  constructor(
    private readonly config: AppConfigService
  ) {
    const logLevel = this.config.logLevel;
    const logFormat = this.config.logFormat;
    const nodeEnv = this.config.nodeEnv;
    
    // Create logs directory if it doesn't exist
    this.logDir = this.config.logDir;
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Structured logging format
    const structuredFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
      winston.format.printf((info) => {
        const { timestamp, level, message, context, ...meta } = info;
        const logEntry: any = {
          timestamp,
          level: level.toUpperCase(),
          message,
          ...(context && { context }),
          ...meta,
        };
        return JSON.stringify(logEntry);
      })
    );

    // Pretty format for development
    const prettyFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
        const contextStr = context ? `[${context}]` : '';
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 2)}` : '';
        return `${timestamp} ${level} ${contextStr} ${message}${metaStr}`;
      })
    );

    const format = logFormat === 'pretty' ? prettyFormat : structuredFormat;

    // Configure transports
    const transports: winston.transport[] = [
      // Console transport (always enabled)
      new winston.transports.Console({
        format,
        level: logLevel,
      }),
    ];

    // File transports for production
    if (nodeEnv === 'production' || this.configService.get('LOG_TO_FILE', 'false') === 'true') {
      // Error logs
      transports.push(
        new winston.transports.File({
          filename: path.join(this.logDir, 'error.log'),
          level: 'error',
          format: structuredFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        })
      );

      // Combined logs
      transports.push(
        new winston.transports.File({
          filename: path.join(this.logDir, 'combined.log'),
          format: structuredFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        })
      );

      // Access logs (HTTP requests)
      transports.push(
        new winston.transports.File({
          filename: path.join(this.logDir, 'access.log'),
          level: 'info',
          format: structuredFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        })
      );
    }

    this.logger = winston.createLogger({
      level: logLevel,
      format,
      transports,
      // Handle uncaught exceptions and unhandled rejections
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(this.logDir, 'exceptions.log'),
          format: structuredFormat,
        }),
      ],
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(this.logDir, 'rejections.log'),
          format: structuredFormat,
        }),
      ],
    });
  }

  /**
   * Logs an info message
   */
  log(message: string, context?: string): void {
    this.logger.info(message, { context });
  }

  /**
   * Logs an error message with optional trace
   */
  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { trace, context });
  }

  /**
   * Logs a warning message
   */
  warn(message: string, context?: string): void {
    this.logger.warn(message, { context });
  }

  /**
   * Logs a debug message
   */
  debug(message: string, context?: string): void {
    this.logger.debug(message, { context });
  }

  /**
   * Logs a verbose message
   */
  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context });
  }

  /**
   * Logs with custom metadata
   */
  logWithMetadata(level: 'info' | 'warn' | 'error' | 'debug' | 'verbose', message: string, metadata: LogMetadata): void {
    this.logger.log(level, message, metadata);
  }

  /**
   * Logs HTTP request
   */
  logRequest(method: string, path: string, statusCode: number, duration: number, metadata?: LogMetadata): void {
    this.logger.info('HTTP Request', {
      type: 'http_request',
      method,
      path,
      statusCode,
      duration,
      ...metadata,
    });
  }

  /**
   * Logs HTTP response
   */
  logResponse(method: string, path: string, statusCode: number, duration: number, metadata?: LogMetadata): void {
    this.logger.info('HTTP Response', {
      type: 'http_response',
      method,
      path,
      statusCode,
      duration,
      ...metadata,
    });
  }
}

