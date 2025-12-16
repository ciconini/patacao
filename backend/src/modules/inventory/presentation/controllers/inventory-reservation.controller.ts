/**
 * Inventory Reservation Controller
 * 
 * REST API controller for Inventory Reservation endpoints.
 */

import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FirebaseAuthGuard, AuthenticatedRequest } from '../../../../shared/auth/firebase-auth.guard';
import { CreateInventoryReservationDto, ReleaseInventoryReservationDto, InventoryReservationResponseDto } from '../dto/inventory-reservation.dto';
import { CreateInventoryReservationUseCase, CreateInventoryReservationInput } from '../../application/inventory-reservation.use-case';
import { ReleaseInventoryReservationUseCase, ReleaseInventoryReservationInput } from '../../application/release-inventory-reservation.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@Controller('api/v1/inventory-reservations')
@UseGuards(FirebaseAuthGuard)
export class InventoryReservationController {
  constructor(
    private readonly createInventoryReservationUseCase: CreateInventoryReservationUseCase,
    private readonly releaseInventoryReservationUseCase: ReleaseInventoryReservationUseCase,
  ) {}

  /**
   * Create a new inventory reservation
   * POST /api/v1/inventory-reservations
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateInventoryReservationDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<InventoryReservationResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: CreateInventoryReservationInput = {
      productId: createDto.productId,
      quantity: createDto.quantity,
      reservedForId: createDto.reservedForId,
      reservedForType: createDto.reservedForType,
      expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : undefined,
      performedBy: userId,
    };

    const result = await this.createInventoryReservationUseCase.execute(input);

    if (!result.success || !result.reservation) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      id: result.reservation.id,
      productId: result.reservation.productId,
      quantity: result.reservation.quantity,
      reservedForId: result.reservation.reservedForId,
      reservedForType: result.reservation.reservedForType,
      status: 'active', // Default status for newly created reservations
      expiresAt: result.reservation.expiresAt,
      createdAt: result.reservation.createdAt,
      updatedAt: result.reservation.createdAt, // Use createdAt as updatedAt for new reservations
    };
  }

  /**
   * Release an inventory reservation
   * POST /api/v1/inventory-reservations/:id/release
   */
  @Post(':id/release')
  @HttpCode(HttpStatus.NO_CONTENT)
  async release(
    @Param('id') id: string,
    @Body() releaseDto: ReleaseInventoryReservationDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: ReleaseInventoryReservationInput = {
      id,
      performedBy: userId,
    };

    const result = await this.releaseInventoryReservationUseCase.execute(input);

    if (!result.success) {
      throw mapApplicationErrorToHttpException(result.error!);
    }
  }
}

