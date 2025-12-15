/**
 * InventoryReservationRepository Firestore Implementation
 * 
 * Firestore adapter for InventoryReservationRepository port.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { InventoryReservation } from '../domain/inventory-reservation.entity';
import { InventoryReservationRepository } from '../ports/inventory-reservation.repository.port';

interface InventoryReservationDocument {
  id: string;
  productId: string;
  quantity: number;
  reservedFor: string;
  expiresAt?: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestoreInventoryReservationRepository implements InventoryReservationRepository {
  private readonly collectionName = 'inventory_reservations';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore
  ) {}

  async save(reservation: InventoryReservation): Promise<InventoryReservation> {
    const docRef = this.firestore.collection(this.collectionName).doc(reservation.id);
    const document = this.toDocument(reservation);
    await docRef.set(document, { merge: true });
    return reservation;
  }

  async update(reservation: InventoryReservation): Promise<InventoryReservation> {
    return this.save(reservation);
  }

  async findById(id: string): Promise<InventoryReservation | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return null;
    }
    return this.toEntity(doc.id, doc.data() as InventoryReservationDocument);
  }

  async findByProduct(productId: string): Promise<InventoryReservation[]> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('productId', '==', productId)
      .get();

    return snapshot.docs.map(doc => 
      this.toEntity(doc.id, doc.data() as InventoryReservationDocument)
    );
  }

  async findByAppointmentId(appointmentId: string): Promise<InventoryReservation[]> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('reservedFor', '==', appointmentId)
      .get();

    return snapshot.docs.map(doc => 
      this.toEntity(doc.id, doc.data() as InventoryReservationDocument)
    );
  }

  async delete(id: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    await docRef.delete();
  }

  private toDocument(reservation: InventoryReservation): InventoryReservationDocument {
    return {
      id: reservation.id,
      productId: reservation.productId,
      quantity: reservation.quantity,
      reservedFor: reservation.reservedFor,
      expiresAt: reservation.expiresAt ? this.toTimestamp(reservation.expiresAt) : undefined,
      createdAt: this.toTimestamp(reservation.createdAt),
    };
  }

  private toEntity(id: string, doc: InventoryReservationDocument): InventoryReservation {
    return new InventoryReservation(
      id,
      doc.productId,
      doc.quantity,
      doc.reservedFor,
      doc.expiresAt ? this.toDate(doc.expiresAt) : undefined,
      this.toDate(doc.createdAt)
    );
  }

  private toTimestamp(date: Date): FirebaseFirestore.Timestamp {
    return FirebaseFirestore.Timestamp.fromDate(date);
  }

  private toDate(timestamp: FirebaseFirestore.Timestamp): Date {
    return timestamp.toDate();
  }
}

