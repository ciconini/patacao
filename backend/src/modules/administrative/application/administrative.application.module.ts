/**
 * Administrative Application Module
 *
 * NestJS module that registers all use cases for the Administrative module.
 * This module provides use cases as injectable services.
 */

import { Module } from '@nestjs/common';
import { AdministrativeInfrastructureModule } from '../infrastructure/administrative.infrastructure.module';
import { SharedModule } from '../../../shared/shared.module';
import { CreateCompanyProfileUseCase } from './create-company-profile.use-case';
import { UpdateCompanyProfileUseCase } from './update-company-profile.use-case';
import { CreateStoreUseCase } from './create-store.use-case';
import { UpdateStoreUseCase } from './update-store.use-case';
import { CreateCustomerUseCase } from './create-customer.use-case';
import { UpdateCustomerUseCase } from './update-customer.use-case';
import { ArchiveCustomerUseCase } from './archive-customer.use-case';
import { SearchCustomersUseCase } from './search-customers.use-case';
import { CreatePetUseCase } from './create-pet.use-case';
import { ImportCustomersUseCase } from './import-customers.use-case';

@Module({
  imports: [AdministrativeInfrastructureModule, SharedModule],
  providers: [
    CreateCompanyProfileUseCase,
    UpdateCompanyProfileUseCase,
    CreateStoreUseCase,
    UpdateStoreUseCase,
    CreateCustomerUseCase,
    UpdateCustomerUseCase,
    ArchiveCustomerUseCase,
    SearchCustomersUseCase,
    CreatePetUseCase,
    ImportCustomersUseCase,
  ],
  exports: [
    CreateCompanyProfileUseCase,
    UpdateCompanyProfileUseCase,
    CreateStoreUseCase,
    UpdateStoreUseCase,
    CreateCustomerUseCase,
    UpdateCustomerUseCase,
    ArchiveCustomerUseCase,
    SearchCustomersUseCase,
    CreatePetUseCase,
    ImportCustomersUseCase,
  ],
})
export class AdministrativeApplicationModule {}
