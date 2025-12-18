/**
 * Quantity Value Object
 *
 * Represents a quantity value in the petshop management system.
 * This is a pure domain value object that encapsulates quantity validation and business rules.
 *
 * Value Object Characteristics:
 * - Immutable: All properties are readonly and cannot be changed after creation
 * - No Identity: Equality is determined by value, not by reference
 * - Encapsulates Validation: All validation logic is contained within the value object
 * - Self-Validating: Constructor validates quantity value
 *
 * Business Rules:
 * - Quantity must be a non-negative integer (0 or positive)
 * - Quantity represents whole units (no fractional quantities)
 * - Maximum quantity is limited to prevent overflow (e.g., 2^31 - 1)
 *
 * Invariants:
 * - Quantity value must be a non-negative integer
 * - Quantity value must not exceed maximum allowed value
 * - Value object is immutable after creation
 *
 * Equality Definition:
 * - Two Quantity instances are equal if their values are equal
 * - Equality is based on quantity values, not object reference
 *
 * Usage Examples:
 *
 * 1. In StockBatch entity:
 *    constructor(
 *      // ... other params
 *      quantity: number,
 *    ) {
 *      this._quantity = new Quantity(quantity);
 *    }
 *
 * 2. In StockMovement entity:
 *    constructor(
 *      // ... other params
 *      quantityChange: number,
 *    ) {
 *      this._quantityChange = new Quantity(quantityChange);
 *    }
 *
 * 3. In InvoiceLine entity:
 *    export interface InvoiceLine {
 *      readonly quantity: Quantity; // Quantity value object
 *      readonly unitPrice: number;
 *      // ... other fields
 *    }
 *
 * 4. Creating Quantity:
 *    const qty = new Quantity(10); // 10 units
 *    const zero = Quantity.zero(); // 0 units
 *    const fromNumber = Quantity.fromNumber(5); // 5 units or null if invalid
 *
 * 5. Arithmetic operations:
 *    const qty1 = new Quantity(10);
 *    const qty2 = new Quantity(5);
 *    const sum = qty1.add(qty2); // 15
 *    const diff = qty1.subtract(qty2); // 5
 *    const multiplied = qty1.multiply(2); // 20
 *
 * 6. Comparison operations:
 *    const qty1 = new Quantity(10);
 *    const qty2 = new Quantity(5);
 *    qty1.isGreaterThan(qty2); // true
 *    qty1.isLessThan(qty2); // false
 *    qty1.isZero(); // false
 *
 * 7. Equality comparison:
 *    const qty1 = new Quantity(10);
 *    const qty2 = new Quantity(10);
 *    qty1.equals(qty2); // true
 */

export class Quantity {
  private readonly _value: number;

  private static readonly MIN_VALUE = 0;
  private static readonly MAX_VALUE = 2147483647; // 2^31 - 1 (safe integer limit)

  /**
   * Creates a new Quantity value object
   *
   * @param value - Quantity value (must be non-negative integer)
   * @throws Error if value is negative, not an integer, or exceeds maximum
   */
  constructor(value: number) {
    this.validateValue(value);
    this._value = value;
  }

  /**
   * Gets the quantity value
   *
   * @returns Quantity as number
   */
  get value(): number {
    return this._value;
  }

  /**
   * Checks if this Quantity equals another Quantity
   *
   * Equality is determined by comparing values.
   *
   * @param other - Other Quantity to compare
   * @returns True if values are equal
   */
  equals(other: Quantity | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof Quantity)) {
      return false;
    }

    return this._value === other._value;
  }

  /**
   * Checks if this Quantity is equal to another Quantity (alias for equals)
   *
   * @param other - Other Quantity to compare
   * @returns True if values are equal
   */
  isEqual(other: Quantity | null | undefined): boolean {
    return this.equals(other);
  }

  /**
   * Checks if this Quantity is greater than another Quantity
   *
   * @param other - Other Quantity to compare
   * @returns True if this value is greater than other value
   */
  isGreaterThan(other: Quantity): boolean {
    return this._value > other._value;
  }

  /**
   * Checks if this Quantity is greater than or equal to another Quantity
   *
   * @param other - Other Quantity to compare
   * @returns True if this value is greater than or equal to other value
   */
  isGreaterThanOrEqual(other: Quantity): boolean {
    return this._value >= other._value;
  }

  /**
   * Checks if this Quantity is less than another Quantity
   *
   * @param other - Other Quantity to compare
   * @returns True if this value is less than other value
   */
  isLessThan(other: Quantity): boolean {
    return this._value < other._value;
  }

  /**
   * Checks if this Quantity is less than or equal to another Quantity
   *
   * @param other - Other Quantity to compare
   * @returns True if this value is less than or equal to other value
   */
  isLessThanOrEqual(other: Quantity): boolean {
    return this._value <= other._value;
  }

  /**
   * Checks if this Quantity is zero
   *
   * @returns True if value is zero
   */
  isZero(): boolean {
    return this._value === 0;
  }

  /**
   * Checks if this Quantity is positive (greater than zero)
   *
   * @returns True if value is positive
   */
  isPositive(): boolean {
    return this._value > 0;
  }

  /**
   * Adds another Quantity to this Quantity
   *
   * Returns a new Quantity instance (immutability).
   *
   * @param other - Quantity to add
   * @returns New Quantity instance with sum of values
   */
  add(other: Quantity): Quantity {
    const result = this._value + other._value;
    if (result > Quantity.MAX_VALUE) {
      throw new Error(`Quantity addition would exceed maximum value: ${Quantity.MAX_VALUE}`);
    }
    return new Quantity(result);
  }

  /**
   * Subtracts another Quantity from this Quantity
   *
   * Returns a new Quantity instance (immutability).
   * Result cannot be negative (throws error).
   *
   * @param other - Quantity to subtract
   * @returns New Quantity instance with difference of values
   * @throws Error if result would be negative
   */
  subtract(other: Quantity): Quantity {
    const result = this._value - other._value;
    if (result < 0) {
      throw new Error(
        `Cannot subtract ${other._value} from ${this._value}: result would be negative`,
      );
    }
    return new Quantity(result);
  }

  /**
   * Multiplies this Quantity by a factor
   *
   * Returns a new Quantity instance (immutability).
   *
   * @param factor - Multiplication factor (must be non-negative integer)
   * @returns New Quantity instance with multiplied value
   * @throws Error if factor is negative or not an integer
   */
  multiply(factor: number): Quantity {
    if (!Number.isInteger(factor) || factor < 0) {
      throw new Error('Multiplication factor must be a non-negative integer');
    }
    const result = this._value * factor;
    if (result > Quantity.MAX_VALUE) {
      throw new Error(`Quantity multiplication would exceed maximum value: ${Quantity.MAX_VALUE}`);
    }
    return new Quantity(result);
  }

  /**
   * Converts the Quantity to string representation
   *
   * @returns Quantity string representation
   */
  toString(): string {
    return this._value.toString();
  }

  /**
   * Creates a zero Quantity instance
   *
   * @returns New Quantity instance with zero value
   */
  static zero(): Quantity {
    return new Quantity(0);
  }

  /**
   * Creates a Quantity instance from a number, returning null if invalid
   *
   * This is a factory method that allows safe creation without throwing exceptions.
   *
   * @param value - Quantity value
   * @returns Quantity instance or null if invalid
   */
  static fromNumber(value: number): Quantity | null {
    try {
      return new Quantity(value);
    } catch {
      return null;
    }
  }

  /**
   * Validates if a number can be used to create a Quantity instance
   *
   * @param value - Value to validate
   * @returns True if value is valid for Quantity creation
   */
  static isValid(value: number): boolean {
    return Quantity.fromNumber(value) !== null;
  }

  /**
   * Sums an array of Quantity instances
   *
   * @param quantities - Array of Quantity instances
   * @returns New Quantity instance with sum of all values
   * @throws Error if array is empty or sum exceeds maximum
   */
  static sum(quantities: Quantity[]): Quantity {
    if (quantities.length === 0) {
      throw new Error('Cannot sum empty array of Quantity instances');
    }

    let total = 0;
    for (const qty of quantities) {
      total += qty._value;
      if (total > Quantity.MAX_VALUE) {
        throw new Error(`Quantity sum would exceed maximum value: ${Quantity.MAX_VALUE}`);
      }
    }

    return new Quantity(total);
  }

  /**
   * Gets the maximum Quantity from an array
   *
   * @param quantities - Array of Quantity instances
   * @returns Maximum Quantity instance
   * @throws Error if array is empty
   */
  static max(quantities: Quantity[]): Quantity {
    if (quantities.length === 0) {
      throw new Error('Cannot find maximum of empty array');
    }

    let maxValue = quantities[0]._value;
    let maxQuantity = quantities[0];

    for (const qty of quantities) {
      if (qty._value > maxValue) {
        maxValue = qty._value;
        maxQuantity = qty;
      }
    }

    return maxQuantity;
  }

  /**
   * Gets the minimum Quantity from an array
   *
   * @param quantities - Array of Quantity instances
   * @returns Minimum Quantity instance
   * @throws Error if array is empty
   */
  static min(quantities: Quantity[]): Quantity {
    if (quantities.length === 0) {
      throw new Error('Cannot find minimum of empty array');
    }

    let minValue = quantities[0]._value;
    let minQuantity = quantities[0];

    for (const qty of quantities) {
      if (qty._value < minValue) {
        minValue = qty._value;
        minQuantity = qty;
      }
    }

    return minQuantity;
  }

  // Private validation method

  /**
   * Validates the quantity value
   *
   * @param value - Value to validate
   * @throws Error if value is invalid
   */
  private validateValue(value: number): void {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      throw new Error('Quantity must be a valid number');
    }

    if (!Number.isInteger(value)) {
      throw new Error('Quantity must be an integer (whole number)');
    }

    if (value < Quantity.MIN_VALUE) {
      throw new Error(`Quantity cannot be negative. Minimum value: ${Quantity.MIN_VALUE}`);
    }

    if (value > Quantity.MAX_VALUE) {
      throw new Error(`Quantity cannot exceed maximum value: ${Quantity.MAX_VALUE}`);
    }
  }
}
