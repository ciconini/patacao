/**
 * Delete Pet Use Case
 *
 * Application use case for deleting a pet.
 * This use case orchestrates domain entities and domain services to delete a pet.
 *
 * Responsibilities:
 * - Validate user authorization (Owner or Manager role required)
 * - Validate pet exists
 * - Delete pet via repository
 * - Create audit log entry
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Inject } from '@nestjs/common';
import { Pet } from '../domain/pet.entity';
import { RoleId } from '../../shared/domain/role-id.value-object';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { PetRepository } from '../ports/pet.repository.port';

// Repository interfaces (ports)
export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

// Input model
export interface DeletePetInput {
  id: string;
  performedBy: string; // User ID
}

// Result type
export interface DeletePetResult {
  success: boolean;
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
 * Delete Pet Use Case
 */
export class DeletePetUseCase {
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
   * Executes the delete pet use case
   *
   * @param input - Input data for deleting pet
   * @returns Result indicating success or error
   */
  async execute(input: DeletePetInput): Promise<DeletePetResult> {
    try {
      // 1. Validate current user exists
      const currentUser = await this.userRepository.findById(input.performedBy);
      if (!currentUser) {
        throw new UnauthorizedError('User not found');
      }

      // 2. Check if user has Manager or Owner role
      const hasManagerOrOwnerRole = currentUser.roleIds.some((roleId) => {
        try {
          const role = RoleId.fromString(roleId);
          return role ? role.isManager() || role.isOwner() : false;
        } catch {
          return false;
        }
      });

      if (!hasManagerOrOwnerRole) {
        throw new ForbiddenError('Only Manager or Owner role can delete pets');
      }

      // 3. Retrieve existing pet
      const existingPet = await this.petRepository.findById(input.id);
      if (!existingPet) {
        throw new NotFoundError(`Pet with ID ${input.id} not found`);
      }

      // 4. Delete pet
      await this.petRepository.delete(input.id);

      // 5. Create audit log entry
      await this.createAuditLog(existingPet, input.performedBy);

      // 6. Return success result
      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Creates audit log entry for pet deletion
   */
  private async createAuditLog(pet: Pet, performedBy: string): Promise<void> {
    try {
      const auditLogId = this.generateId();
      const result = this.auditLogDomainService.createAuditEntry(
        auditLogId,
        'Pet',
        pet.id,
        AuditAction.DELETE,
        performedBy,
        {
          before: {
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
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): DeletePetResult {
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

