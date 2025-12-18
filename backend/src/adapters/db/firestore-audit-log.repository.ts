/**
 * Firestore AuditLog Repository
 *
 * Firestore implementation of AuditLogRepository port.
 * This repository handles persistence of AuditLog entities to Firestore.
 *
 * This belongs to the Infrastructure/Adapters layer.
 */

import { Injectable, Inject } from '@nestjs/common';
import { Firestore } from 'firebase-admin/firestore';
import { AuditLog } from '../../modules/shared/domain/audit-log.entity';

/**
 * AuditLogRepository interface
 * This matches the interface expected by use cases
 */
export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

/**
 * Firestore document structure for AuditLog
 */
interface AuditLogDocument {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  timestamp: FirebaseFirestore.Timestamp;
  meta?: Record<string, any>;
}

@Injectable()
export class FirestoreAuditLogRepository implements AuditLogRepository {
  private readonly collectionName = 'audit_logs';

  constructor(
    @Inject('FIRESTORE')
    private readonly firestore: Firestore,
  ) {}

  /**
   * Saves an AuditLog entity to Firestore
   *
   * @param auditLog - AuditLog domain entity
   * @returns Saved AuditLog entity
   */
  async save(auditLog: AuditLog): Promise<AuditLog> {
    const docRef = this.firestore.collection(this.collectionName).doc(auditLog.id);
    const document = this.toDocument(auditLog);

    await docRef.set(document);

    return auditLog;
  }

  /**
   * Converts AuditLog domain entity to Firestore document
   *
   * @param auditLog - AuditLog domain entity
   * @returns Firestore document
   */
  private toDocument(auditLog: AuditLog): AuditLogDocument {
    return {
      id: auditLog.id,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      action: auditLog.action,
      performedBy: auditLog.performedBy,
      timestamp: this.toTimestamp(auditLog.timestamp),
      meta: auditLog.meta ? JSON.parse(JSON.stringify(auditLog.meta)) : undefined,
    };
  }

  /**
   * Converts Date to Firestore Timestamp
   *
   * @param date - Date object
   * @returns Firestore Timestamp
   */
  private toTimestamp(date: Date): FirebaseFirestore.Timestamp {
    const { Timestamp } = require('firebase-admin/firestore');
    return Timestamp.fromDate(date);
  }
}
