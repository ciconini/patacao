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
import { CreateCustomerDto, UpdateCustomerDto, CustomerResponseDto } from '../dto/customer.dto';
import { PaginatedResponseDto, PaginationMetaDto } from '../../../../shared/presentation/dto/pagination.dto';
import { SearchCustomersQueryDto } from '../dto/search-customers-query.dto';
import {
  CreateCustomerUseCase,
  CreateCustomerInput,
} from '../../application/create-customer.use-case';
import {
  UpdateCustomerUseCase,
  UpdateCustomerInput,
} from '../../application/update-customer.use-case';
import {
  ArchiveCustomerUseCase,
  ArchiveCustomerInput,
} from '../../application/archive-customer.use-case';
import {
  SearchCustomersUseCase,
  SearchCustomersInput,
} from '../../application/search-customers.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@ApiTags('Administrative')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(PaginatedResponseDto, PaginationMetaDto)
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
  @ApiOperation({ summary: 'Create customer', description: 'Creates a new customer profile' })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({
    status: 201,
    description: 'Customer created successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Customer with this email already exists' })
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
  @ApiOperation({ summary: 'Update customer', description: 'Updates an existing customer profile' })
  @ApiParam({ name: 'id', description: 'Customer UUID', type: String })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({
    status: 200,
    description: 'Customer updated successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
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
  @ApiOperation({
    summary: 'Get customer by ID',
    description: 'Retrieves a customer profile by its ID',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Customer retrieved successfully',
    type: CustomerResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async findOne(@Param('id') id: string): Promise<CustomerResponseDto> {
    // TODO: Implement GetCustomerUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Search customers
   * GET /api/v1/customers/search
   */
  @Get('search')
  @ApiOperation({
    summary: 'Search customers',
    description: 'Searches and filters customers with pagination support',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Search query (name, email, phone)',
  })
  @ApiQuery({ name: 'email', required: false, type: String, description: 'Filter by email' })
  @ApiQuery({ name: 'phone', required: false, type: String, description: 'Filter by phone' })
  @ApiQuery({ name: 'fullName', required: false, type: String, description: 'Filter by full name' })
  @ApiQuery({
    name: 'consentMarketing',
    required: false,
    type: Boolean,
    description: 'Filter by marketing consent',
  })
  @ApiQuery({
    name: 'consentReminders',
    required: false,
    type: Boolean,
    description: 'Filter by reminders consent',
  })
  @ApiQuery({
    name: 'archived',
    required: false,
    type: Boolean,
    description: 'Filter by archived status',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number' })
  @ApiQuery({
    name: 'perPage',
    required: false,
    type: Number,
    example: 20,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Sort field and direction',
  })
  @ApiResponse({
    status: 200,
    description: 'Customers retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/CustomerResponseDto' },
        },
        meta: { $ref: '#/components/schemas/PaginationMetaDto' },
      },
      required: ['items', 'meta'],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
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
  @ApiOperation({ summary: 'Archive customer', description: 'Archives a customer (soft delete)' })
  @ApiParam({ name: 'id', description: 'Customer UUID', type: String })
  @ApiResponse({ status: 204, description: 'Customer archived successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async archive(@Param('id') id: string, @Request() req: AuthenticatedRequest): Promise<void> {
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
