/**
 * ServiceRepository Firestore Implementation
 *
 * Firestore adapter for ServiceRepository port.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { Service, ConsumedItem } from '../domain/service.entity';
import { ServiceRepository } from '../ports/service.repository.port';

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
