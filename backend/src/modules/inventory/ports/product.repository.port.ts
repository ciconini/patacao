/**
 * ProductRepository Port (Interface)
 *
 * Repository interface for Product domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 *
 * Implementations should be provided in the Infrastructure layer.
 */

import { Product } from '../domain/product.entity';

// Search criteria for product search
export interface ProductSearchCriteria {
  q?: string; // General search query
  category?: string;
  stockTracked?: boolean;
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

export interface ProductRepository {
  /**
   * Saves a Product entity (creates or updates)
   *
   * @param product - Product domain entity to save
   * @returns Saved Product entity
   */
  save(product: Product): Promise<Product>;

  /**
   * Updates an existing Product entity
   *
   * @param product - Product domain entity to update
   * @returns Updated Product entity
   */
  update(product: Product): Promise<Product>;

  /**
   * Finds a Product by ID
   *
   * @param id - Product ID
   * @returns Product entity or null if not found
   */
  findById(id: string): Promise<Product | null>;

  /**
   * Finds a Product by SKU
   *
   * @param sku - SKU to search for
   * @returns Product entity or null if not found
   */
  findBySku(sku: string): Promise<Product | null>;

  /**
   * Searches for products with pagination
   *
   * @param criteria - Search criteria
   * @param pagination - Pagination parameters
   * @param sort - Sort parameters
   * @returns Paginated result of products
   */
  search(
    criteria: ProductSearchCriteria,
    pagination: Pagination,
    sort: Sort,
  ): Promise<PaginatedResult<Product>>;

  /**
   * Gets the on-hand stock quantity for a product at a location
   *
   * @param productId - Product ID
   * @param locationId - Location ID (optional, if not provided returns aggregate)
   * @returns On-hand stock quantity
   */
  getOnHand(productId: string, locationId?: string): Promise<number>;

  /**
   * Updates the on-hand stock quantity for a product
   *
   * @param productId - Product ID
   * @param delta - Change in quantity (positive for increase, negative for decrease)
   */
  updateOnHand(productId: string, delta: number): Promise<void>;

  /**
   * Checks if there is sufficient stock for a product
   *
   * @param productId - Product ID
   * @param quantity - Required quantity
   * @returns True if sufficient stock is available
   */
  checkStock(productId: string, quantity: number): Promise<boolean>;

  /**
   * Decrements stock for a product
   *
   * @param productId - Product ID
   * @param quantity - Quantity to decrement
   */
  decrementStock(productId: string, quantity: number): Promise<void>;

  /**
   * Calculates the current stock for a product
   * (sum of all stock movements)
   *
   * @param productId - Product ID
   * @returns Current stock quantity
   */
  calculateCurrentStock(productId: string): Promise<number>;
}
