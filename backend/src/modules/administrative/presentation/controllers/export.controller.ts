/**
 * Export Controller
 *
 * REST API controller for data export endpoints.
 */

import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import {
  FirebaseAuthGuard,
  AuthenticatedRequest,
} from '../../../../shared/auth/firebase-auth.guard';
import { ExportCustomersQueryDto } from '../dto/export-customers-query.dto';
import {
  ExportCustomersUseCase,
  ExportCustomersInput,
} from '../../application/export-customers.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@ApiTags('Administrative')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/export')
@UseGuards(FirebaseAuthGuard)
export class ExportController {
  constructor(private readonly exportCustomersUseCase: ExportCustomersUseCase) {}

  /**
   * Export customers
   * GET /api/v1/export/customers
   */
  @Get('customers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Export customers',
    description: 'Exports customers to CSV or JSON format with optional filters',
  })
  @ApiQuery({
    name: 'format',
    required: true,
    enum: ['csv', 'json'],
    description: 'Export format',
  })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
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
  @ApiResponse({
    status: 200,
    description: 'Export file generated successfully',
    content: {
      'text/csv': {
        schema: { type: 'string', format: 'binary' },
      },
      'application/json': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async exportCustomers(
    @Query() query: ExportCustomersQueryDto,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: ExportCustomersInput = {
      format: query.format,
      q: query.q,
      email: query.email,
      phone: query.phone,
      fullName: query.fullName,
      consentMarketing: query.consentMarketing,
      consentReminders: query.consentReminders,
      archived: query.archived,
      performedBy: userId,
    };

    const result = await this.exportCustomersUseCase.execute(input);

    if (!result.success || !result.data) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    // Set response headers for file download
    res.setHeader('Content-Type', result.data.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.data.filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(result.data.content, 'utf8'));

    // Send file content
    res.send(result.data.content);
  }
}

