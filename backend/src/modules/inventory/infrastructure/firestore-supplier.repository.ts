/**
 * SupplierRepository Firestore Implementation
 * 
 * Firestore adapter for SupplierRepository port.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { Supplier } from '../domain/supplier.entity';
import { SupplierRepository } from '../ports/supplier.repository.port';

interface SupplierDocument {
  id: string;
  name: string;
  contactEmail?: string;
  phone?: string;
  defaultLeadTimeDays?: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestoreSupplierRepository implements SupplierRepository {
  private readonly collectionName = 'suppliers';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore
  ) {}

  async save(supplier: Supplier): Promise<Supplier> {
    const docRef = this.firestore.collection(this.collectionName).doc(supplier.id);
    const document = this.toDocument(supplier);
    await docRef.set(document, { merge: true });
    return supplier;
  }

  async findById(id: string): Promise<Supplier | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return null;
    }
    return this.toEntity(doc.id, doc.data() as SupplierDocument);
  }

  private toDocument(supplier: Supplier): SupplierDocument {
    return {
      id: supplier.id,
      name: supplier.name,
      contactEmail: supplier.contactEmail,
      phone: supplier.phone,
      defaultLeadTimeDays: supplier.defaultLeadTimeDays,
      createdAt: this.toTimestamp(supplier.createdAt),
      updatedAt: this.toTimestamp(supplier.updatedAt),
    };
  }

  private toEntity(id: string, doc: SupplierDocument): Supplier {
    return new Supplier(
      id,
      doc.name,
      doc.contactEmail,
      doc.phone,
      doc.defaultLeadTimeDays,
      this.toDate(doc.createdAt),
      this.toDate(doc.updatedAt)
    );
  }

  private toTimestamp(date: Date): FirebaseFirestore.Timestamp {
    return FirebaseFirestore.Timestamp.fromDate(date);
  }

  private toDate(timestamp: FirebaseFirestore.Timestamp): Date {
    return timestamp.toDate();
  }
}

