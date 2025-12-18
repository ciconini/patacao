/**
 * Role Domain Entity
 *
 * Represents a role in the petshop management system for access control and authorization.
 * Roles define what permissions users have in the system.
 * This is a pure domain entity with no framework dependencies.
 *
 * Business Rules:
 * - Role ID is a canonical identifier (string, not UUID)
 * - Role name must be one of the predefined role names
 * - Sensitive roles (Owner) have restricted creation flows
 * - Permissions are stored as a list of permission keys
 */

export enum RoleName {
  OWNER = 'Owner',
  MANAGER = 'Manager',
  STAFF = 'Staff',
  ACCOUNTANT = 'Accountant',
  VETERINARIAN = 'Veterinarian',
}

export class Role {
  private readonly _id: string;
  private _name: string;
  private _permissions: string[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Creates a new Role entity
   *
   * @param id - Canonical role identifier (string, e.g., "Owner", "Manager")
   * @param name - Role name (must be one of: Owner, Manager, Staff, Accountant, Veterinarian)
   * @param permissions - List of permission keys
   * @param createdAt - Creation timestamp
   * @param updatedAt - Last update timestamp
   *
   * @throws Error if id is empty
   * @throws Error if name is empty or invalid
   */
  constructor(
    id: string,
    name: string,
    permissions: string[] = [],
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.validateId(id);
    this.validateName(name);

    this._id = id;
    this._name = name;
    this._permissions = [...permissions];
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
    this._updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  // Getters (read-only access to private fields)
  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get permissions(): ReadonlyArray<string> {
    return [...this._permissions];
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Updates the role name
   *
   * @param name - New role name
   * @throws Error if name is empty or invalid
   */
  updateName(name: string): void {
    this.validateName(name);
    this._name = name;
    this._updatedAt = new Date();
  }

  /**
   * Adds a permission to the role
   *
   * @param permission - Permission key to add
   * @throws Error if permission is empty
   */
  addPermission(permission: string): void {
    if (!permission || permission.trim().length === 0) {
      throw new Error('Permission cannot be empty');
    }

    if (!this._permissions.includes(permission)) {
      this._permissions.push(permission);
      this._updatedAt = new Date();
    }
  }

  /**
   * Removes a permission from the role
   *
   * @param permission - Permission key to remove
   */
  removePermission(permission: string): void {
    const index = this._permissions.indexOf(permission);
    if (index > -1) {
      this._permissions.splice(index, 1);
      this._updatedAt = new Date();
    }
  }

  /**
   * Sets all permissions for the role
   *
   * @param permissions - New list of permission keys
   */
  setPermissions(permissions: string[]): void {
    this._permissions = [...permissions];
    this._updatedAt = new Date();
  }

  /**
   * Checks if the role has a specific permission
   *
   * @param permission - Permission key to check
   * @returns True if role has the permission
   */
  hasPermission(permission: string): boolean {
    return this._permissions.includes(permission);
  }

  /**
   * Checks if the role has all specified permissions
   *
   * @param permissions - List of permission keys to check
   * @returns True if role has all permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every((permission) => this._permissions.includes(permission));
  }

  /**
   * Checks if the role has any of the specified permissions
   *
   * @param permissions - List of permission keys to check
   * @returns True if role has at least one permission
   */
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((permission) => this._permissions.includes(permission));
  }

  /**
   * Checks if this is the Owner role
   *
   * @returns True if role is Owner
   */
  isOwner(): boolean {
    return this._name === RoleName.OWNER || this._id.toLowerCase() === 'owner';
  }

  /**
   * Checks if this is a sensitive role (Owner)
   * Sensitive roles have restricted creation flows
   *
   * @returns True if role is sensitive
   */
  isSensitive(): boolean {
    return this.isOwner();
  }

  /**
   * Gets the number of permissions assigned to this role
   *
   * @returns Number of permissions
   */
  getPermissionCount(): number {
    return this._permissions.length;
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Role ID is required');
    }

    if (id.trim().length > 64) {
      throw new Error('Role ID cannot exceed 64 characters');
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Role name is required');
    }

    const validNames = Object.values(RoleName);
    const trimmedName = name.trim();

    if (!validNames.includes(trimmedName as RoleName)) {
      throw new Error(
        `Invalid role name: ${trimmedName}. Valid names are: ${validNames.join(', ')}`,
      );
    }

    if (name.length > 128) {
      throw new Error('Role name cannot exceed 128 characters');
    }
  }
}
