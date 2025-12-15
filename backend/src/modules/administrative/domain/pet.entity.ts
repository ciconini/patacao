/**
 * Pet Domain Entity
 * 
 * Represents a pet (animal) owned by a customer in the petshop management system.
 * This is a pure domain entity with no framework dependencies.
 * 
 * Business Rules:
 * - A Pet must be linked to a Customer (invariant)
 * - Microchip ID format must be validated when provided
 * - Age is calculated from date_of_birth, not stored
 * - Vaccination dates are tracked for health management
 */

export interface VaccinationRecord {
  readonly vaccineType: string;
  readonly administeredDate: Date;
  readonly nextDueDate?: Date;
  readonly veterinarian?: string;
  readonly batchNumber?: string;
}

export class Pet {
  private readonly _id: string;
  private readonly _customerId: string;
  private _name: string;
  private _species?: string;
  private _breed?: string;
  private _dateOfBirth?: Date;
  private _microchipId?: string;
  private _medicalNotes?: string;
  private _vaccinationRecords: VaccinationRecord[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  /**
   * Creates a new Pet entity
   * 
   * @param id - Unique identifier (UUID)
   * @param customerId - Customer ID that owns this pet (required)
   * @param name - Pet's name (required)
   * @param species - Species (e.g., "dog", "cat")
   * @param breed - Breed name
   * @param dateOfBirth - Date of birth
   * @param microchipId - Microchip identification number
   * @param medicalNotes - Medical history and notes
   * @param vaccinationRecords - List of vaccination records
   * @param createdAt - Creation timestamp
   * @param updatedAt - Last update timestamp
   * 
   * @throws Error if customerId is empty or invalid
   * @throws Error if name is empty
   * @throws Error if microchipId format is invalid (when provided)
   */
  constructor(
    id: string,
    customerId: string,
    name: string,
    species?: string,
    breed?: string,
    dateOfBirth?: Date,
    microchipId?: string,
    medicalNotes?: string,
    vaccinationRecords: VaccinationRecord[] = [],
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.validateId(id);
    this.validateCustomerId(customerId);
    this.validateName(name);
    
    if (microchipId) {
      this.validateMicrochipId(microchipId);
    }

    this._id = id;
    this._customerId = customerId;
    this._name = name;
    this._species = species;
    this._breed = breed;
    this._dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
    this._microchipId = microchipId;
    this._medicalNotes = medicalNotes;
    this._vaccinationRecords = vaccinationRecords.map(record => this.copyVaccinationRecord(record));
    this._createdAt = createdAt ? new Date(createdAt) : new Date();
    this._updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  // Getters (read-only access to private fields)
  get id(): string {
    return this._id;
  }

  get customerId(): string {
    return this._customerId;
  }

  get name(): string {
    return this._name;
  }

  get species(): string | undefined {
    return this._species;
  }

  get breed(): string | undefined {
    return this._breed;
  }

  get dateOfBirth(): Date | undefined {
    return this._dateOfBirth ? new Date(this._dateOfBirth) : undefined;
  }

  get microchipId(): string | undefined {
    return this._microchipId;
  }

  get medicalNotes(): string | undefined {
    return this._medicalNotes;
  }

  get vaccinationRecords(): ReadonlyArray<VaccinationRecord> {
    return this._vaccinationRecords.map(record => this.copyVaccinationRecord(record));
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  /**
   * Calculates the pet's age in years
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
   * Calculates the pet's age in months
   * Returns undefined if date of birth is not set
   */
  calculateAgeInMonths(): number | undefined {
    if (!this._dateOfBirth) {
      return undefined;
    }

    const today = new Date();
    const birthDate = new Date(this._dateOfBirth);
    const years = today.getFullYear() - birthDate.getFullYear();
    const months = today.getMonth() - birthDate.getMonth();
    
    return years * 12 + months;
  }

  /**
   * Updates the pet's name
   * 
   * @param newName - New name for the pet
   * @throws Error if name is empty
   */
  updateName(newName: string): void {
    this.validateName(newName);
    this._name = newName;
    this._updatedAt = new Date();
  }

  /**
   * Updates the pet's species
   * 
   * @param species - Species name (e.g., "dog", "cat")
   */
  updateSpecies(species: string | undefined): void {
    this._species = species;
    this._updatedAt = new Date();
  }

  /**
   * Updates the pet's breed
   * 
   * @param breed - Breed name
   */
  updateBreed(breed: string | undefined): void {
    this._breed = breed;
    this._updatedAt = new Date();
  }

  /**
   * Updates the pet's date of birth
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
   * Updates or sets the microchip ID
   * 
   * @param microchipId - Microchip identification number
   * @throws Error if microchip format is invalid
   */
  updateMicrochipId(microchipId: string | undefined): void {
    if (microchipId) {
      this.validateMicrochipId(microchipId);
    }
    
    this._microchipId = microchipId;
    this._updatedAt = new Date();
  }

  /**
   * Updates medical notes
   * 
   * @param notes - Medical history and notes
   */
  updateMedicalNotes(notes: string | undefined): void {
    this._medicalNotes = notes;
    this._updatedAt = new Date();
  }

  /**
   * Adds a vaccination record
   * 
   * @param record - Vaccination record to add
   * @throws Error if record is invalid
   */
  addVaccinationRecord(record: VaccinationRecord): void {
    this.validateVaccinationRecord(record);
    this._vaccinationRecords.push(this.copyVaccinationRecord(record));
    this._updatedAt = new Date();
  }

  /**
   * Removes a vaccination record by index
   * 
   * @param index - Index of the record to remove
   * @throws Error if index is out of bounds
   */
  removeVaccinationRecord(index: number): void {
    if (index < 0 || index >= this._vaccinationRecords.length) {
      throw new Error('Vaccination record index out of bounds');
    }

    this._vaccinationRecords.splice(index, 1);
    this._updatedAt = new Date();
  }

  /**
   * Gets all vaccination records that are due or overdue
   * 
   * @param referenceDate - Date to check against (defaults to today)
   * @returns Array of vaccination records that need attention (copies with new Date instances)
   */
  getDueVaccinations(referenceDate: Date = new Date()): VaccinationRecord[] {
    return this._vaccinationRecords
      .filter(record => {
        if (!record.nextDueDate) {
          return false;
        }
        return new Date(record.nextDueDate) <= referenceDate;
      })
      .map(record => this.copyVaccinationRecord(record));
  }

  /**
   * Gets the most recent vaccination record for a specific vaccine type
   * 
   * @param vaccineType - Type of vaccine to search for
   * @returns Most recent vaccination record or undefined (copy with new Date instances)
   */
  getLatestVaccination(vaccineType: string): VaccinationRecord | undefined {
    const records = this._vaccinationRecords
      .filter(record => record.vaccineType.toLowerCase() === vaccineType.toLowerCase())
      .sort((a, b) => {
        const dateA = new Date(a.administeredDate).getTime();
        const dateB = new Date(b.administeredDate).getTime();
        return dateB - dateA;
      });

    return records.length > 0 ? this.copyVaccinationRecord(records[0]) : undefined;
  }

  /**
   * Checks if the pet has a valid microchip ID
   */
  hasMicrochip(): boolean {
    return !!this._microchipId && this._microchipId.trim().length > 0;
  }

  /**
   * Checks if the pet is a puppy/kitten (less than 1 year old)
   */
  isYoung(): boolean {
    const age = this.calculateAge();
    return age !== undefined && age < 1;
  }

  /**
   * Checks if the pet is a senior (typically 7+ years for dogs, 10+ years for cats)
   */
  isSenior(): boolean {
    const age = this.calculateAge();
    if (age === undefined) {
      return false;
    }

    const species = this._species?.toLowerCase();
    if (species === 'dog') {
      return age >= 7;
    } else if (species === 'cat') {
      return age >= 10;
    }

    // Default threshold for other species
    return age >= 7;
  }

  // Private helper methods

  /**
   * Creates a deep copy of a vaccination record with new Date instances
   * Ensures immutability and prevents external mutation
   */
  private copyVaccinationRecord(record: VaccinationRecord): VaccinationRecord {
    return {
      vaccineType: record.vaccineType,
      administeredDate: new Date(record.administeredDate),
      nextDueDate: record.nextDueDate ? new Date(record.nextDueDate) : undefined,
      veterinarian: record.veterinarian,
      batchNumber: record.batchNumber,
    };
  }

  // Private validation methods

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Pet ID is required');
    }
  }

  private validateCustomerId(customerId: string): void {
    if (!customerId || customerId.trim().length === 0) {
      throw new Error('Customer ID is required - a Pet must be linked to a Customer');
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Pet name is required');
    }

    if (name.trim().length > 100) {
      throw new Error('Pet name cannot exceed 100 characters');
    }
  }

  /**
   * Validates microchip ID format
   * Supports ISO 11784/11785 format (15 digits) and other common formats
   * 
   * @param microchipId - Microchip ID to validate
   * @throws Error if format is invalid
   */
  private validateMicrochipId(microchipId: string): void {
    if (!microchipId || microchipId.trim().length === 0) {
      throw new Error('Microchip ID cannot be empty');
    }

    const trimmed = microchipId.trim();

    // ISO 11784/11785 format: 15 digits
    const isoFormat = /^\d{15}$/;
    
    // Alternative formats: 9-10 digits (common in some regions)
    const alternativeFormat = /^\d{9,10}$/;

    // Alphanumeric format (some newer chips)
    const alphanumericFormat = /^[A-Z0-9]{9,15}$/i;

    if (!isoFormat.test(trimmed) && 
        !alternativeFormat.test(trimmed) && 
        !alphanumericFormat.test(trimmed)) {
      throw new Error(
        'Invalid microchip ID format. Expected ISO 11784/11785 (15 digits), ' +
        '9-10 digits, or alphanumeric format (9-15 characters)'
      );
    }
  }

  private validateVaccinationRecord(record: VaccinationRecord): void {
    if (!record.vaccineType || record.vaccineType.trim().length === 0) {
      throw new Error('Vaccine type is required');
    }

    if (!record.administeredDate) {
      throw new Error('Administered date is required');
    }

    const adminDate = new Date(record.administeredDate);
    const today = new Date();

    if (adminDate > today) {
      throw new Error('Administered date cannot be in the future');
    }

    if (record.nextDueDate) {
      const dueDate = new Date(record.nextDueDate);
      if (dueDate < adminDate) {
        throw new Error('Next due date cannot be before administered date');
      }
    }
  }
}

