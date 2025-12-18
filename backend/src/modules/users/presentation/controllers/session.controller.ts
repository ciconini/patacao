/**
 * Session Controller
 *
 * REST API controller for Session management endpoints.
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  FirebaseAuthGuard,
  AuthenticatedRequest,
} from '../../../../shared/auth/firebase-auth.guard';
import { GetSessionsUseCase, GetSessionsInput } from '../../application/get-sessions.use-case';
import { RevokeSessionUseCase, RevokeSessionInput } from '../../application/revoke-session.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

/**
 * Session Response DTO
 */
export interface SessionResponseDto {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt?: Date;
  revoked: boolean;
  revokedAt?: Date;
}

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/sessions')
@UseGuards(FirebaseAuthGuard)
export class SessionController {
  constructor(
    private readonly getSessionsUseCase: GetSessionsUseCase,
    private readonly revokeSessionUseCase: RevokeSessionUseCase,
  ) {}

  /**
   * Get sessions
   * GET /api/v1/sessions
   */
  @Get()
  @ApiOperation({
    summary: 'Get sessions',
    description: 'Retrieves user sessions. Requires userId query parameter.',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Filter by user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Sessions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        sessions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              expiresAt: { type: 'string', format: 'date-time' },
              revoked: { type: 'boolean' },
              revokedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async findAll(
    @Query('userId') userId?: string,
    @Request() req?: AuthenticatedRequest,
  ): Promise<{ sessions: SessionResponseDto[] }> {
    const performedBy = req?.firebaseUid || req?.user?.uid;
    if (!performedBy) {
      throw new Error('User ID not found in request');
    }

    if (!userId) {
      throw new Error('userId query parameter is required');
    }

    const input: GetSessionsInput = {
      userId,
      performedBy,
    };

    const result = await this.getSessionsUseCase.execute(input);

    if (!result.success || !result.data) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      sessions: result.data.sessions,
    };
  }

  /**
   * Revoke a session
   * POST /api/v1/sessions/:id/revoke
   */
  @Post(':id/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke session',
    description: 'Revokes a user session',
  })
  @ApiParam({ name: 'id', description: 'Session UUID', type: String })
  @ApiResponse({ status: 204, description: 'Session revoked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async revoke(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: RevokeSessionInput = {
      sessionId: id,
      performedBy: userId,
    };

    const result = await this.revokeSessionUseCase.execute(input);

    if (!result.success) {
      throw mapApplicationErrorToHttpException(result.error!);
    }
  }
}

