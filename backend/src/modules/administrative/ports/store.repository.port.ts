/**
 * StoreRepository Port (Interface)
 * 
 * Repository interface for Store domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 * 
 * Implementations should be provided in the Infrastructure layer.
 */

import { Store } from '../domain/store.entity';

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
}

