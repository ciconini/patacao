/**
 * PurchaseOrder Domain Entity
 * 
 * Represents a purchase order to a supplier in the petshop management system.
 * Purchase orders track orders placed with suppliers and their status through the procurement lifecycle.
 * When goods are received, StockBatch and StockMovement entries are created.
 * This is a pure domain entity with no framework dependencies.
 * 
 * Business Rules:
 * - PurchaseOrder must be linked to a Supplier (invariant)
 * - Order lines must have at least one line item
 * - Quantity and unit price must be positive for each line
 * - Status transitions follow a specific lifecycle
 * - Receiving goods creates StockBatch and StockMovement entries; PO status updates to `received`
 */

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  ORDERED = 'ordered',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

export interface PurchaseOrderLine {
  readonly productId: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

export class PurchaseOrder {
  private readonly _id: string;
  private readonly _supplierId: string;
  private _storeId?: string;
  private _orderLines: PurchaseOrderLine[];
  private _status: PurchaseOrderStatus;
  private readonly _createdBy: string; // User ID
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Creates a new PurchaseOrder entity
   * 
   * @param id - Unique identifier (UUID)
   * @param supplierId - Supplier ID this order is placed with (required)
   * @param createdBy - User ID who created the order (required)
   * @param orderLines - List of order line items (required, must have at least one)
   * @param storeId - Store ID where order will be received
   * @param status - Order status (default DRAFT)
   * @param createdAt - Creation timestamp
   * @param updatedAt - Last update timestamp
   * 
   * @throws Error if id is empty
   * @throws Error if supplierId is empty
   * @throws Error if createdBy is empty
   * @throws Error if orderLines is empty
   * @throws Error if any order line is invalid
   */
  constructor(
    id: string,
    supplierId: string,
    createdBy: string,
    orderLines: PurchaseOrderLine[],
    storeId?: string,
    status: PurchaseOrderStatus = PurchaseOrderStatus.DRAFT,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.validateId(id);
    this.validateSupplierId(supplierId);
    this.validateCreatedBy(createdBy);
    this.validateOrderLines(orderLines);

    this._id = id;
    this._supplierId = supplierId;
    this._storeId = storeId;
    this._orderLines = orderLines.map(line => ({ ...line }));
    this._status = status;
    this._createdBy = createdBy;
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
    this._updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  // Getters (read-only access to private fields)
  get id(): string {
    return this._id;
  }

  get supplierId(): string {
    return this._supplierId;
  }

  get storeId(): string | undefined {
    return this._storeId;
  }

  get orderLines(): ReadonlyArray<PurchaseOrderLine> {
    return this._orderLines.map(line => ({ ...line }));
  }

  get status(): PurchaseOrderStatus {
    return this._status;
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
   * Updates the store ID
   * 
   * @param storeId - New store ID
   */
  updateStoreId(storeId: string | undefined): void {
    this._storeId = storeId;
    this._updatedAt = new Date();
  }

  /**
   * Adds an order line item
   * 
   * @param productId - Product ID
   * @param quantity - Quantity to order
   * @param unitPrice - Unit price
   * @throws Error if productId is empty, quantity is not positive, or unitPrice is not positive
   */
  addOrderLine(productId: string, quantity: number, unitPrice: number): void {
    this.validateOrderLine({ productId, quantity, unitPrice });
    this._orderLines.push({ productId, quantity, unitPrice });
    this._updatedAt = new Date();
  }

  /**
   * Removes an order line item by index
   * 
   * @param index - Index of the line to remove
   * @throws Error if index is out of bounds or if removing would leave order empty
   */
  removeOrderLine(index: number): void {
    if (index < 0 || index >= this._orderLines.length) {
      throw new Error('Order line index out of bounds');
    }

    if (this._orderLines.length === 1) {
      throw new Error('Cannot remove the last order line - purchase order must have at least one line');
    }

    this._orderLines.splice(index, 1);
    this._updatedAt = new Date();
  }

  /**
   * Updates an order line item by index
   * 
   * @param index - Index of the line to update
   * @param productId - New product ID
   * @param quantity - New quantity
   * @param unitPrice - New unit price
   * @throws Error if index is out of bounds or line is invalid
   */
  updateOrderLine(index: number, productId: string, quantity: number, unitPrice: number): void {
    if (index < 0 || index >= this._orderLines.length) {
      throw new Error('Order line index out of bounds');
    }

    this.validateOrderLine({ productId, quantity, unitPrice });
    this._orderLines[index] = { productId, quantity, unitPrice };
    this._updatedAt = new Date();
  }

  /**
   * Sets all order lines
   * 
   * @param orderLines - New list of order lines
   * @throws Error if orderLines is empty or invalid
   */
  setOrderLines(orderLines: PurchaseOrderLine[]): void {
    this.validateOrderLines(orderLines);
    this._orderLines = orderLines.map(line => ({ ...line }));
    this._updatedAt = new Date();
  }

  /**
   * Marks the order as ordered (submitted to supplier)
   * 
   * @throws Error if current status doesn't allow ordering
   */
  markAsOrdered(): void {
    if (this._status !== PurchaseOrderStatus.DRAFT) {
      throw new Error(`Cannot mark order as ordered with status: ${this._status}`);
    }
    this._status = PurchaseOrderStatus.ORDERED;
    this._updatedAt = new Date();
  }

  /**
   * Marks the order as received
   * Note: Receiving goods creates StockBatch and StockMovement entries (handled at use case level)
   * 
   * @throws Error if current status doesn't allow receiving
   */
  markAsReceived(): void {
    if (this._status !== PurchaseOrderStatus.ORDERED) {
      throw new Error(`Cannot mark order as received with status: ${this._status}`);
    }
    this._status = PurchaseOrderStatus.RECEIVED;
    this._updatedAt = new Date();
  }

  /**
   * Cancels the order
   * 
   * @throws Error if order is already received or cancelled
   */
  cancel(): void {
    if (this._status === PurchaseOrderStatus.RECEIVED) {
      throw new Error('Cannot cancel a received order');
    }
    if (this._status === PurchaseOrderStatus.CANCELLED) {
      throw new Error('Order is already cancelled');
    }
    this._status = PurchaseOrderStatus.CANCELLED;
    this._updatedAt = new Date();
  }

  /**
   * Calculates the total order amount
   * 
   * @returns Total amount (sum of all line totals)
   */
  calculateTotal(): number {
    return this._orderLines.reduce((total, line) => {
      return total + (line.quantity * line.unitPrice);
    }, 0);
  }

  /**
   * Gets the total quantity of all items in the order
   * 
   * @returns Sum of all quantities
   */
  getTotalQuantity(): number {
    return this._orderLines.reduce((total, line) => total + line.quantity, 0);
  }

  /**
   * Gets the number of unique products in the order
   * 
   * @returns Number of order lines
   */
  getLineCount(): number {
    return this._orderLines.length;
  }

  /**
   * Checks if the order can be modified
   * 
   * @returns True if order status allows modifications
   */
  canBeModified(): boolean {
    return this._status === PurchaseOrderStatus.DRAFT;
  }

  /**
   * Checks if the order can be cancelled
   * 
   * @returns True if order can be cancelled
   */
  canBeCancelled(): boolean {
    return this._status !== PurchaseOrderStatus.RECEIVED && 
           this._status !== PurchaseOrderStatus.CANCELLED;
  }

  /**
   * Checks if the order can be received
   * 
   * @returns True if order can be marked as received
   */
  canBeReceived(): boolean {
    return this._status === PurchaseOrderStatus.ORDERED;
  }

  /**
   * Checks if the order is in draft status
   * 
   * @returns True if status is DRAFT
   */
  isDraft(): boolean {
    return this._status === PurchaseOrderStatus.DRAFT;
  }

  /**
   * Checks if the order is ordered
   * 
   * @returns True if status is ORDERED
   */
  isOrdered(): boolean {
    return this._status === PurchaseOrderStatus.ORDERED;
  }

  /**
   * Checks if the order is received
   * 
   * @returns True if status is RECEIVED
   */
  isReceived(): boolean {
    return this._status === PurchaseOrderStatus.RECEIVED;
  }

  /**
   * Checks if the order is cancelled
   * 
   * @returns True if status is CANCELLED
   */
  isCancelled(): boolean {
    return this._status === PurchaseOrderStatus.CANCELLED;
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('PurchaseOrder ID is required');
    }
  }

  private validateSupplierId(supplierId: string): void {
    if (!supplierId || supplierId.trim().length === 0) {
      throw new Error('Supplier ID is required - a PurchaseOrder must be linked to a Supplier');
    }
  }

  private validateCreatedBy(createdBy: string): void {
    if (!createdBy || createdBy.trim().length === 0) {
      throw new Error('Created by user ID is required');
    }
  }

  private validateOrderLines(orderLines: PurchaseOrderLine[]): void {
    if (!orderLines || orderLines.length === 0) {
      throw new Error('Purchase order must have at least one order line');
    }

    for (const line of orderLines) {
      this.validateOrderLine(line);
    }

    // Check for duplicate product IDs
    const productIds = orderLines.map(line => line.productId);
    const uniqueProductIds = new Set(productIds);
    if (uniqueProductIds.size !== productIds.length) {
      throw new Error('Purchase order cannot have duplicate product IDs in order lines');
    }
  }

  private validateOrderLine(line: PurchaseOrderLine): void {
    if (!line.productId || line.productId.trim().length === 0) {
      throw new Error('Order line product ID cannot be empty');
    }

    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new Error('Order line quantity must be a positive integer');
    }

    if (line.unitPrice <= 0) {
      throw new Error('Order line unit price must be positive');
    }
  }
}

