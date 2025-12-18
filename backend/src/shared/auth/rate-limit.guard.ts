/**
 * Rate Limit Guard
 *
 * NestJS guard that applies rate limiting to routes.
 * This guard should be used on authentication endpoints to prevent brute force attacks.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterService } from './rate-limiter.service';
import { Request } from 'express';

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (action: string) => SetMetadata(RATE_LIMIT_KEY, action);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiterService: RateLimiterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<string>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!action) {
      // No rate limit configured, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Get identifier (IP address or email from body)
    let identifier: string;

    if (action === 'login' || action === 'password_reset') {
      // For login/password reset, use email from body if available, otherwise use IP
      const body = request.body || {};
      identifier = body.email || request.ip || 'unknown';
    } else {
      // For other actions, use IP address
      identifier = request.ip || 'unknown';
    }

    const isAllowed = await this.rateLimiterService.checkRateLimit(identifier, action);

    if (!isAllowed) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
