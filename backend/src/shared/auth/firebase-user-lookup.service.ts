/**
 * Firebase User Lookup Service
 *
 * Service for finding internal User entities by Firebase UID.
 * This service bridges Firebase Authentication with the internal user system.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { User } from '../../modules/users/domain/user.entity';

@Injectable()
export class FirebaseUserLookupService {
  private readonly collectionName = 'users';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore,
  ) {}

  /**
   * Finds an internal User by Firebase UID
   *
   * @param firebaseUid - Firebase user UID
   * @returns User entity or null if not found
   */
  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    try {
      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('firebaseUid', '==', firebaseUid)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return this.toEntity(doc.id, doc.data());
    } catch (error) {
      console.error('Error finding user by Firebase UID:', error);
      return null;
    }
  }

  /**
   * Updates a user's Firebase UID
   *
   * @param userId - Internal user ID
   * @param firebaseUid - Firebase user UID
   */
  async linkFirebaseUid(userId: string, firebaseUid: string): Promise<void> {
    await this.firestore.collection(this.collectionName).doc(userId).update({
      firebaseUid,
      updatedAt: new Date(),
    });
  }

  /**
   * Converts Firestore document to User entity
   * This is a simplified version - in production, use the repository's toEntity method
   */
  private toEntity(id: string, data: any): User {
    // This is a simplified conversion
    // In production, you should use the UserRepository's toEntity method
    // or create a shared mapper
    return new User(
      id,
      data.email,
      data.fullName,
      data.roleIds || [],
      data.phone,
      data.username,
      data.passwordHash,
      data.storeIds || [],
      data.workingHours,
      data.serviceSkills || [],
      data.active !== false,
      data.createdAt?.toDate(),
      data.updatedAt?.toDate(),
    );
  }
}
