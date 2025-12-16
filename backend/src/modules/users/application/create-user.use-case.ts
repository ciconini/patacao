/**
 * Create User Use Case (UC-AUTH-005)
 * 
 * Application use case for creating a new user account.
 * This use case orchestrates domain entities and domain services to create a user.
 * 
 * Note: This is similar to UC-ADMIN-009 (Create User Staff) but is part of the Authentication module.
 * The main difference is the module context and potential slight variations in business rules.
 * 
 * Responsibilities:
 * - Validate user authorization (Manager or Owner role required)
 * - Validate role assignment restrictions (only Owner can create Owner users)
 * - Validate email and username uniqueness
 * - Validate store existence
 * - Create User domain entity
 * - Persist user via repository
 * - Assign roles and stores
 * - Create audit log entry
 * 
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { User, WeeklySchedule } from '../domain/user.entity';
import { EmailAddress } from '../../shared/domain/email-address.value-object';
import { PhoneNumber } from '../../shared/domain/phone-number.value-object';
import { WorkingHours } from '../../shared/domain/working-hours.value-object';
import { RoleId } from '../../shared/domain/role-id.value-object';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';

// Repository interfaces (ports)
export interface UserRepository {
  save(user: User): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  assignRoles(userId: string, roleIds: string[]): Promise<void>;
  assignStores(userId: string, storeIds: string[]): Promise<void>;
}

export interface StoreRepository {
  findById(id: string): Promise<{ id: string } | null>;
}

export interface RoleRepository {
  findById(id: string): Promise<{ id: string } | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface CreateUserInput {
  email: string;
  fullName: string;
  phone?: string;
  username?: string;
  roles: string[];
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
export interface CreateUserOutput {
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
export interface CreateUserResult {
  success: boolean;
  user?: CreateUserOutput;
  error?: {
    code: string;
    message: string;
  };
}

// Application errors
export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string
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

export class DuplicateEmailError extends ApplicationError {
  constructor(message: string = 'Email is already registered') {
    super('EMAIL_EXISTS', message);
    this.name = 'DuplicateEmailError';
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
 * Create User Use Case
 */
export class CreateUserUseCase {
  private static readonly REQUIRED_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly storeRepository: StoreRepository,
    private readonly roleRepository: RoleRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly auditLogDomainService: AuditLogDomainService,
    private readonly generateId: () => string = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  ) {}

  /**
   * Executes the create user use case
   * 
   * @param input - Input data for creating user
   * @returns Result containing created user or error
   */
  async execute(input: CreateUserInput): Promise<CreateUserResult> {
    try {
      // 1. Validate user exists and has Manager or Owner role
      const currentUser = await this.validateUserAuthorization(input.performedBy);

      // 2. Validate and normalize input data
      const validatedInput = await this.validateAndNormalizeInput(input, currentUser);

      // 3. Check email uniqueness
      await this.checkEmailUniqueness(validatedInput.email);

      // 4. Check username uniqueness if provided
      if (validatedInput.username) {
        await this.checkUsernameUniqueness(validatedInput.username);
      }

      // 5. Validate stores exist
      if (validatedInput.storeIds && validatedInput.storeIds.length > 0) {
        await this.validateStores(validatedInput.storeIds);
      }

      // 6. Create User domain entity
      const user = this.createUserEntity(validatedInput);

      // 7. Persist user via repository
      const savedUser = await this.persistUser(user);

      // 8. Assign roles and stores
      await this.assignUserRelationships(savedUser.id, validatedInput);

      // 9. Create audit log entry
      await this.createAuditLog(savedUser, input.performedBy);

      // 10. Return success result
      return {
        success: true,
        user: this.mapToOutput(savedUser, validatedInput),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization (must have Manager or Owner role)
   */
  private async validateUserAuthorization(userId: string): Promise<{ id: string; roleIds: string[] }> {
    const user = await this.currentUserRepository.findById(userId);
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const hasManagerOrOwnerRole = user.roleIds.some(roleId => {
      try {
        const role = RoleId.fromString(roleId);
        return role ? (role.isManager() || role.isOwner()) : false;
      } catch {
        return false;
      }
    });

    if (!hasManagerOrOwnerRole) {
      throw new ForbiddenError('Only Manager or Owner role can create users');
    }

    return user;
  }

  /**
   * Validates and normalizes input data
   */
  private async validateAndNormalizeInput(
    input: CreateUserInput,
    currentUser: { id: string; roleIds: string[] }
  ): Promise<{
    email: EmailAddress;
    fullName: string;
    phone?: PhoneNumber;
    username?: string;
    roles: string[];
    storeIds: string[];
    workingHours?: WeeklySchedule;
    active: boolean;
  }> {
    if (!input.fullName || input.fullName.trim().length === 0) {
      throw new ValidationError('Full name is required');
    }

    if (!input.roles || input.roles.length === 0) {
      throw new ValidationError('At least one role must be assigned');
    }

    let email: EmailAddress;
    try {
      email = new EmailAddress(input.email);
    } catch (error: any) {
      throw new ValidationError(`Invalid email: ${error.message}`);
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
        const roleExists = await this.roleRepository.findById(role.value);
        if (!roleExists) {
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
      const isCurrentUserOwner = currentUser.roleIds.some(roleId => {
        try {
          const role = RoleId.fromString(roleId);
          return role ? role.isOwner() : false;
        } catch {
          return false;
        }
      });

      if (!isCurrentUserOwner) {
        throw new ForbiddenError('Only Owner can create Owner users');
      }
    }

    let phone: PhoneNumber | undefined;
    if (input.phone) {
      try {
        phone = new PhoneNumber(input.phone);
      } catch (error: any) {
        throw new ValidationError(`Invalid phone number: ${error.message}`);
      }
    }

    let username: string | undefined;
    if (input.username) {
      if (!input.username.trim() || input.username.trim().length === 0) {
        throw new ValidationError('Username cannot be empty if provided');
      }
      if (input.username.trim().length > 64) {
        throw new ValidationError('Username cannot exceed 64 characters');
      }
      username = input.username.trim();
    }

    let workingHours: WeeklySchedule | undefined;
    if (input.workingHours) {
      workingHours = this.validateWorkingHours(input.workingHours);
    }

    return {
      email,
      fullName: input.fullName.trim(),
      phone,
      username,
      roles: validatedRoles,
      storeIds: input.storeIds || [],
      workingHours,
      active: true, // Always active by default
    };
  }

  /**
   * Validates working hours structure
   */
  private validateWorkingHours(workingHours: CreateUserInput['workingHours']): WeeklySchedule {
    if (!workingHours) {
      throw new ValidationError('Working hours cannot be null');
    }

    const validated: any = {};

    for (const day of CreateUserUseCase.REQUIRED_DAYS) {
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
   * Checks if email is unique
   */
  private async checkEmailUniqueness(email: EmailAddress): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(email.value);
    if (existingUser) {
      throw new DuplicateEmailError();
    }
  }

  /**
   * Checks if username is unique
   */
  private async checkUsernameUniqueness(username: string): Promise<void> {
    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      throw new DuplicateUsernameError();
    }
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
   * Creates User domain entity
   */
  private createUserEntity(validatedInput: {
    email: EmailAddress;
    fullName: string;
    phone?: PhoneNumber;
    username?: string;
    roles: string[];
    storeIds: string[];
    workingHours?: WeeklySchedule;
    active: boolean;
  }): User {
    const userId = this.generateId();
    const now = new Date();

    return new User(
      userId,
      validatedInput.email.value,
      validatedInput.fullName,
      validatedInput.roles,
      validatedInput.phone?.value,
      validatedInput.username,
      undefined, // passwordHash - not set during creation
      validatedInput.storeIds,
      validatedInput.workingHours,
      [], // serviceSkills - not in this use case
      validatedInput.active,
      now,
      now
    );
  }

  /**
   * Persists user via repository
   */
  private async persistUser(user: User): Promise<User> {
    return await this.userRepository.save(user);
  }

  /**
   * Assigns user relationships (roles, stores)
   */
  private async assignUserRelationships(
    userId: string,
    validatedInput: {
      roles: string[];
      storeIds: string[];
    }
  ): Promise<void> {
    if (validatedInput.roles.length > 0) {
      await this.userRepository.assignRoles(userId, validatedInput.roles);
    }

    if (validatedInput.storeIds.length > 0) {
      await this.userRepository.assignStores(userId, validatedInput.storeIds);
    }
  }

  /**
   * Creates audit log entry for user creation
   */
  private async createAuditLog(user: User, performedBy: string): Promise<void> {
    try {
      const result = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'User',
        user.id,
        AuditAction.CREATE,
        performedBy,
        {
          after: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            roles: user.roleIds,
          },
        },
        new Date()
      );

      if (result.auditLog) {
        await this.auditLogRepository.save(result.auditLog);
      }
    } catch (error: any) {
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Maps User domain entity to output model
   */
  private mapToOutput(
    user: User,
    validatedInput: {
      storeIds: string[];
    }
  ): CreateUserOutput {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      username: user.username,
      roles: [...user.roleIds],
      storeIds: validatedInput.storeIds,
      workingHours: user.workingHours,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   */
  private handleError(error: unknown): CreateUserResult {
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

