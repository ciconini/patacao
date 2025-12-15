# Testing Strategy — Patacão Petshop

## Overview

This document defines the testing strategy, approach, and guidelines for the Patacão Petshop Management System.

**Testing Pyramid:** Unit Tests → Integration Tests → E2E Tests  
**Coverage Target:** 80% code coverage  
**Test Framework:** Jest (backend), Jasmine/Karma (frontend), Cypress (E2E)

---

## Testing Pyramid

### 1. Unit Tests (70% of tests)

**Purpose:** Test individual functions, methods, and components in isolation

**Scope:**
- Domain entities and business logic
- Use case interactors
- Utility functions
- Domain services
- Value objects

**Tools:**
- **Backend:** Jest, TypeScript
- **Frontend:** Jasmine, Karma, Angular Testing Utilities

**Coverage Target:** 90%+

**Example:**
```typescript
describe('Invoice Entity', () => {
  it('should calculate VAT correctly', () => {
    const invoice = new Invoice({
      subtotal: 100.00,
      vatRate: 23
    });
    expect(invoice.calculateVAT()).toBe(23.00);
    expect(invoice.total).toBe(123.00);
  });
});
```

### 2. Integration Tests (20% of tests)

**Purpose:** Test interactions between components, repositories, and external services

**Scope:**
- Repository implementations
- Use case execution with real repositories
- Database operations
- External service integrations (mocked)

**Tools:**
- **Backend:** Jest, Testcontainers (PostgreSQL, Redis)
- **Frontend:** Angular Testing Module, HttpClientTestingModule

**Coverage Target:** 80%+

**Example:**
```typescript
describe('CreateInvoiceUseCase', () => {
  it('should create invoice with lines', async () => {
    const useCase = new CreateInvoiceUseCase(
      invoiceRepository,
      customerRepository
    );
    const result = await useCase.execute({
      companyId: '...',
      customerId: '...',
      lines: [...]
    });
    expect(result.invoice).toBeDefined();
    expect(result.invoice.lines).toHaveLength(2);
  });
});
```

### 3. E2E Tests (10% of tests)

**Purpose:** Test complete user workflows from API to database

**Scope:**
- Critical user journeys
- API endpoint testing
- Complete business flows
- Cross-module interactions

**Tools:**
- **Backend:** Supertest, Jest
- **Frontend:** Cypress or Playwright

**Coverage Target:** Critical paths only

**Example:**
```typescript
describe('Appointment Booking Flow', () => {
  it('should create and confirm appointment', async () => {
    // Create customer
    const customer = await createCustomer({...});
    
    // Create appointment
    const appointment = await createAppointment({
      customerId: customer.id,
      ...
    });
    
    // Confirm appointment
    const confirmed = await confirmAppointment(appointment.id);
    
    expect(confirmed.status).toBe('confirmed');
  });
});
```

---

## Test Organization

### Backend Structure

```
tests/
├── unit/
│   ├── domain/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   └── services/
│   ├── application/
│   │   └── use-cases/
│   └── shared/
├── integration/
│   ├── repositories/
│   ├── use-cases/
│   └── adapters/
├── e2e/
│   ├── api/
│   └── workflows/
└── fixtures/
    ├── factories/
    └── data/
```

### Frontend Structure

```
src/
├── app/
│   ├── components/
│   │   └── *.spec.ts
│   ├── services/
│   │   └── *.spec.ts
│   └── pages/
│       └── *.spec.ts
├── e2e/
│   ├── support/
│   └── specs/
└── fixtures/
```

---

## Testing Guidelines

### Unit Testing

#### Domain Entities

- Test business rules and invariants
- Test value object validation
- Test domain service logic
- Mock external dependencies

#### Use Cases

- Mock repository interfaces
- Test success scenarios
- Test error scenarios
- Test validation rules

#### Utilities

- Test edge cases
- Test error handling
- Test performance (if applicable)

### Integration Testing

#### Repository Tests

- Use test database (Testcontainers)
- Test CRUD operations
- Test queries and filters
- Test transactions
- Clean up after tests

#### Use Case Tests

- Use real repository implementations
- Test with test database
- Test error scenarios
- Test transaction rollback

### E2E Testing

#### API Tests

- Test complete request/response cycle
- Test authentication and authorization
- Test error responses
- Test pagination and filtering

#### Workflow Tests

- Test critical business flows
- Test cross-module interactions
- Test error recovery
- Test performance

---

## Test Data Management

### Test Fixtures

**Purpose:** Provide consistent test data

**Implementation:**
- Factory functions for entities
- Seed data for integration tests
- Mock data for unit tests

**Example:**
```typescript
export const createCustomerFixture = (overrides = {}) => ({
  id: uuid(),
  full_name: 'Test Customer',
  email: 'test@example.com',
  ...overrides
});
```

### Database Seeding

**Purpose:** Set up test database with known state

**Implementation:**
- Seed scripts for integration tests
- Reset database between test suites
- Use transactions for isolation

### Test Isolation

**Principles:**
- Each test should be independent
- Tests should not depend on execution order
- Clean up after each test
- Use transactions for database tests

---

## Mocking Strategy

### When to Mock

1. **External Services**
   - Email service
   - Payment gateways
   - Third-party APIs

2. **Slow Operations**
   - File I/O
   - Network requests
   - Database operations (in unit tests)

3. **Unpredictable Behavior**
   - Random number generation
   - Current time/date
   - UUID generation

### Mocking Tools

- **Jest:** Built-in mocking
- **Sinon:** Advanced mocking (if needed)
- **Nock:** HTTP request mocking

### Mock Examples

```typescript
// Mock repository
const mockRepository = {
  findById: jest.fn(),
  save: jest.fn(),
  delete: jest.fn()
};

// Mock external service
jest.mock('@services/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));
```

---

## Test Coverage

### Coverage Metrics

- **Line Coverage:** Percentage of lines executed
- **Branch Coverage:** Percentage of branches executed
- **Function Coverage:** Percentage of functions called
- **Statement Coverage:** Percentage of statements executed

### Coverage Targets

- **Unit Tests:** 90%+ coverage
- **Integration Tests:** 80%+ coverage
- **Overall:** 80%+ coverage

### Coverage Tools

- **Jest:** Built-in coverage
- **Istanbul:** Coverage reporting
- **SonarQube:** Coverage analysis

### Coverage Exclusions

- Test files
- Configuration files
- Migration files
- Generated code

---

## Performance Testing

### Load Testing

**Purpose:** Test system under load

**Tools:**
- k6
- Apache JMeter
- Locust

**Scenarios:**
- Normal load
- Peak load
- Stress testing
- Spike testing

### Performance Benchmarks

- **API Response Time:** < 200ms (p95)
- **Database Query Time:** < 50ms (p95)
- **Page Load Time:** < 2s

---

## Test Execution

### Local Development

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run E2E tests only
npm run test:e2e

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
- name: Run Tests
  run: |
    npm run test:unit
    npm run test:integration
    npm run test:e2e
    npm run test:coverage
```

### Test Reports

- **Jest:** HTML coverage reports
- **JUnit:** XML reports for CI
- **Allure:** Advanced test reporting

---

## Test Maintenance

### Best Practices

1. **Keep Tests Simple**
   - One assertion per test (when possible)
   - Clear test names
   - Avoid test interdependencies

2. **Maintain Test Data**
   - Update fixtures when models change
   - Keep test data realistic
   - Document test data purpose

3. **Refactor Tests**
   - Remove duplicate code
   - Extract common setup
   - Use test utilities

4. **Review Test Failures**
   - Investigate flaky tests
   - Fix broken tests immediately
   - Update tests when requirements change

---

## Test Checklist

### Before Committing

- [ ] All tests pass locally
- [ ] New code has tests
- [ ] Coverage meets targets
- [ ] Tests are fast (< 5 minutes total)
- [ ] No flaky tests

### Before Release

- [ ] All tests pass in CI
- [ ] E2E tests pass
- [ ] Performance tests pass
- [ ] Coverage report reviewed
- [ ] Test documentation updated

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

