/**
 * User Logout Use Case (UC-AUTH-002)
 * 
 * Application use case for logging out an authenticated user.
 * This use case orchestrates domain entities and domain services to revoke sessions.
 * 
 * Responsibilities:
 * - Validate access token
 * - Revoke current session
 * - Optionally revoke refresh token
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
  findById(sessionId: string): Promise<Session | null>;
  findByRefreshToken(refreshToken: string): Promise<Session | null>;
  revoke(sessionId: string): Promise<void>;
  revokeByRefreshToken(refreshToken: string): Promise<void>;
}

export interface AuditLogRepository {
  save(auditLog: AuditLog): Promise<AuditLog>;
}

export interface TokenValidator {
  validateAccessToken(token: string): Promise<TokenPayload | null>;
  extractSessionId(token: string): Promise<string | null>;
}

export interface TokenPayload {
  userId: string;
  sessionId: string;
  roles: string[];
  exp: number;
}

// Input model
export interface UserLogoutInput {
  accessToken: string; // From Authorization header
  refreshToken?: string; // Optional, to revoke refresh token
  ipAddress?: string;
  userAgent?: string;
}

// Output model
export interface UserLogoutOutput {
  success: boolean;
  message: string;
}

// Result type
export interface UserLogoutResult {
  success: boolean;
  data?: UserLogoutOutput;
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
  constructor(message: string = 'Invalid or expired token') {
    super('INVALID_TOKEN', message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * User Logout Use Case
 */
export class UserLogoutUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly tokenValidator: TokenValidator,
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
   * Executes the user logout use case
   * 
   * @param input - Logout input data
   * @returns Result containing logout confirmation or error
   */
  async execute(input: UserLogoutInput): Promise<UserLogoutResult> {
    try {
      // 1. Validate and extract token payload
      const tokenPayload = await this.validateToken(input.accessToken);
      if (!tokenPayload) {
        throw new UnauthorizedError();
      }

      // 2. Extract session ID from token
      const sessionId = await this.tokenValidator.extractSessionId(input.accessToken);
      if (!sessionId) {
        // If we can't extract session ID, try to find session by user ID
        // For now, we'll proceed with token payload
      }

      // 3. Load session if session ID available
      let session: Session | null = null;
      if (sessionId) {
        session = await this.sessionRepository.findById(sessionId);
      }

      // 4. Revoke session (idempotent - if already revoked, that's fine)
      if (session && !session.isRevoked()) {
        session.revoke();
        await this.sessionRepository.revoke(session.id);
      } else if (sessionId) {
        // Session not found or already revoked - still try to revoke (idempotent)
        await this.sessionRepository.revoke(sessionId);
      }

      // 5. Revoke refresh token if provided
      if (input.refreshToken) {
        try {
          const refreshSession = await this.sessionRepository.findByRefreshToken(input.refreshToken);
          if (refreshSession && !refreshSession.isRevoked()) {
            refreshSession.revoke();
            await this.sessionRepository.revokeByRefreshToken(input.refreshToken);
          }
        } catch (error) {
          // Ignore errors for refresh token revocation (optional operation)
          console.warn('Failed to revoke refresh token:', error);
        }
      }

      // 6. Create audit log entry
      await this.createAuditLog(tokenPayload.userId, input.ipAddress, input.userAgent);

      // 7. Return success result
      return {
        success: true,
        data: {
          success: true,
          message: 'Logged out successfully',
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Validates access token
   * 
   * @param token - Access token string
   * @returns Token payload or null
   */
  private async validateToken(token: string): Promise<TokenPayload | null> {
    if (!token || token.trim().length === 0) {
      return null;
    }

    return await this.tokenValidator.validateAccessToken(token);
  }

  /**
   * Creates audit log entry for logout
   * 
   * @param userId - User ID
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   */
  private async createAuditLog(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const auditResult = this.auditLogDomainService.createAuditEntry(
        this.generateId(),
        'User',
        userId,
        AuditAction.DELETE, // Using DELETE for logout
        userId, // performedBy - user logging out
        {
          after: {
            action: 'logout',
            ipAddress,
            userAgent,
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
  private handleError(error: unknown): UserLogoutResult {
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

