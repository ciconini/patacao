/**
 * Create User (Staff) Use Case (UC-ADMIN-009)
 *
 * Application use case for creating a new system user account.
 * This use case orchestrates domain entities and domain services to create a user.
 *
 * Responsibilities:
 * - Validate user authorization (Owner or Manager role required)
 * - Validate role assignment restrictions (only Owner can create Owner users)
 * - Validate email and username uniqueness
 * - Validate store and service existence
 * - Create User domain entity
 * - Persist user via repository
 * - Assign roles, stores, and service skills
 * - Create audit log entry
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { User, WeeklySchedule } from '../../users/domain/user.entity';
import { EmailAddress } from '../../shared/domain/email-address.value-object';
import { PhoneNumber } from '../../shared/domain/phone-number.value-object';
import { WorkingHours } from '../../shared/domain/working-hours.value-object';
import { RoleId } from '../../shared/domain/role-id.value-object';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { Store } from '../domain/store.entity';

// Repository interfaces (ports)
export interface UserRepository {
  save(user: User): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  assignRoles(userId: string, roleIds: string[]): Promise<void>;
  assignStores(userId: string, storeIds: string[]): Promise<void>;
  assignServiceSkills(userId: string, serviceIds: string[]): Promise<void>;
}

export interface StoreRepository {
  findById(id: string): Promise<Store | null>;
}

export interface ServiceRepository {
  findById(id: string): Promise<{ id: string } | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface CurrentUserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[] } | null>;
}

// Input model
export interface CreateUserStaffInput {
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
  serviceSkills?: string[];
  active?: boolean;
  performedBy: string; // User ID
}

// Output model
export interface CreateUserStaffOutput {
  id: string;
  email: string;
  fullName: string;
  phone?: string | undefined;
  username?: string | undefined;
  roles: string[];
  storeIds: string[];
  workingHours?: WeeklySchedule;
  serviceSkills: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Result type
export interface CreateUserStaffResult {
  success: boolean;
  user?: CreateUserStaffOutput;
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

export class DuplicateEmailError extends ApplicationError {
  constructor(message: string = 'A user with this email already exists') {
    super('DUPLICATE_EMAIL', message);
    this.name = 'DuplicateEmailError';
  }
}

export class DuplicateUsernameError extends ApplicationError {
  constructor(message: string = 'A user with this username already exists') {
    super('DUPLICATE_USERNAME', message);
    this.name = 'DuplicateUsernameError';
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
 * Create User (Staff) Use Case
 */
export class CreateUserStaffUseCase {
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
    private readonly userRepository: UserRepository,
    private readonly storeRepository: StoreRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly currentUserRepository: CurrentUserRepository,
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
   * Executes the create user use case
   *
   * @param input - Input data for creating user
   * @returns Result containing created user or error
   */
  async execute(input: CreateUserStaffInput): Promise<CreateUserStaffResult> {
    try {
      // 1. Validate user exists and has Owner or Manager role
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

      // 6. Validate services exist
      if (validatedInput.serviceSkills && validatedInput.serviceSkills.length > 0) {
        await this.validateServices(validatedInput.serviceSkills);
      }

      // 7. Create User domain entity
      const user = this.createUserEntity(validatedInput);

      // 8. Persist user via repository
      const savedUser = await this.persistUser(user);

      // 9. Assign roles, stores, and service skills
      await this.assignUserRelationships(savedUser.id, validatedInput);

      // 10. Create audit log entry
      await this.createAuditLog(savedUser, input.performedBy);

      // 11. Return success result
      return {
        success: true,
        user: this.mapToOutput(savedUser, validatedInput),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates user authorization (must have Owner or Manager role)
   *
   * @param userId - User ID to validate
   * @returns User data
   * @throws UnauthorizedError if user not found
   * @throws ForbiddenError if user does not have required role
   */
  private async validateUserAuthorization(
    userId: string,
  ): Promise<{ id: string; roleIds: string[] }> {
    const user = await this.currentUserRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const hasOwnerOrManagerRole = user.roleIds.some((roleId) => {
      try {
        const role = RoleId.fromString(roleId);
        return role ? role.isOwner() || role.isManager() : false;
      } catch {
        return false;
      }
    });

    if (!hasOwnerOrManagerRole) {
      throw new ForbiddenError('Only Owner or Manager role can create users');
    }

    return user;
  }

  /**
   * Validates and normalizes input data
   *
   * @param input - Raw input data
   * @param currentUser - Current user performing the action
   * @returns Validated and normalized input
   * @throws ValidationError if validation fails
   */
  private async validateAndNormalizeInput(
    input: CreateUserStaffInput,
    currentUser: { id: string; roleIds: string[] },
  ): Promise<{
    email: EmailAddress;
    fullName: string;
    phone?: PhoneNumber;
    username?: string;
    roles: string[];
    storeIds: string[];
    workingHours?: WeeklySchedule;
    serviceSkills: string[];
    active: boolean;
  }> {
    // Validate required fields
    if (!input.fullName || input.fullName.trim().length === 0) {
      throw new ValidationError('Full name is required');
    }

    if (!input.roles || input.roles.length === 0) {
      throw new ValidationError('At least one role must be assigned');
    }

    // Validate and create email value object
    let email: EmailAddress;
    try {
      email = new EmailAddress(input.email);
    } catch (error: any) {
      throw new ValidationError(`Invalid email: ${error.message}`);
    }

    // Validate roles
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
      } catch (error: any) {
        if (error instanceof ValidationError) {
          throw error;
        }
        throw new ValidationError(
          `Invalid role ID: ${roleId}. Valid roles are: Owner, Manager, Staff, Accountant, Veterinarian`,
        );
      }
    }

    // Check if non-Owner is trying to create Owner user
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
        throw new ForbiddenError('Only Owner role can create Owner users');
      }
    }

    // Validate and create phone value object
    let phone: PhoneNumber | undefined;
    if (input.phone) {
      try {
        phone = new PhoneNumber(input.phone);
      } catch (error: any) {
        throw new ValidationError(`Invalid phone number: ${error.message}`);
      }
    }

    // Validate username
    let username: string | undefined;
    if (input.username) {
      if (!input.username.trim() || input.username.trim().length === 0) {
        throw new ValidationError('Username cannot be empty if provided');
      }
      if (input.username.trim().length > 128) {
        throw new ValidationError('Username cannot exceed 128 characters');
      }
      username = input.username.trim();
    }

    // Validate and normalize working hours
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
      serviceSkills: input.serviceSkills || [],
      active: input.active ?? true,
    };
  }

  /**
   * Validates working hours structure
   *
   * @param workingHours - Working hours input
   * @returns Validated WeeklySchedule
   * @throws ValidationError if validation fails
   */
  private validateWorkingHours(workingHours: CreateUserStaffInput['workingHours']): WeeklySchedule {
    if (!workingHours) {
      throw new ValidationError('Working hours cannot be null');
    }

    const validated: any = {};

    // Validate all 7 days are present
    for (const day of CreateUserStaffUseCase.REQUIRED_DAYS) {
      const dayHours = workingHours[day];

      if (!dayHours) {
        throw new ValidationError(`Working hours must contain all 7 days of week. Missing: ${day}`);
      }

      const isAvailable = dayHours.available !== false; // Default to true if not specified

      if (!dayHours.start || !dayHours.end) {
        throw new ValidationError(`Working hours for ${day} must have start and end times`);
      }

      // Validate time format using WorkingHours value object
      try {
        const workingHoursVO = isAvailable
          ? WorkingHours.available(dayHours.start, dayHours.end)
          : WorkingHours.unavailable(dayHours.start, dayHours.end);

        (validated as any)[day] = {
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
   *
   * @param email - Email address value object
   * @throws DuplicateEmailError if email already exists
   */
  private async checkEmailUniqueness(email: EmailAddress): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(email.value);

    if (existingUser) {
      throw new DuplicateEmailError('A user with this email already exists');
    }
  }

  /**
   * Checks if username is unique
   *
   * @param username - Username string
   * @throws DuplicateUsernameError if username already exists
   */
  private async checkUsernameUniqueness(username: string): Promise<void> {
    const existingUser = await this.userRepository.findByUsername(username);

    if (existingUser) {
      throw new DuplicateUsernameError('A user with this username already exists');
    }
  }

  /**
   * Validates that all stores exist
   *
   * @param storeIds - Array of store IDs
   * @throws NotFoundError if any store not found
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
   * Validates that all services exist
   *
   * @param serviceIds - Array of service IDs
   * @throws NotFoundError if any service not found
   */
  private async validateServices(serviceIds: string[]): Promise<void> {
    for (const serviceId of serviceIds) {
      const service = await this.serviceRepository.findById(serviceId);
      if (!service) {
        throw new NotFoundError(`Service with ID ${serviceId} not found`);
      }
    }
  }

  /**
   * Creates User domain entity
   *
   * @param validatedInput - Validated input data
   * @returns User domain entity
   */
  private createUserEntity(validatedInput: {
    email: EmailAddress;
    fullName: string;
    phone?: PhoneNumber;
    username?: string;
    roles: string[];
    storeIds: string[];
    workingHours?: WeeklySchedule;
    serviceSkills: string[];
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
      validatedInput.serviceSkills,
      validatedInput.active,
      now,
      now,
    );
  }

  /**
   * Persists user via repository
   *
   * @param user - User domain entity
   * @returns Persisted user entity
   * @throws RepositoryError if persistence fails
   */
  private async persistUser(user: User): Promise<User> {
    try {
      return await this.userRepository.save(user);
    } catch (error: any) {
      throw new RepositoryError(`Failed to save user: ${error.message}`);
    }
  }

  /**
   * Assigns user relationships (roles, stores, service skills)
   *
   * @param userId - User ID
   * @param validatedInput - Validated input data
   */
  private async assignUserRelationships(
    userId: string,
    validatedInput: {
      roles: string[];
      storeIds: string[];
      serviceSkills: string[];
    },
  ): Promise<void> {
    // Assign roles
    if (validatedInput.roles.length > 0) {
      await this.userRepository.assignRoles(userId, validatedInput.roles);
    }

    // Assign stores
    if (validatedInput.storeIds.length > 0) {
      await this.userRepository.assignStores(userId, validatedInput.storeIds);
    }

    // Assign service skills
    if (validatedInput.serviceSkills.length > 0) {
      await this.userRepository.assignServiceSkills(userId, validatedInput.serviceSkills);
    }
  }

  /**
   * Creates audit log entry for user creation
   *
   * @param user - Created user entity
   * @param performedBy - User ID who performed the action
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
   * Maps User domain entity to output model
   *
   * @param user - User domain entity
   * @param validatedInput - Validated input data (for relationships)
   * @returns Output model
   */
  private mapToOutput(
    user: User,
    validatedInput: {
      storeIds: string[];
      serviceSkills: string[];
    },
  ): CreateUserStaffOutput {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      username: user.username,
      roles: [...user.roleIds],
      storeIds: validatedInput.storeIds,
      workingHours: user.workingHours,
      serviceSkills: validatedInput.serviceSkills,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Handles errors and converts them to result format
   *
   * @param error - Error that occurred
   * @returns Error result
   */
  private handleError(error: unknown): CreateUserStaffResult {
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
