/**
 * Customer Controller
 * 
 * REST API controller for Customer management endpoints.
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
import { CreateCustomerDto, UpdateCustomerDto, CustomerResponseDto } from '../dto/customer.dto';
import { PaginatedResponseDto } from '../../../../shared/presentation/dto/pagination.dto';
import { SearchCustomersQueryDto } from '../dto/search-customers-query.dto';
import { CreateCustomerUseCase, CreateCustomerInput } from '../../application/create-customer.use-case';
import { UpdateCustomerUseCase, UpdateCustomerInput } from '../../application/update-customer.use-case';
import { ArchiveCustomerUseCase, ArchiveCustomerInput } from '../../application/archive-customer.use-case';
import { SearchCustomersUseCase, SearchCustomersInput } from '../../application/search-customers.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@Controller('api/v1/customers')
@UseGuards(FirebaseAuthGuard)
export class CustomerController {
  constructor(
    private readonly createCustomerUseCase: CreateCustomerUseCase,
    private readonly updateCustomerUseCase: UpdateCustomerUseCase,
    private readonly archiveCustomerUseCase: ArchiveCustomerUseCase,
    private readonly searchCustomersUseCase: SearchCustomersUseCase,
  ) {}

  /**
   * Create a new customer
   * POST /api/v1/customers
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateCustomerDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CustomerResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: CreateCustomerInput = {
      fullName: createDto.fullName,
      email: createDto.email,
      phone: createDto.phone,
      address: createDto.address,
      consentMarketing: createDto.consentMarketing ?? false,
      consentReminders: createDto.consentReminders ?? false,
      performedBy: userId,
    };

    const result = await this.createCustomerUseCase.execute(input);

    if (!result.success || !result.customer) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.customer);
  }

  /**
   * Update an existing customer
   * PUT /api/v1/customers/:id
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomerDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CustomerResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: UpdateCustomerInput = {
      id,
      fullName: updateDto.fullName,
      email: updateDto.email,
      phone: updateDto.phone,
      address: updateDto.address,
      consentMarketing: updateDto.consentMarketing,
      consentReminders: updateDto.consentReminders,
      performedBy: userId,
    };

    const result = await this.updateCustomerUseCase.execute(input);

    if (!result.success || !result.customer) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.customer);
  }

  /**
   * Get a customer by ID
   * GET /api/v1/customers/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CustomerResponseDto> {
    // TODO: Implement GetCustomerUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Search customers
   * GET /api/v1/customers/search
   */
  @Get('search')
  async search(
    @Query() query: SearchCustomersQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedResponseDto<CustomerResponseDto>> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: SearchCustomersInput = {
      q: query.q,
      email: query.email,
      phone: query.phone,
      fullName: query.fullName,
      consentMarketing: query.consentMarketing,
      consentReminders: query.consentReminders,
      archived: query.archived,
      page: query.page || 1,
      perPage: query.perPage || 20,
      sort: query.sort,
      performedBy: userId,
    };

    const result = await this.searchCustomersUseCase.execute(input);

    if (!result.success || !result.data) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      items: result.data.items.map((item: any) => this.mapToResponseDto(item)),
      meta: result.data.meta,
    };
  }

  /**
   * Archive a customer
   * POST /api/v1/customers/:id/archive
   */
  @Post(':id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: ArchiveCustomerInput = {
      id,
      performedBy: userId,
      operation: 'archive',
    };

    const result = await this.archiveCustomerUseCase.execute(input);

    if (!result.success) {
      throw mapApplicationErrorToHttpException(result.error!);
    }
  }

  /**
   * Maps use case output to response DTO
   */
  private mapToResponseDto(output: {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      postalCode: string;
      country?: string;
    };
    consentMarketing: boolean;
    consentReminders: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CustomerResponseDto {
    return {
      id: output.id,
      fullName: output.fullName,
      email: output.email,
      phone: output.phone,
      address: output.address,
      consentMarketing: output.consentMarketing,
      consentReminders: output.consentReminders,
      createdAt: output.createdAt,
      updatedAt: output.updatedAt,
    };
  }
}

