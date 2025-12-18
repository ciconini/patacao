/**
 * Services Infrastructure Module
 *
 * NestJS module that provides Firestore implementations for Services module repositories.
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../adapters/db/database.module';
import { FirestoreServiceRepository } from './firestore-service.repository';
import { FirestoreAppointmentRepository } from './firestore-appointment.repository';
import { FirestoreAppointmentServiceLineRepository } from './firestore-appointment-service-line.repository';
import { ServiceRepository } from '../ports/service.repository.port';
import { AppointmentRepository } from '../ports/appointment.repository.port';
import { AppointmentServiceLineRepository } from '../ports/appointment-service-line.repository.port';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: 'ServiceRepository',
      useClass: FirestoreServiceRepository,
    },
    {
      provide: 'AppointmentRepository',
      useClass: FirestoreAppointmentRepository,
    },
    {
      provide: 'AppointmentServiceLineRepository',
      useClass: FirestoreAppointmentServiceLineRepository,
    },
  ],
  exports: ['ServiceRepository', 'AppointmentRepository', 'AppointmentServiceLineRepository'],
})
export class ServicesInfrastructureModule {}
