/**
 * InventoryAvailabilityDomainService
 *
 * Domain service responsible for validating inventory availability for services.
 * This service checks if products required by services are available in stock,
 * respecting reservations and handling both stock-tracked and non-tracked products.
 *
 * Responsibilities:
 * - Validate inventory availability for services
 * - Respect active reservations (reduce available stock)
 * - Handle stock_tracked and non-tracked products
 * - Calculate available stock considering reservations
 * - Provide detailed availability information
 *
 * Collaborating Entities:
 * - Product: Provides product information and stock tracking status
 * - InventoryReservation: Represents reserved quantities that reduce available stock
 * - Service: Provides consumed items that need to be checked for availability
 *
 * Business Rules Enforced:
 * - BR: If `stock_tracked` is true, reservations and decrements apply
 * - BR: Reservation reduces available stock for other operations but final decrement happens at sale completion
 * - BR: Sales can include Product line items; if `stock_tracked` is true, reservations and decrements apply
 * - BR: Expired reservations do not reduce available stock
 * - BR: Non-tracked products are always considered available
 * - BR: Available stock = current stock - active reserved quantity
 *
 * Invariants:
 * - Current stock levels must be non-negative
 * - Reserved quantities must be non-negative
 * - Service consumed items must reference valid products
 * - Only active (non-expired) reservations reduce available stock
 *
 * Edge Cases:
 * - Product with stock_tracked = false (always available)
 * - Product with no current stock but has reservations
 * - Expired reservations (should not count against availability)
 * - Multiple reservations for the same product
 * - Service with no consumed items (always available)
 * - Service consuming products that don't exist
 * - Negative available stock (should be reported as unavailable)
 * - Reservation for different appointment/order (should still reduce availability)
 */

import { Product } from './product.entity';
import { InventoryReservation } from './inventory-reservation.entity';
import { Service } from '../../services/domain/service.entity';

export interface ProductAvailability {
  productId: string;
  productName: string;
  isStockTracked: boolean;
  currentStock: number;
  reservedQuantity: number;
  availableStock: number;
  isAvailable: boolean;
  requiredQuantity: number;
  shortfall: number; // Negative if available, positive if shortfall
}

export interface ServiceAvailabilityResult {
  serviceId: string;
  serviceName: string;
  isAvailable: boolean;
  productAvailabilities: ProductAvailability[];
  unavailableProducts: ProductAvailability[];
  canFulfill: boolean;
}

export class InventoryAvailabilityDomainService {
  /**
   * Validates if a service can be fulfilled based on inventory availability.
   *
   * This method checks all consumed items of the service against available stock,
   * respecting reservations and stock tracking settings.
   *
   * Business Rule: If `stock_tracked` is true, reservations and decrements apply.
   *
   * @param service - The service to check availability for
   * @param products - Map of product ID to Product entity
   * @param currentStockLevels - Map of product ID to current stock quantity
   * @param reservations - List of active reservations (expired reservations should be filtered out)
   * @param referenceDate - Date to check reservation expiry against (defaults to now)
   * @returns Service availability result with detailed information
   * @throws Error if service is not provided
   */
  validateServiceAvailability(
    service: Service,
    products: Map<string, Product>,
    currentStockLevels: Map<string, number>,
    reservations: InventoryReservation[],
    referenceDate: Date = new Date(),
  ): ServiceAvailabilityResult {
    if (!service) {
      throw new Error('Service entity is required');
    }

    // If service doesn't consume inventory, it's always available
    if (!service.consumesInventory || service.consumedItems.length === 0) {
      return {
        serviceId: service.id,
        serviceName: service.name,
        isAvailable: true,
        productAvailabilities: [],
        unavailableProducts: [],
        canFulfill: true,
      };
    }

    const productAvailabilities: ProductAvailability[] = [];
    const unavailableProducts: ProductAvailability[] = [];

    // Check each consumed item
    for (const consumedItem of service.consumedItems) {
      const product = products.get(consumedItem.productId);

      if (!product) {
        // Product not found - treat as unavailable
        productAvailabilities.push({
          productId: consumedItem.productId,
          productName: 'Unknown Product',
          isStockTracked: false,
          currentStock: 0,
          reservedQuantity: 0,
          availableStock: 0,
          isAvailable: false,
          requiredQuantity: consumedItem.quantity,
          shortfall: consumedItem.quantity,
        });
        unavailableProducts.push(productAvailabilities[productAvailabilities.length - 1]);
        continue;
      }

      // Calculate availability for this product
      const availability = this.calculateProductAvailability(
        product,
        consumedItem.quantity,
        currentStockLevels.get(product.id) || 0,
        reservations,
        referenceDate,
      );

      productAvailabilities.push(availability);

      if (!availability.isAvailable) {
        unavailableProducts.push(availability);
      }
    }

    const canFulfill = unavailableProducts.length === 0;

    return {
      serviceId: service.id,
      serviceName: service.name,
      isAvailable: canFulfill,
      productAvailabilities,
      unavailableProducts,
      canFulfill,
    };
  }

  /**
   * Calculates availability for a single product considering reservations.
   *
   * Business Rule: Available stock = current stock - active reserved quantity
   * Business Rule: Expired reservations do not reduce available stock
   * Business Rule: Non-tracked products are always considered available
   *
   * @param product - The product to check
   * @param requiredQuantity - Quantity required
   * @param currentStock - Current stock level for the product
   * @param reservations - List of all reservations (will filter for this product and active ones)
   * @param referenceDate - Date to check reservation expiry against
   * @returns Product availability information
   */
  calculateProductAvailability(
    product: Product,
    requiredQuantity: number,
    currentStock: number,
    reservations: InventoryReservation[],
    referenceDate: Date = new Date(),
  ): ProductAvailability {
    if (!product) {
      throw new Error('Product entity is required');
    }

    if (requiredQuantity <= 0) {
      throw new Error('Required quantity must be positive');
    }

    if (currentStock < 0) {
      throw new Error('Current stock cannot be negative');
    }

    // Non-tracked products are always available
    if (!product.stockTracked) {
      return {
        productId: product.id,
        productName: product.name,
        isStockTracked: false,
        currentStock,
        reservedQuantity: 0,
        availableStock: Infinity, // Non-tracked products have unlimited availability
        isAvailable: true,
        requiredQuantity,
        shortfall: 0,
      };
    }

    // Calculate reserved quantity for this product (only active reservations)
    const reservedQuantity = this.calculateReservedQuantity(
      product.id,
      reservations,
      referenceDate,
    );

    // Available stock = current stock - reserved quantity
    const availableStock = Math.max(0, currentStock - reservedQuantity);

    // Check if required quantity is available
    const isAvailable = availableStock >= requiredQuantity;
    const shortfall = isAvailable ? 0 : requiredQuantity - availableStock;

    return {
      productId: product.id,
      productName: product.name,
      isStockTracked: true,
      currentStock,
      reservedQuantity,
      availableStock,
      isAvailable,
      requiredQuantity,
      shortfall,
    };
  }

  /**
   * Calculates the total reserved quantity for a product from active reservations.
   *
   * Business Rule: Only active (non-expired) reservations reduce available stock
   *
   * @param productId - Product ID to calculate reserved quantity for
   * @param reservations - List of all reservations
   * @param referenceDate - Date to check reservation expiry against
   * @returns Total reserved quantity for the product
   */
  calculateReservedQuantity(
    productId: string,
    reservations: InventoryReservation[],
    referenceDate: Date = new Date(),
  ): number {
    if (!productId || productId.trim().length === 0) {
      throw new Error('Product ID is required');
    }

    let totalReserved = 0;

    for (const reservation of reservations) {
      // Only count reservations for this product
      if (reservation.productId !== productId) {
        continue;
      }

      // Only count active (non-expired) reservations
      if (reservation.isActive(referenceDate)) {
        totalReserved += reservation.quantity;
      }
    }

    return totalReserved;
  }

  /**
   * Checks if a specific quantity of a product is available.
   *
   * @param product - The product to check
   * @param requiredQuantity - Quantity required
   * @param currentStock - Current stock level
   * @param reservations - List of reservations
   * @param referenceDate - Date to check reservation expiry against
   * @returns True if the required quantity is available
   */
  isProductAvailable(
    product: Product,
    requiredQuantity: number,
    currentStock: number,
    reservations: InventoryReservation[],
    referenceDate: Date = new Date(),
  ): boolean {
    const availability = this.calculateProductAvailability(
      product,
      requiredQuantity,
      currentStock,
      reservations,
      referenceDate,
    );

    return availability.isAvailable;
  }

  /**
   * Validates availability for multiple services.
   *
   * @param services - List of services to check
   * @param products - Map of product ID to Product entity
   * @param currentStockLevels - Map of product ID to current stock quantity
   * @param reservations - List of active reservations
   * @param referenceDate - Date to check reservation expiry against
   * @returns Map of service ID to availability result
   */
  validateMultipleServicesAvailability(
    services: Service[],
    products: Map<string, Product>,
    currentStockLevels: Map<string, number>,
    reservations: InventoryReservation[],
    referenceDate: Date = new Date(),
  ): Map<string, ServiceAvailabilityResult> {
    const results = new Map<string, ServiceAvailabilityResult>();

    for (const service of services) {
      const result = this.validateServiceAvailability(
        service,
        products,
        currentStockLevels,
        reservations,
        referenceDate,
      );
      results.set(service.id, result);
    }

    return results;
  }

  /**
   * Gets the total reserved quantity across all products.
   *
   * @param reservations - List of reservations
   * @param referenceDate - Date to check reservation expiry against
   * @returns Map of product ID to total reserved quantity
   */
  getTotalReservedQuantities(
    reservations: InventoryReservation[],
    referenceDate: Date = new Date(),
  ): Map<string, number> {
    const reservedQuantities = new Map<string, number>();

    for (const reservation of reservations) {
      // Only count active reservations
      if (!reservation.isActive(referenceDate)) {
        continue;
      }

      const current = reservedQuantities.get(reservation.productId) || 0;
      reservedQuantities.set(reservation.productId, current + reservation.quantity);
    }

    return reservedQuantities;
  }

  /**
   * Calculates available stock for a product considering reservations.
   *
   * This is a convenience method that combines current stock and reserved quantity.
   *
   * @param product - The product
   * @param currentStock - Current stock level
   * @param reservations - List of reservations
   * @param referenceDate - Date to check reservation expiry against
   * @returns Available stock (current stock - reserved quantity, minimum 0)
   */
  calculateAvailableStock(
    product: Product,
    currentStock: number,
    reservations: InventoryReservation[],
    referenceDate: Date = new Date(),
  ): number {
    if (!product.stockTracked) {
      return Infinity; // Non-tracked products have unlimited availability
    }

    const reservedQuantity = this.calculateReservedQuantity(
      product.id,
      reservations,
      referenceDate,
    );

    return Math.max(0, currentStock - reservedQuantity);
  }

  /**
   * Filters reservations to only include active (non-expired) ones.
   *
   * @param reservations - List of reservations
   * @param referenceDate - Date to check expiry against
   * @returns List of active reservations
   */
  getActiveReservations(
    reservations: InventoryReservation[],
    referenceDate: Date = new Date(),
  ): InventoryReservation[] {
    return reservations.filter((reservation) => reservation.isActive(referenceDate));
  }

  /**
   * Filters reservations to only include expired ones.
   *
   * @param reservations - List of reservations
   * @param referenceDate - Date to check expiry against
   * @returns List of expired reservations
   */
  getExpiredReservations(
    reservations: InventoryReservation[],
    referenceDate: Date = new Date(),
  ): InventoryReservation[] {
    return reservations.filter((reservation) => reservation.isExpired(referenceDate));
  }

  /**
   * Gets reservations for a specific product.
   *
   * @param productId - Product ID
   * @param reservations - List of reservations
   * @returns List of reservations for the product
   */
  getReservationsForProduct(
    productId: string,
    reservations: InventoryReservation[],
  ): InventoryReservation[] {
    if (!productId || productId.trim().length === 0) {
      throw new Error('Product ID is required');
    }

    return reservations.filter((reservation) => reservation.productId === productId);
  }

  /**
   * Gets active reservations for a specific product.
   *
   * @param productId - Product ID
   * @param reservations - List of reservations
   * @param referenceDate - Date to check expiry against
   * @returns List of active reservations for the product
   */
  getActiveReservationsForProduct(
    productId: string,
    reservations: InventoryReservation[],
    referenceDate: Date = new Date(),
  ): InventoryReservation[] {
    const productReservations = this.getReservationsForProduct(productId, reservations);
    return this.getActiveReservations(productReservations, referenceDate);
  }
}
