/**
 * StockMovementRepository Port (Interface)
 * 
 * Repository interface for StockMovement domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 * 
 * Implementations should be provided in the Infrastructure layer.
 */

import { StockMovement } from '../domain/stock-movement.entity';

// Search criteria for stock movement search
export interface StockMovementSearchCriteria {
  productId?: string;
  locationId?: string;
  reason?: string;
  startDate?: Date;
  endDate?: Date;
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

export interface StockMovementRepository {
  /**
   * Saves a StockMovement entity
   * Note: StockMovements are immutable and cannot be updated or deleted
   * 
   * @param movement - StockMovement domain entity to save
   * @returns Saved StockMovement entity
   */
  save(movement: StockMovement): Promise<StockMovement>;

  /**
   * Searches for stock movements with pagination
   * 
   * @param criteria - Search criteria
   * @param pagination - Pagination parameters
   * @param sort - Sort parameters
   * @returns Paginated result of stock movements
   */
  search(
    criteria: StockMovementSearchCriteria,
    pagination: Pagination,
    sort: Sort
  ): Promise<PaginatedResult<StockMovement>>;
}

