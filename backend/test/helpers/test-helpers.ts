/**
 * Test Helpers
 * 
 * Common utilities and helpers for writing tests.
 */

import { Firestore } from 'firebase-admin/firestore';

/**
 * Clears all collections in Firestore (for test cleanup)
 */
export async function clearFirestore(firestore: Firestore): Promise<void> {
  const collections = await firestore.listCollections();
  
  for (const collection of collections) {
    const snapshot = await collection.get();
    const batch = firestore.batch();
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  }
}

/**
 * Creates a test user for use in tests
 */
export function createTestUser(overrides?: Partial<any>) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    fullName: 'Test User',
    passwordHash: 'hashed-password',
    roleIds: ['owner'],
    storeIds: [],
    serviceSkills: [],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a test company for use in tests
 */
export function createTestCompany(overrides?: Partial<any>) {
  return {
    id: 'test-company-id',
    name: 'Test Company',
    nif: '123456789',
    address: {
      street: 'Test Street',
      city: 'Test City',
      postalCode: '1000-000',
      country: 'Portugal',
    },
    taxRegime: 'normal',
    defaultVatRate: 0.23,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Waits for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a mock repository with common methods
 */
export function createMockRepository<T = any>() {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
  } as any;
}

