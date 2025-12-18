/**
 * SupplierRepository Port (Interface)
 *
 * Repository interface for Supplier domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 *
 * Implementations should be provided in the Infrastructure layer.
 */

import { Supplier } from '../domain/supplier.entity';

export interface SupplierRepository {
  /**
   * Saves a Supplier entity (creates or updates)
   *
   * @param supplier - Supplier domain entity to save
   * @returns Saved Supplier entity
   */
  save(supplier: Supplier): Promise<Supplier>;

  /**
   * Finds a Supplier by ID
   *
   * @param id - Supplier ID
   * @returns Supplier entity or null if not found
   */
  findById(id: string): Promise<Supplier | null>;
}
