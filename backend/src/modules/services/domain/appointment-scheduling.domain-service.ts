/**
 * AppointmentSchedulingDomainService
 *
 * Domain service responsible for validating appointment scheduling rules.
 * This service enforces business rules related to appointment scheduling without
 * depending on infrastructure, repositories, or time providers.
 *
 * Responsibilities:
 * - Validate appointment time against Store opening hours
 * - Validate assigned staff working hours
 * - Prevent double booking of staff and pet
 * - Handle recurring appointment validation
 *
 * Collaborating Entities:
 * - Appointment: The appointment being validated
 * - Store: Provides opening hours for validation
 * - User: Provides staff working hours when staff is assigned
 * - Pet: Used for pet double-booking validation
 *
 * Business Rules Enforced:
 * - BR: Appointment must fall within Store opening hours
 * - BR: If staff is assigned, appointment must fall within staff working hours
 * - BR: Staff cannot be double-booked (same staff, same time, same store)
 * - BR: Pet cannot be double-booked (same pet, overlapping times)
 * - BR: Staff working hours must be within Store opening hours
 * - BR: Recurring appointments must have valid recurrence_id and follow same rules
 *
 * Invariants:
 * - Store must have opening hours defined
 * - If staff is assigned, staff must have working hours defined
 * - Staff must be assigned to the store
 * - Pet must belong to the customer
 *
 * Edge Cases:
 * - Store closed on appointment day
 * - Staff not available on appointment day
 * - Staff not assigned to store
 * - Appointment spanning multiple days
 * - Recurring appointments with different stores/staff
 * - Cancelled/completed appointments should not block scheduling
 */

import { Appointment } from './appointment.entity';
import { Store } from '../../administrative/domain/store.entity';
import { User } from '../../users/domain/user.entity';
import { Pet } from '../../administrative/domain/pet.entity';

export interface SchedulingValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class AppointmentSchedulingDomainService {
  /**
   * Validates if an appointment can be scheduled with the given constraints.
   *
   * This method performs comprehensive validation including:
   * - Store opening hours validation
   * - Staff working hours validation (if staff assigned)
   * - Double-booking prevention for staff
   * - Double-booking prevention for pet
   *
   * @param appointment - The appointment to validate
   * @param store - The store where the appointment takes place
   * @param staff - The assigned staff member (optional)
   * @param pet - The pet for the appointment
   * @param existingAppointments - List of existing appointments to check for conflicts
   * @returns Validation result with errors and warnings
   */
  validateAppointmentScheduling(
    appointment: Appointment,
    store: Store,
    pet: Pet,
    staff: User | undefined,
    existingAppointments: Appointment[],
  ): SchedulingValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate store opening hours
    const storeValidation = this.validateStoreOpeningHours(appointment, store);
    errors.push(...storeValidation.errors);
    warnings.push(...storeValidation.warnings);

    // Validate staff working hours if staff is assigned
    if (appointment.staffId && staff) {
      const staffValidation = this.validateStaffWorkingHours(appointment, store, staff);
      errors.push(...staffValidation.errors);
      warnings.push(...staffValidation.warnings);
    } else if (appointment.staffId && !staff) {
      errors.push('Staff member is assigned but staff entity is not provided');
    }

    // Validate staff assignment to store
    if (appointment.staffId && staff) {
      const storeAssignmentValidation = this.validateStaffStoreAssignment(staff, store);
      errors.push(...storeAssignmentValidation.errors);
    }

    // Validate pet ownership
    const petValidation = this.validatePetOwnership(appointment, pet);
    errors.push(...petValidation.errors);

    // Check for double-booking conflicts
    const conflictValidation = this.validateNoDoubleBooking(appointment, existingAppointments);
    errors.push(...conflictValidation.errors);
    warnings.push(...conflictValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates if appointment time falls within store opening hours.
   *
   * Business Rule: Appointment must fall within Store opening hours.
   *
   * @param appointment - The appointment to validate
   * @param store - The store with opening hours
   * @returns Validation result
   */
  validateStoreOpeningHours(appointment: Appointment, store: Store): SchedulingValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const startAt = appointment.startAt;
    const endAt = appointment.endAt;

    // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayOfWeek = startAt.getDay();
    const dayName = this.getDayName(dayOfWeek);

    // Check if store is open on this day
    if (!store.isOpenOnDay(dayName as any)) {
      errors.push(`Store is closed on ${dayName}. Appointment cannot be scheduled.`);
      return { isValid: false, errors, warnings };
    }

    // Get opening hours for the day
    const dayHours = store.getDayOpeningHours(dayName as any);
    if (!dayHours || !dayHours.isOpen || !dayHours.openTime || !dayHours.closeTime) {
      errors.push(`Store opening hours are not defined for ${dayName}`);
      return { isValid: false, errors, warnings };
    }

    // Extract time from appointment dates (HH:mm format)
    const appointmentStartTime = this.formatTime(startAt);
    const appointmentEndTime = this.formatTime(endAt);

    // Check if appointment starts within opening hours
    if (!store.isOpenAtTime(dayName as any, appointmentStartTime)) {
      errors.push(
        `Appointment start time ${appointmentStartTime} is outside store opening hours ` +
          `(${dayHours.openTime} - ${dayHours.closeTime}) on ${dayName}`,
      );
    }

    // Check if appointment ends within opening hours
    if (!store.isOpenAtTime(dayName as any, appointmentEndTime)) {
      errors.push(
        `Appointment end time ${appointmentEndTime} is outside store opening hours ` +
          `(${dayHours.openTime} - ${dayHours.closeTime}) on ${dayName}`,
      );
    }

    // Check if entire appointment range is within opening hours
    if (
      !store.isTimeRangeWithinOpeningHours(dayName as any, appointmentStartTime, appointmentEndTime)
    ) {
      errors.push(
        `Appointment time range (${appointmentStartTime} - ${appointmentEndTime}) is not fully within ` +
          `store opening hours (${dayHours.openTime} - ${dayHours.closeTime}) on ${dayName}`,
      );
    }

    // Handle appointments spanning multiple days
    if (this.isSameDay(startAt, endAt) === false) {
      warnings.push(
        'Appointment spans multiple days. Only the start day opening hours are validated.',
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates if appointment time falls within staff working hours.
   *
   * Business Rule: If staff is assigned, appointment must fall within staff working hours.
   * Business Rule: Staff working hours must be within Store opening hours.
   *
   * @param appointment - The appointment to validate
   * @param store - The store (for cross-validation)
   * @param staff - The staff member with working hours
   * @returns Validation result
   */
  validateStaffWorkingHours(
    appointment: Appointment,
    store: Store,
    staff: User,
  ): SchedulingValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if staff has working hours defined
    const workingHours = staff.workingHours;
    if (!workingHours) {
      errors.push('Staff member does not have working hours defined');
      return { isValid: false, errors, warnings };
    }

    // Check if staff is active
    if (!staff.active) {
      errors.push('Staff member is not active');
      return { isValid: false, errors, warnings };
    }

    const startAt = appointment.startAt;
    const endAt = appointment.endAt;

    // Get day of week
    const dayOfWeek = startAt.getDay();
    const dayName = this.getDayName(dayOfWeek);

    // Check if staff is available on this day
    if (!staff.isAvailableOnDay(dayName as any)) {
      errors.push(`Staff member is not available on ${dayName}`);
      return { isValid: false, errors, warnings };
    }

    // Get working hours for the day
    const dayWorkingHours = staff.getDayWorkingHours(dayName as any);
    if (!dayWorkingHours || !dayWorkingHours.isAvailable) {
      errors.push(`Staff member working hours are not defined or not available for ${dayName}`);
      return { isValid: false, errors, warnings };
    }

    // Extract time from appointment dates
    const appointmentStartTime = this.formatTime(startAt);
    const appointmentEndTime = this.formatTime(endAt);

    // Check if appointment starts within working hours
    if (!staff.isAvailableAtTime(dayName as any, appointmentStartTime)) {
      errors.push(
        `Appointment start time ${appointmentStartTime} is outside staff working hours ` +
          `(${dayWorkingHours.startTime} - ${dayWorkingHours.endTime}) on ${dayName}`,
      );
    }

    // Check if appointment ends within working hours
    if (!staff.isAvailableAtTime(dayName as any, appointmentEndTime)) {
      errors.push(
        `Appointment end time ${appointmentEndTime} is outside staff working hours ` +
          `(${dayWorkingHours.startTime} - ${dayWorkingHours.endTime}) on ${dayName}`,
      );
    }

    // Check if entire appointment range is within working hours
    if (
      !staff.isTimeRangeWithinWorkingHours(dayName as any, appointmentStartTime, appointmentEndTime)
    ) {
      errors.push(
        `Appointment time range (${appointmentStartTime} - ${appointmentEndTime}) is not fully within ` +
          `staff working hours (${dayWorkingHours.startTime} - ${dayWorkingHours.endTime}) on ${dayName}`,
      );
    }

    // Cross-validate: Staff working hours should be within store opening hours
    const storeDayHours = store.getDayOpeningHours(dayName as any);
    if (
      storeDayHours &&
      storeDayHours.isOpen &&
      storeDayHours.openTime &&
      storeDayHours.closeTime
    ) {
      if (
        !store.isTimeRangeWithinOpeningHours(
          dayName as any,
          dayWorkingHours.startTime,
          dayWorkingHours.endTime,
        )
      ) {
        warnings.push(
          `Staff working hours (${dayWorkingHours.startTime} - ${dayWorkingHours.endTime}) extend ` +
            `beyond store opening hours (${storeDayHours.openTime} - ${storeDayHours.closeTime}) on ${dayName}`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates that staff is assigned to the store.
   *
   * @param staff - The staff member
   * @param store - The store
   * @returns Validation result
   */
  validateStaffStoreAssignment(staff: User, store: Store): SchedulingValidationResult {
    const errors: string[] = [];

    if (!staff.isAssignedToStore(store.id)) {
      errors.push(`Staff member is not assigned to store ${store.name}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Validates that the pet belongs to the customer in the appointment.
   *
   * @param appointment - The appointment
   * @param pet - The pet
   * @returns Validation result
   */
  validatePetOwnership(appointment: Appointment, pet: Pet): SchedulingValidationResult {
    const errors: string[] = [];

    if (pet.customerId !== appointment.customerId) {
      errors.push('Pet does not belong to the customer specified in the appointment');
    }

    if (pet.id !== appointment.petId) {
      errors.push('Pet ID does not match the appointment pet ID');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Validates that there are no double-booking conflicts.
   *
   * Business Rule: Staff cannot be double-booked (same staff, same time, same store).
   * Business Rule: Pet cannot be double-booked (same pet, overlapping times).
   *
   * Only active appointments (not cancelled or completed) are considered for conflicts.
   *
   * @param appointment - The appointment to validate
   * @param existingAppointments - List of existing appointments to check against
   * @returns Validation result
   */
  validateNoDoubleBooking(
    appointment: Appointment,
    existingAppointments: Appointment[],
  ): SchedulingValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Filter out cancelled and completed appointments (they don't block scheduling)
    const activeAppointments = existingAppointments.filter((apt) => apt.isActive());

    // Check for staff double-booking
    if (appointment.staffId) {
      const staffConflicts = activeAppointments.filter((existing) => {
        // Skip self (for updates)
        if (existing.id === appointment.id) {
          return false;
        }

        // Must be same staff
        if (existing.staffId !== appointment.staffId) {
          return false;
        }

        // Must be same store
        if (existing.storeId !== appointment.storeId) {
          return false;
        }

        // Check for time overlap
        return appointment.overlapsWith(existing);
      });

      if (staffConflicts.length > 0) {
        errors.push(
          `Staff member is already booked for an overlapping appointment. ` +
            `Conflicts with ${staffConflicts.length} existing appointment(s).`,
        );
      }
    }

    // Check for pet double-booking
    const petConflicts = activeAppointments.filter((existing) => {
      // Skip self (for updates)
      if (existing.id === appointment.id) {
        return false;
      }

      // Must be same pet
      if (existing.petId !== appointment.petId) {
        return false;
      }

      // Check for time overlap
      return appointment.overlapsWith(existing);
    });

    if (petConflicts.length > 0) {
      errors.push(
        `Pet is already booked for an overlapping appointment. ` +
          `Conflicts with ${petConflicts.length} existing appointment(s).`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates recurring appointment constraints.
   *
   * Business Rule: Recurring appointments must materialize as distinct Appointment instances
   * linked via recurrence_id. Each instance must follow the same validation rules.
   *
   * @param appointments - List of appointments in the recurrence group
   * @param store - The store
   * @param pet - The pet
   * @param staff - The staff member (optional)
   * @param allExistingAppointments - All existing appointments (including other recurrence groups)
   * @returns Validation result
   */
  validateRecurringAppointments(
    appointments: Appointment[],
    store: Store,
    pet: Pet,
    staff: User | undefined,
    allExistingAppointments: Appointment[],
  ): SchedulingValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (appointments.length === 0) {
      errors.push('Recurring appointment group must contain at least one appointment');
      return { isValid: false, errors, warnings };
    }

    // All appointments in the group must have the same recurrence_id
    const recurrenceId = appointments[0].recurrenceId;
    if (!recurrenceId) {
      errors.push('Recurring appointments must have a recurrence_id');
      return { isValid: false, errors, warnings };
    }

    // Validate that all appointments have the same recurrence_id
    for (const appointment of appointments) {
      if (appointment.recurrenceId !== recurrenceId) {
        errors.push('All appointments in a recurrence group must have the same recurrence_id');
        break;
      }
    }

    // Validate that all appointments have the same store, customer, pet
    const firstAppointment = appointments[0];
    for (const appointment of appointments) {
      if (appointment.storeId !== firstAppointment.storeId) {
        errors.push('All appointments in a recurrence group must be at the same store');
        break;
      }
      if (appointment.customerId !== firstAppointment.customerId) {
        errors.push('All appointments in a recurrence group must be for the same customer');
        break;
      }
      if (appointment.petId !== firstAppointment.petId) {
        errors.push('All appointments in a recurrence group must be for the same pet');
        break;
      }
      if (appointment.staffId !== firstAppointment.staffId) {
        warnings.push('Not all appointments in the recurrence group have the same staff assigned');
        break;
      }
    }

    // Validate each appointment individually
    for (let i = 0; i < appointments.length; i++) {
      const appointment = appointments[i];
      const validation = this.validateAppointmentScheduling(
        appointment,
        store,
        pet,
        staff,
        allExistingAppointments,
      );

      if (!validation.isValid) {
        errors.push(`Appointment ${i + 1} in recurrence group: ${validation.errors.join('; ')}`);
      }
      warnings.push(...validation.warnings.map((w) => `Appointment ${i + 1}: ${w}`));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Checks if a staff member is available for an appointment at the given time.
   *
   * This is a convenience method that combines multiple validations.
   *
   * @param appointment - The appointment to check
   * @param store - The store
   * @param staff - The staff member
   * @param existingAppointments - Existing appointments to check for conflicts
   * @returns True if staff is available
   */
  isStaffAvailable(
    appointment: Appointment,
    store: Store,
    staff: User,
    existingAppointments: Appointment[],
  ): boolean {
    // Check if staff is assigned to store
    if (!staff.isAssignedToStore(store.id)) {
      return false;
    }

    // Check if staff is active
    if (!staff.active) {
      return false;
    }

    // Validate working hours
    const workingHoursValidation = this.validateStaffWorkingHours(appointment, store, staff);
    if (!workingHoursValidation.isValid) {
      return false;
    }

    // Check for conflicts
    const conflictValidation = this.validateNoDoubleBooking(appointment, existingAppointments);
    if (!conflictValidation.isValid) {
      // Check specifically for staff conflicts
      const staffConflicts = conflictValidation.errors.filter((e) => e.includes('Staff member'));
      if (staffConflicts.length > 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if a pet is available for an appointment at the given time.
   *
   * @param appointment - The appointment to check
   * @param existingAppointments - Existing appointments to check for conflicts
   * @returns True if pet is available
   */
  isPetAvailable(appointment: Appointment, existingAppointments: Appointment[]): boolean {
    const conflictValidation = this.validateNoDoubleBooking(appointment, existingAppointments);
    if (!conflictValidation.isValid) {
      // Check specifically for pet conflicts
      const petConflicts = conflictValidation.errors.filter((e) => e.includes('Pet is already'));
      if (petConflicts.length > 0) {
        return false;
      }
    }

    return true;
  }

  // Private helper methods

  /**
   * Converts JavaScript day of week (0-6) to day name string.
   *
   * @param dayOfWeek - Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
   * @returns Day name in lowercase (monday, tuesday, etc.)
   */
  private getDayName(dayOfWeek: number): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayOfWeek];
  }

  /**
   * Formats a Date object to HH:mm time string.
   *
   * @param date - Date object
   * @returns Time string in HH:mm format
   */
  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Checks if two dates are on the same day.
   *
   * @param date1 - First date
   * @param date2 - Second date
   * @returns True if dates are on the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }
}
