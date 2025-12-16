/**
 * StoreRepository Firestore Implementation
 * 
 * Firestore adapter for StoreRepository port.
 * This implementation handles persistence of Store domain entities to Firestore.
 * 
 * Responsibilities:
 * - Map Store domain entities to Firestore documents
 * - Map Firestore documents to Store domain entities
 * - Implement repository interface methods
 * - Handle Firestore-specific operations (queries, transactions)
 * 
 * This belongs to the Infrastructure/Adapters layer.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { Store, Address, WeeklyOpeningHours, DayOpeningHours } from '../domain/store.entity';
import { StoreRepository } from '../ports/store.repository.port';

/**
 * Firestore document structure for Store
 */
interface StoreDocument {
  id: string;
  companyId: string;
  name: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country?: string;
  };
  email?: string;
  phone?: string;
  openingHours: {
    monday?: DayOpeningHours;
    tuesday?: DayOpeningHours;
    wednesday?: DayOpeningHours;
    thursday?: DayOpeningHours;
    friday?: DayOpeningHours;
    saturday?: DayOpeningHours;
    sunday?: DayOpeningHours;
  };
  timezone: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestoreStoreRepository implements StoreRepository {
  private readonly collectionName = 'stores';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore
  ) {}

  /**
   * Saves a Store entity to Firestore
   * Creates a new document if it doesn't exist, updates if it does.
   * 
   * @param store - Store domain entity to save
   * @returns Saved Store entity
   */
  async save(store: Store): Promise<Store> {
    const docRef = this.firestore.collection(this.collectionName).doc(store.id);
    const document = this.toDocument(store);

    await docRef.set(document, { merge: true });

    return store;
  }

  /**
   * Updates a Store entity in Firestore
   * 
   * @param store - Store domain entity to update
   * @returns Updated Store entity
   */
  async update(store: Store): Promise<Store> {
    return this.save(store); // Firestore set with merge handles both create and update
  }

  /**
   * Finds a Store by ID
   * 
   * @param id - Store ID
   * @returns Store entity or null if not found
   */
  async findById(id: string): Promise<Store | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return this.toEntity(doc.id, doc.data() as StoreDocument);
  }

  /**
   * Converts Store domain entity to Firestore document
   * 
   * @param store - Store domain entity
   * @returns Firestore document
   */
  private toDocument(store: Store): StoreDocument {
    return {
      id: store.id,
      companyId: store.companyId,
      name: store.name,
      address: store.address ? {
        street: store.address.street,
        city: store.address.city,
        postalCode: store.address.postalCode,
        country: store.address.country,
      } : undefined,
      email: store.email,
      phone: store.phone,
      openingHours: this.copyOpeningHours(store.openingHours),
      timezone: store.timezone,
      createdAt: this.toTimestamp(store.createdAt),
      updatedAt: this.toTimestamp(store.updatedAt),
    };
  }

  /**
   * Converts Firestore document to Store domain entity
   * 
   * @param id - Document ID
   * @param doc - Firestore document data
   * @returns Store domain entity
   */
  private toEntity(id: string, doc: StoreDocument): Store {
    const address: Address | undefined = doc.address ? {
      street: doc.address.street,
      city: doc.address.city,
      postalCode: doc.address.postalCode,
      country: doc.address.country,
    } : undefined;

    const openingHours: WeeklyOpeningHours = this.copyOpeningHours(doc.openingHours);

    return new Store(
      id,
      doc.companyId,
      doc.name,
      openingHours,
      address,
      doc.email,
      doc.phone,
      doc.timezone,
      this.toDate(doc.createdAt),
      this.toDate(doc.updatedAt)
    );
  }

  /**
   * Deep copies opening hours structure
   * 
   * @param hours - WeeklyOpeningHours to copy
   * @returns Deep copy of opening hours
   */
  private copyOpeningHours(hours: WeeklyOpeningHours): WeeklyOpeningHours {
    const result: any = {};

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
    
    for (const day of days) {
      if (hours[day]) {
        result[day] = {
          isOpen: hours[day]!.isOpen,
          openTime: hours[day]!.openTime,
          closeTime: hours[day]!.closeTime,
        };
      }
    }

    return result as WeeklyOpeningHours;
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

