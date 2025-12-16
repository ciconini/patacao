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
import { FirebaseAuthGuard, AuthenticatedRequest } from '../../../../shared/auth/firebase-auth.guard';
import { CreateInvoiceDraftDto, IssueInvoiceDto, MarkInvoicePaidDto, VoidInvoiceDto, InvoiceResponseDto } from '../dto/invoice.dto';
import { CreateInvoiceDraftUseCase, CreateInvoiceDraftInput } from '../../application/create-invoice-draft.use-case';
import { IssueInvoiceUseCase, IssueInvoiceInput } from '../../application/issue-invoice.use-case';
import { MarkInvoicePaidUseCase, MarkInvoicePaidInput } from '../../application/mark-invoice-paid.use-case';
import { VoidInvoiceUseCase, VoidInvoiceInput } from '../../application/void-invoice.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

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

