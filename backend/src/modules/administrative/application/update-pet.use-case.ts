/**
 * Update Pet Use Case
 *
 * Application use case for updating an existing pet's information.
 * This use case orchestrates domain entities and domain services to update a pet.
 *
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, Veterinarian, or Owner role required)
 * - Validate pet exists
 * - Validate input data and business rules
 * - Update Pet domain entity
 * - Persist updated pet via repository
 * - Create audit log entry with before/after values
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Inject } from '@nestjs/common';
import { Pet, VaccinationRecord } from '../domain/pet.entity';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';
import { PetRepository } from '../ports/pet.repository.port';

// Repository interfaces (ports)
export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

// Input model
export interface UpdatePetInput {
  id: string;
  name?: string;
  species?: string;
  breed?: string;
  dateOfBirth?: string; // ISO date string
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
export interface UpdatePetOutput {
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
export interface UpdatePetResult {
  success: boolean;
  pet?: UpdatePetOutput;
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

export class NotFoundError extends ApplicationError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
    this.name = 'ValidationError';
  }
}

/**
 * Update Pet Use Case
 */
export class UpdatePetUseCase {
  constructor(
    @Inject('PetRepository')
    private readonly petRepository: PetRepository,
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    @Inject('AuditLogRepository')
    private readonly auditLogRepository: AuditLogRepository,
    private readonly auditLogDomainService: AuditLogDomainService,
  ) {}

  /**
   * Executes the update pet use case
   *
   * @param input - Input data for updating pet
   * @returns Result containing updated pet or error
   */
  async execute(input: UpdatePetInput): Promise<UpdatePetResult> {
    try {
      // 1. Validate current user exists
      const currentUser = await this.userRepository.findById(input.performedBy);
      if (!currentUser) {
        throw new UnauthorizedError('User not found');
      }

      // 2. Check if user has required role
      const hasRequiredRole = currentUser.roleIds.some((roleId) => {
        try {
          const role = RoleId.fromString(roleId);
          if (!role) return false;
          return (
            role.isStaff() ||
            role.isManager() ||
            role.value === 'Veterinarian' ||
            role.isOwner()
          );
        } catch {
          return false;
        }
      });

      if (!hasRequiredRole) {
        throw new ForbiddenError(
          'Only Staff, Manager, Veterinarian, or Owner role can update pets',
        );
      }

      // 3. Retrieve existing pet
      const existingPet = await this.petRepository.findById(input.id);
      if (!existingPet) {
        throw new NotFoundError(`Pet with ID ${input.id} not found`);
      }

      // 4. Store before state for audit log
      const beforeState = {
        id: existingPet.id,
        name: existingPet.name,
        species: existingPet.species,
        breed: existingPet.breed,
        dateOfBirth: existingPet.dateOfBirth,
        microchipId: existingPet.microchipId,
        medicalNotes: existingPet.medicalNotes,
      };

      // 5. Validate and apply updates
      this.applyUpdates(existingPet, input);

      // 6. Persist updated pet
      const updatedPet = await this.petRepository.update(existingPet);

      // 7. Create audit log entry
      await this.createAuditLog(beforeState, updatedPet, input.performedBy);

      // 8. Return success result
      return {
        success: true,
        pet: this.mapToOutput(updatedPet),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Applies updates to the pet entity
   */
  private applyUpdates(pet: Pet, input: UpdatePetInput): void {
    if (input.name !== undefined) {
      pet.updateName(input.name);
    }

    if (input.species !== undefined) {
      pet.updateSpecies(input.species);
    }

    if (input.breed !== undefined) {
      pet.updateBreed(input.breed);
    }

    if (input.dateOfBirth !== undefined) {
      const dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : undefined;
      if (dateOfBirth && isNaN(dateOfBirth.getTime())) {
        throw new ValidationError('Date of birth must be a valid date');
      }
      pet.updateDateOfBirth(dateOfBirth);
    }

    if (input.microchipId !== undefined) {
      pet.updateMicrochipId(input.microchipId);
    }

    if (input.medicalNotes !== undefined) {
      pet.updateMedicalNotes(input.medicalNotes);
    }

    // Handle vaccination records - replace all existing ones
    if (input.vaccination !== undefined) {
      // Remove all existing vaccination records
      while (pet.vaccinationRecords.length > 0) {
        pet.removeVaccinationRecord(0);
      }

      // Add new vaccination records
      if (Array.isArray(input.vaccination)) {
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

            const record: VaccinationRecord = {
              vaccineType: vax.vaccine.trim(),
              administeredDate,
              nextDueDate,
              veterinarian: vax.administered_by?.trim(),
            };

            pet.addVaccinationRecord(record);
          } catch (error: any) {
            if (error instanceof ValidationError) {
              throw error;
            }
            throw new ValidationError(`Invalid vaccination record: ${error.message}`);
          }
        }
      }
    }
  }

  /**
   * Creates audit log entry for pet update
   */
  private async createAuditLog(
    beforeState: any,
    pet: Pet,
    performedBy: string,
  ): Promise<void> {
    try {
      const auditLogId = this.generateId();
      const result = this.auditLogDomainService.createAuditEntry(
        auditLogId,
        'Pet',
        pet.id,
        AuditAction.UPDATE,
        performedBy,
        {
          before: beforeState,
          after: {
            id: pet.id,
            name: pet.name,
            species: pet.species,
            breed: pet.breed,
            dateOfBirth: pet.dateOfBirth,
            microchipId: pet.microchipId,
            medicalNotes: pet.medicalNotes,
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
   * Generates a UUID
   */
  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Maps Pet domain entity to output model
   */
  private mapToOutput(pet: Pet): UpdatePetOutput {
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
   */
  private handleError(error: unknown): UpdatePetResult {
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

