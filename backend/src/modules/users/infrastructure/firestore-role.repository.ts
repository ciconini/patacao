/**
 * RoleRepository Firestore Implementation
 *
 * Firestore adapter for RoleRepository port.
 * This implementation handles persistence of Role domain entities to Firestore.
 *
 * Responsibilities:
 * - Map Role domain entities to Firestore documents
 * - Map Firestore documents to Role domain entities
 * - Implement repository interface methods
 * - Handle Firestore-specific operations
 *
 * This belongs to the Infrastructure/Adapters layer.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { Role } from '../domain/role.entity';
import { RoleRepository } from '../ports/role.repository.port';

/**
 * Firestore document structure for Role
 */
interface RoleDocument {
  id: string;
  name: string;
  permissions: string[];
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestoreRoleRepository implements RoleRepository {
  private readonly collectionName = 'roles';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore,
  ) {}

  /**
   * Finds a role by its ID
   *
   * @param id - Role ID (canonical identifier, e.g., "Owner", "Manager")
   * @returns Promise that resolves to Role entity or null if not found
   */
  async findById(id: string): Promise<Role | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return this.toEntity(doc.data() as RoleDocument);
  }

  /**
   * Finds all roles
   *
   * @returns Promise that resolves to array of Role entities
   */
  async findAll(): Promise<Role[]> {
    const snapshot = await this.firestore.collection(this.collectionName).get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((doc) => this.toEntity(doc.data() as RoleDocument));
  }

  /**
   * Finds multiple roles by their IDs
   *
   * @param ids - Array of role IDs
   * @returns Promise that resolves to array of Role entities (only found roles)
   */
  async findByIds(ids: string[]): Promise<Role[]> {
    if (ids.length === 0) {
      return [];
    }

    // Firestore 'in' queries are limited to 10 items
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 10) {
      chunks.push(ids.slice(i, i + 10));
    }

    const allRoles: Role[] = [];

    for (const chunk of chunks) {
      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('id', 'in', chunk)
        .get();

      allRoles.push(...snapshot.docs.map((doc) => this.toEntity(doc.data() as RoleDocument)));
    }

    return allRoles;
  }

  /**
   * Saves a Role entity to Firestore
   * Creates a new document if it doesn't exist, updates if it does.
   *
   * @param role - Role domain entity to save
   * @returns Saved Role entity
   */
  async save(role: Role): Promise<Role> {
    const docRef = this.firestore.collection(this.collectionName).doc(role.id);
    const document = this.toDocument(role);

    // Preserve createdAt if document already exists
    const existingDoc = await docRef.get();
    if (existingDoc.exists) {
      const existingData = existingDoc.data() as RoleDocument;
      document.createdAt = existingData.createdAt;
    }

    await docRef.set(document, { merge: true });

    return role;
  }

  /**
   * Checks if a role exists
   *
   * @param id - Role ID to check
   * @returns Promise that resolves to true if role exists, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();
    return doc.exists;
  }

  /**
   * Maps Role domain entity to Firestore document
   *
   * @param role - Role domain entity
   * @returns Firestore document
   */
  private toDocument(role: Role): RoleDocument {
    return {
      id: role.id,
      name: role.name,
      permissions: [...role.permissions],
      createdAt: this.toTimestamp(role.createdAt),
      updatedAt: this.toTimestamp(role.updatedAt),
    };
  }

  /**
   * Maps Firestore document to Role domain entity
   *
   * @param doc - Firestore document data
   * @returns Role domain entity
   */
  private toEntity(doc: RoleDocument): Role {
    return new Role(
      doc.id,
      doc.name,
      doc.permissions || [],
      this.toDate(doc.createdAt),
      this.toDate(doc.updatedAt),
    );
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

  /**
   * Converts JavaScript Date to Firestore Timestamp
   *
   * @param date - JavaScript Date
   * @returns Firestore Timestamp
   */
  private toTimestamp(date: Date): FirebaseFirestore.Timestamp {
    return FirebaseFirestore.Timestamp.fromDate(date);
  }
}

