/**
 * SessionRepository Firestore Implementation
 * 
 * Firestore adapter for SessionRepository port.
 * This implementation handles persistence of Session domain entities to Firestore.
 * 
 * Responsibilities:
 * - Map Session domain entities to Firestore documents
 * - Map Firestore documents to Session domain entities
 * - Implement repository interface methods
 * - Handle Firestore-specific operations (queries, transactions)
 * 
 * This belongs to the Infrastructure/Adapters layer.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { Session } from '../domain/session.entity';
import { SessionRepository } from '../ports/session.repository.port';

/**
 * Firestore document structure for Session
 */
interface SessionDocument {
  id: string;
  userId: string;
  refreshToken?: string; // Stored separately (not in domain entity)
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt?: FirebaseFirestore.Timestamp;
  revoked: boolean;
  revokedAt?: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestoreSessionRepository implements SessionRepository {
  private readonly collectionName = 'sessions';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore
  ) {}

  /**
   * Saves a Session entity to Firestore
   * Creates a new document if it doesn't exist, updates if it does.
   * 
   * @param session - Session domain entity to save
   * @returns Saved Session entity
   */
  async save(session: Session): Promise<Session> {
    const docRef = this.firestore.collection(this.collectionName).doc(session.id);
    const document = this.toDocument(session);

    // Preserve refreshToken if it exists
    const existingDoc = await docRef.get();
    if (existingDoc.exists) {
      const existingData = existingDoc.data() as SessionDocument;
      await docRef.set({
        ...document,
        refreshToken: existingData.refreshToken,
      }, { merge: true });
    } else {
      await docRef.set(document, { merge: true });
    }

    return session;
  }

  /**
   * Saves a Session with a refresh token
   * This is a helper method for storing refresh tokens
   * 
   * @param session - Session domain entity
   * @param refreshToken - Refresh token to store
   */
  async saveWithRefreshToken(session: Session, refreshToken: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(session.id);
    const document = this.toDocument(session);
    
    await docRef.set({
      ...document,
      refreshToken,
    }, { merge: true });
  }

  /**
   * Finds a Session by ID
   * 
   * @param sessionId - Session ID
   * @returns Session entity or null if not found
   */
  async findById(sessionId: string): Promise<Session | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(sessionId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return this.toEntity(doc.id, doc.data() as SessionDocument);
  }

  /**
   * Finds a Session by refresh token
   * 
   * @param refreshToken - Refresh token to search for
   * @returns Session entity or null if not found
   */
  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('refreshToken', '==', refreshToken)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return this.toEntity(doc.id, doc.data() as SessionDocument);
  }

  /**
   * Revokes a session by ID
   * 
   * @param sessionId - Session ID to revoke
   */
  async revoke(sessionId: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(sessionId);
    await docRef.update({
      revoked: true,
      revokedAt: this.toTimestamp(new Date()),
    });
  }

  /**
   * Revokes a session by refresh token
   * 
   * @param refreshToken - Refresh token to revoke
   */
  async revokeByRefreshToken(refreshToken: string): Promise<void> {
    const session = await this.findByRefreshToken(refreshToken);
    if (session) {
      await this.revoke(session.id);
    }
  }

  /**
   * Revokes all sessions for a user
   * 
   * @param userId - User ID
   */
  async revokeAllByUserId(userId: string): Promise<void> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('userId', '==', userId)
      .where('revoked', '==', false)
      .get();

    const batch = this.firestore.batch();
    const now = this.toTimestamp(new Date());

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        revoked: true,
        revokedAt: now,
      });
    });

    await batch.commit();
  }

  /**
   * Converts Session domain entity to Firestore document
   * 
   * @param session - Session domain entity
   * @returns Firestore document (without refreshToken)
   */
  private toDocument(session: Session): Omit<SessionDocument, 'refreshToken'> {
    return {
      id: session.id,
      userId: session.userId,
      createdAt: this.toTimestamp(session.createdAt),
      expiresAt: session.expiresAt ? this.toTimestamp(session.expiresAt) : undefined,
      revoked: session.revoked,
      revokedAt: session.revokedAt ? this.toTimestamp(session.revokedAt) : undefined,
    };
  }

  /**
   * Converts Firestore document to Session domain entity
   * 
   * @param id - Document ID
   * @param doc - Firestore document data
   * @returns Session domain entity
   */
  private toEntity(id: string, doc: SessionDocument): Session {
    return new Session(
      id,
      doc.userId,
      this.toDate(doc.createdAt),
      doc.expiresAt ? this.toDate(doc.expiresAt) : undefined,
      doc.revoked,
      doc.revokedAt ? this.toDate(doc.revokedAt) : undefined
    );
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
