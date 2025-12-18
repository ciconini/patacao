/**
 * Address Value Object
 *
 * Represents a structured address in the petshop management system.
 * This is a pure domain value object that encapsulates address validation and business rules,
 * including Portugal-specific postal code format validation.
 *
 * Value Object Characteristics:
 * - Immutable: All properties are readonly and cannot be changed after creation
 * - No Identity: Equality is determined by value, not by reference
 * - Encapsulates Validation: All validation logic is contained within the value object
 * - Self-Validating: Constructor validates all address components
 *
 * Business Rules:
 * - Street is required and must not exceed 200 characters
 * - City is required and must not exceed 100 characters
 * - Postal code is required and must match Portuguese format (XXXX-XXX)
 * - Country is optional
 * - All string fields are trimmed
 *
 * Invariants:
 * - Street value must be non-empty after trimming
 * - Street value must not exceed 200 characters
 * - City value must be non-empty after trimming
 * - City value must not exceed 100 characters
 * - Postal code value must be non-empty after trimming
 * - Postal code must match Portuguese format (XXXX-XXX)
 * - Postal code must not exceed 20 characters
 * - Value object is immutable after creation
 *
 * Equality Definition:
 * - Two Address instances are equal if all their properties are equal (value comparison)
 * - Equality compares street, city, postalCode, and country
 * - Equality is case-sensitive for string comparisons
 * - Equality is based on address values, not object reference
 *
 * Usage Examples:
 *
 * 1. In Company entity (required):
 *    constructor(
 *      id: string,
 *      name: string,
 *      nif: string,
 *      address: Address, // Address value object
 *      // ... other params
 *    ) {
 *      this._address = address;
 *    }
 *
 * 2. In Customer entity (optional):
 *    constructor(
 *      // ... other params
 *      address?: Address,
 *    ) {
 *      if (address) {
 *        this._address = address;
 *      }
 *    }
 *
 * 3. Creating Address:
 *    const address = new Address(
 *      'Rua das Flores, 123',
 *      'Lisboa',
 *      '1000-001',
 *      'Portugal'
 *    );
 *
 * 4. Equality comparison:
 *    const addr1 = new Address('Rua A', 'Lisboa', '1000-001', 'Portugal');
 *    const addr2 = new Address('Rua A', 'Lisboa', '1000-001', 'Portugal');
 *    addr1.equals(addr2); // true
 *
 * 5. String representation:
 *    const address = new Address('Rua A', 'Lisboa', '1000-001');
 *    address.toString(); // 'Rua A, Lisboa, 1000-001'
 */

export class Address {
  private readonly _street: string;
  private readonly _city: string;
  private readonly _postalCode: string;
  private readonly _country?: string;

  /**
   * Creates a new Address value object
   *
   * @param street - Street address (required)
   * @param city - City name (required)
   * @param postalCode - Postal code in Portuguese format XXXX-XXX (required)
   * @param country - Country name (optional, defaults to undefined)
   * @throws Error if street is empty or exceeds 200 characters
   * @throws Error if city is empty or exceeds 100 characters
   * @throws Error if postalCode is empty, invalid format, or exceeds 20 characters
   */
  constructor(street: string, city: string, postalCode: string, country?: string) {
    this.validateStreet(street);
    this.validateCity(city);
    this.validatePostalCode(postalCode);

    this._street = street.trim();
    this._city = city.trim();
    this._postalCode = postalCode.trim();
    this._country = country ? country.trim() : undefined;
  }

  /**
   * Gets the street address
   *
   * @returns Street address string
   */
  get street(): string {
    return this._street;
  }

  /**
   * Gets the city name
   *
   * @returns City name string
   */
  get city(): string {
    return this._city;
  }

  /**
   * Gets the postal code
   *
   * @returns Postal code string (Portuguese format: XXXX-XXX)
   */
  get postalCode(): string {
    return this._postalCode;
  }

  /**
   * Gets the country name
   *
   * @returns Country name string or undefined
   */
  get country(): string | undefined {
    return this._country;
  }

  /**
   * Checks if the address has a country specified
   *
   * @returns True if country is set
   */
  hasCountry(): boolean {
    return this._country !== undefined && this._country.trim().length > 0;
  }

  /**
   * Checks if this address equals another address
   *
   * Equality is determined by comparing all properties (street, city, postalCode, country).
   *
   * @param other - Other Address to compare
   * @returns True if addresses are equal (all properties match)
   */
  equals(other: Address | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof Address)) {
      return false;
    }

    return (
      this._street === other._street &&
      this._city === other._city &&
      this._postalCode === other._postalCode &&
      this._country === other._country
    );
  }

  /**
   * Converts the address to string representation
   *
   * Format: "street, city, postalCode" or "street, city, postalCode, country" if country is set
   *
   * @returns Address string representation
   */
  toString(): string {
    const parts = [this._street, this._city, this._postalCode];
    if (this._country) {
      parts.push(this._country);
    }
    return parts.join(', ');
  }

  /**
   * Creates a formatted address string with line breaks
   *
   * Format:
   * street
   * postalCode city
   * country (if set)
   *
   * @returns Formatted address string with line breaks
   */
  toFormattedString(): string {
    const lines: string[] = [this._street];
    lines.push(`${this._postalCode} ${this._city}`);
    if (this._country) {
      lines.push(this._country);
    }
    return lines.join('\n');
  }

  /**
   * Creates an Address from an object, returning null if invalid
   *
   * This is a factory method that allows safe creation without throwing exceptions.
   *
   * @param addressData - Address data object
   * @returns Address instance or null if invalid
   */
  static fromObject(
    addressData:
      | {
          street: string;
          city: string;
          postalCode: string;
          country?: string;
        }
      | null
      | undefined,
  ): Address | null {
    if (!addressData) {
      return null;
    }

    try {
      return new Address(
        addressData.street,
        addressData.city,
        addressData.postalCode,
        addressData.country,
      );
    } catch {
      return null;
    }
  }

  /**
   * Validates if address data is valid
   *
   * @param addressData - Address data to validate
   * @returns True if address data is valid
   */
  static isValid(
    addressData:
      | {
          street: string;
          city: string;
          postalCode: string;
          country?: string;
        }
      | null
      | undefined,
  ): boolean {
    if (!addressData) {
      return false;
    }

    try {
      new Address(
        addressData.street,
        addressData.city,
        addressData.postalCode,
        addressData.country,
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Creates a copy of this address with updated properties
   *
   * Since Address is immutable, this method creates a new instance with updated values.
   *
   * @param updates - Partial address data to update
   * @returns New Address instance with updated values
   */
  with(updates: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  }): Address {
    return new Address(
      updates.street !== undefined ? updates.street : this._street,
      updates.city !== undefined ? updates.city : this._city,
      updates.postalCode !== undefined ? updates.postalCode : this._postalCode,
      updates.country !== undefined ? updates.country : this._country,
    );
  }

  // Private validation methods

  /**
   * Validates the street address
   *
   * @param street - Street address to validate
   * @throws Error if street is empty or exceeds length limit
   */
  private validateStreet(street: string): void {
    if (!street || typeof street !== 'string') {
      throw new Error('Address street is required');
    }

    const trimmed = street.trim();

    if (trimmed.length === 0) {
      throw new Error('Address street cannot be empty');
    }

    if (trimmed.length > 200) {
      throw new Error('Address street cannot exceed 200 characters');
    }
  }

  /**
   * Validates the city name
   *
   * @param city - City name to validate
   * @throws Error if city is empty or exceeds length limit
   */
  private validateCity(city: string): void {
    if (!city || typeof city !== 'string') {
      throw new Error('Address city is required');
    }

    const trimmed = city.trim();

    if (trimmed.length === 0) {
      throw new Error('Address city cannot be empty');
    }

    if (trimmed.length > 100) {
      throw new Error('Address city cannot exceed 100 characters');
    }
  }

  /**
   * Validates the Portuguese postal code format
   *
   * Portuguese postal code format: XXXX-XXX (4 digits, dash, 3 digits)
   *
   * @param postalCode - Postal code to validate
   * @throws Error if postalCode is empty, invalid format, or exceeds length limit
   */
  private validatePostalCode(postalCode: string): void {
    if (!postalCode || typeof postalCode !== 'string') {
      throw new Error('Address postal code is required');
    }

    const trimmed = postalCode.trim();

    if (trimmed.length === 0) {
      throw new Error('Address postal code cannot be empty');
    }

    if (trimmed.length > 20) {
      throw new Error('Address postal code cannot exceed 20 characters');
    }

    // Validate Portuguese postal code format (XXXX-XXX)
    const postalCodeRegex = /^\d{4}-\d{3}$/;
    if (!postalCodeRegex.test(trimmed)) {
      throw new Error('Invalid Portuguese postal code format. Expected format: XXXX-XXX');
    }
  }
}
