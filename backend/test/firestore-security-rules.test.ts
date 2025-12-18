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
  let veterinarianDb: ReturnType<ReturnType<firebase.RulesTestEnvironment['authenticatedContext']>['firestore']>;
  let staffWithStoreDb: ReturnType<ReturnType<firebase.RulesTestEnvironment['authenticatedContext']>['firestore']>;

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
    
    const veterinarianContext = testEnv.authenticatedContext('veterinarian-user', {
      roles: { Veterinarian: true },
    });
    veterinarianDb = veterinarianContext.firestore();
    
    // Staff user with store assignment
    const staffWithStoreContext = testEnv.authenticatedContext('staff-store-user', {
      roles: { Staff: true },
      storeIds: { 'store-123': true },
    });
    staffWithStoreDb = staffWithStoreContext.firestore();
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

    it('should allow Owner/Manager/Accountant to read', async () => {
      await ownerDb.collection('companies').doc(companyId).set(companyData);
      
      await firebase.assertSucceeds(
        ownerDb.collection('companies').doc(companyId).get()
      );
      await firebase.assertSucceeds(
        managerDb.collection('companies').doc(companyId).get()
      );
      await firebase.assertSucceeds(
        accountantDb.collection('companies').doc(companyId).get()
      );
    });

    it('should deny Staff from reading companies', async () => {
      await ownerDb.collection('companies').doc(companyId).set(companyData);
      
      await firebase.assertFails(
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

  describe('Roles Collection', () => {
    const roleId = 'Owner';
    const roleData = {
      id: roleId,
      name: 'Owner',
      permissions: ['*:*'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should deny unauthenticated access', async () => {
      await firebase.assertFails(
        unauthenticatedDb.collection('roles').doc(roleId).get()
      );
    });

    it('should deny Staff from reading', async () => {
      await firebase.assertFails(
        staffDb.collection('roles').doc(roleId).get()
      );
    });

    it('should allow Owner/Manager to read', async () => {
      await ownerDb.collection('roles').doc(roleId).set(roleData);
      
      await firebase.assertSucceeds(
        ownerDb.collection('roles').doc(roleId).get()
      );
      await firebase.assertSucceeds(
        managerDb.collection('roles').doc(roleId).get()
      );
    });

    it('should only allow Owner to create', async () => {
      await firebase.assertSucceeds(
        ownerDb.collection('roles').doc(roleId).set(roleData)
      );
      await firebase.assertFails(
        managerDb.collection('roles').doc(roleId).set(roleData)
      );
    });

    it('should deny deletion', async () => {
      await ownerDb.collection('roles').doc(roleId).set(roleData);
      
      await firebase.assertFails(
        ownerDb.collection('roles').doc(roleId).delete()
      );
    });
  });

  describe('Service Packages Collection', () => {
    const packageId = 'package-123';
    const packageData = {
      id: packageId,
      name: 'Grooming Package',
      description: 'Full grooming service',
      services: [{ serviceId: 'service-1', quantity: 1 }],
      bundlePrice: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should allow Staff to read', async () => {
      await managerDb.collection('service_packages').doc(packageId).set(packageData);
      
      await firebase.assertSucceeds(
        staffDb.collection('service_packages').doc(packageId).get()
      );
    });

    it('should only allow Manager to create', async () => {
      await firebase.assertSucceeds(
        managerDb.collection('service_packages').doc(packageId).set(packageData)
      );
      await firebase.assertFails(
        staffDb.collection('service_packages').doc(packageId).set(packageData)
      );
    });
  });

  describe('Inventory Locations Collection', () => {
    const locationId = 'location-123';
    const locationData = {
      id: locationId,
      storeId: 'store-123',
      name: 'Main Storage',
      description: 'Primary storage area',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should allow Staff with store access to read', async () => {
      await managerDb.collection('inventory_locations').doc(locationId).set(locationData);
      
      await firebase.assertSucceeds(
        staffWithStoreDb.collection('inventory_locations').doc(locationId).get()
      );
    });

    it('should deny Staff without store access', async () => {
      await managerDb.collection('inventory_locations').doc(locationId).set(locationData);
      
      await firebase.assertFails(
        staffDb.collection('inventory_locations').doc(locationId).get()
      );
    });
  });

  describe('Veterinarian Role Access', () => {
    const petId = 'pet-123';
    const petData = {
      id: petId,
      customerId: 'customer-123',
      name: 'Fluffy',
      species: 'dog',
      breed: 'Golden Retriever',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should allow Veterinarian to read pets', async () => {
      await staffDb.collection('pets').doc(petId).set(petData);
      
      await firebase.assertSucceeds(
        veterinarianDb.collection('pets').doc(petId).get()
      );
    });

    it('should allow Veterinarian to create pets', async () => {
      await firebase.assertSucceeds(
        veterinarianDb.collection('pets').doc(petId).set(petData)
      );
    });

    it('should allow Veterinarian to update pets', async () => {
      await staffDb.collection('pets').doc(petId).set(petData);
      
      await firebase.assertSucceeds(
        veterinarianDb.collection('pets').doc(petId).update({ breed: 'Labrador' })
      );
    });

    it('should allow Veterinarian to read appointments', async () => {
      const appointmentId = 'appointment-123';
      const appointmentData = {
        id: appointmentId,
        storeId: 'store-123',
        customerId: 'customer-123',
        petId: petId,
        startAt: new Date(),
        endAt: new Date(),
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await staffDb.collection('appointments').doc(appointmentId).set(appointmentData);
      
      await firebase.assertSucceeds(
        veterinarianDb.collection('appointments').doc(appointmentId).get()
      );
    });
  });

  describe('Store-Scoped Access for Staff', () => {
    const storeId = 'store-123';
    const invoiceId = 'invoice-123';
    const invoiceData = {
      id: invoiceId,
      companyId: 'company-123',
      storeId: storeId,
      invoiceNumber: 'INV-001',
      status: 'draft',
      subtotal: 100,
      vatTotal: 23,
      total: 123,
      lines: [],
      createdBy: 'staff-store-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should allow Staff with store access to read invoices', async () => {
      await staffDb.collection('invoices').doc(invoiceId).set(invoiceData);
      
      await firebase.assertSucceeds(
        staffWithStoreDb.collection('invoices').doc(invoiceId).get()
      );
    });

    it('should allow Staff to read invoices (store check is in application layer)', async () => {
      await staffDb.collection('invoices').doc(invoiceId).set(invoiceData);
      
      // Note: Firestore rules allow Staff to read, but application layer enforces store scoping
      // This is because Firestore rules can't efficiently check storeIds array in token
      await firebase.assertSucceeds(
        staffDb.collection('invoices').doc(invoiceId).get()
      );
    });

    it('should allow Staff with store access to read transactions', async () => {
      const transactionId = 'transaction-123';
      const transactionData = {
        id: transactionId,
        storeId: storeId,
        transactionNumber: 'TXN-001',
        status: 'pending',
        subtotal: 100,
        vatTotal: 23,
        total: 123,
        lines: [],
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        createdBy: 'staff-store-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await staffDb.collection('transactions').doc(transactionId).set(transactionData);
      
      await firebase.assertSucceeds(
        staffWithStoreDb.collection('transactions').doc(transactionId).get()
      );
    });
  });

  describe('Credit Notes Collection', () => {
    const creditNoteId = 'credit-note-123';
    const creditNoteData = {
      id: creditNoteId,
      invoiceId: 'invoice-123',
      creditNoteNumber: 'CN-001',
      amount: 50,
      reason: 'Return',
      issuedAt: new Date(),
      createdBy: 'accountant-user',
      createdAt: new Date(),
    };

    it('should deny Staff from reading', async () => {
      await accountantDb.collection('credit_notes').doc(creditNoteId).set(creditNoteData);
      
      await firebase.assertFails(
        staffDb.collection('credit_notes').doc(creditNoteId).get()
      );
    });

    it('should allow Manager/Accountant to read', async () => {
      await accountantDb.collection('credit_notes').doc(creditNoteId).set(creditNoteData);
      
      await firebase.assertSucceeds(
        managerDb.collection('credit_notes').doc(creditNoteId).get()
      );
      await firebase.assertSucceeds(
        accountantDb.collection('credit_notes').doc(creditNoteId).get()
      );
    });

    it('should allow Manager/Accountant to create', async () => {
      await firebase.assertSucceeds(
        managerDb.collection('credit_notes').doc(creditNoteId).set(creditNoteData)
      );
      await firebase.assertSucceeds(
        accountantDb.collection('credit_notes').doc(creditNoteId).set(creditNoteData)
      );
    });

    it('should deny updates (immutable)', async () => {
      await accountantDb.collection('credit_notes').doc(creditNoteId).set(creditNoteData);
      
      await firebase.assertFails(
        accountantDb.collection('credit_notes').doc(creditNoteId).update({ amount: 100 })
      );
    });
  });

  describe('Accountant Role - Invoice Operations', () => {
    const invoiceId = 'invoice-accountant-123';
    const draftInvoice = {
      id: invoiceId,
      companyId: 'company-123',
      storeId: 'store-123',
      invoiceNumber: 'INV-002',
      status: 'draft',
      subtotal: 100,
      vatTotal: 23,
      total: 123,
      lines: [],
      createdBy: 'accountant-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should allow Accountant to create invoices', async () => {
      await firebase.assertSucceeds(
        accountantDb.collection('invoices').doc(invoiceId).set(draftInvoice)
      );
    });

    it('should allow Accountant to issue invoices', async () => {
      await accountantDb.collection('invoices').doc(invoiceId).set(draftInvoice);
      
      await firebase.assertSucceeds(
        accountantDb.collection('invoices').doc(invoiceId).update({
          status: 'issued',
          issuedAt: new Date(),
        })
      );
    });

    it('should allow Accountant to void invoices', async () => {
      const issuedInvoice = {
        ...draftInvoice,
        status: 'issued',
        issuedAt: new Date(),
      };
      await accountantDb.collection('invoices').doc(invoiceId).set(issuedInvoice);
      
      await firebase.assertSucceeds(
        accountantDb.collection('invoices').doc(invoiceId).update({ status: 'void' })
      );
    });
  });
});

