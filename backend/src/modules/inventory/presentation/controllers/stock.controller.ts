/**
 * Stock Controller
 *
 * REST API controller for Stock management endpoints (receipts, adjustments, reconciliation).
 */

import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import {
  FirebaseAuthGuard,
  AuthenticatedRequest,
} from '../../../../shared/auth/firebase-auth.guard';
import { ReceiveStockDto, StockAdjustmentDto } from '../dto/stock.dto';
import { ReceiveStockUseCase, ReceiveStockInput } from '../../application/receive-stock.use-case';
import {
  StockAdjustmentUseCase,
  StockAdjustmentInput,
} from '../../application/stock-adjustment.use-case';
import {
  StockReconciliationUseCase,
  StockReconciliationInput,
} from '../../application/stock-reconciliation.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@ApiTags('Inventory')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/stock')
@UseGuards(FirebaseAuthGuard)
export class StockController {
  constructor(
    private readonly receiveStockUseCase: ReceiveStockUseCase,
    private readonly stockAdjustmentUseCase: StockAdjustmentUseCase,
    private readonly stockReconciliationUseCase: StockReconciliationUseCase,
  ) {}

  /**
   * Receive stock
   * POST /api/v1/stock/receipts
   */
  @Post('receipts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Receive stock', description: 'Records stock receipt with batch information' })
  @ApiBody({ type: ReceiveStockDto })
  async receiveStock(
    @Body() receiveDto: ReceiveStockDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<any> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: ReceiveStockInput = {
      storeId: receiveDto.storeId,
      supplierId: receiveDto.supplierId,
      purchaseOrderId: receiveDto.purchaseOrderId,
      lines: receiveDto.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        batchNumber: line.batchNumber,
        expiryDate: line.expiryDate ? new Date(line.expiryDate) : undefined,
        unitCost: line.unitCost,
        locationId: line.locationId,
      })),
      performedBy: userId,
    };

    const result = await this.receiveStockUseCase.execute(input);

    if (!result.success || !result.receipt) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return result.receipt;
  }

  /**
   * Adjust stock
   * POST /api/v1/stock/adjustments
   */
  @Post('adjustments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adjust stock', description: 'Adjusts stock quantity with a reason' })
  @ApiBody({ type: StockAdjustmentDto })
  async adjustStock(
    @Body() adjustmentDto: StockAdjustmentDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<any> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: StockAdjustmentInput = {
      storeId: adjustmentDto.storeId,
      locationId: adjustmentDto.locationId,
      productId: adjustmentDto.productId,
      quantityChange: adjustmentDto.quantityChange,
      reason: adjustmentDto.reason,
      referenceId: adjustmentDto.referenceId,
      performedBy: userId,
    };

    const result = await this.stockAdjustmentUseCase.execute(input);

    if (!result.success || !result.adjustment) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return result.adjustment;
  }

  /**
   * Reconcile stock
   * POST /api/v1/stock/reconciliation
   */
  @Post('reconciliation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reconcile stock', description: 'Reconciles stock counts with physical inventory' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['storeId', 'counts'],
      properties: {
        storeId: { type: 'string', format: 'uuid' },
        locationId: { type: 'string', format: 'uuid' },
        counts: {
          type: 'array',
          items: {
            type: 'object',
            required: ['productId', 'countedQuantity'],
            properties: {
              productId: { type: 'string', format: 'uuid' },
              countedQuantity: { type: 'number' },
              batchNumber: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async reconcileStock(
    @Body()
    reconciliationDto: {
      storeId: string;
      locationId?: string;
      counts: Array<{ productId: string; countedQuantity: number; batchNumber?: string }>;
    },
    @Request() req: AuthenticatedRequest,
  ): Promise<any> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: StockReconciliationInput = {
      storeId: reconciliationDto.storeId,
      locationId: reconciliationDto.locationId,
      counts: reconciliationDto.counts,
      performedBy: userId,
    };

    const result = await this.stockReconciliationUseCase.execute(input);

    if (!result.success || !result.reconciliation) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return result.reconciliation;
  }
}
