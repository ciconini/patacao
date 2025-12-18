/**
 * Create User in Firebase Auth Emulator
 * 
 * This script creates a user in the Firebase Auth Emulator for local development.
 * Usage: ts-node -r tsconfig-paths/register src/cli/create-emulator-user.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

async function createEmulatorUser() {
  const email = 'feciconini@gmail.com';
  const password = 'acuma123';

  // Check if emulator should be used
  const useEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';
  const emulatorHost = process.env.FIREBASE_EMULATOR_HOST || 'localhost:8888';
  
  console.log('Creating user in Firebase Auth Emulator...');
  console.log(`USE_FIREBASE_EMULATOR: ${useEmulator}`);
  console.log(`FIREBASE_EMULATOR_HOST: ${emulatorHost}`);

  if (!useEmulator) {
    console.error('❌ ERROR: USE_FIREBASE_EMULATOR must be set to "true"');
    console.log('   Set it with: export USE_FIREBASE_EMULATOR=true');
    process.exit(1);
  }

  try {
    // Initialize Firebase Admin SDK for emulator
    if (!admin.apps.length) {
      // Set emulator environment variables
      process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
      process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
      
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'patacao-dev',
      });
      
      console.log('✅ Firebase Admin SDK initialized for emulator');
    }

    const auth = admin.auth();

    // Check if user already exists
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log(`⚠️  User with email ${email} already exists (UID: ${user.uid})`);
      console.log('   Updating password...');
      
      // Update password
      await auth.updateUser(user.uid, {
        password: password,
      });
      
      console.log('✅ Password updated successfully');
      console.log(`   User UID: ${user.uid}`);
      console.log(`   Email: ${user.email}`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // User doesn't exist, create it
        console.log(`Creating new user: ${email}...`);
        
        user = await auth.createUser({
          email: email,
          password: password,
          emailVerified: true, // Auto-verify email for emulator
        });
        
        console.log('✅ User created successfully');
        console.log(`   User UID: ${user.uid}`);
        console.log(`   Email: ${user.email}`);
      } else {
        throw error;
      }
    }

    console.log('\n✅ User is ready to use!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   UID: ${user.uid}`);
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating user:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
createEmulatorUser();

