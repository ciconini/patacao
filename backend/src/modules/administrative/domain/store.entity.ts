/**
 * Store Domain Entity
 * 
 * Represents a store location in the petshop management system.
 * A Store belongs to a Company and can have multiple staff members assigned.
 * This is a pure domain entity with no framework dependencies.
 * 
 * Business Rules:
 * - A Store must be linked to a Company (invariant)
 * - Store name is required
 * - Opening hours are required and must be valid
 * - Staff schedules cannot place staff outside opening hours
 * - Invoice numbering and fiscal settings can be store-scoped or inherit Company defaults
 */

export interface Address {
  readonly street: string;
  readonly city: string;
  readonly postalCode: string;
  readonly country?: string;
}

export interface DayOpeningHours {
  readonly isOpen: boolean;
  readonly openTime?: string; // Format: "HH:mm" (e.g., "09:00")
  readonly closeTime?: string; // Format: "HH:mm" (e.g., "17:00")
}

export interface WeeklyOpeningHours {
  readonly monday?: DayOpeningHours;
  readonly tuesday?: DayOpeningHours;
  readonly wednesday?: DayOpeningHours;
  readonly thursday?: DayOpeningHours;
  readonly friday?: DayOpeningHours;
  readonly saturday?: DayOpeningHours;
  readonly sunday?: DayOpeningHours;
}

export class Store {
  private readonly _id: string;
  private readonly _companyId: string;
  private _name: string;
  private _address?: Address;
  private _email?: string;
  private _phone?: string;
  private _openingHours: WeeklyOpeningHours;
  private _timezone: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Creates a new Store entity
   * 
   * @param id - Unique identifier (UUID)
   * @param companyId - Company ID that owns this store (required)
   * @param name - Store name (required)
   * @param openingHours - Weekly opening hours schedule (required)
   * @param address - Store address
   * @param email - Contact email
   * @param phone - Contact phone
   * @param timezone - Timezone (default: Europe/Lisbon)
   * @param createdAt - Creation timestamp
   * @param updatedAt - Last update timestamp
   * 
   * @throws Error if companyId is empty
   * @throws Error if name is empty
   * @throws Error if openingHours is invalid
   */
  constructor(
    id: string,
    companyId: string,
    name: string,
    openingHours: WeeklyOpeningHours,
    address?: Address,
    email?: string,
    phone?: string,
    timezone: string = 'Europe/Lisbon',
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.validateId(id);
    this.validateCompanyId(companyId);
    this.validateName(name);
    this.validateOpeningHours(openingHours);

    if (address) {
      this.validateAddress(address);
    }

    if (email) {
      this.validateEmail(email);
    }

    this._id = id;
    this._companyId = companyId;
    this._name = name;
    this._address = address ? { ...address } : undefined;
    this._email = email;
    this._phone = phone;
    this._openingHours = this.deepCopyOpeningHours(openingHours);
    this._timezone = timezone;
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
    this._updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  // Getters (read-only access to private fields)
  get id(): string {
    return this._id;
  }

  get companyId(): string {
    return this._companyId;
  }

  get name(): string {
    return this._name;
  }

  get address(): Address | undefined {
    return this._address ? { ...this._address } : undefined;
  }

  get email(): string | undefined {
    return this._email;
  }

  get phone(): string | undefined {
    return this._phone;
  }

  get openingHours(): WeeklyOpeningHours {
    return this.deepCopyOpeningHours(this._openingHours);
  }

  get timezone(): string {
    return this._timezone;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Updates the store name
   * 
   * @param name - New store name
   * @throws Error if name is empty
   */
  updateName(name: string): void {
    this.validateName(name);
    this._name = name;
    this._updatedAt = new Date();
  }

  /**
   * Updates the store address
   * 
   * @param address - New address
   */
  updateAddress(address: Address | undefined): void {
    if (address) {
      this.validateAddress(address);
      this._address = { ...address };
    } else {
      this._address = undefined;
    }
    this._updatedAt = new Date();
  }

  /**
   * Updates the store email
   * 
   * @param email - New email address
   * @throws Error if email format is invalid
   */
  updateEmail(email: string | undefined): void {
    if (email) {
      this.validateEmail(email);
    }
    this._email = email;
    this._updatedAt = new Date();
  }

  /**
   * Updates the store phone number
   * 
   * @param phone - New phone number
   */
  updatePhone(phone: string | undefined): void {
    this._phone = phone;
    this._updatedAt = new Date();
  }

  /**
   * Updates the opening hours schedule
   * 
   * @param openingHours - New opening hours schedule
   * @throws Error if opening hours are invalid
   */
  updateOpeningHours(openingHours: WeeklyOpeningHours): void {
    this.validateOpeningHours(openingHours);
    this._openingHours = this.deepCopyOpeningHours(openingHours);
    this._updatedAt = new Date();
  }

  /**
   * Updates the timezone
   * 
   * @param timezone - New timezone (e.g., "Europe/Lisbon")
   */
  updateTimezone(timezone: string): void {
    if (!timezone || timezone.trim().length === 0) {
      throw new Error('Timezone cannot be empty');
    }
    this._timezone = timezone;
    this._updatedAt = new Date();
  }

  /**
   * Gets opening hours for a specific day
   * 
   * @param dayOfWeek - Day name (monday, tuesday, etc.)
   * @returns Opening hours for the day, or undefined if not set
   */
  getDayOpeningHours(dayOfWeek: keyof WeeklyOpeningHours): DayOpeningHours | undefined {
    return this._openingHours[dayOfWeek] ? { ...this._openingHours[dayOfWeek]! } : undefined;
  }

  /**
   * Updates opening hours for a specific day
   * 
   * @param dayOfWeek - Day name (monday, tuesday, etc.)
   * @param hours - Opening hours for the day
   * @throws Error if hours are invalid
   */
  updateDayOpeningHours(dayOfWeek: keyof WeeklyOpeningHours, hours: DayOpeningHours | undefined): void {
    if (hours) {
      this.validateDayOpeningHours(hours);
    }

    const updated = { ...this._openingHours };
    if (hours) {
      updated[dayOfWeek] = { ...hours };
    } else {
      delete updated[dayOfWeek];
    }

    this.validateOpeningHours(updated);
    this._openingHours = updated;
    this._updatedAt = new Date();
  }

  /**
   * Checks if the store is open on a specific day
   * 
   * @param dayOfWeek - Day name (monday, tuesday, etc.)
   * @returns True if store is open on that day
   */
  isOpenOnDay(dayOfWeek: keyof WeeklyOpeningHours): boolean {
    const dayHours = this._openingHours[dayOfWeek];
    return dayHours ? dayHours.isOpen : false;
  }

  /**
   * Checks if the store is open at a specific time on a specific day
   * 
   * @param dayOfWeek - Day name (monday, tuesday, etc.)
   * @param time - Time to check (format: "HH:mm")
   * @returns True if store is open at that time
   */
  isOpenAtTime(dayOfWeek: keyof WeeklyOpeningHours, time: string): boolean {
    const dayHours = this._openingHours[dayOfWeek];
    if (!dayHours || !dayHours.isOpen || !dayHours.openTime || !dayHours.closeTime) {
      return false;
    }

    const checkTime = this.parseTime(time);
    const openTime = this.parseTime(dayHours.openTime);
    const closeTime = this.parseTime(dayHours.closeTime);

    return checkTime >= openTime && checkTime <= closeTime;
  }

  /**
   * Checks if a time range falls within opening hours for a specific day
   * 
   * @param dayOfWeek - Day name (monday, tuesday, etc.)
   * @param startTime - Start time (format: "HH:mm")
   * @param endTime - End time (format: "HH:mm")
   * @returns True if the time range is within opening hours
   */
  isTimeRangeWithinOpeningHours(
    dayOfWeek: keyof WeeklyOpeningHours,
    startTime: string,
    endTime: string
  ): boolean {
    const dayHours = this._openingHours[dayOfWeek];
    if (!dayHours || !dayHours.isOpen || !dayHours.openTime || !dayHours.closeTime) {
      return false;
    }

    const rangeStart = this.parseTime(startTime);
    const rangeEnd = this.parseTime(endTime);
    const openTime = this.parseTime(dayHours.openTime);
    const closeTime = this.parseTime(dayHours.closeTime);

    return rangeStart >= openTime && rangeEnd <= closeTime;
  }

  /**
   * Checks if the store has complete address information
   */
  hasCompleteAddress(): boolean {
    return !!this._address && 
           !!this._address.street && 
           !!this._address.city && 
           !!this._address.postalCode;
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Store ID is required');
    }
  }

  private validateCompanyId(companyId: string): void {
    if (!companyId || companyId.trim().length === 0) {
      throw new Error('Company ID is required - a Store must be linked to a Company');
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Store name is required');
    }

    if (name.trim().length > 255) {
      throw new Error('Store name cannot exceed 255 characters');
    }
  }

  private validateAddress(address: Address): void {
    if (!address.street || address.street.trim().length === 0) {
      throw new Error('Address street is required');
    }

    if (!address.city || address.city.trim().length === 0) {
      throw new Error('Address city is required');
    }

    if (!address.postalCode || address.postalCode.trim().length === 0) {
      throw new Error('Address postal code is required');
    }

    const postalCodeRegex = /^\d{4}-\d{3}$/;
    if (!postalCodeRegex.test(address.postalCode.trim())) {
      throw new Error('Invalid Portuguese postal code format. Expected format: XXXX-XXX');
    }
  }

  private validateEmail(email: string): void {
    if (!email || email.trim().length === 0) {
      throw new Error('Email cannot be empty');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Invalid email format');
    }

    if (email.length > 255) {
      throw new Error('Email cannot exceed 255 characters');
    }
  }

  private validateOpeningHours(openingHours: WeeklyOpeningHours): void {
    const days: (keyof WeeklyOpeningHours)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    let hasAtLeastOneOpenDay = false;
    
    for (const day of days) {
      const dayHours = openingHours[day];
      if (dayHours) {
        this.validateDayOpeningHours(dayHours);
        if (dayHours.isOpen) {
          hasAtLeastOneOpenDay = true;
        }
      }
    }

    if (!hasAtLeastOneOpenDay) {
      throw new Error('Store must have at least one day with opening hours');
    }
  }

  private validateDayOpeningHours(hours: DayOpeningHours): void {
    if (hours.isOpen) {
      if (!hours.openTime || !hours.closeTime) {
        throw new Error('Open days must have both openTime and closeTime');
      }

      // Validate time format (HH:mm)
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      
      if (!timeRegex.test(hours.openTime)) {
        throw new Error(`Invalid open time format: ${hours.openTime}. Expected format: HH:mm`);
      }

      if (!timeRegex.test(hours.closeTime)) {
        throw new Error(`Invalid close time format: ${hours.closeTime}. Expected format: HH:mm`);
      }

      // Validate that close time is after open time
      const open = this.parseTime(hours.openTime);
      const close = this.parseTime(hours.closeTime);

      if (close <= open) {
        throw new Error('Close time must be after open time');
      }
    } else {
      // If closed, times should not be set
      if (hours.openTime || hours.closeTime) {
        throw new Error('Closed days should not have openTime or closeTime');
      }
    }
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes; // Convert to minutes since midnight
  }

  private deepCopyOpeningHours(hours: WeeklyOpeningHours): WeeklyOpeningHours {
    const copy: any = {};
    const days: (keyof WeeklyOpeningHours)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of days) {
      const dayHours = hours[day];
      if (dayHours) {
        copy[day] = { ...dayHours };
      }
    }
    
    return copy as WeeklyOpeningHours;
  }
}

