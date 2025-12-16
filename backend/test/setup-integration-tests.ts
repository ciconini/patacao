/**
 * Integration Tests Setup
 * 
 * Sets up the test environment for integration tests.
 * Ensures Firestore emulator is running and configured.
 */

import { ConfigService } from '@nestjs/config';

// Set environment variables for Firestore emulator
process.env.USE_FIREBASE_EMULATOR = 'true';
process.env.FIREBASE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_PROJECT_ID = 'patacao-test';

// Mock ConfigService for tests
jest.mock('@nestjs/config', () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    get: (key: string, defaultValue?: any) => {
      const env: Record<string, any> = {
        USE_FIREBASE_EMULATOR: 'true',
        FIREBASE_EMULATOR_HOST: 'localhost:8080',
        FIREBASE_PROJECT_ID: 'patacao-test',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        LOG_LEVEL: 'error', // Reduce log noise in tests
      };
      return env[key] ?? defaultValue;
    },
  })),
}));

// Increase timeout for integration tests
jest.setTimeout(30000);

