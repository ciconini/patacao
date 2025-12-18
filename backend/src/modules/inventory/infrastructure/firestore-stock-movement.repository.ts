/**
 * StockMovementRepository Firestore Implementation
 *
 * Firestore adapter for StockMovementRepository port.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { StockMovement, StockMovementReason } from '../domain/stock-movement.entity';
import {
  StockMovementRepository,
  StockMovementSearchCriteria,
  Pagination,
  Sort,
  PaginatedResult,
} from '../ports/stock-movement.repository.port';

interface StockMovementDocument {
  id: string;
  productId: string;
  batchId?: string;
  quantityChange: number;
  reason: StockMovementReason;
  performedBy: string;
  locationId: string;
  referenceId?: string;
  createdAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestoreStockMovementRepository implements StockMovementRepository {
  private readonly collectionName = 'stock_movements';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore,
  ) {}

  async save(movement: StockMovement): Promise<StockMovement> {
    const docRef = this.firestore.collection(this.collectionName).doc(movement.id);
    const document = this.toDocument(movement);
    await docRef.set(document);
    return movement;
  }

  async search(
    criteria: StockMovementSearchCriteria,
    pagination: Pagination,
    sort: Sort,
  ): Promise<PaginatedResult<StockMovement>> {
    let query: FirebaseFirestore.Query = this.firestore.collection(this.collectionName);

    // Apply filters
    if (criteria.productId) {
      query = query.where('productId', '==', criteria.productId);
    }

    if (criteria.locationId) {
      query = query.where('locationId', '==', criteria.locationId);
    }

    if (criteria.reason) {
      query = query.where('reason', '==', criteria.reason);
    }

    if (criteria.startDate) {
      query = query.where('createdAt', '>=', this.toTimestamp(criteria.startDate));
    }

    if (criteria.endDate) {
      query = query.where('createdAt', '<=', this.toTimestamp(criteria.endDate));
    }

    // Get total count (before pagination)
    const countSnapshot = await query.get();
    const total = countSnapshot.size;

    // Apply sorting
    const sortField = sort.field || 'createdAt';
    const sortDirection = sort.direction === 'desc' ? 'desc' : 'asc';
    query = query.orderBy(sortField, sortDirection);

    // Apply pagination
    const offset = (pagination.page - 1) * pagination.perPage;
    query = query.limit(pagination.perPage).offset(offset);

    // Execute query
    const snapshot = await query.get();

    // Convert to entities
    const items = snapshot.docs.map((doc) =>
      this.toEntity(doc.id, doc.data() as StockMovementDocument),
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

  private toDocument(movement: StockMovement): StockMovementDocument {
    return {
      id: movement.id,
      productId: movement.productId,
      batchId: movement.batchId,
      quantityChange: movement.quantityChange,
      reason: movement.reason,
      performedBy: movement.performedBy,
      locationId: movement.locationId,
      referenceId: movement.referenceId,
      createdAt: this.toTimestamp(movement.createdAt),
    };
  }

  private toEntity(id: string, doc: StockMovementDocument): StockMovement {
    return new StockMovement(
      id,
      doc.productId,
      doc.quantityChange,
      doc.reason,
      doc.performedBy,
      doc.locationId,
      doc.batchId,
      doc.referenceId,
      this.toDate(doc.createdAt),
    );
  }

  private toTimestamp(date: Date): FirebaseFirestore.Timestamp {
    return FirebaseFirestore.Timestamp.fromDate(date);
  }

  private toDate(timestamp: FirebaseFirestore.Timestamp): Date {
    return timestamp.toDate();
  }
}
