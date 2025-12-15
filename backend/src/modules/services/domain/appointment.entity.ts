/**
 * Appointment Domain Entity
 * 
 * Represents an appointment for a pet service in the petshop management system.
 * This entity represents scheduled appointments between customers, pets, and staff.
 * This is a pure domain entity with no framework dependencies.
 * 
 * Business Rules:
 * - An Appointment must be linked to a Store, Customer, and Pet (invariants)
 * - Start time must be before end time
 * - Duration must be positive
 * - Status transitions follow a specific lifecycle
 * - Recurring appointments are linked via recurrence_id
 */

export enum AppointmentStatus {
  BOOKED = 'booked',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NEEDS_RESCHEDULE = 'needs-reschedule',
}

export class Appointment {
  private readonly _id: string;
  private readonly _storeId: string;
  private readonly _customerId: string;
  private readonly _petId: string;
  private _startAt: Date;
  private _endAt: Date;
  private _status: AppointmentStatus;
  private _createdBy?: string; // User ID
  private _staffId?: string; // User ID
  private _notes?: string;
  private _recurrenceId?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Creates a new Appointment entity
   * 
   * @param id - Unique identifier (UUID)
   * @param storeId - Store ID where appointment takes place (required)
   * @param customerId - Customer ID who owns the pet (required)
   * @param petId - Pet ID for the appointment (required)
   * @param startAt - Appointment start date and time (required)
   * @param endAt - Appointment end date and time (required)
   * @param status - Appointment status (default BOOKED)
   * @param createdBy - User ID who created the appointment
   * @param staffId - User ID of assigned staff member
   * @param notes - Additional notes
   * @param recurrenceId - Recurrence group identifier for recurring appointments
   * @param createdAt - Creation timestamp
   * @param updatedAt - Last update timestamp
   * 
   * @throws Error if storeId is empty
   * @throws Error if customerId is empty
   * @throws Error if petId is empty
   * @throws Error if startAt is after endAt
   * @throws Error if duration is zero or negative
   */
  constructor(
    id: string,
    storeId: string,
    customerId: string,
    petId: string,
    startAt: Date,
    endAt: Date,
    status: AppointmentStatus = AppointmentStatus.BOOKED,
    createdBy?: string,
    staffId?: string,
    notes?: string,
    recurrenceId?: string,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.validateId(id);
    this.validateStoreId(storeId);
    this.validateCustomerId(customerId);
    this.validatePetId(petId);
    this.validateDateTimeRange(startAt, endAt);

    this._id = id;
    this._storeId = storeId;
    this._customerId = customerId;
    this._petId = petId;
    this._startAt = new Date(startAt);
    this._endAt = new Date(endAt);
    this._status = status;
    this._createdBy = createdBy;
    this._staffId = staffId;
    this._notes = notes;
    this._recurrenceId = recurrenceId;
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
    this._updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  // Getters (read-only access to private fields)
  get id(): string {
    return this._id;
  }

  get storeId(): string {
    return this._storeId;
  }

  get customerId(): string {
    return this._customerId;
  }

  get petId(): string {
    return this._petId;
  }

  get startAt(): Date {
    return new Date(this._startAt);
  }

  get endAt(): Date {
    return new Date(this._endAt);
  }

  get status(): AppointmentStatus {
    return this._status;
  }

  get createdBy(): string | undefined {
    return this._createdBy;
  }

  get staffId(): string | undefined {
    return this._staffId;
  }

  get notes(): string | undefined {
    return this._notes;
  }

  get recurrenceId(): string | undefined {
    return this._recurrenceId;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Updates the appointment start and end times
   * 
   * @param startAt - New start date and time
   * @param endAt - New end date and time
   * @throws Error if startAt is after endAt or duration is invalid
   */
  reschedule(startAt: Date, endAt: Date): void {
    this.validateDateTimeRange(startAt, endAt);
    this._startAt = new Date(startAt);
    this._endAt = new Date(endAt);
    this._updatedAt = new Date();
  }

  /**
   * Updates only the start time, keeping the same duration
   * 
   * @param startAt - New start date and time
   * @throws Error if resulting end time would be invalid
   */
  updateStartTime(startAt: Date): void {
    const duration = this.getDurationMinutes();
    const newEndAt = new Date(startAt);
    newEndAt.setMinutes(newEndAt.getMinutes() + duration);
    
    this.validateDateTimeRange(startAt, newEndAt);
    this._startAt = new Date(startAt);
    this._endAt = newEndAt;
    this._updatedAt = new Date();
  }

  /**
   * Updates only the end time
   * 
   * @param endAt - New end date and time
   * @throws Error if endAt is before startAt
   */
  updateEndTime(endAt: Date): void {
    this.validateDateTimeRange(this._startAt, endAt);
    this._endAt = new Date(endAt);
    this._updatedAt = new Date();
  }

  /**
   * Confirms the appointment
   * 
   * @throws Error if current status doesn't allow confirmation
   */
  confirm(): void {
    if (this._status !== AppointmentStatus.BOOKED) {
      throw new Error(`Cannot confirm appointment with status: ${this._status}`);
    }
    this._status = AppointmentStatus.CONFIRMED;
    this._updatedAt = new Date();
  }

  /**
   * Marks the appointment as checked in
   * 
   * @throws Error if current status doesn't allow check-in
   */
  checkIn(): void {
    if (this._status !== AppointmentStatus.CONFIRMED && this._status !== AppointmentStatus.BOOKED) {
      throw new Error(`Cannot check in appointment with status: ${this._status}`);
    }
    this._status = AppointmentStatus.CHECKED_IN;
    this._updatedAt = new Date();
  }

  /**
   * Marks the appointment as completed
   * 
   * @throws Error if current status doesn't allow completion
   */
  complete(): void {
    if (this._status !== AppointmentStatus.CHECKED_IN && this._status !== AppointmentStatus.CONFIRMED) {
      throw new Error(`Cannot complete appointment with status: ${this._status}`);
    }
    this._status = AppointmentStatus.COMPLETED;
    this._updatedAt = new Date();
  }

  /**
   * Cancels the appointment
   * 
   * @throws Error if appointment is already completed or cancelled
   */
  cancel(): void {
    if (this._status === AppointmentStatus.COMPLETED) {
      throw new Error('Cannot cancel a completed appointment');
    }
    if (this._status === AppointmentStatus.CANCELLED) {
      throw new Error('Appointment is already cancelled');
    }
    this._status = AppointmentStatus.CANCELLED;
    this._updatedAt = new Date();
  }

  /**
   * Marks the appointment as needing reschedule
   * 
   * @throws Error if appointment is already completed or cancelled
   */
  markNeedsReschedule(): void {
    if (this._status === AppointmentStatus.COMPLETED) {
      throw new Error('Cannot mark completed appointment as needing reschedule');
    }
    if (this._status === AppointmentStatus.CANCELLED) {
      throw new Error('Cannot mark cancelled appointment as needing reschedule');
    }
    this._status = AppointmentStatus.NEEDS_RESCHEDULE;
    this._updatedAt = new Date();
  }

  /**
   * Assigns a staff member to the appointment
   * 
   * @param staffId - User ID of the staff member
   * @throws Error if staffId is empty
   */
  assignStaff(staffId: string): void {
    if (!staffId || staffId.trim().length === 0) {
      throw new Error('Staff ID cannot be empty');
    }
    this._staffId = staffId;
    this._updatedAt = new Date();
  }

  /**
   * Removes staff assignment from the appointment
   */
  unassignStaff(): void {
    this._staffId = undefined;
    this._updatedAt = new Date();
  }

  /**
   * Updates the appointment notes
   * 
   * @param notes - New notes
   */
  updateNotes(notes: string | undefined): void {
    this._notes = notes;
    this._updatedAt = new Date();
  }

  /**
   * Links the appointment to a recurrence group
   * 
   * @param recurrenceId - Recurrence group identifier
   */
  linkToRecurrence(recurrenceId: string): void {
    if (!recurrenceId || recurrenceId.trim().length === 0) {
      throw new Error('Recurrence ID cannot be empty');
    }
    this._recurrenceId = recurrenceId;
    this._updatedAt = new Date();
  }

  /**
   * Removes the recurrence link
   */
  unlinkFromRecurrence(): void {
    this._recurrenceId = undefined;
    this._updatedAt = new Date();
  }

  /**
   * Calculates the duration of the appointment in minutes
   * 
   * @returns Duration in minutes
   */
  getDurationMinutes(): number {
    const diffMs = this._endAt.getTime() - this._startAt.getTime();
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * Calculates the duration of the appointment in hours
   * 
   * @returns Duration in hours (decimal)
   */
  getDurationHours(): number {
    return this.getDurationMinutes() / 60;
  }

  /**
   * Checks if the appointment is in the past
   * 
   * @param referenceDate - Date to check against (defaults to now)
   * @returns True if appointment end time is before reference date
   */
  isPast(referenceDate: Date = new Date()): boolean {
    return this._endAt < referenceDate;
  }

  /**
   * Checks if the appointment is in the future
   * 
   * @param referenceDate - Date to check against (defaults to now)
   * @returns True if appointment start time is after reference date
   */
  isFuture(referenceDate: Date = new Date()): boolean {
    return this._startAt > referenceDate;
  }

  /**
   * Checks if the appointment is currently ongoing
   * 
   * @param referenceDate - Date to check against (defaults to now)
   * @returns True if reference date is between start and end time
   */
  isOngoing(referenceDate: Date = new Date()): boolean {
    return this._startAt <= referenceDate && this._endAt >= referenceDate;
  }

  /**
   * Checks if the appointment can be modified
   * 
   * @returns True if appointment status allows modifications
   */
  canBeModified(): boolean {
    return this._status !== AppointmentStatus.COMPLETED && 
           this._status !== AppointmentStatus.CANCELLED;
  }

  /**
   * Checks if the appointment can be cancelled
   * 
   * @returns True if appointment can be cancelled
   */
  canBeCancelled(): boolean {
    return this._status !== AppointmentStatus.COMPLETED && 
           this._status !== AppointmentStatus.CANCELLED;
  }

  /**
   * Checks if the appointment is active (not cancelled or completed)
   * 
   * @returns True if appointment is active
   */
  isActive(): boolean {
    return this._status !== AppointmentStatus.CANCELLED && 
           this._status !== AppointmentStatus.COMPLETED;
  }

  /**
   * Checks if the appointment is part of a recurrence group
   * 
   * @returns True if appointment has a recurrence ID
   */
  isRecurring(): boolean {
    return !!this._recurrenceId;
  }

  /**
   * Checks if the appointment has assigned staff
   * 
   * @returns True if staff is assigned
   */
  hasAssignedStaff(): boolean {
    return !!this._staffId;
  }

  /**
   * Checks if two appointments overlap in time
   * 
   * Appointments overlap if:
   * - They are at the same store
   * - If both have staff assigned, they must be the same staff member
   * - Their time ranges overlap
   * 
   * @param other - Other appointment to check against
   * @returns True if appointments overlap (same store, compatible staff, overlapping times)
   */
  overlapsWith(other: Appointment): boolean {
    // Must be at the same store
    if (this._storeId !== other._storeId) {
      return false;
    }

    // If both have staff assigned, they must be the same staff member
    if (this._staffId && other._staffId && this._staffId !== other._staffId) {
      return false;
    }

    // Check time overlap: this starts before other ends AND this ends after other starts
    return this._startAt < other._endAt && this._endAt > other._startAt;
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Appointment ID is required');
    }
  }

  private validateStoreId(storeId: string): void {
    if (!storeId || storeId.trim().length === 0) {
      throw new Error('Store ID is required - an Appointment must be linked to a Store');
    }
  }

  private validateCustomerId(customerId: string): void {
    if (!customerId || customerId.trim().length === 0) {
      throw new Error('Customer ID is required - an Appointment must be linked to a Customer');
    }
  }

  private validatePetId(petId: string): void {
    if (!petId || petId.trim().length === 0) {
      throw new Error('Pet ID is required - an Appointment must be linked to a Pet');
    }
  }

  private validateDateTimeRange(startAt: Date, endAt: Date): void {
    const start = new Date(startAt);
    const end = new Date(endAt);

    if (start >= end) {
      throw new Error('Appointment start time must be before end time');
    }

    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.floor(durationMs / (1000 * 60));

    if (durationMinutes <= 0) {
      throw new Error('Appointment duration must be greater than zero');
    }
  }
}

