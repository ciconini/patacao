/**
 * CompanyRepository Port (Interface)
 * 
 * Repository interface for Company domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 * 
 * Implementations should be provided in the Infrastructure layer.
 */

import { Company } from '../domain/company.entity';

export interface CompanyRepository {
  /**
   * Saves a Company entity (creates or updates)
   * 
   * @param company - Company domain entity to save
   * @returns Saved Company entity
   */
  save(company: Company): Promise<Company>;

  /**
   * Updates an existing Company entity
   * 
   * @param company - Company domain entity to update
   * @returns Updated Company entity
   */
  update(company: Company): Promise<Company>;

  /**
   * Finds a Company by ID
   * 
   * @param id - Company ID
   * @returns Company entity or null if not found
   */
  findById(id: string): Promise<Company | null>;

  /**
   * Finds a Company by NIF (Portuguese tax ID)
   * 
   * @param nif - NIF to search for
   * @returns Company entity or null if not found
   */
  findByNif(nif: string): Promise<Company | null>;
}

