/**
 * Service Controller
 *
 * REST API controller for Service management endpoints.
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
import { CreateServiceDto, UpdateServiceDto, ServiceResponseDto, ConsumedItemDto } from '../dto/service.dto';
import { PaginatedResponseDto, PaginationMetaDto } from '../../../../shared/presentation/dto/pagination.dto';
import { SearchServicesQueryDto } from '../dto/search-services-query.dto';
import {
  CreateServiceUseCase,
  CreateServiceInput,
} from '../../application/create-service.use-case';
import {
  GetServiceUseCase,
  GetServiceInput,
} from '../../application/get-service.use-case';
import {
  UpdateServiceUseCase,
  UpdateServiceInput,
} from '../../application/update-service.use-case';
import {
  DeleteServiceUseCase,
  DeleteServiceInput,
} from '../../application/delete-service.use-case';
import {
  SearchServicesUseCase,
  SearchServicesInput,
} from '../../application/search-services.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@ApiTags('Services')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(ConsumedItemDto, PaginatedResponseDto, PaginationMetaDto)
@Controller('api/v1/services')
@UseGuards(FirebaseAuthGuard)
export class ServiceController {
  constructor(
    private readonly createServiceUseCase: CreateServiceUseCase,
    private readonly getServiceUseCase: GetServiceUseCase,
    private readonly updateServiceUseCase: UpdateServiceUseCase,
    private readonly deleteServiceUseCase: DeleteServiceUseCase,
    private readonly searchServicesUseCase: SearchServicesUseCase,
  ) {}

  /**
   * Create a new service
   * POST /api/v1/services
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create service', description: 'Creates a new service offering' })
  @ApiBody({ type: CreateServiceDto })
  @ApiResponse({
    status: 201,
    description: 'Service created successfully',
    type: ServiceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async create(
    @Body() createDto: CreateServiceDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ServiceResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: CreateServiceInput = {
      name: createDto.name,
      description: createDto.description,
      durationMinutes: createDto.durationMinutes,
      price: createDto.price,
      consumesInventory: createDto.consumesInventory ?? false,
      consumedItems: createDto.consumedItems || [],
      requiredResources: createDto.requiredResources || [],
      tags: createDto.tags || [],
      performedBy: userId,
    };

    const result = await this.createServiceUseCase.execute(input);

    if (!result.success || !result.service) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.service);
  }

  /**
   * Search services
   * GET /api/v1/services
   */
  @Get()
  @ApiOperation({ summary: 'Search services', description: 'Searches and filters services with pagination' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query (name, description, tags)' })
  @ApiQuery({ name: 'tag', required: false, type: String, description: 'Filter by tag' })
  @ApiQuery({ name: 'consumesInventory', required: false, type: Boolean, description: 'Filter by inventory consumption' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'perPage', required: false, type: Number, example: 20, description: 'Items per page' })
  @ApiQuery({ name: 'sort', required: false, type: String, description: 'Sort field and direction' })
  @ApiResponse({
    status: 200,
    description: 'Services retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/ServiceResponseDto' },
        },
        meta: { $ref: '#/components/schemas/PaginationMetaDto' },
      },
      required: ['items', 'meta'],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async search(
    @Query() query: SearchServicesQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedResponseDto<ServiceResponseDto>> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: SearchServicesInput = {
      q: query.q,
      tag: query.tag,
      consumesInventory: query.consumesInventory,
      page: query.page || 1,
      perPage: query.perPage || 20,
      sort: query.sort,
      performedBy: userId,
    };

    const result = await this.searchServicesUseCase.execute(input);

    if (!result.success || !result.data) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      items: result.data.items.map((item: any) => this.mapToResponseDto(item)),
      meta: result.data.meta,
    };
  }

  /**
   * Get a service by ID
   * GET /api/v1/services/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID', description: 'Retrieves a service by its ID' })
  @ApiParam({ name: 'id', description: 'Service UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Service retrieved successfully',
    type: ServiceResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async findOne(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ServiceResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: GetServiceInput = {
      id,
      performedBy: userId,
    };

    const result = await this.getServiceUseCase.execute(input);

    if (!result.success || !result.service) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.service);
  }

  /**
   * Update an existing service
   * PUT /api/v1/services/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update service', description: 'Updates an existing service' })
  @ApiParam({ name: 'id', description: 'Service UUID', type: String })
  @ApiBody({ type: UpdateServiceDto })
  @ApiResponse({
    status: 200,
    description: 'Service updated successfully',
    type: ServiceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ServiceResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: UpdateServiceInput = {
      id,
      name: updateDto.name,
      description: updateDto.description,
      durationMinutes: updateDto.durationMinutes,
      price: updateDto.price,
      consumesInventory: updateDto.consumesInventory,
      consumedItems: updateDto.consumedItems,
      requiredResources: updateDto.requiredResources,
      tags: updateDto.tags,
      performedBy: userId,
    };

    const result = await this.updateServiceUseCase.execute(input);

    if (!result.success || !result.service) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.service);
  }

  /**
   * Delete a service
   * DELETE /api/v1/services/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete service', description: 'Deletes a service' })
  @ApiParam({ name: 'id', description: 'Service UUID', type: String })
  @ApiResponse({ status: 204, description: 'Service deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async delete(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: DeleteServiceInput = {
      id,
      performedBy: userId,
    };

    const result = await this.deleteServiceUseCase.execute(input);

    if (!result.success) {
      throw mapApplicationErrorToHttpException(result.error!);
    }
  }

  /**
   * Maps use case output to response DTO
   */
  private mapToResponseDto(output: any): ServiceResponseDto {
    return {
      id: output.id,
      name: output.name,
      description: output.description,
      durationMinutes: output.durationMinutes,
      price: output.price,
      consumesInventory: output.consumesInventory,
      consumedItems: output.consumedItems,
      requiredResources: output.requiredResources,
      tags: output.tags,
      createdAt: output.createdAt,
      updatedAt: output.updatedAt,
    };
  }
}
