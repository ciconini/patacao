/**
 * Role Controller
 *
 * REST API controller for Role management endpoints.
 */

import {
  Controller,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  FirebaseAuthGuard,
  AuthenticatedRequest,
} from '../../../../shared/auth/firebase-auth.guard';
import { GetRolesUseCase, GetRolesInput } from '../../application/get-roles.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

/**
 * Role Response DTO
 */
export interface RoleResponseDto {
  id: string;
  name: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/roles')
@UseGuards(FirebaseAuthGuard)
export class RoleController {
  constructor(private readonly getRolesUseCase: GetRolesUseCase) {}

  /**
   * Get all roles
   * GET /api/v1/roles
   */
  @Get()
  @ApiOperation({
    summary: 'Get all roles',
    description: 'Retrieves all available roles in the system',
  })
  @ApiResponse({
    status: 200,
    description: 'Roles retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        roles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              permissions: { type: 'array', items: { type: 'string' } },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async findAll(@Request() req: AuthenticatedRequest): Promise<{ roles: RoleResponseDto[] }> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: GetRolesInput = {
      performedBy: userId,
    };

    const result = await this.getRolesUseCase.execute(input);

    if (!result.success || !result.data) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      roles: result.data.roles,
    };
  }
}

