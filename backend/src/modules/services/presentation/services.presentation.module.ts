/**
 * Services Presentation Module
 * 
 * NestJS module that registers all controllers for the Services module.
 */

import { Module } from '@nestjs/common';
import { ServicesApplicationModule } from '../application/services.application.module';
import { ServiceController } from './controllers/service.controller';
import { AppointmentController } from './controllers/appointment.controller';

@Module({
  imports: [ServicesApplicationModule],
  controllers: [
    ServiceController,
    AppointmentController,
  ],
})
export class ServicesPresentationModule {}

