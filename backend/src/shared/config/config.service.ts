/**
 * Configuration Service
 * 
 * Provides typed access to validated configuration values.
 * All configuration values are validated against the schema on startup.
 */

import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { ConfigSchema } from './config.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: NestConfigService<ConfigSchema>) {}

  // Application
  get nodeEnv(): 'development' | 'production' | 'test' {
    return this.configService.get('NODE_ENV', { infer: true })!;
  }

  get port(): number {
    return this.configService.get('PORT', { infer: true })!;
  }

  get apiVersion(): string {
    return this.configService.get('API_VERSION', { infer: true })!;
  }

  // Firebase
  get firebaseProjectId(): string {
    return this.configService.get('FIREBASE_PROJECT_ID', { infer: true })!;
  }

  get firebaseServiceAccountPath(): string | undefined {
    return this.configService.get('FIREBASE_SERVICE_ACCOUNT_PATH', { infer: true });
  }

  get firebaseServiceAccountKey(): string | undefined {
    return this.configService.get('FIREBASE_SERVICE_ACCOUNT_KEY', { infer: true });
  }

  get useFirebaseEmulator(): boolean {
    return this.configService.get('USE_FIREBASE_EMULATOR', { infer: true })!;
  }

  get firebaseEmulatorHost(): string | undefined {
    return this.configService.get('FIREBASE_EMULATOR_HOST', { infer: true });
  }

  // Redis
  get redisHost(): string {
    return this.configService.get('REDIS_HOST', { infer: true })!;
  }

  get redisPort(): number {
    return this.configService.get('REDIS_PORT', { infer: true })!;
  }

  get redisPassword(): string | undefined {
    return this.configService.get('REDIS_PASSWORD', { infer: true });
  }

  get redisDb(): number {
    return this.configService.get('REDIS_DB', { infer: true })!;
  }

  // CORS
  get corsOrigin(): string {
    return this.configService.get('CORS_ORIGIN', { infer: true })!;
  }

  // Logging
  get logLevel(): 'error' | 'warn' | 'info' | 'debug' | 'verbose' {
    return this.configService.get('LOG_LEVEL', { infer: true })!;
  }

  get logFormat(): 'json' | 'pretty' {
    return this.configService.get('LOG_FORMAT', { infer: true })!;
  }

  get logToFile(): boolean {
    return this.configService.get('LOG_TO_FILE', { infer: true })!;
  }

  get logDir(): string {
    return this.configService.get('LOG_DIR', { infer: true })!;
  }

  // JWT
  get jwtSecret(): string | undefined {
    return this.configService.get('JWT_SECRET', { infer: true });
  }

  get jwtExpiresIn(): string {
    return this.configService.get('JWT_EXPIRES_IN', { infer: true })!;
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get('JWT_REFRESH_EXPIRES_IN', { infer: true })!;
  }

  // Rate Limiting
  get rateLimitTtl(): number {
    return this.configService.get('RATE_LIMIT_TTL', { infer: true })!;
  }

  get rateLimitMax(): number {
    return this.configService.get('RATE_LIMIT_MAX', { infer: true })!;
  }

  // Security
  get bcryptRounds(): number {
    return this.configService.get('BCRYPT_ROUNDS', { infer: true })!;
  }

  // Account Lockout
  get maxFailedLoginAttempts(): number {
    return this.configService.get('MAX_FAILED_LOGIN_ATTEMPTS', { infer: true })!;
  }

  get lockoutDurationMinutes(): number {
    return this.configService.get('LOCKOUT_DURATION_MINUTES', { infer: true })!;
  }

  /**
   * Gets a configuration value by key
   * 
   * @param key - Configuration key
   * @param defaultValue - Default value if not found
   * @returns Configuration value
   */
  get<T extends keyof ConfigSchema>(key: T, defaultValue?: ConfigSchema[T]): ConfigSchema[T] {
    return this.configService.get(key, defaultValue);
  }
}

