/**
 * AppointmentServiceLineRepository Firestore Implementation
 * 
 * Firestore adapter for AppointmentServiceLineRepository port.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { AppointmentServiceLine } from '../domain/appointment-service-line.entity';
import { AppointmentServiceLineRepository } from '../ports/appointment-service-line.repository.port';

interface AppointmentServiceLineDocument {
  id: string;
  appointmentId: string;
  serviceId: string;
  quantity: number;
  priceOverride?: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestoreAppointmentServiceLineRepository implements AppointmentServiceLineRepository {
  private readonly collectionName = 'appointment_service_lines';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore
  ) {}

  async saveLines(appointmentId: string, lines: AppointmentServiceLine[]): Promise<AppointmentServiceLine[]> {
    // Delete existing lines for this appointment
    const existingSnapshot = await this.firestore
      .collection(this.collectionName)
      .where('appointmentId', '==', appointmentId)
      .get();

    const batch = this.firestore.batch();
    existingSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Add new lines
    lines.forEach(line => {
      const docRef = this.firestore.collection(this.collectionName).doc(line.id);
      const document = this.toDocument(line);
      batch.set(docRef, document);
    });

    await batch.commit();
    return lines;
  }

  async findByAppointmentId(appointmentId: string): Promise<Array<{
    serviceId: string;
    quantity: number;
  }>> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('appointmentId', '==', appointmentId)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data() as AppointmentServiceLineDocument;
      return {
        serviceId: data.serviceId,
        quantity: data.quantity,
      };
    });
  }

  private toDocument(line: AppointmentServiceLine): AppointmentServiceLineDocument {
    return {
      id: line.id,
      appointmentId: line.appointmentId,
      serviceId: line.serviceId,
      quantity: line.quantity,
      priceOverride: line.priceOverride,
      createdAt: this.toTimestamp(line.createdAt),
      updatedAt: this.toTimestamp(line.updatedAt),
    };
  }

  private toEntity(id: string, doc: AppointmentServiceLineDocument): AppointmentServiceLine {
    return new AppointmentServiceLine(
      id,
      doc.appointmentId,
      doc.serviceId,
      doc.quantity,
      doc.priceOverride,
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

