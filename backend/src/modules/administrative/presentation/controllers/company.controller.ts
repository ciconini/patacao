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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import {
  FirebaseAuthGuard,
  AuthenticatedRequest,
} from '../../../../shared/auth/firebase-auth.guard';
import { CreateCompanyDto, UpdateCompanyDto, CompanyResponseDto } from '../dto/company.dto';
import {
  CreateCompanyProfileUseCase,
  CreateCompanyProfileInput,
} from '../../application/create-company-profile.use-case';
import {
  UpdateCompanyProfileUseCase,
  UpdateCompanyProfileInput,
} from '../../application/update-company-profile.use-case';
import {
  GetCompanyProfileUseCase,
  GetCompanyProfileInput,
} from '../../application/get-company-profile.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@ApiTags('Administrative')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/companies')
@UseGuards(FirebaseAuthGuard)
export class CompanyController {
  constructor(
    private readonly createCompanyProfileUseCase: CreateCompanyProfileUseCase,
    private readonly updateCompanyProfileUseCase: UpdateCompanyProfileUseCase,
    private readonly getCompanyProfileUseCase: GetCompanyProfileUseCase,
  ) {}

  /**
   * Create a new company profile
   * POST /api/v1/companies
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create company profile',
    description: 'Creates a new company profile with fiscal data and settings',
  })
  @ApiBody({ type: CreateCompanyDto })
  @ApiResponse({
    status: 201,
    description: 'Company created successfully',
    type: CompanyResponseDto,
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
    description: 'Company with this NIF already exists',
  })
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
  @ApiOperation({
    summary: 'Update company profile',
    description: 'Updates an existing company profile',
  })
  @ApiParam({ name: 'id', description: 'Company UUID', type: String })
  @ApiBody({ type: UpdateCompanyDto })
  @ApiResponse({
    status: 200,
    description: 'Company updated successfully',
    type: CompanyResponseDto,
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
    description: 'Company not found',
  })
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
  @ApiOperation({
    summary: 'Get company by ID',
    description: 'Retrieves a company profile by its ID',
  })
  @ApiParam({ name: 'id', description: 'Company UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Company retrieved successfully',
    type: CompanyResponseDto,
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
    description: 'Company not found',
  })
  async findOne(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<CompanyResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: GetCompanyProfileInput = {
      id,
      performedBy: userId,
    };

    const result = await this.getCompanyProfileUseCase.execute(input);

    if (!result.success || !result.company) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.company);
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
