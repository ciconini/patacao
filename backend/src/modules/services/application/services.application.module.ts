/**
 * Services Application Module
 * 
 * NestJS module that registers all use cases for the Services module.
 */

import { Module } from '@nestjs/common';
import { ServicesInfrastructureModule } from '../infrastructure/services.infrastructure.module';
import { SharedModule } from '../../../shared/shared.module';
import { CreateServiceUseCase } from './create-service.use-case';
import { CreateAppointmentUseCase } from './create-appointment.use-case';
import { ConfirmAppointmentUseCase } from './confirm-appointment.use-case';
import { CompleteAppointmentUseCase } from './complete-appointment.use-case';
import { CancelAppointmentUseCase } from './cancel-appointment.use-case';
import { SearchAppointmentsUseCase } from './search-appointments.use-case';

@Module({
  imports: [
    ServicesInfrastructureModule,
    SharedModule,
  ],
  providers: [
    CreateServiceUseCase,
    CreateAppointmentUseCase,
    ConfirmAppointmentUseCase,
    CompleteAppointmentUseCase,
    CancelAppointmentUseCase,
    SearchAppointmentsUseCase,
  ],
  exports: [
    CreateServiceUseCase,
    CreateAppointmentUseCase,
    ConfirmAppointmentUseCase,
    CompleteAppointmentUseCase,
    CancelAppointmentUseCase,
    SearchAppointmentsUseCase,
  ],
})
export class ServicesApplicationModule {}

