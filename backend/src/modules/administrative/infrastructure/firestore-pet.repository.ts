/**
 * PetRepository Firestore Implementation
 *
 * Firestore adapter for PetRepository port.
 * This implementation handles persistence of Pet domain entities to Firestore.
 *
 * Responsibilities:
 * - Map Pet domain entities to Firestore documents
 * - Map Firestore documents to Pet domain entities
 * - Implement repository interface methods
 * - Handle Firestore-specific operations (queries, transactions)
 *
 * This belongs to the Infrastructure/Adapters layer.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { Pet, VaccinationRecord } from '../domain/pet.entity';
import {
  PetRepository,
  PetSearchCriteria,
  Pagination,
  Sort,
  PaginatedResult,
} from '../ports/pet.repository.port';

/**
 * Firestore document structure for Pet
 */
interface PetDocument {
  id: string;
  customerId: string;
  name: string;
  species?: string;
  breed?: string;
  dateOfBirth?: FirebaseFirestore.Timestamp;
  microchipId?: string;
  medicalNotes?: string;
  vaccinationRecords: Array<{
    vaccineType: string;
    administeredDate: FirebaseFirestore.Timestamp;
    nextDueDate?: FirebaseFirestore.Timestamp;
    veterinarian?: string;
    batchNumber?: string;
  }>;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestorePetRepository implements PetRepository {
  private readonly collectionName = 'pets';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore,
  ) {}

  /**
   * Saves a Pet entity to Firestore
   * Creates a new document if it doesn't exist, updates if it does.
   *
   * @param pet - Pet domain entity to save
   * @returns Saved Pet entity
   */
  async save(pet: Pet): Promise<Pet> {
    const docRef = this.firestore.collection(this.collectionName).doc(pet.id);
    const document = this.toDocument(pet);

    await docRef.set(document, { merge: true });

    return pet;
  }

  /**
   * Finds a Pet by ID
   *
   * @param id - Pet ID
   * @returns Pet entity or null if not found
   */
  async findById(id: string): Promise<Pet | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return this.toEntity(doc.id, doc.data() as PetDocument);
  }

  /**
   * Updates a Pet entity in Firestore
   *
   * @param pet - Pet domain entity to update
   * @returns Updated Pet entity
   */
  async update(pet: Pet): Promise<Pet> {
    return this.save(pet); // Firestore set with merge handles both create and update
  }

  /**
   * Counts pets by customer ID
   *
   * @param customerId - Customer ID
   * @returns Number of pets for the customer
   */
  async countByCustomerId(customerId: string): Promise<number> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('customerId', '==', customerId)
      .count()
      .get();

    return snapshot.data().count;
  }

  /**
   * Searches for pets with pagination
   *
   * @param criteria - Search criteria
   * @param pagination - Pagination parameters
   * @param sort - Sort parameters
   * @returns Paginated result of pets
   */
  async search(
    criteria: PetSearchCriteria,
    pagination: Pagination,
    sort: Sort,
  ): Promise<PaginatedResult<Pet>> {
    let query: FirebaseFirestore.Query = this.firestore.collection(this.collectionName);

    // Apply filters
    if (criteria.customerId) {
      query = query.where('customerId', '==', criteria.customerId);
    }

    if (criteria.species) {
      query = query.where('species', '==', criteria.species);
    }

    if (criteria.breed) {
      query = query.where('breed', '==', criteria.breed);
    }

    // Get total count (before pagination and sorting for efficiency)
    const countSnapshot = await query.get();
    const total = countSnapshot.size;

    // Apply sorting
    const sortField = sort.field || 'createdAt';
    const sortDirection = sort.direction === 'desc' ? 'desc' : 'asc';
    query = query.orderBy(sortField, sortDirection);

    // Apply pagination
    const page = pagination.page || 1;
    const perPage = pagination.perPage || 20;
    const offset = (page - 1) * perPage;

    query = query.limit(perPage).offset(offset);

    // Execute query
    const snapshot = await query.get();

    const items = snapshot.docs.map((doc) => this.toEntity(doc.id, doc.data() as PetDocument));

    const totalPages = Math.ceil(total / perPage);

    return {
      items,
      meta: {
        total,
        page,
        perPage,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Deletes a Pet entity
   *
   * @param id - Pet ID
   */
  async delete(id: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    await docRef.delete();
  }

  /**
   * Converts Pet domain entity to Firestore document
   *
   * @param pet - Pet domain entity
   * @returns Firestore document
   */
  private toDocument(pet: Pet): PetDocument {
    return {
      id: pet.id,
      customerId: pet.customerId,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      dateOfBirth: pet.dateOfBirth ? this.toTimestamp(pet.dateOfBirth) : undefined,
      microchipId: pet.microchipId,
      medicalNotes: pet.medicalNotes,
      vaccinationRecords: pet.vaccinationRecords.map((record) => ({
        vaccineType: record.vaccineType,
        administeredDate: this.toTimestamp(record.administeredDate),
        nextDueDate: record.nextDueDate ? this.toTimestamp(record.nextDueDate) : undefined,
        veterinarian: record.veterinarian,
        batchNumber: record.batchNumber,
      })),
      createdAt: this.toTimestamp(pet.createdAt),
      updatedAt: this.toTimestamp(pet.updatedAt),
    };
  }

  /**
   * Converts Firestore document to Pet domain entity
   *
   * @param id - Document ID
   * @param doc - Firestore document data
   * @returns Pet domain entity
   */
  private toEntity(id: string, doc: PetDocument): Pet {
    const vaccinationRecords: VaccinationRecord[] = doc.vaccinationRecords.map((record) => ({
      vaccineType: record.vaccineType,
      administeredDate: this.toDate(record.administeredDate),
      nextDueDate: record.nextDueDate ? this.toDate(record.nextDueDate) : undefined,
      veterinarian: record.veterinarian,
      batchNumber: record.batchNumber,
    }));

    return new Pet(
      id,
      doc.customerId,
      doc.name,
      doc.species,
      doc.breed,
      doc.dateOfBirth ? this.toDate(doc.dateOfBirth) : undefined,
      doc.microchipId,
      doc.medicalNotes,
      vaccinationRecords,
      this.toDate(doc.createdAt),
      this.toDate(doc.updatedAt),
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
