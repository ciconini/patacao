/**
 * Firebase Authentication Guard
 * 
 * NestJS guard that verifies Firebase ID tokens from incoming requests.
 * This guard extracts the Bearer token from the Authorization header,
 * verifies it using Firebase Admin SDK, and attaches user information to the request.
 * 
 * Usage:
 * - Apply to controllers or routes: @UseGuards(FirebaseAuthGuard)
 * - Access user info in controllers: @Request() req (req.user will contain token payload)
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { FirebaseAuthService, FirebaseTokenPayload } from './firebase-auth.service';

/**
 * Extended Request interface with Firebase user information
 */
export interface AuthenticatedRequest extends Request {
  user?: FirebaseTokenPayload;
  firebaseUid?: string;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    @Inject('FirebaseAuthService')
    private readonly firebaseAuthService: FirebaseAuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    const verificationResult = await this.firebaseAuthService.verifyIdToken(token);

    if (!verificationResult.valid || !verificationResult.payload) {
      throw new UnauthorizedException(
        verificationResult.error || 'Invalid authentication token'
      );
    }

    // Attach user information to request
    request.user = verificationResult.payload;
    request.firebaseUid = verificationResult.payload.uid;

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

