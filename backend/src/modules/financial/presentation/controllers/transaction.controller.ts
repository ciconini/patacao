/**
 * Transaction Controller
 * 
 * REST API controller for Transaction management endpoints.
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
import { CreateTransactionDto, CompleteTransactionDto, TransactionResponseDto, CompleteTransactionResponseDto } from '../dto/transaction.dto';
import { CreateTransactionUseCase, CreateTransactionInput } from '../../application/create-transaction.use-case';
import { CompleteTransactionUseCase, CompleteTransactionInput } from '../../application/complete-transaction.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@Controller('api/v1/transactions')
@UseGuards(FirebaseAuthGuard)
export class TransactionController {
  constructor(
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly completeTransactionUseCase: CompleteTransactionUseCase,
  ) {}

  /**
   * Create a new transaction
   * POST /api/v1/transactions
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateTransactionDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<TransactionResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: CreateTransactionInput = {
      storeId: createDto.storeId,
      customerId: createDto.customerId,
      lines: createDto.lines,
      createInvoice: createDto.createInvoice ?? true,
      performedBy: userId,
    };

    const result = await this.createTransactionUseCase.execute(input);

    if (!result.success || !result.transaction) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.transaction);
  }

  /**
   * Complete a transaction
   * POST /api/v1/transactions/:id/complete
   */
  @Post(':id/complete')
  async complete(
    @Param('id') id: string,
    @Body() completeDto: CompleteTransactionDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CompleteTransactionResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: CompleteTransactionInput = {
      id,
      paymentMethod: completeDto.paymentMethod,
      paidAt: completeDto.paidAt ? new Date(completeDto.paidAt) : undefined,
      externalReference: completeDto.externalReference,
      performedBy: userId,
    };

    const result = await this.completeTransactionUseCase.execute(input);

    if (!result.success || !result.transaction) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      id: result.transaction.id,
      storeId: result.transaction.storeId,
      invoiceId: result.transaction.invoiceId,
      paymentStatus: result.transaction.paymentStatus,
      paymentMethod: result.transaction.paymentMethod,
      paidAt: result.transaction.paidAt,
      externalReference: result.transaction.externalReference,
      updatedAt: result.transaction.updatedAt,
      stockMovements: result.transaction.stockMovements,
    };
  }

  /**
   * Get a transaction by ID
   * GET /api/v1/transactions/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<TransactionResponseDto> {
    // TODO: Implement GetTransactionUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Maps use case output to response DTO
   */
  private mapToResponseDto(output: any): TransactionResponseDto {
    return {
      id: output.id,
      storeId: output.storeId,
      invoiceId: output.invoiceId,
      lines: output.lines,
      totalAmount: output.totalAmount,
      paymentStatus: output.paymentStatus,
      paymentMethod: output.paymentMethod,
      paidAt: output.paidAt,
      externalReference: output.externalReference,
      createdBy: output.createdBy,
      createdAt: output.createdAt,
      updatedAt: output.updatedAt,
    };
  }
}

