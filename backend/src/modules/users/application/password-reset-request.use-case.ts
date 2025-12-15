/**
 * Password Reset Request Use Case (UC-AUTH-003)
 * 
 * Application use case for requesting a password reset.
 * This use case orchestrates domain entities and domain services to initiate password reset flow.
 * 
 * Responsibilities:
 * - Validate email format
 * - Check rate limiting
 * - Generate secure reset token
 * - Store reset token
 * - Queue/send password reset email
 * - Create audit log entry
 * 
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { User } from '../domain/user.entity';
import { EmailAddress } from '../../shared/domain/email-address.value-object';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';

// Repository interfaces (ports)
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
}

export interface PasswordResetTokenRepository {
  invalidateExistingTokens(userId: string): Promise<void>;
  save(token: PasswordResetToken): Promise<PasswordResetToken>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface RateLimiter {
  checkRateLimit(identifier: string, action: string): Promise<boolean>;
  incrementAttempts(identifier: string, action: string): Promise<void>;
}

export interface TokenGenerator {
  generateResetToken(): Promise<string>;
}

export interface EmailService {
  sendPasswordResetEmail(email: string, token: string, expiresAt: Date): Promise<void>;
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
export interface PasswordResetRequestInput {
  email: string;
  ipAddress?: string;
}

// Output model
export interface PasswordResetRequestOutput {
  success: boolean;
  message: string; // Generic message (security: same regardless of email existence)
}

// Result type
export interface PasswordResetRequestResult {
  success: boolean;
  data?: PasswordResetRequestOutput;
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

export class RateLimitError extends ApplicationError {
  constructor(message: string = 'Too many password reset requests. Please try again later') {
    super('RATE_LIMIT_EXCEEDED', message);
    this.name = 'RateLimitError';
  }
}

/**
 * Password Reset Request Use Case
 */
export class PasswordResetRequestUseCase {
  private static readonly TOKEN_EXPIRY_HOURS = 1;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly rateLimiter: RateLimiter,
    private readonly tokenGenerator: TokenGenerator,
    private readonly emailService: EmailService,
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
   * Executes the password reset request use case
   * 
   * @param input - Password reset request input
   * @returns Result containing success message or error
   */
  async execute(input: PasswordResetRequestInput): Promise<PasswordResetRequestResult> {
    try {
      // 1. Validate email format
      const email = this.validateEmail(input.email);

      // 2. Check rate limiting
      await this.checkRateLimit(input.email, input.ipAddress);

      // 3. Load user by email
      const user = await this.userRepository.findByEmail(email.value);

      // 4. If user not found or archived, return generic success (security)
      if (!user || !user.active) {
        await this.createAuditLog(null, input.email, input.ipAddress, false);
        return {
          success: true,
          data: {
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.',
          },
        };
      }

      // 5. Invalidate existing reset tokens for this user
      await this.passwordResetTokenRepository.invalidateExistingTokens(user.id);

      // 6. Generate secure reset token
      const resetToken = await this.tokenGenerator.generateResetToken();

      // 7. Hash token for storage
      const tokenHash = await this.tokenHasher.hash(resetToken);

      // 8. Set token expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + PasswordResetRequestUseCase.TOKEN_EXPIRY_HOURS);

      // 9. Create password reset token entity
      const token: PasswordResetToken = {
        id: this.generateId(),
        userId: user.id,
        tokenHash,
        expiresAt,
        used: false,
        createdAt: new Date(),
      };

      // 10. Store reset token
      await this.passwordResetTokenRepository.save(token);

      // 11. Queue/send password reset email
      try {
        await this.emailService.sendPasswordResetEmail(user.email, resetToken, expiresAt);
      } catch (error) {
        // Log error but don't fail the request (user experience)
        console.error('Failed to send password reset email:', error);
      }

      // 12. Create audit log entry
      await this.createAuditLog(user.id, user.email, input.ipAddress, true);

      // 13. Return generic success message (security: same regardless of email existence)
      return {
        success: true,
        data: {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.',
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
   * Checks rate limiting for password reset requests
   * 
   * @param email - User email
   * @param ipAddress - Client IP address
   * @throws RateLimitError if rate limit exceeded
   */
  private async checkRateLimit(email: string, ipAddress?: string): Promise<void> {
    // Check rate limit by email
    const emailAllowed = await this.rateLimiter.checkRateLimit(email, 'password_reset');
    if (!emailAllowed) {
      await this.rateLimiter.incrementAttempts(email, 'password_reset');
      throw new RateLimitError();
    }

    // Check rate limit by IP if provided
    if (ipAddress) {
      const ipAllowed = await this.rateLimiter.checkRateLimit(ipAddress, 'password_reset');
      if (!ipAllowed) {
        await this.rateLimiter.incrementAttempts(ipAddress, 'password_reset');
        throw new RateLimitError();
      }
    }
  }

  /**
   * Creates audit log entry for password reset request
   * 
   * @param userId - User ID (null if user not found)
   * @param email - Email address
   * @param ipAddress - Client IP address
   * @param success - Whether request was successful
   */
  private async createAuditLog(
    userId: string | null,
    email: string,
    ipAddress?: string,
    success: boolean = true
  ): Promise<void> {
    try {
      const auditResult = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'User',
        userId || email, // Use email as fallback if user not found
        AuditAction.UPDATE, // Using UPDATE for password reset request
        userId || email, // performedBy - using identifier
        {
          after: {
            action: 'password_reset_requested',
            email,
            success,
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
  private handleError(error: unknown): PasswordResetRequestResult {
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

