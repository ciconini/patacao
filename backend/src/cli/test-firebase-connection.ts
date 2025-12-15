/**
 * Firebase Connection Test Script
 * 
 * This script tests the Firebase connection by:
 * 1. Initializing Firebase Admin SDK
 * 2. Testing Firestore connection
 * 3. Performing a test read/write operation
 * 
 * Usage:
 *   npm run test:firebase
 *   or
 *   ts-node src/cli/test-firebase-connection.ts
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
}

const results: TestResult[] = [];

function logResult(test: string, success: boolean, message: string, error?: Error) {
  results.push({ test, success, message, error });
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${test}: ${message}`);
  if (error) {
    console.log(`   Error: ${error.message}`);
  }
}

async function testFirebaseConnection(): Promise<void> {
  console.log('🔥 Testing Firebase Connection...\n');

  // Test 1: Check environment variables
  console.log('📋 Checking Configuration...');
  const useEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';
  const projectId = process.env.FIREBASE_PROJECT_ID || 'patacao';
  const emulatorHost = process.env.FIREBASE_EMULATOR_HOST || 'localhost:8080';

  console.log(`   USE_FIREBASE_EMULATOR: ${useEmulator}`);
  console.log(`   FIREBASE_PROJECT_ID: ${projectId}`);
  if (useEmulator) {
    console.log(`   FIREBASE_EMULATOR_HOST: ${emulatorHost}`);
  } else {
    console.log(`   FIREBASE_SERVICE_ACCOUNT_PATH: ${process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'Not set'}`);
    console.log(`   FIREBASE_SERVICE_ACCOUNT_KEY: ${process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? 'Set' : 'Not set'}`);
  }
  console.log('');

  // Test 2: Initialize Firebase Admin SDK
  console.log('🔧 Initializing Firebase Admin SDK...');
  try {
    if (admin.apps.length === 0) {
      if (useEmulator) {
        // Use Firebase Emulator
        process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
        admin.initializeApp({
          projectId: projectId || 'patacao-dev',
        });
        logResult('Firebase Admin Initialization', true, `Initialized with emulator at ${emulatorHost}`);
          } else {
            // Production: Use service account
            const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
            const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

            if (serviceAccountPath) {
              // Load from file path (absolute or relative to project root)
              const path = require('path');
              const resolvedPath = path.isAbsolute(serviceAccountPath)
                ? serviceAccountPath
                : path.join(process.cwd(), serviceAccountPath);
              const serviceAccount = require(resolvedPath);
              admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: projectId,
              });
              logResult('Firebase Admin Initialization', true, `Initialized with service account from ${serviceAccountPath}`);
            } else if (serviceAccountKey) {
              // Load from JSON string
              const serviceAccount = JSON.parse(serviceAccountKey);
              admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: projectId,
              });
              logResult('Firebase Admin Initialization', true, 'Initialized with service account from environment variable');
            } else {
              // Try default path: config/secrets/firebase-service-account.json
              try {
                const path = require('path');
                const defaultPath = path.join(process.cwd(), 'config', 'secrets', 'firebase-service-account.json');
                const serviceAccount = require(defaultPath);
                admin.initializeApp({
                  credential: admin.credential.cert(serviceAccount),
                  projectId: projectId,
                });
                logResult('Firebase Admin Initialization', true, `Initialized with service account from default path: ${defaultPath}`);
              } catch (defaultPathError) {
                // Use default credentials (for Google Cloud environments)
                admin.initializeApp({
                  projectId: projectId,
                });
                logResult('Firebase Admin Initialization', true, 'Initialized with default credentials (no service account found)');
              }
            }
          }
    } else {
      logResult('Firebase Admin Initialization', true, 'Already initialized');
    }
  } catch (error: any) {
    logResult('Firebase Admin Initialization', false, 'Failed to initialize', error);
    console.log('\n❌ Cannot proceed with further tests. Please check your configuration.\n');
    return;
  }

  // Test 3: Get Firestore instance
  console.log('\n📚 Testing Firestore Connection...');
  let db: admin.firestore.Firestore;
  try {
    db = admin.firestore();
    logResult('Firestore Instance', true, 'Firestore instance created successfully');
  } catch (error: any) {
    logResult('Firestore Instance', false, 'Failed to create Firestore instance', error);
    return;
  }

  // Test 4: Test read operation (check if we can access Firestore)
  console.log('\n📖 Testing Read Operation...');
  try {
    const testCollection = db.collection('_test_connection');
    const snapshot = await testCollection.limit(1).get();
    logResult('Read Operation', true, `Successfully read from Firestore (found ${snapshot.size} documents)`);
  } catch (error: any) {
    logResult('Read Operation', false, 'Failed to read from Firestore', error);
  }

  // Test 5: Test write operation
  console.log('\n✍️  Testing Write Operation...');
  try {
    const testCollection = db.collection('_test_connection');
    const testDoc = testCollection.doc('test-doc');
    const testData = {
      message: 'Firebase connection test',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      testId: Date.now().toString(),
    };

    await testDoc.set(testData);
    logResult('Write Operation', true, 'Successfully wrote test document to Firestore');

    // Clean up: Delete test document
    try {
      await testDoc.delete();
      logResult('Cleanup', true, 'Test document deleted successfully');
    } catch (cleanupError: any) {
      logResult('Cleanup', false, 'Failed to delete test document', cleanupError);
    }
  } catch (error: any) {
    logResult('Write Operation', false, 'Failed to write to Firestore', error);
  }

  // Test 6: Test project info (optional)
  console.log('\nℹ️  Testing Project Information...');
  try {
    // Get project ID from app
    const app = admin.app();
    const currentProjectId = app.options.projectId;
    logResult('Project Info', true, `Connected to project: ${currentProjectId}`);
  } catch (error: any) {
    logResult('Project Info', false, 'Failed to get project info (this is optional)', error);
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
    console.log('\n🎉 All tests passed! Firebase connection is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    console.log('\nTroubleshooting Tips:');
    console.log('1. Verify your Firebase project ID is correct');
    if (!useEmulator) {
      console.log('2. Check that your service account has proper permissions');
      console.log('3. Ensure FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_KEY is set');
    } else {
      console.log('2. Ensure Firebase emulator is running: npm run firebase:emulators');
      console.log('3. Check that FIREBASE_EMULATOR_HOST is correct');
    }
    console.log('4. Verify Firestore is enabled in your Firebase project');
  }

  console.log('');

  // Exit with appropriate code
  process.exit(failed === 0 ? 0 : 1);
}

// Run the test
testFirebaseConnection().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

