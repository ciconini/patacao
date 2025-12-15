/**
 * PortugueseNIF Value Object
 * 
 * Represents a Portuguese NIF (Número de Identificação Fiscal) in the petshop management system.
 * NIF is the Portuguese tax identification number used for fiscal and invoicing purposes.
 * This is a pure domain value object that encapsulates NIF validation and business rules.
 * 
 * Value Object Characteristics:
 * - Immutable: All properties are readonly and cannot be changed after creation
 * - No Identity: Equality is determined by value, not by reference
 * - Encapsulates Validation: All validation logic is contained within the value object
 * - Self-Validating: Constructor validates the NIF format and check digit
 * 
 * Business Rules:
 * - NIF must be exactly 9 digits
 * - NIF must pass the Portuguese check digit algorithm
 * - NIF is normalized (digits only, no spaces or formatting)
 * - NIF validation is required when used for invoicing
 * 
 * Invariants:
 * - NIF value must be exactly 9 digits
 * - NIF must pass check digit validation
 * - Normalized NIF contains only digits
 * - Value object is immutable after creation
 * 
 * Equality Definition:
 * - Two PortugueseNIF instances are equal if their normalized (digits-only) values are equal
 * - Equality ignores formatting (spaces, dashes)
 * - Equality is based on the NIF value, not object reference
 * 
 * Usage Examples:
 * 
 * 1. In Company entity (required):
 *    constructor(
 *      id: string,
 *      name: string,
 *      nif: string, // string input
 *      // ... other params
 *    ) {
 *      this._nif = new PortugueseNIF(nif); // Creates value object
 *    }
 * 
 * 2. In Owner entity (optional):
 *    constructor(
 *      // ... other params
 *      nif?: string,
 *    ) {
 *      if (nif) {
 *        this._nif = new PortugueseNIF(nif);
 *      }
 *    }
 * 
 * 3. Equality comparison:
 *    const nif1 = new PortugueseNIF('123 456 789');
 *    const nif2 = new PortugueseNIF('123456789');
 *    nif1.equals(nif2); // true (formatting ignored)
 * 
 * 4. String representation:
 *    const nif = new PortugueseNIF('123456789');
 *    nif.toString(); // '123456789'
 *    nif.value; // '123456789'
 *    nif.normalized; // '123456789'
 */

export class PortugueseNIF {
  private readonly _value: string;
  private readonly _normalized: string;

  /**
   * Creates a new PortugueseNIF value object
   * 
   * @param nif - NIF string (9 digits, may include spaces or dashes)
   * @throws Error if nif is empty or invalid format
   * @throws Error if nif does not pass check digit validation
   */
  constructor(nif: string) {
    this.validateNif(nif);

    // Normalize NIF: remove all non-digit characters
    const normalized = this.extractDigits(nif);
    this._normalized = normalized;
    this._value = normalized; // Store normalized value (no formatting preserved)
  }

  /**
   * Gets the NIF value (normalized, digits only)
   * 
   * @returns NIF string (9 digits)
   */
  get value(): string {
    return this._value;
  }

  /**
   * Gets the normalized NIF (digits only)
   * 
   * @returns Normalized NIF string (9 digits)
   */
  get normalized(): string {
    return this._normalized;
  }

  /**
   * Gets the check digit (9th digit)
   * 
   * @returns Check digit (0-9)
   */
  get checkDigit(): number {
    return parseInt(this._normalized[8], 10);
  }

  /**
   * Gets the base number (first 8 digits)
   * 
   * @returns Base number string (8 digits)
   */
  get baseNumber(): string {
    return this._normalized.substring(0, 8);
  }

  /**
   * Checks if this NIF equals another NIF
   * 
   * Equality is determined by comparing normalized (digits-only) values.
   * Formatting differences (spaces, dashes) are ignored.
   * 
   * @param other - Other PortugueseNIF to compare
   * @returns True if NIFs are equal (ignoring formatting)
   */
  equals(other: PortugueseNIF | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof PortugueseNIF)) {
      return false;
    }

    return this._normalized === other._normalized;
  }

  /**
   * Converts the NIF to string representation
   * 
   * @returns NIF string (9 digits)
   */
  toString(): string {
    return this._value;
  }

  /**
   * Formats the NIF with spaces for readability (XXX XXX XXX)
   * 
   * @returns Formatted NIF string
   */
  toFormattedString(): string {
    if (this._normalized.length !== 9) {
      return this._normalized;
    }
    return `${this._normalized.substring(0, 3)} ${this._normalized.substring(3, 6)} ${this._normalized.substring(6, 9)}`;
  }

  /**
   * Creates a PortugueseNIF from a string, returning null if invalid
   * 
   * This is a factory method that allows safe creation without throwing exceptions.
   * 
   * @param nif - NIF string
   * @returns PortugueseNIF instance or null if invalid
   */
  static fromString(nif: string | null | undefined): PortugueseNIF | null {
    if (!nif) {
      return null;
    }

    try {
      return new PortugueseNIF(nif);
    } catch {
      return null;
    }
  }

  /**
   * Validates if a string is a valid Portuguese NIF format
   * 
   * @param nif - NIF string to validate
   * @returns True if NIF format and check digit are valid
   */
  static isValid(nif: string | null | undefined): boolean {
    if (!nif) {
      return false;
    }

    try {
      const trimmed = nif.trim().replace(/\s/g, '');
      
      // Must be exactly 9 digits
      if (!/^\d{9}$/.test(trimmed)) {
        return false;
      }

      // Validate check digit
      return PortugueseNIF.isValidCheckDigit(trimmed);
    } catch {
      return false;
    }
  }

  /**
   * Validates NIF check digit using Portuguese algorithm
   * 
   * Algorithm:
   * 1. Multiply first 8 digits by weights [9,8,7,6,5,4,3,2]
   * 2. Sum the results
   * 3. Calculate remainder = sum % 11
   * 4. Check digit = 11 - remainder, or 0 if result is 10 or 11
   * 5. The 9th digit must match the calculated check digit
   * 
   * @param nif - NIF string (9 digits)
   * @returns True if check digit is valid
   */
  static isValidCheckDigit(nif: string): boolean {
    if (!nif || nif.length !== 9) {
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

  // Private helper methods

  /**
   * Extracts digits from a string
   * 
   * @param str - String to extract digits from
   * @returns String containing only digits
   */
  private extractDigits(str: string): string {
    return str.replace(/\D/g, '');
  }

  /**
   * Validates the NIF format and check digit
   * 
   * @param nif - NIF string to validate
   * @throws Error if nif is empty, invalid format, or check digit is invalid
   */
  private validateNif(nif: string): void {
    if (!nif || typeof nif !== 'string') {
      throw new Error('NIF is required');
    }

    const trimmed = nif.trim().replace(/\s/g, '');

    if (trimmed.length === 0) {
      throw new Error('NIF cannot be empty');
    }

    // Extract digits only
    const digits = this.extractDigits(trimmed);

    // NIF must be exactly 9 digits
    if (digits.length !== 9) {
      throw new Error(
        `NIF must be exactly 9 digits. Found: ${digits.length} digit(s)`
      );
    }

    // Validate that all characters are digits (after removing spaces)
    if (!/^\d{9}$/.test(digits)) {
      throw new Error('NIF must contain only digits');
    }

    // Validate check digit using Portuguese algorithm
    if (!PortugueseNIF.isValidCheckDigit(digits)) {
      throw new Error('Invalid NIF check digit');
    }
  }
}

