/**
 * Inventory Module
 *
 * Main NestJS module for the Inventory domain.
 * Consolidates Application, Presentation, and Infrastructure layers.
 */

import { Module } from '@nestjs/common';
import { InventoryApplicationModule } from './application/inventory.application.module';
import { InventoryPresentationModule } from './presentation/inventory.presentation.module';
import { InventoryInfrastructureModule } from './infrastructure/inventory.infrastructure.module';

@Module({
  imports: [
    InventoryInfrastructureModule, // Infrastructure first (repositories)
    InventoryApplicationModule, // Then application (use cases depend on repositories)
    InventoryPresentationModule, // Finally presentation (controllers depend on use cases)
  ],
  exports: [
    // Export infrastructure for other modules that need repositories
    InventoryInfrastructureModule,
    // Export application for other modules that need use cases
    InventoryApplicationModule,
  ],
})
export class InventoryModule {}
