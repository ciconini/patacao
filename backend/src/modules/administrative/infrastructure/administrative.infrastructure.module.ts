/**
 * Administrative Infrastructure Module
 *
 * NestJS module that provides infrastructure implementations (repositories)
 * for the Administrative module.
 *
 * This module registers Firestore repository adapters and makes them
 * available for dependency injection.
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../adapters/db/database.module';
import { FirestoreCompanyRepository } from './firestore-company.repository';
import { FirestoreStoreRepository } from './firestore-store.repository';
import { FirestoreCustomerRepository } from './firestore-customer.repository';
import { FirestorePetRepository } from './firestore-pet.repository';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: 'CompanyRepository',
      useClass: FirestoreCompanyRepository,
    },
    {
      provide: 'StoreRepository',
      useClass: FirestoreStoreRepository,
    },
    {
      provide: 'CustomerRepository',
      useClass: FirestoreCustomerRepository,
    },
    {
      provide: 'PetRepository',
      useClass: FirestorePetRepository,
    },
  ],
  exports: ['CompanyRepository', 'StoreRepository', 'CustomerRepository', 'PetRepository'],
})
export class AdministrativeInfrastructureModule {}
