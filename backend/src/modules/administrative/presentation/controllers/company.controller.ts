/**
 * Company Controller
 * 
 * REST API controller for Company management endpoints.
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
import { CreateCompanyDto, UpdateCompanyDto, CompanyResponseDto } from '../dto/company.dto';
import { CreateCompanyProfileUseCase, CreateCompanyProfileInput } from '../../application/create-company-profile.use-case';
import { UpdateCompanyProfileUseCase, UpdateCompanyProfileInput } from '../../application/update-company-profile.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@Controller('api/v1/companies')
@UseGuards(FirebaseAuthGuard)
export class CompanyController {
  constructor(
    private readonly createCompanyProfileUseCase: CreateCompanyProfileUseCase,
    private readonly updateCompanyProfileUseCase: UpdateCompanyProfileUseCase,
  ) {}

  /**
   * Create a new company profile
   * POST /api/v1/companies
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateCompanyDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CompanyResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: CreateCompanyProfileInput = {
      name: createDto.name,
      nif: createDto.nif,
      address: createDto.address,
      taxRegime: createDto.taxRegime,
      defaultVatRate: createDto.defaultVatRate,
      phone: createDto.phone,
      email: createDto.email,
      website: createDto.website,
      performedBy: userId,
    };

    const result = await this.createCompanyProfileUseCase.execute(input);

    if (!result.success || !result.company) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.company);
  }

  /**
   * Update an existing company profile
   * PUT /api/v1/companies/:id
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCompanyDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CompanyResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: UpdateCompanyProfileInput = {
      id,
      name: updateDto.name,
      nif: updateDto.nif,
      address: updateDto.address,
      taxRegime: updateDto.taxRegime,
      defaultVatRate: updateDto.defaultVatRate,
      phone: updateDto.phone,
      email: updateDto.email,
      website: updateDto.website,
      performedBy: userId,
    };

    const result = await this.updateCompanyProfileUseCase.execute(input);

    if (!result.success || !result.company) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.company);
  }

  /**
   * Get a company by ID
   * GET /api/v1/companies/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CompanyResponseDto> {
    // TODO: Implement GetCompanyUseCase or use repository directly
    // For now, this is a placeholder
    throw new Error('Not implemented yet');
  }

  /**
   * Maps use case output to response DTO
   */
  private mapToResponseDto(output: {
    id: string;
    name: string;
    nif: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country?: string;
    };
    taxRegime: string;
    defaultVatRate?: number;
    phone?: string;
    email?: string;
    website?: string;
    createdAt: Date;
    updatedAt: Date;
  }): CompanyResponseDto {
    return {
      id: output.id,
      name: output.name,
      nif: output.nif,
      address: output.address,
      taxRegime: output.taxRegime,
      defaultVatRate: output.defaultVatRate,
      phone: output.phone,
      email: output.email,
      website: output.website,
      createdAt: output.createdAt,
      updatedAt: output.updatedAt,
    };
  }
}

