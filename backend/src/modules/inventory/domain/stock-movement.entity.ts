/**
 * StockMovement Domain Entity
 *
 * Represents a stock movement (receipt, sale, adjustment, etc.) in the petshop management system.
 * StockMovement is an immutable audit record of all inventory changes. All stock changes must be
 * recorded and cannot be deleted; corrections are made with compensating movements.
 * This is a pure domain entity with no framework dependencies.
 *
 * Business Rules:
 * - StockMovement must be linked to a Product (invariant)
 * - Quantity change must be non-zero integer (positive for receipt, negative for decrement)
 * - Reason must be one of the valid movement reasons
 * - Performed by user ID is required for audit trail
 * - Location ID is required to track where the movement occurred
 * - All stock changes must be recorded and cannot be deleted (only corrected with compensating movement)
 * - Transactions creating multiple StockMovements must be atomic to preserve consistency
 */

export enum StockMovementReason {
  RECEIPT = 'receipt',
  SALE = 'sale',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
  RESERVATION_RELEASE = 'reservation_release',
}

export class StockMovement {
  private readonly _id: string;
  private readonly _productId: string;
  private readonly _batchId?: string;
  private readonly _quantityChange: number;
  private readonly _reason: StockMovementReason;
  private readonly _performedBy: string; // User ID
  private readonly _locationId: string; // InventoryLocation / Store ID
  private readonly _referenceId?: string; // e.g., invoice id, purchase_order id
  private readonly _createdAt: Date;

  /**
   * Creates a new StockMovement entity
   *
   * @param id - Unique identifier (UUID)
   * @param productId - Product ID this movement affects (required)
   * @param quantityChange - Quantity change (positive for receipt, negative for decrement, must be non-zero)
   * @param reason - Reason for the movement (required)
   * @param performedBy - User ID who performed the movement (required)
   * @param locationId - Location ID where movement occurred (required)
   * @param batchId - Batch ID if movement is batch-specific
   * @param referenceId - Reference ID (e.g., invoice id, purchase_order id)
   * @param createdAt - Creation timestamp (defaults to now)
   *
   * @throws Error if id is empty
   * @throws Error if productId is empty
   * @throws Error if quantityChange is zero
   * @throws Error if performedBy is empty
   * @throws Error if locationId is empty
   */
  constructor(
    id: string,
    productId: string,
    quantityChange: number,
    reason: StockMovementReason,
    performedBy: string,
    locationId: string,
    batchId?: string,
    referenceId?: string,
    createdAt?: Date,
  ) {
    this.validateId(id);
    this.validateProductId(productId);
    this.validateQuantityChange(quantityChange);
    this.validatePerformedBy(performedBy);
    this.validateLocationId(locationId);

    this._id = id;
    this._productId = productId;
    this._batchId = batchId;
    this._quantityChange = quantityChange;
    this._reason = reason;
    this._performedBy = performedBy;
    this._locationId = locationId;
    this._referenceId = referenceId;
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
  }

  // Getters (read-only access to private fields - entity is immutable)
  get id(): string {
    return this._id;
  }

  get productId(): string {
    return this._productId;
  }

  get batchId(): string | undefined {
    return this._batchId;
  }

  get quantityChange(): number {
    return this._quantityChange;
  }

  get reason(): StockMovementReason {
    return this._reason;
  }

  get performedBy(): string {
    return this._performedBy;
  }

  get locationId(): string {
    return this._locationId;
  }

  get referenceId(): string | undefined {
    return this._referenceId;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  /**
   * Checks if this is a receipt movement (positive quantity change)
   *
   * @returns True if quantity change is positive
   */
  isReceipt(): boolean {
    return this._quantityChange > 0;
  }

  /**
   * Checks if this is a decrement movement (negative quantity change)
   *
   * @returns True if quantity change is negative
   */
  isDecrement(): boolean {
    return this._quantityChange < 0;
  }

  /**
   * Gets the absolute quantity change (always positive)
   *
   * @returns Absolute value of quantity change
   */
  getAbsoluteQuantity(): number {
    return Math.abs(this._quantityChange);
  }

  /**
   * Checks if the movement is batch-specific
   *
   * @returns True if batch ID is set
   */
  isBatchSpecific(): boolean {
    return this._batchId !== undefined;
  }

  /**
   * Checks if the movement has a reference ID
   *
   * @returns True if reference ID is set
   */
  hasReference(): boolean {
    return this._referenceId !== undefined;
  }

  /**
   * Checks if the movement reason is a receipt
   *
   * @returns True if reason is RECEIPT
   */
  isReceiptReason(): boolean {
    return this._reason === StockMovementReason.RECEIPT;
  }

  /**
   * Checks if the movement reason is a sale
   *
   * @returns True if reason is SALE
   */
  isSaleReason(): boolean {
    return this._reason === StockMovementReason.SALE;
  }

  /**
   * Checks if the movement reason is an adjustment
   *
   * @returns True if reason is ADJUSTMENT
   */
  isAdjustmentReason(): boolean {
    return this._reason === StockMovementReason.ADJUSTMENT;
  }

  /**
   * Checks if the movement reason is a transfer
   *
   * @returns True if reason is TRANSFER
   */
  isTransferReason(): boolean {
    return this._reason === StockMovementReason.TRANSFER;
  }

  /**
   * Checks if the movement reason is a reservation release
   *
   * @returns True if reason is RESERVATION_RELEASE
   */
  isReservationReleaseReason(): boolean {
    return this._reason === StockMovementReason.RESERVATION_RELEASE;
  }

  /**
   * Creates a compensating movement to reverse this movement
   * This is used to correct errors instead of deleting movements
   *
   * @param id - ID for the compensating movement
   * @param performedBy - User ID performing the correction
   * @param referenceId - Optional reference ID for the correction
   * @param createdAt - Creation timestamp for the compensating movement
   * @returns New StockMovement that reverses this movement
   */
  createCompensatingMovement(
    id: string,
    performedBy: string,
    referenceId?: string,
    createdAt?: Date,
  ): StockMovement {
    // Reverse the quantity change
    const compensatingQuantityChange = -this._quantityChange;

    // Determine the reason for compensation (typically adjustment)
    const compensatingReason = StockMovementReason.ADJUSTMENT;

    return new StockMovement(
      id,
      this._productId,
      compensatingQuantityChange,
      compensatingReason,
      performedBy,
      this._locationId,
      this._batchId,
      referenceId,
      createdAt,
    );
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('StockMovement ID is required');
    }
  }

  private validateProductId(productId: string): void {
    if (!productId || productId.trim().length === 0) {
      throw new Error('Product ID is required - a StockMovement must be linked to a Product');
    }
  }

  private validateQuantityChange(quantityChange: number): void {
    if (!Number.isInteger(quantityChange)) {
      throw new Error('Quantity change must be an integer');
    }

    if (quantityChange === 0) {
      throw new Error('Quantity change cannot be zero');
    }
  }

  private validatePerformedBy(performedBy: string): void {
    if (!performedBy || performedBy.trim().length === 0) {
      throw new Error(
        'Performed by user ID is required - all stock changes must be recorded with performer',
      );
    }
  }

  private validateLocationId(locationId: string): void {
    if (!locationId || locationId.trim().length === 0) {
      throw new Error('Location ID is required - stock movement must specify location');
    }
  }
}
