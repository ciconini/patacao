/**
 * Firebase Auth Integration Service
 *
 * Service that integrates Firebase Authentication with the internal user system.
 * This service handles creating Firebase users, linking them to internal users,
 * and managing custom claims (roles).
 */

import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseAuthService } from './firebase-auth.service';

export interface CreateFirebaseUserInput {
  email: string;
  password: string;
  displayName?: string;
  disabled?: boolean;
}

export interface LinkFirebaseUserResult {
  success: boolean;
  firebaseUid?: string;
  error?: string;
}

@Injectable()
export class FirebaseAuthIntegrationService {
  constructor(
    @Inject('FIREBASE_ADMIN')
    private readonly firebaseAdmin: typeof admin,
    private readonly firebaseAuthService: FirebaseAuthService,
  ) {}

  /**
   * Creates a Firebase Auth user and links it to an internal user
   *
   * @param input - User creation data
   * @returns Firebase user UID
   */
  async createFirebaseUser(input: CreateFirebaseUserInput): Promise<string> {
    try {
      const userRecord = await this.firebaseAdmin.auth().createUser({
        email: input.email,
        password: input.password,
        displayName: input.displayName,
        disabled: input.disabled || false,
        emailVerified: false, // Require email verification
      });

      return userRecord.uid;
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        // User already exists in Firebase Auth
        // Try to get the existing user
        const existingUser = await this.firebaseAdmin.auth().getUserByEmail(input.email);
        return existingUser.uid;
      }
      throw error;
    }
  }

  /**
   * Sets custom claims (roles, permissions) on a Firebase user
   *
   * @param firebaseUid - Firebase user UID
   * @param roles - Array of role IDs or role names
   * @param storeIds - Optional array of store IDs the user can access
   */
  async setUserRoles(firebaseUid: string, roles: string[], storeIds?: string[]): Promise<void> {
    const customClaims: Record<string, any> = {
      roles: {},
    };

    // Convert roles array to object format for Firebase custom claims
    // Firebase custom claims should be objects, not arrays
    roles.forEach((role) => {
      customClaims.roles[role] = true;
    });

    if (storeIds && storeIds.length > 0) {
      customClaims.storeIds = storeIds;
    }

    await this.firebaseAuthService.setCustomClaims(firebaseUid, customClaims);
  }

  /**
   * Updates custom claims when user roles change
   *
   * @param firebaseUid - Firebase user UID
   * @param roles - New array of roles
   * @param storeIds - Optional array of store IDs
   */
  async updateUserRoles(firebaseUid: string, roles: string[], storeIds?: string[]): Promise<void> {
    await this.setUserRoles(firebaseUid, roles, storeIds);
  }

  /**
   * Creates a custom token for a user (for testing or special cases)
   *
   * @param firebaseUid - Firebase user UID
   * @param roles - User roles
   * @returns Custom token that can be exchanged for an ID token
   */
  async createCustomToken(firebaseUid: string, roles: string[]): Promise<string> {
    const customClaims: Record<string, any> = {
      roles: {},
    };

    roles.forEach((role) => {
      customClaims.roles[role] = true;
    });

    return await this.firebaseAuthService.createCustomToken(firebaseUid, customClaims);
  }

  /**
   * Verifies a Firebase ID token and extracts user information
   *
   * @param idToken - Firebase ID token
   * @returns User information from token
   */
  async verifyTokenAndGetUser(idToken: string): Promise<{
    firebaseUid: string;
    email?: string;
    roles: string[];
    storeIds?: string[];
  } | null> {
    const result = await this.firebaseAuthService.verifyIdToken(idToken);

    if (!result.valid || !result.payload) {
      return null;
    }

    const payload = result.payload;
    const roles: string[] = [];

    // Extract roles from custom claims
    if (payload.roles && typeof payload.roles === 'object') {
      roles.push(...Object.keys(payload.roles).filter((key) => payload.roles[key] === true));
    }

    return {
      firebaseUid: payload.uid,
      email: payload.email,
      roles,
      storeIds: payload.storeIds as string[] | undefined,
    };
  }

  /**
   * Deletes a Firebase Auth user
   *
   * @param firebaseUid - Firebase user UID
   */
  async deleteFirebaseUser(firebaseUid: string): Promise<void> {
    await this.firebaseAuthService.deleteUser(firebaseUid);
  }

  /**
   * Disables a Firebase Auth user
   *
   * @param firebaseUid - Firebase user UID
   */
  async disableFirebaseUser(firebaseUid: string): Promise<void> {
    await this.firebaseAdmin.auth().updateUser(firebaseUid, {
      disabled: true,
    });
  }

  /**
   * Enables a Firebase Auth user
   *
   * @param firebaseUid - Firebase user UID
   */
  async enableFirebaseUser(firebaseUid: string): Promise<void> {
    await this.firebaseAdmin.auth().updateUser(firebaseUid, {
      disabled: false,
    });
  }

  /**
   * Updates a Firebase Auth user's password
   *
   * @param firebaseUid - Firebase user UID
   * @param newPassword - New password
   */
  async updateFirebaseUserPassword(firebaseUid: string, newPassword: string): Promise<void> {
    await this.firebaseAdmin.auth().updateUser(firebaseUid, {
      password: newPassword,
    });
  }
}
