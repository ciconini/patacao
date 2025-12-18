/**
 * Invoice Controller
 *
 * REST API controller for Invoice management endpoints.
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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiExtraModels,
} from '@nestjs/swagger';
import {
  FirebaseAuthGuard,
  AuthenticatedRequest,
} from '../../../../shared/auth/firebase-auth.guard';
import {
  CreateInvoiceDraftDto,
  IssueInvoiceDto,
  MarkInvoicePaidDto,
  VoidInvoiceDto,
  InvoiceResponseDto,
  InvoiceLineDto,
} from '../dto/invoice.dto';
import {
  CreateInvoiceDraftUseCase,
  CreateInvoiceDraftInput,
} from '../../application/create-invoice-draft.use-case';
import { IssueInvoiceUseCase, IssueInvoiceInput } from '../../application/issue-invoice.use-case';
import {
  MarkInvoicePaidUseCase,
  MarkInvoicePaidInput,
} from '../../application/mark-invoice-paid.use-case';
import { VoidInvoiceUseCase, VoidInvoiceInput } from '../../application/void-invoice.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@ApiTags('Financial')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(InvoiceLineDto)
@Controller('api/v1/invoices')
@UseGuards(FirebaseAuthGuard)
export class InvoiceController {
  constructor(
    private readonly createInvoiceDraftUseCase: CreateInvoiceDraftUseCase,
    private readonly issueInvoiceUseCase: IssueInvoiceUseCase,
    private readonly markInvoicePaidUseCase: MarkInvoicePaidUseCase,
    private readonly voidInvoiceUseCase: VoidInvoiceUseCase,
  ) {}

  /**
   * Create a draft invoice
   * POST /api/v1/invoices/draft
   */
  @Post('draft')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create invoice draft',
    description: 'Creates a new invoice in draft status',
  })
  @ApiBody({ type: CreateInvoiceDraftDto })
  @ApiResponse({
    status: 201,
    description: 'Invoice draft created successfully',
    type: InvoiceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Company, store, or customer not found' })
  async createDraft(
    @Body() createDto: CreateInvoiceDraftDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<InvoiceResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: CreateInvoiceDraftInput = {
      companyId: createDto.companyId,
      storeId: createDto.storeId,
      buyerCustomerId: createDto.buyerCustomerId,
      lines: createDto.lines,
      performedBy: userId,
    };

    const result = await this.createInvoiceDraftUseCase.execute(input);

    if (!result.success || !result.invoice) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.invoice);
  }

  /**
   * Issue an invoice
   * POST /api/v1/invoices/:id/issue
   */
  @Post(':id/issue')
  @ApiOperation({
    summary: 'Issue invoice',
    description: 'Issues a draft invoice, generating invoice number',
  })
  @ApiParam({ name: 'id', description: 'Invoice UUID', type: String })
  @ApiBody({ type: IssueInvoiceDto })
  @ApiResponse({
    status: 200,
    description: 'Invoice issued successfully',
    type: InvoiceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invoice cannot be issued' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async issue(
    @Param('id') id: string,
    @Body() issueDto: IssueInvoiceDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<InvoiceResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: IssueInvoiceInput = {
      id,
      performedBy: userId,
    };

    const result = await this.issueInvoiceUseCase.execute(input);

    if (!result.success || !result.invoice) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return this.mapToResponseDto(result.invoice);
  }

  /**
   * Mark invoice as paid
   * POST /api/v1/invoices/:id/mark-paid
   */
  @Post(':id/mark-paid')
  @ApiOperation({ summary: 'Mark invoice as paid', description: 'Marks an issued invoice as paid' })
  @ApiParam({ name: 'id', description: 'Invoice UUID', type: String })
  @ApiBody({ type: MarkInvoicePaidDto })
  @ApiResponse({
    status: 200,
    description: 'Invoice marked as paid successfully',
    type: InvoiceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invoice cannot be marked as paid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async markPaid(
    @Param('id') id: string,
    @Body() markPaidDto: MarkInvoicePaidDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<InvoiceResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: MarkInvoicePaidInput = {
      id,
      paymentMethod: markPaidDto.paymentMethod,
      paidAt: markPaidDto.paidAt ? new Date(markPaidDto.paidAt) : undefined,
      externalReference: markPaidDto.externalReference,
      performedBy: userId,
    };

    const result = await this.markInvoicePaidUseCase.execute(input);

    if (!result.success || !result.invoice) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      id: result.invoice.id,
      invoiceNumber: result.invoice.invoiceNumber,
      status: result.invoice.status,
      paidAt: result.invoice.paidAt,
      paymentMethod: result.invoice.paymentMethod,
      externalReference: result.invoice.externalReference,
      updatedAt: result.invoice.updatedAt,
    } as any;
  }

  /**
   * Void an invoice
   * POST /api/v1/invoices/:id/void
   */
  @Post(':id/void')
  @ApiOperation({ summary: 'Void invoice', description: 'Voids an issued invoice with a reason' })
  @ApiParam({ name: 'id', description: 'Invoice UUID', type: String })
  @ApiBody({ type: VoidInvoiceDto })
  @ApiResponse({
    status: 200,
    description: 'Invoice voided successfully',
    type: InvoiceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invoice cannot be voided' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async void(
    @Param('id') id: string,
    @Body() voidDto: VoidInvoiceDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<InvoiceResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: VoidInvoiceInput = {
      id,
      reason: voidDto.reason,
      performedBy: userId,
    };

    const result = await this.voidInvoiceUseCase.execute(input);

    if (!result.success || !result.invoice) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      id: result.invoice.id,
      invoiceNumber: result.invoice.invoiceNumber,
      status: result.invoice.status,
      updatedAt: result.invoice.updatedAt,
    } as any;
  }

  /**
   * Get an invoice by ID
   * GET /api/v1/invoices/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID', description: 'Retrieves an invoice by its ID' })
  @ApiParam({ name: 'id', description: 'Invoice UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Invoice retrieved successfully',
    type: InvoiceResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findOne(@Param('id') id: string): Promise<InvoiceResponseDto> {
    // TODO: Implement GetInvoiceUseCase
    throw new Error('Not implemented yet');
  }

  /**
   * Maps use case output to response DTO
   */
  private mapToResponseDto(output: any): InvoiceResponseDto {
    return {
      id: output.id,
      companyId: output.companyId,
      storeId: output.storeId,
      invoiceNumber: output.invoiceNumber,
      issuedAt: output.issuedAt,
      buyerCustomerId: output.buyerCustomerId,
      lines: output.lines,
      subtotal: output.subtotal,
      vatTotal: output.vatTotal,
      total: output.total,
      status: output.status,
      paidAt: output.paidAt,
      paymentMethod: output.paymentMethod,
      externalReference: output.externalReference,
      createdBy: output.createdBy,
      createdAt: output.createdAt,
      updatedAt: output.updatedAt,
    };
  }
}
