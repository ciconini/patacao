/**
 * Money Value Object
 * 
 * Represents a monetary amount in the petshop management system.
 * This is a pure domain value object that encapsulates monetary value validation,
 * currency handling, and business rules, including Portugal-specific currency (EUR)
 * and precision requirements (2 decimal places).
 * 
 * Value Object Characteristics:
 * - Immutable: All properties are readonly and cannot be changed after creation
 * - No Identity: Equality is determined by value, not by reference
 * - Encapsulates Validation: All validation logic is contained within the value object
 * - Self-Validating: Constructor validates amount and currency
 * 
 * Business Rules:
 * - Amount must be non-negative (zero or positive)
 * - Amount is stored with 2 decimal places precision (EUR standard)
 * - Currency defaults to EUR (Euro) for Portugal
 * - All arithmetic operations return new Money instances (immutability)
 * - Rounding follows Portuguese VAT rounding rules (round to 2 decimal places)
 * 
 * Invariants:
 * - Amount value must be non-negative (>= 0)
 * - Amount is always rounded to 2 decimal places
 * - Currency must be a valid ISO 4217 currency code (default: EUR)
 * - Value object is immutable after creation
 * - All arithmetic operations preserve immutability
 * 
 * Equality Definition:
 * - Two Money instances are equal if both amount and currency are equal
 * - Amount comparison uses 2 decimal places precision
 * - Equality is case-sensitive for currency code
 * - Equality is based on monetary values, not object reference
 * 
 * Usage Examples:
 * 
 * 1. In Service entity (price):
 *    constructor(
 *      // ... other params
 *      price: number,
 *    ) {
 *      this._price = new Money(price, 'EUR');
 *    }
 * 
 * 2. In Invoice entity (totals):
 *    private _subtotal: Money;
 *    private _vatTotal: Money;
 *    private _total: Money;
 * 
 *    constructor(
 *      // ... other params
 *      lines: InvoiceLine[],
 *    ) {
 *      // Calculate totals
 *      this._subtotal = this.calculateSubtotal(lines);
 *      this._vatTotal = this.calculateVatTotal(lines);
 *      this._total = this._subtotal.add(this._vatTotal);
 *    }
 * 
 * 3. Creating Money:
 *    const price = new Money(25.50, 'EUR');
 *    const zero = Money.zero('EUR');
 *    const fromCents = Money.fromCents(2550, 'EUR'); // 25.50 EUR
 * 
 * 4. Arithmetic operations:
 *    const price1 = new Money(10.00, 'EUR');
 *    const price2 = new Money(5.50, 'EUR');
 *    const sum = price1.add(price2); // 15.50 EUR
 *    const diff = price1.subtract(price2); // 4.50 EUR
 *    const multiplied = price1.multiply(2); // 20.00 EUR
 *    const divided = price1.divide(2); // 5.00 EUR
 * 
 * 5. Comparison operations:
 *    const price1 = new Money(10.00, 'EUR');
 *    const price2 = new Money(5.50, 'EUR');
 *    price1.isGreaterThan(price2); // true
 *    price1.isLessThan(price2); // false
 *    price1.isEqual(price2); // false
 *    price1.isZero(); // false
 * 
 * 6. Equality comparison:
 *    const money1 = new Money(25.50, 'EUR');
 *    const money2 = new Money(25.50, 'EUR');
 *    money1.equals(money2); // true
 * 
 * 7. String representation:
 *    const money = new Money(25.50, 'EUR');
 *    money.toString(); // '25.50 EUR'
 *    money.toFormattedString(); // '25,50 €' (Portuguese format)
 *    money.amount; // 25.50
 *    money.currency; // 'EUR'
 *    money.amountInCents; // 2550
 */

export class Money {
  private readonly _amount: number;
  private readonly _currency: string;

  private static readonly DEFAULT_CURRENCY = 'EUR';
  private static readonly DECIMAL_PLACES = 2;
  private static readonly MAX_AMOUNT = 9999999999.99; // DECIMAL(12,2) max value

  /**
   * Creates a new Money value object
   * 
   * @param amount - Monetary amount (non-negative, will be rounded to 2 decimal places)
   * @param currency - ISO 4217 currency code (defaults to 'EUR')
   * @throws Error if amount is negative
   * @throws Error if amount exceeds maximum allowed value
   * @throws Error if currency is invalid
   */
  constructor(amount: number, currency: string = Money.DEFAULT_CURRENCY) {
    this.validateAmount(amount);
    this.validateCurrency(currency);

    this._amount = Money.roundToTwoDecimals(amount);
    this._currency = currency.toUpperCase();
  }

  /**
   * Gets the monetary amount
   * 
   * @returns Amount as number (always rounded to 2 decimal places)
   */
  get amount(): number {
    return this._amount;
  }

  /**
   * Gets the currency code
   * 
   * @returns ISO 4217 currency code (uppercase)
   */
  get currency(): string {
    return this._currency;
  }

  /**
   * Gets the amount in cents (smallest currency unit)
   * 
   * For EUR, this returns the amount multiplied by 100.
   * 
   * @returns Amount in cents as integer
   */
  get amountInCents(): number {
    return Math.round(this._amount * 100);
  }

  /**
   * Checks if this Money equals another Money
   * 
   * Equality is determined by comparing both amount and currency.
   * Amount comparison uses 2 decimal places precision.
   * 
   * @param other - Other Money to compare
   * @returns True if amounts and currencies are equal
   */
  equals(other: Money | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof Money)) {
      return false;
    }

    // Compare amounts with 2 decimal places precision
    return Math.abs(this._amount - other._amount) < 0.005 && // 0.005 = half of 0.01
           this._currency === other._currency;
  }

  /**
   * Checks if this Money is equal to another Money (alias for equals)
   * 
   * @param other - Other Money to compare
   * @returns True if amounts and currencies are equal
   */
  isEqual(other: Money | null | undefined): boolean {
    return this.equals(other);
  }

  /**
   * Checks if this Money is greater than another Money
   * 
   * @param other - Other Money to compare
   * @returns True if this amount is greater than other amount
   * @throws Error if currencies don't match
   */
  isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount > other._amount;
  }

  /**
   * Checks if this Money is greater than or equal to another Money
   * 
   * @param other - Other Money to compare
   * @returns True if this amount is greater than or equal to other amount
   * @throws Error if currencies don't match
   */
  isGreaterThanOrEqual(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount >= other._amount;
  }

  /**
   * Checks if this Money is less than another Money
   * 
   * @param other - Other Money to compare
   * @returns True if this amount is less than other amount
   * @throws Error if currencies don't match
   */
  isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount < other._amount;
  }

  /**
   * Checks if this Money is less than or equal to another Money
   * 
   * @param other - Other Money to compare
   * @returns True if this amount is less than or equal to other amount
   * @throws Error if currencies don't match
   */
  isLessThanOrEqual(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount <= other._amount;
  }

  /**
   * Checks if this Money is zero
   * 
   * @returns True if amount is zero
   */
  isZero(): boolean {
    return this._amount === 0;
  }

  /**
   * Checks if this Money is positive (greater than zero)
   * 
   * @returns True if amount is positive
   */
  isPositive(): boolean {
    return this._amount > 0;
  }

  /**
   * Checks if this Money is negative
   * 
   * @returns True if amount is negative (should not happen due to validation)
   */
  isNegative(): boolean {
    return this._amount < 0;
  }

  /**
   * Adds another Money to this Money
   * 
   * Returns a new Money instance (immutability).
   * 
   * @param other - Money to add
   * @returns New Money instance with sum of amounts
   * @throws Error if currencies don't match
   */
  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  /**
   * Subtracts another Money from this Money
   * 
   * Returns a new Money instance (immutability).
   * Result can be zero but cannot be negative (throws error).
   * 
   * @param other - Money to subtract
   * @returns New Money instance with difference of amounts
   * @throws Error if currencies don't match
   * @throws Error if result would be negative
   */
  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    const result = this._amount - other._amount;
    if (result < 0) {
      throw new Error(`Cannot subtract ${other.toString()} from ${this.toString()}: result would be negative`);
    }
    return new Money(result, this._currency);
  }

  /**
   * Multiplies this Money by a factor
   * 
   * Returns a new Money instance (immutability).
   * 
   * @param factor - Multiplication factor (must be non-negative)
   * @returns New Money instance with multiplied amount
   * @throws Error if factor is negative
   */
  multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error('Multiplication factor cannot be negative');
    }
    return new Money(this._amount * factor, this._currency);
  }

  /**
   * Divides this Money by a divisor
   * 
   * Returns a new Money instance (immutability).
   * 
   * @param divisor - Division divisor (must be positive)
   * @returns New Money instance with divided amount
   * @throws Error if divisor is zero or negative
   */
  divide(divisor: number): Money {
    if (divisor <= 0) {
      throw new Error('Division divisor must be positive');
    }
    return new Money(this._amount / divisor, this._currency);
  }

  /**
   * Calculates percentage of this Money
   * 
   * Returns a new Money instance (immutability).
   * 
   * @param percentage - Percentage value (0-100)
   * @returns New Money instance with percentage amount
   * @throws Error if percentage is negative or exceeds 100
   */
  percentage(percentage: number): Money {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }
    return new Money(this._amount * (percentage / 100), this._currency);
  }

  /**
   * Returns the absolute value of this Money
   * 
   * Returns a new Money instance (immutability).
   * 
   * @returns New Money instance with absolute amount
   */
  abs(): Money {
    return new Money(Math.abs(this._amount), this._currency);
  }

  /**
   * Returns the negated value of this Money
   * 
   * Returns a new Money instance (immutability).
   * Note: This can result in negative amounts, which may not be valid for all use cases.
   * 
   * @returns New Money instance with negated amount
   */
  negate(): Money {
    return new Money(-this._amount, this._currency);
  }

  /**
   * Converts the Money to string representation
   * 
   * Format: "amount currency" (e.g., "25.50 EUR")
   * 
   * @returns Money string representation
   */
  toString(): string {
    return `${this._amount.toFixed(Money.DECIMAL_PLACES)} ${this._currency}`;
  }

  /**
   * Converts the Money to formatted string (Portuguese format)
   * 
   * Format: "amount €" with comma as decimal separator (e.g., "25,50 €")
   * 
   * @returns Formatted Money string in Portuguese format
   */
  toFormattedString(): string {
    const formattedAmount = this._amount.toFixed(Money.DECIMAL_PLACES).replace('.', ',');
    if (this._currency === 'EUR') {
      return `${formattedAmount} €`;
    }
    return `${formattedAmount} ${this._currency}`;
  }

  /**
   * Creates a Money instance from cents
   * 
   * @param cents - Amount in cents (smallest currency unit)
   * @param currency - ISO 4217 currency code (defaults to 'EUR')
   * @returns New Money instance
   */
  static fromCents(cents: number, currency: string = Money.DEFAULT_CURRENCY): Money {
    if (cents < 0) {
      throw new Error('Amount in cents cannot be negative');
    }
    return new Money(cents / 100, currency);
  }

  /**
   * Creates a zero Money instance
   * 
   * @param currency - ISO 4217 currency code (defaults to 'EUR')
   * @returns New Money instance with zero amount
   */
  static zero(currency: string = Money.DEFAULT_CURRENCY): Money {
    return new Money(0, currency);
  }

  /**
   * Creates a Money instance from a number, returning null if invalid
   * 
   * This is a factory method that allows safe creation without throwing exceptions.
   * 
   * @param amount - Monetary amount
   * @param currency - ISO 4217 currency code (defaults to 'EUR')
   * @returns Money instance or null if invalid
   */
  static fromNumber(amount: number, currency: string = Money.DEFAULT_CURRENCY): Money | null {
    try {
      return new Money(amount, currency);
    } catch {
      return null;
    }
  }

  /**
   * Validates if a number can be used to create a Money instance
   * 
   * @param amount - Amount to validate
   * @returns True if amount is valid for Money creation
   */
  static isValidAmount(amount: number): boolean {
    return Money.fromNumber(amount) !== null;
  }

  /**
   * Sums an array of Money instances
   * 
   * @param monies - Array of Money instances
   * @returns New Money instance with sum of all amounts
   * @throws Error if array is empty
   * @throws Error if currencies don't match
   */
  static sum(monies: Money[]): Money {
    if (monies.length === 0) {
      throw new Error('Cannot sum empty array of Money instances');
    }

    const currency = monies[0]._currency;
    let total = 0;

    for (const money of monies) {
      if (money._currency !== currency) {
        throw new Error(`Cannot sum Money instances with different currencies: ${currency} and ${money._currency}`);
      }
      total += money._amount;
    }

    return new Money(total, currency);
  }

  /**
   * Gets the maximum Money from an array
   * 
   * @param monies - Array of Money instances
   * @returns Maximum Money instance
   * @throws Error if array is empty
   * @throws Error if currencies don't match
   */
  static max(monies: Money[]): Money {
    if (monies.length === 0) {
      throw new Error('Cannot find maximum of empty array');
    }

    const currency = monies[0]._currency;
    let maxAmount = monies[0]._amount;
    let maxMoney = monies[0];

    for (const money of monies) {
      if (money._currency !== currency) {
        throw new Error(`Cannot compare Money instances with different currencies: ${currency} and ${money._currency}`);
      }
      if (money._amount > maxAmount) {
        maxAmount = money._amount;
        maxMoney = money;
      }
    }

    return maxMoney;
  }

  /**
   * Gets the minimum Money from an array
   * 
   * @param monies - Array of Money instances
   * @returns Minimum Money instance
   * @throws Error if array is empty
   * @throws Error if currencies don't match
   */
  static min(monies: Money[]): Money {
    if (monies.length === 0) {
      throw new Error('Cannot find minimum of empty array');
    }

    const currency = monies[0]._currency;
    let minAmount = monies[0]._amount;
    let minMoney = monies[0];

    for (const money of monies) {
      if (money._currency !== currency) {
        throw new Error(`Cannot compare Money instances with different currencies: ${currency} and ${money._currency}`);
      }
      if (money._amount < minAmount) {
        minAmount = money._amount;
        minMoney = money;
      }
    }

    return minMoney;
  }

  // Private helper methods

  /**
   * Rounds a number to 2 decimal places using Portuguese rounding rules
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
   * Validates the monetary amount
   * 
   * @param amount - Amount to validate
   * @throws Error if amount is negative or exceeds maximum
   */
  private validateAmount(amount: number): void {
    if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
      throw new Error('Amount must be a valid number');
    }

    if (amount < 0) {
      throw new Error('Money amount cannot be negative');
    }

    if (amount > Money.MAX_AMOUNT) {
      throw new Error(`Money amount cannot exceed ${Money.MAX_AMOUNT}`);
    }
  }

  /**
   * Validates the currency code
   * 
   * Basic validation: must be 3 uppercase letters (ISO 4217 format).
   * 
   * @param currency - Currency code to validate
   * @throws Error if currency is invalid
   */
  private validateCurrency(currency: string): void {
    if (!currency || typeof currency !== 'string') {
      throw new Error('Currency code is required');
    }

    const trimmed = currency.trim().toUpperCase();

    if (trimmed.length !== 3) {
      throw new Error('Currency code must be 3 characters (ISO 4217 format)');
    }

    if (!/^[A-Z]{3}$/.test(trimmed)) {
      throw new Error('Currency code must contain only uppercase letters');
    }
  }

  /**
   * Ensures two Money instances have the same currency
   * 
   * @param other - Other Money instance
   * @throws Error if currencies don't match
   */
  private ensureSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(`Cannot perform operation on Money with different currencies: ${this._currency} and ${other._currency}`);
    }
  }
}

