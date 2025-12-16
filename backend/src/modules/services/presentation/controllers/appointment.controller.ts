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
import { FirebaseAuthGuard, AuthenticatedRequest } from '../../../../shared/auth/firebase-auth.guard';
import { CreateAppointmentDto, AppointmentResponseDto } from '../dto/appointment.dto';
import { PaginatedResponseDto } from '../../../../shared/presentation/dto/pagination.dto';
import { CreateAppointmentUseCase, CreateAppointmentInput } from '../../application/create-appointment.use-case';
import { ConfirmAppointmentUseCase, ConfirmAppointmentInput } from '../../application/confirm-appointment.use-case';
import { CompleteAppointmentUseCase, CompleteAppointmentInput } from '../../application/complete-appointment.use-case';
import { CancelAppointmentUseCase, CancelAppointmentInput } from '../../application/cancel-appointment.use-case';
import { SearchAppointmentsUseCase, SearchAppointmentsInput } from '../../application/search-appointments.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

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
  async findOne(@Param('id') id: string): Promise<AppointmentResponseDto> {
    // TODO: Implement GetAppointmentUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Search appointments
   * GET /api/v1/appointments
   */
  @Get()
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
      items: result.data.items.map(item => this.mapToResponseDto(item)),
      meta: result.data.meta,
    };
  }

  /**
   * Confirm an appointment
   * POST /api/v1/appointments/:id/confirm
   */
  @Post(':id/confirm')
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

