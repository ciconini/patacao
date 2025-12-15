/**
 * PurchaseOrderRepository Port (Interface)
 * 
 * Repository interface for PurchaseOrder domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 * 
 * Implementations should be provided in the Infrastructure layer.
 */

import { PurchaseOrder } from '../domain/purchase-order.entity';

export interface PurchaseOrderRepository {
  /**
   * Saves a PurchaseOrder entity (creates or updates)
   * 
   * @param purchaseOrder - PurchaseOrder domain entity to save
   * @returns Saved PurchaseOrder entity
   */
  save(purchaseOrder: PurchaseOrder): Promise<PurchaseOrder>;

  /**
   * Updates an existing PurchaseOrder entity
   * 
   * @param purchaseOrder - PurchaseOrder domain entity to update
   * @returns Updated PurchaseOrder entity
   */
  update(purchaseOrder: PurchaseOrder): Promise<PurchaseOrder>;

  /**
   * Finds a PurchaseOrder by ID
   * 
   * @param id - PurchaseOrder ID
   * @returns PurchaseOrder entity or null if not found
   */
  findById(id: string): Promise<PurchaseOrder | null>;
}

