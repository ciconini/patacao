/**
 * Create Pet Use Case (UC-ADMIN-008)
 *
 * Application use case for creating a new pet record linked to an existing customer.
 * This use case orchestrates domain entities and domain services to create a pet.
 *
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, Veterinarian, or Owner role required)
 * - Validate customer exists
 * - Validate input data and business rules
 * - Create Pet domain entity
 * - Persist pet via repository
 * - Create audit log entry
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Pet, VaccinationRecord } from '../domain/pet.entity';
import { Customer } from '../domain/customer.entity';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';

// Repository interfaces (ports)
export interface PetRepository {
  save(pet: Pet): Promise<Pet>;
}

export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface CreatePetInput {
  customerId: string;
  name: string;
  species?: string;
  breed?: string;
  dateOfBirth?: string; // ISO date string (YYYY-MM-DD)
  microchipId?: string;
  medicalNotes?: string;
  vaccination?: Array<{
    vaccine?: string;
    date?: string; // ISO date string
    expires?: string; // ISO date string
    administered_by?: string;
  }>;
  performedBy: string; // User ID
}

// Output model
export interface CreatePetOutput {
  id: string;
  customerId: string;
  name: string;
  species?: string | undefined;
  breed?: string | undefined;
  dateOfBirth?: Date | undefined;
  age?: number | undefined;
  microchipId?: string | undefined;
  medicalNotes?: string | undefined;
  vaccination: VaccinationRecord[];
  createdAt: Date;
  updatedAt: Date;
}

// Result type
export interface CreatePetResult {
  success: boolean;
  pet?: CreatePetOutput;
  error?: {
    code: string;
    message: string;
  };
}

// Application errors
export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message: string = 'Authentication required') {
    super('UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message: string = 'Access forbidden') {
    super('FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

export class RepositoryError extends ApplicationError {
  constructor(message: string = 'An error occurred during persistence') {
    super('REPOSITORY_ERROR', message);
    this.name = 'RepositoryError';
  }
}

/**
 * Create Pet Use Case
 */
export class CreatePetUseCase {
  constructor(
    private readonly petRepository: PetRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly userRepository: UserRepository,
    private readonly auditLogDomainService: AuditLogDomainService,
    private readonly generateId: () => string = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  ) {}

  /**
   * Executes the create pet use case
   *
   * @param input - Input data for creating pet
   * @returns Result containing created pet or error
   */
  async execute(input: CreatePetInput): Promise<CreatePetResult> {
    try {
      // 1. Validate user exists and has required role
      await this.validateUserAuthorization(input.performedBy);

      // 2. Validate and load customer
      await this.validateCustomer(input.customerId);

      // 3. Validate and normalize input data
      const validatedInput = this.validateInput(input);

      // 4. Create Pet domain entity
      const pet = this.createPetEntity(validatedInput, input.customerId);

      // 5. Persist pet via repository
      const savedPet = await this.persistPet(pet);

      // 6. Create audit log entry
      await this.createAuditLog(savedPet, input.performedBy);

      // 7. Return success result
      return {
        success: true,
        pet: this.mapToOutput(savedPet),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization (must have Staff, Manager, Veterinarian, or Owner role)
   *
   * @param userId - User ID to validate
   * @throws UnauthorizedError if user not found
   * @throws ForbiddenError if user does not have required role
   */
  private async validateUserAuthorization(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const hasRequiredRole = user.roleIds.some((roleId) => {
      try {
        const role = RoleId.fromString(roleId);
        if (!role) return false;
        return role.isStaff() || role.isManager() || role.isOwner() || role.isVeterinarian();
      } catch {
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenError('Only Staff, Manager, Veterinarian, or Owner role can create pets');
    }
  }

  /**
   * Validates and loads customer
   *
   * @param customerId - Customer ID
   * @throws NotFoundError if customer not found
   */
  private async validateCustomer(customerId: string): Promise<void> {
    const customer = await this.customerRepository.findById(customerId);

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Note: Could also check if customer is archived here
    // For now, we'll assume repository handles this
  }

  /**
   * Validates and normalizes input data
   *
   * @param input - Raw input data
   * @returns Validated and normalized input
   * @throws ValidationError if validation fails
   */
  private validateInput(input: CreatePetInput): {
    name: string;
    species?: string;
    breed?: string;
    dateOfBirth?: Date;
    microchipId?: string;
    medicalNotes?: string;
    vaccinationRecords: VaccinationRecord[];
  } {
    // Validate required fields
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError('Pet name is required and cannot be empty');
    }

    if (input.name.trim().length > 255) {
      throw new ValidationError('Pet name cannot exceed 255 characters');
    }

    if (input.species !== undefined && (!input.species || input.species.trim().length === 0)) {
      throw new ValidationError('Species cannot be empty if provided');
    }

    if (input.species && input.species.trim().length > 64) {
      throw new ValidationError('Species cannot exceed 64 characters');
    }

    if (input.breed && input.breed.trim().length > 128) {
      throw new ValidationError('Breed cannot exceed 128 characters');
    }

    // Validate date of birth
    let dateOfBirth: Date | undefined;
    if (input.dateOfBirth) {
      try {
        dateOfBirth = new Date(input.dateOfBirth);
        if (isNaN(dateOfBirth.getTime())) {
          throw new ValidationError('Date of birth must be a valid date');
        }
        // Check if date is in the future
        if (dateOfBirth > new Date()) {
          throw new ValidationError('Date of birth cannot be in the future');
        }
        // Check reasonable range (not more than 50 years ago for most pets)
        const fiftyYearsAgo = new Date();
        fiftyYearsAgo.setFullYear(fiftyYearsAgo.getFullYear() - 50);
        if (dateOfBirth < fiftyYearsAgo) {
          throw new ValidationError('Date of birth is too far in the past');
        }
      } catch (error: any) {
        if (error instanceof ValidationError) {
          throw error;
        }
        throw new ValidationError('Date of birth must be a valid date');
      }
    }

    // Validate microchip ID format (ISO 11784/11785: 15 digits)
    if (input.microchipId) {
      const microchipPattern = /^\d{15}$/;
      if (!microchipPattern.test(input.microchipId)) {
        throw new ValidationError('Microchip ID must be 15 digits (ISO 11784/11785 format)');
      }
    }

    // Validate medical notes length
    if (input.medicalNotes && input.medicalNotes.length > 5000) {
      throw new ValidationError('Medical notes cannot exceed 5000 characters');
    }

    // Validate and convert vaccination records
    const vaccinationRecords: VaccinationRecord[] = [];
    if (input.vaccination) {
      if (!Array.isArray(input.vaccination)) {
        throw new ValidationError('Vaccination must be an array');
      }

      for (const vax of input.vaccination) {
        if (!vax.vaccine || !vax.date) {
          throw new ValidationError('Vaccination records must have vaccine and date');
        }

        try {
          const administeredDate = new Date(vax.date);
          if (isNaN(administeredDate.getTime())) {
            throw new ValidationError('Vaccination date must be a valid date');
          }

          let nextDueDate: Date | undefined;
          if (vax.expires) {
            nextDueDate = new Date(vax.expires);
            if (isNaN(nextDueDate.getTime())) {
              throw new ValidationError('Vaccination expiration date must be a valid date');
            }
          }

          vaccinationRecords.push({
            vaccineType: vax.vaccine.trim(),
            administeredDate,
            nextDueDate,
            veterinarian: vax.administered_by?.trim(),
            batchNumber: undefined, // Not in input model
          });
        } catch (error: any) {
          if (error instanceof ValidationError) {
            throw error;
          }
          throw new ValidationError('Invalid vaccination record format');
        }
      }
    }

    return {
      name: input.name.trim(),
      species: input.species?.trim(),
      breed: input.breed?.trim(),
      dateOfBirth,
      microchipId: input.microchipId?.trim(),
      medicalNotes: input.medicalNotes?.trim(),
      vaccinationRecords,
    };
  }

  /**
   * Creates Pet domain entity
   *
   * @param validatedInput - Validated input data
   * @param customerId - Customer ID
   * @returns Pet domain entity
   */
  private createPetEntity(
    validatedInput: {
      name: string;
      species?: string;
      breed?: string;
      dateOfBirth?: Date;
      microchipId?: string;
      medicalNotes?: string;
      vaccinationRecords: VaccinationRecord[];
    },
    customerId: string,
  ): Pet {
    const petId = this.generateId();
    const now = new Date();

    return new Pet(
      petId,
      customerId,
      validatedInput.name,
      validatedInput.species,
      validatedInput.breed,
      validatedInput.dateOfBirth,
      validatedInput.microchipId,
      validatedInput.medicalNotes,
      validatedInput.vaccinationRecords,
      now,
      now,
    );
  }

  /**
   * Persists pet via repository
   *
   * @param pet - Pet domain entity
   * @returns Persisted pet entity
   * @throws RepositoryError if persistence fails
   */
  private async persistPet(pet: Pet): Promise<Pet> {
    try {
      return await this.petRepository.save(pet);
    } catch (error: any) {
      throw new RepositoryError(`Failed to save pet: ${error.message}`);
    }
  }

  /**
   * Creates audit log entry for pet creation
   *
   * @param pet - Created pet entity
   * @param performedBy - User ID who performed the action
   */
  private async createAuditLog(pet: Pet, performedBy: string): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Pet',
        pet.id,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            id: pet.id,
            customerId: pet.customerId,
            name: pet.name,
            species: pet.species,
          },
        },
        new Date(),
      );

      if (result.auditLog) {
        await this.auditLogRepository.save(result.auditLog);
      }
    } catch (error: any) {
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Maps Pet domain entity to output model
   *
   * @param pet - Pet domain entity
   * @returns Output model
   */
  private mapToOutput(pet: Pet): CreatePetOutput {
    return {
      id: pet.id,
      customerId: pet.customerId,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      dateOfBirth: pet.dateOfBirth,
      age: pet.calculateAge(),
      microchipId: pet.microchipId,
      medicalNotes: pet.medicalNotes,
      vaccination: [...pet.vaccinationRecords],
      createdAt: pet.createdAt,
      updatedAt: pet.updatedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   *
   * @param error - Error that occurred
   * @returns Error result
   */
  private handleError(error: unknown): CreatePetResult {
    if (error instanceof ApplicationError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    };
  }
}
