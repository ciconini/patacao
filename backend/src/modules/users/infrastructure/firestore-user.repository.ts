/**
 * UserRepository Firestore Implementation
 * 
 * Firestore adapter for UserRepository port.
 * This implementation handles persistence of User domain entities to Firestore.
 * 
 * Responsibilities:
 * - Map User domain entities to Firestore documents
 * - Map Firestore documents to User domain entities
 * - Implement repository interface methods
 * - Handle Firestore-specific operations (queries, transactions, search)
 * 
 * This belongs to the Infrastructure/Adapters layer.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { User, WeeklySchedule, WorkingHours } from '../domain/user.entity';
import {
  UserRepository,
  UserSearchCriteria,
  Pagination,
  Sort,
  PaginatedResult,
} from '../ports/user.repository.port';

/**
 * Firestore document structure for User
 */
interface UserDocument {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  username?: string;
  passwordHash?: string;
  roleIds: string[];
  storeIds: string[];
  workingHours?: {
    monday?: WorkingHours;
    tuesday?: WorkingHours;
    wednesday?: WorkingHours;
    thursday?: WorkingHours;
    friday?: WorkingHours;
    saturday?: WorkingHours;
    sunday?: WorkingHours;
  };
  serviceSkills: string[];
  active: boolean;
  // Infrastructure fields (not in domain entity)
  lastLogin?: FirebaseFirestore.Timestamp;
  failedLoginAttempts?: number;
  lockoutExpiry?: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestoreUserRepository implements UserRepository {
  private readonly collectionName = 'users';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore
  ) {}

  /**
   * Saves a User entity to Firestore
   * Creates a new document if it doesn't exist, updates if it does.
   * 
   * @param user - User domain entity to save
   * @returns Saved User entity
   */
  async save(user: User): Promise<User> {
    const docRef = this.firestore.collection(this.collectionName).doc(user.id);
    const document = this.toDocument(user);

    // Preserve infrastructure fields if they exist
    const existingDoc = await docRef.get();
    if (existingDoc.exists) {
      const existingData = existingDoc.data() as UserDocument;
      await docRef.set({
        ...document,
        lastLogin: existingData.lastLogin,
        failedLoginAttempts: existingData.failedLoginAttempts || 0,
        lockoutExpiry: existingData.lockoutExpiry,
      }, { merge: true });
    } else {
      await docRef.set({
        ...document,
        failedLoginAttempts: 0,
      }, { merge: true });
    }

    return user;
  }

  /**
   * Finds a User by ID
   * 
   * @param id - User ID
   * @returns User entity or null if not found
   */
  async findById(id: string): Promise<User | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return this.toEntity(doc.id, doc.data() as UserDocument);
  }

  /**
   * Finds a User by email
   * 
   * @param email - Email address to search for
   * @returns User entity or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('email', '==', email.trim().toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return this.toEntity(doc.id, doc.data() as UserDocument);
  }

  /**
   * Finds a User by username
   * 
   * @param username - Username to search for
   * @returns User entity or null if not found
   */
  async findByUsername(username: string): Promise<User | null> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('username', '==', username.trim())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return this.toEntity(doc.id, doc.data() as UserDocument);
  }

  /**
   * Updates user password
   * 
   * @param userId - User ID
   * @param passwordHash - New password hash
   */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(userId);
    await docRef.update({
      passwordHash,
      updatedAt: this.toTimestamp(new Date()),
    });
  }

  /**
   * Verifies user password
   * Note: This method is a placeholder. Password verification should be handled
   * by a PasswordHasher service that compares the provided password with the stored hash.
   * This method is included in the interface for compatibility but should not be used directly.
   * 
   * @param userId - User ID
   * @param password - Plain text password to verify
   * @returns Always returns false (password verification should use PasswordHasher service)
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    // Password verification should be handled by a PasswordHasher service
    // This method is kept for interface compatibility but should not be used
    // The use case should retrieve the password hash and use PasswordHasher.verify()
    return false;
  }

  /**
   * Updates last login timestamp
   * 
   * @param userId - User ID
   */
  async updateLastLogin(userId: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(userId);
    await docRef.update({
      lastLogin: this.toTimestamp(new Date()),
      updatedAt: this.toTimestamp(new Date()),
    });
  }

  /**
   * Increments failed login attempts counter
   * 
   * @param userId - User ID
   */
  async incrementFailedLoginAttempts(userId: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(userId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return;
    }

    const currentAttempts = (doc.data()?.failedLoginAttempts as number) || 0;
    await docRef.update({
      failedLoginAttempts: currentAttempts + 1,
      updatedAt: this.toTimestamp(new Date()),
    });
  }

  /**
   * Resets failed login attempts counter
   * 
   * @param userId - User ID
   */
  async resetFailedLoginAttempts(userId: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(userId);
    await docRef.update({
      failedLoginAttempts: 0,
      updatedAt: this.toTimestamp(new Date()),
    });
  }

  /**
   * Locks user account
   * 
   * @param userId - User ID
   * @param lockoutExpiry - Lockout expiration date
   */
  async lockAccount(userId: string, lockoutExpiry: Date): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(userId);
    await docRef.update({
      lockoutExpiry: this.toTimestamp(lockoutExpiry),
      updatedAt: this.toTimestamp(new Date()),
    });
  }

  /**
   * Checks if user account is locked
   * 
   * @param userId - User ID
   * @returns True if account is locked
   */
  async isAccountLocked(userId: string): Promise<boolean> {
    const docRef = this.firestore.collection(this.collectionName).doc(userId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return false;
    }

    const data = doc.data() as UserDocument;
    if (!data.lockoutExpiry) {
      return false;
    }

    const now = new Date();
    const expiry = data.lockoutExpiry.toDate();
    return now < expiry;
  }

  /**
   * Searches for users with pagination
   * 
   * @param criteria - Search criteria
   * @param pagination - Pagination parameters
   * @param sort - Sort parameters
   * @returns Paginated result of users
   */
  async search(
    criteria: UserSearchCriteria,
    pagination: Pagination,
    sort: Sort
  ): Promise<PaginatedResult<User>> {
    let query: FirebaseFirestore.Query = this.firestore.collection(this.collectionName);

    // Apply filters
    if (criteria.active !== undefined) {
      query = query.where('active', '==', criteria.active);
    }

    if (criteria.email) {
      query = query.where('email', '==', criteria.email.trim().toLowerCase());
    }

    // Note: Firestore doesn't support array-contains queries efficiently for roleIds
    // For role filtering, we'll need to filter client-side or use a different approach
    // For now, we'll filter client-side after fetching

    // Get total count (before pagination)
    const countSnapshot = await query.get();
    let allUsers = countSnapshot.docs.map(doc => 
      this.toEntity(doc.id, doc.data() as UserDocument)
    );

    // Apply role filter if specified
    if (criteria.role) {
      allUsers = allUsers.filter(user => user.roleIds.includes(criteria.role!));
    }

    // Apply store filter if specified
    if (criteria.storeId) {
      allUsers = allUsers.filter(user => user.storeIds.includes(criteria.storeId!));
    }

    // Apply text search if specified (client-side filtering)
    if (criteria.q) {
      const searchTerm = criteria.q.toLowerCase();
      allUsers = allUsers.filter(user => 
        user.fullName.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        (user.username && user.username.toLowerCase().includes(searchTerm))
      );
    }

    const total = allUsers.length;

    // Apply sorting
    const sortField = sort.field || 'createdAt';
    const sortDirection = sort.direction === 'desc' ? -1 : 1;
    allUsers.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'fullName':
          aVal = a.fullName;
          bVal = b.fullName;
          break;
        case 'email':
          aVal = a.email;
          bVal = b.email;
          break;
        case 'createdAt':
          aVal = a.createdAt.getTime();
          bVal = b.createdAt.getTime();
          break;
        default:
          aVal = a.createdAt.getTime();
          bVal = b.createdAt.getTime();
      }

      if (aVal < bVal) return -1 * sortDirection;
      if (aVal > bVal) return 1 * sortDirection;
      return 0;
    });

    // Apply pagination
    const offset = (pagination.page - 1) * pagination.perPage;
    const items = allUsers.slice(offset, offset + pagination.perPage);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / pagination.perPage);
    const hasNext = pagination.page < totalPages;
    const hasPrevious = pagination.page > 1;

    return {
      items,
      meta: {
        total,
        page: pagination.page,
        perPage: pagination.perPage,
        totalPages,
        hasNext,
        hasPrevious,
      },
    };
  }

  /**
   * Assigns roles to a user
   * 
   * @param userId - User ID
   * @param roleIds - List of role IDs to assign
   */
  async assignRoles(userId: string, roleIds: string[]): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(userId);
    await docRef.update({
      roleIds,
      updatedAt: this.toTimestamp(new Date()),
    });
  }

  /**
   * Assigns stores to a user
   * 
   * @param userId - User ID
   * @param storeIds - List of store IDs to assign
   */
  async assignStores(userId: string, storeIds: string[]): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(userId);
    await docRef.update({
      storeIds,
      updatedAt: this.toTimestamp(new Date()),
    });
  }

  /**
   * Converts User domain entity to Firestore document
   * 
   * @param user - User domain entity
   * @returns Firestore document (without infrastructure fields)
   */
  private toDocument(user: User): Omit<UserDocument, 'lastLogin' | 'failedLoginAttempts' | 'lockoutExpiry'> {
    return {
      id: user.id,
      email: user.email.toLowerCase(),
      fullName: user.fullName,
      phone: user.phone,
      username: user.username,
      passwordHash: user.passwordHash,
      roleIds: [...user.roleIds],
      storeIds: [...user.storeIds],
      workingHours: user.workingHours ? this.copySchedule(user.workingHours) : undefined,
      serviceSkills: [...user.serviceSkills],
      active: user.active,
      createdAt: this.toTimestamp(user.createdAt),
      updatedAt: this.toTimestamp(user.updatedAt),
    };
  }

  /**
   * Converts Firestore document to User domain entity
   * 
   * @param id - Document ID
   * @param doc - Firestore document data
   * @returns User domain entity
   */
  private toEntity(id: string, doc: UserDocument): User {
    const workingHours: WeeklySchedule | undefined = doc.workingHours 
      ? this.copySchedule(doc.workingHours) 
      : undefined;

    return new User(
      id,
      doc.email,
      doc.fullName,
      doc.roleIds,
      doc.phone,
      doc.username,
      doc.passwordHash,
      doc.storeIds,
      workingHours,
      doc.serviceSkills,
      doc.active,
      this.toDate(doc.createdAt),
      this.toDate(doc.updatedAt)
    );
  }

  /**
   * Deep copies working hours schedule structure
   * 
   * @param schedule - WeeklySchedule to copy
   * @returns Deep copy of schedule
   */
  private copySchedule(schedule: WeeklySchedule): WeeklySchedule {
    const result: WeeklySchedule = {};

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
    
    for (const day of days) {
      if (schedule[day]) {
        result[day] = {
          startTime: schedule[day]!.startTime,
          endTime: schedule[day]!.endTime,
          isAvailable: schedule[day]!.isAvailable,
        };
      }
    }

    return result;
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

