/**
 * ServiceRepository Port (Interface)
 *
 * Repository interface for Service domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 *
 * Implementations should be provided in the Infrastructure layer.
 */

import { Service } from '../domain/service.entity';

// Search criteria for service search
export interface ServiceSearchCriteria {
  q?: string; // General search query (name, description)
  tag?: string;
  consumesInventory?: boolean;
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

export interface ServiceRepository {
  /**
   * Saves a Service entity (creates or updates)
   *
   * @param service - Service domain entity to save
   * @returns Saved Service entity
   */
  save(service: Service): Promise<Service>;

  /**
   * Updates an existing Service entity
   *
   * @param service - Service domain entity to update
   * @returns Updated Service entity
   */
  update(service: Service): Promise<Service>;

  /**
   * Finds a Service by ID
   *
   * @param id - Service ID
   * @returns Service entity or null if not found
   */
  findById(id: string): Promise<Service | null>;

  /**
   * Searches for services with pagination
   *
   * @param criteria - Search criteria
   * @param pagination - Pagination parameters
   * @param sort - Sort parameters
   * @returns Paginated result of services
   */
  search(
    criteria: ServiceSearchCriteria,
    pagination: Pagination,
    sort: Sort,
  ): Promise<PaginatedResult<Service>>;

  /**
   * Deletes a Service entity
   *
   * @param id - Service ID
   */
  delete(id: string): Promise<void>;
}
