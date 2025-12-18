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
  ApiExtraModels,
} from '@nestjs/swagger';
import {
  FirebaseAuthGuard,
  AuthenticatedRequest,
} from '../../../../shared/auth/firebase-auth.guard';
import { CreateServiceDto, UpdateServiceDto, ServiceResponseDto, ConsumedItemDto } from '../dto/service.dto';
import {
  CreateServiceUseCase,
  CreateServiceInput,
} from '../../application/create-service.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@ApiTags('Services')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(ConsumedItemDto)
@Controller('api/v1/services')
@UseGuards(FirebaseAuthGuard)
export class ServiceController {
  constructor(private readonly createServiceUseCase: CreateServiceUseCase) {}

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
    // TODO: Implement UpdateServiceUseCase
    throw new Error('Not implemented yet');
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
  async findOne(@Param('id') id: string): Promise<ServiceResponseDto> {
    // TODO: Implement GetServiceUseCase
    throw new Error('Not implemented yet');
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
  async delete(@Param('id') id: string): Promise<void> {
    // TODO: Implement DeleteServiceUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Maps use case output to response DTO
   */
  private mapToResponseDto(output: {
    id: string;
    name: string;
    description?: string;
    durationMinutes: number;
    price: number;
    consumesInventory: boolean;
    consumedItems: Array<{ productId: string; quantity: number }>;
    requiredResources: string[];
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
  }): ServiceResponseDto {
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
