/**
 * CreditNote Domain Entity
 *
 * Represents a credit note (nota de crédito) in the petshop management system.
 * Credit notes are fiscal documents used to correct or refund invoices.
 * They must reference the original invoice and reduce the outstanding amount in financial exports.
 * This is a pure domain entity with no framework dependencies.
 *
 * Business Rules:
 * - CreditNote must be linked to an Invoice (invariant)
 * - Amount must be positive
 * - CreditNote must reference original Invoice and reduce outstanding amount in exports
 * - Only Manager/Accountant can create CreditNote (enforced at use case level)
 * - Once issued, credit note becomes immutable
 */

export class CreditNote {
  private readonly _id: string;
  private readonly _invoiceId: string;
  private _issuedAt?: Date;
  private _reason?: string;
  private _amount: number;
  private readonly _createdBy: string; // User ID
  private readonly _createdAt: Date;

  /**
   * Creates a new CreditNote entity
   *
   * @param id - Unique identifier (UUID)
   * @param invoiceId - Invoice ID this credit note references (required)
   * @param amount - Credit note amount (required, must be positive)
   * @param createdBy - User ID who created the credit note (required)
   * @param issuedAt - Date when credit note was issued
   * @param reason - Reason for the credit note
   * @param createdAt - Creation timestamp (defaults to now)
   *
   * @throws Error if id is empty
   * @throws Error if invoiceId is empty
   * @throws Error if amount is not positive
   * @throws Error if createdBy is empty
   */
  constructor(
    id: string,
    invoiceId: string,
    amount: number,
    createdBy: string,
    issuedAt?: Date,
    reason?: string,
    createdAt?: Date,
  ) {
    this.validateId(id);
    this.validateInvoiceId(invoiceId);
    this.validateAmount(amount);
    this.validateCreatedBy(createdBy);

    this._id = id;
    this._invoiceId = invoiceId;
    this._amount = amount;
    this._createdBy = createdBy;
    this._issuedAt = issuedAt ? new Date(issuedAt) : undefined;
    this._reason = reason;
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
  }

  // Getters (read-only access to private fields)
  get id(): string {
    return this._id;
  }

  get invoiceId(): string {
    return this._invoiceId;
  }

  get issuedAt(): Date | undefined {
    return this._issuedAt ? new Date(this._issuedAt) : undefined;
  }

  get reason(): string | undefined {
    return this._reason;
  }

  get amount(): number {
    return this._amount;
  }

  get createdBy(): string {
    return this._createdBy;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  /**
   * Updates the amount
   *
   * @param amount - New amount
   * @throws Error if amount is not positive
   * @throws Error if credit note is already issued
   */
  updateAmount(amount: number): void {
    if (this.isIssued()) {
      throw new Error('Cannot update amount after credit note is issued');
    }
    this.validateAmount(amount);
    this._amount = amount;
  }

  /**
   * Updates the reason
   *
   * @param reason - New reason
   * @throws Error if credit note is already issued
   */
  updateReason(reason: string | undefined): void {
    if (this.isIssued()) {
      throw new Error('Cannot update reason after credit note is issued');
    }
    this._reason = reason;
  }

  /**
   * Issues the credit note
   *
   * @param issuedAt - Date when credit note is issued (defaults to now)
   * @throws Error if credit note is already issued
   */
  issue(issuedAt: Date = new Date()): void {
    if (this.isIssued()) {
      throw new Error('Credit note is already issued');
    }
    this._issuedAt = new Date(issuedAt);
  }

  /**
   * Checks if the credit note is issued
   *
   * @returns True if credit note has an issued date
   */
  isIssued(): boolean {
    return this._issuedAt !== undefined;
  }

  /**
   * Checks if the credit note can be modified
   *
   * @returns True if credit note is not yet issued
   */
  canBeModified(): boolean {
    return !this.isIssued();
  }

  /**
   * Checks if the credit note has a reason
   *
   * @returns True if reason is set
   */
  hasReason(): boolean {
    return this._reason !== undefined && this._reason.trim().length > 0;
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('CreditNote ID is required');
    }
  }

  private validateInvoiceId(invoiceId: string): void {
    if (!invoiceId || invoiceId.trim().length === 0) {
      throw new Error('Invoice ID is required - a CreditNote must reference an Invoice');
    }
  }

  private validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('Credit note amount must be positive');
    }
  }

  private validateCreatedBy(createdBy: string): void {
    if (!createdBy || createdBy.trim().length === 0) {
      throw new Error('Created by user ID is required');
    }
  }
}
