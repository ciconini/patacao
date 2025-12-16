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
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FirebaseAuthGuard, AuthenticatedRequest } from '../../../../shared/auth/firebase-auth.guard';
import { CreateStoreDto, UpdateStoreDto, StoreResponseDto } from '../dto/store.dto';
import { CreateStoreUseCase, CreateStoreInput } from '../../application/create-store.use-case';
import { UpdateStoreUseCase, UpdateStoreInput } from '../../application/update-store.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@Controller('api/v1/stores')
@UseGuards(FirebaseAuthGuard)
export class StoreController {
  constructor(
    private readonly createStoreUseCase: CreateStoreUseCase,
    private readonly updateStoreUseCase: UpdateStoreUseCase,
  ) {}

  /**
   * Create a new store
   * POST /api/v1/stores
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
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
   * Get a store by ID
   * GET /api/v1/stores/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<StoreResponseDto> {
    // TODO: Implement GetStoreUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Delete a store
   * DELETE /api/v1/stores/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    // TODO: Implement DeleteStoreUseCase
    throw new Error('Not implemented yet');
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

