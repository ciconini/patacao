/**
 * Refresh Token Use Case (UC-AUTH-003)
 *
 * Application use case for refreshing an access token using a refresh token.
 * This use case orchestrates domain entities to issue new access tokens.
 *
 * Responsibilities:
 * - Validate refresh token
 * - Verify session is still valid
 * - Generate new access token
 * - Optionally rotate refresh token
 * - Create audit log entry
 *
 * This use case belongs to the Application layer and does not contain:
 * - Framework dependencies
 * - Infrastructure code
 * - HTTP concerns
 * - Persistence implementation details
 */

import { Session } from '../domain/session.entity';
import { AuditLogDomainService } from '../../shared/domain/audit-log.domain-service';
import { AuditLog, AuditAction } from '../../shared/domain/audit-log.entity';

// Repository interfaces (ports)
export interface SessionRepository {
  findByRefreshToken(refreshToken: string): Promise<Session | null>;
  update(session: Session): Promise<Session>;
}

export interface UserRepository {
  findById(id: string): Promise<{ id: string; roleIds: string[]; active: boolean } | null>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface TokenGenerator {
  generateAccessToken(userId: string, roles: string[]): Promise<string>;
  generateRefreshToken(): Promise<string>;
}

// Input model
export interface RefreshTokenInput {
  refreshToken: string;
  rotateRefreshToken?: boolean; // Default false
}

// Output model
export interface RefreshTokenOutput {
  accessToken: string;
  refreshToken?: string; // Only if rotateRefreshToken is true
  expiresIn: number; // Access token expiration in seconds
}

// Result type
export interface RefreshTokenResult {
  success: boolean;
  data?: RefreshTokenOutput;
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
  constructor(message: string = 'Invalid refresh token') {
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

/**
 * Refresh Token Use Case
 */
export class RefreshTokenUseCase {
  private static readonly ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes

  private readonly generateId = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly userRepository: UserRepository,
    private readonly tokenGenerator: TokenGenerator,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly auditLogDomainService: AuditLogDomainService,
  ) {}

  /**
   * Executes the refresh token use case
   *
   * @param input - Input data for refreshing token
   * @returns Result containing new access token or error
   */
  async execute(input: RefreshTokenInput): Promise<RefreshTokenResult> {
    try {
      // 1. Validate input
      if (!input.refreshToken || input.refreshToken.trim() === '') {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Refresh token is required',
          },
        };
      }

      // 2. Find session by refresh token
      const session = await this.sessionRepository.findByRefreshToken(input.refreshToken);

      if (!session) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid refresh token',
          },
        };
      }

      // 3. Check if session is revoked
      if (session.revoked) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Session has been revoked',
          },
        };
      }

      // 4. Check if session is expired
      if (session.isExpired()) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Refresh token has expired',
          },
        };
      }

      // 5. Load user to get roles
      const user = await this.userRepository.findById(session.userId);

      if (!user) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        };
      }

      // 6. Check if user is active
      if (!user.active) {
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'User account is inactive',
          },
        };
      }

      // 7. Generate new access token
      const accessToken = await this.tokenGenerator.generateAccessToken(user.id, [...user.roleIds]);

      // 8. Optionally rotate refresh token
      let newRefreshToken: string | undefined;
      if (input.rotateRefreshToken) {
        newRefreshToken = await this.tokenGenerator.generateRefreshToken();
        // Update session with new refresh token would be done here
        // For now, we'll keep the same refresh token
      }

      // 9. Create audit log entry
      const auditLogResult = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'Session',
        session.id,
        AuditAction.UPDATE,
        user.id,
        {
          after: {
            action: 'token_refresh',
          },
        },
        new Date(),
      );

      if (auditLogResult.auditLog) {
        await this.auditLogRepository.save(auditLogResult.auditLog);
      }

      // 10. Return success result
      return {
        success: true,
        data: {
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: RefreshTokenUseCase.ACCESS_TOKEN_EXPIRY_SECONDS,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'An unexpected error occurred',
        },
      };
    }
  }
}
