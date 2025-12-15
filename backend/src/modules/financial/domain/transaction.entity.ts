/**
 * Transaction Domain Entity
 * 
 * Represents a transaction (sale) in the petshop management system.
 * Transactions represent POS/cart sales and are linked to invoices.
 * When completed with products, transactions trigger StockMovement decrements for tracked products.
 * Payment is recorded manually and payment_status reflects manual entries.
 * This is a pure domain entity with no framework dependencies.
 * 
 * Business Rules:
 * - Transaction must be linked to a Store and Invoice (invariants)
 * - Total amount must be calculated from line items
 * - Payment status reflects manual payment entries
 * - Completing a Transaction with products triggers StockMovement decrements for tracked products
 */

export enum PaymentStatus {
  PENDING = 'pending',
  PAID_MANUAL = 'paid_manual',
  REFUNDED = 'refunded',
}

export interface TransactionLineItem {
  readonly productId?: string;
  readonly serviceId?: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly description?: string;
}

export class Transaction {
  private readonly _id: string;
  private readonly _storeId: string;
  private readonly _invoiceId: string;
  private _lineItems: TransactionLineItem[];
  private _totalAmount: number;
  private _paymentStatus: PaymentStatus;
  private readonly _createdBy: string; // User ID
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Creates a new Transaction entity
   * 
   * @param id - Unique identifier (UUID)
   * @param storeId - Store ID where transaction occurred (required)
   * @param invoiceId - Invoice ID this transaction is linked to (required)
   * @param createdBy - User ID who created the transaction (required)
   * @param lineItems - List of transaction line items (products/services)
   * @param paymentStatus - Payment status (default PENDING)
   * @param createdAt - Creation timestamp
   * @param updatedAt - Last update timestamp
   * 
   * @throws Error if id is empty
   * @throws Error if storeId is empty
   * @throws Error if invoiceId is empty
   * @throws Error if createdBy is empty
   * @throws Error if any line item is invalid
   */
  constructor(
    id: string,
    storeId: string,
    invoiceId: string,
    createdBy: string,
    lineItems: TransactionLineItem[] = [],
    paymentStatus: PaymentStatus = PaymentStatus.PENDING,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.validateId(id);
    this.validateStoreId(storeId);
    this.validateInvoiceId(invoiceId);
    this.validateCreatedBy(createdBy);

    if (lineItems.length > 0) {
      this.validateLineItems(lineItems);
    }

    this._id = id;
    this._storeId = storeId;
    this._invoiceId = invoiceId;
    this._lineItems = lineItems.map(item => ({ ...item }));
    this._paymentStatus = paymentStatus;
    this._createdBy = createdBy;
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
    this._updatedAt = updatedAt ? new Date(updatedAt) : new Date();

    // Calculate total amount from line items
    this.recalculateTotal();
  }

  // Getters (read-only access to private fields)
  get id(): string {
    return this._id;
  }

  get storeId(): string {
    return this._storeId;
  }

  get invoiceId(): string {
    return this._invoiceId;
  }

  get lineItems(): ReadonlyArray<TransactionLineItem> {
    return this._lineItems.map(item => ({ ...item }));
  }

  get totalAmount(): number {
    return this._totalAmount;
  }

  get paymentStatus(): PaymentStatus {
    return this._paymentStatus;
  }

  get createdBy(): string {
    return this._createdBy;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Adds a line item to the transaction
   * 
   * @param item - Line item to add
   * @throws Error if item is invalid
   */
  addLineItem(item: TransactionLineItem): void {
    this.validateLineItem(item);
    this._lineItems.push({ ...item });
    this.recalculateTotal();
    this._updatedAt = new Date();
  }

  /**
   * Removes a line item by index
   * 
   * @param index - Index of the line item to remove
   * @throws Error if index is out of bounds
   */
  removeLineItem(index: number): void {
    if (index < 0 || index >= this._lineItems.length) {
      throw new Error('Line item index out of bounds');
    }
    this._lineItems.splice(index, 1);
    this.recalculateTotal();
    this._updatedAt = new Date();
  }

  /**
   * Updates a line item by index
   * 
   * @param index - Index of the line item to update
   * @param item - New line item data
   * @throws Error if index is out of bounds or item is invalid
   */
  updateLineItem(index: number, item: TransactionLineItem): void {
    if (index < 0 || index >= this._lineItems.length) {
      throw new Error('Line item index out of bounds');
    }
    this.validateLineItem(item);
    this._lineItems[index] = { ...item };
    this.recalculateTotal();
    this._updatedAt = new Date();
  }

  /**
   * Sets all line items
   * 
   * @param lineItems - New list of line items
   * @throws Error if any line item is invalid
   */
  setLineItems(lineItems: TransactionLineItem[]): void {
    this.validateLineItems(lineItems);
    this._lineItems = lineItems.map(item => ({ ...item }));
    this.recalculateTotal();
    this._updatedAt = new Date();
  }

  /**
   * Marks the transaction as paid manually
   * Payment is recorded manually; payment_status must reflect manual entries
   */
  markAsPaidManual(): void {
    if (this._paymentStatus === PaymentStatus.REFUNDED) {
      throw new Error('Cannot mark refunded transaction as paid');
    }
    this._paymentStatus = PaymentStatus.PAID_MANUAL;
    this._updatedAt = new Date();
  }

  /**
   * Marks the transaction as refunded
   */
  markAsRefunded(): void {
    if (this._paymentStatus === PaymentStatus.PENDING) {
      throw new Error('Cannot refund a pending transaction - mark as paid first');
    }
    this._paymentStatus = PaymentStatus.REFUNDED;
    this._updatedAt = new Date();
  }

  /**
   * Recalculates the total amount from line items
   * This is called automatically when line items are modified
   */
  private recalculateTotal(): void {
    this._totalAmount = this._lineItems.reduce((total, item) => {
      return total + (item.quantity * item.unitPrice);
    }, 0);
  }

  /**
   * Gets the number of line items
   * 
   * @returns Number of line items
   */
  getLineItemCount(): number {
    return this._lineItems.length;
  }

  /**
   * Gets the total quantity of all items in the transaction
   * 
   * @returns Sum of all quantities
   */
  getTotalQuantity(): number {
    return this._lineItems.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Gets line items that are products (have productId)
   * 
   * @returns Array of line items that are products
   */
  getProductLineItems(): ReadonlyArray<TransactionLineItem> {
    return this._lineItems
      .filter(item => item.productId !== undefined)
      .map(item => ({ ...item }));
  }

  /**
   * Gets line items that are services (have serviceId)
   * 
   * @returns Array of line items that are services
   */
  getServiceLineItems(): ReadonlyArray<TransactionLineItem> {
    return this._lineItems
      .filter(item => item.serviceId !== undefined)
      .map(item => ({ ...item }));
  }

  /**
   * Checks if the transaction has product line items
   * 
   * @returns True if transaction has at least one product line item
   */
  hasProducts(): boolean {
    return this._lineItems.some(item => item.productId !== undefined);
  }

  /**
   * Checks if the transaction has service line items
   * 
   * @returns True if transaction has at least one service line item
   */
  hasServices(): boolean {
    return this._lineItems.some(item => item.serviceId !== undefined);
  }

  /**
   * Checks if the transaction is pending payment
   * 
   * @returns True if payment status is PENDING
   */
  isPending(): boolean {
    return this._paymentStatus === PaymentStatus.PENDING;
  }

  /**
   * Checks if the transaction is paid
   * 
   * @returns True if payment status is PAID_MANUAL
   */
  isPaid(): boolean {
    return this._paymentStatus === PaymentStatus.PAID_MANUAL;
  }

  /**
   * Checks if the transaction is refunded
   * 
   * @returns True if payment status is REFUNDED
   */
  isRefunded(): boolean {
    return this._paymentStatus === PaymentStatus.REFUNDED;
  }

  /**
   * Checks if the transaction can be completed
   * Completing a Transaction with products triggers StockMovement decrements for tracked products
   * 
   * @returns True if transaction can be completed (has line items and is paid)
   */
  canBeCompleted(): boolean {
    return this._lineItems.length > 0 && this._paymentStatus === PaymentStatus.PAID_MANUAL;
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Transaction ID is required');
    }
  }

  private validateStoreId(storeId: string): void {
    if (!storeId || storeId.trim().length === 0) {
      throw new Error('Store ID is required - a Transaction must be linked to a Store');
    }
  }

  private validateInvoiceId(invoiceId: string): void {
    if (!invoiceId || invoiceId.trim().length === 0) {
      throw new Error('Invoice ID is required - a Transaction must be linked to an Invoice');
    }
  }

  private validateCreatedBy(createdBy: string): void {
    if (!createdBy || createdBy.trim().length === 0) {
      throw new Error('Created by user ID is required');
    }
  }

  private validateLineItems(lineItems: TransactionLineItem[]): void {
    for (const item of lineItems) {
      this.validateLineItem(item);
    }
  }

  private validateLineItem(item: TransactionLineItem): void {
    // At least one of productId or serviceId must be provided
    if (!item.productId && !item.serviceId) {
      throw new Error('Line item must have either productId or serviceId');
    }

    // Cannot have both productId and serviceId
    if (item.productId && item.serviceId) {
      throw new Error('Line item cannot have both productId and serviceId');
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('Line item quantity must be a positive integer');
    }

    if (item.unitPrice < 0) {
      throw new Error('Line item unit price cannot be negative');
    }
  }
}

