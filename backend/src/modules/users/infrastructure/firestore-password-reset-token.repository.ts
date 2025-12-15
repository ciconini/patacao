/**
 * PasswordResetTokenRepository Firestore Implementation
 * 
 * Firestore adapter for PasswordResetTokenRepository port.
 * This implementation handles persistence of PasswordResetToken to Firestore.
 * 
 * Responsibilities:
 * - Map PasswordResetToken to Firestore documents
 * - Map Firestore documents to PasswordResetToken
 * - Implement repository interface methods
 * - Handle Firestore-specific operations (queries, transactions)
 * 
 * This belongs to the Infrastructure/Adapters layer.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import {
  PasswordResetTokenRepository,
  PasswordResetToken,
} from '../ports/password-reset-token.repository.port';

/**
 * Firestore document structure for PasswordResetToken
 */
interface PasswordResetTokenDocument {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: FirebaseFirestore.Timestamp;
  used: boolean;
  createdAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestorePasswordResetTokenRepository implements PasswordResetTokenRepository {
  private readonly collectionName = 'password_reset_tokens';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore
  ) {}

  /**
   * Saves a password reset token to Firestore
   * 
   * @param token - Password reset token to save
   * @returns Saved token
   */
  async save(token: PasswordResetToken): Promise<PasswordResetToken> {
    const docRef = this.firestore.collection(this.collectionName).doc(token.id);
    const document = this.toDocument(token);

    await docRef.set(document, { merge: true });

    return token;
  }

  /**
   * Finds a token by its hash
   * 
   * @param tokenHash - Token hash to search for
   * @returns Token or null if not found
   */
  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('tokenHash', '==', tokenHash)
      .where('used', '==', false)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const token = this.toEntity(doc.id, doc.data() as PasswordResetTokenDocument);

    // Check if token is expired
    if (token.expiresAt < new Date()) {
      return null;
    }

    return token;
  }

  /**
   * Marks a token as used
   * 
   * @param tokenId - Token ID to mark as used
   */
  async markAsUsed(tokenId: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(tokenId);
    await docRef.update({
      used: true,
    });
  }

  /**
   * Invalidates all existing tokens for a user
   * 
   * @param userId - User ID
   */
  async invalidateExistingTokens(userId: string): Promise<void> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('userId', '==', userId)
      .where('used', '==', false)
      .get();

    const batch = this.firestore.batch();

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        used: true,
      });
    });

    await batch.commit();
  }

  /**
   * Converts PasswordResetToken to Firestore document
   * 
   * @param token - Password reset token
   * @returns Firestore document
   */
  private toDocument(token: PasswordResetToken): PasswordResetTokenDocument {
    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: this.toTimestamp(token.expiresAt),
      used: token.used,
      createdAt: this.toTimestamp(token.createdAt),
    };
  }

  /**
   * Converts Firestore document to PasswordResetToken
   * 
   * @param id - Document ID
   * @param doc - Firestore document data
   * @returns Password reset token
   */
  private toEntity(id: string, doc: PasswordResetTokenDocument): PasswordResetToken {
    return {
      id,
      userId: doc.userId,
      tokenHash: doc.tokenHash,
      expiresAt: this.toDate(doc.expiresAt),
      used: doc.used,
      createdAt: this.toDate(doc.createdAt),
    };
  }

  /**
   * Converts JavaScript Date to Firestore Timestamp
   * 
   * @param date - JavaScript Date
   * @returns Firestore Timestamp
   */
  private toTimestamp(date: Date): FirebaseFirestore.Timestamp {
    return FirebaseFirestore.Timestamp.fromDate(date);
  }

  /**
   * Converts Firestore Timestamp to JavaScript Date
   * 
   * @param timestamp - Firestore Timestamp
   * @returns JavaScript Date
   */
  private toDate(timestamp: FirebaseFirestore.Timestamp): Date {
    return timestamp.toDate();
  }
}

