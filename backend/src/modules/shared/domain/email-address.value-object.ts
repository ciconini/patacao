/**
 * EmailAddress Value Object
 *
 * Represents an email address in the petshop management system.
 * This is a pure domain value object that encapsulates email validation and business rules.
 *
 * Value Object Characteristics:
 * - Immutable: All properties are readonly and cannot be changed after creation
 * - No Identity: Equality is determined by value, not by reference
 * - Encapsulates Validation: All validation logic is contained within the value object
 * - Self-Validating: Constructor validates the email address format
 *
 * Business Rules:
 * - Email address must match valid email format
 * - Email address must not exceed 255 characters
 * - Email address is case-insensitive for equality comparison
 * - Email address is normalized (trimmed and lowercased) for consistency
 *
 * Invariants:
 * - Email address value must be non-empty after trimming
 * - Email address must match valid format pattern
 * - Email address length must not exceed 255 characters
 * - Normalized email address is always lowercase
 *
 * Equality Definition:
 * - Two EmailAddress instances are equal if their normalized values are equal
 * - Equality is case-insensitive
 * - Equality is based on the email address value, not object reference
 *
 * Usage Examples:
 *
 * 1. In User entity:
 *    const userEmail = new EmailAddress('John.Doe@Example.com');
 *    // Normalized to: 'john.doe@example.com'
 *    this._email = userEmail;
 *
 * 2. In Company entity (optional):
 *    if (email) {
 *      this._email = new EmailAddress(email);
 *    }
 *
 * 3. Equality comparison:
 *    const email1 = new EmailAddress('user@example.com');
 *    const email2 = new EmailAddress('USER@EXAMPLE.COM');
 *    email1.equals(email2); // true (case-insensitive)
 *
 * 4. String representation:
 *    const email = new EmailAddress('user@example.com');
 *    email.toString(); // 'user@example.com'
 *    email.value; // 'user@example.com'
 */

export class EmailAddress {
  private readonly _value: string;
  private readonly _normalized: string;

  /**
   * Creates a new EmailAddress value object
   *
   * @param email - Email address string
   * @throws Error if email is empty or invalid format
   * @throws Error if email exceeds 255 characters
   */
  constructor(email: string) {
    this.validateEmail(email);

    // Normalize email: trim whitespace and convert to lowercase
    const trimmed = email.trim();
    this._normalized = trimmed.toLowerCase();
    this._value = trimmed;
  }

  /**
   * Gets the email address value
   *
   * @returns Email address string (original case preserved)
   */
  get value(): string {
    return this._value;
  }

  /**
   * Gets the normalized email address (lowercase)
   *
   * @returns Normalized email address string
   */
  get normalized(): string {
    return this._normalized;
  }

  /**
   * Gets the local part of the email address (before @)
   *
   * @returns Local part of the email
   */
  get localPart(): string {
    const atIndex = this._normalized.indexOf('@');
    return atIndex > 0 ? this._normalized.substring(0, atIndex) : '';
  }

  /**
   * Gets the domain part of the email address (after @)
   *
   * @returns Domain part of the email
   */
  get domain(): string {
    const atIndex = this._normalized.indexOf('@');
    return atIndex > 0 && atIndex < this._normalized.length - 1
      ? this._normalized.substring(atIndex + 1)
      : '';
  }

  /**
   * Checks if this email address equals another email address
   *
   * Equality is determined by comparing normalized (lowercase) values.
   *
   * @param other - Other EmailAddress to compare
   * @returns True if email addresses are equal (case-insensitive)
   */
  equals(other: EmailAddress | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof EmailAddress)) {
      return false;
    }

    return this._normalized === other._normalized;
  }

  /**
   * Converts the email address to string representation
   *
   * @returns Email address string
   */
  toString(): string {
    return this._value;
  }

  /**
   * Creates an EmailAddress from a string, returning null if invalid
   *
   * This is a factory method that allows safe creation without throwing exceptions.
   *
   * @param email - Email address string
   * @returns EmailAddress instance or null if invalid
   */
  static fromString(email: string | null | undefined): EmailAddress | null {
    if (!email) {
      return null;
    }

    try {
      return new EmailAddress(email);
    } catch {
      return null;
    }
  }

  /**
   * Validates if a string is a valid email address format
   *
   * @param email - Email address string to validate
   * @returns True if email format is valid
   */
  static isValid(email: string | null | undefined): boolean {
    if (!email) {
      return false;
    }

    try {
      const trimmed = email.trim();
      if (trimmed.length === 0 || trimmed.length > 255) {
        return false;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(trimmed);
    } catch {
      return false;
    }
  }

  // Private validation methods

  /**
   * Validates the email address format and length
   *
   * @param email - Email address string to validate
   * @throws Error if email is empty, invalid format, or exceeds length limit
   */
  private validateEmail(email: string): void {
    if (!email || typeof email !== 'string') {
      throw new Error('Email address is required');
    }

    const trimmed = email.trim();

    if (trimmed.length === 0) {
      throw new Error('Email address cannot be empty');
    }

    if (trimmed.length > 255) {
      throw new Error('Email address cannot exceed 255 characters');
    }

    // Basic email format validation
    // Pattern: local-part@domain
    // - local-part: one or more non-whitespace, non-@ characters
    // - @: required separator
    // - domain: one or more non-whitespace, non-@ characters, followed by dot, followed by one or more non-whitespace, non-@ characters
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmed)) {
      throw new Error('Invalid email address format');
    }

    // Additional validation: ensure @ is not at the start or end
    if (trimmed.startsWith('@') || trimmed.endsWith('@')) {
      throw new Error('Invalid email address format: @ cannot be at the start or end');
    }

    // Additional validation: ensure domain has at least one dot
    const atIndex = trimmed.indexOf('@');
    if (atIndex > 0) {
      const domain = trimmed.substring(atIndex + 1);
      if (!domain.includes('.')) {
        throw new Error('Invalid email address format: domain must contain at least one dot');
      }
    }
  }
}
