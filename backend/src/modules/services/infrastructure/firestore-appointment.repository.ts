/**
 * AppointmentRepository Firestore Implementation
 *
 * Firestore adapter for AppointmentRepository port.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { Appointment, AppointmentStatus } from '../domain/appointment.entity';
import {
  AppointmentRepository,
  AppointmentSearchCriteria,
  ConflictSearchParams,
  Pagination,
  Sort,
  PaginatedResult,
} from '../ports/appointment.repository.port';

interface AppointmentDocument {
  id: string;
  storeId: string;
  customerId: string;
  petId: string;
  startAt: FirebaseFirestore.Timestamp;
  endAt: FirebaseFirestore.Timestamp;
  status: AppointmentStatus;
  createdBy?: string;
  staffId?: string;
  notes?: string;
  recurrenceId?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestoreAppointmentRepository implements AppointmentRepository {
  private readonly collectionName = 'appointments';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore,
  ) {}

  async save(appointment: Appointment): Promise<Appointment> {
    const docRef = this.firestore.collection(this.collectionName).doc(appointment.id);
    const document = this.toDocument(appointment);
    await docRef.set(document, { merge: true });
    return appointment;
  }

  async update(appointment: Appointment): Promise<Appointment> {
    return this.save(appointment);
  }

  async findById(id: string): Promise<Appointment | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return null;
    }
    return this.toEntity(doc.id, doc.data() as AppointmentDocument);
  }

  async search(
    criteria: AppointmentSearchCriteria,
    pagination: Pagination,
    sort: Sort,
  ): Promise<PaginatedResult<Appointment>> {
    let query: FirebaseFirestore.Query = this.firestore.collection(this.collectionName);

    // Apply filters
    if (criteria.storeId) {
      query = query.where('storeId', '==', criteria.storeId);
    }

    if (criteria.staffId) {
      query = query.where('staffId', '==', criteria.staffId);
    }

    if (criteria.customerId) {
      query = query.where('customerId', '==', criteria.customerId);
    }

    if (criteria.petId) {
      query = query.where('petId', '==', criteria.petId);
    }

    if (criteria.status) {
      query = query.where('status', '==', criteria.status);
    }

    if (criteria.startDate) {
      query = query.where('startAt', '>=', this.toTimestamp(criteria.startDate));
    }

    if (criteria.endDate) {
      query = query.where('startAt', '<=', this.toTimestamp(criteria.endDate));
    }

    // Get total count (before pagination)
    const countSnapshot = await query.get();
    const total = countSnapshot.size;

    // Apply sorting
    const sortField = sort.field || 'startAt';
    const sortDirection = sort.direction === 'desc' ? 'desc' : 'asc';
    query = query.orderBy(sortField, sortDirection);

    // Apply pagination
    const offset = (pagination.page - 1) * pagination.perPage;
    query = query.limit(pagination.perPage).offset(offset);

    // Execute query
    const snapshot = await query.get();

    // Convert to entities
    const items = snapshot.docs.map((doc) =>
      this.toEntity(doc.id, doc.data() as AppointmentDocument),
    );

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

  async findConflicts(params: ConflictSearchParams): Promise<Appointment[]> {
    const startAt = this.toTimestamp(params.startAt);
    const endAt = this.toTimestamp(params.endAt);

    // Query appointments in the same store that overlap with the time range
    let query: FirebaseFirestore.Query = this.firestore
      .collection(this.collectionName)
      .where('storeId', '==', params.storeId)
      .where('status', '!=', AppointmentStatus.CANCELLED); // Exclude cancelled appointments

    // If staffId is provided, also filter by staff
    if (params.staffId) {
      query = query.where('staffId', '==', params.staffId);
    }

    // Get all appointments that start before the end time and end after the start time
    // This requires fetching and filtering in memory since Firestore doesn't support
    // complex range queries on multiple fields
    const snapshot = await query.get();

    const conflicts = snapshot.docs
      .map((doc) => this.toEntity(doc.id, doc.data() as AppointmentDocument))
      .filter((appointment) => {
        // Exclude the appointment being checked (if provided)
        if (params.excludeId && appointment.id === params.excludeId) {
          return false;
        }

        // Check for time overlap
        const appStart = appointment.startAt.getTime();
        const appEnd = appointment.endAt.getTime();
        const checkStart = params.startAt.getTime();
        const checkEnd = params.endAt.getTime();

        // Overlap occurs if: appStart < checkEnd && appEnd > checkStart
        return appStart < checkEnd && appEnd > checkStart;
      });

    return conflicts;
  }

  private toDocument(appointment: Appointment): AppointmentDocument {
    return {
      id: appointment.id,
      storeId: appointment.storeId,
      customerId: appointment.customerId,
      petId: appointment.petId,
      startAt: this.toTimestamp(appointment.startAt),
      endAt: this.toTimestamp(appointment.endAt),
      status: appointment.status,
      createdBy: appointment.createdBy,
      staffId: appointment.staffId,
      notes: appointment.notes,
      recurrenceId: appointment.recurrenceId,
      createdAt: this.toTimestamp(appointment.createdAt),
      updatedAt: this.toTimestamp(appointment.updatedAt),
    };
  }

  private toEntity(id: string, doc: AppointmentDocument): Appointment {
    return new Appointment(
      id,
      doc.storeId,
      doc.customerId,
      doc.petId,
      this.toDate(doc.startAt),
      this.toDate(doc.endAt),
      doc.status,
      doc.createdBy,
      doc.staffId,
      doc.notes,
      doc.recurrenceId,
      this.toDate(doc.createdAt),
      this.toDate(doc.updatedAt),
    );
  }

  private toTimestamp(date: Date): FirebaseFirestore.Timestamp {
    return FirebaseFirestore.Timestamp.fromDate(date);
  }

  private toDate(timestamp: FirebaseFirestore.Timestamp): Date {
    return timestamp.toDate();
  }
}
