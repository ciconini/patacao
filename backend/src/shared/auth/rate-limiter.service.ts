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
  private redisConnected: boolean = false;

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {
    // Monitor Redis connection status
    this.redis.on('connect', () => {
      this.redisConnected = true;
      console.log('Redis connected for rate limiting');
    });

    this.redis.on('error', (error) => {
      this.redisConnected = false;
      console.warn('Redis connection error (rate limiting will fail open):', error.message);
    });

    this.redis.on('close', () => {
      this.redisConnected = false;
      console.warn('Redis connection closed (rate limiting will fail open)');
    });

    // Check initial connection status
    this.redisConnected = this.redis.status === 'ready';
    
    // Initialize rate limiters with Redis client
    // Note: RateLimiterRedis will handle connection errors gracefully
    // Login rate limiter: 5 attempts per 15 minutes per IP/email
    this.loginRateLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl_login',
      points: 5, // Number of attempts
      duration: 15 * 60, // Per 15 minutes
      blockDuration: 15 * 60, // Block for 15 minutes after limit exceeded
      // Add options to prevent blocking
      execEvenly: false, // Don't wait for even distribution
    });

    // Password reset rate limiter: 3 attempts per hour per email
    this.passwordResetRateLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl_password_reset',
      points: 3, // Number of attempts
      duration: 60 * 60, // Per hour
      blockDuration: 60 * 60, // Block for 1 hour after limit exceeded
      execEvenly: false,
    });

    // General rate limiter: 100 requests per minute per identifier
    this.generalRateLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl_general',
      points: 100, // Number of requests
      duration: 60, // Per minute
      execEvenly: false,
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
    // Fast path: If Redis is not connected, immediately fail open (allow request)
    // Check status synchronously to avoid any async delays
    const redisStatus = this.redis?.status;
    if (!this.redisConnected || redisStatus !== 'ready') {
      // Don't even try to use rate limiter if Redis is not ready
      // This prevents any connection attempts that might block
      return true;
    }

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

      // Add very aggressive timeout to prevent hanging (250ms)
      // If Redis is slow or trying to connect, fail fast
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Rate limiter timeout')), 250);
      });

      await Promise.race([
        limiter.consume(identifier),
        timeoutPromise,
      ]);
      
      return true;
    } catch (error: any) {
      // Rate limit exceeded (legitimate rate limit)
      if (error.remainingPoints !== undefined) {
        return false;
      }
      // Redis error or timeout - allow the request but don't log (too noisy)
      // This ensures the application continues to work even if Redis is unavailable
      return true; // Fail open on Redis errors/timeouts
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
