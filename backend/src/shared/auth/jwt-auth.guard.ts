/**
 * JWT Authentication Guard
 *
 * NestJS guard that verifies custom JWT access tokens from incoming requests.
 * This guard extracts the Bearer token from the Authorization header,
 * verifies it using the JWT Token Generator Service, and attaches user information to the request.
 *
 * Usage:
 * - Apply to controllers or routes: @UseGuards(JwtAuthGuard)
 * - Access user info in controllers: @Request() req (req.user will contain token payload)
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { JwtTokenGeneratorService, AccessTokenPayload } from './jwt-token-generator.service';

/**
 * Extended Request interface with JWT user information
 */
export interface AuthenticatedRequest extends Request {
  user?: AccessTokenPayload;
  userId?: string;
  firebaseUid?: string; // For compatibility with existing code
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtTokenGeneratorService)
    private readonly jwtTokenGenerator: JwtTokenGeneratorService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    const payload = await this.jwtTokenGenerator.verifyAccessToken(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }

    // Attach user information to request
    request.user = payload;
    request.userId = payload.userId;
    request.firebaseUid = payload.userId; // For compatibility with existing code that uses firebaseUid

    return true;
  }

  /**
   * Extracts the Bearer token from the Authorization header
   *
   * @param request - HTTP request object
   * @returns Token string or null if not found
   */
  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = (request.headers as any).authorization;

    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ') ?? [];

    return type === 'Bearer' ? token : null;
  }
}

