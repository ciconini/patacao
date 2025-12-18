/**
 * Administrative Module
 *
 * Main NestJS module for the Administrative domain.
 * Consolidates Application, Presentation, and Infrastructure layers.
 *
 * This module:
 * - Imports all Administrative sub-modules (Application, Presentation, Infrastructure)
 * - Provides a single entry point for the Administrative domain
 * - Exports use cases and repositories for use by other modules
 */

import { Module } from '@nestjs/common';
import { AdministrativeApplicationModule } from './application/administrative.application.module';
import { AdministrativePresentationModule } from './presentation/administrative.presentation.module';
import { AdministrativeInfrastructureModule } from './infrastructure/administrative.infrastructure.module';

@Module({
  imports: [
    AdministrativeInfrastructureModule, // Infrastructure first (repositories)
    AdministrativeApplicationModule, // Then application (use cases depend on repositories)
    AdministrativePresentationModule, // Finally presentation (controllers depend on use cases)
  ],
  exports: [
    // Export infrastructure for other modules that need repositories
    AdministrativeInfrastructureModule,
    // Export application for other modules that need use cases
    AdministrativeApplicationModule,
  ],
})
export class AdministrativeModule {}
