/**
 * Company Domain Entity
 *
 * Represents the business profile (company) in the petshop management system.
 * This entity represents the legal business entity that operates the petshop stores.
 * This is a pure domain entity with no framework dependencies.
 *
 * Business Rules:
 * - Company name is required
 * - NIF (Portuguese tax ID) must be validated when provided
 * - Address is required and must be valid
 * - Tax regime is required for fiscal compliance
 * - Default VAT rate must be between 0 and 100 if provided
 * - Only Owner role users may update core fiscal fields (enforced at use case level)
 */

export interface Address {
  readonly street: string;
  readonly city: string;
  readonly postalCode: string;
  readonly country?: string;
}

export class Company {
  private readonly _id: string;
  private _name: string;
  private _nif: string;
  private _address: Address;
  private _taxRegime: string;
  private _defaultVatRate?: number;
  private _phone?: string;
  private _email?: string;
  private _website?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Creates a new Company entity
   *
   * @param id - Unique identifier (UUID)
   * @param name - Company name (required)
   * @param nif - Portuguese NIF (tax identification number) (required)
   * @param address - Company address (required)
   * @param taxRegime - Tax regime (required)
   * @param defaultVatRate - Default VAT rate (0-100)
   * @param phone - Contact phone number
   * @param email - Contact email
   * @param website - Company website
   * @param createdAt - Creation timestamp
   * @param updatedAt - Last update timestamp
   *
   * @throws Error if name is empty
   * @throws Error if nif is empty or invalid format
   * @throws Error if address is invalid
   * @throws Error if taxRegime is empty
   * @throws Error if defaultVatRate is out of range
   */
  constructor(
    id: string,
    name: string,
    nif: string,
    address: Address,
    taxRegime: string,
    defaultVatRate?: number,
    phone?: string,
    email?: string,
    website?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.validateId(id);
    this.validateName(name);
    this.validateNif(nif);
    this.validateAddress(address);
    this.validateTaxRegime(taxRegime);

    if (defaultVatRate !== undefined) {
      this.validateVatRate(defaultVatRate);
    }

    if (email) {
      this.validateEmail(email);
    }

    this._id = id;
    this._name = name;
    this._nif = nif;
    this._address = { ...address };
    this._taxRegime = taxRegime;
    this._defaultVatRate = defaultVatRate;
    this._phone = phone;
    this._email = email;
    this._website = website;
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

  get nif(): string {
    return this._nif;
  }

  get address(): Address {
    return { ...this._address };
  }

  get taxRegime(): string {
    return this._taxRegime;
  }

  get defaultVatRate(): number | undefined {
    return this._defaultVatRate;
  }

  get phone(): string | undefined {
    return this._phone;
  }

  get email(): string | undefined {
    return this._email;
  }

  get website(): string | undefined {
    return this._website;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Updates the company name
   *
   * @param name - New company name
   * @throws Error if name is empty
   */
  updateName(name: string): void {
    this.validateName(name);
    this._name = name;
    this._updatedAt = new Date();
  }

  /**
   * Updates the NIF (Portuguese tax ID)
   * Note: This is a core fiscal field - should only be updated by Owner role users
   *
   * @param nif - New NIF number
   * @throws Error if NIF format is invalid
   */
  updateNif(nif: string): void {
    this.validateNif(nif);
    this._nif = nif;
    this._updatedAt = new Date();
  }

  /**
   * Updates the company address
   *
   * @param address - New address
   * @throws Error if address is invalid
   */
  updateAddress(address: Address): void {
    this.validateAddress(address);
    this._address = { ...address };
    this._updatedAt = new Date();
  }

  /**
   * Updates the tax regime
   * Note: This is a core fiscal field - should only be updated by Owner role users
   *
   * @param taxRegime - New tax regime
   * @throws Error if taxRegime is empty
   */
  updateTaxRegime(taxRegime: string): void {
    this.validateTaxRegime(taxRegime);
    this._taxRegime = taxRegime;
    this._updatedAt = new Date();
  }

  /**
   * Updates the default VAT rate
   * Note: This is a core fiscal field - should only be updated by Owner role users
   *
   * @param vatRate - New default VAT rate (0-100)
   * @throws Error if vatRate is out of range
   */
  updateDefaultVatRate(vatRate: number | undefined): void {
    if (vatRate !== undefined) {
      this.validateVatRate(vatRate);
    }
    this._defaultVatRate = vatRate;
    this._updatedAt = new Date();
  }

  /**
   * Updates the company phone number
   *
   * @param phone - New phone number
   */
  updatePhone(phone: string | undefined): void {
    this._phone = phone;
    this._updatedAt = new Date();
  }

  /**
   * Updates the company email
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
   * Updates the company website
   *
   * @param website - New website URL
   */
  updateWebsite(website: string | undefined): void {
    this._website = website;
    this._updatedAt = new Date();
  }

  /**
   * Checks if the company has a valid NIF
   */
  hasValidNif(): boolean {
    try {
      this.validateNif(this._nif);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if the company has complete address information
   */
  hasCompleteAddress(): boolean {
    return (
      !!this._address &&
      !!this._address.street &&
      !!this._address.city &&
      !!this._address.postalCode
    );
  }

  /**
   * Checks if the company has all required fiscal information for invoicing
   *
   * @returns True if NIF and address are valid
   */
  hasRequiredFiscalInfo(): boolean {
    return this.hasValidNif() && this.hasCompleteAddress();
  }

  /**
   * Gets the VAT rate to use (default or provided rate)
   *
   * @param overrideRate - Optional override rate
   * @returns VAT rate to use
   */
  getVatRate(overrideRate?: number): number | undefined {
    return overrideRate !== undefined ? overrideRate : this._defaultVatRate;
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Company ID is required');
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Company name is required');
    }

    if (name.trim().length > 255) {
      throw new Error('Company name cannot exceed 255 characters');
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
      throw new Error('NIF is required');
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
    if (!address) {
      throw new Error('Address is required');
    }

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

  private validateTaxRegime(taxRegime: string): void {
    if (!taxRegime || taxRegime.trim().length === 0) {
      throw new Error('Tax regime is required');
    }

    if (taxRegime.trim().length > 100) {
      throw new Error('Tax regime cannot exceed 100 characters');
    }
  }

  private validateVatRate(vatRate: number): void {
    if (vatRate < 0 || vatRate > 100) {
      throw new Error('VAT rate must be between 0 and 100');
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
}
