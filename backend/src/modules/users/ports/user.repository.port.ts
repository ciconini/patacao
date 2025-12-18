/**
 * UserRepository Port (Interface)
 *
 * Repository interface for User domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 *
 * Implementations should be provided in the Infrastructure layer.
 */

import { User } from '../domain/user.entity';

// Search criteria for user search
export interface UserSearchCriteria {
  q?: string; // General search query
  email?: string;
  role?: string;
  storeId?: string;
  active?: boolean;
}

// Pagination model
export interface Pagination {
  page: number;
  perPage: number;
}

// Sort model
export interface Sort {
  field: string;
  direction: 'asc' | 'desc';
}

// Paginated result model
export interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface UserRepository {
  /**
   * Saves a User entity (creates or updates)
   *
   * @param user - User domain entity to save
   * @returns Saved User entity
   */
  save(user: User): Promise<User>;

  /**
   * Finds a User by ID
   *
   * @param id - User ID
   * @returns User entity or null if not found
   */
  findById(id: string): Promise<User | null>;

  /**
   * Finds a User by email
   *
   * @param email - Email address to search for
   * @returns User entity or null if not found
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Finds a User by username
   *
   * @param username - Username to search for
   * @returns User entity or null if not found
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Updates user password
   *
   * @param userId - User ID
   * @param passwordHash - New password hash
   */
  updatePassword(userId: string, passwordHash: string): Promise<void>;

  /**
   * Verifies user password
   *
   * @param userId - User ID
   * @param password - Plain text password to verify
   * @returns True if password matches
   */
  verifyPassword(userId: string, password: string): Promise<boolean>;

  /**
   * Updates last login timestamp
   *
   * @param userId - User ID
   */
  updateLastLogin(userId: string): Promise<void>;

  /**
   * Increments failed login attempts counter
   *
   * @param userId - User ID
   */
  incrementFailedLoginAttempts(userId: string): Promise<void>;

  /**
   * Resets failed login attempts counter
   *
   * @param userId - User ID
   */
  resetFailedLoginAttempts(userId: string): Promise<void>;

  /**
   * Locks user account
   *
   * @param userId - User ID
   * @param lockoutExpiry - Lockout expiration date
   */
  lockAccount(userId: string, lockoutExpiry: Date): Promise<void>;

  /**
   * Checks if user account is locked
   *
   * @param userId - User ID
   * @returns True if account is locked
   */
  isAccountLocked(userId: string): Promise<boolean>;

  /**
   * Searches for users with pagination
   *
   * @param criteria - Search criteria
   * @param pagination - Pagination parameters
   * @param sort - Sort parameters
   * @returns Paginated result of users
   */
  search(
    criteria: UserSearchCriteria,
    pagination: Pagination,
    sort: Sort,
  ): Promise<PaginatedResult<User>>;

  /**
   * Assigns roles to a user
   *
   * @param userId - User ID
   * @param roleIds - List of role IDs to assign
   */
  assignRoles(userId: string, roleIds: string[]): Promise<void>;

  /**
   * Assigns stores to a user
   *
   * @param userId - User ID
   * @param storeIds - List of store IDs to assign
   */
  assignStores(userId: string, storeIds: string[]): Promise<void>;
}
