/**
 * Financial Presentation Module
 * 
 * NestJS module that registers all controllers for the Financial module.
 */

import { Module } from '@nestjs/common';
import { FinancialApplicationModule } from '../application/financial.application.module';
import { InvoiceController } from './controllers/invoice.controller';
import { TransactionController } from './controllers/transaction.controller';
import { CreditNoteController } from './controllers/credit-note.controller';
import { FinancialExportController } from './controllers/financial-export.controller';

@Module({
  imports: [FinancialApplicationModule],
  controllers: [
    InvoiceController,
    TransactionController,
    CreditNoteController,
    FinancialExportController,
  ],
})
export class FinancialPresentationModule {}

