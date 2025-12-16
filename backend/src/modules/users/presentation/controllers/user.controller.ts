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
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FirebaseAuthGuard, AuthenticatedRequest } from '../../../../shared/auth/firebase-auth.guard';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dto/user.dto';
import { PaginatedResponseDto } from '../../../../shared/presentation/dto/pagination.dto';
import { CreateUserUseCase, CreateUserInput } from '../../application/create-user.use-case';
import { SearchUsersUseCase, SearchUsersInput } from '../../application/search-users.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@Controller('api/v1/users')
@UseGuards(FirebaseAuthGuard)
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly searchUsersUseCase: SearchUsersUseCase,
  ) {}

  /**
   * Create a new user
   * POST /api/v1/users
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
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
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<UserResponseDto> {
    // TODO: Implement UpdateUserUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Get a user by ID
   * GET /api/v1/users/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    // TODO: Implement GetUserUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Search users
   * GET /api/v1/users
   */
  @Get()
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
      items: result.data.items.map(item => this.mapToResponseDto(item)),
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
}

