/**
 * Financial Module
 *
 * Main NestJS module for the Financial domain.
 * Consolidates Application, Presentation, and Infrastructure layers.
 */

import { Module } from '@nestjs/common';
import { FinancialApplicationModule } from './application/financial.application.module';
import { FinancialPresentationModule } from './presentation/financial.presentation.module';
import { FinancialInfrastructureModule } from './infrastructure/financial.infrastructure.module';

@Module({
  imports: [
    FinancialInfrastructureModule, // Infrastructure first (repositories)
    FinancialApplicationModule, // Then application (use cases depend on repositories)
    FinancialPresentationModule, // Finally presentation (controllers depend on use cases)
  ],
  exports: [
    // Export infrastructure for other modules that need repositories
    FinancialInfrastructureModule,
    // Export application for other modules that need use cases
    FinancialApplicationModule,
  ],
})
export class FinancialModule {}
