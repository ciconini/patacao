/**
 * PermissionKey Value Object
 * 
 * Represents a permission key identifier in the petshop management system.
 * This is a pure domain value object that encapsulates permission key validation and business rules.
 * 
 * Value Object Characteristics:
 * - Immutable: All properties are readonly and cannot be changed after creation
 * - No Identity: Equality is determined by value, not by reference
 * - Encapsulates Validation: All validation logic is contained within the value object
 * - Self-Validating: Constructor validates permission key format
 * 
 * Business Rules:
 * - Permission key follows format: `{resource}:{action}` (e.g., `user:create`, `invoice:issue`)
 * - Wildcard permissions are allowed: `{resource}:*` or `*:*`
 * - Permission key is case-sensitive for equality comparison
 * - Permission key is trimmed of leading/trailing whitespace
 * - Resource and action parts cannot be empty (unless wildcard)
 * 
 * Invariants:
 * - Permission key value must match the format `{resource}:{action}` or wildcard format
 * - Resource and action parts must be non-empty (unless wildcard)
 * - Value object is immutable after creation
 * 
 * Equality Definition:
 * - Two PermissionKey instances are equal if their values are equal (case-sensitive)
 * - Equality is based on permission key values, not object reference
 * 
 * Usage Examples:
 * 
 * 1. In Role entity:
 *    constructor(
 *      // ... other params
 *      permissions: string[],
 *    ) {
 *      this._permissions = permissions.map(key => new PermissionKey(key));
 *    }
 * 
 *    hasPermission(permissionKey: string | PermissionKey): boolean {
 *      const keyObj = permissionKey instanceof PermissionKey 
 *        ? permissionKey 
 *        : new PermissionKey(permissionKey);
 *      return this._permissions.some(key => key.equals(keyObj));
 *    }
 * 
 * 2. Creating PermissionKey:
 *    const userCreate = new PermissionKey("user:create");
 *    const invoiceIssue = new PermissionKey("invoice:issue");
 *    const wildcard = new PermissionKey("user:*");
 *    const allPermissions = new PermissionKey("*:*");
 *    const fromStringSafe = PermissionKey.fromString("appointment:complete"); // PermissionKey or null if invalid
 * 
 * 3. Equality comparison:
 *    const key1 = new PermissionKey("user:create");
 *    const key2 = new PermissionKey("user:create");
 *    key1.equals(key2); // true
 * 
 *    const key3 = new PermissionKey("User:Create");
 *    key1.equals(key3); // false (case-sensitive)
 * 
 * 4. String representation:
 *    const key = new PermissionKey("user:create");
 *    key.toString(); // "user:create"
 *    key.value; // "user:create"
 *    key.resource; // "user"
 *    key.action; // "create"
 * 
 * 5. Checking permission types:
 *    const key = new PermissionKey("user:create");
 *    key.isWildcard(); // false
 *    key.isResourceWildcard(); // false
 *    key.isAllWildcard(); // false
 * 
 *    const wildcard = new PermissionKey("user:*");
 *    wildcard.isResourceWildcard(); // true
 * 
 *    const allWildcard = new PermissionKey("*:*");
 *    allWildcard.isAllWildcard(); // true
 */

export class PermissionKey {
  private readonly _value: string;
  private readonly _resource: string;
  private readonly _action: string;

  private static readonly PERMISSION_REGEX = /^([a-z0-9_]+|\*):([a-z0-9_]+|\*)$/;

  /**
   * Creates a new PermissionKey value object
   * 
   * @param value - Permission key string in format `{resource}:{action}`
   * @throws Error if value does not match permission key format
   */
  constructor(value: string) {
    this.validateValue(value);
    const trimmed = value.trim();
    this._value = trimmed;
    const [resource, action] = trimmed.split(':');
    this._resource = resource;
    this._action = action;
  }

  /**
   * Gets the permission key value
   * 
   * @returns Permission key string (e.g., "user:create")
   */
  get value(): string {
    return this._value;
  }

  /**
   * Gets the resource part of the permission key
   * 
   * @returns Resource string (e.g., "user")
   */
  get resource(): string {
    return this._resource;
  }

  /**
   * Gets the action part of the permission key
   * 
   * @returns Action string (e.g., "create")
   */
  get action(): string {
    return this._action;
  }

  /**
   * Checks if this PermissionKey equals another PermissionKey
   * 
   * Equality is determined by comparing values (case-sensitive).
   * 
   * @param other - Other PermissionKey to compare
   * @returns True if values are equal
   */
  equals(other: PermissionKey | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof PermissionKey)) {
      return false;
    }

    return this._value === other._value;
  }

  /**
   * Checks if this PermissionKey is equal to another PermissionKey (alias for equals)
   * 
   * @param other - Other PermissionKey to compare
   * @returns True if values are equal
   */
  isEqual(other: PermissionKey | null | undefined): boolean {
    return this.equals(other);
  }

  /**
   * Checks if this permission key is a wildcard (resource or all wildcard)
   * 
   * @returns True if permission key contains wildcard
   */
  isWildcard(): boolean {
    return this._resource === '*' || this._action === '*';
  }

  /**
   * Checks if this permission key is a resource wildcard (e.g., "user:*")
   * 
   * @returns True if action is wildcard
   */
  isResourceWildcard(): boolean {
    return this._action === '*' && this._resource !== '*';
  }

  /**
   * Checks if this permission key is an all wildcard (e.g., "*:*")
   * 
   * @returns True if both resource and action are wildcards
   */
  isAllWildcard(): boolean {
    return this._resource === '*' && this._action === '*';
  }

  /**
   * Checks if this permission key matches another permission key
   * 
   * A permission key matches if:
   * - They are equal, OR
   * - This key is a resource wildcard and resources match, OR
   * - This key is an all wildcard
   * 
   * @param other - Other PermissionKey to check against
   * @returns True if this permission key matches the other
   */
  matches(other: PermissionKey): boolean {
    if (this.equals(other)) {
      return true;
    }

    // All wildcard matches everything
    if (this.isAllWildcard()) {
      return true;
    }

    // Resource wildcard matches all actions for that resource
    if (this.isResourceWildcard() && this._resource === other._resource) {
      return true;
    }

    return false;
  }

  /**
   * Converts the PermissionKey to string representation
   * 
   * @returns Permission key string representation
   */
  toString(): string {
    return this._value;
  }

  /**
   * Creates a PermissionKey instance from a string, returning null if invalid
   * 
   * This is a factory method that allows safe creation without throwing exceptions.
   * 
   * @param value - Permission key string
   * @returns PermissionKey instance or null if invalid
   */
  static fromString(value: string): PermissionKey | null {
    try {
      return new PermissionKey(value);
    } catch {
      return null;
    }
  }

  /**
   * Creates a PermissionKey from resource and action parts
   * 
   * @param resource - Resource part (e.g., "user")
   * @param action - Action part (e.g., "create")
   * @returns New PermissionKey instance
   * @throws Error if resource or action is invalid
   */
  static fromParts(resource: string, action: string): PermissionKey {
    return new PermissionKey(`${resource}:${action}`);
  }

  /**
   * Validates if a string can be used to create a PermissionKey instance
   * 
   * @param value - String to validate
   * @returns True if string is valid for PermissionKey creation
   */
  static isValid(value: string): boolean {
    return PermissionKey.fromString(value) !== null;
  }

  // Private validation method

  /**
   * Validates the permission key value
   * 
   * @param value - Value to validate
   * @throws Error if value is invalid
   */
  private validateValue(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new Error('Permission key must be a non-empty string');
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new Error('Permission key cannot be empty');
    }

    // Check format: resource:action
    if (!PermissionKey.PERMISSION_REGEX.test(trimmed)) {
      throw new Error(
        `Invalid permission key format: "${trimmed}". ` +
        `Expected format: {resource}:{action} (e.g., "user:create", "invoice:issue"). ` +
        `Wildcards allowed: {resource}:* or *:*`
      );
    }

    // Additional validation: ensure resource and action are not empty (unless wildcard)
    const parts = trimmed.split(':');
    if (parts.length !== 2) {
      throw new Error(`Permission key must have exactly one colon separator. Format: {resource}:{action}`);
    }

    const [resource, action] = parts;

    // Resource and action can be wildcard or non-empty alphanumeric/underscore
    if (resource !== '*' && resource.length === 0) {
      throw new Error('Permission key resource part cannot be empty (use "*" for wildcard)');
    }

    if (action !== '*' && action.length === 0) {
      throw new Error('Permission key action part cannot be empty (use "*" for wildcard)');
    }
  }
}

