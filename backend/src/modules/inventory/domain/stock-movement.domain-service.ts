/**
 * StockMovementDomainService
 * 
 * Domain service responsible for validating stock movement legality and managing
 * compensating movements. This service enforces the non-deletable movement rule
 * and provides validation for stock movement operations.
 * 
 * Responsibilities:
 * - Validate stock movement legality
 * - Enforce non-deletable movement rule
 * - Create compensating movements conceptually
 * - Validate movement constraints
 * 
 * Collaborating Entities:
 * - StockMovement: The stock movement entity being validated or corrected
 * - Product: The product entity that the movement affects
 * 
 * Business Rules Enforced:
 * - BR: All stock changes must be recorded as StockMovement with `performed_by` and cannot be deleted (only corrected with compensating movement)
 * - BR: Transactions creating multiple StockMovements must be atomic to preserve consistency
 * - BR: Only stock-tracked products can have stock movements
 * - BR: Quantity change must be non-zero (positive for receipt, negative for decrement)
 * - BR: Decrement movements cannot exceed available stock (conceptual validation)
 * - BR: Movements are immutable once created
 * - BR: Corrections are made with compensating movements, not deletions
 * 
 * Invariants:
 * - Product must have stock tracking enabled for movements
 * - Quantity change must be non-zero integer
 * - Performed by user ID is required
 * - Location ID is required
 * - Movements cannot be deleted (only corrected with compensating movements)
 * 
 * Edge Cases:
 * - Product with stock_tracked = false (cannot have movements)
 * - Movement with zero quantity change (invalid)
 * - Decrement movement exceeding available stock (requires validation)
 * - Attempting to delete a movement (not allowed)
 * - Creating compensating movement for non-existent movement
 * - Multiple compensating movements for same original movement
 * - Batch-specific movements
 * - Movements with reference IDs
 */

import { StockMovement, StockMovementReason } from './stock-movement.entity';
import { Product } from './product.entity';

export interface MovementValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CompensatingMovementCreationResult {
  compensatingMovement: StockMovement;
  originalMovement: StockMovement;
  netQuantityChange: number; // Should be 0 if perfect compensation
}

export class StockMovementDomainService {
  /**
   * Validates if a stock movement is legal.
   * 
   * This method validates:
   * - Product stock tracking status
   * - Quantity change validity
   * - Movement reason appropriateness
   * - Available stock constraints (conceptual)
   * 
   * Business Rule: Only stock-tracked products can have stock movements
   * Business Rule: Quantity change must be non-zero
   * 
   * @param movement - The stock movement to validate
   * @param product - The product the movement affects
   * @param availableStock - Current available stock (for decrement validation)
   * @returns Validation result with errors and warnings
   * @throws Error if movement or product is not provided
   */
  validateMovementLegality(
    movement: StockMovement,
    product: Product,
    availableStock?: number
  ): MovementValidationResult {
    if (!movement) {
      throw new Error('StockMovement entity is required');
    }

    if (!product) {
      throw new Error('Product entity is required');
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate product stock tracking
    if (!product.stockTracked) {
      errors.push(
        `Product ${product.name} (${product.sku}) is not stock-tracked. ` +
        `Stock movements can only be created for stock-tracked products.`
      );
    }

    // Validate product ID matches
    if (movement.productId !== product.id) {
      errors.push(
        `Movement product ID (${movement.productId}) does not match provided product ID (${product.id})`
      );
    }

    // Validate quantity change is non-zero (already validated in entity, but double-check)
    if (movement.quantityChange === 0) {
      errors.push('Stock movement quantity change cannot be zero');
    }

    // Validate quantity change is integer (already validated in entity)
    if (!Number.isInteger(movement.quantityChange)) {
      errors.push('Stock movement quantity change must be an integer');
    }

    // Validate decrement doesn't exceed available stock (if available stock is provided)
    if (availableStock !== undefined && movement.isDecrement()) {
      const absoluteQuantity = movement.getAbsoluteQuantity();
      if (absoluteQuantity > availableStock) {
        errors.push(
          `Cannot decrement ${absoluteQuantity} units. Available stock: ${availableStock}. ` +
          `Decrement would result in negative stock.`
        );
      } else if (absoluteQuantity === availableStock) {
        warnings.push(
          `Decrement of ${absoluteQuantity} units will reduce stock to zero.`
        );
      }
    }

    // Validate reason appropriateness
    if (movement.isReceipt() && movement.reason !== StockMovementReason.RECEIPT) {
      warnings.push(
        `Movement has positive quantity but reason is ${movement.reason}. ` +
        `Expected reason: RECEIPT`
      );
    }

    if (movement.isDecrement() && 
        movement.reason !== StockMovementReason.SALE &&
        movement.reason !== StockMovementReason.ADJUSTMENT &&
        movement.reason !== StockMovementReason.TRANSFER &&
        movement.reason !== StockMovementReason.RESERVATION_RELEASE) {
      warnings.push(
        `Movement has negative quantity but reason is ${movement.reason}. ` +
        `Expected reason: SALE, ADJUSTMENT, TRANSFER, or RESERVATION_RELEASE`
      );
    }

    // Validate batch-specific movements
    if (movement.isBatchSpecific() && !product.stockTracked) {
      errors.push(
        'Batch-specific movements can only be created for stock-tracked products'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates that a movement cannot be deleted.
   * 
   * Business Rule: All stock changes must be recorded and cannot be deleted (only corrected with compensating movement)
   * 
   * This method enforces the immutability rule conceptually.
   * 
   * @param movement - The movement that cannot be deleted
   * @returns Validation result indicating deletion is not allowed
   */
  validateMovementCannotBeDeleted(movement: StockMovement): MovementValidationResult {
    if (!movement) {
      throw new Error('StockMovement entity is required');
    }

    return {
      isValid: false,
      errors: [
        `Stock movement ${movement.id} cannot be deleted. ` +
        `All stock changes must be recorded and cannot be deleted. ` +
        `To correct an error, create a compensating movement instead.`
      ],
      warnings: [],
    };
  }

  /**
   * Creates a compensating movement to correct an error in an original movement.
   * 
   * Business Rule: Corrections are made with compensating movements, not deletions
   * 
   * This method creates a new movement that reverses the effect of the original movement.
   * 
   * @param originalMovement - The movement to compensate for
   * @param compensatingId - ID for the compensating movement
   * @param performedBy - User ID performing the correction
   * @param reason - Reason for the compensation (defaults to ADJUSTMENT)
   * @param referenceId - Optional reference ID for the correction
   * @param createdAt - Creation timestamp for the compensating movement
   * @returns Compensating movement creation result
   * @throws Error if original movement is not provided
   */
  createCompensatingMovement(
    originalMovement: StockMovement,
    compensatingId: string,
    performedBy: string,
    reason: StockMovementReason = StockMovementReason.ADJUSTMENT,
    referenceId?: string,
    createdAt?: Date
  ): CompensatingMovementCreationResult {
    if (!originalMovement) {
      throw new Error('Original StockMovement entity is required');
    }

    if (!compensatingId || compensatingId.trim().length === 0) {
      throw new Error('Compensating movement ID is required');
    }

    if (!performedBy || performedBy.trim().length === 0) {
      throw new Error('Performed by user ID is required for compensating movement');
    }

    // Use the entity's method to create compensating movement
    const compensatingMovement = originalMovement.createCompensatingMovement(
      compensatingId,
      performedBy,
      referenceId,
      createdAt
    );

    // Override reason if provided
    if (reason !== StockMovementReason.ADJUSTMENT) {
      // Create new movement with custom reason
      const compensatingQuantityChange = -originalMovement.quantityChange;
      const newCompensatingMovement = new StockMovement(
        compensatingId,
        originalMovement.productId,
        compensatingQuantityChange,
        reason,
        performedBy,
        originalMovement.locationId,
        originalMovement.batchId,
        referenceId,
        createdAt
      );
      
      const netQuantityChange = originalMovement.quantityChange + newCompensatingMovement.quantityChange;
      
      return {
        compensatingMovement: newCompensatingMovement,
        originalMovement,
        netQuantityChange,
      };
    }

    // Calculate net quantity change (should be 0 for perfect compensation)
    const netQuantityChange = originalMovement.quantityChange + compensatingMovement.quantityChange;

    return {
      compensatingMovement,
      originalMovement,
      netQuantityChange,
    };
  }

  /**
   * Validates if a compensating movement correctly compensates for an original movement.
   * 
   * A perfect compensation should result in net quantity change of 0.
   * 
   * @param originalMovement - The original movement
   * @param compensatingMovement - The compensating movement
   * @returns True if compensation is correct (net change = 0)
   */
  validateCompensatingMovement(
    originalMovement: StockMovement,
    compensatingMovement: StockMovement
  ): boolean {
    if (!originalMovement) {
      throw new Error('Original StockMovement entity is required');
    }

    if (!compensatingMovement) {
      throw new Error('Compensating StockMovement entity is required');
    }

    // Must be for the same product
    if (originalMovement.productId !== compensatingMovement.productId) {
      return false;
    }

    // Must be at the same location
    if (originalMovement.locationId !== compensatingMovement.locationId) {
      return false;
    }

    // Must be for the same batch (if batch-specific)
    if (originalMovement.batchId !== compensatingMovement.batchId) {
      return false;
    }

    // Net quantity change should be 0 for perfect compensation
    const netQuantityChange = originalMovement.quantityChange + compensatingMovement.quantityChange;
    return netQuantityChange === 0;
  }

  /**
   * Calculates the net quantity change from multiple movements.
   * 
   * Useful for validating that a set of compensating movements correctly balances.
   * 
   * @param movements - List of movements to calculate net change for
   * @returns Net quantity change
   */
  calculateNetQuantityChange(movements: StockMovement[]): number {
    if (!movements || movements.length === 0) {
      return 0;
    }

    let netChange = 0;
    for (const movement of movements) {
      netChange += movement.quantityChange;
    }

    return netChange;
  }

  /**
   * Validates that a set of movements for a product are balanced (net change = 0).
   * 
   * This is useful for validating compensating movements.
   * 
   * @param movements - List of movements to validate
   * @param productId - Product ID to filter by
   * @returns True if movements are balanced
   */
  validateMovementsAreBalanced(
    movements: StockMovement[],
    productId: string
  ): boolean {
    if (!productId || productId.trim().length === 0) {
      throw new Error('Product ID is required');
    }

    const productMovements = movements.filter(m => m.productId === productId);
    const netChange = this.calculateNetQuantityChange(productMovements);
    return netChange === 0;
  }

  /**
   * Validates that a movement can be created for a product.
   * 
   * @param product - The product to check
   * @returns True if product can have movements
   */
  canCreateMovementForProduct(product: Product): boolean {
    if (!product) {
      throw new Error('Product entity is required');
    }

    return product.stockTracked;
  }

  /**
   * Validates multiple movements for legality.
   * 
   * @param movements - List of movements to validate
   * @param products - Map of product ID to Product entity
   * @param availableStockMap - Map of product ID to available stock
   * @returns Map of movement ID to validation result
   */
  validateMultipleMovements(
    movements: StockMovement[],
    products: Map<string, Product>,
    availableStockMap?: Map<string, number>
  ): Map<string, MovementValidationResult> {
    const results = new Map<string, MovementValidationResult>();

    for (const movement of movements) {
      const product = products.get(movement.productId);
      if (!product) {
        results.set(movement.id, {
          isValid: false,
          errors: [`Product ${movement.productId} not found`],
          warnings: [],
        });
        continue;
      }

      const availableStock = availableStockMap?.get(movement.productId);
      const result = this.validateMovementLegality(movement, product, availableStock);
      results.set(movement.id, result);
    }

    return results;
  }

  /**
   * Checks if a movement is a correction (compensating movement).
   * 
   * This is a heuristic check based on the movement reason and reference ID.
   * 
   * @param movement - The movement to check
   * @returns True if movement appears to be a correction
   */
  isCorrectionMovement(movement: StockMovement): boolean {
    if (!movement) {
      throw new Error('StockMovement entity is required');
    }

    // Adjustments are often corrections
    if (movement.reason === StockMovementReason.ADJUSTMENT) {
      return true;
    }

    // Movements with reference IDs might be corrections
    if (movement.hasReference()) {
      return true;
    }

    return false;
  }

  /**
   * Validates that movements in a transaction are consistent.
   * 
   * Business Rule: Transactions creating multiple StockMovements must be atomic to preserve consistency
   * 
   * This validates that all movements in a set are for valid products and locations.
   * 
   * @param movements - List of movements in the transaction
   * @param products - Map of product ID to Product entity
   * @returns Validation result
   */
  validateTransactionMovements(
    movements: StockMovement[],
    products: Map<string, Product>
  ): MovementValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!movements || movements.length === 0) {
      errors.push('Transaction must contain at least one stock movement');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Validate each movement
    for (const movement of movements) {
      const product = products.get(movement.productId);
      if (!product) {
        errors.push(
          `Movement ${movement.id} references product ${movement.productId} that does not exist`
        );
        continue;
      }

      const movementValidation = this.validateMovementLegality(movement, product);
      if (!movementValidation.isValid) {
        errors.push(...movementValidation.errors.map(e => `Movement ${movement.id}: ${e}`));
      }
      warnings.push(...movementValidation.warnings.map(w => `Movement ${movement.id}: ${w}`));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

