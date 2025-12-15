/**
 * Password Reset Confirm Use Case (UC-AUTH-004)
 * 
 * Application use case for confirming password reset with token and new password.
 * This use case orchestrates domain entities and domain services to complete password reset flow.
 * 
 * Responsibilities:
 * - Validate reset token
 * - Validate new password complexity
 * - Update user password
 * - Mark token as used
 * - Revoke all user sessions
 * - Create audit log entry
 * 
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { User } from '../domain/user.entity';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';

// Repository interfaces (ports)
export interface PasswordResetTokenRepository {
  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;
  markAsUsed(tokenId: string): Promise<void>;
}

export interface UserRepository {
  findById(userId: string): Promise<User | null>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  verifyPassword(userId: string, password: string): Promise<boolean>;
}

export interface SessionRepository {
  revokeAllByUserId(userId: string): Promise<void>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export interface TokenHasher {
  hash(token: string): Promise<string>;
}

// Password Reset Token model
export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

// Input model
export interface PasswordResetConfirmInput {
  token: string;
  newPassword: string;
  ipAddress?: string;
}

// Output model
export interface PasswordResetConfirmOutput {
  success: boolean;
  message: string;
}

// Result type
export interface PasswordResetConfirmResult {
  success: boolean;
  data?: PasswordResetConfirmOutput;
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

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message: string = 'Invalid or expired reset token') {
    super('INVALID_TOKEN', message);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string = 'User not found') {
    super('USER_NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

/**
 * Password Reset Confirm Use Case
 */
export class PasswordResetConfirmUseCase {
  private static readonly MIN_PASSWORD_LENGTH = 8;
  private static readonly PASSWORD_REQUIREMENTS = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireDigit: true,
    requireSpecialChar: false, // Optional, business rule dependent
  };

  constructor(
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenHasher: TokenHasher,
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
   * Executes the password reset confirm use case
   * 
   * @param input - Password reset confirm input
   * @returns Result containing success message or error
   */
  async execute(input: PasswordResetConfirmInput): Promise<PasswordResetConfirmResult> {
    try {
      // 1. Validate token is provided
      if (!input.token || input.token.trim().length === 0) {
        throw new ValidationError('Reset token is required');
      }

      // 2. Validate password is provided
      if (!input.newPassword || input.newPassword.trim().length === 0) {
        throw new ValidationError('New password is required');
      }

      // 3. Validate password complexity
      this.validatePasswordComplexity(input.newPassword);

      // 4. Hash the reset token for lookup
      const tokenHash = await this.tokenHasher.hash(input.token);

      // 5. Load password reset token by hash
      const resetToken = await this.passwordResetTokenRepository.findByTokenHash(tokenHash);
      if (!resetToken) {
        throw new UnauthorizedError();
      }

      // 6. Verify token is not expired
      if (new Date() > resetToken.expiresAt) {
        throw new UnauthorizedError();
      }

      // 7. Verify token has not been used
      if (resetToken.used) {
        throw new UnauthorizedError('Reset token has already been used');
      }

      // 8. Load user by ID from token
      const user = await this.userRepository.findById(resetToken.userId);
      if (!user || !user.active) {
        throw new NotFoundError();
      }

      // 9. Optional: Check if new password is different from current password
      if (user.passwordHash) {
        const isSamePassword = await this.passwordHasher.verify(input.newPassword, user.passwordHash);
        if (isSamePassword) {
          throw new ValidationError('New password must be different from current password');
        }
      }

      // 10. Hash new password
      const passwordHash = await this.passwordHasher.hash(input.newPassword);

      // 11. Update user password
      await this.userRepository.updatePassword(user.id, passwordHash);

      // 12. Mark reset token as used
      await this.passwordResetTokenRepository.markAsUsed(resetToken.id);

      // 13. Revoke all active sessions for user (force re-login)
      await this.sessionRepository.revokeAllByUserId(user.id);

      // 14. Create audit log entry
      await this.createAuditLog(user.id, input.ipAddress);

      // 15. Return success result
      return {
        success: true,
        data: {
          success: true,
          message: 'Password has been reset successfully. Please log in with your new password.',
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates password complexity requirements
   * 
   * @param password - Password string
   * @throws ValidationError if password doesn't meet requirements
   */
  private validatePasswordComplexity(password: string): void {
    const requirements = PasswordResetConfirmUseCase.PASSWORD_REQUIREMENTS;
    const errors: string[] = [];

    // Minimum length
    if (password.length < requirements.minLength) {
      errors.push(`Password must be at least ${requirements.minLength} characters long`);
    }

    // Uppercase letter
    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Lowercase letter
    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Digit
    if (requirements.requireDigit && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one digit');
    }

    // Special character (optional)
    if (requirements.requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    if (errors.length > 0) {
      throw new ValidationError(`Password does not meet complexity requirements: ${errors.join(', ')}`);
    }
  }

  /**
   * Creates audit log entry for password reset completion
   * 
   * @param userId - User ID
   * @param ipAddress - Client IP address
   */
  private async createAuditLog(userId: string, ipAddress?: string): Promise<void> {
    try {
      const auditResult = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'User',
        userId,
        AuditAction.UPDATE, // Using UPDATE for password reset
        userId, // performedBy - user resetting password
        {
          after: {
            action: 'password_reset_completed',
            ipAddress,
          },
        },
        new Date()
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
  private handleError(error: unknown): PasswordResetConfirmResult {
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

