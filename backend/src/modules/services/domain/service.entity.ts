/**
 * Service Domain Entity
 * 
 * Represents a service offered by the petshop (e.g., grooming, vaccination, consultation).
 * This entity defines the service catalog with pricing, duration, and inventory requirements.
 * This is a pure domain entity with no framework dependencies.
 * 
 * Business Rules:
 * - Service name is required
 * - Duration must be positive
 * - Price must be non-negative
 * - If consumes_inventory is true, consumed_items must be defined
 * - Service duration and staff skills must match for auto-assignment
 */

export interface ConsumedItem {
  readonly productId: string;
  readonly quantity: number;
}

export class Service {
  private readonly _id: string;
  private _name: string;
  private _description?: string;
  private _durationMinutes: number;
  private _price: number;
  private _requiredResources: string[];
  private _consumesInventory: boolean;
  private _consumedItems: ConsumedItem[];
  private _tags: string[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Creates a new Service entity
   * 
   * @param id - Unique identifier (UUID)
   * @param name - Service name (required)
   * @param durationMinutes - Service duration in minutes (required, must be positive)
   * @param price - Service price (required, must be non-negative)
   * @param description - Service description
   * @param requiredResources - List of required resource identifiers
   * @param consumesInventory - Whether service consumes inventory items
   * @param consumedItems - List of products and quantities consumed by this service
   * @param tags - Service tags for categorization
   * @param createdAt - Creation timestamp
   * @param updatedAt - Last update timestamp
   * 
   * @throws Error if name is empty
   * @throws Error if durationMinutes is not positive
   * @throws Error if price is negative
   * @throws Error if consumesInventory is true but consumedItems is empty
   */
  constructor(
    id: string,
    name: string,
    durationMinutes: number,
    price: number,
    description?: string,
    requiredResources: string[] = [],
    consumesInventory: boolean = false,
    consumedItems: ConsumedItem[] = [],
    tags: string[] = [],
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.validateId(id);
    this.validateName(name);
    this.validateDurationMinutes(durationMinutes);
    this.validatePrice(price);

    if (requiredResources.length > 0) {
      this.validateResourceIds(requiredResources);
    }

    if (tags.length > 0) {
      this.validateTags(tags);
    }

    if (consumesInventory && consumedItems.length === 0) {
      throw new Error('Service that consumes inventory must have at least one consumed item');
    }

    if (consumedItems.length > 0) {
      this.validateConsumedItems(consumedItems);
    }

    this._id = id;
    this._name = name;
    this._description = description;
    this._durationMinutes = durationMinutes;
    this._price = price;
    this._requiredResources = [...requiredResources];
    this._consumesInventory = consumesInventory;
    this._consumedItems = consumedItems.map(item => ({ ...item }));
    this._tags = [...tags];
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
    this._updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  // Getters (read-only access to private fields)
  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | undefined {
    return this._description;
  }

  get durationMinutes(): number {
    return this._durationMinutes;
  }

  get price(): number {
    return this._price;
  }

  get requiredResources(): ReadonlyArray<string> {
    return [...this._requiredResources];
  }

  get consumesInventory(): boolean {
    return this._consumesInventory;
  }

  get consumedItems(): ReadonlyArray<ConsumedItem> {
    return this._consumedItems.map(item => ({ ...item }));
  }

  get tags(): ReadonlyArray<string> {
    return [...this._tags];
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Updates the service name
   * 
   * @param name - New service name
   * @throws Error if name is empty
   */
  updateName(name: string): void {
    this.validateName(name);
    this._name = name;
    this._updatedAt = new Date();
  }

  /**
   * Updates the service description
   * 
   * @param description - New description
   */
  updateDescription(description: string | undefined): void {
    this._description = description;
    this._updatedAt = new Date();
  }

  /**
   * Updates the service duration
   * 
   * @param durationMinutes - New duration in minutes
   * @throws Error if duration is not positive
   */
  updateDuration(durationMinutes: number): void {
    this.validateDurationMinutes(durationMinutes);
    this._durationMinutes = durationMinutes;
    this._updatedAt = new Date();
  }

  /**
   * Updates the service price
   * 
   * @param price - New price
   * @throws Error if price is negative
   */
  updatePrice(price: number): void {
    this.validatePrice(price);
    this._price = price;
    this._updatedAt = new Date();
  }

  /**
   * Adds a required resource
   * 
   * @param resourceId - Resource identifier to add
   * @throws Error if resourceId is empty
   */
  addRequiredResource(resourceId: string): void {
    if (!resourceId || resourceId.trim().length === 0) {
      throw new Error('Resource ID cannot be empty');
    }

    if (!this._requiredResources.includes(resourceId)) {
      this._requiredResources.push(resourceId);
      this._updatedAt = new Date();
    }
  }

  /**
   * Removes a required resource
   * 
   * @param resourceId - Resource identifier to remove
   */
  removeRequiredResource(resourceId: string): void {
    const index = this._requiredResources.indexOf(resourceId);
    if (index > -1) {
      this._requiredResources.splice(index, 1);
      this._updatedAt = new Date();
    }
  }

  /**
   * Sets all required resources
   * 
   * @param resources - New list of resource identifiers
   * @throws Error if any resource ID is empty
   */
  setRequiredResources(resources: string[]): void {
    this.validateResourceIds(resources);
    this._requiredResources = [...resources];
    this._updatedAt = new Date();
  }

  /**
   * Checks if service requires a specific resource
   * 
   * @param resourceId - Resource identifier to check
   * @returns True if resource is required
   */
  requiresResource(resourceId: string): boolean {
    return this._requiredResources.includes(resourceId);
  }

  /**
   * Enables inventory consumption for this service
   * 
   * @param consumedItems - List of products and quantities consumed
   * @throws Error if consumedItems is empty
   */
  enableInventoryConsumption(consumedItems: ConsumedItem[]): void {
    if (!consumedItems || consumedItems.length === 0) {
      throw new Error('Service that consumes inventory must have at least one consumed item');
    }

    this.validateConsumedItems(consumedItems);
    this._consumesInventory = true;
    this._consumedItems = consumedItems.map(item => ({ ...item }));
    this._updatedAt = new Date();
  }

  /**
   * Disables inventory consumption for this service
   */
  disableInventoryConsumption(): void {
    this._consumesInventory = false;
    this._consumedItems = [];
    this._updatedAt = new Date();
  }

  /**
   * Adds a consumed item to the service
   * 
   * @param productId - Product ID
   * @param quantity - Quantity consumed
   * @throws Error if productId is empty or quantity is not positive
   */
  addConsumedItem(productId: string, quantity: number): void {
    if (!productId || productId.trim().length === 0) {
      throw new Error('Product ID cannot be empty');
    }

    if (quantity <= 0) {
      throw new Error('Consumed item quantity must be positive');
    }

    const existingIndex = this._consumedItems.findIndex(item => item.productId === productId);
    
    if (existingIndex > -1) {
      // Update existing item quantity
      this._consumedItems[existingIndex] = {
        productId,
        quantity: this._consumedItems[existingIndex].quantity + quantity
      };
    } else {
      // Add new item
      this._consumedItems.push({ productId, quantity });
    }

    // Automatically enable inventory consumption if not already enabled
    if (!this._consumesInventory) {
      this._consumesInventory = true;
    }

    this._updatedAt = new Date();
  }

  /**
   * Removes a consumed item from the service
   * 
   * @param productId - Product ID to remove
   */
  removeConsumedItem(productId: string): void {
    const index = this._consumedItems.findIndex(item => item.productId === productId);
    if (index > -1) {
      this._consumedItems.splice(index, 1);
      
      // If no consumed items remain, disable inventory consumption
      if (this._consumedItems.length === 0) {
        this._consumesInventory = false;
      }
      
      this._updatedAt = new Date();
    }
  }

  /**
   * Updates the quantity of a consumed item
   * 
   * @param productId - Product ID
   * @param quantity - New quantity
   * @throws Error if productId not found or quantity is not positive
   */
  updateConsumedItemQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Consumed item quantity must be positive');
    }

    const index = this._consumedItems.findIndex(item => item.productId === productId);
    if (index === -1) {
      throw new Error(`Consumed item with product ID ${productId} not found`);
    }

    this._consumedItems[index] = { productId, quantity };
    this._updatedAt = new Date();
  }

  /**
   * Gets the consumed quantity for a specific product
   * 
   * @param productId - Product ID
   * @returns Quantity consumed, or 0 if product is not consumed
   */
  getConsumedQuantity(productId: string): number {
    const item = this._consumedItems.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  }

  /**
   * Adds a tag to the service
   * 
   * @param tag - Tag to add
   * @throws Error if tag is empty
   */
  addTag(tag: string): void {
    if (!tag || tag.trim().length === 0) {
      throw new Error('Tag cannot be empty');
    }

    if (!this._tags.includes(tag)) {
      this._tags.push(tag);
      this._updatedAt = new Date();
    }
  }

  /**
   * Removes a tag from the service
   * 
   * @param tag - Tag to remove
   */
  removeTag(tag: string): void {
    const index = this._tags.indexOf(tag);
    if (index > -1) {
      this._tags.splice(index, 1);
      this._updatedAt = new Date();
    }
  }

  /**
   * Sets all tags
   * 
   * @param tags - New list of tags
   * @throws Error if any tag is empty
   */
  setTags(tags: string[]): void {
    this.validateTags(tags);
    this._tags = [...tags];
    this._updatedAt = new Date();
  }

  /**
   * Checks if service has a specific tag
   * 
   * @param tag - Tag to check
   * @returns True if service has the tag
   */
  hasTag(tag: string): boolean {
    return this._tags.includes(tag);
  }

  /**
   * Calculates the service duration in hours
   * 
   * @returns Duration in hours (decimal)
   */
  getDurationHours(): number {
    return this._durationMinutes / 60;
  }

  /**
   * Checks if the service consumes inventory
   * 
   * @returns True if service consumes inventory
   */
  consumesInventoryItems(): boolean {
    return this._consumesInventory && this._consumedItems.length > 0;
  }

  /**
   * Gets the total number of different products consumed
   * 
   * @returns Number of unique products consumed
   */
  getConsumedProductsCount(): number {
    return this._consumedItems.length;
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Service ID is required');
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Service name is required');
    }

    if (name.trim().length > 255) {
      throw new Error('Service name cannot exceed 255 characters');
    }
  }

  private validateDurationMinutes(durationMinutes: number): void {
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      throw new Error('Service duration must be a positive integer (in minutes)');
    }
  }

  private validatePrice(price: number): void {
    if (price < 0) {
      throw new Error('Service price cannot be negative');
    }
  }

  private validateConsumedItems(consumedItems: ConsumedItem[]): void {
    for (const item of consumedItems) {
      if (!item.productId || item.productId.trim().length === 0) {
        throw new Error('Consumed item product ID cannot be empty');
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error('Consumed item quantity must be a positive integer');
      }
    }

    // Check for duplicate product IDs
    const productIds = consumedItems.map(item => item.productId);
    const uniqueProductIds = new Set(productIds);
    if (uniqueProductIds.size !== productIds.length) {
      throw new Error('Consumed items cannot have duplicate product IDs');
    }
  }

  private validateResourceIds(resources: string[]): void {
    for (const resourceId of resources) {
      if (!resourceId || resourceId.trim().length === 0) {
        throw new Error('Resource ID cannot be empty');
      }
    }
  }

  private validateTags(tags: string[]): void {
    for (const tag of tags) {
      if (!tag || tag.trim().length === 0) {
        throw new Error('Tag cannot be empty');
      }
    }
  }
}

