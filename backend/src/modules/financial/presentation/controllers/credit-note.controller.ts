/**
 * Credit Note Controller
 * 
 * REST API controller for Credit Note management endpoints.
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
import { CreateCreditNoteDto, CreditNoteResponseDto } from '../dto/credit-note.dto';
import { CreateCreditNoteUseCase, CreateCreditNoteInput } from '../../application/create-credit-note.use-case';
import { mapApplicationErrorToHttpException } from '../../../../shared/presentation/errors/http-error.mapper';

@Controller('api/v1/credit-notes')
@UseGuards(FirebaseAuthGuard)
export class CreditNoteController {
  constructor(
    private readonly createCreditNoteUseCase: CreateCreditNoteUseCase,
  ) {}

  /**
   * Create a new credit note
   * POST /api/v1/credit-notes
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateCreditNoteDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<CreditNoteResponseDto> {
    const userId = req.firebaseUid || req.user?.uid;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const input: CreateCreditNoteInput = {
      invoiceId: createDto.invoiceId,
      reason: createDto.reason,
      amount: createDto.amount,
      performedBy: userId,
    };

    const result = await this.createCreditNoteUseCase.execute(input);

    if (!result.success || !result.creditNote) {
      throw mapApplicationErrorToHttpException(result.error!);
    }

    return {
      id: result.creditNote.id,
      invoiceId: result.creditNote.invoiceId,
      invoiceNumber: result.creditNote.invoiceNumber,
      issuedAt: result.creditNote.issuedAt,
      reason: result.creditNote.reason,
      amount: result.creditNote.amount,
      createdBy: result.creditNote.createdBy,
      createdAt: result.creditNote.createdAt,
    };
  }

  /**
   * Get a credit note by ID
   * GET /api/v1/credit-notes/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<CreditNoteResponseDto> {
    // TODO: Implement GetCreditNoteUseCase
    throw new Error('Not implemented yet');
  }
}

