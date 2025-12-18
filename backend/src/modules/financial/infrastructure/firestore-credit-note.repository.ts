/**
 * CreditNoteRepository Firestore Implementation
 *
 * Firestore adapter for CreditNoteRepository port.
 * This implementation handles persistence of CreditNote domain entities to Firestore.
 *
 * Responsibilities:
 * - Map CreditNote domain entities to Firestore documents
 * - Map Firestore documents to CreditNote domain entities
 * - Implement repository interface methods
 * - Handle Firestore-specific operations (queries, transactions)
 *
 * This belongs to the Infrastructure/Adapters layer.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { CreditNote } from '../domain/credit-note.entity';
import { CreditNoteRepository } from '../ports/credit-note.repository.port';

/**
 * Firestore document structure for CreditNote
 */
interface CreditNoteDocument {
  id: string;
  invoiceId: string;
  issuedAt?: FirebaseFirestore.Timestamp;
  reason?: string;
  amount: number;
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestoreCreditNoteRepository implements CreditNoteRepository {
  private readonly collectionName = 'credit_notes';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore,
  ) {}

  /**
   * Saves a CreditNote entity to Firestore
   * Creates a new document if it doesn't exist, updates if it does.
   *
   * @param creditNote - CreditNote domain entity to save
   * @returns Saved CreditNote entity
   */
  async save(creditNote: CreditNote): Promise<CreditNote> {
    const docRef = this.firestore.collection(this.collectionName).doc(creditNote.id);
    const document = this.toDocument(creditNote);

    await docRef.set(document, { merge: true });

    return creditNote;
  }

  /**
   * Finds credit notes by invoice ID
   *
   * @param invoiceId - Invoice ID
   * @returns Array of credit notes
   */
  async findByInvoiceId(invoiceId: string): Promise<CreditNote[]> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('invoiceId', '==', invoiceId)
      .get();

    return snapshot.docs.map((doc) => this.toEntity(doc.id, doc.data() as CreditNoteDocument));
  }

  /**
   * Finds credit notes by multiple invoice IDs
   *
   * @param invoiceIds - Array of invoice IDs
   * @returns Array of credit notes
   */
  async findByInvoiceIds(invoiceIds: string[]): Promise<CreditNote[]> {
    if (invoiceIds.length === 0) {
      return [];
    }

    // Firestore 'in' queries are limited to 10 items, so we need to batch
    const creditNotes: CreditNote[] = [];
    const batchSize = 10;

    for (let i = 0; i < invoiceIds.length; i += batchSize) {
      const batch = invoiceIds.slice(i, i + batchSize);
      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('invoiceId', 'in', batch)
        .get();

      snapshot.docs.forEach((doc) => {
        creditNotes.push(this.toEntity(doc.id, doc.data() as CreditNoteDocument));
      });
    }

    return creditNotes;
  }

  /**
   * Sums the total amount of credit notes for an invoice
   *
   * @param invoiceId - Invoice ID
   * @returns Total amount of credit notes
   */
  async sumByInvoiceId(invoiceId: string): Promise<number> {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where('invoiceId', '==', invoiceId)
      .get();

    return snapshot.docs.reduce((sum, doc) => {
      const data = doc.data() as CreditNoteDocument;
      return sum + data.amount;
    }, 0);
  }

  /**
   * Converts CreditNote domain entity to Firestore document
   *
   * @param creditNote - CreditNote domain entity
   * @returns Firestore document
   */
  private toDocument(creditNote: CreditNote): CreditNoteDocument {
    return {
      id: creditNote.id,
      invoiceId: creditNote.invoiceId,
      issuedAt: creditNote.issuedAt ? this.toTimestamp(creditNote.issuedAt) : undefined,
      reason: creditNote.reason,
      amount: creditNote.amount,
      createdBy: creditNote.createdBy,
      createdAt: this.toTimestamp(creditNote.createdAt),
    };
  }

  /**
   * Converts Firestore document to CreditNote domain entity
   *
   * @param id - Document ID
   * @param doc - Firestore document data
   * @returns CreditNote domain entity
   */
  private toEntity(id: string, doc: CreditNoteDocument): CreditNote {
    return new CreditNote(
      id,
      doc.invoiceId,
      doc.amount,
      doc.createdBy,
      doc.issuedAt ? this.toDate(doc.issuedAt) : undefined,
      doc.reason,
      this.toDate(doc.createdAt),
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
