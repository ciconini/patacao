/**
 * PurchaseOrderRepository Firestore Implementation
 * 
 * Firestore adapter for PurchaseOrderRepository port.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { PurchaseOrder, PurchaseOrderStatus, PurchaseOrderLine } from '../domain/purchase-order.entity';
import { PurchaseOrderRepository } from '../ports/purchase-order.repository.port';

interface PurchaseOrderDocument {
  id: string;
  supplierId: string;
  storeId?: string;
  orderLines: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  status: PurchaseOrderStatus;
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestorePurchaseOrderRepository implements PurchaseOrderRepository {
  private readonly collectionName = 'purchase_orders';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore
  ) {}

  async save(purchaseOrder: PurchaseOrder): Promise<PurchaseOrder> {
    const docRef = this.firestore.collection(this.collectionName).doc(purchaseOrder.id);
    const document = this.toDocument(purchaseOrder);
    await docRef.set(document, { merge: true });
    return purchaseOrder;
  }

  async update(purchaseOrder: PurchaseOrder): Promise<PurchaseOrder> {
    return this.save(purchaseOrder);
  }

  async findById(id: string): Promise<PurchaseOrder | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return null;
    }
    return this.toEntity(doc.id, doc.data() as PurchaseOrderDocument);
  }

  private toDocument(po: PurchaseOrder): PurchaseOrderDocument {
    return {
      id: po.id,
      supplierId: po.supplierId,
      storeId: po.storeId,
      orderLines: po.orderLines.map(line => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
      status: po.status,
      createdBy: po.createdBy,
      createdAt: this.toTimestamp(po.createdAt),
      updatedAt: this.toTimestamp(po.updatedAt),
    };
  }

  private toEntity(id: string, doc: PurchaseOrderDocument): PurchaseOrder {
    const orderLines: PurchaseOrderLine[] = doc.orderLines.map(line => ({
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    }));

    return new PurchaseOrder(
      id,
      doc.supplierId,
      doc.createdBy,
      orderLines,
      doc.storeId,
      doc.status,
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

