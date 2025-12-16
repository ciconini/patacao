/**
 * E2E Tests Setup
 * 
 * Sets up the test environment for end-to-end tests.
 * Configures the test application and test database.
 */

// Set environment variables for E2E tests
process.env.NODE_ENV = 'test';
process.env.USE_FIREBASE_EMULATOR = 'true';
process.env.FIREBASE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_PROJECT_ID = 'patacao-test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Increase timeout for E2E tests
jest.setTimeout(60000);

