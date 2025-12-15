/**
 * AppointmentServiceLineRepository Port (Interface)
 * 
 * Repository interface for AppointmentServiceLine domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 * 
 * Implementations should be provided in the Infrastructure layer.
 */

import { AppointmentServiceLine } from '../domain/appointment-service-line.entity';

export interface AppointmentServiceLineRepository {
  /**
   * Saves multiple AppointmentServiceLine entities for an appointment
   * 
   * @param appointmentId - Appointment ID
   * @param lines - Array of AppointmentServiceLine entities to save
   * @returns Array of saved AppointmentServiceLine entities
   */
  saveLines(appointmentId: string, lines: AppointmentServiceLine[]): Promise<AppointmentServiceLine[]>;

  /**
   * Finds all AppointmentServiceLine entities for an appointment
   * 
   * @param appointmentId - Appointment ID
   * @returns Array of AppointmentServiceLine entities (with minimal fields)
   */
  findByAppointmentId(appointmentId: string): Promise<Array<{
    serviceId: string;
    quantity: number;
  }>>;
}

