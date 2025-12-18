/**
 * ServiceRepository Firestore Implementation
 *
 * Firestore adapter for ServiceRepository port.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { Service, ConsumedItem } from '../domain/service.entity';
import {
  ServiceRepository,
  ServiceSearchCriteria,
  Pagination,
  Sort,
  PaginatedResult,
} from '../ports/service.repository.port';

interface ServiceDocument {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  requiredResources: string[];
  consumesInventory: boolean;
  consumedItems: Array<{
    productId: string;
    quantity: number;
  }>;
  tags: string[];
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestoreServiceRepository implements ServiceRepository {
  private readonly collectionName = 'services';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore,
  ) {}

  async save(service: Service): Promise<Service> {
    const docRef = this.firestore.collection(this.collectionName).doc(service.id);
    const document = this.toDocument(service);
    await docRef.set(document, { merge: true });
    return service;
  }

  async findById(id: string): Promise<Service | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return null;
    }
    return this.toEntity(doc.id, doc.data() as ServiceDocument);
  }

  async update(service: Service): Promise<Service> {
    return this.save(service); // Firestore set with merge handles both create and update
  }

  async search(
    criteria: ServiceSearchCriteria,
    pagination: Pagination,
    sort: Sort,
  ): Promise<PaginatedResult<Service>> {
    let query: FirebaseFirestore.Query = this.firestore.collection(this.collectionName);

    // Apply filters
    if (criteria.consumesInventory !== undefined) {
      query = query.where('consumesInventory', '==', criteria.consumesInventory);
    }

    if (criteria.tag) {
      query = query.where('tags', 'array-contains', criteria.tag);
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

    let items = snapshot.docs.map((doc) => this.toEntity(doc.id, doc.data() as ServiceDocument));

    // Filter by general query if provided (client-side filtering for text search)
    if (criteria.q) {
      const searchTerm = criteria.q.toLowerCase();
      items = items.filter((service) => {
        return (
          service.name.toLowerCase().includes(searchTerm) ||
          (service.description && service.description.toLowerCase().includes(searchTerm)) ||
          service.tags.some((tag) => tag.toLowerCase().includes(searchTerm))
        );
      });
    }

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

  async delete(id: string): Promise<void> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    await docRef.delete();
  }

  private toDocument(service: Service): ServiceDocument {
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      price: service.price,
      requiredResources: [...service.requiredResources],
      consumesInventory: service.consumesInventory,
      consumedItems: service.consumedItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      tags: [...service.tags],
      createdAt: this.toTimestamp(service.createdAt),
      updatedAt: this.toTimestamp(service.updatedAt),
    };
  }

  private toEntity(id: string, doc: ServiceDocument): Service {
    const consumedItems: ConsumedItem[] = doc.consumedItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    return new Service(
      id,
      doc.name,
      doc.durationMinutes,
      doc.price,
      doc.description,
      doc.requiredResources,
      doc.consumesInventory,
      consumedItems,
      doc.tags,
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
