/**
 * Firebase Authentication Service
 * 
 * Service for verifying Firebase Authentication ID tokens on the backend.
 * This service uses Firebase Admin SDK to verify tokens issued by Firebase Auth.
 * 
 * Responsibilities:
 * - Verify Firebase ID tokens
 * - Extract user information from verified tokens
 * - Handle token expiration and revocation
 * 
 * This belongs to the Infrastructure/Adapters layer.
 */

import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

/**
 * Decoded Firebase ID token payload
 */
export interface FirebaseTokenPayload {
  uid: string; // Firebase user ID
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  iss: string;
  aud: string;
  auth_time: number;
  exp: number;
  iat: number;
  firebase: {
    identities: Record<string, any>;
    sign_in_provider: string;
  };
  // Custom claims (if any)
  [key: string]: any;
}

/**
 * Result of token verification
 */
export interface TokenVerificationResult {
  valid: boolean;
  payload?: FirebaseTokenPayload;
  error?: string;
}

@Injectable()
export class FirebaseAuthService {
  constructor(
    @Inject('FIREBASE_ADMIN')
    private readonly firebaseAdmin: typeof admin
  ) {}

  /**
   * Verifies a Firebase ID token
   * 
   * @param idToken - Firebase ID token string
   * @returns Verification result with decoded token payload
   */
  async verifyIdToken(idToken: string): Promise<TokenVerificationResult> {
    try {
      const decodedToken = await this.firebaseAdmin.auth().verifyIdToken(idToken);
      
      return {
        valid: true,
        payload: decodedToken as FirebaseTokenPayload,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Token verification failed',
      };
    }
  }

  /**
   * Gets user information from Firebase Auth by UID
   * 
   * @param uid - Firebase user UID
   * @returns User record from Firebase Auth
   */
  async getUserByUid(uid: string): Promise<admin.auth.UserRecord | null> {
    try {
      return await this.firebaseAdmin.auth().getUser(uid);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Creates a custom token for a user
   * This can be used to create tokens for existing users in your system
   * 
   * @param uid - User UID
   * @param additionalClaims - Additional custom claims to include
   * @returns Custom token string
   */
  async createCustomToken(uid: string, additionalClaims?: Record<string, any>): Promise<string> {
    return await this.firebaseAdmin.auth().createCustomToken(uid, additionalClaims);
  }

  /**
   * Sets custom claims on a Firebase user
   * Useful for adding roles or permissions to Firebase Auth users
   * 
   * @param uid - User UID
   * @param customClaims - Custom claims to set (e.g., { role: 'admin' })
   */
  async setCustomClaims(uid: string, customClaims: Record<string, any>): Promise<void> {
    await this.firebaseAdmin.auth().setCustomUserClaims(uid, customClaims);
  }

  /**
   * Revokes all refresh tokens for a user
   * 
   * @param uid - User UID
   */
  async revokeRefreshTokens(uid: string): Promise<void> {
    await this.firebaseAdmin.auth().revokeRefreshTokens(uid);
  }

  /**
   * Deletes a user from Firebase Auth
   * 
   * @param uid - User UID
   */
  async deleteUser(uid: string): Promise<void> {
    await this.firebaseAdmin.auth().deleteUser(uid);
  }
}

