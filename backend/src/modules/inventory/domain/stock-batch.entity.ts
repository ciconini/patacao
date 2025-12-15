/**
 * StockBatch Domain Entity
 * 
 * Represents a batch of stock items for batch/expiry tracking in the petshop management system.
 * StockBatch tracks inventory by batch numbers and expiry dates, enabling FIFO/LIFO inventory management
 * and preventing sale of expired items.
 * This is a pure domain entity with no framework dependencies.
 * 
 * Business Rules:
 * - StockBatch must be linked to a Product (invariant)
 * - Quantity must be non-negative integer
 * - Items in expired StockBatch cannot be sold; system must block them at POS
 * - Expiry date must be after received date if both are provided
 */

export class StockBatch {
  private readonly _id: string;
  private readonly _productId: string;
  private _batchNumber?: string;
  private _quantity: number;
  private _expiryDate?: Date;
  private _receivedAt: Date;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Creates a new StockBatch entity
   * 
   * @param id - Unique identifier (UUID)
   * @param productId - Product ID this batch belongs to (required)
   * @param receivedAt - Date when batch was received (required)
   * @param quantity - Quantity in the batch (default 0, must be non-negative integer)
   * @param batchNumber - Batch number identifier
   * @param expiryDate - Expiry date for the batch
   * @param createdAt - Creation timestamp
   * @param updatedAt - Last update timestamp
   * 
   * @throws Error if id is empty
   * @throws Error if productId is empty
   * @throws Error if quantity is negative
   * @throws Error if expiryDate is before receivedAt
   */
  constructor(
    id: string,
    productId: string,
    receivedAt: Date,
    quantity: number = 0,
    batchNumber?: string,
    expiryDate?: Date,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.validateId(id);
    this.validateProductId(productId);
    this.validateQuantity(quantity);

    const received = receivedAt ? new Date(receivedAt) : new Date();

    if (expiryDate) {
      this.validateExpiryDate(received, expiryDate);
    }

    this._id = id;
    this._productId = productId;
    this._batchNumber = batchNumber;
    this._quantity = quantity;
    this._expiryDate = expiryDate ? new Date(expiryDate) : undefined;
    this._receivedAt = received;
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
    this._updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  // Getters (read-only access to private fields)
  get id(): string {
    return this._id;
  }

  get productId(): string {
    return this._productId;
  }

  get batchNumber(): string | undefined {
    return this._batchNumber;
  }

  get quantity(): number {
    return this._quantity;
  }

  get expiryDate(): Date | undefined {
    return this._expiryDate ? new Date(this._expiryDate) : undefined;
  }

  get receivedAt(): Date {
    return new Date(this._receivedAt);
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Updates the batch number
   * 
   * @param batchNumber - New batch number
   */
  updateBatchNumber(batchNumber: string | undefined): void {
    this._batchNumber = batchNumber;
    this._updatedAt = new Date();
  }

  /**
   * Updates the quantity
   * 
   * @param quantity - New quantity
   * @throws Error if quantity is negative
   */
  updateQuantity(quantity: number): void {
    this.validateQuantity(quantity);
    this._quantity = quantity;
    this._updatedAt = new Date();
  }

  /**
   * Increases the quantity by the specified amount
   * 
   * @param amount - Amount to add to quantity
   * @throws Error if amount is negative
   */
  increaseQuantity(amount: number): void {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error('Amount to increase must be a non-negative integer');
    }
    this._quantity += amount;
    this._updatedAt = new Date();
  }

  /**
   * Decreases the quantity by the specified amount
   * 
   * @param amount - Amount to subtract from quantity
   * @throws Error if amount is negative or would result in negative quantity
   */
  decreaseQuantity(amount: number): void {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error('Amount to decrease must be a non-negative integer');
    }
    if (amount > this._quantity) {
      throw new Error('Cannot decrease quantity below zero');
    }
    this._quantity -= amount;
    this._updatedAt = new Date();
  }

  /**
   * Updates the expiry date
   * 
   * @param expiryDate - New expiry date
   * @throws Error if expiryDate is before receivedAt
   */
  updateExpiryDate(expiryDate: Date | undefined): void {
    if (expiryDate) {
      this.validateExpiryDate(this._receivedAt, expiryDate);
      this._expiryDate = new Date(expiryDate);
    } else {
      this._expiryDate = undefined;
    }
    this._updatedAt = new Date();
  }

  /**
   * Updates the received date
   * 
   * @param receivedAt - New received date
   * @throws Error if expiryDate exists and is before receivedAt
   */
  updateReceivedAt(receivedAt: Date): void {
    const received = new Date(receivedAt);
    
    if (this._expiryDate && received > this._expiryDate) {
      throw new Error('Received date cannot be after expiry date');
    }

    this._receivedAt = received;
    this._updatedAt = new Date();
  }

  /**
   * Checks if the batch is expired
   * 
   * @param referenceDate - Date to check against (defaults to now)
   * @returns True if batch has an expiry date and it has passed
   */
  isExpired(referenceDate: Date = new Date()): boolean {
    if (!this._expiryDate) {
      return false; // No expiry date means never expires
    }
    return referenceDate > this._expiryDate;
  }

  /**
   * Checks if the batch can be sold
   * Items in expired StockBatch cannot be sold; system must block them at POS
   * 
   * @param referenceDate - Date to check against (defaults to now)
   * @returns True if batch is not expired and has quantity > 0
   */
  canBeSold(referenceDate: Date = new Date()): boolean {
    if (this._quantity <= 0) {
      return false; // No stock available
    }
    return !this.isExpired(referenceDate);
  }

  /**
   * Calculates days until expiry
   * 
   * @param referenceDate - Date to calculate from (defaults to now)
   * @returns Days until expiry, or undefined if no expiry date or already expired
   */
  getDaysUntilExpiry(referenceDate: Date = new Date()): number | undefined {
    if (!this._expiryDate) {
      return undefined; // No expiry date
    }

    if (referenceDate >= this._expiryDate) {
      return undefined; // Already expired
    }

    const diffMs = this._expiryDate.getTime() - referenceDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculates days since received
   * 
   * @param referenceDate - Date to calculate to (defaults to now)
   * @returns Days since received
   */
  getDaysSinceReceived(referenceDate: Date = new Date()): number {
    const diffMs = referenceDate.getTime() - this._receivedAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Checks if the batch has an expiry date
   * 
   * @returns True if expiry date is set
   */
  hasExpiryDate(): boolean {
    return this._expiryDate !== undefined;
  }

  /**
   * Checks if the batch has a batch number
   * 
   * @returns True if batch number is set
   */
  hasBatchNumber(): boolean {
    return !!this._batchNumber && this._batchNumber.trim().length > 0;
  }

  /**
   * Checks if the batch has available stock
   * 
   * @returns True if quantity > 0
   */
  hasStock(): boolean {
    return this._quantity > 0;
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('StockBatch ID is required');
    }
  }

  private validateProductId(productId: string): void {
    if (!productId || productId.trim().length === 0) {
      throw new Error('Product ID is required - a StockBatch must be linked to a Product');
    }
  }

  private validateQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error('Quantity must be a non-negative integer');
    }
  }

  private validateExpiryDate(receivedAt: Date, expiryDate: Date): void {
    const received = new Date(receivedAt);
    const expiry = new Date(expiryDate);

    if (expiry < received) {
      throw new Error('Expiry date cannot be before received date');
    }
  }
}

