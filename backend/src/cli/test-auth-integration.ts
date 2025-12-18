/**
 * Authentication Integration Test Script
 *
 * This script tests the authentication integration with Firebase:
 * 1. Creates an admin user
 * 2. Tests login with email/password
 * 3. Verifies Firebase user creation and linking
 * 4. Tests token generation and verification
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PasswordHasherService } from '../shared/auth/password-hasher.service';
import { JwtTokenGeneratorService } from '../shared/auth/jwt-token-generator.service';
import { FirebaseAuthIntegrationService } from '../shared/auth/firebase-auth-integration.service';
import { FirebaseUserLookupService } from '../shared/auth/firebase-user-lookup.service';
import { User } from '../modules/users/domain/user.entity';
import { FirestoreUserRepository } from '../modules/users/infrastructure/firestore-user.repository';
import { FirestoreSessionRepository } from '../modules/users/infrastructure/firestore-session.repository';

async function testAuthIntegration() {
  console.log('🚀 Starting Authentication Integration Tests...\n');

  // Create NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    // Get services
    const passwordHasher = app.get(PasswordHasherService);
    const jwtTokenGenerator = app.get(JwtTokenGeneratorService);
    const firebaseAuthIntegration = app.get(FirebaseAuthIntegrationService);
    const firebaseUserLookup = app.get(FirebaseUserLookupService);

    // Get repositories using string tokens (as registered in modules)
    const userRepository = app.get('UserRepository') as FirestoreUserRepository;
    const sessionRepository = app.get('SessionRepository') as FirestoreSessionRepository;

    // Test data
    const adminEmail = 'admin@patacao.test';
    const adminPassword = 'TestPassword123!';
    const adminFullName = 'Admin User';

    console.log('📝 Step 1: Creating admin user...');

    // 1. Hash password
    const passwordHash = await passwordHasher.hash(adminPassword);
    console.log('   ✓ Password hashed');

    // 2. Create user entity
    const userId = `test-admin-${Date.now()}`;
    const adminUser = new User(
      userId,
      adminEmail,
      adminFullName,
      ['Owner'], // Owner role
      undefined, // phone
      undefined, // username
      passwordHash,
      [], // storeIds
      undefined, // workingHours
      [], // serviceSkills
      true, // active
      new Date(), // createdAt
      new Date(), // updatedAt
    );

    // 3. Save user to Firestore
    await userRepository.save(adminUser);
    console.log(`   ✓ Admin user created with ID: ${userId}`);
    console.log(`   ✓ Email: ${adminEmail}`);

    // 4. Create Firebase Auth user
    console.log('\n📝 Step 2: Creating Firebase Auth user...');
    let firebaseUser: any = null;
    try {
      const firebaseUid = await firebaseAuthIntegration.createFirebaseUser({
        email: adminEmail,
        password: adminPassword,
        displayName: adminFullName,
      });
      console.log(`   ✓ Firebase user created with UID: ${firebaseUid}`);

      // 5. Link Firebase UID to internal user
      await firebaseUserLookup.linkFirebaseUid(userId, firebaseUid);
      console.log('   ✓ Firebase UID linked to internal user');

      // 6. Set custom claims (roles)
      await firebaseAuthIntegration.setUserRoles(firebaseUid, ['Owner']);
      console.log('   ✓ Custom claims (roles) set on Firebase user');

      // Get Firebase user for later use
      firebaseUser = await (firebaseAuthIntegration as any)['firebaseAdmin']
        .auth()
        .getUser(firebaseUid);
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        console.log('   ⚠ Firebase user already exists, skipping creation');
        // Try to get existing user
        const existingUser = await (firebaseAuthIntegration as any)['firebaseAdmin']
          .auth()
          .getUserByEmail(adminEmail);
        if (existingUser) {
          firebaseUser = existingUser;
          await firebaseUserLookup.linkFirebaseUid(userId, existingUser.uid);
          await firebaseAuthIntegration.setUserRoles(existingUser.uid, ['Owner']);
          console.log('   ✓ Linked existing Firebase user and set roles');
        }
      } else {
        throw error;
      }
    }

    // 7. Test login flow
    console.log('\n📝 Step 3: Testing login flow...');

    // Verify password
    const isPasswordValid = await passwordHasher.verify(adminPassword, passwordHash);
    console.log(`   ✓ Password verification: ${isPasswordValid ? 'PASSED' : 'FAILED'}`);

    if (!isPasswordValid) {
      throw new Error('Password verification failed');
    }

    // Generate JWT tokens
    const accessToken = await jwtTokenGenerator.generateAccessToken(userId, ['Owner']);
    const refreshToken = await jwtTokenGenerator.generateRefreshToken();
    console.log('   ✓ JWT tokens generated');
    console.log(`   ✓ Access token: ${accessToken.substring(0, 50)}...`);

    // Verify access token
    const decodedToken = await jwtTokenGenerator.verifyAccessToken(accessToken);
    if (decodedToken) {
      console.log('   ✓ Access token verification: PASSED');
      console.log(
        `   ✓ Token payload: userId=${decodedToken.userId}, roles=${decodedToken.roles.join(',')}`,
      );
    } else {
      throw new Error('Access token verification failed');
    }

    // 8. Test Firebase token verification
    console.log('\n📝 Step 4: Testing Firebase token verification...');

    if (firebaseUser) {
      console.log(`   ✓ Firebase user found: ${firebaseUser.uid}`);

      try {
        // Create a custom token (for testing)
        const customToken = await firebaseAuthIntegration.createCustomToken(firebaseUser.uid, [
          'Owner',
        ]);
        console.log('   ✓ Custom token created');
        console.log(`   ✓ Custom token: ${customToken.substring(0, 50)}...`);

        // Note: To verify the custom token, you would need to exchange it for an ID token
        // using the Firebase Auth SDK on the client side. This is just for demonstration.
      } catch (error: any) {
        console.warn(`   ⚠ Custom token creation failed: ${error.message}`);
      }
    } else {
      console.log('   ⚠ Firebase user not available, skipping Firebase token tests');
    }

    // 9. Verify user lookup by Firebase UID
    console.log('\n📝 Step 5: Testing user lookup by Firebase UID...');
    if (firebaseUser) {
      const foundUser = await firebaseUserLookup.findByFirebaseUid(firebaseUser.uid);
      if (foundUser) {
        console.log(`   ✓ User found by Firebase UID: ${foundUser.id}`);
        console.log(`   ✓ User email: ${foundUser.email}`);
        console.log(`   ✓ User roles: ${foundUser.roleIds.join(',')}`);
      } else {
        throw new Error('User lookup by Firebase UID failed');
      }
    }

    // 10. Test session creation
    console.log('\n📝 Step 6: Testing session creation...');
    const { Session } = await import('../modules/users/domain/session.entity');
    const sessionId = `test-session-${Date.now()}`;
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const session = new Session(
      sessionId,
      userId,
      now,
      expiresAt,
      false, // not revoked
    );

    await sessionRepository.saveWithRefreshToken(session, refreshToken);
    console.log(`   ✓ Session created: ${sessionId}`);

    // Verify session retrieval
    const foundSession = await sessionRepository.findByRefreshToken(refreshToken);
    if (foundSession) {
      console.log('   ✓ Session retrieval by refresh token: PASSED');
    } else {
      throw new Error('Session retrieval failed');
    }

    console.log('\n✅ All authentication integration tests PASSED!');
    console.log('\n📋 Summary:');
    console.log(`   - Admin user created: ${userId}`);
    console.log(`   - Email: ${adminEmail}`);
    console.log(`   - Password: ${adminPassword}`);
    console.log(`   - Firebase UID: ${firebaseUser?.uid || 'N/A'}`);
    console.log(`   - Roles: Owner`);
    console.log('\n💡 You can now use these credentials to test the login endpoint:');
    console.log(`   POST /api/v1/auth/login`);
    console.log(`   Body: { "email": "${adminEmail}", "password": "${adminPassword}" }`);
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run tests
testAuthIntegration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
