/**
 * Customer Domain Entity
 * 
 * Represents a client/owner of pets in the petshop management system.
 * Customers are the people who bring their pets to the petshop for services.
 * This is a pure domain entity with no framework dependencies.
 * 
 * Business Rules:
 * - Customer full name is required
 * - Email format must be validated when provided
 * - consentReminders must be true to send appointment reminders by email
 * - Deleting a Customer requires reassigning or deleting linked Pets/appointments or archiving
 */

export interface Address {
  readonly street: string;
  readonly city: string;
  readonly postalCode: string;
  readonly country?: string;
}

export class Customer {
  private readonly _id: string;
  private _fullName: string;
  private _email?: string;
  private _phone?: string;
  private _address?: Address;
  private _consentMarketing: boolean;
  private _consentReminders: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Creates a new Customer entity
   * 
   * @param id - Unique identifier (UUID)
   * @param fullName - Customer's full name (required)
   * @param email - Contact email
   * @param phone - Contact phone
   * @param address - Customer's address
   * @param consentMarketing - Consent for marketing communications (default false)
   * @param consentReminders - Consent for appointment reminders (default false)
   * @param createdAt - Creation timestamp
   * @param updatedAt - Last update timestamp
   * 
   * @throws Error if id is empty
   * @throws Error if fullName is empty
   * @throws Error if email format is invalid (when provided)
   */
  constructor(
    id: string,
    fullName: string,
    email?: string,
    phone?: string,
    address?: Address,
    consentMarketing: boolean = false,
    consentReminders: boolean = false,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.validateId(id);
    this.validateFullName(fullName);

    if (email) {
      this.validateEmail(email);
    }

    if (address) {
      this.validateAddress(address);
    }

    this._id = id;
    this._fullName = fullName;
    this._email = email;
    this._phone = phone;
    this._address = address ? { ...address } : undefined;
    this._consentMarketing = consentMarketing;
    this._consentReminders = consentReminders;
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
    this._updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  // Getters (read-only access to private fields)
  get id(): string {
    return this._id;
  }

  get fullName(): string {
    return this._fullName;
  }

  get email(): string | undefined {
    return this._email;
  }

  get phone(): string | undefined {
    return this._phone;
  }

  get address(): Address | undefined {
    return this._address ? { ...this._address } : undefined;
  }

  get consentMarketing(): boolean {
    return this._consentMarketing;
  }

  get consentReminders(): boolean {
    return this._consentReminders;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Updates the customer's full name
   * 
   * @param fullName - New full name
   * @throws Error if fullName is empty
   */
  updateFullName(fullName: string): void {
    this.validateFullName(fullName);
    this._fullName = fullName;
    this._updatedAt = new Date();
  }

  /**
   * Updates the customer's email
   * 
   * @param email - New email address
   * @throws Error if email format is invalid
   */
  updateEmail(email: string | undefined): void {
    if (email) {
      this.validateEmail(email);
    }
    this._email = email;
    this._updatedAt = new Date();
  }

  /**
   * Updates the customer's phone number
   * 
   * @param phone - New phone number
   */
  updatePhone(phone: string | undefined): void {
    this._phone = phone;
    this._updatedAt = new Date();
  }

  /**
   * Updates the customer's address
   * 
   * @param address - New address
   * @throws Error if address structure is invalid
   */
  updateAddress(address: Address | undefined): void {
    if (address) {
      this.validateAddress(address);
      this._address = { ...address };
    } else {
      this._address = undefined;
    }
    this._updatedAt = new Date();
  }

  /**
   * Updates marketing consent
   * 
   * @param consent - New marketing consent value
   */
  updateConsentMarketing(consent: boolean): void {
    this._consentMarketing = consent;
    this._updatedAt = new Date();
  }

  /**
   * Updates appointment reminders consent
   * 
   * @param consent - New reminders consent value
   */
  updateConsentReminders(consent: boolean): void {
    this._consentReminders = consent;
    this._updatedAt = new Date();
  }

  /**
   * Checks if the customer can receive appointment reminders
   * consentReminders must be true to send appointment reminders by email
   * 
   * @returns True if customer has consented to reminders
   */
  canReceiveReminders(): boolean {
    return this._consentReminders;
  }

  /**
   * Checks if the customer can receive marketing communications
   * 
   * @returns True if customer has consented to marketing
   */
  canReceiveMarketing(): boolean {
    return this._consentMarketing;
  }

  /**
   * Checks if the customer has a valid email address
   * 
   * @returns True if email is set and valid
   */
  hasEmail(): boolean {
    return !!this._email && this._email.trim().length > 0;
  }

  /**
   * Checks if the customer has a valid phone number
   * 
   * @returns True if phone is set and valid
   */
  hasPhone(): boolean {
    return !!this._phone && this._phone.trim().length > 0;
  }

  /**
   * Checks if the customer has a complete address
   * 
   * @returns True if address is set and valid
   */
  hasAddress(): boolean {
    return !!this._address && 
           !!this._address.street && 
           !!this._address.city && 
           !!this._address.postalCode;
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Customer ID is required');
    }
  }

  private validateFullName(fullName: string): void {
    if (!fullName || fullName.trim().length === 0) {
      throw new Error('Customer full name is required');
    }

    if (fullName.trim().length > 200) {
      throw new Error('Customer full name cannot exceed 200 characters');
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

  private validateAddress(address: Address): void {
    if (!address.street || address.street.trim().length === 0) {
      throw new Error('Address street is required');
    }

    if (!address.city || address.city.trim().length === 0) {
      throw new Error('Address city is required');
    }

    if (!address.postalCode || address.postalCode.trim().length === 0) {
      throw new Error('Address postal code is required');
    }

    if (address.street.trim().length > 200) {
      throw new Error('Address street cannot exceed 200 characters');
    }

    if (address.city.trim().length > 100) {
      throw new Error('Address city cannot exceed 100 characters');
    }

    if (address.postalCode.trim().length > 20) {
      throw new Error('Address postal code cannot exceed 20 characters');
    }
  }
}

