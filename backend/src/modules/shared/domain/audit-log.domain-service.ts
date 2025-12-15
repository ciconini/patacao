/**
 * AuditLogDomainService
 * 
 * Domain service responsible for defining when audit entries must be created and
 * enforcing the append-only rule. This service operates conceptually across all entities
 * and provides validation and creation logic for audit log entries.
 * 
 * Responsibilities:
 * - Define when audit entries must be created
 * - Enforce append-only rule
 * - Validate audit log entries
 * - Provide conceptual audit entry creation
 * 
 * Collaborating Entities:
 * - AuditLog: The audit log entity being created or validated
 * - All domain entities: This service operates conceptually across all entities
 * 
 * Business Rules Enforced:
 * - BR: AuditLog entries are append-only; editing is not allowed
 * - BR: All entity CREATE operations must be audited
 * - BR: All entity UPDATE operations must be audited
 * - BR: All entity DELETE operations must be audited
 * - BR: All entity VOID operations must be audited
 * - BR: Performed by user ID is required for all audit entries
 * - BR: Entity type and entity ID are required to identify the audited entity
 * - BR: Timestamp is required to track when the action occurred
 * - BR: Meta data can contain before/after state for change tracking
 * - BR: Logs must be searchable by admin roles (enforced at repository/use case level)
 * 
 * Invariants:
 * - Audit log entries cannot be modified once created
 * - Audit log entries cannot be deleted
 * - All auditable actions must create an audit entry
 * - Performed by user ID is always required
 * - Entity type and entity ID are always required
 * 
 * Edge Cases:
 * - Attempting to modify an audit log entry (not allowed)
 * - Attempting to delete an audit log entry (not allowed)
 * - Creating audit entry without performed by user
 * - Creating audit entry without entity type or ID
 * - Multiple audit entries for same action (allowed - each is a separate entry)
 * - Audit entries for non-existent entities (conceptually allowed)
 */

import { AuditLog, AuditAction, AuditMeta } from './audit-log.entity';

export interface AuditEntryCreationResult {
  auditLog: AuditLog | null;
  shouldCreate: boolean;
  errors: string[];
  warnings: string[];
}

export interface AuditValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class AuditLogDomainService {
  /**
   * Determines if an audit entry must be created for an action.
   * 
   * Business Rule: All entity CREATE, UPDATE, DELETE, and VOID operations must be audited
   * 
   * @param action - The action being performed
   * @param entityType - Type of entity being acted upon
   * @param entityId - ID of entity being acted upon
   * @param performedBy - User ID performing the action
   * @returns True if audit entry must be created
   */
  mustCreateAuditEntry(
    action: AuditAction,
    entityType: string,
    entityId: string,
    performedBy: string
  ): boolean {
    // Validate required fields
    if (!action) {
      return false;
    }

    if (!entityType || entityType.trim().length === 0) {
      return false;
    }

    if (!entityId || entityId.trim().length === 0) {
      return false;
    }

    if (!performedBy || performedBy.trim().length === 0) {
      return false;
    }

    // All valid actions must be audited
    return action === AuditAction.CREATE ||
           action === AuditAction.UPDATE ||
           action === AuditAction.DELETE ||
           action === AuditAction.VOID;
  }

  /**
   * Creates an audit log entry conceptually.
   * 
   * This method creates an AuditLog entity that should be persisted.
   * It validates all requirements and determines if the entry should be created.
   * 
   * @param id - Unique identifier for the audit log entry
   * @param entityType - Type of entity being audited
   * @param entityId - ID of entity being audited
   * @param action - Action performed
   * @param performedBy - User ID who performed the action
   * @param meta - Optional metadata with before/after state
   * @param timestamp - Timestamp when action occurred (defaults to now)
   * @returns Audit entry creation result
   */
  createAuditEntry(
    id: string,
    entityType: string,
    entityId: string,
    action: AuditAction,
    performedBy: string,
    meta?: AuditMeta,
    timestamp?: Date
  ): AuditEntryCreationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate that audit entry must be created
    const shouldCreate = this.mustCreateAuditEntry(action, entityType, entityId, performedBy);
    if (!shouldCreate) {
      errors.push(
        `Audit entry should not be created. Action: ${action}, EntityType: ${entityType}, ` +
        `EntityId: ${entityId}, PerformedBy: ${performedBy}`
      );
      return {
        auditLog: null,
        shouldCreate: false,
        errors,
        warnings,
      };
    }

    // Validate entity type
    if (!entityType || entityType.trim().length === 0) {
      errors.push('Entity type is required for audit entry');
    } else if (entityType.trim().length > 100) {
      errors.push('Entity type cannot exceed 100 characters');
    }

    // Validate entity ID
    if (!entityId || entityId.trim().length === 0) {
      errors.push('Entity ID is required for audit entry');
    }

    // Validate performed by
    if (!performedBy || performedBy.trim().length === 0) {
      errors.push('Performed by user ID is required for audit entry');
    }

    // Validate action
    if (!action) {
      errors.push('Action is required for audit entry');
    }

    // Validate ID
    if (!id || id.trim().length === 0) {
      errors.push('Audit log ID is required');
    }

    // Warnings for missing metadata on UPDATE actions
    if (action === AuditAction.UPDATE && (!meta || (!meta.before && !meta.after))) {
      warnings.push(
        'UPDATE action should include before/after state in metadata for better audit trail'
      );
    }

    // If there are errors, cannot create
    if (errors.length > 0) {
      return {
        auditLog: null,
        shouldCreate: false,
        errors,
        warnings,
      };
    }

    // Create the audit log entry
    const auditLog = new AuditLog(
      id,
      entityType,
      entityId,
      action,
      performedBy,
      timestamp,
      meta
    );

    return {
      auditLog,
      shouldCreate: true,
      errors: [],
      warnings,
    };
  }

  /**
   * Validates that an audit log entry cannot be modified.
   * 
   * Business Rule: AuditLog entries are append-only; editing is not allowed
   * 
   * @param auditLog - The audit log entry that cannot be modified
   * @returns Validation result indicating modification is not allowed
   */
  validateAuditLogCannotBeModified(auditLog: AuditLog): AuditValidationResult {
    if (!auditLog) {
      throw new Error('AuditLog entity is required');
    }

    return {
      isValid: false,
      errors: [
        `Audit log entry ${auditLog.id} cannot be modified. ` +
        `Audit log entries are append-only and immutable once created.`
      ],
      warnings: [],
    };
  }

  /**
   * Validates that an audit log entry cannot be deleted.
   * 
   * Business Rule: AuditLog entries are append-only; editing is not allowed
   * 
   * @param auditLog - The audit log entry that cannot be deleted
   * @returns Validation result indicating deletion is not allowed
   */
  validateAuditLogCannotBeDeleted(auditLog: AuditLog): AuditValidationResult {
    if (!auditLog) {
      throw new Error('AuditLog entity is required');
    }

    return {
      isValid: false,
      errors: [
        `Audit log entry ${auditLog.id} cannot be deleted. ` +
        `Audit log entries are append-only and must be retained for compliance and audit purposes.`
      ],
      warnings: [],
    };
  }

  /**
   * Validates an audit log entry.
   * 
   * @param auditLog - The audit log entry to validate
   * @returns Validation result
   */
  validateAuditLogEntry(auditLog: AuditLog): AuditValidationResult {
    if (!auditLog) {
      throw new Error('AuditLog entity is required');
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate entity type
    if (!auditLog.entityType || auditLog.entityType.trim().length === 0) {
      errors.push('Entity type is required');
    } else if (auditLog.entityType.trim().length > 100) {
      errors.push('Entity type cannot exceed 100 characters');
    }

    // Validate entity ID
    if (!auditLog.entityId || auditLog.entityId.trim().length === 0) {
      errors.push('Entity ID is required');
    }

    // Validate performed by
    if (!auditLog.performedBy || auditLog.performedBy.trim().length === 0) {
      errors.push('Performed by user ID is required');
    }

    // Validate action
    if (!auditLog.action) {
      errors.push('Action is required');
    }

    // Validate timestamp
    if (!auditLog.timestamp) {
      errors.push('Timestamp is required');
    } else {
      // Warn if timestamp is in the future
      const now = new Date();
      if (auditLog.timestamp > now) {
        warnings.push('Audit log timestamp is in the future');
      }
    }

    // Warnings for missing metadata on UPDATE actions
    if (auditLog.isUpdateAction() && !auditLog.hasMeta()) {
      warnings.push(
        'UPDATE action should include metadata with before/after state for better audit trail'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Determines if an action should be audited.
   * 
   * @param action - The action to check
   * @returns True if action should be audited
   */
  shouldAuditAction(action: AuditAction): boolean {
    return action === AuditAction.CREATE ||
           action === AuditAction.UPDATE ||
           action === AuditAction.DELETE ||
           action === AuditAction.VOID;
  }

  /**
   * Creates metadata for an UPDATE action with before and after states.
   * 
   * This is a helper method to create proper metadata for UPDATE audit entries.
   * 
   * @param beforeState - State before the update
   * @param afterState - State after the update
   * @param additionalMeta - Additional metadata to include
   * @returns Audit metadata object
   */
  createUpdateMetadata(
    beforeState: Record<string, unknown>,
    afterState: Record<string, unknown>,
    additionalMeta?: Record<string, unknown>
  ): AuditMeta {
    const meta: AuditMeta = {
      before: { ...beforeState },
      after: { ...afterState },
    };

    if (additionalMeta) {
      for (const key in additionalMeta) {
        if (additionalMeta.hasOwnProperty(key) && key !== 'before' && key !== 'after') {
          meta[key] = additionalMeta[key];
        }
      }
    }

    return meta;
  }

  /**
   * Creates metadata for a CREATE action.
   * 
   * @param initialState - Initial state of the created entity
   * @param additionalMeta - Additional metadata to include
   * @returns Audit metadata object
   */
  createCreateMetadata(
    initialState: Record<string, unknown>,
    additionalMeta?: Record<string, unknown>
  ): AuditMeta {
    const meta: AuditMeta = {
      after: { ...initialState },
    };

    if (additionalMeta) {
      for (const key in additionalMeta) {
        if (additionalMeta.hasOwnProperty(key) && key !== 'after') {
          meta[key] = additionalMeta[key];
        }
      }
    }

    return meta;
  }

  /**
   * Creates metadata for a DELETE action.
   * 
   * @param deletedState - State of the entity before deletion
   * @param additionalMeta - Additional metadata to include
   * @returns Audit metadata object
   */
  createDeleteMetadata(
    deletedState: Record<string, unknown>,
    additionalMeta?: Record<string, unknown>
  ): AuditMeta {
    const meta: AuditMeta = {
      before: { ...deletedState },
    };

    if (additionalMeta) {
      for (const key in additionalMeta) {
        if (additionalMeta.hasOwnProperty(key) && key !== 'before') {
          meta[key] = additionalMeta[key];
        }
      }
    }

    return meta;
  }

  /**
   * Creates metadata for a VOID action.
   * 
   * @param voidedState - State of the entity before voiding
   * @param voidReason - Reason for voiding
   * @param additionalMeta - Additional metadata to include
   * @returns Audit metadata object
   */
  createVoidMetadata(
    voidedState: Record<string, unknown>,
    voidReason?: string,
    additionalMeta?: Record<string, unknown>
  ): AuditMeta {
    const meta: AuditMeta = {
      before: { ...voidedState },
      voidReason,
    };

    if (additionalMeta) {
      for (const key in additionalMeta) {
        if (additionalMeta.hasOwnProperty(key) && key !== 'before' && key !== 'voidReason') {
          meta[key] = additionalMeta[key];
        }
      }
    }

    return meta;
  }

  /**
   * Validates that audit log entries are immutable.
   * 
   * Business Rule: AuditLog entries are append-only; editing is not allowed
   * 
   * @param auditLog - The audit log entry to check
   * @returns True if audit log is immutable (always true)
   */
  isAuditLogImmutable(auditLog: AuditLog): boolean {
    if (!auditLog) {
      throw new Error('AuditLog entity is required');
    }

    // Audit logs are always immutable by design (all properties are readonly)
    return true;
  }

  /**
   * Gets the entity type name for an entity class.
   * 
   * This is a helper method to get a consistent entity type name.
   * 
   * @param entityClassName - Name of the entity class (e.g., "Invoice", "Appointment")
   * @returns Entity type string
   */
  getEntityTypeName(entityClassName: string): string {
    if (!entityClassName || entityClassName.trim().length === 0) {
      throw new Error('Entity class name is required');
    }

    // Convert class name to entity type (e.g., "Invoice" -> "Invoice")
    // This can be customized based on naming conventions
    return entityClassName.trim();
  }

  /**
   * Validates multiple audit log entries.
   * 
   * @param auditLogs - List of audit log entries to validate
   * @returns Map of audit log ID to validation result
   */
  validateMultipleAuditLogs(
    auditLogs: AuditLog[]
  ): Map<string, AuditValidationResult> {
    const results = new Map<string, AuditValidationResult>();

    for (const auditLog of auditLogs) {
      const result = this.validateAuditLogEntry(auditLog);
      results.set(auditLog.id, result);
    }

    return results;
  }

  /**
   * Checks if an audit log entry is for a specific entity.
   * 
   * @param auditLog - The audit log entry
   * @param entityType - Entity type to check
   * @param entityId - Entity ID to check
   * @returns True if audit log is for the specified entity
   */
  isAuditLogForEntity(
    auditLog: AuditLog,
    entityType: string,
    entityId: string
  ): boolean {
    if (!auditLog) {
      throw new Error('AuditLog entity is required');
    }

    return auditLog.entityType === entityType && auditLog.entityId === entityId;
  }

  /**
   * Filters audit log entries by entity type.
   * 
   * @param auditLogs - List of audit log entries
   * @param entityType - Entity type to filter by
   * @returns Filtered list of audit log entries
   */
  filterByEntityType(auditLogs: AuditLog[], entityType: string): AuditLog[] {
    if (!entityType || entityType.trim().length === 0) {
      throw new Error('Entity type is required');
    }

    return auditLogs.filter(log => log.entityType === entityType);
  }

  /**
   * Filters audit log entries by action.
   * 
   * @param auditLogs - List of audit log entries
   * @param action - Action to filter by
   * @returns Filtered list of audit log entries
   */
  filterByAction(auditLogs: AuditLog[], action: AuditAction): AuditLog[] {
    if (!action) {
      throw new Error('Action is required');
    }

    return auditLogs.filter(log => log.action === action);
  }

  /**
   * Filters audit log entries by performed by user.
   * 
   * @param auditLogs - List of audit log entries
   * @param performedBy - User ID to filter by
   * @returns Filtered list of audit log entries
   */
  filterByPerformedBy(auditLogs: AuditLog[], performedBy: string): AuditLog[] {
    if (!performedBy || performedBy.trim().length === 0) {
      throw new Error('Performed by user ID is required');
    }

    return auditLogs.filter(log => log.performedBy === performedBy);
  }
}

