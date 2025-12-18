/**
 * Supplier Domain Entity
 *
 * Represents a supplier/vendor in the petshop management system.
 * Suppliers provide products to the petshop and are used for purchase orders and inventory management.
 * This is a pure domain entity with no framework dependencies.
 *
 * Business Rules:
 * - Supplier name is required
 * - Email format must be validated when provided
 * - Default lead time days must be non-negative if provided
 * - Suggested reorder uses Supplier default_lead_time_days when calculating expected arrival
 */

export class Supplier {
  private readonly _id: string;
  private _name: string;
  private _contactEmail?: string;
  private _phone?: string;
  private _defaultLeadTimeDays?: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Creates a new Supplier entity
   *
   * @param id - Unique identifier (UUID)
   * @param name - Supplier name (required)
   * @param contactEmail - Contact email address
   * @param phone - Contact phone number
   * @param defaultLeadTimeDays - Default lead time in days for orders
   * @param createdAt - Creation timestamp
   * @param updatedAt - Last update timestamp
   *
   * @throws Error if id is empty
   * @throws Error if name is empty
   * @throws Error if contactEmail format is invalid (when provided)
   * @throws Error if defaultLeadTimeDays is negative
   */
  constructor(
    id: string,
    name: string,
    contactEmail?: string,
    phone?: string,
    defaultLeadTimeDays?: number,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.validateId(id);
    this.validateName(name);

    if (contactEmail) {
      this.validateEmail(contactEmail);
    }

    if (defaultLeadTimeDays !== undefined) {
      this.validateLeadTimeDays(defaultLeadTimeDays);
    }

    this._id = id;
    this._name = name;
    this._contactEmail = contactEmail;
    this._phone = phone;
    this._defaultLeadTimeDays = defaultLeadTimeDays;
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

  get contactEmail(): string | undefined {
    return this._contactEmail;
  }

  get phone(): string | undefined {
    return this._phone;
  }

  get defaultLeadTimeDays(): number | undefined {
    return this._defaultLeadTimeDays;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Updates the supplier name
   *
   * @param name - New supplier name
   * @throws Error if name is empty
   */
  updateName(name: string): void {
    this.validateName(name);
    this._name = name;
    this._updatedAt = new Date();
  }

  /**
   * Updates the contact email
   *
   * @param contactEmail - New contact email
   * @throws Error if email format is invalid
   */
  updateContactEmail(contactEmail: string | undefined): void {
    if (contactEmail) {
      this.validateEmail(contactEmail);
    }
    this._contactEmail = contactEmail;
    this._updatedAt = new Date();
  }

  /**
   * Updates the phone number
   *
   * @param phone - New phone number
   */
  updatePhone(phone: string | undefined): void {
    this._phone = phone;
    this._updatedAt = new Date();
  }

  /**
   * Updates the default lead time in days
   *
   * @param defaultLeadTimeDays - New default lead time in days
   * @throws Error if defaultLeadTimeDays is negative
   */
  updateDefaultLeadTimeDays(defaultLeadTimeDays: number | undefined): void {
    if (defaultLeadTimeDays !== undefined) {
      this.validateLeadTimeDays(defaultLeadTimeDays);
    }
    this._defaultLeadTimeDays = defaultLeadTimeDays;
    this._updatedAt = new Date();
  }

  /**
   * Calculates the expected arrival date based on default lead time
   *
   * @param orderDate - Date when order is placed (defaults to now)
   * @returns Expected arrival date, or undefined if lead time is not set
   */
  calculateExpectedArrivalDate(orderDate: Date = new Date()): Date | undefined {
    if (this._defaultLeadTimeDays === undefined) {
      return undefined;
    }

    const arrivalDate = new Date(orderDate);
    arrivalDate.setDate(arrivalDate.getDate() + this._defaultLeadTimeDays);
    return arrivalDate;
  }

  /**
   * Calculates the expected arrival date based on a custom lead time
   *
   * @param orderDate - Date when order is placed (defaults to now)
   * @param leadTimeDays - Custom lead time in days
   * @returns Expected arrival date
   * @throws Error if leadTimeDays is negative
   */
  calculateExpectedArrivalDateWithLeadTime(orderDate: Date, leadTimeDays: number): Date {
    if (leadTimeDays < 0) {
      throw new Error('Lead time days cannot be negative');
    }

    const arrivalDate = new Date(orderDate);
    arrivalDate.setDate(arrivalDate.getDate() + leadTimeDays);
    return arrivalDate;
  }

  /**
   * Checks if the supplier has a default lead time set
   *
   * @returns True if default lead time is set
   */
  hasDefaultLeadTime(): boolean {
    return this._defaultLeadTimeDays !== undefined;
  }

  /**
   * Checks if the supplier has contact email
   *
   * @returns True if contact email is set
   */
  hasContactEmail(): boolean {
    return !!this._contactEmail && this._contactEmail.trim().length > 0;
  }

  /**
   * Checks if the supplier has phone number
   *
   * @returns True if phone is set
   */
  hasPhone(): boolean {
    return !!this._phone && this._phone.trim().length > 0;
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Supplier ID is required');
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Supplier name is required');
    }

    if (name.trim().length > 255) {
      throw new Error('Supplier name cannot exceed 255 characters');
    }
  }

  /**
   * Validates email format
   * Uses a basic email validation pattern
   *
   * @param email - Email address to validate
   * @throws Error if email format is invalid
   */
  private validateEmail(email: string): void {
    if (!email || email.trim().length === 0) {
      throw new Error('Email cannot be empty');
    }

    // Basic email validation pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      throw new Error('Invalid email format');
    }

    if (email.trim().length > 255) {
      throw new Error('Email cannot exceed 255 characters');
    }
  }

  private validateLeadTimeDays(leadTimeDays: number): void {
    if (!Number.isInteger(leadTimeDays) || leadTimeDays < 0) {
      throw new Error('Default lead time days must be a non-negative integer');
    }
  }
}
