# Firestore Security Rules Documentation

## Overview

This document describes the Firestore security rules implementation for the Patacão Petshop Management System. The rules implement role-based access control (RBAC) with five primary roles: Owner, Manager, Staff, Accountant, and Veterinarian.

## Table of Contents

1. [Role Hierarchy](#role-hierarchy)
2. [Helper Functions](#helper-functions)
3. [Collection Rules](#collection-rules)
4. [Store-Scoped Access](#store-scoped-access)
5. [Security Patterns](#security-patterns)
6. [Testing](#testing)
7. [Best Practices](#best-practices)

---

## Role Hierarchy

The system defines five roles with the following hierarchy and permissions:

### Role Definitions

1. **Owner** - Full system access, fiscal operations, user management, system configuration
2. **Manager** - Operational management, staff supervision, most administrative and financial operations
3. **Staff** - Day-to-day operations, customer service, appointment management, basic transactions
4. **Accountant** - Financial operations, reporting, audit access, invoice management
5. **Veterinarian** - Medical services, pet care, appointment completion, medical notes

### Role Inheritance

Roles inherit permissions from lower roles in the hierarchy:
- `isManager()` includes Owner permissions
- `isStaff()` includes Manager permissions
- `isVeterinarian()` includes Manager permissions
- `isAccountant()` includes Owner permissions (for financial operations)

---

## Helper Functions

### Authentication Functions

```javascript
// Check if user is authenticated
function isAuthenticated() {
  return request.auth != null;
}

// Check if user has specific role
function hasRole(role) {
  return isAuthenticated() && 
         request.auth.token.roles != null && 
         role in request.auth.token.roles;
}
```

### Role Hierarchy Functions

```javascript
function isOwner() {
  return hasRole('Owner');
}

function isManager() {
  return hasRole('Manager') || isOwner();
}

function isStaff() {
  return hasRole('Staff') || isManager();
}

function isAccountant() {
  return hasRole('Accountant') || isOwner();
}

function isVeterinarian() {
  return hasRole('Veterinarian') || isManager();
}

function isOwnerOrManager() {
  return isOwner() || hasRole('Manager');
}
```

### Access Control Functions

```javascript
// Check if user is accessing their own data
function isSelf(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}

// Check if Staff user has access to a specific store
function hasStoreAccess(storeId) {
  return isOwner() || 
         isManager() || 
         (hasRole('Staff') && 
          request.auth.token.storeIds != null && 
          storeId in request.auth.token.storeIds);
}

// Check if user can access store-scoped resources
function canAccessStoreResource(storeId) {
  return isOwner() || 
         isManager() || 
         isAccountant() || 
         hasStoreAccess(storeId);
}
```

---

## Collection Rules

### Administrative Module

#### Companies
- **Read**: Owner, Manager, Accountant
- **Create**: Owner only
- **Update**: Owner only (including fiscal fields)
- **Delete**: Denied (companies should not be deleted)

#### Stores
- **Read**: Owner, Manager, Accountant, Staff (assigned stores only)
- **Create**: Owner, Manager
- **Update**: Owner, Manager
- **Delete**: Owner only

#### Customers
- **Read**: Staff, Accountant, Veterinarian
- **Create**: Staff
- **Update**: Staff
- **Delete**: Manager (soft delete preferred)

#### Pets
- **Read**: Staff, Veterinarian
- **Create**: Staff, Veterinarian
- **Update**: Staff, Veterinarian
- **Delete**: Manager (only Manager/Owner can delete)

### Users & Access Control Module

#### Users
- **Read**: Owner, Manager, Accountant, Self
- **Create**: Owner, Manager
- **Update**: Owner/Manager (full access) or Self (restricted - cannot change roles or active status)
- **Delete**: Denied (users should be archived, not deleted)

#### Roles
- **Read**: Owner, Manager, Accountant
- **Create**: Owner only
- **Update**: Owner only
- **Delete**: Denied (roles are system-defined)

#### Sessions
- **Read**: Owner, Manager, or Self
- **Create**: Any authenticated user
- **Update**: Owner, Manager, or Self
- **Delete**: Owner, Manager, or Self

#### Password Reset Tokens
- **All operations**: Denied (server-side only)

### Services Module

#### Services
- **Read**: Staff, Veterinarian
- **Create**: Manager
- **Update**: Manager
- **Delete**: Owner

#### Service Packages
- **Read**: Staff
- **Create**: Manager
- **Update**: Manager
- **Delete**: Owner

#### Appointments
- **Read**: Staff, Veterinarian
- **Create**: Staff
- **Update**: Staff (for assigned stores) or Manager/Owner
- **Delete**: Denied (appointments should be cancelled, not deleted)

#### Appointment Service Lines
- **Read**: Staff, Veterinarian
- **Create**: Staff
- **Update**: Staff
- **Delete**: Staff

### Inventory Module

#### Products
- **Read**: Staff, Accountant
- **Create**: Manager
- **Update**: Manager
- **Delete**: Owner (safe delete only)

#### Product Stock
- **Read**: Staff, Accountant
- **Write**: Staff (updates via stock movements)

#### Stock Movements
- **Read**: Staff, Accountant
- **Create**: Staff
- **Update**: Denied (immutable audit log)
- **Delete**: Denied (immutable audit log)

#### Stock Batches
- **Read**: Staff, Accountant
- **Create**: Staff
- **Update**: Staff
- **Delete**: Manager

#### Inventory Reservations
- **Read**: Staff
- **Create**: Staff
- **Update**: Staff
- **Delete**: Staff

#### Suppliers
- **Read**: Staff, Accountant
- **Create**: Manager
- **Update**: Manager
- **Delete**: Owner

#### Purchase Orders
- **Read**: Manager
- **Create**: Manager
- **Update**: Manager
- **Delete**: Owner

### Financial Module

#### Invoices
- **Read**: Staff (assigned stores), Accountant
- **Create**: Staff, Accountant
- **Update**: 
  - Staff: Only draft invoices, or mark issued invoices as paid
  - Manager/Accountant: Can issue, mark paid, or void
- **Delete**: Denied (invoices should be voided, not deleted)

#### Invoice Number Counters
- **All operations**: Denied (server-side only)

#### Transactions
- **Read**: Staff (assigned stores), Accountant
- **Create**: Staff
- **Update**: Staff (only pending transactions)
- **Delete**: Denied (transactions should not be deleted)

#### Credit Notes
- **Read**: Manager, Accountant
- **Create**: Manager, Accountant
- **Update**: Denied (immutable)
- **Delete**: Denied (credit notes should not be deleted)

#### Financial Exports
- **Read**: Accountant, Owner
- **Create**: Accountant, Owner
- **Update**: Accountant, Owner
- **Delete**: Owner

### Audit & Operational Module

#### Audit Logs
- **Read**: Owner, Manager, Accountant
- **Create**: System (any authenticated user)
- **Update**: Denied (immutable)
- **Delete**: Denied (immutable)

---

## Store-Scoped Access

Staff users are assigned to specific stores via the `storeIds` array in their Firebase auth token custom claims. The `hasStoreAccess()` function checks if a Staff user has access to a specific store.

### Implementation

```javascript
function hasStoreAccess(storeId) {
  return isOwner() || 
         isManager() || 
         (hasRole('Staff') && 
          request.auth.token.storeIds != null && 
          storeId in request.auth.token.storeIds);
}
```

### Usage

Store-scoped access is enforced for:
- Store resources (stores, inventory_locations)
- Store-scoped financial data (invoices, transactions)
- Store-scoped appointments

**Note**: Some store-scoped checks may be enforced at the application layer for performance reasons, as Firestore rules have limitations on complex queries.

---

## Security Patterns

### Pattern 1: Immutable Collections

Collections that should never be updated or deleted:

```javascript
match /audit_logs/{logId} {
  allow read: if isAuthenticated() && (isOwnerOrManager() || isAccountant());
  allow create: if true; // System can create
  allow update: if false; // Immutable
  allow delete: if false; // Immutable
}
```

**Examples**: `audit_logs`, `stock_movements`, `credit_notes`

### Pattern 2: Server-Side Only Collections

Collections that should only be accessed server-side:

```javascript
match /password_reset_tokens/{tokenId} {
  allow read: if false;
  allow write: if false;
}
```

**Examples**: `password_reset_tokens`, `invoice_number_counters`

### Pattern 3: Status-Based Updates

Collections where updates depend on document status:

```javascript
match /invoices/{invoiceId} {
  allow update: if (resource != null && isStaff() && resource.data.status == 'draft') ||
                 (resource != null && isManager() && request.resource.data.status in ['issued', 'paid', 'void']);
}
```

**Examples**: `invoices`, `transactions`, `appointments`

### Pattern 4: Self-Access with Restrictions

Users can update their own data with field restrictions:

```javascript
match /users/{userId} {
  allow update: if isOwnerOrManager() || 
                   (isSelf(userId) && 
                    !request.resource.data.diff(resource.data).affectedKeys().hasAny(['roleIds', 'active']));
}
```

### Pattern 5: Role Hierarchy

Using role hierarchy to simplify rules:

```javascript
function isStaff() {
  return hasRole('Staff') || isManager(); // Manager inherits Staff permissions
}
```

---

## Testing

### Running Tests

```bash
# Start Firebase emulator
npm run firebase:emulators

# In another terminal, run tests
npm run test:firestore:rules
```

### Test Structure

Tests are organized by collection and cover:
- Unauthenticated access (should fail)
- Role-based access (should succeed/fail based on role)
- Self-access scenarios
- Store-scoped access
- Immutable collections
- Status-based updates

### Example Test

```typescript
describe('Invoices Collection', () => {
  it('should allow Staff to create draft invoices', async () => {
    await firebase.assertSucceeds(
      staffDb.collection('invoices').doc(invoiceId).set(draftInvoice)
    );
  });

  it('should deny Staff from updating issued invoices', async () => {
    await managerDb.collection('invoices').doc(invoiceId).set(issuedInvoice);
    
    await firebase.assertFails(
      staffDb.collection('invoices').doc(invoiceId).update({ status: 'paid' })
    );
  });
});
```

---

## Best Practices

### 1. Always Check Authentication First

```javascript
// Good
allow read: if isAuthenticated() && hasRole('Staff');

// Bad
allow read: if hasRole('Staff'); // May fail if not authenticated
```

### 2. Check Resource Existence for Updates

```javascript
// Good
allow update: if resource != null && resource.data.status == 'draft';

// Bad
allow update: if resource.data.status == 'draft'; // Fails on create
```

### 3. Use Helper Functions

Helper functions improve readability and maintainability:

```javascript
// Good
allow read: if isOwnerOrManager();

// Bad
allow read: if hasRole('Owner') || hasRole('Manager');
```

### 4. Deny by Default

Always have a catch-all rule that denies access:

```javascript
match /{document=**} {
  allow read, write: if false;
}
```

### 5. Document Complex Rules

Add comments for complex business logic:

```javascript
// Staff can only update draft invoices
// Managers/Accountants can issue, mark paid, or void
allow update: if (resource != null && isStaff() && resource.data.status == 'draft') ||
               (resource != null && isManager() && request.resource.data.status in ['issued', 'paid', 'void']);
```

### 6. Test All Scenarios

Ensure tests cover:
- All roles
- Unauthenticated access
- Self-access
- Store-scoped access
- Status-based updates
- Immutable collections

### 7. Keep Rules Simple

Complex logic should be in the application layer. Firestore rules should be:
- Fast (evaluated on every request)
- Simple (easy to understand and maintain)
- Secure (fail-safe by default)

---

## Common Issues and Solutions

### Issue 1: "Permission denied" when it should succeed

**Possible causes**:
1. Custom claims not set correctly
2. Resource doesn't exist when checking `resource.data`
3. Role not in token

**Solution**: Check token structure, add `resource != null` checks

### Issue 2: Store-scoped access not working

**Possible causes**:
1. `storeIds` not in token
2. Store ID format mismatch
3. Token not refreshed after store assignment

**Solution**: Verify token structure, ensure token is refreshed after role/store changes

### Issue 3: Tests failing in emulator

**Possible causes**:
1. Emulator not running
2. Rules file not loaded
3. Test data structure mismatch

**Solution**: Ensure emulator is running, verify rules file path, check test data matches schema

---

## Security Considerations

### 1. Token Structure

Roles are stored in Firebase auth token custom claims as:
```javascript
{
  roles: { Owner: true, Manager: true },
  storeIds: { 'store-123': true, 'store-456': true }
}
```

### 2. Token Refresh

Custom claims changes require token refresh. Users must log out and log back in to get updated tokens.

### 3. Performance

Firestore rules are evaluated on every request. Keep rules simple and avoid complex queries.

### 4. Application Layer Validation

Some validations (e.g., complex store-scoped queries) may be enforced at the application layer for performance.

---

## Maintenance

### Adding New Collections

1. Add collection rules to `firestore.rules`
2. Add tests to `test/firestore-security-rules.test.ts`
3. Update this documentation
4. Test with Firebase emulator

### Modifying Rules

1. Update rules in `firestore.rules`
2. Update corresponding tests
3. Test thoroughly with emulator
4. Deploy to staging first
5. Update documentation

### Role Changes

1. Update helper functions if needed
2. Update collection rules
3. Update tests
4. Update documentation

---

## References

- [Firestore Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Rules Unit Testing](https://firebase.google.com/docs/rules/unit-tests)
- [Permissions Matrix](../docs/rbac/permissions-matrix.md)
- [Firestore Schema](./FIRESTORE_SCHEMA.md)

---

**Last Updated**: 2025-01-XX  
**Maintained By**: Development Team

