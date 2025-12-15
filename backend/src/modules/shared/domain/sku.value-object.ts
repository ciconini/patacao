/**
 * SKU Value Object
 * 
 * Represents a Stock Keeping Unit (SKU) identifier in the petshop management system.
 * This is a pure domain value object that encapsulates SKU validation and business rules.
 * 
 * Value Object Characteristics:
 * - Immutable: All properties are readonly and cannot be changed after creation
 * - No Identity: Equality is determined by value, not by reference
 * - Encapsulates Validation: All validation logic is contained within the value object
 * - Self-Validating: Constructor validates SKU format and length
 * 
 * Business Rules:
 * - SKU is required and cannot be empty
 * - SKU must not exceed 100 characters
 * - SKU must be unique per Company (enforced at repository/use case level)
 * - SKU is case-sensitive for equality comparison
 * - SKU is trimmed of leading/trailing whitespace
 * 
 * Invariants:
 * - SKU value must be non-empty after trimming
 * - SKU value must not exceed 100 characters
 * - Value object is immutable after creation
 * 
 * Equality Definition:
 * - Two SKU instances are equal if their values are equal (case-sensitive)
 * - Equality is based on SKU values, not object reference
 * 
 * Usage Examples:
 * 
 * 1. In Product entity:
 *    constructor(
 *      // ... other params
 *      sku: string,
 *    ) {
 *      this._sku = new SKU(sku);
 *    }
 * 
 *    get sku(): SKU {
 *      return this._sku;
 *    }
 * 
 * 2. Creating SKU:
 *    const sku = new SKU("PROD-001");
 *    const fromString = SKU.fromString("PROD-002"); // SKU or null if invalid
 * 
 * 3. Equality comparison:
 *    const sku1 = new SKU("PROD-001");
 *    const sku2 = new SKU("PROD-001");
 *    sku1.equals(sku2); // true
 * 
 *    const sku3 = new SKU("prod-001");
 *    sku1.equals(sku3); // false (case-sensitive)
 * 
 * 4. String representation:
 *    const sku = new SKU("PROD-001");
 *    sku.toString(); // "PROD-001"
 *    sku.value; // "PROD-001"
 */

export class SKU {
  private readonly _value: string;

  private static readonly MIN_LENGTH = 1;
  private static readonly MAX_LENGTH = 100;

  /**
   * Creates a new SKU value object
   * 
   * @param value - SKU identifier string
   * @throws Error if value is empty or exceeds maximum length
   */
  constructor(value: string) {
    this.validateValue(value);
    this._value = value.trim();
  }

  /**
   * Gets the SKU value
   * 
   * @returns SKU string (trimmed)
   */
  get value(): string {
    return this._value;
  }

  /**
   * Checks if this SKU equals another SKU
   * 
   * Equality is determined by comparing values (case-sensitive).
   * 
   * @param other - Other SKU to compare
   * @returns True if values are equal
   */
  equals(other: SKU | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof SKU)) {
      return false;
    }

    return this._value === other._value;
  }

  /**
   * Checks if this SKU is equal to another SKU (alias for equals)
   * 
   * @param other - Other SKU to compare
   * @returns True if values are equal
   */
  isEqual(other: SKU | null | undefined): boolean {
    return this.equals(other);
  }

  /**
   * Converts the SKU to string representation
   * 
   * @returns SKU string representation
   */
  toString(): string {
    return this._value;
  }

  /**
   * Creates a SKU instance from a string, returning null if invalid
   * 
   * This is a factory method that allows safe creation without throwing exceptions.
   * 
   * @param value - SKU string
   * @returns SKU instance or null if invalid
   */
  static fromString(value: string): SKU | null {
    try {
      return new SKU(value);
    } catch {
      return null;
    }
  }

  /**
   * Validates if a string can be used to create a SKU instance
   * 
   * @param value - String to validate
   * @returns True if string is valid for SKU creation
   */
  static isValid(value: string): boolean {
    return SKU.fromString(value) !== null;
  }

  // Private validation method

  /**
   * Validates the SKU value
   * 
   * @param value - Value to validate
   * @throws Error if value is invalid
   */
  private validateValue(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new Error('SKU must be a non-empty string');
    }

    const trimmed = value.trim();

    if (trimmed.length < SKU.MIN_LENGTH) {
      throw new Error(`SKU cannot be empty. Minimum length: ${SKU.MIN_LENGTH} character`);
    }

    if (trimmed.length > SKU.MAX_LENGTH) {
      throw new Error(`SKU cannot exceed ${SKU.MAX_LENGTH} characters. Current length: ${trimmed.length}`);
    }
  }
}

