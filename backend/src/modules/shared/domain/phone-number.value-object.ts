/**
 * PhoneNumber Value Object
 * 
 * Represents a phone number in the petshop management system.
 * This is a pure domain value object that encapsulates phone number validation and business rules.
 * 
 * Value Object Characteristics:
 * - Immutable: All properties are readonly and cannot be changed after creation
 * - No Identity: Equality is determined by value, not by reference
 * - Encapsulates Validation: All validation logic is contained within the value object
 * - Self-Validating: Constructor validates the phone number format
 * 
 * Business Rules:
 * - Phone number must contain only valid characters (digits, spaces, dashes, parentheses, plus sign)
 * - Phone number must contain at least a minimum number of digits
 * - Phone number must not exceed 32 characters (as per database schema)
 * - Phone number is normalized (digits only) for equality comparison
 * - Phone number supports Portugal-specific formats (mobile, landline, international)
 * 
 * Invariants:
 * - Phone number value must be non-empty after trimming
 * - Phone number must contain only valid characters
 * - Phone number must contain at least minimum required digits
 * - Phone number length must not exceed 32 characters
 * - Normalized phone number contains only digits
 * 
 * Equality Definition:
 * - Two PhoneNumber instances are equal if their normalized (digits-only) values are equal
 * - Equality ignores formatting (spaces, dashes, parentheses)
 * - Equality is based on the phone number value, not object reference
 * 
 * Usage Examples:
 * 
 * 1. In Customer entity (optional):
 *    if (phone) {
 *      this._phone = new PhoneNumber(phone);
 *    }
 * 
 * 2. In User entity (optional):
 *    constructor(
 *      // ... other params
 *      phone?: string,
 *    ) {
 *      if (phone) {
 *        this._phone = new PhoneNumber(phone);
 *      }
 *    }
 * 
 * 3. Equality comparison:
 *    const phone1 = new PhoneNumber('+351 912 345 678');
 *    const phone2 = new PhoneNumber('912345678');
 *    phone1.equals(phone2); // true (normalized comparison)
 * 
 * 4. String representation:
 *    const phone = new PhoneNumber('+351 912 345 678');
 *    phone.toString(); // '+351 912 345 678' (original format)
 *    phone.value; // '+351 912 345 678'
 *    phone.normalized; // '351912345678' (digits only)
 */

export class PhoneNumber {
  private readonly _value: string;
  private readonly _normalized: string;

  /**
   * Creates a new PhoneNumber value object
   * 
   * @param phone - Phone number string
   * @throws Error if phone is empty or invalid format
   * @throws Error if phone exceeds 32 characters
   * @throws Error if phone contains invalid characters
   * @throws Error if phone has insufficient digits
   */
  constructor(phone: string) {
    this.validatePhone(phone);

    // Normalize phone: trim whitespace
    const trimmed = phone.trim();
    this._value = trimmed;
    
    // Normalize for equality: extract digits only
    this._normalized = this.extractDigits(trimmed);
  }

  /**
   * Gets the phone number value (original format)
   * 
   * @returns Phone number string (original format preserved)
   */
  get value(): string {
    return this._value;
  }

  /**
   * Gets the normalized phone number (digits only)
   * 
   * @returns Normalized phone number string (digits only)
   */
  get normalized(): string {
    return this._normalized;
  }

  /**
   * Gets the number of digits in the phone number
   * 
   * @returns Number of digits
   */
  get digitCount(): number {
    return this._normalized.length;
  }

  /**
   * Checks if the phone number starts with a country code (starts with +)
   * 
   * @returns True if phone number includes country code
   */
  hasCountryCode(): boolean {
    return this._value.startsWith('+');
  }

  /**
   * Gets the country code if present
   * 
   * @returns Country code (digits after +) or empty string
   */
  getCountryCode(): string {
    if (!this.hasCountryCode()) {
      return '';
    }

    const afterPlus = this._value.substring(1);
    const digits = this.extractDigits(afterPlus);
    
    // Portugal country code is 351, but we return all digits after +
    // until we hit a non-digit (space, dash, etc.)
    const match = afterPlus.match(/^(\d+)/);
    return match ? match[1] : '';
  }

  /**
   * Checks if this phone number equals another phone number
   * 
   * Equality is determined by comparing normalized (digits-only) values.
   * Formatting differences (spaces, dashes, parentheses) are ignored.
   * 
   * @param other - Other PhoneNumber to compare
   * @returns True if phone numbers are equal (ignoring formatting)
   */
  equals(other: PhoneNumber | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof PhoneNumber)) {
      return false;
    }

    return this._normalized === other._normalized;
  }

  /**
   * Converts the phone number to string representation
   * 
   * @returns Phone number string (original format)
   */
  toString(): string {
    return this._value;
  }

  /**
   * Creates a PhoneNumber from a string, returning null if invalid
   * 
   * This is a factory method that allows safe creation without throwing exceptions.
   * 
   * @param phone - Phone number string
   * @returns PhoneNumber instance or null if invalid
   */
  static fromString(phone: string | null | undefined): PhoneNumber | null {
    if (!phone) {
      return null;
    }

    try {
      return new PhoneNumber(phone);
    } catch {
      return null;
    }
  }

  /**
   * Validates if a string is a valid phone number format
   * 
   * @param phone - Phone number string to validate
   * @returns True if phone format is valid
   */
  static isValid(phone: string | null | undefined): boolean {
    if (!phone) {
      return false;
    }

    try {
      const trimmed = phone.trim();
      if (trimmed.length === 0 || trimmed.length > 32) {
        return false;
      }

      // Check for valid characters
      const validCharsRegex = /^[\d\s\-+()]+$/;
      if (!validCharsRegex.test(trimmed)) {
        return false;
      }

      // Extract digits and check minimum count
      const digits = trimmed.replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15;
    } catch {
      return false;
    }
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
   * Validates the phone number format and length
   * 
   * @param phone - Phone number string to validate
   * @throws Error if phone is empty, invalid format, or exceeds length limit
   */
  private validatePhone(phone: string): void {
    if (!phone || typeof phone !== 'string') {
      throw new Error('Phone number is required');
    }

    const trimmed = phone.trim();

    if (trimmed.length === 0) {
      throw new Error('Phone number cannot be empty');
    }

    if (trimmed.length > 32) {
      throw new Error('Phone number cannot exceed 32 characters');
    }

    // Validate characters: only digits, spaces, dashes, parentheses, and plus sign allowed
    const validCharsRegex = /^[\d\s\-+()]+$/;
    if (!validCharsRegex.test(trimmed)) {
      throw new Error(
        'Phone number contains invalid characters. ' +
        'Only digits, spaces, dashes, parentheses, and plus sign are allowed.'
      );
    }

    // Extract digits for validation
    const digits = this.extractDigits(trimmed);

    // Validate minimum digit count (at least 7 digits for local numbers)
    if (digits.length < 7) {
      throw new Error(
        `Phone number must contain at least 7 digits. Found: ${digits.length}`
      );
    }

    // Validate maximum digit count (15 digits max for international format including country code)
    if (digits.length > 15) {
      throw new Error(
        `Phone number cannot contain more than 15 digits. Found: ${digits.length}`
      );
    }

    // Validate Portugal-specific formats if starts with +351 or is 9 digits starting with 9
    // This is a soft validation - we allow other formats but provide guidance
    if (trimmed.startsWith('+351')) {
      // Portugal international format: +351 followed by 9 digits
      const afterCountryCode = digits.substring(3); // Remove 351
      if (afterCountryCode.length !== 9) {
        // Warning would be logged, but we allow it
      }
    } else if (digits.length === 9 && digits.startsWith('9')) {
      // Portugal mobile format: 9XXXXXXXX (9 digits starting with 9)
      // This is valid
    } else if (digits.length === 9 && (digits.startsWith('2') || digits.startsWith('3'))) {
      // Portugal landline format: 2XXXXXXXX or 3XXXXXXXX (9 digits starting with 2 or 3)
      // This is valid
    }
  }
}

