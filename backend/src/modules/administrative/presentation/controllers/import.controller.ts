/**
 * Import Controller
 * 
 * REST API controller for data import endpoints.
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FirebaseAuthGuard, AuthenticatedRequest } from '../../../../shared/auth/firebase-auth.guard';
import { ImportCustomersDto, ImportCustomersResponseDto } from '../dto/customer.dto';
import { ImportCustomersUseCase, ImportCustomersInput } from '../../application/import-customers.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@Controller('api/v1/import')
@UseGuards(FirebaseAuthGuard)
export class ImportController {
  constructor(
    private readonly importCustomersUseCase: ImportCustomersUseCase,
  ) {}

  /**
   * Import customers from CSV
   * POST /api/v1/import/customers
   */
  @Post('customers')
  @HttpCode(HttpStatus.OK)
  async importCustomers(
    @Body() importDto: ImportCustomersDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<ImportCustomersResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: ImportCustomersInput = {
      fileContent: importDto.csvContent,
      format: 'csv',
      skipDuplicates: true,
      dryRun: false,
      performedBy: userId,
    };

    const result = await this.importCustomersUseCase.execute(input);

    if (!result.success || !result.data) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      totalRows: result.data.totalRecords,
      successful: result.data.successful,
      failed: result.data.failed,
      errors: result.data.errors,
    };
  }
}

