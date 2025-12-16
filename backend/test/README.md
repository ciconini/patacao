# Testing Infrastructure

This directory contains test files and configuration for the Patacão backend.

## Test Structure

- **Unit Tests** (`*.spec.ts`): Test individual components in isolation with mocked dependencies
- **Integration Tests** (`*.integration.spec.ts`): Test components with real Firestore emulator
- **E2E Tests** (`*.e2e-spec.ts`): Test complete application flows end-to-end
- **Firestore Security Rules Tests** (`firestore-security-rules.test.ts`): Test Firestore security rules

## Running Tests

### Unit Tests
```bash
npm run test:unit          # Run all unit tests
npm run test:unit:watch    # Run in watch mode
npm run test:cov           # Run with coverage report
```

### Integration Tests
```bash
# Start Firestore emulator first
npm run firebase:emulators

# In another terminal
npm run test:integration
```

### E2E Tests
```bash
# Start Firestore emulator first
npm run firebase:emulators

# In another terminal
npm run test:e2e
```

### All Tests
```bash
npm test
```

## Test Configuration

- **`jest.config.js`**: Configuration for unit tests
- **`jest.config.integration.js`**: Configuration for integration tests
- **`test/jest-e2e.json`**: Configuration for E2E tests
- **`jest.firestore.config.js`**: Configuration for Firestore security rules tests

## Test Helpers

See `test/helpers/test-helpers.ts` for common utilities:
- `clearFirestore()`: Clear all Firestore collections
- `createTestUser()`: Create a test user object
- `createTestCompany()`: Create a test company object
- `createMockRepository()`: Create a mock repository

## Writing Tests

### Unit Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CreateCustomerUseCase } from './create-customer.use-case';
import { CustomerRepository } from '../ports/customer.repository.port';

describe('CreateCustomerUseCase', () => {
  let useCase: CreateCustomerUseCase;
  let mockRepository: jest.Mocked<CustomerRepository>;

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      // ... other methods
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateCustomerUseCase,
        {
          provide: 'CustomerRepository',
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<CreateCustomerUseCase>(CreateCustomerUseCase);
  });

  it('should create a customer', async () => {
    // Test implementation
  });
});
```

### Integration Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { FirestoreCustomerRepository } from './firestore-customer.repository';
import { DatabaseModule } from '../../../adapters/db/database.module';
import { clearFirestore } from '../../helpers/test-helpers';

describe('FirestoreCustomerRepository (Integration)', () => {
  let repository: FirestoreCustomerRepository;
  let firestore: Firestore;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [FirestoreCustomerRepository],
    }).compile();

    repository = module.get<FirestoreCustomerRepository>(FirestoreCustomerRepository);
    firestore = module.get<Firestore>('FIRESTORE');
    
    // Clear Firestore before each test
    await clearFirestore(firestore);
  });

  it('should save and retrieve a customer', async () => {
    // Test implementation with real Firestore
  });
});
```

## Coverage

Coverage reports are generated in the `coverage/` directory:
- `coverage/lcov-report/index.html`: HTML coverage report
- `coverage/lcov.info`: LCOV format for CI/CD

## Best Practices

1. **Unit Tests**: Mock all external dependencies (repositories, services)
2. **Integration Tests**: Use real Firestore emulator, clean up after each test
3. **E2E Tests**: Test complete user flows, use test fixtures
4. **Naming**: Use descriptive test names that explain what is being tested
5. **Arrange-Act-Assert**: Structure tests clearly
6. **Isolation**: Each test should be independent and not rely on other tests
