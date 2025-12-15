/**
 * BatchNumber Value Object
 * 
 * Represents a batch number identifier in the petshop management system.
 * This is a pure domain value object that encapsulates batch number validation and business rules.
 * Batch numbers are used for tracking inventory batches, expiry dates, and FIFO/LIFO inventory management.
 * 
 * Value Object Characteristics:
 * - Immutable: All properties are readonly and cannot be changed after creation
 * - No Identity: Equality is determined by value, not by reference
 * - Encapsulates Validation: All validation logic is contained within the value object
 * - Self-Validating: Constructor validates batch number format and length
 * 
 * Business Rules:
 * - Batch number is optional (can be undefined/null for products without batch tracking)
 * - If provided, batch number must not be empty
 * - Batch number must not exceed 100 characters
 * - Batch number is case-sensitive for equality comparison
 * - Batch number is trimmed of leading/trailing whitespace
 * 
 * Invariants:
 * - If batch number is provided, it must be non-empty after trimming
 * - If batch number is provided, it must not exceed 100 characters
 * - Value object is immutable after creation
 * 
 * Equality Definition:
 * - Two BatchNumber instances are equal if their values are equal (case-sensitive)
 * - Equality is based on batch number values, not object reference
 * - Null/undefined BatchNumber instances are considered equal
 * 
 * Usage Examples:
 * 
 * 1. In StockBatch entity:
 *    constructor(
 *      // ... other params
 *      batchNumber?: string,
 *    ) {
 *      this._batchNumber = batchNumber ? new BatchNumber(batchNumber) : undefined;
 *    }
 * 
 *    get batchNumber(): BatchNumber | undefined {
 *      return this._batchNumber;
 *    }
 * 
 *    hasBatchNumber(): boolean {
 *      return this._batchNumber !== undefined;
 *    }
 * 
 * 2. Creating BatchNumber:
 *    const batch = new BatchNumber("BATCH-2024-001");
 *    const fromString = BatchNumber.fromString("BATCH-2024-002"); // BatchNumber or null if invalid
 *    const optional = BatchNumber.fromStringOptional(undefined); // undefined
 * 
 * 3. Equality comparison:
 *    const batch1 = new BatchNumber("BATCH-001");
 *    const batch2 = new BatchNumber("BATCH-001");
 *    batch1.equals(batch2); // true
 * 
 *    const batch3 = new BatchNumber("batch-001");
 *    batch1.equals(batch3); // false (case-sensitive)
 * 
 * 4. String representation:
 *    const batch = new BatchNumber("BATCH-001");
 *    batch.toString(); // "BATCH-001"
 *    batch.value; // "BATCH-001"
 */

export class BatchNumber {
  private readonly _value: string;

  private static readonly MIN_LENGTH = 1;
  private static readonly MAX_LENGTH = 100;

  /**
   * Creates a new BatchNumber value object
   * 
   * @param value - Batch number identifier string
   * @throws Error if value is empty or exceeds maximum length
   */
  constructor(value: string) {
    this.validateValue(value);
    this._value = value.trim();
  }

  /**
   * Gets the batch number value
   * 
   * @returns Batch number string (trimmed)
   */
  get value(): string {
    return this._value;
  }

  /**
   * Checks if this BatchNumber equals another BatchNumber
   * 
   * Equality is determined by comparing values (case-sensitive).
   * 
   * @param other - Other BatchNumber to compare (can be null/undefined)
   * @returns True if values are equal, or both are null/undefined
   */
  equals(other: BatchNumber | null | undefined): boolean {
    if (!other) {
      return false; // This instance has a value, other doesn't
    }

    if (!(other instanceof BatchNumber)) {
      return false;
    }

    return this._value === other._value;
  }

  /**
   * Checks if this BatchNumber is equal to another BatchNumber (alias for equals)
   * 
   * @param other - Other BatchNumber to compare
   * @returns True if values are equal
   */
  isEqual(other: BatchNumber | null | undefined): boolean {
    return this.equals(other);
  }

  /**
   * Converts the BatchNumber to string representation
   * 
   * @returns Batch number string representation
   */
  toString(): string {
    return this._value;
  }

  /**
   * Creates a BatchNumber instance from a string, returning null if invalid
   * 
   * This is a factory method that allows safe creation without throwing exceptions.
   * 
   * @param value - Batch number string
   * @returns BatchNumber instance or null if invalid
   */
  static fromString(value: string): BatchNumber | null {
    try {
      return new BatchNumber(value);
    } catch {
      return null;
    }
  }

  /**
   * Creates a BatchNumber instance from an optional string, returning undefined if null/undefined/invalid
   * 
   * This is a factory method for optional batch numbers.
   * 
   * @param value - Batch number string (optional)
   * @returns BatchNumber instance, undefined if not provided or invalid
   */
  static fromStringOptional(value: string | null | undefined): BatchNumber | undefined {
    if (!value) {
      return undefined;
    }
    return BatchNumber.fromString(value) || undefined;
  }

  /**
   * Validates if a string can be used to create a BatchNumber instance
   * 
   * @param value - String to validate
   * @returns True if string is valid for BatchNumber creation
   */
  static isValid(value: string): boolean {
    return BatchNumber.fromString(value) !== null;
  }

  /**
   * Checks if two optional BatchNumber instances are equal
   * 
   * @param a - First BatchNumber (optional)
   * @param b - Second BatchNumber (optional)
   * @returns True if both are undefined/null, or both have equal values
   */
  static equalsOptional(a: BatchNumber | null | undefined, b: BatchNumber | null | undefined): boolean {
    if (!a && !b) {
      return true; // Both are null/undefined
    }
    if (!a || !b) {
      return false; // One is null/undefined, the other is not
    }
    return a.equals(b);
  }

  // Private validation method

  /**
   * Validates the batch number value
   * 
   * @param value - Value to validate
   * @throws Error if value is invalid
   */
  private validateValue(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new Error('Batch number must be a non-empty string');
    }

    const trimmed = value.trim();

    if (trimmed.length < BatchNumber.MIN_LENGTH) {
      throw new Error(`Batch number cannot be empty. Minimum length: ${BatchNumber.MIN_LENGTH} character`);
    }

    if (trimmed.length > BatchNumber.MAX_LENGTH) {
      throw new Error(`Batch number cannot exceed ${BatchNumber.MAX_LENGTH} characters. Current length: ${trimmed.length}`);
    }
  }
}

