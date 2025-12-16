/**
 * Users Module
 * 
 * Main NestJS module for the Users domain.
 * Consolidates Application, Presentation, and Infrastructure layers.
 */

import { Module } from '@nestjs/common';
import { UsersApplicationModule } from './application/users.application.module';
import { UsersPresentationModule } from './presentation/users.presentation.module';
import { UsersInfrastructureModule } from './infrastructure/users.infrastructure.module';

@Module({
  imports: [
    UsersInfrastructureModule, // Infrastructure first (repositories)
    UsersApplicationModule,    // Then application (use cases depend on repositories)
    UsersPresentationModule,    // Finally presentation (controllers depend on use cases)
  ],
  exports: [
    // Export infrastructure for other modules that need repositories
    UsersInfrastructureModule,
    // Export application for other modules that need use cases
    UsersApplicationModule,
  ],
})
export class UsersModule {}

