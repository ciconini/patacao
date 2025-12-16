# Testing Firestore Security Rules

This guide explains how to test Firestore security rules using the Firebase Emulator.

## Quick Start

1. **Install dependencies** (if not already installed):
   ```bash
   npm install --save-dev @firebase/rules-unit-testing
   ```

2. **Start the Firebase Emulator** (in one terminal):
   ```bash
   npm run firebase:emulators
   ```
   
   Keep this running while you run tests.

3. **Run the tests** (in another terminal):
   ```bash
   npm run test:firestore:rules
   ```

## Test Structure

The test suite (`test/firestore-security-rules.test.ts`) includes comprehensive tests for:

- ✅ **Companies**: Owner-only create/update, no deletion
- ✅ **Users**: Role-based access, self-update restrictions
- ✅ **Customers**: Staff can create, Manager can delete
- ✅ **Invoices**: Staff can create drafts, Manager can issue
- ✅ **Stock Movements**: Immutable (create only)
- ✅ **Audit Logs**: Immutable (create only)
- ✅ **Password Reset Tokens**: Server-side only
- ✅ **Financial Exports**: Accountant/Owner only

## How It Works

The tests use `@firebase/rules-unit-testing` to:

1. **Initialize a test environment** with your security rules
2. **Create authenticated contexts** with different roles (Owner, Manager, Staff, Accountant)
3. **Test read/write operations** using `assertSucceeds()` and `assertFails()`
4. **Clean up** after each test to ensure isolation

## Example Test

```typescript
describe('Companies Collection', () => {
  it('should only allow Owner to create', async () => {
    // This should succeed
    await firebase.assertSucceeds(
      ownerDb.collection('companies').doc('company-123').set(companyData)
    );
    
    // This should fail
    await firebase.assertFails(
      managerDb.collection('companies').doc('company-123').set(companyData)
    );
  });
});
```

## Adding New Tests

To add tests for a new collection:

1. Add a new `describe` block in `test/firestore-security-rules.test.ts`
2. Define test data
3. Write test cases using `assertSucceeds()` and `assertFails()`
4. Test different roles and scenarios

Example:
```typescript
describe('My New Collection', () => {
  const docId = 'doc-123';
  const docData = {
    id: docId,
    // ... your document structure
  };

  it('should allow Staff to read', async () => {
    await staffDb.collection('my_collection').doc(docId).set(docData);
    
    await firebase.assertSucceeds(
      staffDb.collection('my_collection').doc(docId).get()
    );
  });

  it('should deny unauthenticated access', async () => {
    await firebase.assertFails(
      unauthenticatedDb.collection('my_collection').doc(docId).get()
    );
  });
});
```

## Troubleshooting

### Error: "Could not reach Cloud Firestore backend"

**Solution**: Make sure the Firebase emulator is running:
```bash
npm run firebase:emulators
```

### Error: "Permission denied" when it should succeed

**Possible causes**:
1. Security rules might be too restrictive
2. Custom claims (roles) might not be set correctly
3. Test data might not match the expected structure

**Check**:
- Review the security rules in `firestore.rules`
- Verify the authenticated context has the correct roles
- Ensure test data matches the document structure

### Tests are slow

**Solutions**:
- The first run is always slower (emulator initialization)
- Use `test.only()` to run a single test during development
- Consider running tests in watch mode (if supported)

### Custom claims not working

**Note**: The Firebase emulator uses a simplified authentication model. Custom claims in the token are accessible via `request.auth.token.roles` in the security rules.

Make sure your test setup matches:
```typescript
const context = testEnv.authenticatedContext('user-id', {
  token: {
    roles: ['Owner'], // This becomes request.auth.token.roles in rules
  },
});
```

## Continuous Integration

To run these tests in CI:

1. Install dependencies
2. Start the Firebase emulator in the background
3. Run the tests
4. Stop the emulator

Example GitHub Actions workflow:
```yaml
- name: Start Firebase Emulator
  run: npm run firebase:emulators &
  
- name: Wait for Emulator
  run: sleep 10
  
- name: Run Security Rules Tests
  run: npm run test:firestore:rules
```

## Resources

- [Firebase Rules Unit Testing Docs](https://firebase.google.com/docs/rules/unit-tests)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

