/**
 * Employee Domain Entity
 * 
 * Represents an employee (staff member) in the petshop management system.
 * This entity represents employment/HR information, distinct from User which handles system access.
 * An Employee may be linked to a User for system access, but employment information is separate.
 * This is a pure domain entity with no framework dependencies.
 * 
 * Business Rules:
 * - An Employee must be linked to a Company (invariant)
 * - Employee number must be unique within the Company
 * - Employment start date cannot be in the future
 * - Employment end date must be after start date if provided
 * - Salary information is tracked for payroll purposes
 */

export enum EmploymentStatus {
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  TERMINATED = 'terminated',
  SUSPENDED = 'suspended',
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERN = 'intern',
}

export interface Address {
  readonly street: string;
  readonly city: string;
  readonly postalCode: string;
  readonly country?: string;
}

export class Employee {
  private readonly _id: string;
  private readonly _companyId: string;
  private _employeeNumber: string;
  private _userId?: string; // Link to User entity for system access
  private _fullName: string;
  private _email?: string;
  private _phone?: string;
  private _address?: Address;
  private _nif?: string; // Portuguese tax ID
  private _dateOfBirth?: Date;
  private _employmentStartDate: Date;
  private _employmentEndDate?: Date;
  private _employmentStatus: EmploymentStatus;
  private _employmentType: EmploymentType;
  private _position?: string; // Job title/position
  private _department?: string;
  private _storeIds: string[]; // Stores where employee works
  private _salary?: number; // Monthly salary
  private _hourlyRate?: number; // Hourly rate for part-time/contract
  private _emergencyContactName?: string;
  private _emergencyContactPhone?: string;
  private _notes?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Creates a new Employee entity
   * 
   * @param id - Unique identifier (UUID)
   * @param companyId - Company ID that employs this person (required)
   * @param employeeNumber - Unique employee number within company (required)
   * @param fullName - Employee's full name (required)
   * @param employmentStartDate - Date when employment started (required)
   * @param employmentStatus - Current employment status (default ACTIVE)
   * @param employmentType - Type of employment (default FULL_TIME)
   * @param userId - Link to User entity for system access
   * @param email - Contact email
   * @param phone - Contact phone
   * @param address - Employee's address
   * @param nif - Portuguese NIF (tax identification number)
   * @param dateOfBirth - Date of birth
   * @param employmentEndDate - Date when employment ended (if applicable)
   * @param position - Job title/position
   * @param department - Department name
   * @param storeIds - List of Store IDs where employee works
   * @param salary - Monthly salary
   * @param hourlyRate - Hourly rate
   * @param emergencyContactName - Emergency contact name
   * @param emergencyContactPhone - Emergency contact phone
   * @param notes - Additional notes
   * @param createdAt - Creation timestamp
   * @param updatedAt - Last update timestamp
   * 
   * @throws Error if companyId is empty
   * @throws Error if employeeNumber is empty
   * @throws Error if fullName is empty
   * @throws Error if employmentStartDate is in the future
   * @throws Error if employmentEndDate is before start date
   * @throws Error if nif format is invalid (when provided)
   */
  constructor(
    id: string,
    companyId: string,
    employeeNumber: string,
    fullName: string,
    employmentStartDate: Date,
    employmentStatus: EmploymentStatus = EmploymentStatus.ACTIVE,
    employmentType: EmploymentType = EmploymentType.FULL_TIME,
    userId?: string,
    email?: string,
    phone?: string,
    address?: Address,
    nif?: string,
    dateOfBirth?: Date,
    employmentEndDate?: Date,
    position?: string,
    department?: string,
    storeIds: string[] = [],
    salary?: number,
    hourlyRate?: number,
    emergencyContactName?: string,
    emergencyContactPhone?: string,
    notes?: string,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.validateId(id);
    this.validateCompanyId(companyId);
    this.validateEmployeeNumber(employeeNumber);
    this.validateFullName(fullName);
    this.validateEmploymentStartDate(employmentStartDate);
    
    if (employmentEndDate) {
      this.validateEmploymentEndDate(employmentStartDate, employmentEndDate);
    }

    if (nif) {
      this.validateNif(nif);
    }

    if (address) {
      this.validateAddress(address);
    }

    if (email) {
      this.validateEmail(email);
    }

    if (salary !== undefined && salary < 0) {
      throw new Error('Salary cannot be negative');
    }

    if (hourlyRate !== undefined && hourlyRate < 0) {
      throw new Error('Hourly rate cannot be negative');
    }

    this._id = id;
    this._companyId = companyId;
    this._employeeNumber = employeeNumber;
    this._userId = userId;
    this._fullName = fullName;
    this._email = email;
    this._phone = phone;
    this._address = address ? { ...address } : undefined;
    this._nif = nif;
    this._dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
    this._employmentStartDate = new Date(employmentStartDate);
    this._employmentEndDate = employmentEndDate ? new Date(employmentEndDate) : undefined;
    this._employmentStatus = employmentStatus;
    this._employmentType = employmentType;
    this._position = position;
    this._department = department;
    this._storeIds = [...storeIds];
    this._salary = salary;
    this._hourlyRate = hourlyRate;
    this._emergencyContactName = emergencyContactName;
    this._emergencyContactPhone = emergencyContactPhone;
    this._notes = notes;
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

  get employeeNumber(): string {
    return this._employeeNumber;
  }

  get userId(): string | undefined {
    return this._userId;
  }

  get fullName(): string {
    return this._fullName;
  }

  get email(): string | undefined {
    return this._email;
  }

  get phone(): string | undefined {
    return this._phone;
  }

  get address(): Address | undefined {
    return this._address ? { ...this._address } : undefined;
  }

  get nif(): string | undefined {
    return this._nif;
  }

  get dateOfBirth(): Date | undefined {
    return this._dateOfBirth ? new Date(this._dateOfBirth) : undefined;
  }

  get employmentStartDate(): Date {
    return new Date(this._employmentStartDate);
  }

  get employmentEndDate(): Date | undefined {
    return this._employmentEndDate ? new Date(this._employmentEndDate) : undefined;
  }

  get employmentStatus(): EmploymentStatus {
    return this._employmentStatus;
  }

  get employmentType(): EmploymentType {
    return this._employmentType;
  }

  get position(): string | undefined {
    return this._position;
  }

  get department(): string | undefined {
    return this._department;
  }

  get storeIds(): ReadonlyArray<string> {
    return [...this._storeIds];
  }

  get salary(): number | undefined {
    return this._salary;
  }

  get hourlyRate(): number | undefined {
    return this._hourlyRate;
  }

  get emergencyContactName(): string | undefined {
    return this._emergencyContactName;
  }

  get emergencyContactPhone(): string | undefined {
    return this._emergencyContactPhone;
  }

  get notes(): string | undefined {
    return this._notes;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Updates the employee number
   * 
   * @param employeeNumber - New employee number
   * @throws Error if employeeNumber is empty
   */
  updateEmployeeNumber(employeeNumber: string): void {
    this.validateEmployeeNumber(employeeNumber);
    this._employeeNumber = employeeNumber;
    this._updatedAt = new Date();
  }

  /**
   * Links the employee to a User entity for system access
   * 
   * @param userId - User ID to link
   */
  linkToUser(userId: string): void {
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID cannot be empty');
    }
    this._userId = userId;
    this._updatedAt = new Date();
  }

  /**
   * Unlinks the employee from User entity
   */
  unlinkFromUser(): void {
    this._userId = undefined;
    this._updatedAt = new Date();
  }

  /**
   * Updates the employee's full name
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
   * Updates the employee's email
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
   * Updates the employee's phone number
   * 
   * @param phone - New phone number
   */
  updatePhone(phone: string | undefined): void {
    this._phone = phone;
    this._updatedAt = new Date();
  }

  /**
   * Updates the employee's address
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
   * Updates the NIF (Portuguese tax ID)
   * 
   * @param nif - NIF number
   * @throws Error if NIF format is invalid
   */
  updateNif(nif: string | undefined): void {
    if (nif) {
      this.validateNif(nif);
    }
    this._nif = nif;
    this._updatedAt = new Date();
  }

  /**
   * Updates the date of birth
   * 
   * @param dateOfBirth - Date of birth
   * @throws Error if date is in the future
   */
  updateDateOfBirth(dateOfBirth: Date | undefined): void {
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      
      if (birthDate > today) {
        throw new Error('Date of birth cannot be in the future');
      }
    }

    this._dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
    this._updatedAt = new Date();
  }

  /**
   * Updates the employment start date
   * 
   * @param startDate - Employment start date
   * @throws Error if date is in the future or after end date
   */
  updateEmploymentStartDate(startDate: Date): void {
    this.validateEmploymentStartDate(startDate);
    
    if (this._employmentEndDate && new Date(startDate) > this._employmentEndDate) {
      throw new Error('Employment start date cannot be after end date');
    }

    this._employmentStartDate = new Date(startDate);
    this._updatedAt = new Date();
  }

  /**
   * Updates the employment end date
   * 
   * @param endDate - Employment end date
   * @throws Error if date is before start date
   */
  updateEmploymentEndDate(endDate: Date | undefined): void {
    if (endDate) {
      this.validateEmploymentEndDate(this._employmentStartDate, endDate);
      this._employmentEndDate = new Date(endDate);
    } else {
      this._employmentEndDate = undefined;
    }
    this._updatedAt = new Date();
  }

  /**
   * Updates the employment status
   * 
   * @param status - New employment status
   */
  updateEmploymentStatus(status: EmploymentStatus): void {
    this._employmentStatus = status;
    this._updatedAt = new Date();
  }

  /**
   * Updates the employment type
   * 
   * @param type - New employment type
   */
  updateEmploymentType(type: EmploymentType): void {
    this._employmentType = type;
    this._updatedAt = new Date();
  }

  /**
   * Updates the position/job title
   * 
   * @param position - New position
   */
  updatePosition(position: string | undefined): void {
    this._position = position;
    this._updatedAt = new Date();
  }

  /**
   * Updates the department
   * 
   * @param department - New department
   */
  updateDepartment(department: string | undefined): void {
    this._department = department;
    this._updatedAt = new Date();
  }

  /**
   * Assigns the employee to a store
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
   * Removes the employee from a store
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
   * Updates the monthly salary
   * 
   * @param salary - New monthly salary
   * @throws Error if salary is negative
   */
  updateSalary(salary: number | undefined): void {
    if (salary !== undefined && salary < 0) {
      throw new Error('Salary cannot be negative');
    }
    this._salary = salary;
    this._updatedAt = new Date();
  }

  /**
   * Updates the hourly rate
   * 
   * @param hourlyRate - New hourly rate
   * @throws Error if hourly rate is negative
   */
  updateHourlyRate(hourlyRate: number | undefined): void {
    if (hourlyRate !== undefined && hourlyRate < 0) {
      throw new Error('Hourly rate cannot be negative');
    }
    this._hourlyRate = hourlyRate;
    this._updatedAt = new Date();
  }

  /**
   * Updates emergency contact information
   * 
   * @param name - Emergency contact name
   * @param phone - Emergency contact phone
   */
  updateEmergencyContact(name: string | undefined, phone: string | undefined): void {
    this._emergencyContactName = name;
    this._emergencyContactPhone = phone;
    this._updatedAt = new Date();
  }

  /**
   * Updates additional notes
   * 
   * @param notes - Notes
   */
  updateNotes(notes: string | undefined): void {
    this._notes = notes;
    this._updatedAt = new Date();
  }

  /**
   * Terminates the employee
   * 
   * @param endDate - Termination date (defaults to today)
   */
  terminate(endDate: Date = new Date()): void {
    this.updateEmploymentEndDate(endDate);
    this.updateEmploymentStatus(EmploymentStatus.TERMINATED);
  }

  /**
   * Calculates the employee's age in years
   * Returns undefined if date of birth is not set
   */
  calculateAge(): number | undefined {
    if (!this._dateOfBirth) {
      return undefined;
    }

    const today = new Date();
    const birthDate = new Date(this._dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Calculates years of service
   * Returns 0 if start date is in the future
   */
  calculateYearsOfService(): number {
    const today = new Date();
    const startDate = new Date(this._employmentStartDate);
    
    if (startDate > today) {
      return 0;
    }

    const endDate = this._employmentEndDate ? new Date(this._employmentEndDate) : today;
    let years = endDate.getFullYear() - startDate.getFullYear();
    const monthDiff = endDate.getMonth() - startDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < startDate.getDate())) {
      years--;
    }

    return Math.max(0, years);
  }

  /**
   * Checks if the employee is currently active
   */
  isActive(): boolean {
    return this._employmentStatus === EmploymentStatus.ACTIVE && !this._employmentEndDate;
  }

  /**
   * Checks if the employee has a valid NIF
   */
  hasNif(): boolean {
    return !!this._nif && this._nif.trim().length > 0;
  }

  /**
   * Checks if the employee is assigned to a specific store
   * 
   * @param storeId - Store ID to check
   * @returns True if employee is assigned to the store
   */
  isAssignedToStore(storeId: string): boolean {
    return this._storeIds.includes(storeId);
  }

  /**
   * Checks if the employee is linked to a User account
   */
  hasUserAccount(): boolean {
    return !!this._userId;
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Employee ID is required');
    }
  }

  private validateCompanyId(companyId: string): void {
    if (!companyId || companyId.trim().length === 0) {
      throw new Error('Company ID is required - an Employee must be linked to a Company');
    }
  }

  private validateEmployeeNumber(employeeNumber: string): void {
    if (!employeeNumber || employeeNumber.trim().length === 0) {
      throw new Error('Employee number is required');
    }

    if (employeeNumber.trim().length > 50) {
      throw new Error('Employee number cannot exceed 50 characters');
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

  private validateEmploymentStartDate(startDate: Date): void {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Allow today as valid
    
    if (new Date(startDate) > today) {
      throw new Error('Employment start date cannot be in the future');
    }
  }

  private validateEmploymentEndDate(startDate: Date, endDate: Date): void {
    if (new Date(endDate) < new Date(startDate)) {
      throw new Error('Employment end date cannot be before start date');
    }
  }

  /**
   * Validates Portuguese NIF (Número de Identificação Fiscal) format
   */
  private validateNif(nif: string): void {
    if (!nif || nif.trim().length === 0) {
      throw new Error('NIF cannot be empty');
    }

    const trimmed = nif.trim().replace(/\s/g, '');

    if (!/^\d{9}$/.test(trimmed)) {
      throw new Error('NIF must be exactly 9 digits');
    }

    if (!this.isValidNifCheckDigit(trimmed)) {
      throw new Error('Invalid NIF check digit');
    }
  }

  private isValidNifCheckDigit(nif: string): boolean {
    if (nif.length !== 9) {
      return false;
    }

    const digits = nif.split('').map(Number);
    const weights = [9, 8, 7, 6, 5, 4, 3, 2];
    
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += digits[i] * weights[i];
    }

    const remainder = sum % 11;
    let checkDigit = 11 - remainder;
    
    if (checkDigit >= 10) {
      checkDigit = 0;
    }

    return checkDigit === digits[8];
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
}

