/**
 * Create User Directly in Firestore
 * 
 * This script creates a user directly in Firestore without checking Firebase Auth.
 * Use this when you have permission issues or want to create a user quickly.
 * 
 * Usage: ts-node -r tsconfig-paths/register src/cli/create-user-direct.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function createUserDirect() {
  const email = 'feciconini@gmail.com';
  const password = 'acuma123';
  const fullName = 'Felipe Ciconini';
  const roleIds = ['Owner']; // Change roles as needed: ['Owner'], ['Manager'], ['Staff'], etc.

  console.log('🔧 Creating user directly in Firestore...\n');

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
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: projectId,
        });
      } catch (error) {
        console.error('❌ Failed to load service account:', error);
        console.error('   Make sure the service account file exists and has proper permissions');
        process.exit(1);
      }
    }
  }

  const db = admin.firestore();

  try {
    // 1. Check if user already exists
    console.log(`🔍 Checking if user exists in Firestore...`);
    const existingUsers = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!existingUsers.empty) {
      const existingUser = existingUsers.docs[0].data();
      console.log(`⚠️  User already exists in Firestore (ID: ${existingUser.id})`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Full Name: ${existingUser.fullName}`);
      console.log(`   Roles: ${existingUser.roleIds?.join(', ') || 'none'}`);
      
      // Check if password hash exists
      if (!existingUser.passwordHash) {
        console.log(`\n🔐 Setting password hash...`);
        const passwordHash = await bcrypt.hash(password, 10);
        await db.collection('users').doc(existingUser.id).update({
          passwordHash: passwordHash,
          updatedAt: admin.firestore.Timestamp.now(),
        });
        console.log(`✅ Password hash set`);
      } else {
        console.log(`\n✅ User already has a password hash`);
      }

      console.log(`\n✅ User is ready! You can now login with:`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      process.exit(0);
    }

    // 2. Hash the password
    console.log(`🔐 Hashing password...`);
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Create user in Firestore
    const userId = uuidv4();
    console.log(`\n📝 Creating user in Firestore...`);
    const now = admin.firestore.Timestamp.now();
    
    const userData: any = {
      id: userId,
      email: email,
      fullName: fullName,
      passwordHash: passwordHash,
      roleIds: roleIds,
      storeIds: [], // Empty for now - can be assigned later
      serviceSkills: [],
      active: true,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    // Only add firebaseUid if we have it (Firestore doesn't allow undefined)
    // You can add this later if you have the Firebase Auth UID

    await db.collection('users').doc(userId).set(userData);
    console.log(`✅ User created in Firestore (ID: ${userId})`);

    console.log(`\n✅ User created successfully!`);
    console.log(`\n📋 User Details:`);
    console.log(`   Firestore ID: ${userId}`);
    console.log(`   Email: ${email}`);
    console.log(`   Full Name: ${fullName}`);
    console.log(`   Roles: ${roleIds.join(', ')}`);
    console.log(`   Active: true`);
    console.log(`\n🔐 Login Credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`\n✅ You can now login with these credentials!`);
    console.log(`\n💡 Note: If you want to link this user to Firebase Auth, you can:`);
    console.log(`   1. Get the Firebase Auth UID from Firebase Console`);
    console.log(`   2. Update the user document with: firebaseUid: "YOUR_UID"`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating user:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    
    if (error.code === 7 || error.message.includes('PERMISSION_DENIED')) {
      console.error('\n💡 Permission Error - Try one of these:');
      console.error('   1. Use Firebase Console to create the user manually');
      console.error('   2. Fix service account permissions in Google Cloud Console');
      console.error('   3. Use the emulator: export USE_FIREBASE_EMULATOR=true');
    }
    
    process.exit(1);
  }
}

// Run the script
createUserDirect();

