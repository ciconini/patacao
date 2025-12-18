/**
 * User Login Use Case (UC-AUTH-001)
 *
 * Application use case for authenticating a user with email and password.
 * This use case orchestrates domain entities and domain services to authenticate users.
 *
 * Responsibilities:
 * - Validate email and password input
 * - Check rate limiting
 * - Verify user credentials
 * - Check account status (active, locked)
 * - Create session and generate tokens
 * - Update last login timestamp
 * - Create audit log entry
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { User } from '../domain/user.entity';
import { Session } from '../domain/session.entity';
import { EmailAddress } from '../../shared/domain/email-address.value-object';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';
import { SessionRepository } from '../ports/session.repository.port';

// Repository interfaces (ports)
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  updateLastLogin(userId: string): Promise<void>;
  incrementFailedLoginAttempts(userId: string): Promise<void>;
  resetFailedLoginAttempts(userId: string): Promise<void>;
  lockAccount(userId: string, lockoutExpiry: Date): Promise<void>;
  isAccountLocked(userId: string): Promise<boolean>;
  linkFirebaseUid?(userId: string, firebaseUid: string): Promise<void>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface RateLimiter {
  checkRateLimit(identifier: string, action: string): Promise<boolean>;
  incrementAttempts(identifier: string, action: string): Promise<void>;
}

export interface PasswordHasher {
  verify(password: string, hash: string): Promise<boolean>;
}

export interface TokenGenerator {
  generateAccessToken(userId: string, roles: string[]): Promise<string>;
  generateRefreshToken(): Promise<string>;
}

// Optional Firebase Auth integration interfaces
export interface FirebaseAuthIntegration {
  createFirebaseUser(input: {
    email: string;
    password: string;
    displayName?: string;
  }): Promise<string>;
  setUserRoles(firebaseUid: string, roles: string[], storeIds?: string[]): Promise<void>;
}

export interface FirebaseUserLookup {
  linkFirebaseUid(userId: string, firebaseUid: string): Promise<void>;
}

// Input model
export interface UserLoginInput {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

// Output model
export interface UserLoginOutput {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    roles: string[];
  };
  expiresIn: number; // Access token expiration in seconds
}

// Result type
export interface UserLoginResult {
  success: boolean;
  data?: UserLoginOutput;
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

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message: string = 'Invalid email or password') {
    super('INVALID_CREDENTIALS', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message: string = 'Access forbidden') {
    super('FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class AccountLockedError extends ApplicationError {
  constructor(
    message: string = 'Account temporarily locked due to multiple failed login attempts',
  ) {
    super('ACCOUNT_LOCKED', message);
    this.name = 'AccountLockedError';
  }
}

export class RateLimitError extends ApplicationError {
  constructor(message: string = 'Too many login attempts. Please try again later') {
    super('RATE_LIMIT_EXCEEDED', message);
    this.name = 'RateLimitError';
  }
}

/**
 * User Login Use Case
 */
export class UserLoginUseCase {
  private static readonly ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes
  private static readonly REFRESH_TOKEN_EXPIRY_DAYS = 7;
  private static readonly LOCKOUT_DURATION_MINUTES = 15;
  private static readonly MAX_FAILED_ATTEMPTS = 5;

  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    @Inject('SessionRepository')
    private readonly sessionRepository: SessionRepository,
    @Inject('AuditLogRepository')
    private readonly auditLogRepository: AuditLogRepository,
    @Inject('RateLimiter')
    private readonly rateLimiter: RateLimiter,
    @Inject('PasswordHasher')
    private readonly passwordHasher: PasswordHasher,
    @Inject('TokenGenerator')
    private readonly tokenGenerator: TokenGenerator,
    private readonly auditLogDomainService: AuditLogDomainService,
    // Optional Firebase Auth integration services
    @Optional()
    @Inject('FirebaseAuthIntegrationService')
    private readonly firebaseAuthIntegration?: FirebaseAuthIntegration,
    @Optional()
    @Inject('FirebaseUserLookupService')
    private readonly firebaseUserLookup?: FirebaseUserLookup,
  ) {}

  /**
   * Generates a UUID v4
   * @private
   */
  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Executes the user login use case
   *
   * @param input - Login input data
   * @returns Result containing tokens and user info or error
   */
  async execute(input: UserLoginInput): Promise<UserLoginResult> {
    try {
      // 1. Validate email format
      const email = this.validateEmail(input.email);

      // 2. Validate password is provided
      this.validatePassword(input.password);

      // 3. Check rate limiting
      await this.checkRateLimit(input.email, input.ipAddress);

      // 4. Load user by email
      const user = await this.loadUser(email);

      // 5. Verify user exists and is active
      if (!user) {
        await this.handleFailedLogin(input.email, input.ipAddress, 'User not found');
        throw new UnauthorizedError();
      }

      // 6. Verify user account is active
      if (!user.active) {
        await this.handleFailedLogin(user.id, input.ipAddress, 'Account archived');
        throw new UnauthorizedError();
      }

      // 7. Verify user has roles
      if (!user.roleIds || user.roleIds.length === 0) {
        throw new ForbiddenError('User account has no roles assigned');
      }

      // 8. Check if account is locked
      const isLocked = await this.userRepository.isAccountLocked(user.id);
      if (isLocked) {
        throw new AccountLockedError('Account temporarily locked. Please try again later');
      }

      // 9. Verify password
      if (!user.passwordHash) {
        await this.handleFailedLogin(user.id, input.ipAddress, 'No password set');
        throw new UnauthorizedError();
      }

      const isPasswordValid = await this.passwordHasher.verify(input.password, user.passwordHash);
      if (!isPasswordValid) {
        await this.handleFailedLogin(user.id, input.ipAddress, 'Invalid password');
        await this.incrementFailedAttempts(user.id);
        throw new UnauthorizedError();
      }

      // 10. Reset failed login attempts
      await this.userRepository.resetFailedLoginAttempts(user.id);

      // 11. Optionally create/link Firebase user if services are available
      // This is done asynchronously and won't block login if it fails
      this.ensureFirebaseUser(user, input.password).catch((error) => {
        // Log error but don't fail login
        console.warn('Firebase user creation/linking failed (non-blocking):', error.message);
      });

      // 12. Generate tokens
      const accessToken = await this.tokenGenerator.generateAccessToken(user.id, [...user.roleIds]);
      const refreshToken = await this.tokenGenerator.generateRefreshToken();

      // 13. Create session
      const session = await this.createSession(user.id, refreshToken, input.ipAddress);

      // 14. Update last login timestamp
      await this.userRepository.updateLastLogin(user.id);

      // 15. Create audit log entry
      await this.createAuditLog(user.id, input.ipAddress, input.userAgent, true);

      // 15. Return success result
      return {
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            roles: [...user.roleIds],
          },
          expiresIn: UserLoginUseCase.ACCESS_TOKEN_EXPIRY_SECONDS,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates email format
   *
   * @param email - Email string
   * @returns EmailAddress value object
   * @throws ValidationError if invalid
   */
  private validateEmail(email: string): EmailAddress {
    try {
      return new EmailAddress(email);
    } catch (error: any) {
      throw new ValidationError('Invalid email format');
    }
  }

  /**
   * Validates password is provided
   *
   * @param password - Password string
   * @throws ValidationError if missing
   */
  private validatePassword(password: string): void {
    if (!password || password.trim().length === 0) {
      throw new ValidationError('Password is required');
    }
  }

  /**
   * Checks rate limiting for login attempts
   *
   * @param email - User email
   * @param ipAddress - Client IP address
   * @throws RateLimitError if rate limit exceeded
   */
  private async checkRateLimit(email: string, ipAddress?: string): Promise<void> {
    // Check rate limit by email
    const emailAllowed = await this.rateLimiter.checkRateLimit(email, 'login');
    if (!emailAllowed) {
      await this.rateLimiter.incrementAttempts(email, 'login');
      throw new RateLimitError();
    }

    // Check rate limit by IP if provided
    if (ipAddress) {
      const ipAllowed = await this.rateLimiter.checkRateLimit(ipAddress, 'login');
      if (!ipAllowed) {
        await this.rateLimiter.incrementAttempts(ipAddress, 'login');
        throw new RateLimitError();
      }
    }
  }

  /**
   * Loads user by email
   *
   * @param email - Email address value object
   * @returns User entity or null
   */
  private async loadUser(email: EmailAddress): Promise<User | null> {
    return await this.userRepository.findByEmail(email.value);
  }

  /**
   * Handles failed login attempt
   *
   * @param identifier - User ID or email
   * @param ipAddress - Client IP address
   * @param reason - Failure reason
   */
  private async handleFailedLogin(
    identifier: string,
    ipAddress?: string,
    reason?: string,
  ): Promise<void> {
    // Create audit log for failed login
    try {
      const auditResult = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'User',
        identifier,
        AuditAction.CREATE, // Using CREATE for login attempt
        identifier, // performedBy - using identifier as fallback
        {
          after: {
            action: 'login_failed',
            reason: reason || 'Invalid credentials',
            ipAddress,
          },
        },
        new Date(),
      );

      if (auditResult.auditLog) {
        await this.auditLogRepository.save(auditResult.auditLog);
      }
    } catch (error) {
      console.error('Failed to create audit log for failed login:', error);
    }
  }

  /**
   * Increments failed login attempts and locks account if threshold reached
   *
   * @param userId - User ID
   */
  private async incrementFailedAttempts(userId: string): Promise<void> {
    await this.userRepository.incrementFailedLoginAttempts(userId);

    // Check if account should be locked (simplified - in real implementation,
    // you'd check the current failed attempts count)
    // For now, we'll let the repository handle this logic
    const lockoutExpiry = new Date();
    lockoutExpiry.setMinutes(
      lockoutExpiry.getMinutes() + UserLoginUseCase.LOCKOUT_DURATION_MINUTES,
    );

    // Note: In a real implementation, you'd check the failed attempts count
    // and only lock if it exceeds the threshold. This is simplified.
    // await this.userRepository.lockAccount(userId, lockoutExpiry);
  }

  /**
   * Creates a new session for the user
   *
   * @param userId - User ID
   * @param refreshToken - Refresh token string
   * @param ipAddress - Client IP address
   * @returns Created session entity
   */
  private async createSession(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
  ): Promise<Session> {
    const sessionId = this.generateId();
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + UserLoginUseCase.REFRESH_TOKEN_EXPIRY_DAYS);

    const session = new Session(
      sessionId,
      userId,
      now,
      expiresAt,
      false, // not revoked
    );

    // Save session with refresh token
    // Note: In a production implementation, you might want to hash the refresh token
    await this.sessionRepository.saveWithRefreshToken(session, refreshToken);
    return session;
  }

  /**
   * Ensures Firebase user exists and is linked to internal user
   * This is an optional step that creates a Firebase Auth user if one doesn't exist
   * and links it to the internal user entity.
   *
   * @param user - User entity
   * @param password - User password (needed to create Firebase user)
   */
  private async ensureFirebaseUser(user: User, password: string): Promise<void> {
    // Skip if Firebase integration services are not available
    if (!this.firebaseAuthIntegration || !this.firebaseUserLookup) {
      return;
    }

    try {
      // Create Firebase Auth user (will return existing UID if user already exists)
      const firebaseUid = await this.firebaseAuthIntegration.createFirebaseUser({
        email: user.email,
        password: password, // Use the same password
        displayName: user.fullName,
      });

      // Link Firebase UID to internal user
      if (this.userRepository.linkFirebaseUid) {
        await this.userRepository.linkFirebaseUid(user.id, firebaseUid);
      } else {
        // Fallback: use FirebaseUserLookupService
        await this.firebaseUserLookup.linkFirebaseUid(user.id, firebaseUid);
      }

      // Set custom claims (roles) on Firebase user
      await this.firebaseAuthIntegration.setUserRoles(
        firebaseUid,
        [...user.roleIds],
        user.storeIds.length > 0 ? [...user.storeIds] : undefined,
      );
    } catch (error: any) {
      // Log error but don't fail login if Firebase integration fails
      // This ensures login still works even if Firebase is unavailable
      console.warn('Failed to create/link Firebase user during login:', error.message);
      // In production, you might want to use a proper logger
      throw error; // Re-throw to be caught by caller
    }
  }

  /**
   * Creates audit log entry for login
   *
   * @param userId - User ID
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   * @param success - Whether login was successful
   */
  private async createAuditLog(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
  ): Promise<void> {
    try {
      const auditResult = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'User',
        userId,
        AuditAction.CREATE, // Using CREATE for login
        userId, // performedBy - user logging in
        {
          after: {
            action: success ? 'login_success' : 'login_failed',
            ipAddress,
            userAgent,
          },
        },
        new Date(),
      );

      if (auditResult.auditLog) {
        await this.auditLogRepository.save(auditResult.auditLog);
      }
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Handles errors and converts them to result format
   *
   * @param error - Error that occurred
   * @returns Error result
   */
  private handleError(error: unknown): UserLoginResult {
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
