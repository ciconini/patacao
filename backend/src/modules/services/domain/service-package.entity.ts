/**
 * ServicePackage Domain Entity
 * 
 * Represents a package/bundle of services offered by the petshop.
 * Service packages allow grouping multiple services together, often with a bundle price.
 * When booked, packages create separate AppointmentServiceLine entries for each included Service.
 * This is a pure domain entity with no framework dependencies.
 * 
 * Business Rules:
 * - Package name is required
 * - Services list must contain at least one service
 * - Bundle price must be non-negative if provided
 * - Packages create separate AppointmentServiceLine entries for each included Service when booked
 */

export interface ServicePackageItem {
  readonly serviceId: string;
  readonly quantity: number;
}

export class ServicePackage {
  private readonly _id: string;
  private _name: string;
  private _description?: string;
  private _services: ServicePackageItem[];
  private _bundlePrice?: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Creates a new ServicePackage entity
   * 
   * @param id - Unique identifier (UUID)
   * @param name - Package name (required)
   * @param services - Ordered list of services with quantities (required, must have at least one)
   * @param description - Package description
   * @param bundlePrice - Bundle price (optional, must be non-negative if provided)
   * @param createdAt - Creation timestamp
   * @param updatedAt - Last update timestamp
   * 
   * @throws Error if id is empty
   * @throws Error if name is empty
   * @throws Error if services list is empty
   * @throws Error if bundlePrice is negative
   */
  constructor(
    id: string,
    name: string,
    services: ServicePackageItem[],
    description?: string,
    bundlePrice?: number,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.validateId(id);
    this.validateName(name);
    this.validateServices(services);

    if (bundlePrice !== undefined) {
      this.validateBundlePrice(bundlePrice);
    }

    this._id = id;
    this._name = name;
    this._description = description;
    this._services = services.map(item => ({ ...item }));
    this._bundlePrice = bundlePrice;
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

  get services(): ReadonlyArray<ServicePackageItem> {
    return this._services.map(item => ({ ...item }));
  }

  get bundlePrice(): number | undefined {
    return this._bundlePrice;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Updates the package name
   * 
   * @param name - New package name
   * @throws Error if name is empty
   */
  updateName(name: string): void {
    this.validateName(name);
    this._name = name;
    this._updatedAt = new Date();
  }

  /**
   * Updates the package description
   * 
   * @param description - New description
   */
  updateDescription(description: string | undefined): void {
    this._description = description;
    this._updatedAt = new Date();
  }

  /**
   * Updates the bundle price
   * 
   * @param bundlePrice - New bundle price
   * @throws Error if bundlePrice is negative
   */
  updateBundlePrice(bundlePrice: number | undefined): void {
    if (bundlePrice !== undefined) {
      this.validateBundlePrice(bundlePrice);
    }
    this._bundlePrice = bundlePrice;
    this._updatedAt = new Date();
  }

  /**
   * Adds a service to the package
   * 
   * @param serviceId - Service ID to add
   * @param quantity - Quantity of the service (default 1)
   * @throws Error if serviceId is empty or quantity is not positive
   */
  addService(serviceId: string, quantity: number = 1): void {
    if (!serviceId || serviceId.trim().length === 0) {
      throw new Error('Service ID cannot be empty');
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Service quantity must be a positive integer');
    }

    const existingIndex = this._services.findIndex(item => item.serviceId === serviceId);

    if (existingIndex > -1) {
      // Update existing service quantity
      this._services[existingIndex] = {
        serviceId,
        quantity: this._services[existingIndex].quantity + quantity
      };
    } else {
      // Add new service
      this._services.push({ serviceId, quantity });
    }

    this._updatedAt = new Date();
  }

  /**
   * Removes a service from the package
   * 
   * @param serviceId - Service ID to remove
   * @throws Error if serviceId not found or if removing would leave package empty
   */
  removeService(serviceId: string): void {
    const index = this._services.findIndex(item => item.serviceId === serviceId);
    
    if (index === -1) {
      throw new Error(`Service with ID ${serviceId} not found in package`);
    }

    if (this._services.length === 1) {
      throw new Error('Cannot remove the last service from package - package must have at least one service');
    }

    this._services.splice(index, 1);
    this._updatedAt = new Date();
  }

  /**
   * Updates the quantity of a service in the package
   * 
   * @param serviceId - Service ID
   * @param quantity - New quantity
   * @throws Error if serviceId not found or quantity is not positive
   */
  updateServiceQuantity(serviceId: string, quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Service quantity must be a positive integer');
    }

    const index = this._services.findIndex(item => item.serviceId === serviceId);
    
    if (index === -1) {
      throw new Error(`Service with ID ${serviceId} not found in package`);
    }

    this._services[index] = { serviceId, quantity };
    this._updatedAt = new Date();
  }

  /**
   * Gets the quantity for a specific service in the package
   * 
   * @param serviceId - Service ID
   * @returns Quantity of the service, or 0 if service is not in package
   */
  getServiceQuantity(serviceId: string): number {
    const item = this._services.find(item => item.serviceId === serviceId);
    return item ? item.quantity : 0;
  }

  /**
   * Checks if the package contains a specific service
   * 
   * @param serviceId - Service ID to check
   * @returns True if service is in the package
   */
  containsService(serviceId: string): boolean {
    return this._services.some(item => item.serviceId === serviceId);
  }

  /**
   * Gets the total number of services in the package
   * 
   * @returns Number of unique services in the package
   */
  getServiceCount(): number {
    return this._services.length;
  }

  /**
   * Gets the total quantity of all services in the package
   * 
   * @returns Sum of all service quantities
   */
  getTotalServiceQuantity(): number {
    return this._services.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Sets all services in the package
   * 
   * @param services - New list of services with quantities
   * @throws Error if services list is empty or invalid
   */
  setServices(services: ServicePackageItem[]): void {
    this.validateServices(services);
    this._services = services.map(item => ({ ...item }));
    this._updatedAt = new Date();
  }

  /**
   * Checks if the package has a bundle price
   * 
   * @returns True if bundle price is set
   */
  hasBundlePrice(): boolean {
    return this._bundlePrice !== undefined;
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('ServicePackage ID is required');
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('ServicePackage name is required');
    }

    if (name.trim().length > 255) {
      throw new Error('ServicePackage name cannot exceed 255 characters');
    }
  }

  private validateServices(services: ServicePackageItem[]): void {
    if (!services || services.length === 0) {
      throw new Error('ServicePackage must have at least one service');
    }

    for (const item of services) {
      if (!item.serviceId || item.serviceId.trim().length === 0) {
        throw new Error('Service ID cannot be empty');
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error('Service quantity must be a positive integer');
      }
    }

    // Check for duplicate service IDs
    const serviceIds = services.map(item => item.serviceId);
    const uniqueServiceIds = new Set(serviceIds);
    if (uniqueServiceIds.size !== serviceIds.length) {
      throw new Error('ServicePackage cannot have duplicate service IDs');
    }
  }

  private validateBundlePrice(bundlePrice: number): void {
    if (bundlePrice < 0) {
      throw new Error('Bundle price cannot be negative');
    }
  }
}

