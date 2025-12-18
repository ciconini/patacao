/**
 * InvoiceRepository Firestore Implementation
 *
 * Firestore adapter for InvoiceRepository port.
 * This implementation handles persistence of Invoice domain entities to Firestore.
 *
 * Responsibilities:
 * - Map Invoice domain entities to Firestore documents
 * - Map Firestore documents to Invoice domain entities
 * - Implement repository interface methods
 * - Handle invoice number generation
 * - Handle Firestore-specific operations (queries, transactions)
 *
 * This belongs to the Infrastructure/Adapters layer.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { Invoice, InvoiceStatus, InvoiceLine } from '../domain/invoice.entity';
import { InvoiceRepository } from '../ports/invoice.repository.port';

/**
 * Firestore document structure for Invoice
 */
interface InvoiceDocument {
  id: string;
  companyId: string;
  storeId: string;
  invoiceNumber: string;
  issuedAt?: FirebaseFirestore.Timestamp;
  buyerCustomerId?: string;
  lines: Array<{
    description: string;
    productId?: string;
    serviceId?: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
  }>;
  subtotal: number;
  vatTotal: number;
  total: number;
  status: InvoiceStatus;
  paidAt?: FirebaseFirestore.Timestamp;
  paymentMethod?: string;
  externalReference?: string;
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestoreInvoiceRepository implements InvoiceRepository {
  private readonly collectionName = 'invoices';
  private readonly invoiceNumberCounterCollection = 'invoice_number_counters';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore,
  ) {}

  /**
   * Saves an Invoice entity to Firestore
   * Creates a new document if it doesn't exist, updates if it does.
   *
   * @param invoice - Invoice domain entity to save
   * @returns Saved Invoice entity
   */
  async save(invoice: Invoice): Promise<Invoice> {
    const docRef = this.firestore.collection(this.collectionName).doc(invoice.id);
    const document = this.toDocument(invoice);

    await docRef.set(document, { merge: true });

    return invoice;
  }

  /**
   * Updates an Invoice entity in Firestore
   *
   * @param invoice - Invoice domain entity to update
   * @returns Updated Invoice entity
   */
  async update(invoice: Invoice): Promise<Invoice> {
    return this.save(invoice); // Firestore set with merge handles both create and update
  }

  /**
   * Finds an Invoice by ID
   *
   * @param id - Invoice ID
   * @returns Invoice entity or null if not found
   */
  async findById(id: string): Promise<Invoice | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return this.toEntity(doc.id, doc.data() as InvoiceDocument);
  }

  /**
   * Finds an invoice by invoice number and company
   *
   * @param invoiceNumber - Invoice number
   * @param companyId - Company ID
   * @returns Invoice entity or null if not found
   */
  async findByInvoiceNumber(invoiceNumber: string, companyId: string): Promise<Invoice | null> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('invoiceNumber', '==', invoiceNumber)
      .where('companyId', '==', companyId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return this.toEntity(doc.id, doc.data() as InvoiceDocument);
  }

  /**
   * Generates the next sequential invoice number for a company and store
   * Uses a counter document in Firestore to ensure sequential numbering
   *
   * @param companyId - Company ID
   * @param storeId - Store ID
   * @returns Next invoice number (format: YYYY/XXXX where XXXX is sequential)
   */
  async generateInvoiceNumber(companyId: string, storeId: string): Promise<string> {
    const year = new Date().getFullYear();
    const counterKey = `${companyId}_${storeId}_${year}`;
    const counterRef = this.firestore
      .collection(this.invoiceNumberCounterCollection)
      .doc(counterKey);

    // Use a transaction to ensure atomic increment
    return await this.firestore.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      let nextNumber: number;
      if (!counterDoc.exists) {
        // First invoice for this company/store/year
        nextNumber = 1;
        transaction.set(counterRef, {
          companyId,
          storeId,
          year,
          lastNumber: nextNumber,
        });
      } else {
        const data = counterDoc.data()!;
        nextNumber = (data.lastNumber || 0) + 1;
        transaction.update(counterRef, {
          lastNumber: nextNumber,
        });
      }

      // Format: YYYY/XXXX (e.g., 2024/0001)
      return `${year}/${String(nextNumber).padStart(4, '0')}`;
    });
  }

  /**
   * Finds invoices by company and period
   *
   * @param companyId - Company ID
   * @param start - Start date of period
   * @param end - End date of period
   * @returns Array of invoices
   */
  async findByCompanyAndPeriod(companyId: string, start: Date, end: Date): Promise<Invoice[]> {
    const startTimestamp = this.toTimestamp(start);
    const endTimestamp = this.toTimestamp(end);

    // Query by company and issuedAt date range
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('companyId', '==', companyId)
      .where('issuedAt', '>=', startTimestamp)
      .where('issuedAt', '<=', endTimestamp)
      .get();

    return snapshot.docs.map((doc) => this.toEntity(doc.id, doc.data() as InvoiceDocument));
  }

  /**
   * Converts Invoice domain entity to Firestore document
   *
   * @param invoice - Invoice domain entity
   * @returns Firestore document
   */
  private toDocument(invoice: Invoice): InvoiceDocument {
    return {
      id: invoice.id,
      companyId: invoice.companyId,
      storeId: invoice.storeId,
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: invoice.issuedAt ? this.toTimestamp(invoice.issuedAt) : undefined,
      buyerCustomerId: invoice.buyerCustomerId,
      lines: invoice.lines.map((line) => ({
        description: line.description,
        productId: line.productId,
        serviceId: line.serviceId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        vatRate: line.vatRate,
      })),
      subtotal: invoice.subtotal,
      vatTotal: invoice.vatTotal,
      total: invoice.total,
      status: invoice.status,
      paidAt: invoice.paidAt ? this.toTimestamp(invoice.paidAt) : undefined,
      paymentMethod: invoice.paymentMethod,
      externalReference: invoice.externalReference,
      createdBy: invoice.createdBy,
      createdAt: this.toTimestamp(invoice.createdAt),
      updatedAt: this.toTimestamp(invoice.updatedAt),
    };
  }

  /**
   * Converts Firestore document to Invoice domain entity
   *
   * @param id - Document ID
   * @param doc - Firestore document data
   * @returns Invoice domain entity
   */
  private toEntity(id: string, doc: InvoiceDocument): Invoice {
    const lines: InvoiceLine[] = doc.lines.map((line) => ({
      description: line.description,
      productId: line.productId,
      serviceId: line.serviceId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      vatRate: line.vatRate,
    }));

    return new Invoice(
      id,
      doc.companyId,
      doc.storeId,
      doc.invoiceNumber,
      doc.createdBy,
      doc.buyerCustomerId,
      lines,
      doc.status,
      doc.issuedAt ? this.toDate(doc.issuedAt) : undefined,
      doc.paidAt ? this.toDate(doc.paidAt) : undefined,
      doc.paymentMethod,
      doc.externalReference,
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
