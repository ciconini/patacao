/**
 * CompanyRepository Firestore Implementation
 * 
 * Firestore adapter for CompanyRepository port.
 * This implementation handles persistence of Company domain entities to Firestore.
 * 
 * Responsibilities:
 * - Map Company domain entities to Firestore documents
 * - Map Firestore documents to Company domain entities
 * - Implement repository interface methods
 * - Handle Firestore-specific operations (queries, transactions)
 * 
 * This belongs to the Infrastructure/Adapters layer.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { Company, Address } from '../domain/company.entity';
import { CompanyRepository } from '../ports/company.repository.port';

/**
 * Firestore document structure for Company
 */
interface CompanyDocument {
  id: string;
  name: string;
  nif: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country?: string;
  };
  taxRegime: string;
  defaultVatRate?: number;
  phone?: string;
  email?: string;
  website?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestoreCompanyRepository implements CompanyRepository {
  private readonly collectionName = 'companies';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore
  ) {}

  /**
   * Saves a Company entity to Firestore
   * Creates a new document if it doesn't exist, updates if it does.
   * 
   * @param company - Company domain entity to save
   * @returns Saved Company entity
   */
  async save(company: Company): Promise<Company> {
    const docRef = this.firestore.collection(this.collectionName).doc(company.id);
    const document = this.toDocument(company);

    await docRef.set(document, { merge: true });

    return company;
  }

  /**
   * Updates a Company entity in Firestore
   * 
   * @param company - Company domain entity to update
   * @returns Updated Company entity
   */
  async update(company: Company): Promise<Company> {
    return this.save(company); // Firestore set with merge handles both create and update
  }

  /**
   * Finds a Company by NIF
   * 
   * @param nif - NIF to search for
   * @returns Company entity or null if not found
   */
  async findByNif(nif: string): Promise<Company | null> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('nif', '==', nif.trim())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return this.toEntity(doc.id, doc.data() as CompanyDocument);
  }

  /**
   * Finds a Company by ID
   * 
   * @param id - Company ID
   * @returns Company entity or null if not found
   */
  async findById(id: string): Promise<Company | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return this.toEntity(doc.id, doc.data() as CompanyDocument);
  }

  /**
   * Converts Company domain entity to Firestore document
   * 
   * @param company - Company domain entity
   * @returns Firestore document
   */
  private toDocument(company: Company): CompanyDocument {
    return {
      id: company.id,
      name: company.name,
      nif: company.nif,
      address: {
        street: company.address.street,
        city: company.address.city,
        postalCode: company.address.postalCode,
        country: company.address.country,
      },
      taxRegime: company.taxRegime,
      defaultVatRate: company.defaultVatRate,
      phone: company.phone,
      email: company.email,
      website: company.website,
      createdAt: this.toTimestamp(company.createdAt),
      updatedAt: this.toTimestamp(company.updatedAt),
    };
  }

  /**
   * Converts Firestore document to Company domain entity
   * 
   * @param id - Document ID
   * @param doc - Firestore document data
   * @returns Company domain entity
   */
  private toEntity(id: string, doc: CompanyDocument): Company {
    const address: Address = {
      street: doc.address.street,
      city: doc.address.city,
      postalCode: doc.address.postalCode,
      country: doc.address.country,
    };

    return new Company(
      id,
      doc.name,
      doc.nif,
      address,
      doc.taxRegime,
      doc.defaultVatRate,
      doc.phone,
      doc.email,
      doc.website,
      this.toDate(doc.createdAt),
      this.toDate(doc.updatedAt)
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

