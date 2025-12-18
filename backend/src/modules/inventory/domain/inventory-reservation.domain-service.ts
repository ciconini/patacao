/**
 * InventoryReservationDomainService
 *
 * Domain service responsible for creating and releasing inventory reservations.
 * This service manages the lifecycle of inventory reservations for appointments,
 * validates expiration rules, and enforces override permissions conceptually.
 *
 * Responsibilities:
 * - Create inventory reservations for appointments
 * - Release inventory reservations
 * - Validate expiration rules
 * - Enforce override permissions conceptually (no auth logic)
 * - Validate reservation creation constraints
 *
 * Collaborating Entities:
 * - InventoryReservation: The reservation entity being created or released
 * - Product: Provides product information and stock tracking status
 * - Appointment: The appointment that requires inventory reservation
 *
 * Business Rules Enforced:
 * - BR: Reservation reduces available stock for other operations but final decrement happens at sale completion
 * - BR: Manager can override reservation failures (conceptually enforced via override flag)
 * - BR: If `consumes_inventory` is true, Inventory reservation and decrement rules apply (reserve at confirmation, decrement at sale completion)
 * - BR: Only stock-tracked products can have reservations
 * - BR: Expired reservations should be released
 * - BR: Reservation quantity must be positive
 * - BR: Reservation must be linked to a Product and Appointment/Order
 *
 * Invariants:
 * - Product must have stock tracking enabled for reservations
 * - Reservation quantity must be positive
 * - Available stock must be sufficient (unless override is allowed)
 * - Expiration date must be in the future (if provided)
 * - Appointment must exist and be valid
 *
 * Edge Cases:
 * - Product with stock_tracked = false (cannot create reservation)
 * - Insufficient available stock (requires override)
 * - Expired reservations (should be released)
 * - Reservation for cancelled appointment (should be released)
 * - Multiple reservations for same product/appointment
 * - Reservation expiration before appointment date
 * - Negative available stock scenarios
 */

import { InventoryReservation } from './inventory-reservation.entity';
import { Product } from './product.entity';
import { Appointment, AppointmentStatus } from '../../services/domain/appointment.entity';

export interface ReservationCreationResult {
  canCreate: boolean;
  reservation?: InventoryReservation;
  errors: string[];
  warnings: string[];
  requiresOverride: boolean;
}

export interface ReservationReleaseResult {
  released: boolean;
  errors: string[];
  warnings: string[];
}

export class InventoryReservationDomainService {
  /**
   * Creates an inventory reservation for an appointment.
   *
   * This method validates that the reservation can be created, considering:
   * - Product stock tracking status
   * - Available stock levels
   * - Expiration rules
   * - Override permissions
   *
   * Business Rule: Only stock-tracked products can have reservations
   * Business Rule: Reservation reduces available stock for other operations
   *
   * @param id - Unique identifier for the reservation
   * @param product - Product to reserve
   * @param quantity - Quantity to reserve
   * @param appointment - Appointment this reservation is for
   * @param availableStock - Current available stock (current stock - active reservations)
   * @param expiresAt - Optional expiration date for the reservation
   * @param allowOverride - Whether manager override is allowed (conceptual permission)
   * @param referenceDate - Date to validate expiration against (defaults to now)
   * @returns Reservation creation result with validation details
   */
  createReservationForAppointment(
    id: string,
    product: Product,
    quantity: number,
    appointment: Appointment,
    availableStock: number,
    expiresAt?: Date,
    allowOverride: boolean = false,
    referenceDate: Date = new Date(),
  ): ReservationCreationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let requiresOverride = false;

    // Validate product stock tracking
    if (!product.stockTracked) {
      errors.push(
        `Product ${product.name} (${product.sku}) is not stock-tracked. ` +
          `Reservations can only be created for stock-tracked products.`,
      );
      return {
        canCreate: false,
        errors,
        warnings,
        requiresOverride: false,
      };
    }

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity <= 0) {
      errors.push('Reservation quantity must be a positive integer');
      return {
        canCreate: false,
        errors,
        warnings,
        requiresOverride: false,
      };
    }

    // Validate available stock
    if (availableStock < quantity) {
      const shortfall = quantity - availableStock;
      if (allowOverride) {
        requiresOverride = true;
        warnings.push(
          `Insufficient available stock. Requested: ${quantity}, Available: ${availableStock}, ` +
            `Shortfall: ${shortfall}. Override is allowed.`,
        );
      } else {
        errors.push(
          `Insufficient available stock. Requested: ${quantity}, Available: ${availableStock}, ` +
            `Shortfall: ${shortfall}. Manager override required.`,
        );
        return {
          canCreate: false,
          errors,
          warnings,
          requiresOverride: true,
        };
      }
    }

    // Validate expiration date if provided
    if (expiresAt) {
      const expirationValidation = this.validateExpirationDate(
        expiresAt,
        appointment,
        referenceDate,
      );
      errors.push(...expirationValidation.errors);
      warnings.push(...expirationValidation.warnings);
    }

    // If there are errors (and no override), cannot create
    if (errors.length > 0 && !allowOverride) {
      return {
        canCreate: false,
        errors,
        warnings,
        requiresOverride: requiresOverride || errors.length > 0,
      };
    }

    // Create the reservation
    const reservation = new InventoryReservation(
      id,
      product.id,
      quantity,
      appointment.id,
      expiresAt,
      referenceDate,
    );

    return {
      canCreate: true,
      reservation,
      errors: [],
      warnings,
      requiresOverride,
    };
  }

  /**
   * Creates multiple reservations for an appointment (for services with multiple consumed items).
   *
   * @param reservations - Array of reservation creation parameters
   * @param appointment - Appointment these reservations are for
   * @param availableStockMap - Map of product ID to available stock
   * @param products - Map of product ID to Product entity
   * @param allowOverride - Whether manager override is allowed
   * @param referenceDate - Date to validate against
   * @returns Map of product ID to reservation creation result
   */
  createMultipleReservationsForAppointment(
    reservations: Array<{ id: string; productId: string; quantity: number; expiresAt?: Date }>,
    appointment: Appointment,
    availableStockMap: Map<string, number>,
    products: Map<string, Product>,
    allowOverride: boolean = false,
    referenceDate: Date = new Date(),
  ): Map<string, ReservationCreationResult> {
    const results = new Map<string, ReservationCreationResult>();

    for (const reservationData of reservations) {
      const product = products.get(reservationData.productId);
      if (!product) {
        results.set(reservationData.productId, {
          canCreate: false,
          errors: [`Product ${reservationData.productId} not found`],
          warnings: [],
          requiresOverride: false,
        });
        continue;
      }

      const availableStock = availableStockMap.get(reservationData.productId) || 0;
      const result = this.createReservationForAppointment(
        reservationData.id,
        product,
        reservationData.quantity,
        appointment,
        availableStock,
        reservationData.expiresAt,
        allowOverride,
        referenceDate,
      );

      results.set(reservationData.productId, result);
    }

    return results;
  }

  /**
   * Releases an inventory reservation.
   *
   * Business Rule: Expired reservations should be released
   *
   * @param reservation - Reservation to release
   * @param appointment - Appointment the reservation is for
   * @param referenceDate - Date to check against (defaults to now)
   * @returns Reservation release result
   */
  releaseReservation(
    reservation: InventoryReservation,
    appointment: Appointment | undefined,
    referenceDate: Date = new Date(),
  ): ReservationReleaseResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate reservation is for the appointment
    if (appointment && reservation.reservedFor !== appointment.id) {
      errors.push(`Reservation ${reservation.id} is not for appointment ${appointment.id}`);
      return {
        released: false,
        errors,
        warnings,
      };
    }

    // Check if already expired
    if (reservation.isExpired(referenceDate)) {
      warnings.push(
        `Reservation ${reservation.id} is already expired and should have been released earlier`,
      );
    }

    // Check if appointment is cancelled or completed
    if (appointment) {
      if (appointment.status === AppointmentStatus.CANCELLED) {
        warnings.push(
          `Appointment ${appointment.id} is cancelled. Reservation should be released.`,
        );
      } else if (appointment.status === AppointmentStatus.COMPLETED) {
        warnings.push(
          `Appointment ${appointment.id} is completed. Reservation should be converted to stock decrement.`,
        );
      }
    }

    return {
      released: true,
      errors,
      warnings,
    };
  }

  /**
   * Releases multiple reservations.
   *
   * @param reservations - List of reservations to release
   * @param appointment - Appointment these reservations are for
   * @param referenceDate - Date to check against
   * @returns Map of reservation ID to release result
   */
  releaseMultipleReservations(
    reservations: InventoryReservation[],
    appointment: Appointment | undefined,
    referenceDate: Date = new Date(),
  ): Map<string, ReservationReleaseResult> {
    const results = new Map<string, ReservationReleaseResult>();

    for (const reservation of reservations) {
      const result = this.releaseReservation(reservation, appointment, referenceDate);
      results.set(reservation.id, result);
    }

    return results;
  }

  /**
   * Validates expiration date rules for a reservation.
   *
   * Business Rule: Expired reservations should be released
   *
   * @param expiresAt - Expiration date to validate
   * @param appointment - Appointment the reservation is for
   * @param referenceDate - Date to validate against
   * @returns Validation result with errors and warnings
   */
  validateExpirationDate(
    expiresAt: Date,
    appointment: Appointment,
    referenceDate: Date = new Date(),
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Expiration date must be in the future
    if (expiresAt <= referenceDate) {
      errors.push(
        `Expiration date ${expiresAt.toISOString()} must be in the future. ` +
          `Reference date: ${referenceDate.toISOString()}`,
      );
    }

    // Expiration date should not be before appointment start
    if (expiresAt < appointment.startAt) {
      warnings.push(
        `Expiration date ${expiresAt.toISOString()} is before appointment start time ` +
          `${appointment.startAt.toISOString()}. Reservation may expire before appointment.`,
      );
    }

    // Expiration date should not be before appointment end
    if (expiresAt < appointment.endAt) {
      warnings.push(
        `Expiration date ${expiresAt.toISOString()} is before appointment end time ` +
          `${appointment.endAt.toISOString()}. Reservation may expire during appointment.`,
      );
    }

    return { errors, warnings };
  }

  /**
   * Calculates a suggested expiration date for a reservation based on appointment.
   *
   * Common pattern: Reservation expires after appointment end time plus a buffer.
   *
   * @param appointment - Appointment the reservation is for
   * @param bufferHours - Hours to add after appointment end (default 24)
   * @returns Suggested expiration date
   */
  calculateSuggestedExpirationDate(appointment: Appointment, bufferHours: number = 24): Date {
    const expirationDate = new Date(appointment.endAt);
    expirationDate.setHours(expirationDate.getHours() + bufferHours);
    return expirationDate;
  }

  /**
   * Checks if a reservation should be released based on expiration or appointment status.
   *
   * Business Rule: Expired reservations should be released
   *
   * @param reservation - Reservation to check
   * @param appointment - Appointment the reservation is for
   * @param referenceDate - Date to check against
   * @returns True if reservation should be released
   */
  shouldReleaseReservation(
    reservation: InventoryReservation,
    appointment: Appointment | undefined,
    referenceDate: Date = new Date(),
  ): boolean {
    // Release if expired
    if (reservation.isExpired(referenceDate)) {
      return true;
    }

    // Release if appointment is cancelled
    if (appointment && appointment.status === AppointmentStatus.CANCELLED) {
      return true;
    }

    // Note: Completed appointments should convert reservation to decrement, not release
    // This is handled at use case level

    return false;
  }

  /**
   * Validates that a reservation can be created considering all constraints.
   *
   * This is a convenience method that performs all validations without creating the reservation.
   *
   * @param product - Product to reserve
   * @param quantity - Quantity to reserve
   * @param appointment - Appointment this reservation is for
   * @param availableStock - Current available stock
   * @param expiresAt - Optional expiration date
   * @param referenceDate - Date to validate against
   * @returns Validation result
   */
  validateReservationCreation(
    product: Product,
    quantity: number,
    appointment: Appointment,
    availableStock: number,
    expiresAt?: Date,
    referenceDate: Date = new Date(),
  ): ReservationCreationResult {
    return this.createReservationForAppointment(
      'temp-id', // Temporary ID for validation
      product,
      quantity,
      appointment,
      availableStock,
      expiresAt,
      false, // No override for validation
      referenceDate,
    );
  }

  /**
   * Checks if a product can have reservations created.
   *
   * Business Rule: Only stock-tracked products can have reservations
   *
   * @param product - Product to check
   * @returns True if product can have reservations
   */
  canCreateReservationForProduct(product: Product): boolean {
    return product.stockTracked;
  }

  /**
   * Gets all reservations that should be released (expired or for cancelled appointments).
   *
   * @param reservations - List of reservations to check
   * @param appointmentMap - Map of appointment ID to Appointment entity
   * @param referenceDate - Date to check against
   * @returns List of reservations that should be released
   */
  getReservationsToRelease(
    reservations: InventoryReservation[],
    appointmentMap: Map<string, Appointment>,
    referenceDate: Date = new Date(),
  ): InventoryReservation[] {
    const toRelease: InventoryReservation[] = [];

    for (const reservation of reservations) {
      const appointment = appointmentMap.get(reservation.reservedFor);
      if (this.shouldReleaseReservation(reservation, appointment, referenceDate)) {
        toRelease.push(reservation);
      }
    }

    return toRelease;
  }

  /**
   * Validates that override is required for a reservation creation.
   *
   * @param product - Product to reserve
   * @param quantity - Quantity to reserve
   * @param availableStock - Current available stock
   * @returns True if override is required
   */
  requiresOverrideForReservation(
    product: Product,
    quantity: number,
    availableStock: number,
  ): boolean {
    if (!product.stockTracked) {
      return false; // Cannot create reservation, override not applicable
    }

    if (quantity <= 0) {
      return false; // Invalid quantity, override not applicable
    }

    return availableStock < quantity;
  }
}
