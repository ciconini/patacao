/**
 * Jest Configuration for Integration Tests
 * 
 * This configuration is used for integration tests that use real Firestore emulator.
 * Tests should use the Firestore emulator and clean up after themselves.
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/test/integration'],
  testMatch: ['**/*.integration.spec.ts', '**/*.integration.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        module: 'commonjs',
        target: 'ES2022',
        skipLibCheck: true,
        resolveJsonModule: true,
        moduleResolution: 'node',
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    }],
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testTimeout: 30000, // 30 seconds for Firestore emulator operations
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/test/setup-integration-tests.ts'],
  globalSetup: '<rootDir>/test/global-setup-integration.ts',
  globalTeardown: '<rootDir>/test/global-teardown-integration.ts',
};

