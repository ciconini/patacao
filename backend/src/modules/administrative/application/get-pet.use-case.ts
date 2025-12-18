/**
 * Get Pet Use Case
 *
 * Application use case for retrieving a pet by ID.
 * This use case orchestrates domain entities and repository ports to get a pet.
 *
 * Responsibilities:
 * - Validate user authorization (Staff, Manager, Veterinarian, or Owner role required)
 * - Retrieve pet via repository
 * - Return pet data
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Inject } from '@nestjs/common';
import { Pet, VaccinationRecord } from '../domain/pet.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';
import { PetRepository } from '../ports/pet.repository.port';

// Repository interfaces (ports)
export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface GetPetInput {
  id: string;
  performedBy: string; // User ID
}

// Output model
export interface GetPetOutput {
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
export interface GetPetResult {
  success: boolean;
  pet?: GetPetOutput;
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

/**
 * Get Pet Use Case
 */
export class GetPetUseCase {
  constructor(
    @Inject('PetRepository')
    private readonly petRepository: PetRepository,
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Executes the get pet use case
   *
   * @param input - Input data for getting pet
   * @returns Result containing pet or error
   */
  async execute(input: GetPetInput): Promise<GetPetResult> {
    try {
      // 1. Validate current user exists
      const currentUser = await this.userRepository.findById(input.performedBy);
      if (!currentUser) {
        throw new UnauthorizedError('User not found');
      }

      // 2. Check if user has required role (Staff, Manager, Veterinarian, or Owner)
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
          'Only Staff, Manager, Veterinarian, or Owner role can view pets',
        );
      }

      // 3. Retrieve pet from repository
      const pet = await this.petRepository.findById(input.id);
      if (!pet) {
        throw new NotFoundError(`Pet with ID ${input.id} not found`);
      }

      // 4. Return success result
      return {
        success: true,
        pet: this.mapToOutput(pet),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Maps Pet domain entity to output model
   */
  private mapToOutput(pet: Pet): GetPetOutput {
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
  private handleError(error: unknown): GetPetResult {
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

