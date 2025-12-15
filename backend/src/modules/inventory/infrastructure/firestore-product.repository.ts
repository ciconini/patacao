/**
 * ProductRepository Firestore Implementation
 * 
 * Firestore adapter for ProductRepository port.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { Product } from '../domain/product.entity';
import {
  ProductRepository,
  ProductSearchCriteria,
  Pagination,
  Sort,
  PaginatedResult,
} from '../ports/product.repository.port';

interface ProductDocument {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unitPrice: number;
  vatRate: number;
  stockTracked: boolean;
  reorderThreshold?: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

// Separate collection for stock tracking
interface ProductStockDocument {
  productId: string;
  locationId?: string;
  onHand: number;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestoreProductRepository implements ProductRepository {
  private readonly collectionName = 'products';
  private readonly stockCollectionName = 'product_stock';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore
  ) {}

  async save(product: Product): Promise<Product> {
    const docRef = this.firestore.collection(this.collectionName).doc(product.id);
    const document = this.toDocument(product);
    await docRef.set(document, { merge: true });
    return product;
  }

  async update(product: Product): Promise<Product> {
    return this.save(product);
  }

  async findById(id: string): Promise<Product | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return null;
    }
    return this.toEntity(doc.id, doc.data() as ProductDocument);
  }

  async findBySku(sku: string): Promise<Product | null> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('sku', '==', sku.trim())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return this.toEntity(doc.id, doc.data() as ProductDocument);
  }

  async search(
    criteria: ProductSearchCriteria,
    pagination: Pagination,
    sort: Sort
  ): Promise<PaginatedResult<Product>> {
    let query: FirebaseFirestore.Query = this.firestore.collection(this.collectionName);

    // Apply filters
    if (criteria.stockTracked !== undefined) {
      query = query.where('stockTracked', '==', criteria.stockTracked);
    }

    if (criteria.category) {
      query = query.where('category', '==', criteria.category);
    }

    // Get total count (before pagination)
    const countSnapshot = await query.get();
    let allProducts = countSnapshot.docs.map(doc => 
      this.toEntity(doc.id, doc.data() as ProductDocument)
    );

    // Apply text search if specified (client-side filtering)
    if (criteria.q) {
      const searchTerm = criteria.q.toLowerCase();
      allProducts = allProducts.filter(product => 
        product.sku.toLowerCase().includes(searchTerm) ||
        product.name.toLowerCase().includes(searchTerm) ||
        (product.description && product.description.toLowerCase().includes(searchTerm))
      );
    }

    const total = allProducts.length;

    // Apply sorting
    const sortField = sort.field || 'name';
    const sortDirection = sort.direction === 'desc' ? -1 : 1;
    allProducts.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'sku':
          aVal = a.sku;
          bVal = b.sku;
          break;
        case 'category':
          aVal = a.category || '';
          bVal = b.category || '';
          break;
        case 'unitPrice':
          aVal = a.unitPrice;
          bVal = b.unitPrice;
          break;
        default:
          aVal = a.name;
          bVal = b.name;
      }

      if (aVal < bVal) return -1 * sortDirection;
      if (aVal > bVal) return 1 * sortDirection;
      return 0;
    });

    // Apply pagination
    const offset = (pagination.page - 1) * pagination.perPage;
    const items = allProducts.slice(offset, offset + pagination.perPage);

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

  async getOnHand(productId: string, locationId?: string): Promise<number> {
    if (locationId) {
      // Get stock for specific location
      const stockKey = `${productId}_${locationId}`;
      const stockDoc = await this.firestore
        .collection(this.stockCollectionName)
        .doc(stockKey)
        .get();

      if (stockDoc.exists) {
        const data = stockDoc.data() as ProductStockDocument;
        return data.onHand || 0;
      }
      return 0;
    } else {
      // Aggregate stock across all locations
      const snapshot = await this.firestore
        .collection(this.stockCollectionName)
        .where('productId', '==', productId)
        .get();

      return snapshot.docs.reduce((sum, doc) => {
        const data = doc.data() as ProductStockDocument;
        return sum + (data.onHand || 0);
      }, 0);
    }
  }

  async updateOnHand(productId: string, delta: number): Promise<void> {
    // For simplicity, we'll update a default location
    // In production, you might want to track by location
    const stockKey = `${productId}_default`;
    const stockRef = this.firestore.collection(this.stockCollectionName).doc(stockKey);

    await this.firestore.runTransaction(async (transaction) => {
      const stockDoc = await transaction.get(stockRef);
      const currentStock = stockDoc.exists ? (stockDoc.data()?.onHand || 0) : 0;
      const newStock = currentStock + delta;

      if (stockDoc.exists) {
        transaction.update(stockRef, {
          onHand: newStock,
          updatedAt: this.toTimestamp(new Date()),
        });
      } else {
        transaction.set(stockRef, {
          productId,
          locationId: 'default',
          onHand: newStock,
          updatedAt: this.toTimestamp(new Date()),
        });
      }
    });
  }

  async checkStock(productId: string, quantity: number): Promise<boolean> {
    const onHand = await this.getOnHand(productId);
    return onHand >= quantity;
  }

  async decrementStock(productId: string, quantity: number): Promise<void> {
    await this.updateOnHand(productId, -quantity);
  }

  async calculateCurrentStock(productId: string): Promise<number> {
    // Calculate from stock movements
    const snapshot = await this.firestore
      .collection('stock_movements')
      .where('productId', '==', productId)
      .get();

    return snapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      return sum + (data.quantityChange || 0);
    }, 0);
  }

  private toDocument(product: Product): ProductDocument {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      unitPrice: product.unitPrice,
      vatRate: product.vatRate,
      stockTracked: product.stockTracked,
      reorderThreshold: product.reorderThreshold,
      createdAt: this.toTimestamp(product.createdAt),
      updatedAt: this.toTimestamp(product.updatedAt),
    };
  }

  private toEntity(id: string, doc: ProductDocument): Product {
    return new Product(
      id,
      doc.sku,
      doc.name,
      doc.unitPrice,
      doc.vatRate,
      doc.stockTracked,
      doc.description,
      doc.category,
      doc.reorderThreshold,
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

