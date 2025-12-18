/**
 * VATRate Value Object
 *
 * Represents a VAT (Value Added Tax) rate in the petshop management system.
 * This is a pure domain value object that encapsulates VAT rate validation and business rules,
 * including Portugal-specific VAT rates and precision requirements (2 decimal places).
 *
 * Value Object Characteristics:
 * - Immutable: All properties are readonly and cannot be changed after creation
 * - No Identity: Equality is determined by value, not by reference
 * - Encapsulates Validation: All validation logic is contained within the value object
 * - Self-Validating: Constructor validates rate range and precision
 *
 * Business Rules:
 * - VAT rate must be between 0.00 and 100.00 (inclusive)
 * - VAT rate is stored with 2 decimal places precision (DECIMAL(5,2) standard)
 * - Common Portuguese VAT rates: 0%, 6%, 13%, 23%
 * - Rate represents percentage (e.g., 23.00 means 23%)
 *
 * Invariants:
 * - Rate value must be between 0.00 and 100.00 (inclusive)
 * - Rate is always rounded to 2 decimal places
 * - Value object is immutable after creation
 *
 * Equality Definition:
 * - Two VATRate instances are equal if their rate values are equal
 * - Rate comparison uses 2 decimal places precision
 * - Equality is based on rate values, not object reference
 *
 * Usage Examples:
 *
 * 1. In Company entity (default VAT rate):
 *    constructor(
 *      // ... other params
 *      defaultVatRate?: number,
 *    ) {
 *      if (defaultVatRate !== undefined) {
 *        this._defaultVatRate = new VATRate(defaultVatRate);
 *      }
 *    }
 *
 * 2. In Invoice entity (line VAT rate):
 *    export interface InvoiceLine {
 *      readonly description: string;
 *      readonly productId?: string;
 *      readonly serviceId?: string;
 *      readonly quantity: number;
 *      readonly unitPrice: number;
 *      readonly vatRate: VATRate; // VATRate value object
 *    }
 *
 * 3. Creating VATRate:
 *    const standardRate = new VATRate(23.00); // 23% VAT
 *    const reducedRate = new VATRate(6.00); // 6% VAT
 *    const zeroRate = VATRate.zero(); // 0% VAT
 *    const standard = VATRate.standard(); // 23% VAT (Portugal standard)
 *    const intermediate = VATRate.intermediate(); // 13% VAT (Portugal intermediate)
 *    const reduced = VATRate.reduced(); // 6% VAT (Portugal reduced)
 *
 * 4. Equality comparison:
 *    const rate1 = new VATRate(23.00);
 *    const rate2 = new VATRate(23.00);
 *    rate1.equals(rate2); // true
 *
 * 5. String representation:
 *    const rate = new VATRate(23.00);
 *    rate.toString(); // '23.00%'
 *    rate.toFormattedString(); // '23,00%' (Portuguese format)
 *    rate.value; // 23.00
 *    rate.asDecimal(); // 0.23 (for calculations)
 *
 * 6. Calculations:
 *    const rate = new VATRate(23.00);
 *    const baseAmount = 100.00;
 *    const vatAmount = baseAmount * rate.asDecimal(); // 23.00
 *    const totalWithVat = baseAmount * (1 + rate.asDecimal()); // 123.00
 */

export class VATRate {
  private readonly _value: number;

  private static readonly MIN_RATE = 0.0;
  private static readonly MAX_RATE = 100.0;
  private static readonly DECIMAL_PLACES = 2;

  // Common Portuguese VAT rates
  private static readonly STANDARD_RATE = 23.0; // Standard rate
  private static readonly INTERMEDIATE_RATE = 13.0; // Intermediate rate
  private static readonly REDUCED_RATE = 6.0; // Reduced rate
  private static readonly ZERO_RATE = 0.0; // Zero rate

  /**
   * Creates a new VATRate value object
   *
   * @param rate - VAT rate as percentage (0.00 to 100.00, will be rounded to 2 decimal places)
   * @throws Error if rate is outside valid range
   */
  constructor(rate: number) {
    this.validateRate(rate);
    this._value = VATRate.roundToTwoDecimals(rate);
  }

  /**
   * Gets the VAT rate value as percentage
   *
   * @returns Rate as number (always rounded to 2 decimal places, e.g., 23.00 for 23%)
   */
  get value(): number {
    return this._value;
  }

  /**
   * Gets the VAT rate as a decimal multiplier (for calculations)
   *
   * Example: 23.00% returns 0.23
   *
   * @returns Rate as decimal (0.00 to 1.00)
   */
  get asDecimal(): number {
    return this._value / 100;
  }

  /**
   * Checks if this VATRate equals another VATRate
   *
   * Equality is determined by comparing rate values with 2 decimal places precision.
   *
   * @param other - Other VATRate to compare
   * @returns True if rates are equal
   */
  equals(other: VATRate | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof VATRate)) {
      return false;
    }

    // Compare with 2 decimal places precision
    return Math.abs(this._value - other._value) < 0.005; // 0.005 = half of 0.01
  }

  /**
   * Checks if this VATRate is equal to another VATRate (alias for equals)
   *
   * @param other - Other VATRate to compare
   * @returns True if rates are equal
   */
  isEqual(other: VATRate | null | undefined): boolean {
    return this.equals(other);
  }

  /**
   * Checks if this VATRate is greater than another VATRate
   *
   * @param other - Other VATRate to compare
   * @returns True if this rate is greater than other rate
   */
  isGreaterThan(other: VATRate): boolean {
    return this._value > other._value;
  }

  /**
   * Checks if this VATRate is greater than or equal to another VATRate
   *
   * @param other - Other VATRate to compare
   * @returns True if this rate is greater than or equal to other rate
   */
  isGreaterThanOrEqual(other: VATRate): boolean {
    return this._value >= other._value;
  }

  /**
   * Checks if this VATRate is less than another VATRate
   *
   * @param other - Other VATRate to compare
   * @returns True if this rate is less than other rate
   */
  isLessThan(other: VATRate): boolean {
    return this._value < other._value;
  }

  /**
   * Checks if this VATRate is less than or equal to another VATRate
   *
   * @param other - Other VATRate to compare
   * @returns True if this rate is less than or equal to other rate
   */
  isLessThanOrEqual(other: VATRate): boolean {
    return this._value <= other._value;
  }

  /**
   * Checks if this VATRate is zero
   *
   * @returns True if rate is 0.00%
   */
  isZero(): boolean {
    return this._value === 0.0;
  }

  /**
   * Checks if this VATRate is positive (greater than zero)
   *
   * @returns True if rate is greater than 0.00%
   */
  isPositive(): boolean {
    return this._value > 0.0;
  }

  /**
   * Checks if this VATRate is a standard Portuguese VAT rate
   *
   * Standard rate: 23.00%
   *
   * @returns True if rate is 23.00%
   */
  isStandard(): boolean {
    return this.equals(VATRate.standard());
  }

  /**
   * Checks if this VATRate is an intermediate Portuguese VAT rate
   *
   * Intermediate rate: 13.00%
   *
   * @returns True if rate is 13.00%
   */
  isIntermediate(): boolean {
    return this.equals(VATRate.intermediate());
  }

  /**
   * Checks if this VATRate is a reduced Portuguese VAT rate
   *
   * Reduced rate: 6.00%
   *
   * @returns True if rate is 6.00%
   */
  isReduced(): boolean {
    return this.equals(VATRate.reduced());
  }

  /**
   * Calculates VAT amount for a given base amount
   *
   * @param baseAmount - Base amount to calculate VAT for
   * @returns VAT amount (rounded to 2 decimal places)
   */
  calculateVatAmount(baseAmount: number): number {
    if (baseAmount < 0) {
      throw new Error('Base amount cannot be negative');
    }
    return VATRate.roundToTwoDecimals(baseAmount * this.asDecimal);
  }

  /**
   * Calculates total amount (base + VAT) for a given base amount
   *
   * @param baseAmount - Base amount
   * @returns Total amount including VAT (rounded to 2 decimal places)
   */
  calculateTotalWithVat(baseAmount: number): number {
    if (baseAmount < 0) {
      throw new Error('Base amount cannot be negative');
    }
    return VATRate.roundToTwoDecimals(baseAmount * (1 + this.asDecimal));
  }

  /**
   * Calculates base amount from a total amount that includes VAT
   *
   * @param totalAmount - Total amount including VAT
   * @returns Base amount excluding VAT (rounded to 2 decimal places)
   */
  calculateBaseFromTotal(totalAmount: number): number {
    if (totalAmount < 0) {
      throw new Error('Total amount cannot be negative');
    }
    if (this._value === 100.0) {
      throw new Error('Cannot calculate base from total when VAT rate is 100%');
    }
    return VATRate.roundToTwoDecimals(totalAmount / (1 + this.asDecimal));
  }

  /**
   * Calculates VAT amount from a total amount that includes VAT
   *
   * @param totalAmount - Total amount including VAT
   * @returns VAT amount (rounded to 2 decimal places)
   */
  calculateVatFromTotal(totalAmount: number): number {
    if (totalAmount < 0) {
      throw new Error('Total amount cannot be negative');
    }
    const baseAmount = this.calculateBaseFromTotal(totalAmount);
    return VATRate.roundToTwoDecimals(totalAmount - baseAmount);
  }

  /**
   * Converts the VATRate to string representation
   *
   * Format: "value%" (e.g., "23.00%")
   *
   * @returns VATRate string representation
   */
  toString(): string {
    return `${this._value.toFixed(VATRate.DECIMAL_PLACES)}%`;
  }

  /**
   * Converts the VATRate to formatted string (Portuguese format)
   *
   * Format: "value%" with comma as decimal separator (e.g., "23,00%")
   *
   * @returns Formatted VATRate string in Portuguese format
   */
  toFormattedString(): string {
    return `${this._value.toFixed(VATRate.DECIMAL_PLACES).replace('.', ',')}%`;
  }

  /**
   * Creates a zero VATRate instance (0.00%)
   *
   * @returns New VATRate instance with 0.00% rate
   */
  static zero(): VATRate {
    return new VATRate(VATRate.ZERO_RATE);
  }

  /**
   * Creates a standard Portuguese VATRate instance (23.00%)
   *
   * @returns New VATRate instance with 23.00% rate
   */
  static standard(): VATRate {
    return new VATRate(VATRate.STANDARD_RATE);
  }

  /**
   * Creates an intermediate Portuguese VATRate instance (13.00%)
   *
   * @returns New VATRate instance with 13.00% rate
   */
  static intermediate(): VATRate {
    return new VATRate(VATRate.INTERMEDIATE_RATE);
  }

  /**
   * Creates a reduced Portuguese VATRate instance (6.00%)
   *
   * @returns New VATRate instance with 6.00% rate
   */
  static reduced(): VATRate {
    return new VATRate(VATRate.REDUCED_RATE);
  }

  /**
   * Creates a VATRate instance from a number, returning null if invalid
   *
   * This is a factory method that allows safe creation without throwing exceptions.
   *
   * @param rate - VAT rate as percentage
   * @returns VATRate instance or null if invalid
   */
  static fromNumber(rate: number): VATRate | null {
    try {
      return new VATRate(rate);
    } catch {
      return null;
    }
  }

  /**
   * Validates if a number can be used to create a VATRate instance
   *
   * @param rate - Rate to validate
   * @returns True if rate is valid for VATRate creation
   */
  static isValid(rate: number): boolean {
    return VATRate.fromNumber(rate) !== null;
  }

  /**
   * Gets all common Portuguese VAT rates
   *
   * @returns Array of common VATRate instances: [zero, reduced, intermediate, standard]
   */
  static getCommonRates(): VATRate[] {
    return [VATRate.zero(), VATRate.reduced(), VATRate.intermediate(), VATRate.standard()];
  }

  /**
   * Checks if a rate is a common Portuguese VAT rate
   *
   * @param rate - Rate to check
   * @returns True if rate is 0%, 6%, 13%, or 23%
   */
  static isCommonRate(rate: number): boolean {
    const commonRates = [0.0, 6.0, 13.0, 23.0];
    const rounded = VATRate.roundToTwoDecimals(rate);
    return commonRates.some((common) => Math.abs(rounded - common) < 0.005);
  }

  // Private helper methods

  /**
   * Rounds a number to 2 decimal places
   *
   * Uses standard rounding: Math.round(value * 100) / 100
   *
   * @param value - Value to round
   * @returns Rounded value with 2 decimal places
   */
  private static roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Validates the VAT rate
   *
   * @param rate - Rate to validate
   * @throws Error if rate is outside valid range or invalid
   */
  private validateRate(rate: number): void {
    if (typeof rate !== 'number' || isNaN(rate) || !isFinite(rate)) {
      throw new Error('VAT rate must be a valid number');
    }

    if (rate < VATRate.MIN_RATE || rate > VATRate.MAX_RATE) {
      throw new Error(`VAT rate must be between ${VATRate.MIN_RATE} and ${VATRate.MAX_RATE}`);
    }
  }
}
