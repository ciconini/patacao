/**
 * PetRepository Port (Interface)
 *
 * Repository interface for Pet domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 *
 * Implementations should be provided in the Infrastructure layer.
 */

import { Pet } from '../domain/pet.entity';

// Search criteria for pet search
export interface PetSearchCriteria {
  customerId?: string;
  species?: string;
  breed?: string;
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

export interface PetRepository {
  /**
   * Saves a Pet entity (creates or updates)
   *
   * @param pet - Pet domain entity to save
   * @returns Saved Pet entity
   */
  save(pet: Pet): Promise<Pet>;

  /**
   * Updates an existing Pet entity
   *
   * @param pet - Pet domain entity to update
   * @returns Updated Pet entity
   */
  update(pet: Pet): Promise<Pet>;

  /**
   * Finds a Pet by ID
   *
   * @param id - Pet ID
   * @returns Pet entity or null if not found
   */
  findById(id: string): Promise<Pet | null>;

  /**
   * Counts pets by customer ID
   *
   * @param customerId - Customer ID
   * @returns Number of pets for the customer
   */
  countByCustomerId(customerId: string): Promise<number>;

  /**
   * Searches for pets with pagination
   *
   * @param criteria - Search criteria
   * @param pagination - Pagination parameters
   * @param sort - Sort parameters
   * @returns Paginated result of pets
   */
  search(
    criteria: PetSearchCriteria,
    pagination: Pagination,
    sort: Sort,
  ): Promise<PaginatedResult<Pet>>;

  /**
   * Deletes a Pet entity
   *
   * @param id - Pet ID
   */
  delete(id: string): Promise<void>;
}
