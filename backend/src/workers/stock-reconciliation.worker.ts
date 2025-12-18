/**
 * Stock Reconciliation Worker
 *
 * Background worker that performs periodic stock reconciliation.
 * Can be scheduled to run daily/weekly to ensure stock accuracy.
 *
 * Features:
 * - Identifies products with stock discrepancies
 * - Generates reconciliation reports
 * - Alerts managers about low stock or discrepancies
 */

import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WorkerBase } from './worker-base';
import { ProductRepository } from '../modules/inventory/ports/product.repository.port';
import { StockMovementRepository } from '../modules/inventory/ports/stock-movement.repository.port';
import { Logger } from '../shared/logger/logger.service';

/**
 * Stock reconciliation worker
 * Performs periodic stock reconciliation checks
 */
@Injectable()
export class StockReconciliationWorker extends WorkerBase {
  constructor(
    @Inject('ProductRepository')
    private readonly productRepository: ProductRepository,
    @Inject('StockMovementRepository')
    private readonly stockMovementRepository: StockMovementRepository,
    @Inject('Logger')
    private readonly appLogger: Logger,
  ) {
    super('StockReconciliationWorker');
  }

  /**
   * Runs daily at 2 AM to perform stock reconciliation
   */
  @Cron('0 2 * * *') // Daily at 2 AM
  async handleDailyReconciliation() {
    await this.run();
  }

  /**
   * Main execution logic
   */
  protected async execute(): Promise<void> {
    this.logger.log('Starting stock reconciliation check');

    // Find products with stock tracking enabled
    const products = await this.findTrackedProducts();

    if (products.length === 0) {
      this.logger.debug('No products with stock tracking found');
      return;
    }

    this.logger.log(`Checking ${products.length} product(s) for reconciliation`);

    const discrepancies: Array<{
      productId: string;
      productName: string;
      expectedStock: number;
      actualStock: number;
      discrepancy: number;
    }> = [];

    // Check each product for discrepancies
    for (const product of products) {
      try {
        const discrepancy = await this.checkProductStock(product.id);
        if (discrepancy !== null) {
          discrepancies.push({
            productId: product.id,
            productName: product.name,
            expectedStock: discrepancy.expected,
            actualStock: discrepancy.actual,
            discrepancy: discrepancy.expected - discrepancy.actual,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Failed to check stock for product ${product.id}: ${errorMessage}`,
          errorStack,
        );
      }
    }

    if (discrepancies.length > 0) {
      this.logger.warn(`Found ${discrepancies.length} product(s) with stock discrepancies`);
      await this.reportDiscrepancies(discrepancies);
    } else {
      this.logger.log('No stock discrepancies found');
    }

    // Check for low stock levels
    await this.checkLowStockLevels(products);
  }

  /**
   * Finds products with stock tracking enabled
   */
  private async findTrackedProducts(): Promise<any[]> {
    try {
      // Use search method with stockTracked filter
      const criteria = {
        stockTracked: true,
      };

      const pagination = {
        page: 1,
        perPage: 10000,
      };

      const sort = {
        field: 'name',
        direction: 'asc' as const,
      };

      const result = await this.productRepository.search(criteria, pagination, sort);
      return result?.items || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to find tracked products: ${errorMessage}`, errorStack);
      return [];
    }
  }

  /**
   * Checks stock for a specific product
   * Returns discrepancy if found, null otherwise
   */
  private async checkProductStock(productId: string): Promise<{
    expected: number;
    actual: number;
  } | null> {
    // Calculate expected stock from movements
    const expectedStock = await this.calculateExpectedStock(productId);

    // Get actual stock from product
    const product = await this.productRepository.findById(productId);
    if (!product) {
      return null;
    }

    // TODO: Get actual stock from product entity
    // For now, we'll need to add a method to get current stock
    const actualStock = 0; // Placeholder

    if (expectedStock !== actualStock) {
      return {
        expected: expectedStock,
        actual: actualStock,
      };
    }

    return null;
  }

  /**
   * Calculates expected stock from stock movements
   */
  private async calculateExpectedStock(productId: string): Promise<number> {
    // TODO: Implement calculation from stock movements
    // Sum all movements for the product
    this.logger.warn('calculateExpectedStock: Not yet implemented');
    return 0;
  }

  /**
   * Reports stock discrepancies
   */
  private async reportDiscrepancies(
    discrepancies: Array<{
      productId: string;
      productName: string;
      expectedStock: number;
      actualStock: number;
      discrepancy: number;
    }>,
  ): Promise<void> {
    // TODO: Send alerts/notifications to managers
    // For now, just log
    this.logger.warn('Stock discrepancies found:');
    for (const disc of discrepancies) {
      this.logger.warn(
        `  Product ${disc.productName} (${disc.productId}): Expected ${disc.expectedStock}, Actual ${disc.actualStock}, Discrepancy: ${disc.discrepancy}`,
      );
    }
  }

  /**
   * Checks for products with low stock levels
   */
  private async checkLowStockLevels(products: any[]): Promise<void> {
    const lowStockProducts: any[] = [];

    for (const product of products) {
      // TODO: Check if product stock is below reorder threshold
      // if (product.currentStock < product.reorderThreshold) {
      //   lowStockProducts.push(product);
      // }
    }

    if (lowStockProducts.length > 0) {
      this.logger.warn(`Found ${lowStockProducts.length} product(s) with low stock levels`);
      // TODO: Send alerts/notifications
    }
  }
}
