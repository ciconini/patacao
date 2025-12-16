/**
 * Services Module
 * 
 * Main NestJS module for the Services domain.
 * Consolidates Application, Presentation, and Infrastructure layers.
 */

import { Module } from '@nestjs/common';
import { ServicesApplicationModule } from './application/services.application.module';
import { ServicesPresentationModule } from './presentation/services.presentation.module';
import { ServicesInfrastructureModule } from './infrastructure/services.infrastructure.module';

@Module({
  imports: [
    ServicesInfrastructureModule, // Infrastructure first (repositories)
    ServicesApplicationModule,    // Then application (use cases depend on repositories)
    ServicesPresentationModule,   // Finally presentation (controllers depend on use cases)
  ],
  exports: [
    // Export infrastructure for other modules that need repositories
    ServicesInfrastructureModule,
    // Export application for other modules that need use cases
    ServicesApplicationModule,
  ],
})
export class ServicesModule {}

