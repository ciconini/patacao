/**
 * OpeningHours Value Object
 * 
 * Represents opening hours for a single day in the petshop management system.
 * This is a pure domain value object that encapsulates opening hours validation and business rules,
 * using 24-hour format (HH:mm) as per Portugal time conventions.
 * 
 * Value Object Characteristics:
 * - Immutable: All properties are readonly and cannot be changed after creation
 * - No Identity: Equality is determined by value, not by reference
 * - Encapsulates Validation: All validation logic is contained within the value object
 * - Self-Validating: Constructor validates opening hours state and time range
 * 
 * Business Rules:
 * - Opening hours can be either open (with time range) or closed (no time range)
 * - If open, must have both openTime and closeTime in "HH:mm" format
 * - If closed, must not have openTime or closeTime
 * - Open time must be before close time
 * - Times are represented as strings in "HH:mm" format (e.g., "09:00", "17:00")
 * 
 * Invariants:
 * - If isOpen is true, timeRange must be provided and valid
 * - If isOpen is false, timeRange must be undefined
 * - Value object is immutable after creation
 * 
 * Equality Definition:
 * - Two OpeningHours instances are equal if both isOpen and timeRange are equal
 * - Equality is based on opening hours values, not object reference
 * 
 * Usage Examples:
 * 
 * 1. In Store entity (daily opening hours):
 *    export interface WeeklyOpeningHours {
 *      readonly monday?: OpeningHours;
 *      readonly tuesday?: OpeningHours;
 *      // ... other days
 *    }
 * 
 *    // Usage
 *    const mondayHours = OpeningHours.open("09:00", "17:00");
 *    const sundayHours = OpeningHours.closed();
 * 
 * 2. Creating OpeningHours:
 *    const openHours = OpeningHours.open("09:00", "17:00"); // Open 9 AM to 5 PM
 *    const closedHours = OpeningHours.closed(); // Closed
 *    const fromStrings = OpeningHours.fromStrings("09:00", "17:00"); // Open
 *    const fromTimeRange = OpeningHours.fromTimeRange(new TimeRange("09:00", "17:00")); // Open
 * 
 * 3. Checking status:
 *    const hours = OpeningHours.open("09:00", "17:00");
 *    hours.isOpen; // true
 *    hours.isClosed(); // false
 *    hours.contains("12:00"); // true (store is open at noon)
 *    hours.contains("18:00"); // false (store is closed at 6 PM)
 * 
 * 4. Getting time information:
 *    const hours = OpeningHours.open("09:00", "17:00");
 *    hours.openTime; // "09:00"
 *    hours.closeTime; // "17:00"
 *    hours.timeRange; // TimeRange("09:00", "17:00")
 *    hours.getDurationMinutes(); // 480 (8 hours)
 *    hours.getDurationHours(); // 8.0
 * 
 * 5. Equality comparison:
 *    const hours1 = OpeningHours.open("09:00", "17:00");
 *    const hours2 = OpeningHours.open("09:00", "17:00");
 *    hours1.equals(hours2); // true
 * 
 * 6. String representation:
 *    const openHours = OpeningHours.open("09:00", "17:00");
 *    openHours.toString(); // "09:00 - 17:00"
 * 
 *    const closedHours = OpeningHours.closed();
 *    closedHours.toString(); // "Closed"
 */

import { TimeRange } from './time-range.value-object';

export class OpeningHours {
  private readonly _isOpen: boolean;
  private readonly _timeRange?: TimeRange;

  /**
   * Creates a new OpeningHours value object
   * 
   * Private constructor - use factory methods instead:
   * - OpeningHours.open(openTime, closeTime) for open hours
   * - OpeningHours.closed() for closed hours
   * 
   * @param isOpen - Whether the location is open
   * @param timeRange - Time range when open (required if isOpen is true, must be undefined if false)
   * @throws Error if isOpen is true but timeRange is undefined
   * @throws Error if isOpen is false but timeRange is provided
   */
  private constructor(isOpen: boolean, timeRange?: TimeRange) {
    if (isOpen && !timeRange) {
      throw new Error('Open hours must have a time range');
    }

    if (!isOpen && timeRange) {
      throw new Error('Closed hours must not have a time range');
    }

    this._isOpen = isOpen;
    this._timeRange = timeRange;
  }

  /**
   * Gets whether the location is open
   * 
   * @returns True if open, false if closed
   */
  get isOpen(): boolean {
    return this._isOpen;
  }

  /**
   * Gets the time range when open
   * 
   * @returns TimeRange if open, undefined if closed
   */
  get timeRange(): TimeRange | undefined {
    return this._timeRange;
  }

  /**
   * Gets the open time
   * 
   * @returns Open time in "HH:mm" format if open, undefined if closed
   */
  get openTime(): string | undefined {
    return this._timeRange?.startTime;
  }

  /**
   * Gets the close time
   * 
   * @returns Close time in "HH:mm" format if open, undefined if closed
   */
  get closeTime(): string | undefined {
    return this._timeRange?.endTime;
  }

  /**
   * Checks if the location is closed
   * 
   * @returns True if closed, false if open
   */
  isClosed(): boolean {
    return !this._isOpen;
  }

  /**
   * Checks if the location is open at a specific time
   * 
   * @param time - Time to check in "HH:mm" format
   * @returns True if open at the specified time, false otherwise
   */
  contains(time: string): boolean {
    if (!this._isOpen || !this._timeRange) {
      return false;
    }
    return this._timeRange.contains(time);
  }

  /**
   * Checks if the location is open at a specific time (inclusive of close time)
   * 
   * @param time - Time to check in "HH:mm" format
   * @returns True if open at the specified time (inclusive), false otherwise
   */
  containsInclusive(time: string): boolean {
    if (!this._isOpen || !this._timeRange) {
      return false;
    }
    return this._timeRange.containsInclusive(time);
  }

  /**
   * Checks if a time range is completely within opening hours
   * 
   * @param timeRange - TimeRange to check
   * @returns True if the time range is completely within opening hours, false otherwise
   */
  containsRange(timeRange: TimeRange): boolean {
    if (!this._isOpen || !this._timeRange) {
      return false;
    }
    return this._timeRange.containsRange(timeRange);
  }

  /**
   * Checks if opening hours overlap with a time range
   * 
   * @param timeRange - TimeRange to check
   * @returns True if opening hours overlap with the time range, false otherwise
   */
  overlapsWith(timeRange: TimeRange): boolean {
    if (!this._isOpen || !this._timeRange) {
      return false;
    }
    return this._timeRange.overlapsWith(timeRange);
  }

  /**
   * Gets the duration of opening hours in minutes
   * 
   * @returns Duration in minutes if open, 0 if closed
   */
  getDurationMinutes(): number {
    if (!this._isOpen || !this._timeRange) {
      return 0;
    }
    return this._timeRange.getDurationMinutes();
  }

  /**
   * Gets the duration of opening hours in hours
   * 
   * @returns Duration in hours if open, 0 if closed
   */
  getDurationHours(): number {
    if (!this._isOpen || !this._timeRange) {
      return 0;
    }
    return this._timeRange.getDurationHours();
  }

  /**
   * Checks if this OpeningHours equals another OpeningHours
   * 
   * Equality is determined by comparing both isOpen and timeRange.
   * 
   * @param other - Other OpeningHours to compare
   * @returns True if both isOpen and timeRange are equal
   */
  equals(other: OpeningHours | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof OpeningHours)) {
      return false;
    }

    if (this._isOpen !== other._isOpen) {
      return false;
    }

    if (!this._isOpen && !other._isOpen) {
      return true; // Both closed
    }

    // Both open - compare time ranges
    if (!this._timeRange || !other._timeRange) {
      return false; // Should not happen due to invariants, but defensive check
    }

    return this._timeRange.equals(other._timeRange);
  }

  /**
   * Checks if this OpeningHours is equal to another OpeningHours (alias for equals)
   * 
   * @param other - Other OpeningHours to compare
   * @returns True if both isOpen and timeRange are equal
   */
  isEqual(other: OpeningHours | null | undefined): boolean {
    return this.equals(other);
  }

  /**
   * Converts the OpeningHours to string representation
   * 
   * Format: "openTime - closeTime" if open, "Closed" if closed
   * 
   * @returns OpeningHours string representation
   */
  toString(): string {
    if (!this._isOpen || !this._timeRange) {
      return 'Closed';
    }
    return this._timeRange.toString();
  }

  /**
   * Creates an OpeningHours instance for open hours
   * 
   * @param openTime - Open time in "HH:mm" format
   * @param closeTime - Close time in "HH:mm" format
   * @returns New OpeningHours instance (open)
   * @throws Error if times are invalid or openTime >= closeTime
   */
  static open(openTime: string, closeTime: string): OpeningHours {
    const timeRange = new TimeRange(openTime, closeTime);
    return new OpeningHours(true, timeRange);
  }

  /**
   * Creates an OpeningHours instance for closed hours
   * 
   * @returns New OpeningHours instance (closed)
   */
  static closed(): OpeningHours {
    return new OpeningHours(false);
  }

  /**
   * Creates an OpeningHours instance from a TimeRange
   * 
   * @param timeRange - TimeRange for opening hours
   * @returns New OpeningHours instance (open)
   */
  static fromTimeRange(timeRange: TimeRange): OpeningHours {
    return new OpeningHours(true, timeRange);
  }

  /**
   * Creates an OpeningHours instance from time strings, returning null if invalid
   * 
   * This is a factory method that allows safe creation without throwing exceptions.
   * 
   * @param openTime - Open time in "HH:mm" format (optional, if not provided, creates closed hours)
   * @param closeTime - Close time in "HH:mm" format (optional, if not provided, creates closed hours)
   * @returns OpeningHours instance or null if invalid
   */
  static fromStrings(openTime?: string, closeTime?: string): OpeningHours | null {
    if (!openTime || !closeTime) {
      return OpeningHours.closed();
    }

    try {
      return OpeningHours.open(openTime, closeTime);
    } catch {
      return null;
    }
  }

  /**
   * Creates an OpeningHours instance from an object representation
   * 
   * @param data - Object with isOpen and optional openTime/closeTime
   * @returns OpeningHours instance or null if invalid
   */
  static fromObject(data: {
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
  } | null | undefined): OpeningHours | null {
    if (!data) {
      return null;
    }

    if (!data.isOpen) {
      return OpeningHours.closed();
    }

    if (!data.openTime || !data.closeTime) {
      return null;
    }

    try {
      return OpeningHours.open(data.openTime, data.closeTime);
    } catch {
      return null;
    }
  }

  /**
   * Validates if opening hours data is valid
   * 
   * @param data - Opening hours data to validate
   * @returns True if opening hours data is valid
   */
  static isValid(data: {
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
  } | null | undefined): boolean {
    return OpeningHours.fromObject(data) !== null;
  }

  /**
   * Creates a copy of this OpeningHours with updated properties
   * 
   * Since OpeningHours is immutable, this method creates a new instance with updated values.
   * 
   * @param updates - Partial opening hours data to update
   * @returns New OpeningHours instance with updated values
   */
  with(updates: {
    isOpen?: boolean;
    openTime?: string;
    closeTime?: string;
  }): OpeningHours {
    const newIsOpen = updates.isOpen !== undefined ? updates.isOpen : this._isOpen;

    if (!newIsOpen) {
      return OpeningHours.closed();
    }

    const newOpenTime = updates.openTime !== undefined ? updates.openTime : this.openTime;
    const newCloseTime = updates.closeTime !== undefined ? updates.closeTime : this.closeTime;

    if (!newOpenTime || !newCloseTime) {
      // If trying to set isOpen to true but missing times, keep current times or throw
      if (this._isOpen && this._timeRange) {
        return this; // No change needed
      }
      throw new Error('Cannot set isOpen to true without providing openTime and closeTime');
    }

    return OpeningHours.open(newOpenTime, newCloseTime);
  }
}

