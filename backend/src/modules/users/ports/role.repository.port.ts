/**
 * RoleRepository Port (Interface)
 *
 * Repository interface for Role domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 *
 * Implementations should be provided in the Infrastructure layer.
 */

import { Role } from '../domain/role.entity';

export interface RoleRepository {
  /**
   * Finds a role by its ID
   *
   * @param id - Role ID (canonical identifier, e.g., "Owner", "Manager")
   * @returns Promise that resolves to Role entity or null if not found
   */
  findById(id: string): Promise<Role | null>;

  /**
   * Finds all roles
   *
   * @returns Promise that resolves to array of Role entities
   */
  findAll(): Promise<Role[]>;

  /**
   * Finds multiple roles by their IDs
   *
   * @param ids - Array of role IDs
   * @returns Promise that resolves to array of Role entities (only found roles)
   */
  findByIds(ids: string[]): Promise<Role[]>;

  /**
   * Saves a Role entity (creates or updates)
   *
   * @param role - Role domain entity to save
   * @returns Promise that resolves to the saved Role entity
   */
  save(role: Role): Promise<Role>;

  /**
   * Checks if a role exists
   *
   * @param id - Role ID to check
   * @returns Promise that resolves to true if role exists, false otherwise
   */
  exists(id: string): Promise<boolean>;
}

