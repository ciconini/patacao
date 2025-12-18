/**
 * AppointmentStatus Value Object
 *
 * Represents the status of an appointment in the petshop management system.
 * This is a pure domain value object that encapsulates appointment status validation and business rules,
 * including valid status values and status transition rules.
 *
 * Value Object Characteristics:
 * - Immutable: All properties are readonly and cannot be changed after creation
 * - No Identity: Equality is determined by value, not by reference
 * - Encapsulates Validation: All validation logic is contained within the value object
 * - Self-Validating: Constructor validates status value
 *
 * Business Rules:
 * - Valid status values: booked, confirmed, checked_in, completed, cancelled, needs-reschedule
 * - Status transitions follow a specific lifecycle
 * - Status determines what operations are allowed on the appointment
 *
 * Invariants:
 * - Status value must be one of the valid status values
 * - Value object is immutable after creation
 *
 * Equality Definition:
 * - Two AppointmentStatus instances are equal if their status values are equal
 * - Equality is based on status values, not object reference
 *
 * Usage Examples:
 *
 * 1. In Appointment entity:
 *    constructor(
 *      // ... other params
 *      status: AppointmentStatus | string = AppointmentStatus.BOOKED,
 *    ) {
 *      this._status = status instanceof AppointmentStatus
 *        ? status
 *        : AppointmentStatus.fromString(status);
 *    }
 *
 *    confirm(): void {
 *      if (!this._status.canTransitionTo(AppointmentStatus.CONFIRMED)) {
 *        throw new Error(`Cannot confirm appointment with status: ${this._status.value}`);
 *      }
 *      this._status = AppointmentStatus.CONFIRMED;
 *    }
 *
 * 2. Creating AppointmentStatus:
 *    const booked = AppointmentStatus.BOOKED;
 *    const confirmed = AppointmentStatus.CONFIRMED;
 *    const fromString = AppointmentStatus.fromString("booked"); // AppointmentStatus.BOOKED
 *    const fromStringSafe = AppointmentStatus.fromStringSafe("invalid"); // null
 *
 * 3. Checking status:
 *    const status = AppointmentStatus.BOOKED;
 *    status.isBooked(); // true
 *    status.isConfirmed(); // false
 *    status.isActive(); // true
 *    status.isTerminal(); // false
 *    status.isCompleted(); // false
 *    status.isCancelled(); // false
 *
 * 4. Status transitions:
 *    const booked = AppointmentStatus.BOOKED;
 *    booked.canTransitionTo(AppointmentStatus.CONFIRMED); // true
 *    booked.canTransitionTo(AppointmentStatus.COMPLETED); // false
 *    booked.canTransitionTo(AppointmentStatus.CANCELLED); // true
 *
 * 5. Equality comparison:
 *    const status1 = AppointmentStatus.BOOKED;
 *    const status2 = AppointmentStatus.fromString("booked");
 *    status1.equals(status2); // true
 *
 * 6. String representation:
 *    const status = AppointmentStatus.BOOKED;
 *    status.toString(); // "booked"
 *    status.value; // "booked"
 *    status.displayName; // "Booked"
 */

export class AppointmentStatus {
  private readonly _value: string;

  // Valid status values
  static readonly BOOKED = new AppointmentStatus('booked');
  static readonly CONFIRMED = new AppointmentStatus('confirmed');
  static readonly CHECKED_IN = new AppointmentStatus('checked_in');
  static readonly COMPLETED = new AppointmentStatus('completed');
  static readonly CANCELLED = new AppointmentStatus('cancelled');
  static readonly NEEDS_RESCHEDULE = new AppointmentStatus('needs-reschedule');

  // All valid status values
  private static readonly VALID_VALUES = [
    'booked',
    'confirmed',
    'checked_in',
    'completed',
    'cancelled',
    'needs-reschedule',
  ] as const;

  // Status display names
  private static readonly DISPLAY_NAMES: { [key: string]: string } = {
    booked: 'Booked',
    confirmed: 'Confirmed',
    checked_in: 'Checked In',
    completed: 'Completed',
    cancelled: 'Cancelled',
    'needs-reschedule': 'Needs Reschedule',
  };

  /**
   * Creates a new AppointmentStatus value object
   *
   * Private constructor - use static factory methods or predefined constants instead:
   * - AppointmentStatus.BOOKED
   * - AppointmentStatus.fromString(value)
   *
   * @param value - Status value (must be one of the valid status values)
   * @throws Error if value is not a valid status
   */
  private constructor(value: string) {
    this.validateValue(value);
    this._value = value;
  }

  /**
   * Gets the status value
   *
   * @returns Status value string
   */
  get value(): string {
    return this._value;
  }

  /**
   * Gets the display name for the status
   *
   * @returns Human-readable display name
   */
  get displayName(): string {
    return AppointmentStatus.DISPLAY_NAMES[this._value] || this._value;
  }

  /**
   * Checks if this AppointmentStatus equals another AppointmentStatus
   *
   * Equality is determined by comparing status values.
   *
   * @param other - Other AppointmentStatus to compare
   * @returns True if status values are equal
   */
  equals(other: AppointmentStatus | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof AppointmentStatus)) {
      return false;
    }

    return this._value === other._value;
  }

  /**
   * Checks if this AppointmentStatus is equal to another AppointmentStatus (alias for equals)
   *
   * @param other - Other AppointmentStatus to compare
   * @returns True if status values are equal
   */
  isEqual(other: AppointmentStatus | null | undefined): boolean {
    return this.equals(other);
  }

  /**
   * Converts the AppointmentStatus to string representation
   *
   * @returns Status value string
   */
  toString(): string {
    return this._value;
  }

  // Status check methods

  /**
   * Checks if status is BOOKED
   *
   * @returns True if status is booked
   */
  isBooked(): boolean {
    return this._value === 'booked';
  }

  /**
   * Checks if status is CONFIRMED
   *
   * @returns True if status is confirmed
   */
  isConfirmed(): boolean {
    return this._value === 'confirmed';
  }

  /**
   * Checks if status is CHECKED_IN
   *
   * @returns True if status is checked_in
   */
  isCheckedIn(): boolean {
    return this._value === 'checked_in';
  }

  /**
   * Checks if status is COMPLETED
   *
   * @returns True if status is completed
   */
  isCompleted(): boolean {
    return this._value === 'completed';
  }

  /**
   * Checks if status is CANCELLED
   *
   * @returns True if status is cancelled
   */
  isCancelled(): boolean {
    return this._value === 'cancelled';
  }

  /**
   * Checks if status is NEEDS_RESCHEDULE
   *
   * @returns True if status is needs-reschedule
   */
  isNeedsReschedule(): boolean {
    return this._value === 'needs-reschedule';
  }

  /**
   * Checks if status is active (not completed or cancelled)
   *
   * @returns True if status is active
   */
  isActive(): boolean {
    return !this.isCompleted() && !this.isCancelled();
  }

  /**
   * Checks if status is terminal (completed or cancelled)
   *
   * @returns True if status is terminal
   */
  isTerminal(): boolean {
    return this.isCompleted() || this.isCancelled();
  }

  /**
   * Checks if appointment can be modified in this status
   *
   * @returns True if appointment can be modified
   */
  allowsModification(): boolean {
    return !this.isCompleted() && !this.isCancelled();
  }

  /**
   * Checks if appointment can be cancelled in this status
   *
   * @returns True if appointment can be cancelled
   */
  allowsCancellation(): boolean {
    return !this.isCompleted() && !this.isCancelled();
  }

  /**
   * Checks if appointment can be rescheduled in this status
   *
   * @returns True if appointment can be rescheduled
   */
  allowsReschedule(): boolean {
    return !this.isCompleted() && !this.isCancelled();
  }

  // Status transition methods

  /**
   * Checks if this status can transition to another status
   *
   * Valid transitions:
   * - BOOKED -> CONFIRMED, CANCELLED, NEEDS_RESCHEDULE
   * - CONFIRMED -> CHECKED_IN, CANCELLED, NEEDS_RESCHEDULE
   * - CHECKED_IN -> COMPLETED, CANCELLED, NEEDS_RESCHEDULE
   * - COMPLETED -> (terminal, no transitions)
   * - CANCELLED -> (terminal, no transitions)
   * - NEEDS_RESCHEDULE -> BOOKED, CANCELLED
   *
   * @param targetStatus - Target status to transition to
   * @returns True if transition is allowed
   */
  canTransitionTo(targetStatus: AppointmentStatus): boolean {
    if (this.equals(targetStatus)) {
      return true; // Same status, no transition needed
    }

    // Terminal states cannot transition
    if (this.isTerminal()) {
      return false;
    }

    // Define valid transitions
    const validTransitions: { [key: string]: string[] } = {
      booked: ['confirmed', 'cancelled', 'needs-reschedule'],
      confirmed: ['checked_in', 'cancelled', 'needs-reschedule'],
      checked_in: ['completed', 'cancelled', 'needs-reschedule'],
      'needs-reschedule': ['booked', 'cancelled'],
      completed: [], // Terminal
      cancelled: [], // Terminal
    };

    const allowedTargets = validTransitions[this._value] || [];
    return allowedTargets.includes(targetStatus._value);
  }

  /**
   * Gets all valid target statuses from this status
   *
   * @returns Array of valid target AppointmentStatus instances
   */
  getValidTransitions(): AppointmentStatus[] {
    if (this.isTerminal()) {
      return [];
    }

    const validTransitions: { [key: string]: string[] } = {
      booked: ['confirmed', 'cancelled', 'needs-reschedule'],
      confirmed: ['checked_in', 'cancelled', 'needs-reschedule'],
      checked_in: ['completed', 'cancelled', 'needs-reschedule'],
      'needs-reschedule': ['booked', 'cancelled'],
    };

    const targetValues = validTransitions[this._value] || [];
    return targetValues.map((value) => AppointmentStatus.fromString(value));
  }

  // Factory methods

  /**
   * Creates an AppointmentStatus from a string value
   *
   * @param value - Status value string
   * @returns AppointmentStatus instance
   * @throws Error if value is not a valid status
   */
  static fromString(value: string): AppointmentStatus {
    switch (value) {
      case 'booked':
        return AppointmentStatus.BOOKED;
      case 'confirmed':
        return AppointmentStatus.CONFIRMED;
      case 'checked_in':
        return AppointmentStatus.CHECKED_IN;
      case 'completed':
        return AppointmentStatus.COMPLETED;
      case 'cancelled':
        return AppointmentStatus.CANCELLED;
      case 'needs-reschedule':
        return AppointmentStatus.NEEDS_RESCHEDULE;
      default:
        throw new Error(
          `Invalid appointment status: "${value}". Valid values are: ${AppointmentStatus.VALID_VALUES.join(', ')}`,
        );
    }
  }

  /**
   * Creates an AppointmentStatus from a string value, returning null if invalid
   *
   * This is a factory method that allows safe creation without throwing exceptions.
   *
   * @param value - Status value string
   * @returns AppointmentStatus instance or null if invalid
   */
  static fromStringSafe(value: string): AppointmentStatus | null {
    try {
      return AppointmentStatus.fromString(value);
    } catch {
      return null;
    }
  }

  /**
   * Validates if a string value is a valid appointment status
   *
   * @param value - Status value to validate
   * @returns True if value is a valid status
   */
  static isValid(value: string): boolean {
    return AppointmentStatus.VALID_VALUES.includes(value as any);
  }

  /**
   * Gets all valid appointment status values
   *
   * @returns Array of all valid status values
   */
  static getAllValues(): string[] {
    return [...AppointmentStatus.VALID_VALUES];
  }

  /**
   * Gets all appointment status instances
   *
   * @returns Array of all AppointmentStatus instances
   */
  static getAll(): AppointmentStatus[] {
    return [
      AppointmentStatus.BOOKED,
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.CHECKED_IN,
      AppointmentStatus.COMPLETED,
      AppointmentStatus.CANCELLED,
      AppointmentStatus.NEEDS_RESCHEDULE,
    ];
  }

  // Private validation method

  /**
   * Validates the status value
   *
   * @param value - Status value to validate
   * @throws Error if value is not valid
   */
  private validateValue(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new Error('Appointment status must be a non-empty string');
    }

    if (!AppointmentStatus.VALID_VALUES.includes(value as any)) {
      throw new Error(
        `Invalid appointment status: "${value}". Valid values are: ${AppointmentStatus.VALID_VALUES.join(', ')}`,
      );
    }
  }
}
