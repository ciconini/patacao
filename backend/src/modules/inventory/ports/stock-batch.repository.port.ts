/**
 * StockBatchRepository Port (Interface)
 * 
 * Repository interface for StockBatch domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 * 
 * Implementations should be provided in the Infrastructure layer.
 */

import { StockBatch } from '../domain/stock-batch.entity';

export interface StockBatchRepository {
  /**
   * Creates a new StockBatch or increments quantity if batch already exists
   * 
   * @param params - Parameters for creating or incrementing batch
   * @returns StockBatch entity
   */
  createOrIncrement(params: {
    productId: string;
    batchNumber?: string;
    quantity: number;
    expiryDate?: Date;
    receivedAt: Date;
  }): Promise<StockBatch>;

  /**
   * Finds a StockBatch by product and batch number
   * 
   * @param productId - Product ID
   * @param batchNumber - Batch number
   * @returns StockBatch entity or null if not found
   */
  findByProductAndBatch(productId: string, batchNumber: string): Promise<StockBatch | null>;

  /**
   * Finds all StockBatches for a product
   * 
   * @param productId - Product ID
   * @returns Array of StockBatch entities
   */
  findByProduct(productId: string): Promise<StockBatch[]>;
}

