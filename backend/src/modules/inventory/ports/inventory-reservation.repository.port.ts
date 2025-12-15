/**
 * InventoryReservationRepository Port (Interface)
 * 
 * Repository interface for InventoryReservation domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 * 
 * Implementations should be provided in the Infrastructure layer.
 */

import { InventoryReservation } from '../domain/inventory-reservation.entity';

export interface InventoryReservationRepository {
  /**
   * Saves an InventoryReservation entity (creates or updates)
   * 
   * @param reservation - InventoryReservation domain entity to save
   * @returns Saved InventoryReservation entity
   */
  save(reservation: InventoryReservation): Promise<InventoryReservation>;

  /**
   * Updates an existing InventoryReservation entity
   * 
   * @param reservation - InventoryReservation domain entity to update
   * @returns Updated InventoryReservation entity
   */
  update(reservation: InventoryReservation): Promise<InventoryReservation>;

  /**
   * Finds an InventoryReservation by ID
   * 
   * @param id - InventoryReservation ID
   * @returns InventoryReservation entity or null if not found
   */
  findById(id: string): Promise<InventoryReservation | null>;

  /**
   * Finds all InventoryReservations for a product
   * 
   * @param productId - Product ID
   * @returns Array of InventoryReservation entities
   */
  findByProduct(productId: string): Promise<InventoryReservation[]>;

  /**
   * Finds all InventoryReservations for an appointment
   * 
   * @param appointmentId - Appointment ID
   * @returns Array of InventoryReservation entities
   */
  findByAppointmentId(appointmentId: string): Promise<InventoryReservation[]>;

  /**
   * Deletes an InventoryReservation
   * 
   * @param id - InventoryReservation ID
   */
  delete(id: string): Promise<void>;
}

