/**
 * Firebase CRUD Test Script
 * 
 * This script tests Firebase connection by performing actual CRUD operations:
 * 1. Create a test document
 * 2. Read the document
 * 3. Update the document
 * 4. Query documents
 * 5. Delete the document
 * 
 * Usage:
 *   npm run test:firebase:crud
 *   or
 *   ts-node src/cli/test-firebase-crud.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Try to load environment variables (dotenv is optional)
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '../../.env') });
} catch (error) {
  // dotenv not installed, use environment variables from system
  console.log('ℹ️  dotenv not found, using system environment variables\n');
}

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  error?: Error;
  data?: any;
}

const results: TestResult[] = [];

function logResult(test: string, success: boolean, message: string, error?: Error, data?: any) {
  results.push({ test, success, message, error, data });
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${test}: ${message}`);
  if (error) {
    console.log(`   Error: ${error.message}`);
  }
  if (data && success) {
    console.log(`   Data: ${JSON.stringify(data, null, 2)}`);
  }
}

async function initializeFirebase(): Promise<admin.firestore.Firestore> {
  if (admin.apps.length === 0) {
    const useEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';
    const projectId = process.env.FIREBASE_PROJECT_ID || 'patacao';
    const emulatorHost = process.env.FIREBASE_EMULATOR_HOST || 'localhost:8080';

    if (useEmulator) {
      process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
      admin.initializeApp({
        projectId: projectId || 'patacao-dev',
      });
    } else {
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (serviceAccountPath) {
        const pathModule = require('path');
        const resolvedPath = pathModule.isAbsolute(serviceAccountPath)
          ? serviceAccountPath
          : pathModule.join(process.cwd(), serviceAccountPath);
        const serviceAccount = require(resolvedPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: projectId,
        });
      } else if (serviceAccountKey) {
        const serviceAccount = JSON.parse(serviceAccountKey);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: projectId,
        });
      } else {
        try {
          const pathModule = require('path');
          const defaultPath = pathModule.join(process.cwd(), 'config', 'secrets', 'firebase-service-account.json');
          const serviceAccount = require(defaultPath);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: projectId,
          });
        } catch (defaultPathError) {
          admin.initializeApp({
            projectId: projectId,
          });
        }
      }
    }
  }

  return admin.firestore();
}

async function testFirebaseCRUD(): Promise<void> {
  console.log('🔥 Testing Firebase CRUD Operations...\n');

  let db: admin.firestore.Firestore;
  let testDocId: string | null = null;

  try {
    // Initialize Firebase
    console.log('🔧 Initializing Firebase...');
    db = await initializeFirebase();
    logResult('Firebase Initialization', true, 'Firebase initialized successfully');
  } catch (error: any) {
    logResult('Firebase Initialization', false, 'Failed to initialize Firebase', error);
    console.log('\n❌ Cannot proceed with CRUD tests.\n');
    return;
  }

  // Check if using emulator
  const useEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';
  if (!useEmulator) {
    console.log('ℹ️  Note: Testing against production Firebase. Make sure Firestore API is enabled.');
    console.log('   To test locally, use: USE_FIREBASE_EMULATOR=true npm run test:firebase:crud\n');
  }

  const testCollection = db.collection('_test_crud');
  const timestamp = Date.now();
  testDocId = `test-${timestamp}`;

  // Test 1: CREATE - Add a new document
  console.log('\n📝 Test 1: CREATE Operation');
  try {
    const testData = {
      name: 'Test Document',
      description: 'This is a test document for Firebase CRUD operations',
      number: 42,
      boolean: true,
      array: ['item1', 'item2', 'item3'],
      nested: {
        field1: 'value1',
        field2: 'value2',
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await testCollection.doc(testDocId).set(testData);
    logResult('CREATE', true, `Document created with ID: ${testDocId}`, undefined, testData);
  } catch (error: any) {
    logResult('CREATE', false, 'Failed to create document', error);
    if (error.message?.includes('PERMISSION_DENIED') && error.message?.includes('Firestore API')) {
      console.log('\n⚠️  Firestore API needs to be enabled in your Firebase project.');
      console.log('   Visit: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=patacao');
      console.log('   Or test locally with emulator: USE_FIREBASE_EMULATOR=true npm run test:firebase:crud\n');
    } else if (error.code === 5 || error.message?.includes('NOT_FOUND')) {
      console.log('\n⚠️  Firestore database not found. You need to create a Firestore database first.');
      console.log('   Visit: https://console.firebase.google.com/project/patacao/firestore');
      console.log('   Click "Create database" and choose:');
      console.log('   - Mode: Native mode (recommended)');
      console.log('   - Location: Choose a location (e.g., europe-west1 for EU)');
      console.log('   - Security rules: Start in test mode (you can update rules later)\n');
    }
    return;
  }

  // Test 2: READ - Read the document back
  console.log('\n📖 Test 2: READ Operation');
  try {
    const docSnapshot = await testCollection.doc(testDocId).get();

    if (!docSnapshot.exists) {
      logResult('READ', false, 'Document does not exist after creation');
      return;
    }

    const data = docSnapshot.data();
    logResult('READ', true, `Document read successfully`, undefined, {
      id: docSnapshot.id,
      ...data,
    });
  } catch (error: any) {
    logResult('READ', false, 'Failed to read document', error);
  }

  // Test 3: UPDATE - Update the document
  console.log('\n✏️  Test 3: UPDATE Operation');
  try {
    const updateData = {
      name: 'Updated Test Document',
      number: 100,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      newField: 'This is a new field added during update',
    };

    await testCollection.doc(testDocId).update(updateData);
    logResult('UPDATE', true, 'Document updated successfully', undefined, updateData);

    // Read it back to verify
    const updatedDoc = await testCollection.doc(testDocId).get();
    if (updatedDoc.exists) {
      const updatedData = updatedDoc.data();
      logResult('UPDATE Verification', true, 'Verified update by reading document', undefined, {
        id: updatedDoc.id,
        name: updatedData?.name,
        number: updatedData?.number,
        newField: updatedData?.newField,
      });
    }
  } catch (error: any) {
    logResult('UPDATE', false, 'Failed to update document', error);
  }

  // Test 4: QUERY - Query documents
  console.log('\n🔍 Test 4: QUERY Operation');
  try {
    // Query by field
    const querySnapshot = await testCollection
      .where('number', '>=', 50)
      .orderBy('number', 'desc')
      .limit(10)
      .get();

    const documents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    logResult('QUERY', true, `Found ${documents.length} document(s) matching query`, undefined, {
      count: documents.length,
      documents: documents.map((d: any) => ({ id: d.id, name: d.name, number: d.number })),
    });
  } catch (error: any) {
    logResult('QUERY', false, 'Failed to query documents', error);
  }

  // Test 5: BATCH WRITE - Test batch operations
  console.log('\n📦 Test 5: BATCH WRITE Operation');
  try {
    const batch = db.batch();
    const batchDoc1 = testCollection.doc(`batch-test-1-${timestamp}`);
    const batchDoc2 = testCollection.doc(`batch-test-2-${timestamp}`);

    batch.set(batchDoc1, {
      name: 'Batch Document 1',
      type: 'batch',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    batch.set(batchDoc2, {
      name: 'Batch Document 2',
      type: 'batch',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    logResult('BATCH WRITE', true, 'Batch write completed successfully', undefined, {
      documentsCreated: 2,
      documentIds: [batchDoc1.id, batchDoc2.id],
    });

    // Clean up batch documents
    await batchDoc1.delete();
    await batchDoc2.delete();
    logResult('BATCH CLEANUP', true, 'Batch test documents deleted');
  } catch (error: any) {
    logResult('BATCH WRITE', false, 'Failed to perform batch write', error);
  }

  // Test 6: TRANSACTION - Test transaction operations
  console.log('\n💼 Test 6: TRANSACTION Operation');
  try {
    const transactionDoc = testCollection.doc(`transaction-test-${timestamp}`);
    await transactionDoc.set({ counter: 0 });

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(transactionDoc);
      if (!doc.exists) {
        throw new Error('Document does not exist');
      }

      const currentValue = doc.data()?.counter || 0;
      const newValue = currentValue + 1;

      transaction.update(transactionDoc, {
        counter: newValue,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return newValue;
    });

    const finalDoc = await transactionDoc.get();
    const finalData = finalDoc.data();
    logResult('TRANSACTION', true, 'Transaction completed successfully', undefined, {
      finalCounter: finalData?.counter,
    });

    // Clean up transaction document
    await transactionDoc.delete();
    logResult('TRANSACTION CLEANUP', true, 'Transaction test document deleted');
  } catch (error: any) {
    logResult('TRANSACTION', false, 'Failed to perform transaction', error);
  }

  // Test 7: DELETE - Delete the test document
  console.log('\n🗑️  Test 7: DELETE Operation');
  try {
    if (testDocId) {
      await testCollection.doc(testDocId).delete();
      logResult('DELETE', true, `Document ${testDocId} deleted successfully`);

      // Verify deletion
      const deletedDoc = await testCollection.doc(testDocId).get();
      if (!deletedDoc.exists) {
        logResult('DELETE Verification', true, 'Verified deletion - document no longer exists');
      } else {
        logResult('DELETE Verification', false, 'Document still exists after deletion');
      }
    }
  } catch (error: any) {
    logResult('DELETE', false, 'Failed to delete document', error);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 All CRUD tests passed! Firebase is working correctly.');
    console.log('✅ CREATE, READ, UPDATE, QUERY, BATCH, TRANSACTION, and DELETE operations are all functional.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }

  console.log('');

  // Exit with appropriate code
  process.exit(failed === 0 ? 0 : 1);
}

// Run the test
testFirebaseCRUD().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

