/**
 * WorkingHours Value Object
 * 
 * Represents working hours for a single day in the petshop management system.
 * This is a pure domain value object that encapsulates working hours validation and business rules,
 * using 24-hour format (HH:mm) as per Portugal time conventions.
 * 
 * Value Object Characteristics:
 * - Immutable: All properties are readonly and cannot be changed after creation
 * - No Identity: Equality is determined by value, not by reference
 * - Encapsulates Validation: All validation logic is contained within the value object
 * - Self-Validating: Constructor validates working hours state and time range
 * 
 * Business Rules:
 * - Working hours always have startTime and endTime in "HH:mm" format
 * - isAvailable indicates whether the person is available to work during the time range
 * - Start time must be before end time
 * - Times are represented as strings in "HH:mm" format (e.g., "09:00", "17:00")
 * - Even when not available, times are still defined (for tracking purposes)
 * 
 * Invariants:
 * - Start time and end time are always provided and valid
 * - Start time must be before end time
 * - Value object is immutable after creation
 * 
 * Equality Definition:
 * - Two WorkingHours instances are equal if startTime, endTime, and isAvailable are equal
 * - Equality is based on working hours values, not object reference
 * 
 * Usage Examples:
 * 
 * 1. In User entity (daily working hours):
 *    export interface WeeklySchedule {
 *      readonly monday?: WorkingHours;
 *      readonly tuesday?: WorkingHours;
 *      readonly wednesday?: WorkingHours;
 *      readonly thursday?: WorkingHours;
 *      readonly friday?: WorkingHours;
 *      readonly saturday?: WorkingHours;
 *      readonly sunday?: WorkingHours;
 *    }
 * 
 *    // Usage
 *    const mondayHours = WorkingHours.available("09:00", "17:00");
 *    const sundayHours = WorkingHours.unavailable("00:00", "00:00");
 * 
 * 2. Creating WorkingHours:
 *    const availableHours = WorkingHours.available("09:00", "17:00"); // Available 9 AM to 5 PM
 *    const unavailableHours = WorkingHours.unavailable("09:00", "17:00"); // Not available but times defined
 *    const fromStrings = WorkingHours.fromStrings("09:00", "17:00", true); // Available
 *    const fromTimeRange = WorkingHours.fromTimeRange(new TimeRange("09:00", "17:00"), true); // Available
 * 
 * 3. Checking status:
 *    const hours = WorkingHours.available("09:00", "17:00");
 *    hours.isAvailable; // true
 *    hours.isUnavailable(); // false
 *    hours.contains("12:00"); // true (person is available at noon)
 *    hours.contains("18:00"); // false (person is not available at 6 PM)
 * 
 * 4. Getting time information:
 *    const hours = WorkingHours.available("09:00", "17:00");
 *    hours.startTime; // "09:00"
 *    hours.endTime; // "17:00"
 *    hours.timeRange; // TimeRange("09:00", "17:00")
 *    hours.getDurationMinutes(); // 480 (8 hours)
 *    hours.getDurationHours(); // 8.0
 * 
 * 5. Equality comparison:
 *    const hours1 = WorkingHours.available("09:00", "17:00");
 *    const hours2 = WorkingHours.available("09:00", "17:00");
 *    hours1.equals(hours2); // true
 * 
 * 6. String representation:
 *    const availableHours = WorkingHours.available("09:00", "17:00");
 *    availableHours.toString(); // "09:00 - 17:00 (Available)"
 * 
 *    const unavailableHours = WorkingHours.unavailable("09:00", "17:00");
 *    unavailableHours.toString(); // "09:00 - 17:00 (Unavailable)"
 */

import { TimeRange } from './time-range.value-object';

export class WorkingHours {
  private readonly _startTime: string;
  private readonly _endTime: string;
  private readonly _isAvailable: boolean;
  private readonly _timeRange: TimeRange;

  /**
   * Creates a new WorkingHours value object
   * 
   * @param startTime - Start time in "HH:mm" format (e.g., "09:00")
   * @param endTime - End time in "HH:mm" format (e.g., "17:00")
   * @param isAvailable - Whether the person is available to work during this time range
   * @throws Error if startTime or endTime is invalid format
   * @throws Error if startTime is not before endTime
   */
  constructor(startTime: string, endTime: string, isAvailable: boolean = true) {
    this._timeRange = new TimeRange(startTime, endTime);
    this._startTime = startTime;
    this._endTime = endTime;
    this._isAvailable = isAvailable;
  }

  /**
   * Gets the start time
   * 
   * @returns Start time in "HH:mm" format
   */
  get startTime(): string {
    return this._startTime;
  }

  /**
   * Gets the end time
   * 
   * @returns End time in "HH:mm" format
   */
  get endTime(): string {
    return this._endTime;
  }

  /**
   * Gets whether the person is available to work
   * 
   * @returns True if available, false if not available
   */
  get isAvailable(): boolean {
    return this._isAvailable;
  }

  /**
   * Gets the time range
   * 
   * @returns TimeRange value object
   */
  get timeRange(): TimeRange {
    return this._timeRange;
  }

  /**
   * Checks if the person is unavailable
   * 
   * @returns True if unavailable, false if available
   */
  isUnavailable(): boolean {
    return !this._isAvailable;
  }

  /**
   * Checks if the person is available at a specific time
   * 
   * @param time - Time to check in "HH:mm" format
   * @returns True if available at the specified time, false otherwise
   */
  contains(time: string): boolean {
    if (!this._isAvailable) {
      return false;
    }
    return this._timeRange.contains(time);
  }

  /**
   * Checks if the person is available at a specific time (inclusive of end time)
   * 
   * @param time - Time to check in "HH:mm" format
   * @returns True if available at the specified time (inclusive), false otherwise
   */
  containsInclusive(time: string): boolean {
    if (!this._isAvailable) {
      return false;
    }
    return this._timeRange.containsInclusive(time);
  }

  /**
   * Checks if a time range is completely within working hours
   * 
   * @param timeRange - TimeRange to check
   * @returns True if the time range is completely within working hours and person is available, false otherwise
   */
  containsRange(timeRange: TimeRange): boolean {
    if (!this._isAvailable) {
      return false;
    }
    return this._timeRange.containsRange(timeRange);
  }

  /**
   * Checks if working hours overlap with a time range
   * 
   * @param timeRange - TimeRange to check
   * @returns True if working hours overlap with the time range and person is available, false otherwise
   */
  overlapsWith(timeRange: TimeRange): boolean {
    if (!this._isAvailable) {
      return false;
    }
    return this._timeRange.overlapsWith(timeRange);
  }

  /**
   * Gets the duration of working hours in minutes
   * 
   * @returns Duration in minutes
   */
  getDurationMinutes(): number {
    return this._timeRange.getDurationMinutes();
  }

  /**
   * Gets the duration of working hours in hours
   * 
   * @returns Duration in hours (as decimal, e.g., 8.5 for 8 hours 30 minutes)
   */
  getDurationHours(): number {
    return this._timeRange.getDurationHours();
  }

  /**
   * Checks if this WorkingHours equals another WorkingHours
   * 
   * Equality is determined by comparing startTime, endTime, and isAvailable.
   * 
   * @param other - Other WorkingHours to compare
   * @returns True if startTime, endTime, and isAvailable are equal
   */
  equals(other: WorkingHours | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof WorkingHours)) {
      return false;
    }

    return this._startTime === other._startTime &&
           this._endTime === other._endTime &&
           this._isAvailable === other._isAvailable;
  }

  /**
   * Checks if this WorkingHours is equal to another WorkingHours (alias for equals)
   * 
   * @param other - Other WorkingHours to compare
   * @returns True if startTime, endTime, and isAvailable are equal
   */
  isEqual(other: WorkingHours | null | undefined): boolean {
    return this.equals(other);
  }

  /**
   * Converts the WorkingHours to string representation
   * 
   * Format: "startTime - endTime (Available)" or "startTime - endTime (Unavailable)"
   * 
   * @returns WorkingHours string representation
   */
  toString(): string {
    const status = this._isAvailable ? 'Available' : 'Unavailable';
    return `${this._startTime} - ${this._endTime} (${status})`;
  }

  /**
   * Creates a WorkingHours instance for available hours
   * 
   * @param startTime - Start time in "HH:mm" format
   * @param endTime - End time in "HH:mm" format
   * @returns New WorkingHours instance (available)
   * @throws Error if times are invalid or startTime >= endTime
   */
  static available(startTime: string, endTime: string): WorkingHours {
    return new WorkingHours(startTime, endTime, true);
  }

  /**
   * Creates a WorkingHours instance for unavailable hours
   * 
   * @param startTime - Start time in "HH:mm" format
   * @param endTime - End time in "HH:mm" format
   * @returns New WorkingHours instance (unavailable)
   * @throws Error if times are invalid or startTime >= endTime
   */
  static unavailable(startTime: string, endTime: string): WorkingHours {
    return new WorkingHours(startTime, endTime, false);
  }

  /**
   * Creates a WorkingHours instance from a TimeRange
   * 
   * @param timeRange - TimeRange for working hours
   * @param isAvailable - Whether the person is available (default true)
   * @returns New WorkingHours instance
   */
  static fromTimeRange(timeRange: TimeRange, isAvailable: boolean = true): WorkingHours {
    return new WorkingHours(timeRange.startTime, timeRange.endTime, isAvailable);
  }

  /**
   * Creates a WorkingHours instance from time strings, returning null if invalid
   * 
   * This is a factory method that allows safe creation without throwing exceptions.
   * 
   * @param startTime - Start time in "HH:mm" format
   * @param endTime - End time in "HH:mm" format
   * @param isAvailable - Whether the person is available (default true)
   * @returns WorkingHours instance or null if invalid
   */
  static fromStrings(startTime: string, endTime: string, isAvailable: boolean = true): WorkingHours | null {
    try {
      return new WorkingHours(startTime, endTime, isAvailable);
    } catch {
      return null;
    }
  }

  /**
   * Creates a WorkingHours instance from an object representation
   * 
   * @param data - Object with startTime, endTime, and isAvailable
   * @returns WorkingHours instance or null if invalid
   */
  static fromObject(data: {
    startTime: string;
    endTime: string;
    isAvailable?: boolean;
  } | null | undefined): WorkingHours | null {
    if (!data) {
      return null;
    }

    if (!data.startTime || !data.endTime) {
      return null;
    }

    try {
      return new WorkingHours(
        data.startTime,
        data.endTime,
        data.isAvailable !== undefined ? data.isAvailable : true
      );
    } catch {
      return null;
    }
  }

  /**
   * Validates if working hours data is valid
   * 
   * @param data - Working hours data to validate
   * @returns True if working hours data is valid
   */
  static isValid(data: {
    startTime: string;
    endTime: string;
    isAvailable?: boolean;
  } | null | undefined): boolean {
    return WorkingHours.fromObject(data) !== null;
  }

  /**
   * Creates a copy of this WorkingHours with updated properties
   * 
   * Since WorkingHours is immutable, this method creates a new instance with updated values.
   * 
   * @param updates - Partial working hours data to update
   * @returns New WorkingHours instance with updated values
   */
  with(updates: {
    startTime?: string;
    endTime?: string;
    isAvailable?: boolean;
  }): WorkingHours {
    const newStartTime = updates.startTime !== undefined ? updates.startTime : this._startTime;
    const newEndTime = updates.endTime !== undefined ? updates.endTime : this._endTime;
    const newIsAvailable = updates.isAvailable !== undefined ? updates.isAvailable : this._isAvailable;

    return new WorkingHours(newStartTime, newEndTime, newIsAvailable);
  }
}

