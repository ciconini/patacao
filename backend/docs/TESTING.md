# Testing Infrastructure

## Overview

Phase 5 Testing Infrastructure has been set up. This document describes the testing architecture, configuration, and how to write tests.

## Test Types

### 1. Unit Tests

**Location:** `src/**/*.spec.ts`

Unit tests test individual components in isolation with all dependencies mocked.

**Configuration:** `jest.config.js`

**Run:** `npm run test:unit`

**Example:**
```typescript
describe('CreateCustomerUseCase', () => {
  let useCase: CreateCustomerUseCase;
  let mockRepository: jest.Mocked<CustomerRepository>;

  beforeEach(async () => {
    mockRepository = createMockRepository();
    const module = await Test.createTestingModule({
      providers: [
        CreateCustomerUseCase,
        { provide: 'CustomerRepository', useValue: mockRepository },
      ],
    }).compile();
    useCase = module.get(CreateCustomerUseCase);
  });

  it('should create a customer', async () => {
    // Test implementation
  });
});
```

### 2. Integration Tests

**Location:** `test/integration/**/*.integration.spec.ts`

Integration tests use real Firestore emulator to test components with actual database operations.

**Configuration:** `jest.config.integration.js`

**Run:** 
```bash
# Terminal 1: Start emulator
npm run firebase:emulators

# Terminal 2: Run tests
npm run test:integration
```

**Example:**
```typescript
describe('FirestoreCustomerRepository (Integration)', () => {
  let repository: FirestoreCustomerRepository;
  let firestore: Firestore;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [FirestoreCustomerRepository],
    }).compile();
    
    repository = module.get(FirestoreCustomerRepository);
    firestore = module.get('FIRESTORE');
    await clearFirestore(firestore);
  });

  it('should save and retrieve a customer', async () => {
    // Test with real Firestore
  });
});
```

### 3. E2E Tests

**Location:** `test/**/*.e2e-spec.ts`

E2E tests test complete application flows end-to-end.

**Configuration:** `test/jest-e2e.json`

**Run:**
```bash
# Terminal 1: Start emulator
npm run firebase:emulators

# Terminal 2: Run tests
npm run test:e2e
```

**Example:**
```typescript
describe('Customer API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  it('/api/v1/customers (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/customers')
      .send({ fullName: 'John Doe', email: 'john@example.com' })
      .expect(201);
  });
});
```

## Test Configuration

### Jest Configuration Files

1. **`jest.config.js`** - Unit tests
   - Tests: `src/**/*.spec.ts`
   - Timeout: 10 seconds
   - Coverage: Enabled with thresholds

2. **`jest.config.integration.js`** - Integration tests
   - Tests: `test/integration/**/*.integration.spec.ts`
   - Timeout: 30 seconds
   - Uses Firestore emulator

3. **`test/jest-e2e.json`** - E2E tests
   - Tests: `test/**/*.e2e-spec.ts`
   - Timeout: 60 seconds
   - Full application setup

4. **`jest.firestore.config.js`** - Firestore security rules tests
   - Tests: `test/firestore-security-rules.test.ts`
   - Uses Firebase Rules Unit Testing

## Test Helpers

**Location:** `test/helpers/test-helpers.ts`

### Available Helpers

- `clearFirestore(firestore)`: Clear all Firestore collections
- `createTestUser(overrides)`: Create a test user object
- `createTestCompany(overrides)`: Create a test company object
- `createMockRepository()`: Create a mock repository
- `wait(ms)`: Wait for specified milliseconds

## Coverage

Coverage reports are generated in the `coverage/` directory:

- **HTML Report:** `coverage/lcov-report/index.html`
- **LCOV Format:** `coverage/lcov.info` (for CI/CD)
- **JSON Summary:** `coverage/coverage-summary.json`

### Coverage Thresholds

- Branches: 60%
- Functions: 60%
- Lines: 60%
- Statements: 60%

Run with coverage:
```bash
npm run test:cov
```

## NPM Scripts

```bash
# Unit tests
npm run test:unit              # Run all unit tests
npm run test:unit:watch         # Watch mode

# Integration tests
npm run test:integration        # Run all integration tests
npm run test:integration:watch  # Watch mode

# E2E tests
npm run test:e2e               # Run all E2E tests

# Coverage
npm run test:cov               # Run with coverage report

# All tests
npm test                       # Run all unit tests
```

## Writing Tests

### Best Practices

1. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should do something', async () => {
     // Arrange: Set up test data and mocks
     const input = { ... };
     mockRepository.save.mockResolvedValue(...);
     
     // Act: Execute the code under test
     const result = await useCase.execute(input);
     
     // Assert: Verify the results
     expect(result).toBeDefined();
     expect(mockRepository.save).toHaveBeenCalled();
   });
   ```

2. **Mock External Dependencies**
   - Always mock repositories in unit tests
   - Mock services that make external calls
   - Use real implementations in integration tests

3. **Test Isolation**
   - Each test should be independent
   - Clean up after each test
   - Don't rely on test execution order

4. **Descriptive Test Names**
   ```typescript
   // Good
   it('should throw ValidationError when email already exists', ...)
   
   // Bad
   it('should work', ...)
   ```

5. **Test Edge Cases**
   - Invalid input
   - Missing required fields
   - Duplicate entries
   - Not found scenarios
   - Permission checks

## Test Structure

```
backend/
├── src/
│   └── modules/
│       └── administrative/
│           └── application/
│               └── create-customer.use-case.spec.ts  # Unit test
├── test/
│   ├── integration/
│   │   └── repositories/
│   │       └── customer.repository.integration.spec.ts
│   ├── helpers/
│   │   └── test-helpers.ts
│   ├── setup-integration-tests.ts
│   ├── global-setup-integration.ts
│   ├── global-teardown-integration.ts
│   ├── setup-e2e-tests.ts
│   ├── global-setup-e2e.ts
│   ├── global-teardown-e2e.ts
│   └── firestore-security-rules.test.ts
└── jest.config.js
```

## Continuous Integration

Tests should be run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run unit tests
  run: npm run test:unit

- name: Run integration tests
  run: |
    npm run firebase:emulators &
    sleep 10
    npm run test:integration

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Troubleshooting

### Tests failing with "Cannot find module"

- Ensure `tsconfig.json` paths are configured correctly
- Check `moduleNameMapper` in Jest config

### Firestore emulator not connecting

- Verify emulator is running: `npm run firebase:emulators`
- Check `FIREBASE_EMULATOR_HOST` environment variable
- Ensure port 8080 is available

### Coverage not generating

- Check `collectCoverageFrom` in Jest config
- Verify files are not excluded
- Run with `--coverage` flag

### Slow tests

- Use `jest.setTimeout()` for specific slow tests
- Consider parallel execution
- Mock heavy operations in unit tests

## Next Steps

1. Add unit tests for all use cases
2. Add unit tests for domain entities
3. Add unit tests for domain services
4. Add integration tests for repositories
5. Add E2E tests for critical flows

