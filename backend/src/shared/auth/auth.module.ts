/**
 * Authentication Module
 *
 * NestJS module that provides authentication services and guards.
 * This module integrates Firebase Authentication with the backend and provides
 * JWT token generation, password hashing, rate limiting, and permission checking.
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../adapters/db/database.module';
import { RedisModule } from '../../adapters/redis/redis.module';
import { FirebaseAuthService } from './firebase-auth.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { PasswordHasherService } from './password-hasher.service';
import { JwtTokenGeneratorService } from './jwt-token-generator.service';
import { RateLimiterService } from './rate-limiter.service';
import { PermissionService } from './permission.service';
import { RolesGuard } from './roles.guard';
import { RateLimitGuard } from './rate-limit.guard';
import { FirebaseAuthIntegrationService } from './firebase-auth-integration.service';
import { FirebaseUserLookupService } from './firebase-user-lookup.service';

@Global()
@Module({
  imports: [
    DatabaseModule, // Import to get FIREBASE_ADMIN
    RedisModule, // Import to get REDIS_CLIENT
    ConfigModule, // Import to get ConfigService
  ],
  providers: [
    // Firebase Auth
    FirebaseAuthService,
    FirebaseAuthGuard,
    {
      provide: 'FirebaseAuthService',
      useExisting: FirebaseAuthService,
    },
    // Password hashing
    PasswordHasherService,
    {
      provide: 'PasswordHasher',
      useExisting: PasswordHasherService,
    },
    // JWT token generation
    JwtTokenGeneratorService,
    {
      provide: 'TokenGenerator',
      useExisting: JwtTokenGeneratorService,
    },
    // Rate limiting
    RateLimiterService,
    {
      provide: 'RateLimiter',
      useExisting: RateLimiterService,
    },
    // Permission checking
    PermissionService,
    RolesGuard,
    // Rate limiting
    RateLimitGuard,
    // Firebase Auth Integration
    FirebaseAuthIntegrationService,
    {
      provide: 'FirebaseAuthIntegrationService',
      useExisting: FirebaseAuthIntegrationService,
    },
    FirebaseUserLookupService,
    {
      provide: 'FirebaseUserLookupService',
      useExisting: FirebaseUserLookupService,
    },
  ],
  exports: [
    FirebaseAuthService,
    FirebaseAuthGuard,
    PasswordHasherService,
    'PasswordHasher',
    JwtTokenGeneratorService,
    'TokenGenerator',
    RateLimiterService,
    'RateLimiter',
    PermissionService,
    RolesGuard,
    RateLimitGuard,
    FirebaseAuthIntegrationService,
    'FirebaseAuthIntegrationService',
    FirebaseUserLookupService,
    'FirebaseUserLookupService',
  ],
})
export class AuthModule {}
