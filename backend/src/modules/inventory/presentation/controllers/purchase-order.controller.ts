/**
 * Purchase Order Controller
 * 
 * REST API controller for Purchase Order management endpoints.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FirebaseAuthGuard, AuthenticatedRequest } from '../../../../shared/auth/firebase-auth.guard';
import { CreatePurchaseOrderDto, ReceivePurchaseOrderDto, PurchaseOrderResponseDto } from '../dto/purchase-order.dto';
import { CreatePurchaseOrderUseCase, CreatePurchaseOrderInput } from '../../application/create-purchase-order.use-case';
import { ReceivePurchaseOrderUseCase, ReceivePurchaseOrderInput } from '../../application/receive-purchase-order.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@Controller('api/v1/purchase-orders')
@UseGuards(FirebaseAuthGuard)
export class PurchaseOrderController {
  constructor(
    private readonly createPurchaseOrderUseCase: CreatePurchaseOrderUseCase,
    private readonly receivePurchaseOrderUseCase: ReceivePurchaseOrderUseCase,
  ) {}

  /**
   * Create a new purchase order
   * POST /api/v1/purchase-orders
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreatePurchaseOrderDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PurchaseOrderResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: CreatePurchaseOrderInput = {
      supplierId: createDto.supplierId,
      storeId: createDto.storeId,
      lines: createDto.lines,
      status: createDto.status,
      performedBy: userId,
    };

    const result = await this.createPurchaseOrderUseCase.execute(input);

    if (!result.success || !result.purchaseOrder) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.purchaseOrder);
  }

  /**
   * Receive a purchase order
   * POST /api/v1/purchase-orders/:id/receive
   */
  @Post(':id/receive')
  async receive(
    @Param('id') id: string,
    @Body() receiveDto: ReceivePurchaseOrderDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PurchaseOrderResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: ReceivePurchaseOrderInput = {
      id,
      storeId: receiveDto.storeId,
      receivedLines: receiveDto.receivedLines.map(line => ({
        productId: line.productId,
        quantity: line.quantityReceived,
        batchNumber: line.batchNumber,
        expiryDate: line.expiryDate ? new Date(line.expiryDate) : undefined,
      })),
      performedBy: userId,
    };

    const result = await this.receivePurchaseOrderUseCase.execute(input);

    if (!result.success || !result.receipt) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    // TODO: Map receipt to response DTO - receipt structure is different from purchase order
    throw new Error('Receipt mapping not yet implemented');
  }

  /**
   * Get a purchase order by ID
   * GET /api/v1/purchase-orders/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PurchaseOrderResponseDto> {
    // TODO: Implement GetPurchaseOrderUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Maps use case output to response DTO
   */
  private mapToResponseDto(output: any): PurchaseOrderResponseDto {
    return {
      id: output.id,
      supplierId: output.supplierId,
      supplierName: output.supplierName,
      storeId: output.storeId,
      lines: output.lines,
      status: output.status,
      totalAmount: output.totalAmount,
      createdBy: output.createdBy,
      createdAt: output.createdAt,
      updatedAt: output.updatedAt,
    };
  }
}

