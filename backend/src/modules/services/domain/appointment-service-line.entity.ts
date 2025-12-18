/**
 * AppointmentServiceLine Domain Entity
 *
 * Represents a join entity linking an Appointment to a Service.
 * This entity tracks which services are included in an appointment, along with quantities
 * and optional price overrides for flexible pricing.
 * This is a pure domain entity with no framework dependencies.
 *
 * Business Rules:
 * - An AppointmentServiceLine must be linked to an Appointment and a Service (invariants)
 * - Quantity must be positive
 * - Price override must be non-negative if provided
 * - Price calculation uses price_override when present, otherwise Service price
 */

export class AppointmentServiceLine {
  private readonly _id: string;
  private readonly _appointmentId: string;
  private readonly _serviceId: string;
  private _quantity: number;
  private _priceOverride?: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Creates a new AppointmentServiceLine entity
   *
   * @param id - Unique identifier (UUID)
   * @param appointmentId - Appointment ID this line belongs to (required)
   * @param serviceId - Service ID this line references (required)
   * @param quantity - Quantity of the service (default 1, must be positive)
   * @param priceOverride - Optional price override (must be non-negative if provided)
   * @param createdAt - Creation timestamp
   * @param updatedAt - Last update timestamp
   *
   * @throws Error if appointmentId is empty
   * @throws Error if serviceId is empty
   * @throws Error if quantity is not positive
   * @throws Error if priceOverride is negative
   */
  constructor(
    id: string,
    appointmentId: string,
    serviceId: string,
    quantity: number = 1,
    priceOverride?: number,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.validateId(id);
    this.validateAppointmentId(appointmentId);
    this.validateServiceId(serviceId);
    this.validateQuantity(quantity);

    if (priceOverride !== undefined) {
      this.validatePriceOverride(priceOverride);
    }

    this._id = id;
    this._appointmentId = appointmentId;
    this._serviceId = serviceId;
    this._quantity = quantity;
    this._priceOverride = priceOverride;
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
    this._updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  // Getters (read-only access to private fields)
  get id(): string {
    return this._id;
  }

  get appointmentId(): string {
    return this._appointmentId;
  }

  get serviceId(): string {
    return this._serviceId;
  }

  get quantity(): number {
    return this._quantity;
  }

  get priceOverride(): number | undefined {
    return this._priceOverride;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Updates the quantity
   *
   * @param quantity - New quantity
   * @throws Error if quantity is not positive
   */
  updateQuantity(quantity: number): void {
    this.validateQuantity(quantity);
    this._quantity = quantity;
    this._updatedAt = new Date();
  }

  /**
   * Updates the price override
   *
   * @param priceOverride - New price override (undefined to remove override)
   * @throws Error if priceOverride is negative
   */
  updatePriceOverride(priceOverride: number | undefined): void {
    if (priceOverride !== undefined) {
      this.validatePriceOverride(priceOverride);
    }
    this._priceOverride = priceOverride;
    this._updatedAt = new Date();
  }

  /**
   * Removes the price override, reverting to Service price
   */
  removePriceOverride(): void {
    this._priceOverride = undefined;
    this._updatedAt = new Date();
  }

  /**
   * Checks if a price override is set
   *
   * @returns True if price override is set
   */
  hasPriceOverride(): boolean {
    return this._priceOverride !== undefined;
  }

  /**
   * Calculates the line total using the effective price
   * Effective price is price_override if set, otherwise uses the provided service price
   *
   * @param servicePrice - The service's base price (used if no override is set)
   * @returns Line total (quantity * effective price)
   * @throws Error if servicePrice is negative
   */
  calculateLineTotal(servicePrice: number): number {
    if (servicePrice < 0) {
      throw new Error('Service price cannot be negative');
    }

    const effectivePrice = this._priceOverride !== undefined ? this._priceOverride : servicePrice;

    return this._quantity * effectivePrice;
  }

  /**
   * Gets the effective price for this line
   * Effective price is price_override if set, otherwise uses the provided service price
   *
   * @param servicePrice - The service's base price (used if no override is set)
   * @returns Effective price per unit
   * @throws Error if servicePrice is negative
   */
  getEffectivePrice(servicePrice: number): number {
    if (servicePrice < 0) {
      throw new Error('Service price cannot be negative');
    }

    return this._priceOverride !== undefined ? this._priceOverride : servicePrice;
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('AppointmentServiceLine ID is required');
    }
  }

  private validateAppointmentId(appointmentId: string): void {
    if (!appointmentId || appointmentId.trim().length === 0) {
      throw new Error(
        'Appointment ID is required - an AppointmentServiceLine must be linked to an Appointment',
      );
    }
  }

  private validateServiceId(serviceId: string): void {
    if (!serviceId || serviceId.trim().length === 0) {
      throw new Error(
        'Service ID is required - an AppointmentServiceLine must be linked to a Service',
      );
    }
  }

  private validateQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
  }

  private validatePriceOverride(priceOverride: number): void {
    if (priceOverride < 0) {
      throw new Error('Price override cannot be negative');
    }
  }
}
