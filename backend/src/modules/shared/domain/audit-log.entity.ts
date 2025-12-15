/**
 * AuditLog Domain Entity
 * 
 * Represents an audit log entry in the petshop management system.
 * AuditLog is a cross-cutting entity that tracks all changes to domain entities for compliance
 * and audit purposes. Entries are append-only and immutable once created.
 * This is a pure domain entity with no framework dependencies.
 * 
 * Business Rules:
 * - AuditLog entries are append-only; editing is not allowed
 * - Entity type and entity ID are required to identify the audited entity
 * - Action type must be one of the valid audit actions
 * - Performed by user ID is required for audit trail
 * - Timestamp is required to track when the action occurred
 * - Meta data can contain before/after state for change tracking
 * - Logs must be searchable by admin roles (enforced at repository/use case level)
 */

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VOID = 'void',
}

export interface AuditMeta {
  readonly before?: Record<string, unknown>;
  readonly after?: Record<string, unknown>;
  readonly [key: string]: unknown;
}

export class AuditLog {
  private readonly _id: string;
  private readonly _entityType: string;
  private readonly _entityId: string;
  private readonly _action: AuditAction;
  private readonly _performedBy: string; // User ID
  private readonly _timestamp: Date;
  private readonly _meta?: AuditMeta;

  /**
   * Creates a new AuditLog entity
   * 
   * @param id - Unique identifier (UUID)
   * @param entityType - Type of entity being audited (required)
   * @param entityId - ID of the entity being audited (required)
   * @param action - Action performed (required)
   * @param performedBy - User ID who performed the action (required)
   * @param timestamp - Timestamp when action occurred (defaults to now)
   * @param meta - Optional metadata with before/after state
   * 
   * @throws Error if id is empty
   * @throws Error if entityType is empty
   * @throws Error if entityId is empty
   * @throws Error if performedBy is empty
   */
  constructor(
    id: string,
    entityType: string,
    entityId: string,
    action: AuditAction,
    performedBy: string,
    timestamp?: Date,
    meta?: AuditMeta
  ) {
    this.validateId(id);
    this.validateEntityType(entityType);
    this.validateEntityId(entityId);
    this.validatePerformedBy(performedBy);

    this._id = id;
    this._entityType = entityType;
    this._entityId = entityId;
    this._action = action;
    this._performedBy = performedBy;
    this._timestamp = timestamp ? new Date(timestamp) : new Date();
    this._meta = meta ? this.deepCopyMeta(meta) : undefined;
  }

  // Getters (read-only access to private fields - entity is immutable)
  get id(): string {
    return this._id;
  }

  get entityType(): string {
    return this._entityType;
  }

  get entityId(): string {
    return this._entityId;
  }

  get action(): AuditAction {
    return this._action;
  }

  get performedBy(): string {
    return this._performedBy;
  }

  get timestamp(): Date {
    return new Date(this._timestamp);
  }

  get meta(): AuditMeta | undefined {
    return this._meta ? this.deepCopyMeta(this._meta) : undefined;
  }

  /**
   * Checks if the audit log has metadata
   * 
   * @returns True if meta data is present
   */
  hasMeta(): boolean {
    return this._meta !== undefined;
  }

  /**
   * Gets the before state from metadata
   * 
   * @returns Before state object, or undefined if not present
   */
  getBeforeState(): Record<string, unknown> | undefined {
    return this._meta?.before;
  }

  /**
   * Gets the after state from metadata
   * 
   * @returns After state object, or undefined if not present
   */
  getAfterState(): Record<string, unknown> | undefined {
    return this._meta?.after;
  }

  /**
   * Checks if the action is CREATE
   * 
   * @returns True if action is CREATE
   */
  isCreateAction(): boolean {
    return this._action === AuditAction.CREATE;
  }

  /**
   * Checks if the action is UPDATE
   * 
   * @returns True if action is UPDATE
   */
  isUpdateAction(): boolean {
    return this._action === AuditAction.UPDATE;
  }

  /**
   * Checks if the action is DELETE
   * 
   * @returns True if action is DELETE
   */
  isDeleteAction(): boolean {
    return this._action === AuditAction.DELETE;
  }

  /**
   * Checks if the action is VOID
   * 
   * @returns True if action is VOID
   */
  isVoidAction(): boolean {
    return this._action === AuditAction.VOID;
  }

  /**
   * Checks if the audit log has before state
   * 
   * @returns True if before state is present in metadata
   */
  hasBeforeState(): boolean {
    return this._meta?.before !== undefined;
  }

  /**
   * Checks if the audit log has after state
   * 
   * @returns True if after state is present in metadata
   */
  hasAfterState(): boolean {
    return this._meta?.after !== undefined;
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('AuditLog ID is required');
    }
  }

  private validateEntityType(entityType: string): void {
    if (!entityType || entityType.trim().length === 0) {
      throw new Error('Entity type is required');
    }

    if (entityType.trim().length > 100) {
      throw new Error('Entity type cannot exceed 100 characters');
    }
  }

  private validateEntityId(entityId: string): void {
    if (!entityId || entityId.trim().length === 0) {
      throw new Error('Entity ID is required');
    }
  }

  private validatePerformedBy(performedBy: string): void {
    if (!performedBy || performedBy.trim().length === 0) {
      throw new Error('Performed by user ID is required - all audit log entries must record the performer');
    }
  }

  /**
   * Creates a deep copy of metadata to ensure immutability
   * 
   * @param meta - Metadata to copy
   * @returns Deep copy of metadata
   */
  private deepCopyMeta(meta: AuditMeta): AuditMeta {
    const copied: AuditMeta = {};

    for (const key in meta) {
      if (meta.hasOwnProperty(key)) {
        const value = meta[key];
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          // Deep copy nested objects
          copied[key] = JSON.parse(JSON.stringify(value));
        } else {
          // Copy primitives, arrays, and dates as-is
          copied[key] = value;
        }
      }
    }

    return copied;
  }
}

