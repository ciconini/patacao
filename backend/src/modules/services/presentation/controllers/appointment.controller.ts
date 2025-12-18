/**
 * Appointment Controller
 *
 * REST API controller for Appointment management endpoints.
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
import { CreateAppointmentDto, AppointmentResponseDto } from '../dto/appointment.dto';
import { PaginatedResponseDto, PaginationMetaDto } from '../../../../shared/presentation/dto/pagination.dto';
import {
  CreateAppointmentUseCase,
  CreateAppointmentInput,
} from '../../application/create-appointment.use-case';
import {
  ConfirmAppointmentUseCase,
  ConfirmAppointmentInput,
} from '../../application/confirm-appointment.use-case';
import {
  CompleteAppointmentUseCase,
  CompleteAppointmentInput,
} from '../../application/complete-appointment.use-case';
import {
  CancelAppointmentUseCase,
  CancelAppointmentInput,
} from '../../application/cancel-appointment.use-case';
import {
  SearchAppointmentsUseCase,
  SearchAppointmentsInput,
} from '../../application/search-appointments.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@ApiTags('Services')
@ApiBearerAuth('JWT-auth')
@ApiTags('Services')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(PaginatedResponseDto, PaginationMetaDto)
@Controller('api/v1/appointments')
@UseGuards(FirebaseAuthGuard)
export class AppointmentController {
  constructor(
    private readonly createAppointmentUseCase: CreateAppointmentUseCase,
    private readonly confirmAppointmentUseCase: ConfirmAppointmentUseCase,
    private readonly completeAppointmentUseCase: CompleteAppointmentUseCase,
    private readonly cancelAppointmentUseCase: CancelAppointmentUseCase,
    private readonly searchAppointmentsUseCase: SearchAppointmentsUseCase,
  ) {}

  /**
   * Create a new appointment
   * POST /api/v1/appointments
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create appointment',
    description: 'Creates a new appointment for a customer and pet',
  })
  @ApiBody({ type: CreateAppointmentDto })
  @ApiResponse({
    status: 201,
    description: 'Appointment created successfully',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or scheduling conflict' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Customer, pet, store, or staff not found' })
  async create(
    @Body() createDto: CreateAppointmentDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<AppointmentResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: CreateAppointmentInput = {
      storeId: createDto.storeId,
      customerId: createDto.customerId,
      petId: createDto.petId,
      startAt: new Date(createDto.startAt),
      endAt: new Date(createDto.endAt),
      staffId: createDto.staffId,
      services: createDto.services,
      notes: createDto.notes,
      // recurrence is not supported in the current implementation
      performedBy: userId,
    };

    const result = await this.createAppointmentUseCase.execute(input);

    if (!result.success || !result.appointment) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.appointment);
  }

  /**
   * Update an existing appointment
   * PUT /api/v1/appointments/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update appointment', description: 'Updates an existing appointment' })
  @ApiParam({ name: 'id', description: 'Appointment UUID', type: String })
  @ApiBody({ type: CreateAppointmentDto })
  @ApiResponse({
    status: 200,
    description: 'Appointment updated successfully',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: CreateAppointmentDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<AppointmentResponseDto> {
    // TODO: Implement UpdateAppointmentUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Get an appointment by ID
   * GET /api/v1/appointments/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get appointment by ID',
    description: 'Retrieves an appointment by its ID',
  })
  @ApiParam({ name: 'id', description: 'Appointment UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Appointment retrieved successfully',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  async findOne(@Param('id') id: string): Promise<AppointmentResponseDto> {
    // TODO: Implement GetAppointmentUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Search appointments
   * GET /api/v1/appointments
   */
  @Get()
  @ApiOperation({
    summary: 'Search appointments',
    description: 'Searches and filters appointments with pagination support',
  })
  @ApiQuery({ name: 'storeId', required: false, type: String, description: 'Filter by store ID' })
  @ApiQuery({ name: 'staffId', required: false, type: String, description: 'Filter by staff ID' })
  @ApiQuery({
    name: 'customerId',
    required: false,
    type: String,
    description: 'Filter by customer ID',
  })
  @ApiQuery({ name: 'petId', required: false, type: String, description: 'Filter by pet ID' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter by start date (ISO string)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter by end date (ISO string)',
  })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status' })
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
    description: 'Appointments retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/AppointmentResponseDto' },
        },
        meta: { $ref: '#/components/schemas/PaginationMetaDto' },
      },
      required: ['items', 'meta'],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async search(
    @Query('storeId') storeId?: string,
    @Query('staffId') staffId?: string,
    @Query('customerId') customerId?: string,
    @Query('petId') petId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('sort') sort?: string,
    @Request() req?: AuthenticatedRequest,
  ): Promise<PaginatedResponseDto<AppointmentResponseDto>> {
    const userId = req?.firebaseUid || req?.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: SearchAppointmentsInput = {
      storeId,
      staffId,
      customerId,
      petId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? parseInt(perPage, 10) : 20,
      sort,
      performedByUser: userId,
    };

    const result = await this.searchAppointmentsUseCase.execute(input);

    if (!result.success || !result.data) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      items: result.data.items.map((item) => this.mapToResponseDto(item)),
      meta: result.data.meta,
    };
  }

  /**
   * Confirm an appointment
   * POST /api/v1/appointments/:id/confirm
   */
  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm appointment', description: 'Confirms a pending appointment' })
  @ApiParam({ name: 'id', description: 'Appointment UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Appointment confirmed successfully',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Appointment cannot be confirmed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  async confirm(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<AppointmentResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: ConfirmAppointmentInput = {
      id,
      performedBy: userId,
    };

    const result = await this.confirmAppointmentUseCase.execute(input);

    if (!result.success || !result.appointment) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.appointment);
  }

  /**
   * Complete an appointment
   * POST /api/v1/appointments/:id/complete
   */
  @Post(':id/complete')
  @ApiOperation({
    summary: 'Complete appointment',
    description: 'Marks an appointment as completed',
  })
  @ApiParam({ name: 'id', description: 'Appointment UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Appointment completed successfully',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Appointment cannot be completed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  async complete(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<AppointmentResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: CompleteAppointmentInput = {
      id,
      performedBy: userId,
    };

    const result = await this.completeAppointmentUseCase.execute(input);

    if (!result.success || !result.appointment) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.appointment);
  }

  /**
   * Cancel an appointment
   * POST /api/v1/appointments/:id/cancel
   */
  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel appointment',
    description: 'Cancels an appointment with an optional reason',
  })
  @ApiParam({ name: 'id', description: 'Appointment UUID', type: String })
  @ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' } } } })
  @ApiResponse({
    status: 200,
    description: 'Appointment cancelled successfully',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Appointment cannot be cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<AppointmentResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: CancelAppointmentInput = {
      id,
      reason,
      performedBy: userId,
    };

    const result = await this.cancelAppointmentUseCase.execute(input);

    if (!result.success || !result.appointment) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.appointment);
  }

  /**
   * Maps use case output to response DTO
   */
  private mapToResponseDto(output: any): AppointmentResponseDto {
    return {
      id: output.id,
      storeId: output.storeId,
      customerId: output.customerId,
      petId: output.petId,
      startAt: output.startAt,
      endAt: output.endAt,
      status: output.status,
      staffId: output.staffId,
      // services is not part of AppointmentResponseDto - it's in AppointmentEnrichedResponseDto
      notes: output.notes,
      noShow: output.noShow || false,
      createdAt: output.createdAt,
      updatedAt: output.updatedAt,
    };
  }
}
