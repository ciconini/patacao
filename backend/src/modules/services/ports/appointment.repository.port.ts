/**
 * AppointmentRepository Port (Interface)
 * 
 * Repository interface for Appointment domain entity persistence.
 * This is a port in the Hexagonal Architecture pattern.
 * 
 * Implementations should be provided in the Infrastructure layer.
 */

import { Appointment } from '../domain/appointment.entity';

// Search criteria for appointment search
export interface AppointmentSearchCriteria {
  storeId?: string;
  customerId?: string;
  petId?: string;
  staffId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

// Pagination model
export interface Pagination {
  page: number;
  perPage: number;
}

// Sort model
export interface Sort {
  field: string;
  direction: 'asc' | 'desc';
}

// Paginated result model
export interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Conflict search parameters
export interface ConflictSearchParams {
  storeId: string;
  staffId?: string;
  startAt: Date;
  endAt: Date;
  excludeId?: string;
}

export interface AppointmentRepository {
  /**
   * Saves an Appointment entity (creates or updates)
   * 
   * @param appointment - Appointment domain entity to save
   * @returns Saved Appointment entity
   */
  save(appointment: Appointment): Promise<Appointment>;

  /**
   * Updates an existing Appointment entity
   * 
   * @param appointment - Appointment domain entity to update
   * @returns Updated Appointment entity
   */
  update(appointment: Appointment): Promise<Appointment>;

  /**
   * Finds an Appointment by ID
   * 
   * @param id - Appointment ID
   * @returns Appointment entity or null if not found
   */
  findById(id: string): Promise<Appointment | null>;

  /**
   * Searches for appointments with pagination
   * 
   * @param criteria - Search criteria
   * @param pagination - Pagination parameters
   * @param sort - Sort parameters
   * @returns Paginated result of appointments
   */
  search(
    criteria: AppointmentSearchCriteria,
    pagination: Pagination,
    sort: Sort
  ): Promise<PaginatedResult<Appointment>>;

  /**
   * Finds conflicting appointments (overlapping time slots)
   * 
   * @param params - Conflict search parameters
   * @returns Array of conflicting appointments
   */
  findConflicts(params: ConflictSearchParams): Promise<Appointment[]>;
}

