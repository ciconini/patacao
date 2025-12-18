/**
 * Store Controller
 *
 * REST API controller for Store management endpoints.
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
import { CreateStoreDto, UpdateStoreDto, StoreResponseDto } from '../dto/store.dto';
import { PaginatedResponseDto, PaginationMetaDto } from '../../../../shared/presentation/dto/pagination.dto';
import { SearchStoresQueryDto } from '../dto/search-stores-query.dto';
import { CreateStoreUseCase, CreateStoreInput } from '../../application/create-store.use-case';
import { UpdateStoreUseCase, UpdateStoreInput } from '../../application/update-store.use-case';
import { GetStoreUseCase, GetStoreInput } from '../../application/get-store.use-case';
import { DeleteStoreUseCase, DeleteStoreInput } from '../../application/delete-store.use-case';
import { SearchStoresUseCase, SearchStoresInput } from '../../application/search-stores.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@ApiTags('Administrative')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(PaginatedResponseDto, PaginationMetaDto)
@Controller('api/v1/stores')
@UseGuards(FirebaseAuthGuard)
export class StoreController {
  constructor(
    private readonly createStoreUseCase: CreateStoreUseCase,
    private readonly updateStoreUseCase: UpdateStoreUseCase,
    private readonly getStoreUseCase: GetStoreUseCase,
    private readonly deleteStoreUseCase: DeleteStoreUseCase,
    private readonly searchStoresUseCase: SearchStoresUseCase,
  ) {}

  /**
   * Create a new store
   * POST /api/v1/stores
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create store', description: 'Creates a new store for a company' })
  @ApiBody({ type: CreateStoreDto })
  @ApiResponse({ status: 201, description: 'Store created successfully', type: StoreResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async create(
    @Body() createDto: CreateStoreDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<StoreResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: CreateStoreInput = {
      companyId: createDto.companyId,
      name: createDto.name,
      address: createDto.address,
      email: createDto.email,
      phone: createDto.phone,
      openingHours: createDto.openingHours,
      timezone: createDto.timezone,
      performedBy: userId,
    };

    const result = await this.createStoreUseCase.execute(input);

    if (!result.success || !result.store) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.store);
  }

  /**
   * Update an existing store
   * PUT /api/v1/stores/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update store', description: 'Updates an existing store' })
  @ApiParam({ name: 'id', description: 'Store UUID', type: String })
  @ApiBody({ type: UpdateStoreDto })
  @ApiResponse({ status: 200, description: 'Store updated successfully', type: StoreResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateStoreDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<StoreResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: UpdateStoreInput = {
      id,
      name: updateDto.name,
      address: updateDto.address,
      email: updateDto.email,
      phone: updateDto.phone,
      openingHours: updateDto.openingHours,
      timezone: updateDto.timezone,
      performedBy: userId,
    };

    const result = await this.updateStoreUseCase.execute(input);

    if (!result.success || !result.store) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.store);
  }

  /**
   * Search stores
   * GET /api/v1/stores
   */
  @Get()
  @ApiOperation({ summary: 'Search stores', description: 'Searches and filters stores with pagination' })
  @ApiQuery({ name: 'companyId', required: false, type: String, description: 'Filter by company ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'perPage', required: false, type: Number, example: 20, description: 'Items per page' })
  @ApiQuery({ name: 'sort', required: false, type: String, description: 'Sort field and direction' })
  @ApiResponse({
    status: 200,
    description: 'Stores retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/StoreResponseDto' },
        },
        meta: { $ref: '#/components/schemas/PaginationMetaDto' },
      },
      required: ['items', 'meta'],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async search(
    @Query() query: SearchStoresQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedResponseDto<StoreResponseDto>> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: SearchStoresInput = {
      companyId: query.companyId,
      page: query.page || 1,
      perPage: query.perPage || 20,
      sort: query.sort,
      performedBy: userId,
    };

    const result = await this.searchStoresUseCase.execute(input);

    if (!result.success || !result.data) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      items: result.data.items.map((item: any) => this.mapToResponseDto(item)),
      meta: result.data.meta,
    };
  }

  /**
   * Get a store by ID
   * GET /api/v1/stores/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get store by ID', description: 'Retrieves a store by its ID' })
  @ApiParam({ name: 'id', description: 'Store UUID', type: String })
  @ApiResponse({ status: 200, description: 'Store retrieved successfully', type: StoreResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async findOne(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<StoreResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: GetStoreInput = {
      id,
      performedBy: userId,
    };

    const result = await this.getStoreUseCase.execute(input);

    if (!result.success || !result.store) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.store);
  }

  /**
   * Delete a store
   * DELETE /api/v1/stores/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete store', description: 'Deletes a store' })
  @ApiParam({ name: 'id', description: 'Store UUID', type: String })
  @ApiResponse({ status: 204, description: 'Store deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async delete(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: DeleteStoreInput = {
      id,
      performedBy: userId,
    };

    const result = await this.deleteStoreUseCase.execute(input);

    if (!result.success) {
      throw mapApplicationErrorToHttpException(result.error!);
    }
  }

  /**
   * Maps use case output to response DTO
   */
  private mapToResponseDto(output: {
    id: string;
    companyId: string;
    name: string;
    address?: {
      street: string;
      city: string;
      postalCode: string;
      country?: string;
    };
    email?: string;
    phone?: string;
    openingHours: any;
    timezone: string;
    createdAt: Date;
    updatedAt: Date;
  }): StoreResponseDto {
    return {
      id: output.id,
      companyId: output.companyId,
      name: output.name,
      address: output.address,
      email: output.email,
      phone: output.phone,
      openingHours: output.openingHours,
      timezone: output.timezone,
      createdAt: output.createdAt,
      updatedAt: output.updatedAt,
    };
  }
}
