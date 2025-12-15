/**
 * Owner Domain Entity
 * 
 * Represents a business owner (proprietário) of the Company in the petshop management system.
 * This entity represents the legal/fiscal owner(s) of the business, distinct from system Users.
 * This is a pure domain entity with no framework dependencies.
 * 
 * Business Rules:
 * - An Owner must be linked to a Company (invariant)
 * - NIF (Portuguese tax ID) must be validated when provided
 * - Ownership percentage must be between 0 and 100
 * - At least one Owner must exist for a Company
 */

export interface Address {
  readonly street: string;
  readonly city: string;
  readonly postalCode: string;
  readonly country?: string;
}

export class Owner {
  private readonly _id: string;
  private readonly _companyId: string;
  private _fullName: string;
  private _nif?: string;
  private _address?: Address;
  private _email?: string;
  private _phone?: string;
  private _ownershipPercentage: number;
  private _isPrimaryOwner: boolean;
  private _dateOfBirth?: Date;
  private _nationality?: string;
  private _notes?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Creates a new Owner entity
   * 
   * @param id - Unique identifier (UUID)
   * @param companyId - Company ID that this owner belongs to (required)
   * @param fullName - Owner's full name (required)
   * @param nif - Portuguese NIF (tax identification number)
   * @param address - Owner's address
   * @param email - Contact email
   * @param phone - Contact phone
   * @param ownershipPercentage - Percentage of ownership (0-100, default 100)
   * @param isPrimaryOwner - Whether this is the primary owner (default true)
   * @param dateOfBirth - Date of birth
   * @param nationality - Nationality
   * @param notes - Additional notes
   * @param createdAt - Creation timestamp
   * @param updatedAt - Last update timestamp
   * 
   * @throws Error if companyId is empty or invalid
   * @throws Error if fullName is empty
   * @throws Error if nif format is invalid (when provided)
   * @throws Error if ownershipPercentage is out of range
   */
  constructor(
    id: string,
    companyId: string,
    fullName: string,
    nif?: string,
    address?: Address,
    email?: string,
    phone?: string,
    ownershipPercentage: number = 100,
    isPrimaryOwner: boolean = true,
    dateOfBirth?: Date,
    nationality?: string,
    notes?: string,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.validateId(id);
    this.validateCompanyId(companyId);
    this.validateFullName(fullName);
    
    if (nif) {
      this.validateNif(nif);
    }

    this.validateOwnershipPercentage(ownershipPercentage);

    this._id = id;
    this._companyId = companyId;
    this._fullName = fullName;
    this._nif = nif;
    this._address = address ? { ...address } : undefined;
    this._email = email;
    this._phone = phone;
    this._ownershipPercentage = ownershipPercentage;
    this._isPrimaryOwner = isPrimaryOwner;
    this._dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
    this._nationality = nationality;
    this._notes = notes;
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
    this._updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  // Getters (read-only access to private fields)
  get id(): string {
    return this._id;
  }

  get companyId(): string {
    return this._companyId;
  }

  get fullName(): string {
    return this._fullName;
  }

  get nif(): string | undefined {
    return this._nif;
  }

  get address(): Address | undefined {
    return this._address ? { ...this._address } : undefined;
  }

  get email(): string | undefined {
    return this._email;
  }

  get phone(): string | undefined {
    return this._phone;
  }

  get ownershipPercentage(): number {
    return this._ownershipPercentage;
  }

  get isPrimaryOwner(): boolean {
    return this._isPrimaryOwner;
  }

  get dateOfBirth(): Date | undefined {
    return this._dateOfBirth ? new Date(this._dateOfBirth) : undefined;
  }

  get nationality(): string | undefined {
    return this._nationality;
  }

  get notes(): string | undefined {
    return this._notes;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Updates the owner's full name
   * 
   * @param fullName - New full name
   * @throws Error if name is empty
   */
  updateFullName(fullName: string): void {
    this.validateFullName(fullName);
    this._fullName = fullName;
    this._updatedAt = new Date();
  }

  /**
   * Updates or sets the NIF (Portuguese tax ID)
   * 
   * @param nif - NIF number
   * @throws Error if NIF format is invalid
   */
  updateNif(nif: string | undefined): void {
    if (nif) {
      this.validateNif(nif);
    }
    this._nif = nif;
    this._updatedAt = new Date();
  }

  /**
   * Updates the owner's address
   * 
   * @param address - New address
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
   * Updates the owner's email
   * 
   * @param email - New email address
   * @throws Error if email format is invalid (when provided)
   */
  updateEmail(email: string | undefined): void {
    if (email) {
      this.validateEmail(email);
    }
    this._email = email;
    this._updatedAt = new Date();
  }

  /**
   * Updates the owner's phone number
   * 
   * @param phone - New phone number
   */
  updatePhone(phone: string | undefined): void {
    this._phone = phone;
    this._updatedAt = new Date();
  }

  /**
   * Updates the ownership percentage
   * 
   * @param percentage - New ownership percentage (0-100)
   * @throws Error if percentage is out of range
   */
  updateOwnershipPercentage(percentage: number): void {
    this.validateOwnershipPercentage(percentage);
    this._ownershipPercentage = percentage;
    this._updatedAt = new Date();
  }

  /**
   * Sets or unsets the primary owner flag
   * 
   * @param isPrimary - Whether this owner is the primary owner
   */
  setPrimaryOwner(isPrimary: boolean): void {
    this._isPrimaryOwner = isPrimary;
    this._updatedAt = new Date();
  }

  /**
   * Updates the date of birth
   * 
   * @param dateOfBirth - Date of birth
   * @throws Error if date is in the future
   */
  updateDateOfBirth(dateOfBirth: Date | undefined): void {
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      
      if (birthDate > today) {
        throw new Error('Date of birth cannot be in the future');
      }
    }

    this._dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
    this._updatedAt = new Date();
  }

  /**
   * Updates the nationality
   * 
   * @param nationality - Nationality
   */
  updateNationality(nationality: string | undefined): void {
    this._nationality = nationality;
    this._updatedAt = new Date();
  }

  /**
   * Updates additional notes
   * 
   * @param notes - Notes
   */
  updateNotes(notes: string | undefined): void {
    this._notes = notes;
    this._updatedAt = new Date();
  }

  /**
   * Checks if the owner has a valid NIF
   */
  hasNif(): boolean {
    return !!this._nif && this._nif.trim().length > 0;
  }

  /**
   * Checks if the owner has complete address information
   */
  hasCompleteAddress(): boolean {
    return !!this._address && 
           !!this._address.street && 
           !!this._address.city && 
           !!this._address.postalCode;
  }

  /**
   * Checks if the owner has all required fiscal information
   * (NIF and complete address are typically required for fiscal purposes)
   */
  hasRequiredFiscalInfo(): boolean {
    return this.hasNif() && this.hasCompleteAddress();
  }

  /**
   * Calculates the owner's age in years
   * Returns undefined if date of birth is not set
   */
  calculateAge(): number | undefined {
    if (!this._dateOfBirth) {
      return undefined;
    }

    const today = new Date();
    const birthDate = new Date(this._dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Owner ID is required');
    }
  }

  private validateCompanyId(companyId: string): void {
    if (!companyId || companyId.trim().length === 0) {
      throw new Error('Company ID is required - an Owner must be linked to a Company');
    }
  }

  private validateFullName(fullName: string): void {
    if (!fullName || fullName.trim().length === 0) {
      throw new Error('Owner full name is required');
    }

    if (fullName.trim().length > 255) {
      throw new Error('Owner full name cannot exceed 255 characters');
    }
  }

  /**
   * Validates Portuguese NIF (Número de Identificação Fiscal) format
   * NIF format: 9 digits, with a check digit algorithm
   * 
   * @param nif - NIF to validate
   * @throws Error if format is invalid
   */
  private validateNif(nif: string): void {
    if (!nif || nif.trim().length === 0) {
      throw new Error('NIF cannot be empty');
    }

    const trimmed = nif.trim().replace(/\s/g, '');

    // NIF must be exactly 9 digits
    if (!/^\d{9}$/.test(trimmed)) {
      throw new Error('NIF must be exactly 9 digits');
    }

    // Validate check digit using Portuguese NIF algorithm
    if (!this.isValidNifCheckDigit(trimmed)) {
      throw new Error('Invalid NIF check digit');
    }
  }

  /**
   * Validates NIF check digit using Portuguese algorithm
   * Algorithm: Multiply each digit by weights (9,8,7,6,5,4,3,2), sum, divide by 11
   * Check digit is 11 - (sum % 11), or 0 if result is 10 or 11
   */
  private isValidNifCheckDigit(nif: string): boolean {
    if (nif.length !== 9) {
      return false;
    }

    const digits = nif.split('').map(Number);
    const weights = [9, 8, 7, 6, 5, 4, 3, 2];
    
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += digits[i] * weights[i];
    }

    const remainder = sum % 11;
    let checkDigit = 11 - remainder;
    
    if (checkDigit >= 10) {
      checkDigit = 0;
    }

    return checkDigit === digits[8];
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

    // Validate Portuguese postal code format (XXXX-XXX)
    const postalCodeRegex = /^\d{4}-\d{3}$/;
    if (!postalCodeRegex.test(address.postalCode.trim())) {
      throw new Error('Invalid Portuguese postal code format. Expected format: XXXX-XXX');
    }
  }

  private validateEmail(email: string): void {
    if (!email || email.trim().length === 0) {
      throw new Error('Email cannot be empty');
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Invalid email format');
    }

    if (email.length > 255) {
      throw new Error('Email cannot exceed 255 characters');
    }
  }

  private validateOwnershipPercentage(percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Ownership percentage must be between 0 and 100');
    }
  }
}

