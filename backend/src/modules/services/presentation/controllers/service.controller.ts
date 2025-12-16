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
import { FirebaseAuthGuard, AuthenticatedRequest } from '../../../../shared/auth/firebase-auth.guard';
import { CreateServiceDto, UpdateServiceDto, ServiceResponseDto } from '../dto/service.dto';
import { CreateServiceUseCase, CreateServiceInput } from '../../application/create-service.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@Controller('api/v1/services')
@UseGuards(FirebaseAuthGuard)
export class ServiceController {
  constructor(
    private readonly createServiceUseCase: CreateServiceUseCase,
  ) {}

  /**
   * Create a new service
   * POST /api/v1/services
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
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

