/**
 * Financial Application Module
 * 
 * NestJS module that registers all use cases for the Financial module.
 */

import { Module } from '@nestjs/common';
import { FinancialInfrastructureModule } from '../infrastructure/financial.infrastructure.module';
import { SharedModule } from '../../../shared/shared.module';
import { CreateInvoiceDraftUseCase } from './create-invoice-draft.use-case';
import { IssueInvoiceUseCase } from './issue-invoice.use-case';
import { MarkInvoicePaidUseCase } from './mark-invoice-paid.use-case';
import { VoidInvoiceUseCase } from './void-invoice.use-case';
import { CreateTransactionUseCase } from './create-transaction.use-case';
import { CompleteTransactionUseCase } from './complete-transaction.use-case';
import { CreateCreditNoteUseCase } from './create-credit-note.use-case';
import { CreateFinancialExportUseCase } from './create-financial-export.use-case';

@Module({
  imports: [
    FinancialInfrastructureModule,
    SharedModule,
  ],
  providers: [
    CreateInvoiceDraftUseCase,
    IssueInvoiceUseCase,
    MarkInvoicePaidUseCase,
    VoidInvoiceUseCase,
    CreateTransactionUseCase,
    CompleteTransactionUseCase,
    CreateCreditNoteUseCase,
    CreateFinancialExportUseCase,
  ],
  exports: [
    CreateInvoiceDraftUseCase,
    IssueInvoiceUseCase,
    MarkInvoicePaidUseCase,
    VoidInvoiceUseCase,
    CreateTransactionUseCase,
    CompleteTransactionUseCase,
    CreateCreditNoteUseCase,
    CreateFinancialExportUseCase,
  ],
})
export class FinancialApplicationModule {}

