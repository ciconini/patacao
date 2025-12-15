/**
 * User Domain Entity
 * 
 * Represents a system user (staff, managers, accountants, veterinarians) in the petshop management system.
 * This entity represents people who log into the system, distinct from Customers who are clients.
 * This is a pure domain entity with no framework dependencies.
 * 
 * Business Rules:
 * - A User must have at least one Role to access the system (invariant)
 * - Email must be unique across all users
 * - Username must be unique if provided
 * - Password hash is stored securely (domain doesn't handle hashing)
 * - Working hours are optional and used for staff scheduling
 * - Service skills track which services a user can perform
 */

export interface WorkingHours {
  readonly startTime: string; // Format: "HH:mm" (e.g., "09:00")
  readonly endTime: string; // Format: "HH:mm" (e.g., "17:00")
  readonly isAvailable: boolean;
}

export interface WeeklySchedule {
  readonly monday?: WorkingHours;
  readonly tuesday?: WorkingHours;
  readonly wednesday?: WorkingHours;
  readonly thursday?: WorkingHours;
  readonly friday?: WorkingHours;
  readonly saturday?: WorkingHours;
  readonly sunday?: WorkingHours;
}

export class User {
  private readonly _id: string;
  private _email: string;
  private _fullName: string;
  private _phone?: string;
  private _username?: string;
  private _passwordHash?: string;
  private _roleIds: string[];
  private _storeIds: string[];
  private _workingHours?: WeeklySchedule;
  private _serviceSkills: string[];
  private _active: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Creates a new User entity
   * 
   * @param id - Unique identifier (UUID)
   * @param email - Email address (required, must be unique)
   * @param fullName - User's full name (required)
   * @param roleIds - List of Role IDs (required, must have at least one)
   * @param phone - Contact phone number
   * @param username - Username for login (optional, must be unique if provided)
   * @param passwordHash - Hashed password (optional, for secure storage)
   * @param storeIds - List of Store IDs this user is assigned to
   * @param workingHours - Weekly working hours schedule
   * @param serviceSkills - List of Service IDs or skill tags
   * @param active - Whether the user is active (default true)
   * @param createdAt - Creation timestamp
   * @param updatedAt - Last update timestamp
   * 
   * @throws Error if id is empty
   * @throws Error if email is empty or invalid
   * @throws Error if fullName is empty
   * @throws Error if roleIds is empty (must have at least one role)
   */
  constructor(
    id: string,
    email: string,
    fullName: string,
    roleIds: string[],
    phone?: string,
    username?: string,
    passwordHash?: string,
    storeIds: string[] = [],
    workingHours?: WeeklySchedule,
    serviceSkills: string[] = [],
    active: boolean = true,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.validateId(id);
    this.validateEmail(email);
    this.validateFullName(fullName);
    this.validateRoleIds(roleIds);

    if (username) {
      this.validateUsername(username);
    }

    if (workingHours) {
      this.validateWorkingHours(workingHours);
    }

    this._id = id;
    this._email = email;
    this._fullName = fullName;
    this._phone = phone;
    this._username = username;
    this._passwordHash = passwordHash;
    this._roleIds = [...roleIds];
    this._storeIds = [...storeIds];
    this._workingHours = workingHours ? this.deepCopySchedule(workingHours) : undefined;
    this._serviceSkills = [...serviceSkills];
    this._active = active;
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
    this._updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  // Getters (read-only access to private fields)
  get id(): string {
    return this._id;
  }

  get email(): string {
    return this._email;
  }

  get fullName(): string {
    return this._fullName;
  }

  get phone(): string | undefined {
    return this._phone;
  }

  get username(): string | undefined {
    return this._username;
  }

  get passwordHash(): string | undefined {
    return this._passwordHash;
  }

  get roleIds(): ReadonlyArray<string> {
    return [...this._roleIds];
  }

  get storeIds(): ReadonlyArray<string> {
    return [...this._storeIds];
  }

  get workingHours(): WeeklySchedule | undefined {
    return this._workingHours ? this.deepCopySchedule(this._workingHours) : undefined;
  }

  get serviceSkills(): ReadonlyArray<string> {
    return [...this._serviceSkills];
  }

  get active(): boolean {
    return this._active;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Updates the user's email address
   * 
   * @param email - New email address
   * @throws Error if email is empty or invalid
   */
  updateEmail(email: string): void {
    this.validateEmail(email);
    this._email = email;
    this._updatedAt = new Date();
  }

  /**
   * Updates the user's full name
   * 
   * @param fullName - New full name
   * @throws Error if name is empty
   */
  updateFullName(fullName: string): void {
    this.validateFullName(fullName);
    this._fullName = fullName;
    this._updatedAt = new Date();
  }

  /**
   * Updates the user's phone number
   * 
   * @param phone - New phone number
   */
  updatePhone(phone: string | undefined): void {
    this._phone = phone;
    this._updatedAt = new Date();
  }

  /**
   * Updates the user's username
   * 
   * @param username - New username
   * @throws Error if username format is invalid
   */
  updateUsername(username: string | undefined): void {
    if (username) {
      this.validateUsername(username);
    }
    this._username = username;
    this._updatedAt = new Date();
  }

  /**
   * Updates the password hash
   * Note: Password hashing should be done outside the domain layer
   * 
   * @param passwordHash - New password hash
   */
  updatePasswordHash(passwordHash: string | undefined): void {
    this._passwordHash = passwordHash;
    this._updatedAt = new Date();
  }

  /**
   * Adds a role to the user
   * 
   * @param roleId - Role ID to add
   * @throws Error if roleId is empty
   */
  addRole(roleId: string): void {
    if (!roleId || roleId.trim().length === 0) {
      throw new Error('Role ID cannot be empty');
    }

    if (!this._roleIds.includes(roleId)) {
      this._roleIds.push(roleId);
      this._updatedAt = new Date();
    }
  }

  /**
   * Removes a role from the user
   * 
   * @param roleId - Role ID to remove
   * @throws Error if removing would leave user with no roles
   */
  removeRole(roleId: string): void {
    const index = this._roleIds.indexOf(roleId);
    if (index > -1) {
      if (this._roleIds.length === 1) {
        throw new Error('User must have at least one role');
      }
      this._roleIds.splice(index, 1);
      this._updatedAt = new Date();
    }
  }

  /**
   * Replaces all roles with a new set
   * 
   * @param roleIds - New list of role IDs
   * @throws Error if roleIds is empty
   */
  setRoles(roleIds: string[]): void {
    this.validateRoleIds(roleIds);
    this._roleIds = [...roleIds];
    this._updatedAt = new Date();
  }

  /**
   * Checks if the user has a specific role
   * 
   * @param roleId - Role ID to check
   * @returns True if user has the role
   */
  hasRole(roleId: string): boolean {
    return this._roleIds.includes(roleId);
  }

  /**
   * Checks if the user has the Owner role
   * 
   * @returns True if user has Owner role
   */
  isOwner(): boolean {
    return this.hasRole('Owner');
  }

  /**
   * Assigns the user to a store
   * 
   * @param storeId - Store ID to assign
   * @throws Error if storeId is empty
   */
  assignToStore(storeId: string): void {
    if (!storeId || storeId.trim().length === 0) {
      throw new Error('Store ID cannot be empty');
    }

    if (!this._storeIds.includes(storeId)) {
      this._storeIds.push(storeId);
      this._updatedAt = new Date();
    }
  }

  /**
   * Removes the user from a store
   * 
   * @param storeId - Store ID to remove
   */
  removeFromStore(storeId: string): void {
    const index = this._storeIds.indexOf(storeId);
    if (index > -1) {
      this._storeIds.splice(index, 1);
      this._updatedAt = new Date();
    }
  }

  /**
   * Updates the working hours schedule
   * 
   * @param workingHours - New working hours schedule
   * @throws Error if schedule is invalid
   */
  updateWorkingHours(workingHours: WeeklySchedule | undefined): void {
    if (workingHours) {
      this.validateWorkingHours(workingHours);
      this._workingHours = this.deepCopySchedule(workingHours);
    } else {
      this._workingHours = undefined;
    }
    this._updatedAt = new Date();
  }

  /**
   * Gets working hours for a specific day
   * 
   * @param dayOfWeek - Day name (monday, tuesday, etc.)
   * @returns Working hours for the day, or undefined if not set
   */
  getDayWorkingHours(dayOfWeek: keyof WeeklySchedule): WorkingHours | undefined {
    return this._workingHours?.[dayOfWeek] ? { ...this._workingHours[dayOfWeek]! } : undefined;
  }

  /**
   * Updates working hours for a specific day
   * 
   * @param dayOfWeek - Day name (monday, tuesday, etc.)
   * @param hours - Working hours for the day
   * @throws Error if hours are invalid
   */
  updateDayWorkingHours(dayOfWeek: keyof WeeklySchedule, hours: WorkingHours | undefined): void {
    if (!this._workingHours) {
      this._workingHours = {};
    }

    const updated = { ...this._workingHours };
    if (hours) {
      this.validateDayWorkingHours(hours);
      updated[dayOfWeek] = { ...hours };
    } else {
      delete updated[dayOfWeek];
    }

    this._workingHours = updated;
    this._updatedAt = new Date();
  }

  /**
   * Checks if the user is available on a specific day
   * 
   * @param dayOfWeek - Day name (monday, tuesday, etc.)
   * @returns True if user is available on that day
   */
  isAvailableOnDay(dayOfWeek: keyof WeeklySchedule): boolean {
    const dayHours = this._workingHours?.[dayOfWeek];
    return dayHours ? dayHours.isAvailable : false;
  }

  /**
   * Checks if the user is available at a specific time on a specific day
   * 
   * @param dayOfWeek - Day name (monday, tuesday, etc.)
   * @param time - Time to check (format: "HH:mm")
   * @returns True if user is available at that time
   */
  isAvailableAtTime(dayOfWeek: keyof WeeklySchedule, time: string): boolean {
    const dayHours = this._workingHours?.[dayOfWeek];
    if (!dayHours || !dayHours.isAvailable || !dayHours.startTime || !dayHours.endTime) {
      return false;
    }

    const checkTime = this.parseTime(time);
    const startTime = this.parseTime(dayHours.startTime);
    const endTime = this.parseTime(dayHours.endTime);

    return checkTime >= startTime && checkTime <= endTime;
  }

  /**
   * Checks if a time range falls within user's working hours for a specific day
   * 
   * @param dayOfWeek - Day name (monday, tuesday, etc.)
   * @param startTime - Start time (format: "HH:mm")
   * @param endTime - End time (format: "HH:mm")
   * @returns True if the time range is within working hours
   */
  isTimeRangeWithinWorkingHours(
    dayOfWeek: keyof WeeklySchedule,
    startTime: string,
    endTime: string
  ): boolean {
    const dayHours = this._workingHours?.[dayOfWeek];
    if (!dayHours || !dayHours.isAvailable || !dayHours.startTime || !dayHours.endTime) {
      return false;
    }

    const rangeStart = this.parseTime(startTime);
    const rangeEnd = this.parseTime(endTime);
    const workStart = this.parseTime(dayHours.startTime);
    const workEnd = this.parseTime(dayHours.endTime);

    return rangeStart >= workStart && rangeEnd <= workEnd;
  }

  /**
   * Adds a service skill to the user
   * 
   * @param serviceId - Service ID or skill tag to add
   * @throws Error if serviceId is empty
   */
  addServiceSkill(serviceId: string): void {
    if (!serviceId || serviceId.trim().length === 0) {
      throw new Error('Service ID cannot be empty');
    }

    if (!this._serviceSkills.includes(serviceId)) {
      this._serviceSkills.push(serviceId);
      this._updatedAt = new Date();
    }
  }

  /**
   * Removes a service skill from the user
   * 
   * @param serviceId - Service ID or skill tag to remove
   */
  removeServiceSkill(serviceId: string): void {
    const index = this._serviceSkills.indexOf(serviceId);
    if (index > -1) {
      this._serviceSkills.splice(index, 1);
      this._updatedAt = new Date();
    }
  }

  /**
   * Sets all service skills
   * 
   * @param serviceSkills - New list of service skills
   */
  setServiceSkills(serviceSkills: string[]): void {
    this._serviceSkills = [...serviceSkills];
    this._updatedAt = new Date();
  }

  /**
   * Checks if the user has a specific service skill
   * 
   * @param serviceId - Service ID or skill tag to check
   * @returns True if user has the skill
   */
  hasServiceSkill(serviceId: string): boolean {
    return this._serviceSkills.includes(serviceId);
  }

  /**
   * Activates the user account
   */
  activate(): void {
    this._active = true;
    this._updatedAt = new Date();
  }

  /**
   * Deactivates the user account
   */
  deactivate(): void {
    this._active = false;
    this._updatedAt = new Date();
  }

  /**
   * Checks if the user is assigned to a specific store
   * 
   * @param storeId - Store ID to check
   * @returns True if user is assigned to the store
   */
  isAssignedToStore(storeId: string): boolean {
    return this._storeIds.includes(storeId);
  }

  /**
   * Checks if the user can perform a service based on their skills
   * 
   * @param serviceId - Service ID to check
   * @returns True if user has the required skill
   */
  canPerformService(serviceId: string): boolean {
    return this.hasServiceSkill(serviceId);
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('User ID is required');
    }
  }

  private validateEmail(email: string): void {
    if (!email || email.trim().length === 0) {
      throw new Error('Email is required');
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Invalid email format');
    }

    if (email.length > 255) {
      throw new Error('Email cannot exceed 255 characters');
    }
  }

  private validateFullName(fullName: string): void {
    if (!fullName || fullName.trim().length === 0) {
      throw new Error('Full name is required');
    }

    if (fullName.trim().length > 255) {
      throw new Error('Full name cannot exceed 255 characters');
    }
  }

  private validateUsername(username: string): void {
    if (!username || username.trim().length === 0) {
      throw new Error('Username cannot be empty');
    }

    // Username should be alphanumeric with optional underscores/hyphens
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
    }

    if (username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }

    if (username.length > 128) {
      throw new Error('Username cannot exceed 128 characters');
    }
  }

  private validateRoleIds(roleIds: string[]): void {
    if (!roleIds || roleIds.length === 0) {
      throw new Error('User must have at least one role');
    }

    for (const roleId of roleIds) {
      if (!roleId || roleId.trim().length === 0) {
        throw new Error('Role ID cannot be empty');
      }
    }

    // Check for duplicates
    const uniqueRoleIds = new Set(roleIds);
    if (uniqueRoleIds.size !== roleIds.length) {
      throw new Error('Duplicate role IDs are not allowed');
    }
  }

  private validateWorkingHours(workingHours: WeeklySchedule): void {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of days) {
      const dayHours = (workingHours as any)[day];
      if (dayHours) {
        this.validateDayWorkingHours(dayHours);
      }
    }
  }

  private validateDayWorkingHours(hours: WorkingHours): void {
    // Validate time format (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timeRegex.test(hours.startTime)) {
      throw new Error(`Invalid start time format: ${hours.startTime}. Expected format: HH:mm`);
    }

    if (!timeRegex.test(hours.endTime)) {
      throw new Error(`Invalid end time format: ${hours.endTime}. Expected format: HH:mm`);
    }

    // Validate that end time is after start time
    const start = this.parseTime(hours.startTime);
    const end = this.parseTime(hours.endTime);

    if (end <= start) {
      throw new Error('End time must be after start time');
    }
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes; // Convert to minutes since midnight
  }

  private deepCopySchedule(schedule: WeeklySchedule): WeeklySchedule {
    const copy: any = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of days) {
      const dayHours = (schedule as any)[day];
      if (dayHours) {
        copy[day] = { ...dayHours };
      }
    }
    
    return copy as WeeklySchedule;
  }
}

