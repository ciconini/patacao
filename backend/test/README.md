# Firestore Security Rules Testing

This directory contains tests for Firestore security rules using the Firebase Emulator.

## Prerequisites

1. **Install dependencies:**
   ```bash
   npm install --save-dev @firebase/rules-unit-testing
   ```

2. **Start Firebase Emulator:**
   ```bash
   npm run firebase:emulators
   ```
   
   Keep this running in a separate terminal window.

## Running Tests

Run the security rules tests:
```bash
npm run test:firestore:rules
```

## Test Structure

The test file `firestore-security-rules.test.ts` includes tests for:

- **Companies Collection**: Owner-only create/update, no deletion
- **Users Collection**: Role-based access, self-update restrictions
- **Customers Collection**: Staff can create, Manager can delete
- **Invoices Collection**: Staff can create drafts, Manager can issue
- **Stock Movements**: Immutable (create only, no update/delete)
- **Audit Logs**: Immutable (create only, no update/delete)
- **Password Reset Tokens**: Server-side only (no client access)
- **Financial Exports**: Accountant/Owner only

## Writing New Tests

To add tests for a new collection:

```typescript
describe('My Collection', () => {
  const docId = 'doc-123';
  const docData = {
    // ... document data
  };

  it('should allow authenticated users to read', async () => {
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

- Make sure the Firebase emulator is running
- Check that `FIRESTORE_EMULATOR_HOST` is set to `localhost:8080`
- Verify the emulator is accessible at `http://localhost:8080`

### Error: "Permission denied"

- Check that the security rules are correctly deployed to the emulator
- Verify the test is using the correct authentication context
- Review the security rules in `firestore.rules`

### Tests are slow

- The Firebase emulator can be slow for the first run
- Consider running tests in watch mode: `jest --watch`
- Use `test.only()` to run a single test during development

## Resources

- [Firebase Rules Unit Testing Documentation](https://firebase.google.com/docs/rules/unit-tests)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

