/**
 * ServiceRepository Port (Interface)
 *
 * Repository interface for Service domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 *
 * Implementations should be provided in the Infrastructure layer.
 */

import { Service } from '../domain/service.entity';

export interface ServiceRepository {
  /**
   * Saves a Service entity (creates or updates)
   *
   * @param service - Service domain entity to save
   * @returns Saved Service entity
   */
  save(service: Service): Promise<Service>;

  /**
   * Finds a Service by ID
   *
   * @param id - Service ID
   * @returns Service entity or null if not found
   */
  findById(id: string): Promise<Service | null>;
}
