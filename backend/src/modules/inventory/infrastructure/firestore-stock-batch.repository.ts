/**
 * StockBatchRepository Firestore Implementation
 *
 * Firestore adapter for StockBatchRepository port.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { StockBatch } from '../domain/stock-batch.entity';
import { StockBatchRepository } from '../ports/stock-batch.repository.port';

interface StockBatchDocument {
  id: string;
  productId: string;
  batchNumber?: string;
  quantity: number;
  expiryDate?: FirebaseFirestore.Timestamp;
  receivedAt: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestoreStockBatchRepository implements StockBatchRepository {
  private readonly collectionName = 'stock_batches';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore,
  ) {}

  async createOrIncrement(params: {
    productId: string;
    batchNumber?: string;
    quantity: number;
    expiryDate?: Date;
    receivedAt: Date;
  }): Promise<StockBatch> {
    // Try to find existing batch
    let existingBatch: StockBatch | null = null;

    if (params.batchNumber) {
      existingBatch = await this.findByProductAndBatch(params.productId, params.batchNumber);
    }

    if (existingBatch) {
      // Increment existing batch
      existingBatch.increaseQuantity(params.quantity);
      const docRef = this.firestore.collection(this.collectionName).doc(existingBatch.id);
      await docRef.update({
        quantity: existingBatch.quantity,
        updatedAt: this.toTimestamp(new Date()),
      });
      return existingBatch;
    } else {
      // Create new batch
      const id = this.generateId();
      const batch = new StockBatch(
        id,
        params.productId,
        params.receivedAt,
        params.quantity,
        params.batchNumber,
        params.expiryDate,
      );

      const docRef = this.firestore.collection(this.collectionName).doc(id);
      const document = this.toDocument(batch);
      await docRef.set(document);

      return batch;
    }
  }

  async findByProductAndBatch(productId: string, batchNumber: string): Promise<StockBatch | null> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('productId', '==', productId)
      .where('batchNumber', '==', batchNumber)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return this.toEntity(doc.id, doc.data() as StockBatchDocument);
  }

  async findByProduct(productId: string): Promise<StockBatch[]> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('productId', '==', productId)
      .get();

    return snapshot.docs.map((doc) => this.toEntity(doc.id, doc.data() as StockBatchDocument));
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private toDocument(batch: StockBatch): StockBatchDocument {
    return {
      id: batch.id,
      productId: batch.productId,
      batchNumber: batch.batchNumber,
      quantity: batch.quantity,
      expiryDate: batch.expiryDate ? this.toTimestamp(batch.expiryDate) : undefined,
      receivedAt: this.toTimestamp(batch.receivedAt),
      createdAt: this.toTimestamp(batch.createdAt),
      updatedAt: this.toTimestamp(batch.updatedAt),
    };
  }

  private toEntity(id: string, doc: StockBatchDocument): StockBatch {
    return new StockBatch(
      id,
      doc.productId,
      this.toDate(doc.receivedAt),
      doc.quantity,
      doc.batchNumber,
      doc.expiryDate ? this.toDate(doc.expiryDate) : undefined,
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
