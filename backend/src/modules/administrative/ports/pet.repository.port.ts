/**
 * PetRepository Port (Interface)
 *
 * Repository interface for Pet domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 *
 * Implementations should be provided in the Infrastructure layer.
 */

import { Pet } from '../domain/pet.entity';

export interface PetRepository {
  /**
   * Saves a Pet entity (creates or updates)
   *
   * @param pet - Pet domain entity to save
   * @returns Saved Pet entity
   */
  save(pet: Pet): Promise<Pet>;

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
}
