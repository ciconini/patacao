/**
 * Financial Export Controller
 * 
 * REST API controller for Financial Export endpoints.
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
import { CreateFinancialExportDto, FinancialExportResponseDto } from '../dto/financial-export.dto';
import { CreateFinancialExportUseCase, CreateFinancialExportInput } from '../../application/create-financial-export.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@Controller('api/v1/financial-exports')
@UseGuards(FirebaseAuthGuard)
export class FinancialExportController {
  constructor(
    private readonly createFinancialExportUseCase: CreateFinancialExportUseCase,
  ) {}

  /**
   * Create a new financial export
   * POST /api/v1/financial-exports
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateFinancialExportDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<FinancialExportResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: CreateFinancialExportInput = {
      companyId: createDto.companyId,
      periodStart: new Date(createDto.startDate),
      periodEnd: new Date(createDto.endDate),
      format: createDto.format,
      includeVoided: createDto.includeVoided ?? false,
      deliveryMethod: createDto.sftpHost ? 'sftp' : 'download',
      performedBy: userId,
    };

    const result = await this.createFinancialExportUseCase.execute(input);

    if (!result.success || !result.export) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      id: result.export.id,
      companyId: result.export.companyId,
      startDate: result.export.periodStart,
      endDate: result.export.periodEnd,
      format: result.export.format,
      filePath: result.export.filePath,
      sftpReference: result.export.sftpReference,
      recordCount: result.export.recordCount,
      totalAmount: 0, // TODO: Calculate total amount from exported records
      createdBy: result.export.createdBy,
      createdAt: result.export.createdAt,
    };
  }

  /**
   * Get a financial export by ID
   * GET /api/v1/financial-exports/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<FinancialExportResponseDto> {
    // TODO: Implement GetFinancialExportUseCase
    throw new Error('Not implemented yet');
  }
}

