/**
 * Financial Infrastructure Module
 *
 * NestJS module that provides Firestore implementations for Financial module repositories.
 * This module registers all repository adapters and exports them for use in other modules.
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../adapters/db/database.module';
import { FirestoreInvoiceRepository } from './firestore-invoice.repository';
import { FirestoreTransactionRepository } from './firestore-transaction.repository';
import { FirestoreCreditNoteRepository } from './firestore-credit-note.repository';
import { FirestoreFinancialExportRepository } from './firestore-financial-export.repository';
import { InvoiceRepository } from '../ports/invoice.repository.port';
import { TransactionRepository } from '../ports/transaction.repository.port';
import { CreditNoteRepository } from '../ports/credit-note.repository.port';
import { FinancialExportRepository } from '../ports/financial-export.repository.port';

@Module({
  imports: [DatabaseModule], // Import DatabaseModule to get FIRESTORE provider
  providers: [
    {
      provide: 'InvoiceRepository',
      useClass: FirestoreInvoiceRepository,
    },
    {
      provide: 'TransactionRepository',
      useClass: FirestoreTransactionRepository,
    },
    {
      provide: 'CreditNoteRepository',
      useClass: FirestoreCreditNoteRepository,
    },
    {
      provide: 'FinancialExportRepository',
      useClass: FirestoreFinancialExportRepository,
    },
  ],
  exports: [
    'InvoiceRepository',
    'TransactionRepository',
    'CreditNoteRepository',
    'FinancialExportRepository',
  ],
})
export class FinancialInfrastructureModule {}
