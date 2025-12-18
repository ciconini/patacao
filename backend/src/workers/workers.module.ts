/**
 * Workers Module
 *
 * NestJS module that provides background workers.
 * Registers all workers and enables scheduling.
 *
 * Note: This module imports domain modules to access their repositories.
 * Workers depend on repositories from AdministrativeModule, ServicesModule,
 * FinancialModule, and InventoryModule.
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppointmentReminderWorker } from './appointment-reminder.worker';
import { FinancialExportWorker } from './financial-export.worker';
import { StockReconciliationWorker } from './stock-reconciliation.worker';
import { WorkersController } from './workers.controller';
// Import domain modules to access their repositories
import { AdministrativeModule } from '../modules/administrative/administrative.module';
import { ServicesModule } from '../modules/services/services.module';
import { FinancialModule } from '../modules/financial/financial.module';
import { InventoryModule } from '../modules/inventory/inventory.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // Import domain modules to make their exported repositories available
    AdministrativeModule, // Provides: CustomerRepository, PetRepository, StoreRepository
    ServicesModule, // Provides: AppointmentRepository, ServiceRepository
    FinancialModule, // Provides: FinancialExportRepository, InvoiceRepository, TransactionRepository, CreditNoteRepository
    InventoryModule, // Provides: ProductRepository, StockMovementRepository
  ],
  controllers: [WorkersController],
  providers: [AppointmentReminderWorker, FinancialExportWorker, StockReconciliationWorker],
  exports: [AppointmentReminderWorker, FinancialExportWorker, StockReconciliationWorker],
})
export class WorkersModule {}
