/**
 * FinancialExportRepository Port (Interface)
 *
 * Repository interface for FinancialExport domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 *
 * Implementations should be provided in the Infrastructure layer.
 */

import { FinancialExport } from '../domain/financial-export.entity';

export interface FinancialExportRepository {
  /**
   * Saves a FinancialExport entity (creates or updates)
   *
   * @param exportEntity - FinancialExport domain entity to save
   * @returns Saved FinancialExport entity
   */
  save(exportEntity: FinancialExport): Promise<FinancialExport>;

  /**
   * Finds a FinancialExport by ID
   *
   * @param id - FinancialExport ID
   * @returns FinancialExport entity or null if not found
   */
  findById(id: string): Promise<FinancialExport | null>;

  /**
   * Finds pending financial exports
   *
   * @returns Array of pending FinancialExport entities
   */
  findPendingExports(): Promise<FinancialExport[]>;
}
