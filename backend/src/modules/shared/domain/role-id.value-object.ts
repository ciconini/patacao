/**
 * RoleId Value Object
 *
 * Represents a role identifier in the petshop management system.
 * This is a pure domain value object that encapsulates role ID validation and business rules.
 *
 * Value Object Characteristics:
 * - Immutable: All properties are readonly and cannot be changed after creation
 * - No Identity: Equality is determined by value, not by reference
 * - Encapsulates Validation: All validation logic is contained within the value object
 * - Self-Validating: Constructor validates role ID format and length
 *
 * Business Rules:
 * - Role ID is required and cannot be empty
 * - Role ID must not exceed 64 characters (VARCHAR(64) in database)
 * - Canonical role IDs: Owner, Manager, Staff, Accountant, Veterinarian
 * - Role ID is case-sensitive for equality comparison
 * - Role ID is trimmed of leading/trailing whitespace
 *
 * Invariants:
 * - Role ID value must be non-empty after trimming
 * - Role ID value must not exceed 64 characters
 * - Value object is immutable after creation
 *
 * Equality Definition:
 * - Two RoleId instances are equal if their values are equal (case-sensitive)
 * - Equality is based on role ID values, not object reference
 *
 * Usage Examples:
 *
 * 1. In User entity:
 *    constructor(
 *      // ... other params
 *      roleIds: string[],
 *    ) {
 *      this._roleIds = roleIds.map(id => new RoleId(id));
 *    }
 *
 *    hasRole(roleId: string | RoleId): boolean {
 *      const roleIdObj = roleId instanceof RoleId ? roleId : new RoleId(roleId);
 *      return this._roleIds.some(id => id.equals(roleIdObj));
 *    }
 *
 * 2. In Role entity:
 *    constructor(
 *      id: string,
 *      // ... other params
 *    ) {
 *      this._id = new RoleId(id);
 *    }
 *
 * 3. Creating RoleId:
 *    const ownerRole = RoleId.OWNER;
 *    const managerRole = RoleId.MANAGER;
 *    const fromString = new RoleId("Staff");
 *    const fromStringSafe = RoleId.fromString("Accountant"); // RoleId or null if invalid
 *
 * 4. Equality comparison:
 *    const role1 = RoleId.OWNER;
 *    const role2 = new RoleId("Owner");
 *    role1.equals(role2); // true
 *
 *    const role3 = new RoleId("owner");
 *    role1.equals(role3); // false (case-sensitive)
 *
 * 5. String representation:
 *    const role = RoleId.OWNER;
 *    role.toString(); // "Owner"
 *    role.value; // "Owner"
 *
 * 6. Checking canonical roles:
 *    const role = RoleId.OWNER;
 *    role.isOwner(); // true
 *    role.isManager(); // false
 *    role.isCanonical(); // true
 */

export class RoleId {
  private readonly _value: string;

  // Canonical role IDs
  static readonly OWNER = new RoleId('Owner');
  static readonly MANAGER = new RoleId('Manager');
  static readonly STAFF = new RoleId('Staff');
  static readonly ACCOUNTANT = new RoleId('Accountant');
  static readonly VETERINARIAN = new RoleId('Veterinarian');

  // All canonical role IDs
  private static readonly CANONICAL_ROLES = [
    'Owner',
    'Manager',
    'Staff',
    'Accountant',
    'Veterinarian',
  ] as const;

  private static readonly MAX_LENGTH = 64; // VARCHAR(64) in database

  /**
   * Creates a new RoleId value object
   *
   * @param value - Role ID string
   * @throws Error if value is empty or exceeds maximum length
   */
  constructor(value: string) {
    this.validateValue(value);
    this._value = value.trim();
  }

  /**
   * Gets the role ID value
   *
   * @returns Role ID string (trimmed)
   */
  get value(): string {
    return this._value;
  }

  /**
   * Checks if this RoleId equals another RoleId
   *
   * Equality is determined by comparing values (case-sensitive).
   *
   * @param other - Other RoleId to compare
   * @returns True if values are equal
   */
  equals(other: RoleId | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof RoleId)) {
      return false;
    }

    return this._value === other._value;
  }

  /**
   * Checks if this RoleId is equal to another RoleId (alias for equals)
   *
   * @param other - Other RoleId to compare
   * @returns True if values are equal
   */
  isEqual(other: RoleId | null | undefined): boolean {
    return this.equals(other);
  }

  /**
   * Converts the RoleId to string representation
   *
   * @returns Role ID string representation
   */
  toString(): string {
    return this._value;
  }

  /**
   * Checks if this is the Owner role
   *
   * @returns True if role is Owner
   */
  isOwner(): boolean {
    return this.equals(RoleId.OWNER);
  }

  /**
   * Checks if this is the Manager role
   *
   * @returns True if role is Manager
   */
  isManager(): boolean {
    return this.equals(RoleId.MANAGER);
  }

  /**
   * Checks if this is the Staff role
   *
   * @returns True if role is Staff
   */
  isStaff(): boolean {
    return this.equals(RoleId.STAFF);
  }

  /**
   * Checks if this is the Accountant role
   *
   * @returns True if role is Accountant
   */
  isAccountant(): boolean {
    return this.equals(RoleId.ACCOUNTANT);
  }

  /**
   * Checks if this is the Veterinarian role
   *
   * @returns True if role is Veterinarian
   */
  isVeterinarian(): boolean {
    return this.equals(RoleId.VETERINARIAN);
  }

  /**
   * Checks if this is a canonical role (one of the predefined system roles)
   *
   * @returns True if role is a canonical role
   */
  isCanonical(): boolean {
    return RoleId.CANONICAL_ROLES.includes(this._value as any);
  }

  /**
   * Creates a RoleId instance from a string, returning null if invalid
   *
   * This is a factory method that allows safe creation without throwing exceptions.
   *
   * @param value - Role ID string
   * @returns RoleId instance or null if invalid
   */
  static fromString(value: string): RoleId | null {
    try {
      return new RoleId(value);
    } catch {
      return null;
    }
  }

  /**
   * Validates if a string can be used to create a RoleId instance
   *
   * @param value - String to validate
   * @returns True if string is valid for RoleId creation
   */
  static isValid(value: string): boolean {
    return RoleId.fromString(value) !== null;
  }

  /**
   * Gets all canonical role IDs
   *
   * @returns Array of all canonical role ID strings
   */
  static getCanonicalRoles(): string[] {
    return [...RoleId.CANONICAL_ROLES];
  }

  /**
   * Gets all canonical RoleId instances
   *
   * @returns Array of all canonical RoleId instances
   */
  static getAllCanonical(): RoleId[] {
    return [RoleId.OWNER, RoleId.MANAGER, RoleId.STAFF, RoleId.ACCOUNTANT, RoleId.VETERINARIAN];
  }

  /**
   * Checks if a role ID is a canonical role
   *
   * @param value - Role ID string to check
   * @returns True if role is canonical
   */
  static isCanonicalRole(value: string): boolean {
    return RoleId.CANONICAL_ROLES.includes(value as any);
  }

  // Private validation method

  /**
   * Validates the role ID value
   *
   * @param value - Value to validate
   * @throws Error if value is invalid
   */
  private validateValue(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new Error('Role ID must be a non-empty string');
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new Error('Role ID cannot be empty');
    }

    if (trimmed.length > RoleId.MAX_LENGTH) {
      throw new Error(
        `Role ID cannot exceed ${RoleId.MAX_LENGTH} characters. Current length: ${trimmed.length}`,
      );
    }
  }
}
