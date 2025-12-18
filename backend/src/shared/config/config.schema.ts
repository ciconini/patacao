/**
 * Configuration Schema
 *
 * Defines the schema for environment variable validation using Zod.
 * This ensures all required configuration values are present and valid.
 */

import { z } from 'zod';

/**
 * Environment variable schema
 */
export const configSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),
  API_VERSION: z.string().default('v1'),

  // Firebase
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  USE_FIREBASE_EMULATOR: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  FIREBASE_EMULATOR_HOST: z.string().optional(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().regex(/^\d+$/).transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().regex(/^\d+$/).transform(Number).default('0'),

  // CORS
  CORS_ORIGIN: z.string().default('*'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  LOG_TO_FILE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  LOG_DIR: z.string().default('logs'),

  // JWT
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Rate Limiting
  RATE_LIMIT_TTL: z.string().regex(/^\d+$/).transform(Number).default('60'),
  RATE_LIMIT_MAX: z.string().regex(/^\d+$/).transform(Number).default('10'),

  // Security
  BCRYPT_ROUNDS: z.string().regex(/^\d+$/).transform(Number).default('10'),

  // Account Lockout
  MAX_FAILED_LOGIN_ATTEMPTS: z.string().regex(/^\d+$/).transform(Number).default('5'),
  LOCKOUT_DURATION_MINUTES: z.string().regex(/^\d+$/).transform(Number).default('15'),

  // Event Bus
  USE_QUEUE_EVENT_BUS: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
});

/**
 * TypeScript type for validated configuration
 */
export type ConfigSchema = z.infer<typeof configSchema>;
