/**
 * InventoryReservation Domain Entity
 *
 * Represents a reservation of inventory items for a specific purpose (appointment or order) in the petshop management system.
 * Reservations reduce available stock for other operations but the final decrement happens at sale completion.
 * This is a pure domain entity with no framework dependencies.
 *
 * Business Rules:
 * - InventoryReservation must be linked to a Product (invariant)
 * - Quantity must be positive
 * - Reserved for must specify appointment_id or order_id
 * - Reservation reduces available stock for other operations but final decrement happens at sale completion
 * - Manager can override reservation failures (enforced at use case level)
 * - Expired reservations should be released (enforced at use case level)
 */

export class InventoryReservation {
  private readonly _id: string;
  private readonly _productId: string;
  private _quantity: number;
  private readonly _reservedFor: string; // appointment_id or order_id
  private _expiresAt?: Date;
  private readonly _createdAt: Date;

  /**
   * Creates a new InventoryReservation entity
   *
   * @param id - Unique identifier (UUID)
   * @param productId - Product ID being reserved (required)
   * @param quantity - Quantity to reserve (required, must be positive)
   * @param reservedFor - ID of appointment or order this reservation is for (required)
   * @param expiresAt - Expiration date for the reservation
   * @param createdAt - Creation timestamp (defaults to now)
   *
   * @throws Error if id is empty
   * @throws Error if productId is empty
   * @throws Error if quantity is not positive
   * @throws Error if reservedFor is empty
   */
  constructor(
    id: string,
    productId: string,
    quantity: number,
    reservedFor: string,
    expiresAt?: Date,
    createdAt?: Date,
  ) {
    this.validateId(id);
    this.validateProductId(productId);
    this.validateQuantity(quantity);
    this.validateReservedFor(reservedFor);

    this._id = id;
    this._productId = productId;
    this._quantity = quantity;
    this._reservedFor = reservedFor;
    this._expiresAt = expiresAt ? new Date(expiresAt) : undefined;
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
  }

  // Getters (read-only access to private fields)
  get id(): string {
    return this._id;
  }

  get productId(): string {
    return this._productId;
  }

  get quantity(): number {
    return this._quantity;
  }

  get reservedFor(): string {
    return this._reservedFor;
  }

  get expiresAt(): Date | undefined {
    return this._expiresAt ? new Date(this._expiresAt) : undefined;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  /**
   * Updates the reserved quantity
   *
   * @param quantity - New quantity to reserve
   * @throws Error if quantity is not positive
   */
  updateQuantity(quantity: number): void {
    this.validateQuantity(quantity);
    this._quantity = quantity;
  }

  /**
   * Increases the reserved quantity by the specified amount
   *
   * @param amount - Amount to add to reserved quantity
   * @throws Error if amount is not positive
   */
  increaseQuantity(amount: number): void {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error('Amount to increase must be a positive integer');
    }
    this._quantity += amount;
  }

  /**
   * Decreases the reserved quantity by the specified amount
   *
   * @param amount - Amount to subtract from reserved quantity
   * @throws Error if amount is not positive or would result in non-positive quantity
   */
  decreaseQuantity(amount: number): void {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error('Amount to decrease must be a positive integer');
    }
    if (amount >= this._quantity) {
      throw new Error('Cannot decrease quantity below or to zero - release reservation instead');
    }
    this._quantity -= amount;
  }

  /**
   * Updates the expiration date
   *
   * @param expiresAt - New expiration date
   */
  updateExpiresAt(expiresAt: Date | undefined): void {
    this._expiresAt = expiresAt ? new Date(expiresAt) : undefined;
  }

  /**
   * Removes the expiration date (reservation never expires)
   */
  removeExpiration(): void {
    this._expiresAt = undefined;
  }

  /**
   * Checks if the reservation is expired
   *
   * @param referenceDate - Date to check against (defaults to now)
   * @returns True if reservation has an expiry date and it has passed
   */
  isExpired(referenceDate: Date = new Date()): boolean {
    if (!this._expiresAt) {
      return false; // No expiry date means never expires
    }
    return referenceDate > this._expiresAt;
  }

  /**
   * Checks if the reservation is active (not expired)
   *
   * @param referenceDate - Date to check against (defaults to now)
   * @returns True if reservation is not expired
   */
  isActive(referenceDate: Date = new Date()): boolean {
    return !this.isExpired(referenceDate);
  }

  /**
   * Checks if the reservation has an expiration date
   *
   * @returns True if expiration date is set
   */
  hasExpiration(): boolean {
    return this._expiresAt !== undefined;
  }

  /**
   * Calculates days until expiration
   *
   * @param referenceDate - Date to calculate from (defaults to now)
   * @returns Days until expiration, or undefined if no expiry date or already expired
   */
  getDaysUntilExpiration(referenceDate: Date = new Date()): number | undefined {
    if (!this._expiresAt) {
      return undefined; // No expiry date
    }

    if (referenceDate >= this._expiresAt) {
      return undefined; // Already expired
    }

    const diffMs = this._expiresAt.getTime() - referenceDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculates days since reservation was created
   *
   * @param referenceDate - Date to calculate to (defaults to now)
   * @returns Days since creation
   */
  getDaysSinceCreation(referenceDate: Date = new Date()): number {
    const diffMs = referenceDate.getTime() - this._createdAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Checks if the reservation is for an appointment
   * Note: This is a heuristic check - assumes appointment IDs follow a pattern
   * More accurate determination should be done at repository/use case level
   *
   * @returns True if reservedFor appears to be an appointment ID
   */
  isForAppointment(): boolean {
    // This is a simple heuristic - in practice, you might have a type field
    // or check against appointment repository. For now, we'll assume it could be either.
    // The actual determination should be done at use case/repository level.
    return true; // Placeholder - actual implementation depends on ID patterns
  }

  /**
   * Checks if the reservation is for an order
   * Note: This is a heuristic check - assumes order IDs follow a pattern
   * More accurate determination should be done at repository/use case level
   *
   * @returns True if reservedFor appears to be an order ID
   */
  isForOrder(): boolean {
    // This is a simple heuristic - in practice, you might have a type field
    // or check against order repository. For now, we'll assume it could be either.
    // The actual determination should be done at use case/repository level.
    return false; // Placeholder - actual implementation depends on ID patterns
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('InventoryReservation ID is required');
    }
  }

  private validateProductId(productId: string): void {
    if (!productId || productId.trim().length === 0) {
      throw new Error(
        'Product ID is required - an InventoryReservation must be linked to a Product',
      );
    }
  }

  private validateQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Reservation quantity must be a positive integer');
    }
  }

  private validateReservedFor(reservedFor: string): void {
    if (!reservedFor || reservedFor.trim().length === 0) {
      throw new Error(
        'Reserved for ID is required - reservation must specify appointment_id or order_id',
      );
    }
  }
}
