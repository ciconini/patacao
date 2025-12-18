/**
 * TransactionRepository Firestore Implementation
 *
 * Firestore adapter for TransactionRepository port.
 * This implementation handles persistence of Transaction domain entities to Firestore.
 *
 * Responsibilities:
 * - Map Transaction domain entities to Firestore documents
 * - Map Firestore documents to Transaction domain entities
 * - Implement repository interface methods
 * - Handle Firestore-specific operations (queries, transactions)
 *
 * This belongs to the Infrastructure/Adapters layer.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { Transaction, PaymentStatus, TransactionLineItem } from '../domain/transaction.entity';
import { TransactionRepository } from '../ports/transaction.repository.port';

/**
 * Firestore document structure for Transaction
 */
interface TransactionDocument {
  id: string;
  storeId: string;
  invoiceId: string;
  lineItems: Array<{
    productId?: string;
    serviceId?: string;
    quantity: number;
    unitPrice: number;
    description?: string;
  }>;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestoreTransactionRepository implements TransactionRepository {
  private readonly collectionName = 'transactions';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore,
  ) {}

  /**
   * Saves a Transaction entity to Firestore
   * Creates a new document if it doesn't exist, updates if it does.
   *
   * @param transaction - Transaction domain entity to save
   * @returns Saved Transaction entity
   */
  async save(transaction: Transaction): Promise<Transaction> {
    const docRef = this.firestore.collection(this.collectionName).doc(transaction.id);
    const document = this.toDocument(transaction);

    await docRef.set(document, { merge: true });

    return transaction;
  }

  /**
   * Updates a Transaction entity in Firestore
   *
   * @param transaction - Transaction domain entity to update
   * @returns Updated Transaction entity
   */
  async update(transaction: Transaction): Promise<Transaction> {
    return this.save(transaction); // Firestore set with merge handles both create and update
  }

  /**
   * Finds a Transaction by ID
   *
   * @param id - Transaction ID
   * @returns Transaction entity or null if not found
   */
  async findById(id: string): Promise<Transaction | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return this.toEntity(doc.id, doc.data() as TransactionDocument);
  }

  /**
   * Finds transactions by invoice ID
   *
   * @param invoiceId - Invoice ID
   * @returns Array of transactions (with minimal fields)
   */
  async findByInvoiceId(invoiceId: string): Promise<Array<{ id: string; status: string }>> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('invoiceId', '==', invoiceId)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data() as TransactionDocument;
      return {
        id: doc.id,
        status: data.paymentStatus,
      };
    });
  }

  /**
   * Finds transactions by company and period
   * Note: This requires joining with invoices to get companyId
   * For efficiency, we'll query by invoiceId and filter by period
   *
   * @param companyId - Company ID
   * @param start - Start date of period
   * @param end - End date of period
   * @returns Array of transactions
   */
  async findByCompanyAndPeriod(companyId: string, start: Date, end: Date): Promise<Transaction[]> {
    // First, get all invoices for the company in the period
    const invoiceRepo = this.firestore.collection('invoices');
    const invoiceSnapshot = await invoiceRepo
      .where('companyId', '==', companyId)
      .where('issuedAt', '>=', this.toTimestamp(start))
      .where('issuedAt', '<=', this.toTimestamp(end))
      .get();

    const invoiceIds = invoiceSnapshot.docs.map((doc) => doc.id);

    if (invoiceIds.length === 0) {
      return [];
    }

    // Then, get all transactions for those invoices
    // Note: Firestore 'in' queries are limited to 10 items, so we need to batch
    const transactions: Transaction[] = [];
    const batchSize = 10;

    for (let i = 0; i < invoiceIds.length; i += batchSize) {
      const batch = invoiceIds.slice(i, i + batchSize);
      const transactionSnapshot = await this.firestore
        .collection(this.collectionName)
        .where('invoiceId', 'in', batch)
        .get();

      transactionSnapshot.docs.forEach((doc) => {
        transactions.push(this.toEntity(doc.id, doc.data() as TransactionDocument));
      });
    }

    return transactions;
  }

  /**
   * Converts Transaction domain entity to Firestore document
   *
   * @param transaction - Transaction domain entity
   * @returns Firestore document
   */
  private toDocument(transaction: Transaction): TransactionDocument {
    return {
      id: transaction.id,
      storeId: transaction.storeId,
      invoiceId: transaction.invoiceId,
      lineItems: transaction.lineItems.map((item) => ({
        productId: item.productId,
        serviceId: item.serviceId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        description: item.description,
      })),
      totalAmount: transaction.totalAmount,
      paymentStatus: transaction.paymentStatus,
      createdBy: transaction.createdBy,
      createdAt: this.toTimestamp(transaction.createdAt),
      updatedAt: this.toTimestamp(transaction.updatedAt),
    };
  }

  /**
   * Converts Firestore document to Transaction domain entity
   *
   * @param id - Document ID
   * @param doc - Firestore document data
   * @returns Transaction domain entity
   */
  private toEntity(id: string, doc: TransactionDocument): Transaction {
    const lineItems: TransactionLineItem[] = doc.lineItems.map((item) => ({
      productId: item.productId,
      serviceId: item.serviceId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      description: item.description,
    }));

    return new Transaction(
      id,
      doc.storeId,
      doc.invoiceId,
      doc.createdBy,
      lineItems,
      doc.paymentStatus,
      this.toDate(doc.createdAt),
      this.toDate(doc.updatedAt),
    );
  }

  /**
   * Converts JavaScript Date to Firestore Timestamp
   *
   * @param date - JavaScript Date
   * @returns Firestore Timestamp
   */
  private toTimestamp(date: Date): FirebaseFirestore.Timestamp {
    return FirebaseFirestore.Timestamp.fromDate(date);
  }

  /**
   * Converts Firestore Timestamp to JavaScript Date
   *
   * @param timestamp - Firestore Timestamp
   * @returns JavaScript Date
   */
  private toDate(timestamp: FirebaseFirestore.Timestamp): Date {
    return timestamp.toDate();
  }
}
