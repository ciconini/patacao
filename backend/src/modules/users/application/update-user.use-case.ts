/**
 * Update User Use Case
 *
 * Application use case for updating an existing user account.
 * This use case orchestrates domain entities and domain services to update a user.
 *
 * Responsibilities:
 * - Validate user authorization (Manager, Owner, or self with restrictions)
 * - Validate input data
 * - Update User domain entity
 * - Persist user via repository
 * - Update roles and stores if provided
 * - Create audit log entry
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Inject } from '@nestjs/common';
import { User, WeeklySchedule } from '../domain/user.entity';
import { EmailAddress } from '../../shared/domain/email-address.value-object';
import { PhoneNumber } from '../../shared/domain/phone-number.value-object';
import { WorkingHours } from '../../shared/domain/working-hours.value-object';
import { RoleId } from '../../shared/domain/role-id.value-object';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { UserRepository } from '../ports/user.repository.port';
import { RoleRepository } from '../ports/role.repository.port';
import { CurrentUserRepository } from '../infrastructure/current-user.repository.adapter';

// Repository interfaces (ports)
export interface StoreRepository {
  findById(id: string): Promise<{ id: string } | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

// Input model
export interface UpdateUserInput {
  id: string;
  fullName?: string;
  phone?: string;
  username?: string;
  roles?: string[];
  active?: boolean;
  storeIds?: string[];
  workingHours?: {
    monday?: { start?: string; end?: string; available?: boolean };
    tuesday?: { start?: string; end?: string; available?: boolean };
    wednesday?: { start?: string; end?: string; available?: boolean };
    thursday?: { start?: string; end?: string; available?: boolean };
    friday?: { start?: string; end?: string; available?: boolean };
    saturday?: { start?: string; end?: string; available?: boolean };
    sunday?: { start?: string; end?: string; available?: boolean };
  };
  performedBy: string; // User ID
}

// Output model
export interface UpdateUserOutput {
  id: string;
  email: string;
  fullName: string;
  phone?: string | undefined;
  username?: string | undefined;
  roles: string[];
  storeIds: string[];
  workingHours?: WeeklySchedule;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Result type
export interface UpdateUserResult {
  success: boolean;
  user?: UpdateUserOutput;
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

export class DuplicateUsernameError extends ApplicationError {
  constructor(message: string = 'Username is already taken') {
    super('USERNAME_EXISTS', message);
    this.name = 'DuplicateUsernameError';
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

/**
 * Update User Use Case
 */
export class UpdateUserUseCase {
  private static readonly REQUIRED_DAYS = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ] as const;

  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    @Inject('StoreRepository')
    private readonly storeRepository: StoreRepository,
    @Inject('RoleRepository')
    private readonly roleRepository: RoleRepository,
    @Inject('AuditLogRepository')
    private readonly auditLogRepository: AuditLogRepository,
    @Inject('CurrentUserRepository')
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly auditLogDomainService: AuditLogDomainService,
  ) {}

  /**
   * Executes the update user use case
   *
   * @param input - Input data for updating user
   * @returns Result containing updated user or error
   */
  async execute(input: UpdateUserInput): Promise<UpdateUserResult> {
    try {
      // 1. Validate user exists and has authorization
      const currentUser = await this.validateUserAuthorization(input.performedBy, input.id);

      // 2. Retrieve existing user
      const existingUser = await this.userRepository.findById(input.id);
      if (!existingUser) {
        throw new NotFoundError(`User with ID ${input.id} not found`);
      }

      // 3. Validate and normalize input data
      const validatedInput = await this.validateAndNormalizeInput(input, currentUser, existingUser);

      // 4. Check username uniqueness if changed
      if (validatedInput.username && validatedInput.username !== existingUser.username) {
        const existingUserWithUsername = await this.userRepository.findByUsername(
          validatedInput.username,
        );
        if (existingUserWithUsername && existingUserWithUsername.id !== input.id) {
          throw new DuplicateUsernameError();
        }
      }

      // 5. Validate stores exist if provided
      if (validatedInput.storeIds && validatedInput.storeIds.length > 0) {
        await this.validateStores(validatedInput.storeIds);
      }

      // 6. Update User domain entity
      this.updateUserEntity(existingUser, validatedInput);

      // 7. Persist user via repository
      const savedUser = await this.userRepository.save(existingUser);

      // 8. Update roles and stores if provided
      if (validatedInput.roles) {
        await this.userRepository.assignRoles(savedUser.id, validatedInput.roles);
        savedUser.setRoles(validatedInput.roles);
      }

      if (validatedInput.storeIds !== undefined) {
        await this.userRepository.assignStores(savedUser.id, validatedInput.storeIds);
      }

      // 9. Create audit log entry
      await this.createAuditLog(savedUser, input.performedBy);

      // 10. Return success result
      return {
        success: true,
        user: this.mapToOutput(savedUser),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization
   */
  private async validateUserAuthorization(
    userId: string,
    targetUserId: string,
  ): Promise<{ id: string; roleIds: string[] }> {
    const user = await this.currentUserRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const isSelf = user.id === targetUserId;

    const hasManagerOrOwnerRole = user.roleIds.some((roleId) => {
      try {
        const role = RoleId.fromString(roleId);
        return role ? role.isManager() || role.isOwner() : false;
      } catch {
        return false;
      }
    });

    // Self can update with restrictions, Manager/Owner can update fully
    if (!isSelf && !hasManagerOrOwnerRole) {
      throw new ForbiddenError('Only Manager, Owner, or self can update users');
    }

    return user;
  }

  /**
   * Validates and normalizes input data
   */
  private async validateAndNormalizeInput(
    input: UpdateUserInput,
    currentUser: { id: string; roleIds: string[] },
    existingUser: User,
  ): Promise<{
    fullName?: string;
    phone?: PhoneNumber;
    username?: string;
    roles?: string[];
    active?: boolean;
    storeIds?: string[];
    workingHours?: WeeklySchedule;
  }> {
    const isSelf = currentUser.id === input.id;
    const hasManagerOrOwnerRole = currentUser.roleIds.some((roleId) => {
      try {
        const role = RoleId.fromString(roleId);
        return role ? role.isManager() || role.isOwner() : false;
      } catch {
        return false;
      }
    });

    const result: any = {};

    if (input.fullName !== undefined) {
      if (!input.fullName || input.fullName.trim().length === 0) {
        throw new ValidationError('Full name cannot be empty');
      }
      result.fullName = input.fullName.trim();
    }

    if (input.phone !== undefined) {
      if (input.phone) {
        try {
          result.phone = new PhoneNumber(input.phone);
        } catch (error: any) {
          throw new ValidationError(`Invalid phone number: ${error.message}`);
        }
      } else {
        result.phone = undefined;
      }
    }

    if (input.username !== undefined) {
      if (input.username) {
        if (!input.username.trim() || input.username.trim().length === 0) {
          throw new ValidationError('Username cannot be empty if provided');
        }
        if (input.username.trim().length > 64) {
          throw new ValidationError('Username cannot exceed 64 characters');
        }
        result.username = input.username.trim();
      } else {
        result.username = undefined;
      }
    }

    // Roles can only be updated by Manager/Owner
    if (input.roles !== undefined) {
      if (!hasManagerOrOwnerRole) {
        throw new ForbiddenError('Only Manager or Owner can update roles');
      }

      if (input.roles.length === 0) {
        throw new ValidationError('User must have at least one role');
      }

      const validatedRoles: string[] = [];
      let hasOwnerRole = false;

      for (const roleId of input.roles) {
        try {
          const role = RoleId.fromString(roleId);
          if (!role) {
            throw new ValidationError(`Invalid role ID: ${roleId}`);
          }
          validatedRoles.push(role.value);

          if (role.isOwner()) {
            hasOwnerRole = true;
          }

          // Verify role exists
          const roleEntity = await this.roleRepository.findById(role.value);
          if (!roleEntity) {
            throw new NotFoundError(`Role ${roleId} not found`);
          }
        } catch (error: any) {
          if (error instanceof ValidationError || error instanceof NotFoundError) {
            throw error;
          }
          throw new ValidationError(`Invalid role ID: ${roleId}`);
        }
      }

      if (hasOwnerRole) {
        const isCurrentUserOwner = currentUser.roleIds.some((roleId) => {
          try {
            const role = RoleId.fromString(roleId);
            return role ? role.isOwner() : false;
          } catch {
            return false;
          }
        });

        if (!isCurrentUserOwner) {
          throw new ForbiddenError('Only Owner can assign Owner role');
        }
      }

      result.roles = validatedRoles;
    }

    // Active status can only be updated by Manager/Owner
    if (input.active !== undefined) {
      if (!hasManagerOrOwnerRole) {
        throw new ForbiddenError('Only Manager or Owner can update active status');
      }
      result.active = input.active;
    }

    // Store IDs can only be updated by Manager/Owner
    if (input.storeIds !== undefined) {
      if (!hasManagerOrOwnerRole) {
        throw new ForbiddenError('Only Manager or Owner can update store assignments');
      }
      result.storeIds = input.storeIds;
    }

    // Working hours can be updated by self or Manager/Owner
    if (input.workingHours !== undefined) {
      result.workingHours = this.validateWorkingHours(input.workingHours);
    }

    return result;
  }

  /**
   * Validates working hours structure
   */
  private validateWorkingHours(workingHours: UpdateUserInput['workingHours']): WeeklySchedule {
    if (!workingHours) {
      throw new ValidationError('Working hours cannot be null');
    }

    const validated: any = {};

    for (const day of UpdateUserUseCase.REQUIRED_DAYS) {
      const dayHours = workingHours[day];

      if (!dayHours) {
        throw new ValidationError(`Working hours must contain all 7 days of week. Missing: ${day}`);
      }

      const isAvailable = dayHours.available !== false;

      if (!dayHours.start || !dayHours.end) {
        throw new ValidationError(`Working hours for ${day} must have start and end times`);
      }

      try {
        const workingHoursVO = isAvailable
          ? WorkingHours.available(dayHours.start, dayHours.end)
          : WorkingHours.unavailable(dayHours.start, dayHours.end);

        validated[day] = {
          startTime: workingHoursVO.startTime,
          endTime: workingHoursVO.endTime,
          isAvailable: workingHoursVO.isAvailable,
        };
      } catch (error: any) {
        throw new ValidationError(`Invalid working hours for ${day}: ${error.message}`);
      }
    }

    return validated as WeeklySchedule;
  }

  /**
   * Validates that all stores exist
   */
  private async validateStores(storeIds: string[]): Promise<void> {
    for (const storeId of storeIds) {
      const store = await this.storeRepository.findById(storeId);
      if (!store) {
        throw new NotFoundError(`Store with ID ${storeId} not found`);
      }
    }
  }

  /**
   * Updates User domain entity
   */
  private updateUserEntity(
    user: User,
    validatedInput: {
      fullName?: string;
      phone?: PhoneNumber;
      username?: string;
      active?: boolean;
      workingHours?: WeeklySchedule;
    },
  ): void {
    if (validatedInput.fullName !== undefined) {
      user.updateFullName(validatedInput.fullName);
    }

    if (validatedInput.phone !== undefined) {
      user.updatePhone(validatedInput.phone?.value);
    }

    if (validatedInput.username !== undefined) {
      user.updateUsername(validatedInput.username);
    }

    if (validatedInput.active !== undefined) {
      if (validatedInput.active) {
        user.activate();
      } else {
        user.deactivate();
      }
    }

    if (validatedInput.workingHours !== undefined) {
      user.updateWorkingHours(validatedInput.workingHours);
    }
  }

  /**
   * Creates audit log entry for user update
   */
  private async createAuditLog(user: User, performedBy: string): Promise<void> {
    try {
      const auditLogId = this.generateId();
      const result = this.auditLogDomainService.createAuditEntry(
        auditLogId,
        'User',
        user.id,
        AuditAction.UPDATE,
        performedBy,
        {
          after: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            roles: user.roleIds,
            active: user.active,
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
   * Maps User domain entity to output model
   */
  private mapToOutput(user: User): UpdateUserOutput {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      username: user.username,
      roles: [...user.roleIds],
      storeIds: [...user.storeIds],
      workingHours: user.workingHours,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): UpdateUserResult {
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

