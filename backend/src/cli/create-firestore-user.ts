/**
 * Create Firestore User from Firebase Auth User
 * 
 * This script creates a user in Firestore for an existing Firebase Auth user.
 * This is needed because the login flow requires users to exist in Firestore.
 * 
 * Usage: ts-node -r tsconfig-paths/register src/cli/create-firestore-user.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function createFirestoreUser() {
  const email = 'feciconini@gmail.com';
  const password = 'acuma123';
  const fullName = 'Felipe Ciconini'; // You can change this
  const roleIds = ['Owner']; // Assign Owner role - change if needed

  console.log('🔧 Creating Firestore user from Firebase Auth user...\n');

  // Initialize Firebase Admin
  if (!admin.apps.length) {
    const useEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';
    const projectId = process.env.FIREBASE_PROJECT_ID || 'patacao';

    if (useEmulator) {
      const emulatorHost = process.env.FIREBASE_EMULATOR_HOST || 'localhost:8080';
      process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
      process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
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
        process.exit(1);
      }
    }
  }

  const auth = admin.auth();
  const db = admin.firestore();

  try {
    // 1. Try to get Firebase Auth user (optional - if it fails, we'll continue anyway)
    console.log(`📧 Looking up Firebase Auth user: ${email}...`);
    let firebaseUser;
    let firebaseUid: string | undefined;
    
    try {
      firebaseUser = await auth.getUserByEmail(email);
      firebaseUid = firebaseUser.uid;
      console.log(`✅ Found Firebase Auth user (UID: ${firebaseUid})`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log(`⚠️  User not found in Firebase Auth (this is OK if using emulator)`);
        console.log(`   Will create Firestore user without Firebase UID link`);
        firebaseUid = undefined;
      } else {
        console.warn(`⚠️  Could not check Firebase Auth: ${error.message}`);
        console.warn(`   Will create Firestore user anyway`);
        firebaseUid = undefined;
      }
    }

    // 2. Check if user already exists in Firestore
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
      console.log(`   Firebase UID: ${existingUser.firebaseUid || 'not linked'}`);
      
      // Update Firebase UID if not linked
      if (!existingUser.firebaseUid && firebaseUid) {
        console.log(`\n🔗 Linking Firebase UID to existing user...`);
        await db.collection('users').doc(existingUser.id).update({
          firebaseUid: firebaseUid,
          updatedAt: admin.firestore.Timestamp.now(),
        });
        console.log(`✅ Linked Firebase UID to user`);
      }

      // Update password hash if needed
      if (!existingUser.passwordHash) {
        console.log(`\n🔐 Setting password hash...`);
        const passwordHash = await bcrypt.hash(password, 10);
        await db.collection('users').doc(existingUser.id).update({
          passwordHash: passwordHash,
          updatedAt: admin.firestore.Timestamp.now(),
        });
        console.log(`✅ Password hash set`);
      }

      console.log(`\n✅ User is ready! You can now login with:`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      process.exit(0);
    }

    // 3. Hash the password
    console.log(`🔐 Hashing password...`);
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create user in Firestore
    const userId = uuidv4();
    console.log(`\n📝 Creating user in Firestore...`);
    const userData = {
      id: userId,
      email: email,
      fullName: fullName,
      passwordHash: passwordHash,
      roleIds: roleIds,
      storeIds: [], // Empty for now - can be assigned later
      serviceSkills: [],
      active: true,
      firebaseUid: firebaseUid, // Link to Firebase Auth user if available
      failedLoginAttempts: 0,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await db.collection('users').doc(userId).set(userData);
    console.log(`✅ User created in Firestore (ID: ${userId})`);

    // 5. Set custom claims on Firebase Auth user (roles) - only if Firebase user exists
    if (firebaseUid) {
      console.log(`\n🔑 Setting custom claims (roles) on Firebase Auth user...`);
      try {
        await auth.setCustomUserClaims(firebaseUid, {
          roles: roleIds.reduce((acc, role) => {
            acc[role] = true;
            return acc;
          }, {} as Record<string, boolean>),
        });
        console.log(`✅ Custom claims set: ${roleIds.join(', ')}`);
      } catch (error: any) {
        console.warn(`⚠️  Failed to set custom claims: ${error.message}`);
        console.warn(`   This is non-critical - user can still login`);
      }
    } else {
      console.log(`\n⚠️  Skipping custom claims (Firebase Auth user not found)`);
    }

    console.log(`\n✅ User created successfully!`);
    console.log(`\n📋 User Details:`);
    console.log(`   Firestore ID: ${userId}`);
    if (firebaseUid) {
      console.log(`   Firebase UID: ${firebaseUid}`);
    }
    console.log(`   Email: ${email}`);
    console.log(`   Full Name: ${fullName}`);
    console.log(`   Roles: ${roleIds.join(', ')}`);
    console.log(`   Active: true`);
    console.log(`\n🔐 Login Credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`\n✅ You can now login with these credentials!`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating user:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
createFirestoreUser();

