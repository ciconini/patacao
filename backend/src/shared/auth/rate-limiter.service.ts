/**
 * Rate Limiter Service
 * 
 * Service for rate limiting authentication attempts and other actions.
 * This service implements the RateLimiter interface used by authentication use cases.
 * Uses Redis for distributed rate limiting.
 */

import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

@Injectable()
export class RateLimiterService {
  private readonly loginRateLimiter: RateLimiterRedis;
  private readonly passwordResetRateLimiter: RateLimiterRedis;
  private readonly generalRateLimiter: RateLimiterRedis;

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {
    // Login rate limiter: 5 attempts per 15 minutes per IP/email
    this.loginRateLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl_login',
      points: 5, // Number of attempts
      duration: 15 * 60, // Per 15 minutes
      blockDuration: 15 * 60, // Block for 15 minutes after limit exceeded
    });

    // Password reset rate limiter: 3 attempts per hour per email
    this.passwordResetRateLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl_password_reset',
      points: 3, // Number of attempts
      duration: 60 * 60, // Per hour
      blockDuration: 60 * 60, // Block for 1 hour after limit exceeded
    });

    // General rate limiter: 100 requests per minute per identifier
    this.generalRateLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl_general',
      points: 100, // Number of requests
      duration: 60, // Per minute
    });
  }

  /**
   * Checks if an action is allowed based on rate limits
   * 
   * @param identifier - Unique identifier (IP address, email, user ID, etc.)
   * @param action - Action type ('login', 'password_reset', 'general')
   * @returns True if allowed, false if rate limit exceeded
   */
  async checkRateLimit(identifier: string, action: string): Promise<boolean> {
    try {
      let limiter: RateLimiterRedis;

      switch (action) {
        case 'login':
          limiter = this.loginRateLimiter;
          break;
        case 'password_reset':
          limiter = this.passwordResetRateLimiter;
          break;
        default:
          limiter = this.generalRateLimiter;
      }

      await limiter.consume(identifier);
      return true;
    } catch (error: any) {
      // Rate limit exceeded
      if (error.remainingPoints !== undefined) {
        return false;
      }
      // Redis error - allow the request but log the error
      console.error('Rate limiter error:', error);
      return true; // Fail open on Redis errors
    }
  }

  /**
   * Increments the attempt counter for rate limiting
   * This is called automatically by checkRateLimit, but can be called explicitly
   * 
   * @param identifier - Unique identifier
   * @param action - Action type
   */
  async incrementAttempts(identifier: string, action: string): Promise<void> {
    // This is handled automatically by checkRateLimit
    // But we can call it explicitly if needed
    await this.checkRateLimit(identifier, action);
  }

  /**
   * Resets rate limit for an identifier (useful for testing or manual unlocks)
   * 
   * @param identifier - Unique identifier
   * @param action - Action type
   */
  async reset(identifier: string, action: string): Promise<void> {
    try {
      let limiter: RateLimiterRedis;

      switch (action) {
        case 'login':
          limiter = this.loginRateLimiter;
          break;
        case 'password_reset':
          limiter = this.passwordResetRateLimiter;
          break;
        default:
          limiter = this.generalRateLimiter;
      }

      await limiter.delete(identifier);
    } catch (error) {
      console.error('Error resetting rate limit:', error);
    }
  }
}

