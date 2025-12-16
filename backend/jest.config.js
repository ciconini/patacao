/**
 * Jest Configuration for Unit Tests
 * 
 * This configuration is used for unit tests that mock dependencies.
 * Use jest.config.integration.js for integration tests with real Firestore.
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
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
    '!src/**/*.module.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.port.ts',
    '!src/**/*.entity.ts', // Domain entities are tested through use cases
    '!src/**/*.value-object.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testTimeout: 10000, // 10 seconds for unit tests
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};

