/**
 * Supplier Controller
 * 
 * REST API controller for Supplier management endpoints.
 */

import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FirebaseAuthGuard, AuthenticatedRequest } from '../../../../shared/auth/firebase-auth.guard';
import { CreateSupplierDto, UpdateSupplierDto, SupplierResponseDto } from '../dto/supplier.dto';
import { CreateSupplierUseCase, CreateSupplierInput } from '../../application/create-supplier.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@Controller('api/v1/suppliers')
@UseGuards(FirebaseAuthGuard)
export class SupplierController {
  constructor(
    private readonly createSupplierUseCase: CreateSupplierUseCase,
  ) {}

  /**
   * Create a new supplier
   * POST /api/v1/suppliers
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateSupplierDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<SupplierResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: CreateSupplierInput = {
      name: createDto.name,
      contactEmail: createDto.contactEmail,
      phone: createDto.phone,
      defaultLeadTimeDays: createDto.defaultLeadTimeDays,
      performedBy: userId,
    };

    const result = await this.createSupplierUseCase.execute(input);

    if (!result.success || !result.supplier) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.supplier);
  }

  /**
   * Update an existing supplier
   * PUT /api/v1/suppliers/:id
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSupplierDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<SupplierResponseDto> {
    // TODO: Implement UpdateSupplierUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Get a supplier by ID
   * GET /api/v1/suppliers/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<SupplierResponseDto> {
    // TODO: Implement GetSupplierUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Maps use case output to response DTO
   */
  private mapToResponseDto(output: any): SupplierResponseDto {
    return {
      id: output.id,
      name: output.name,
      contactEmail: output.contactEmail,
      phone: output.phone,
      defaultLeadTimeDays: output.defaultLeadTimeDays,
      createdAt: output.createdAt,
      updatedAt: output.updatedAt,
    };
  }
}

