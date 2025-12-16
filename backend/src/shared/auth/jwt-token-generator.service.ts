/**
 * JWT Token Generator Service
 * 
 * Service for generating and verifying JWT access tokens and refresh tokens.
 * This service implements the TokenGenerator interface used by authentication use cases.
 */

import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

export interface AccessTokenPayload {
  userId: string;
  sessionId: string;
  roles: string[];
  exp: number;
  iat: number;
}

@Injectable()
export class JwtTokenGeneratorService {
  private readonly accessTokenSecret: string;
  private readonly accessTokenExpirySeconds: number;
  private readonly refreshTokenLength: number;

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {
    this.accessTokenSecret = this.configService.get<string>('JWT_SECRET') || 'change-me-in-production';
    this.accessTokenExpirySeconds = this.configService.get<number>('JWT_EXPIRY_SECONDS') || 15 * 60; // 15 minutes
    this.refreshTokenLength = 32; // 32 bytes = 64 hex characters
  }

  /**
   * Generates a JWT access token
   * 
   * @param userId - User ID
   * @param roles - User roles
   * @returns JWT access token string
   */
  async generateAccessToken(userId: string, roles: string[]): Promise<string> {
    // Note: sessionId should be passed, but the interface doesn't support it
    // This is a limitation - the use case should be updated to pass sessionId
    // For now, we generate a temporary one
    const sessionId = await this.generateRefreshToken(); // Temporary sessionId
    const now = Math.floor(Date.now() / 1000);
    const payload: AccessTokenPayload = {
      userId,
      sessionId,
      roles,
      exp: now + this.accessTokenExpirySeconds,
      iat: now,
    };

    return jwt.sign(payload, this.accessTokenSecret, {
      algorithm: 'HS256',
    });
  }

  /**
   * Generates a JWT access token with session ID
   * This is an extended method that allows passing sessionId
   * 
   * @param userId - User ID
   * @param roles - User roles
   * @param sessionId - Session ID
   * @returns JWT access token string
   */
  async generateAccessTokenWithSession(userId: string, roles: string[], sessionId: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: AccessTokenPayload = {
      userId,
      sessionId,
      roles,
      exp: now + this.accessTokenExpirySeconds,
      iat: now,
    };

    return jwt.sign(payload, this.accessTokenSecret, {
      algorithm: 'HS256',
    });
  }

  /**
   * Generates a random refresh token
   * 
   * @returns Refresh token string (hex encoded)
   */
  async generateRefreshToken(): Promise<string> {
    return randomBytes(this.refreshTokenLength).toString('hex');
  }

  /**
   * Verifies and decodes a JWT access token
   * 
   * @param token - JWT token string
   * @returns Decoded token payload or null if invalid
   */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        algorithms: ['HS256'],
      }) as AccessTokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extracts session ID from a JWT access token
   * 
   * @param token - JWT token string
   * @returns Session ID or null if invalid
   */
  async extractSessionId(token: string): Promise<string | null> {
    const payload = await this.verifyAccessToken(token);
    return payload?.sessionId || null;
  }
}
