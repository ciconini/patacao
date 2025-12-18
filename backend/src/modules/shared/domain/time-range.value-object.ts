/**
 * TimeRange Value Object
 *
 * Represents a time range (start time to end time) within a single day in the petshop management system.
 * This is a pure domain value object that encapsulates time range validation and business rules,
 * using 24-hour format (HH:mm) as per Portugal time conventions.
 *
 * Value Object Characteristics:
 * - Immutable: All properties are readonly and cannot be changed after creation
 * - No Identity: Equality is determined by value, not by reference
 * - Encapsulates Validation: All validation logic is contained within the value object
 * - Self-Validating: Constructor validates time format and range logic
 *
 * Business Rules:
 * - Start time and end time must be in "HH:mm" format (24-hour format)
 * - Start time must be before end time (range cannot be zero or negative duration)
 * - Times are represented as strings in "HH:mm" format (e.g., "09:00", "17:00")
 * - Time range represents a period within a single day (does not span midnight)
 *
 * Invariants:
 * - Start time must be valid "HH:mm" format (00:00 to 23:59)
 * - End time must be valid "HH:mm" format (00:00 to 23:59)
 * - Start time must be before end time
 * - Value object is immutable after creation
 *
 * Equality Definition:
 * - Two TimeRange instances are equal if both start and end times are equal
 * - Equality is based on time string values, not object reference
 *
 * Usage Examples:
 *
 * 1. In Store entity (opening hours):
 *    export interface DayOpeningHours {
 *      readonly isOpen: boolean;
 *      readonly openTime?: string; // "HH:mm"
 *      readonly closeTime?: string; // "HH:mm"
 *    }
 *
 *    // Usage with TimeRange
 *    const openingRange = new TimeRange(dayHours.openTime!, dayHours.closeTime!);
 *    if (openingRange.contains("12:00")) {
 *      // Store is open at noon
 *    }
 *
 * 2. In User entity (working hours):
 *    export interface WorkingHours {
 *      readonly startTime: string; // "HH:mm"
 *      readonly endTime: string; // "HH:mm"
 *      readonly isAvailable: boolean;
 *    }
 *
 *    // Usage with TimeRange
 *    const workRange = new TimeRange(workingHours.startTime, workingHours.endTime);
 *    const duration = workRange.getDurationMinutes(); // e.g., 480 (8 hours)
 *
 * 3. Creating TimeRange:
 *    const range = new TimeRange("09:00", "17:00"); // 9 AM to 5 PM
 *    const morning = TimeRange.fromHours(9, 12); // 9 AM to 12 PM
 *    const afternoon = TimeRange.fromHours(13, 17); // 1 PM to 5 PM
 *
 * 4. Validation:
 *    const range = new TimeRange("09:00", "17:00"); // Valid
 *    // new TimeRange("17:00", "09:00"); // Error: start must be before end
 *    // new TimeRange("25:00", "17:00"); // Error: invalid time format
 *
 * 5. Equality comparison:
 *    const range1 = new TimeRange("09:00", "17:00");
 *    const range2 = new TimeRange("09:00", "17:00");
 *    range1.equals(range2); // true
 *
 * 6. String representation:
 *    const range = new TimeRange("09:00", "17:00");
 *    range.toString(); // "09:00 - 17:00"
 *    range.startTime; // "09:00"
 *    range.endTime; // "17:00"
 *    range.getDurationMinutes(); // 480 (8 hours)
 *
 * 7. Range operations:
 *    const range1 = new TimeRange("09:00", "12:00");
 *    const range2 = new TimeRange("10:00", "14:00");
 *    range1.overlapsWith(range2); // true
 *    range1.contains("10:30"); // true
 *    range1.isBefore(range2); // false
 *    range1.isAfter(range2); // false
 */

export class TimeRange {
  private readonly _startTime: string;
  private readonly _endTime: string;

  private static readonly TIME_REGEX = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

  /**
   * Creates a new TimeRange value object
   *
   * @param startTime - Start time in "HH:mm" format (e.g., "09:00")
   * @param endTime - End time in "HH:mm" format (e.g., "17:00")
   * @throws Error if startTime or endTime is invalid format
   * @throws Error if startTime is not before endTime
   */
  constructor(startTime: string, endTime: string) {
    this.validateTimeFormat(startTime);
    this.validateTimeFormat(endTime);

    const startMinutes = this.parseTimeToMinutes(startTime);
    const endMinutes = this.parseTimeToMinutes(endTime);

    if (startMinutes >= endMinutes) {
      throw new Error(`Start time (${startTime}) must be before end time (${endTime})`);
    }

    this._startTime = startTime;
    this._endTime = endTime;
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
   * Gets the duration of the time range in minutes
   *
   * @returns Duration in minutes
   */
  getDurationMinutes(): number {
    const startMinutes = this.parseTimeToMinutes(this._startTime);
    const endMinutes = this.parseTimeToMinutes(this._endTime);
    return endMinutes - startMinutes;
  }

  /**
   * Gets the duration of the time range in hours
   *
   * @returns Duration in hours (as decimal, e.g., 8.5 for 8 hours 30 minutes)
   */
  getDurationHours(): number {
    return this.getDurationMinutes() / 60;
  }

  /**
   * Checks if this TimeRange equals another TimeRange
   *
   * Equality is determined by comparing both start and end times.
   *
   * @param other - Other TimeRange to compare
   * @returns True if both start and end times are equal
   */
  equals(other: TimeRange | null | undefined): boolean {
    if (!other) {
      return false;
    }

    if (!(other instanceof TimeRange)) {
      return false;
    }

    return this._startTime === other._startTime && this._endTime === other._endTime;
  }

  /**
   * Checks if this TimeRange is equal to another TimeRange (alias for equals)
   *
   * @param other - Other TimeRange to compare
   * @returns True if both start and end times are equal
   */
  isEqual(other: TimeRange | null | undefined): boolean {
    return this.equals(other);
  }

  /**
   * Checks if a specific time is within this time range
   *
   * @param time - Time to check in "HH:mm" format
   * @returns True if time is within the range (inclusive of start, exclusive of end)
   */
  contains(time: string): boolean {
    this.validateTimeFormat(time);
    const timeMinutes = this.parseTimeToMinutes(time);
    const startMinutes = this.parseTimeToMinutes(this._startTime);
    const endMinutes = this.parseTimeToMinutes(this._endTime);
    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  }

  /**
   * Checks if a specific time is within this time range (inclusive of both start and end)
   *
   * @param time - Time to check in "HH:mm" format
   * @returns True if time is within the range (inclusive of both boundaries)
   */
  containsInclusive(time: string): boolean {
    this.validateTimeFormat(time);
    const timeMinutes = this.parseTimeToMinutes(time);
    const startMinutes = this.parseTimeToMinutes(this._startTime);
    const endMinutes = this.parseTimeToMinutes(this._endTime);
    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  }

  /**
   * Checks if this time range completely contains another time range
   *
   * @param other - Other TimeRange to check
   * @returns True if this range completely contains the other range
   */
  containsRange(other: TimeRange): boolean {
    const thisStart = this.parseTimeToMinutes(this._startTime);
    const thisEnd = this.parseTimeToMinutes(this._endTime);
    const otherStart = this.parseTimeToMinutes(other._startTime);
    const otherEnd = this.parseTimeToMinutes(other._endTime);
    return thisStart <= otherStart && thisEnd >= otherEnd;
  }

  /**
   * Checks if this time range overlaps with another time range
   *
   * @param other - Other TimeRange to check
   * @returns True if the ranges overlap (at least one time point in common)
   */
  overlapsWith(other: TimeRange): boolean {
    const thisStart = this.parseTimeToMinutes(this._startTime);
    const thisEnd = this.parseTimeToMinutes(this._endTime);
    const otherStart = this.parseTimeToMinutes(other._startTime);
    const otherEnd = this.parseTimeToMinutes(other._endTime);
    return thisStart < otherEnd && thisEnd > otherStart;
  }

  /**
   * Checks if this time range is completely before another time range
   *
   * @param other - Other TimeRange to compare
   * @returns True if this range ends before the other range starts
   */
  isBefore(other: TimeRange): boolean {
    const thisEnd = this.parseTimeToMinutes(this._endTime);
    const otherStart = this.parseTimeToMinutes(other._startTime);
    return thisEnd <= otherStart;
  }

  /**
   * Checks if this time range is completely after another time range
   *
   * @param other - Other TimeRange to compare
   * @returns True if this range starts after the other range ends
   */
  isAfter(other: TimeRange): boolean {
    const thisStart = this.parseTimeToMinutes(this._startTime);
    const otherEnd = this.parseTimeToMinutes(other._endTime);
    return thisStart >= otherEnd;
  }

  /**
   * Checks if this time range is adjacent to another time range (no gap, no overlap)
   *
   * @param other - Other TimeRange to check
   * @returns True if ranges are adjacent (one ends exactly when the other starts)
   */
  isAdjacentTo(other: TimeRange): boolean {
    const thisEnd = this.parseTimeToMinutes(this._endTime);
    const otherStart = this.parseTimeToMinutes(other._startTime);
    const thisStart = this.parseTimeToMinutes(this._startTime);
    const otherEnd = this.parseTimeToMinutes(other._endTime);
    return thisEnd === otherStart || thisStart === otherEnd;
  }

  /**
   * Gets the intersection of this time range with another time range
   *
   * @param other - Other TimeRange to intersect with
   * @returns New TimeRange representing the intersection, or null if no intersection
   */
  intersect(other: TimeRange): TimeRange | null {
    if (!this.overlapsWith(other)) {
      return null;
    }

    const thisStart = this.parseTimeToMinutes(this._startTime);
    const thisEnd = this.parseTimeToMinutes(this._endTime);
    const otherStart = this.parseTimeToMinutes(other._startTime);
    const otherEnd = this.parseTimeToMinutes(other._endTime);

    const intersectionStart = Math.max(thisStart, otherStart);
    const intersectionEnd = Math.min(thisEnd, otherEnd);

    return new TimeRange(
      this.minutesToTimeString(intersectionStart),
      this.minutesToTimeString(intersectionEnd),
    );
  }

  /**
   * Gets the gap between this time range and another time range
   *
   * @param other - Other TimeRange to check gap with
   * @returns New TimeRange representing the gap, or null if ranges overlap or are adjacent
   */
  gap(other: TimeRange): TimeRange | null {
    if (this.overlapsWith(other) || this.isAdjacentTo(other)) {
      return null;
    }

    const thisEnd = this.parseTimeToMinutes(this._endTime);
    const otherStart = this.parseTimeToMinutes(other._startTime);
    const thisStart = this.parseTimeToMinutes(this._startTime);
    const otherEnd = this.parseTimeToMinutes(other._endTime);

    if (this.isBefore(other)) {
      // Gap between this end and other start
      return new TimeRange(this.minutesToTimeString(thisEnd), this.minutesToTimeString(otherStart));
    } else {
      // Gap between other end and this start
      return new TimeRange(this.minutesToTimeString(otherEnd), this.minutesToTimeString(thisStart));
    }
  }

  /**
   * Converts the TimeRange to string representation
   *
   * Format: "startTime - endTime" (e.g., "09:00 - 17:00")
   *
   * @returns TimeRange string representation
   */
  toString(): string {
    return `${this._startTime} - ${this._endTime}`;
  }

  /**
   * Creates a TimeRange from hour values
   *
   * @param startHour - Start hour (0-23)
   * @param endHour - End hour (0-23)
   * @param startMinute - Start minute (0-59, default 0)
   * @param endMinute - End minute (0-59, default 0)
   * @returns New TimeRange instance
   * @throws Error if hours are invalid or start >= end
   */
  static fromHours(
    startHour: number,
    endHour: number,
    startMinute: number = 0,
    endMinute: number = 0,
  ): TimeRange {
    if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
      throw new Error('Hours must be between 0 and 23');
    }
    if (startMinute < 0 || startMinute > 59 || endMinute < 0 || endMinute > 59) {
      throw new Error('Minutes must be between 0 and 59');
    }

    const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

    return new TimeRange(startTime, endTime);
  }

  /**
   * Creates a TimeRange from a number, returning null if invalid
   *
   * This is a factory method that allows safe creation without throwing exceptions.
   *
   * @param startTime - Start time in "HH:mm" format
   * @param endTime - End time in "HH:mm" format
   * @returns TimeRange instance or null if invalid
   */
  static fromStrings(startTime: string, endTime: string): TimeRange | null {
    try {
      return new TimeRange(startTime, endTime);
    } catch {
      return null;
    }
  }

  /**
   * Validates if time strings can be used to create a TimeRange instance
   *
   * @param startTime - Start time to validate
   * @param endTime - End time to validate
   * @returns True if times are valid for TimeRange creation
   */
  static isValid(startTime: string, endTime: string): boolean {
    return TimeRange.fromStrings(startTime, endTime) !== null;
  }

  // Private helper methods

  /**
   * Validates time format
   *
   * @param time - Time string to validate
   * @throws Error if time format is invalid
   */
  private validateTimeFormat(time: string): void {
    if (!time || typeof time !== 'string') {
      throw new Error('Time must be a non-empty string');
    }

    if (!TimeRange.TIME_REGEX.test(time)) {
      throw new Error(
        `Invalid time format: "${time}". Expected format: HH:mm (24-hour format, e.g., "09:00", "17:30")`,
      );
    }
  }

  /**
   * Parses a time string in "HH:mm" format to minutes since midnight
   *
   * @param time - Time string in "HH:mm" format
   * @returns Minutes since midnight (0-1439)
   */
  private parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Converts minutes since midnight to "HH:mm" format string
   *
   * @param minutes - Minutes since midnight (0-1439)
   * @returns Time string in "HH:mm" format
   */
  private minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}
