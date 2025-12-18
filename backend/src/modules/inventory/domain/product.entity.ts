/**
 * Product Domain Entity
 *
 * Represents an inventory sellable item in the petshop management system.
 * Products are physical items that can be sold, tracked in inventory, and managed through stock movements.
 * This is a pure domain entity with no framework dependencies.
 *
 * Business Rules:
 * - Product SKU is required and must be unique (enforced at repository/use case level)
 * - Product name is required
 * - Unit price must be non-negative
 * - VAT rate must be between 0 and 100
 * - If stock_tracked is true, reservations and decrements apply when sold
 * - SKU uniqueness is Company-global by default (enforced at repository/use case level)
 */

export class Product {
  private readonly _id: string;
  private _sku: string;
  private _name: string;
  private _description?: string;
  private _category?: string;
  private _unitPrice: number;
  private _vatRate: number;
  private _stockTracked: boolean;
  private _reorderThreshold?: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Creates a new Product entity
   *
   * @param id - Unique identifier (UUID)
   * @param sku - Stock Keeping Unit (SKU) identifier (required, must be unique)
   * @param name - Product name (required)
   * @param unitPrice - Unit price (required, must be non-negative)
   * @param vatRate - VAT rate as percentage (required, 0-100)
   * @param stockTracked - Whether stock is tracked for this product (default false)
   * @param description - Product description
   * @param category - Product category
   * @param reorderThreshold - Reorder threshold for stock management
   * @param createdAt - Creation timestamp
   * @param updatedAt - Last update timestamp
   *
   * @throws Error if id is empty
   * @throws Error if sku is empty
   * @throws Error if name is empty
   * @throws Error if unitPrice is negative
   * @throws Error if vatRate is not between 0 and 100
   * @throws Error if reorderThreshold is negative
   */
  constructor(
    id: string,
    sku: string,
    name: string,
    unitPrice: number,
    vatRate: number,
    stockTracked: boolean = false,
    description?: string,
    category?: string,
    reorderThreshold?: number,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.validateId(id);
    this.validateSku(sku);
    this.validateName(name);
    this.validateUnitPrice(unitPrice);
    this.validateVatRate(vatRate);

    if (reorderThreshold !== undefined) {
      this.validateReorderThreshold(reorderThreshold);
    }

    this._id = id;
    this._sku = sku;
    this._name = name;
    this._description = description;
    this._category = category;
    this._unitPrice = unitPrice;
    this._vatRate = vatRate;
    this._stockTracked = stockTracked;
    this._reorderThreshold = reorderThreshold;
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
    this._updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  // Getters (read-only access to private fields)
  get id(): string {
    return this._id;
  }

  get sku(): string {
    return this._sku;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | undefined {
    return this._description;
  }

  get category(): string | undefined {
    return this._category;
  }

  get unitPrice(): number {
    return this._unitPrice;
  }

  get vatRate(): number {
    return this._vatRate;
  }

  get stockTracked(): boolean {
    return this._stockTracked;
  }

  get reorderThreshold(): number | undefined {
    return this._reorderThreshold;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Updates the SKU
   * Note: SKU uniqueness must be validated at repository/use case level
   *
   * @param sku - New SKU
   * @throws Error if sku is empty
   */
  updateSku(sku: string): void {
    this.validateSku(sku);
    this._sku = sku;
    this._updatedAt = new Date();
  }

  /**
   * Updates the product name
   *
   * @param name - New product name
   * @throws Error if name is empty
   */
  updateName(name: string): void {
    this.validateName(name);
    this._name = name;
    this._updatedAt = new Date();
  }

  /**
   * Updates the product description
   *
   * @param description - New description
   */
  updateDescription(description: string | undefined): void {
    this._description = description;
    this._updatedAt = new Date();
  }

  /**
   * Updates the product category
   *
   * @param category - New category
   */
  updateCategory(category: string | undefined): void {
    this._category = category;
    this._updatedAt = new Date();
  }

  /**
   * Updates the unit price
   *
   * @param unitPrice - New unit price
   * @throws Error if unitPrice is negative
   */
  updateUnitPrice(unitPrice: number): void {
    this.validateUnitPrice(unitPrice);
    this._unitPrice = unitPrice;
    this._updatedAt = new Date();
  }

  /**
   * Updates the VAT rate
   *
   * @param vatRate - New VAT rate (0-100)
   * @throws Error if vatRate is not between 0 and 100
   */
  updateVatRate(vatRate: number): void {
    this.validateVatRate(vatRate);
    this._vatRate = vatRate;
    this._updatedAt = new Date();
  }

  /**
   * Enables stock tracking for this product
   */
  enableStockTracking(): void {
    this._stockTracked = true;
    this._updatedAt = new Date();
  }

  /**
   * Disables stock tracking for this product
   */
  disableStockTracking(): void {
    this._stockTracked = false;
    this._updatedAt = new Date();
  }

  /**
   * Updates the reorder threshold
   *
   * @param reorderThreshold - New reorder threshold
   * @throws Error if reorderThreshold is negative
   */
  updateReorderThreshold(reorderThreshold: number | undefined): void {
    if (reorderThreshold !== undefined) {
      this.validateReorderThreshold(reorderThreshold);
    }
    this._reorderThreshold = reorderThreshold;
    this._updatedAt = new Date();
  }

  /**
   * Calculates the price with VAT included
   *
   * @returns Price with VAT (unitPrice * (1 + vatRate / 100))
   */
  getPriceWithVat(): number {
    return this._unitPrice * (1 + this._vatRate / 100);
  }

  /**
   * Calculates the VAT amount for the unit price
   *
   * @returns VAT amount (unitPrice * vatRate / 100)
   */
  getVatAmount(): number {
    return this._unitPrice * (this._vatRate / 100);
  }

  /**
   * Calculates the total price with VAT for a given quantity
   *
   * @param quantity - Quantity to calculate for
   * @returns Total price with VAT (quantity * price with VAT)
   * @throws Error if quantity is not positive
   */
  calculateTotalWithVat(quantity: number): number {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    return quantity * this.getPriceWithVat();
  }

  /**
   * Calculates the total VAT amount for a given quantity
   *
   * @param quantity - Quantity to calculate for
   * @returns Total VAT amount (quantity * VAT amount)
   * @throws Error if quantity is not positive
   */
  calculateTotalVat(quantity: number): number {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    return quantity * this.getVatAmount();
  }

  /**
   * Checks if stock tracking is enabled
   *
   * @returns True if stock is tracked
   */
  isStockTracked(): boolean {
    return this._stockTracked;
  }

  /**
   * Checks if the product has a reorder threshold set
   *
   * @returns True if reorder threshold is set
   */
  hasReorderThreshold(): boolean {
    return this._reorderThreshold !== undefined;
  }

  /**
   * Checks if current stock level is below reorder threshold
   * Note: This method requires current stock level from repository/use case
   *
   * @param currentStock - Current stock level
   * @returns True if stock is below threshold (only if threshold is set and stock tracking is enabled)
   */
  isBelowReorderThreshold(currentStock: number): boolean {
    if (!this._stockTracked || this._reorderThreshold === undefined) {
      return false;
    }
    return currentStock <= this._reorderThreshold;
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Product ID is required');
    }
  }

  private validateSku(sku: string): void {
    if (!sku || sku.trim().length === 0) {
      throw new Error('Product SKU is required');
    }

    if (sku.trim().length > 100) {
      throw new Error('Product SKU cannot exceed 100 characters');
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Product name is required');
    }

    if (name.trim().length > 255) {
      throw new Error('Product name cannot exceed 255 characters');
    }
  }

  private validateUnitPrice(unitPrice: number): void {
    if (unitPrice < 0) {
      throw new Error('Unit price cannot be negative');
    }
  }

  private validateVatRate(vatRate: number): void {
    if (vatRate < 0 || vatRate > 100) {
      throw new Error('VAT rate must be between 0 and 100');
    }
  }

  private validateReorderThreshold(reorderThreshold: number): void {
    if (!Number.isInteger(reorderThreshold) || reorderThreshold < 0) {
      throw new Error('Reorder threshold must be a non-negative integer');
    }
  }
}
