/**
 * FinancialExportRepository Firestore Implementation
 *
 * Firestore adapter for FinancialExportRepository port.
 * This implementation handles persistence of FinancialExport domain entities to Firestore.
 *
 * Responsibilities:
 * - Map FinancialExport domain entities to Firestore documents
 * - Map Firestore documents to FinancialExport domain entities
 * - Implement repository interface methods
 * - Handle Firestore-specific operations
 *
 * This belongs to the Infrastructure/Adapters layer.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { FinancialExport, ExportFormat } from '../domain/financial-export.entity';
import { FinancialExportRepository } from '../ports/financial-export.repository.port';

/**
 * Firestore document structure for FinancialExport
 */
interface FinancialExportDocument {
  id: string;
  companyId: string;
  periodStart?: FirebaseFirestore.Timestamp;
  periodEnd?: FirebaseFirestore.Timestamp;
  format: ExportFormat;
  filePath?: string;
  sftpReference?: string;
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class FirestoreFinancialExportRepository implements FinancialExportRepository {
  private readonly collectionName = 'financial_exports';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore,
  ) {}

  /**
   * Saves a FinancialExport entity to Firestore
   * Creates a new document if it doesn't exist, updates if it does.
   *
   * @param exportEntity - FinancialExport domain entity to save
   * @returns Saved FinancialExport entity
   */
  async save(exportEntity: FinancialExport): Promise<FinancialExport> {
    const docRef = this.firestore.collection(this.collectionName).doc(exportEntity.id);
    const document = this.toDocument(exportEntity);

    await docRef.set(document, { merge: true });

    return exportEntity;
  }

  /**
   * Finds a FinancialExport by ID
   *
   * @param id - FinancialExport ID
   * @returns FinancialExport entity or null if not found
   */
  async findById(id: string): Promise<FinancialExport | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return this.toEntity(id, doc.data() as FinancialExportDocument);
  }

  /**
   * Finds pending financial exports
   *
   * @returns Array of pending FinancialExport entities
   * Note: This is a placeholder - FinancialExport entity doesn't have a status field yet
   * For now, returns empty array
   */
  async findPendingExports(): Promise<FinancialExport[]> {
    // TODO: Implement when FinancialExport entity has status field
    // For now, return empty array
    return [];
  }

  /**
   * Converts FinancialExport domain entity to Firestore document
   *
   * @param exportEntity - FinancialExport domain entity
   * @returns Firestore document
   */
  private toDocument(exportEntity: FinancialExport): FinancialExportDocument {
    return {
      id: exportEntity.id,
      companyId: exportEntity.companyId,
      periodStart: exportEntity.periodStart
        ? this.toTimestamp(exportEntity.periodStart)
        : undefined,
      periodEnd: exportEntity.periodEnd ? this.toTimestamp(exportEntity.periodEnd) : undefined,
      format: exportEntity.format,
      filePath: exportEntity.filePath,
      sftpReference: exportEntity.sftpReference,
      createdBy: exportEntity.createdBy,
      createdAt: this.toTimestamp(exportEntity.createdAt),
    };
  }

  /**
   * Converts Firestore document to FinancialExport domain entity
   *
   * @param id - Document ID
   * @param doc - Firestore document data
   * @returns FinancialExport domain entity
   */
  private toEntity(id: string, doc: FinancialExportDocument): FinancialExport {
    return new FinancialExport(
      id,
      doc.companyId,
      doc.createdBy,
      doc.format,
      doc.periodStart ? this.toDate(doc.periodStart) : undefined,
      doc.periodEnd ? this.toDate(doc.periodEnd) : undefined,
      doc.filePath,
      doc.sftpReference,
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
