/**
 * Firestore Security Rules Tests
 * 
 * Tests for Firestore security rules using Firebase Emulator.
 * 
 * Run with: npm run test:firestore:rules
 * 
 * Prerequisites:
 * - Firebase emulator must be running: npm run firebase:emulators
 */

import * as firebase from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize test environment
const projectId = 'patacao-test';
const rules = readFileSync(join(__dirname, '../firestore.rules'), 'utf8');

// Note: Helper functions removed - using direct test environment setup in beforeAll

describe('Firestore Security Rules', () => {
  let testEnv: firebase.RulesTestEnvironment;
  let unauthenticatedDb: ReturnType<ReturnType<firebase.RulesTestEnvironment['unauthenticatedContext']>['firestore']>;
  let ownerDb: ReturnType<ReturnType<firebase.RulesTestEnvironment['authenticatedContext']>['firestore']>;
  let managerDb: ReturnType<ReturnType<firebase.RulesTestEnvironment['authenticatedContext']>['firestore']>;
  let staffDb: ReturnType<ReturnType<firebase.RulesTestEnvironment['authenticatedContext']>['firestore']>;
  let accountantDb: ReturnType<ReturnType<firebase.RulesTestEnvironment['authenticatedContext']>['firestore']>;

  beforeAll(async () => {
    testEnv = await firebase.initializeTestEnvironment({
      projectId,
      firestore: {
        rules,
      },
    });

    // Create authenticated contexts with different roles
    // Note: Custom claims (roles) are passed directly as token options
    unauthenticatedDb = testEnv.unauthenticatedContext().firestore();
    
    const ownerContext = testEnv.authenticatedContext('owner-user', {
      roles: { Owner: true },
    });
    ownerDb = ownerContext.firestore();
    
    const managerContext = testEnv.authenticatedContext('manager-user', {
      roles: { Manager: true },
    });
    managerDb = managerContext.firestore();
    
    const staffContext = testEnv.authenticatedContext('staff-user', {
      roles: { Staff: true },
    });
    staffDb = staffContext.firestore();
    
    const accountantContext = testEnv.authenticatedContext('accountant-user', {
      roles: { Accountant: true },
    });
    accountantDb = accountantContext.firestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    // Clear all data before each test
    await testEnv.clearFirestore();
  });

  describe('Companies Collection', () => {
    const companyId = 'company-123';
    const companyData = {
      id: companyId,
      name: 'Test Company',
      nif: '123456789',
      address: {
        street: 'Test Street',
        city: 'Lisboa',
        postalCode: '1000-001',
      },
      taxRegime: 'normal',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should deny unauthenticated access', async () => {
      await firebase.assertFails(
        unauthenticatedDb.collection('companies').doc(companyId).get()
      );
    });

    it('should allow authenticated users to read', async () => {
      await firebase.assertSucceeds(
        staffDb.collection('companies').doc(companyId).get()
      );
    });

    it('should only allow Owner to create', async () => {
      await firebase.assertSucceeds(
        ownerDb.collection('companies').doc(companyId).set(companyData)
      );
      await firebase.assertFails(
        managerDb.collection('companies').doc(companyId).set(companyData)
      );
      await firebase.assertFails(
        staffDb.collection('companies').doc(companyId).set(companyData)
      );
    });

    it('should only allow Owner to update', async () => {
      await ownerDb.collection('companies').doc(companyId).set(companyData);
      
      await firebase.assertSucceeds(
        ownerDb.collection('companies').doc(companyId).update({ name: 'Updated Name' })
      );
      await firebase.assertFails(
        managerDb.collection('companies').doc(companyId).update({ name: 'Updated Name' })
      );
    });

    it('should deny deletion', async () => {
      await ownerDb.collection('companies').doc(companyId).set(companyData);
      
      await firebase.assertFails(
        ownerDb.collection('companies').doc(companyId).delete()
      );
    });
  });

  describe('Users Collection', () => {
    const userId = 'user-123';
    const userData = {
      id: userId,
      email: 'test@example.com',
      fullName: 'Test User',
      roleIds: ['Staff'],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should deny unauthenticated access', async () => {
      await firebase.assertFails(
        unauthenticatedDb.collection('users').doc(userId).get()
      );
    });

    it('should allow Owner/Manager to read any user', async () => {
      await ownerDb.collection('users').doc(userId).set(userData);
      
      await firebase.assertSucceeds(
        ownerDb.collection('users').doc(userId).get()
      );
      await firebase.assertSucceeds(
        managerDb.collection('users').doc(userId).get()
      );
    });

    it('should allow users to read their own data', async () => {
      const selfContext = testEnv.authenticatedContext('user-123', {
        roles: { Staff: true },
      });
      const selfDb = selfContext.firestore();
      
      await ownerDb.collection('users').doc('user-123').set(userData);
      
      await firebase.assertSucceeds(
        selfDb.collection('users').doc('user-123').get()
      );
    });

    it('should deny Staff from reading other users', async () => {
      await ownerDb.collection('users').doc(userId).set(userData);
      
      await firebase.assertFails(
        staffDb.collection('users').doc(userId).get()
      );
    });

    it('should only allow Owner/Manager to create users', async () => {
      await firebase.assertSucceeds(
        ownerDb.collection('users').doc(userId).set(userData)
      );
      await firebase.assertSucceeds(
        managerDb.collection('users').doc(userId).set(userData)
      );
      await firebase.assertFails(
        staffDb.collection('users').doc(userId).set(userData)
      );
    });

    it('should allow users to update their own data (but not roles)', async () => {
      const selfContext = testEnv.authenticatedContext('user-123', {
        roles: { Staff: true },
      });
      const selfDb = selfContext.firestore();
      
      await ownerDb.collection('users').doc('user-123').set(userData);
      
      // Can update own name
      await firebase.assertSucceeds(
        selfDb.collection('users').doc('user-123').update({ fullName: 'New Name' })
      );
      
      // Cannot update own roles
      await firebase.assertFails(
        selfDb.collection('users').doc('user-123').update({ roleIds: ['Manager'] })
      );
    });
  });

  describe('Customers Collection', () => {
    const customerId = 'customer-123';
    const customerData = {
      id: customerId,
      fullName: 'Test Customer',
      email: 'customer@example.com',
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should deny unauthenticated access', async () => {
      await firebase.assertFails(
        unauthenticatedDb.collection('customers').doc(customerId).get()
      );
    });

    it('should allow authenticated users to read', async () => {
      await staffDb.collection('customers').doc(customerId).set(customerData);
      
      await firebase.assertSucceeds(
        staffDb.collection('customers').doc(customerId).get()
      );
    });

    it('should allow Staff to create', async () => {
      await firebase.assertSucceeds(
        staffDb.collection('customers').doc(customerId).set(customerData)
      );
    });

    it('should only allow Manager to delete', async () => {
      await staffDb.collection('customers').doc(customerId).set(customerData);
      
      await firebase.assertSucceeds(
        managerDb.collection('customers').doc(customerId).delete()
      );
      await firebase.assertFails(
        staffDb.collection('customers').doc(customerId).delete()
      );
    });
  });

  describe('Invoices Collection', () => {
    const invoiceId = 'invoice-123';
    const draftInvoice = {
      id: invoiceId,
      companyId: 'company-123',
      storeId: 'store-123',
      invoiceNumber: 'INV-001',
      status: 'draft',
      subtotal: 100,
      vatTotal: 23,
      total: 123,
      lines: [],
      createdBy: 'staff-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const issuedInvoice = {
      ...draftInvoice,
      status: 'issued',
      issuedAt: new Date(),
    };

    it('should allow Staff to create draft invoices', async () => {
      await firebase.assertSucceeds(
        staffDb.collection('invoices').doc(invoiceId).set(draftInvoice)
      );
    });

    it('should allow Staff to update draft invoices', async () => {
      await staffDb.collection('invoices').doc(invoiceId).set(draftInvoice);
      
      await firebase.assertSucceeds(
        staffDb.collection('invoices').doc(invoiceId).update({ subtotal: 200 })
      );
    });

    it('should deny Staff from updating issued invoices', async () => {
      await managerDb.collection('invoices').doc(invoiceId).set(issuedInvoice);
      
      await firebase.assertFails(
        staffDb.collection('invoices').doc(invoiceId).update({ status: 'paid' })
      );
    });

    it('should allow Manager to issue invoices', async () => {
      await staffDb.collection('invoices').doc(invoiceId).set(draftInvoice);
      
      await firebase.assertSucceeds(
        managerDb.collection('invoices').doc(invoiceId).update({ 
          status: 'issued',
          issuedAt: new Date(),
        })
      );
    });

    it('should deny deletion of invoices', async () => {
      await staffDb.collection('invoices').doc(invoiceId).set(draftInvoice);
      
      await firebase.assertFails(
        ownerDb.collection('invoices').doc(invoiceId).delete()
      );
    });
  });

  describe('Stock Movements Collection (Immutable)', () => {
    const movementId = 'movement-123';
    const movementData = {
      id: movementId,
      productId: 'product-123',
      movementType: 'receipt',
      quantity: 10,
      createdBy: 'staff-user',
      createdAt: new Date(),
    };

    it('should allow Staff to create', async () => {
      await firebase.assertSucceeds(
        staffDb.collection('stock_movements').doc(movementId).set(movementData)
      );
    });

    it('should deny updates (immutable)', async () => {
      await staffDb.collection('stock_movements').doc(movementId).set(movementData);
      
      await firebase.assertFails(
        staffDb.collection('stock_movements').doc(movementId).update({ quantity: 20 })
      );
    });

    it('should deny deletion (immutable)', async () => {
      await staffDb.collection('stock_movements').doc(movementId).set(movementData);
      
      await firebase.assertFails(
        ownerDb.collection('stock_movements').doc(movementId).delete()
      );
    });
  });

  describe('Audit Logs Collection (Immutable)', () => {
    const logId = 'log-123';
    const logData = {
      id: logId,
      entityType: 'user',
      entityId: 'user-123',
      action: 'create',
      userId: 'staff-user',
      createdAt: new Date(),
    };

    it('should allow creation (system can create)', async () => {
      await firebase.assertSucceeds(
        staffDb.collection('audit_logs').doc(logId).set(logData)
      );
    });

    it('should deny updates (immutable)', async () => {
      await staffDb.collection('audit_logs').doc(logId).set(logData);
      
      await firebase.assertFails(
        ownerDb.collection('audit_logs').doc(logId).update({ action: 'update' })
      );
    });

    it('should deny deletion (immutable)', async () => {
      await staffDb.collection('audit_logs').doc(logId).set(logData);
      
      await firebase.assertFails(
        ownerDb.collection('audit_logs').doc(logId).delete()
      );
    });
  });

  describe('Password Reset Tokens Collection (Server-side only)', () => {
    const tokenId = 'token-123';
    const tokenData = {
      id: tokenId,
      userId: 'user-123',
      tokenHash: 'hashed-token',
      expiresAt: new Date(),
      used: false,
      createdAt: new Date(),
    };

    it('should deny all read access', async () => {
      await firebase.assertFails(
        ownerDb.collection('password_reset_tokens').doc(tokenId).get()
      );
    });

    it('should deny all write access', async () => {
      await firebase.assertFails(
        ownerDb.collection('password_reset_tokens').doc(tokenId).set(tokenData)
      );
    });
  });

  describe('Financial Exports Collection', () => {
    const exportId = 'export-123';
    const exportData = {
      id: exportId,
      exportType: 'invoice',
      format: 'csv',
      periodStart: new Date(),
      periodEnd: new Date(),
      status: 'pending',
      createdBy: 'accountant-user',
      createdAt: new Date(),
    };

    it('should deny Staff from reading', async () => {
      await accountantDb.collection('financial_exports').doc(exportId).set(exportData);
      
      await firebase.assertFails(
        staffDb.collection('financial_exports').doc(exportId).get()
      );
    });

    it('should allow Accountant to read', async () => {
      await accountantDb.collection('financial_exports').doc(exportId).set(exportData);
      
      await firebase.assertSucceeds(
        accountantDb.collection('financial_exports').doc(exportId).get()
      );
    });

    it('should allow Owner to read', async () => {
      await accountantDb.collection('financial_exports').doc(exportId).set(exportData);
      
      await firebase.assertSucceeds(
        ownerDb.collection('financial_exports').doc(exportId).get()
      );
    });
  });
});

