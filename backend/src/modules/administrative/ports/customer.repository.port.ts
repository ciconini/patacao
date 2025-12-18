/**
 * CustomerRepository Port (Interface)
 *
 * Repository interface for Customer domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 *
 * Implementations should be provided in the Infrastructure layer.
 */

import { Customer } from '../domain/customer.entity';

// Search criteria for customer search
export interface CustomerSearchCriteria {
  q?: string; // General search query
  email?: string;
  phone?: string;
  fullName?: string;
  consentMarketing?: boolean;
  consentReminders?: boolean;
  archived?: boolean;
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

export interface CustomerRepository {
  /**
   * Saves a Customer entity (creates or updates)
   *
   * @param customer - Customer domain entity to save
   * @returns Saved Customer entity
   */
  save(customer: Customer): Promise<Customer>;

  /**
   * Updates an existing Customer entity
   *
   * @param customer - Customer domain entity to update
   * @returns Updated Customer entity
   */
  update(customer: Customer): Promise<Customer>;

  /**
   * Finds a Customer by ID
   *
   * @param id - Customer ID
   * @returns Customer entity or null if not found
   */
  findById(id: string): Promise<Customer | null>;

  /**
   * Finds a Customer by email
   *
   * @param email - Email address to search for
   * @returns Customer entity or null if not found
   */
  findByEmail(email: string): Promise<Customer | null>;

  /**
   * Deletes a Customer (hard delete)
   *
   * @param id - Customer ID to delete
   */
  delete(id: string): Promise<void>;

  /**
   * Checks if a Customer is archived
   *
   * @param id - Customer ID
   * @returns True if customer is archived
   */
  isArchived(id: string): Promise<boolean>;

  /**
   * Searches for customers with pagination
   *
   * @param criteria - Search criteria
   * @param pagination - Pagination parameters
   * @param sort - Sort parameters
   * @returns Paginated result of customers
   */
  search(
    criteria: CustomerSearchCriteria,
    pagination: Pagination,
    sort: Sort,
  ): Promise<PaginatedResult<Customer>>;
}
