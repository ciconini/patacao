/**
 * StoreRepository Port (Interface)
 *
 * Repository interface for Store domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 *
 * Implementations should be provided in the Infrastructure layer.
 */

import { Store } from '../domain/store.entity';

// Search criteria for store search
export interface StoreSearchCriteria {
  companyId?: string;
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

export interface StoreRepository {
  /**
   * Saves a Store entity (creates or updates)
   *
   * @param store - Store domain entity to save
   * @returns Saved Store entity
   */
  save(store: Store): Promise<Store>;

  /**
   * Updates an existing Store entity
   *
   * @param store - Store domain entity to update
   * @returns Updated Store entity
   */
  update(store: Store): Promise<Store>;

  /**
   * Finds a Store by ID
   *
   * @param id - Store ID
   * @returns Store entity or null if not found
   */
  findById(id: string): Promise<Store | null>;

  /**
   * Searches for stores with pagination
   *
   * @param criteria - Search criteria
   * @param pagination - Pagination parameters
   * @param sort - Sort parameters
   * @returns Paginated result of stores
   */
  search(
    criteria: StoreSearchCriteria,
    pagination: Pagination,
    sort: Sort,
  ): Promise<PaginatedResult<Store>>;

  /**
   * Deletes a Store entity
   *
   * @param id - Store ID
   */
  delete(id: string): Promise<void>;
}
