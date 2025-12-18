/**
 * User Controller
 *
 * REST API controller for User management endpoints.
 */

import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiExtraModels,
} from '@nestjs/swagger';
import {
  FirebaseAuthGuard,
  AuthenticatedRequest,
} from '../../../../shared/auth/firebase-auth.guard';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dto/user.dto';
import { PaginatedResponseDto, PaginationMetaDto } from '../../../../shared/presentation/dto/pagination.dto';
import { CreateUserUseCase, CreateUserInput } from '../../application/create-user.use-case';
import { SearchUsersUseCase, SearchUsersInput } from '../../application/search-users.use-case';
import { GetUserUseCase, GetUserInput } from '../../application/get-user.use-case';
import { UpdateUserUseCase, UpdateUserInput } from '../../application/update-user.use-case';
import { DeleteUserUseCase, DeleteUserInput } from '../../application/delete-user.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(PaginatedResponseDto, PaginationMetaDto)
@Controller('api/v1/users')
@UseGuards(FirebaseAuthGuard)
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly searchUsersUseCase: SearchUsersUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  /**
   * Create a new user
   * POST /api/v1/users
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create user',
    description: 'Creates a new user with roles and store assignments',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email or username already exists',
  })
  async create(
    @Body() createDto: CreateUserDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: CreateUserInput = {
      email: createDto.email,
      fullName: createDto.fullName,
      phone: createDto.phone,
      username: createDto.username,
      roles: createDto.roles,
      storeIds: createDto.storeIds || [],
      workingHours: createDto.workingHours,
      password: createDto.password, // Optional: if provided, creates Firebase Auth user
      performedBy: userId,
    };

    const result = await this.createUserUseCase.execute(input);

    if (!result.success || !result.user) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.user);
  }

  /**
   * Update an existing user
   * PUT /api/v1/users/:id
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update user',
    description: 'Updates an existing user profile',
  })
  @ApiParam({ name: 'id', description: 'User UUID', type: String })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: UpdateUserInput = {
      id,
      fullName: updateDto.fullName,
      phone: updateDto.phone,
      username: updateDto.username,
      roles: updateDto.roles,
      active: updateDto.active,
      storeIds: updateDto.storeIds,
      workingHours: updateDto.workingHours,
      performedBy: userId,
    };

    const result = await this.updateUserUseCase.execute(input);

    if (!result.success || !result.user) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.user);
  }

  /**
   * Get a user by ID
   * GET /api/v1/users/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieves a user profile by its ID',
  })
  @ApiParam({ name: 'id', description: 'User UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async findOne(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: GetUserInput = {
      id,
      performedBy: userId,
    };

    const result = await this.getUserUseCase.execute(input);

    if (!result.success || !result.user) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.user);
  }

  /**
   * Search users
   * GET /api/v1/users
   */
  @Get()
  @ApiOperation({
    summary: 'Search users',
    description: 'Searches and filters users with pagination support',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Search query (name, email, username)',
  })
  @ApiQuery({ name: 'email', required: false, type: String, description: 'Filter by email' })
  @ApiQuery({ name: 'role', required: false, type: String, description: 'Filter by role' })
  @ApiQuery({ name: 'storeId', required: false, type: String, description: 'Filter by store ID' })
  @ApiQuery({
    name: 'active',
    required: false,
    type: String,
    description: 'Filter by active status (true/false)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number' })
  @ApiQuery({
    name: 'perPage',
    required: false,
    type: Number,
    example: 20,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Sort field and direction (e.g., "email:asc")',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserResponseDto' },
        },
        meta: { $ref: '#/components/schemas/PaginationMetaDto' },
      },
      required: ['items', 'meta'],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async search(
    @Query('q') q?: string,
    @Query('email') email?: string,
    @Query('role') role?: string,
    @Query('storeId') storeId?: string,
    @Query('active') active?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('sort') sort?: string,
    @Request() req?: AuthenticatedRequest,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    const userId = req?.firebaseUid || req?.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: SearchUsersInput = {
      q,
      email,
      role,
      storeId,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? parseInt(perPage, 10) : 20,
      sort,
      performedBy: userId,
    };

    const result = await this.searchUsersUseCase.execute(input);

    if (!result.success || !result.data) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      items: result.data.items.map((item) => this.mapToResponseDto(item)),
      meta: result.data.meta,
    };
  }

  /**
   * Maps use case output to response DTO
   */
  private mapToResponseDto(output: {
    id: string;
    email: string;
    fullName: string;
    phone?: string;
    username?: string;
    roles: string[];
    storeIds: string[];
    workingHours?: any;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): UserResponseDto {
    return {
      id: output.id,
      email: output.email,
      fullName: output.fullName,
      phone: output.phone,
      username: output.username,
      roles: output.roles,
      storeIds: output.storeIds,
      workingHours: output.workingHours,
      serviceSkills: [], // TODO: Add serviceSkills to CreateUserOutput
      active: output.active,
      createdAt: output.createdAt,
      updatedAt: output.updatedAt,
    };
  }

  /**
   * Delete a user
   * DELETE /api/v1/users/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user',
    description: 'Deletes (deactivates) a user account. Only Owner can delete users.',
  })
  @ApiParam({ name: 'id', description: 'User UUID', type: String })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: DeleteUserInput = {
      id,
      performedBy: userId,
    };

    const result = await this.deleteUserUseCase.execute(input);

    if (!result.success) {
      throw mapApplicationErrorToHttpException(result.error!);
    }
  }
}
