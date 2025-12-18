/**
 * Check Firebase Mode Script
 * 
 * This script checks whether Firebase is configured to use emulator or production.
 * Usage: ts-node -r tsconfig-paths/register src/cli/check-firebase-mode.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkFirebaseMode() {
  console.log('🔍 Checking Firebase Configuration...\n');

  // Check environment variables
  const useEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  console.log('Environment Variables:');
  console.log(`  USE_FIREBASE_EMULATOR: ${process.env.USE_FIREBASE_EMULATOR || 'not set'} (default: false)`);
  console.log(`  FIREBASE_EMULATOR_HOST: ${emulatorHost || 'not set'}`);
  console.log(`  FIREBASE_AUTH_EMULATOR_HOST: ${authEmulatorHost || 'not set'}`);
  console.log(`  FIREBASE_PROJECT_ID: ${projectId || 'not set'}`);
  console.log(`  FIREBASE_SERVICE_ACCOUNT_PATH: ${serviceAccountPath || 'not set'}`);
  console.log(`  FIREBASE_SERVICE_ACCOUNT_KEY: ${serviceAccountKey ? '***set***' : 'not set'}`);
  console.log('');

  // Determine mode
  if (useEmulator) {
    console.log('🔥 MODE: EMULATOR');
    console.log(`   Firestore: ${emulatorHost || 'localhost:8080'}`);
    console.log(`   Auth: ${authEmulatorHost || 'localhost:9099'}`);
    console.log(`   Project: ${projectId || 'patacao-dev'}`);
    console.log('');
    console.log('⚠️  Note: Make sure Firebase emulators are running!');
    console.log('   Run: firebase emulators:start --only firestore,auth');
  } else {
    console.log('🔥 MODE: PRODUCTION');
    console.log(`   Project ID: ${projectId || 'not set'}`);
    
    if (serviceAccountPath) {
      const fs = require('fs');
      const resolvedPath = path.isAbsolute(serviceAccountPath)
        ? serviceAccountPath
        : path.join(process.cwd(), serviceAccountPath);
      
      if (fs.existsSync(resolvedPath)) {
        console.log(`   Service Account: ${resolvedPath} ✅ (file exists)`);
      } else {
        console.log(`   Service Account: ${resolvedPath} ❌ (file NOT found)`);
      }
    } else if (serviceAccountKey) {
      console.log(`   Service Account: From environment variable ✅`);
    } else {
      // Check default path
      const fs = require('fs');
      const defaultPath = path.join(process.cwd(), 'config', 'secrets', 'firebase-service-account.json');
      if (fs.existsSync(defaultPath)) {
        console.log(`   Service Account: ${defaultPath} ✅ (file exists)`);
      } else {
        console.log(`   Service Account: Not configured ❌`);
        console.log('   Will try to use default Google Cloud credentials');
      }
    }
  }

  // Check if emulator ports are actually running
  if (useEmulator) {
    console.log('');
    console.log('Checking if emulators are running...');
    const { execSync } = require('child_process');
    
    try {
      const firestorePort = emulatorHost?.split(':')[1] || '8080';
      const authPort = authEmulatorHost?.split(':')[1] || '9099';
      
      try {
        execSync(`lsof -ti:${firestorePort}`, { stdio: 'ignore' });
        console.log(`   ✅ Firestore emulator is running on port ${firestorePort}`);
      } catch {
        console.log(`   ❌ Firestore emulator is NOT running on port ${firestorePort}`);
      }
      
      try {
        execSync(`lsof -ti:${authPort}`, { stdio: 'ignore' });
        console.log(`   ✅ Auth emulator is running on port ${authPort}`);
      } catch {
        console.log(`   ❌ Auth emulator is NOT running on port ${authPort}`);
      }
    } catch (error) {
      console.log('   (Could not check ports)');
    }
  }

  console.log('');
}

// Run the script
checkFirebaseMode().catch(console.error);

