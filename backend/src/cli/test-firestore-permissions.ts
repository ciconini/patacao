/**
 * Test Firestore Permissions
 * 
 * Simple script to test if the service account has Firestore permissions
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as admin from 'firebase-admin';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testFirestorePermissions() {
  console.log('🔍 Testing Firestore Permissions...\n');

  // Initialize Firebase Admin
  if (!admin.apps.length) {
    const useEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';
    // Use the project ID from service account if available, otherwise from env
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
      path.join(__dirname, '../../config/secrets/firebase-service-account.json');
    let projectId = process.env.FIREBASE_PROJECT_ID;
    
    // If no project ID in env, try to get it from service account
    if (!projectId && !useEmulator) {
      try {
        const serviceAccount = require(serviceAccountPath);
        projectId = serviceAccount.project_id;
      } catch (e) {
        // Ignore
      }
    }
    
    projectId = projectId || 'patacao';

    if (useEmulator) {
      const emulatorHost = process.env.FIREBASE_EMULATOR_HOST || 'localhost:8080';
      process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
      console.log('🔥 Using Firebase Emulator');
      admin.initializeApp({
        projectId: projectId || 'patacao-dev',
      });
    } else {
      // Production: Use service account
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
        path.join(__dirname, '../../config/secrets/firebase-service-account.json');
      
      try {
        const serviceAccount = require(serviceAccountPath);
        console.log('🔥 Using Production Firebase');
        console.log(`   Project ID: ${projectId}`);
        console.log(`   Service Account: ${serviceAccount.client_email}`);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: projectId,
        });
      } catch (error) {
        console.error('❌ Failed to load service account:', error);
        process.exit(1);
      }
    }
  }

  const db = admin.firestore();

  try {
    console.log('\n📝 Test 1: Reading from Firestore (list collections)...');
    const collections = await db.listCollections();
    console.log(`✅ Success! Found ${collections.length} collections`);
    if (collections.length > 0) {
      console.log(`   Collections: ${collections.map(c => c.id).join(', ')}`);
    }

    console.log('\n📝 Test 2: Reading from users collection...');
    const usersSnapshot = await db.collection('users').limit(1).get();
    console.log(`✅ Success! Read ${usersSnapshot.size} user(s)`);

    console.log('\n📝 Test 3: Writing to Firestore (test document)...');
    const testDocRef = db.collection('_test_permissions').doc('test-' + Date.now());
    await testDocRef.set({
      test: true,
      timestamp: admin.firestore.Timestamp.now(),
    });
    console.log(`✅ Success! Created test document: ${testDocRef.id}`);

    console.log('\n📝 Test 4: Deleting test document...');
    await testDocRef.delete();
    console.log(`✅ Success! Deleted test document`);

    console.log('\n✅ All permission tests passed!');
    console.log('\n💡 Your service account has the correct Firestore permissions.');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Permission test failed!');
    console.error(`   Error: ${error.message}`);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }

    if (error.code === 7 || error.message.includes('PERMISSION_DENIED')) {
      console.error('\n💡 Permission Error - Check the following:');
      console.error('   1. Service account email:', admin.app().options.credential ? 'loaded' : 'not loaded');
      console.error('   2. IAM roles granted:');
      console.error('      - roles/datastore.user (Cloud Datastore User)');
      console.error('      - roles/firebase.adminsdk.adminServiceAgent');
      console.error('   3. Wait 2-3 minutes after granting permissions');
      console.error('   4. Verify in Google Cloud Console:');
      console.error('      https://console.cloud.google.com/iam-admin/iam?project=patacao');
      console.error('\n   5. Check if Firestore API is enabled:');
      console.error('      https://console.cloud.google.com/apis/library/datastore.googleapis.com?project=patacao');
    }
    
    process.exit(1);
  }
}

// Run the test
testFirestorePermissions();

