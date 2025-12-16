/**
 * Request Logger Middleware
 * 
 * Logs HTTP requests and responses with structured metadata.
 * Captures method, path, status code, duration, IP, user agent, etc.
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger as AppLogger } from '../../logger/logger.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  constructor(private readonly appLogger: AppLogger) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip, headers } = req;

    // Extract user ID from request if available (set by auth guard)
    const userId = (req as any).user?.uid || (req as any).firebaseUid || undefined;
    const requestId = req.headers['x-request-id'] as string || undefined;

    // Capture references for closure
    const appLogger = this.appLogger;
    const sanitizeBody = this.sanitizeBody.bind(this);

    // Log request
    appLogger.logRequest(
      method,
      originalUrl,
      0, // Status code not available yet
      0, // Duration not available yet
      {
        context: 'HTTP',
        userId,
        requestId,
        ip: ip || req.socket.remoteAddress,
        userAgent: headers['user-agent'],
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        body: sanitizeBody(req.body),
      }
    );

    // Capture response
    const originalSend = res.send;
    res.send = function (body: any) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Log response
      appLogger.logResponse(
        method,
        originalUrl,
        statusCode,
        duration,
        {
          context: 'HTTP',
          userId,
          requestId,
          ip: ip || req.socket.remoteAddress,
          userAgent: headers['user-agent'],
          responseSize: Buffer.byteLength(body || '', 'utf8'),
        }
      );

      return originalSend.call(this, body);
    };

    next();
  }

  /**
   * Sanitizes request body to remove sensitive information
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey', 'authorization'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}

