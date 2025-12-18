/**
 * Administrative Application Module
 *
 * NestJS module that registers all use cases for the Administrative module.
 * This module provides use cases as injectable services.
 */

import { Module } from '@nestjs/common';
import { AdministrativeInfrastructureModule } from '../infrastructure/administrative.infrastructure.module';
import { SharedModule } from '../../../shared/shared.module';
import { UsersInfrastructureModule } from '../../users/infrastructure/users.infrastructure.module';
import { CreateCompanyProfileUseCase } from './create-company-profile.use-case';
import { UpdateCompanyProfileUseCase } from './update-company-profile.use-case';
import { GetCompanyProfileUseCase } from './get-company-profile.use-case';
import { CreateStoreUseCase } from './create-store.use-case';
import { UpdateStoreUseCase } from './update-store.use-case';
import { GetStoreUseCase } from './get-store.use-case';
import { DeleteStoreUseCase } from './delete-store.use-case';
import { SearchStoresUseCase } from './search-stores.use-case';
import { CreateCustomerUseCase } from './create-customer.use-case';
import { UpdateCustomerUseCase } from './update-customer.use-case';
import { GetCustomerUseCase } from './get-customer.use-case';
import { DeleteCustomerUseCase } from './delete-customer.use-case';
import { ArchiveCustomerUseCase } from './archive-customer.use-case';
import { SearchCustomersUseCase } from './search-customers.use-case';
import { CreatePetUseCase } from './create-pet.use-case';
import { GetPetUseCase } from './get-pet.use-case';
import { UpdatePetUseCase } from './update-pet.use-case';
import { DeletePetUseCase } from './delete-pet.use-case';
import { SearchPetsUseCase } from './search-pets.use-case';
import { ImportCustomersUseCase } from './import-customers.use-case';
import { ExportCustomersUseCase } from './export-customers.use-case';

@Module({
  imports: [AdministrativeInfrastructureModule, SharedModule, UsersInfrastructureModule],
  providers: [
    CreateCompanyProfileUseCase,
    UpdateCompanyProfileUseCase,
    GetCompanyProfileUseCase,
    CreateStoreUseCase,
    UpdateStoreUseCase,
    GetStoreUseCase,
    DeleteStoreUseCase,
    SearchStoresUseCase,
    CreateCustomerUseCase,
    UpdateCustomerUseCase,
    GetCustomerUseCase,
    DeleteCustomerUseCase,
    ArchiveCustomerUseCase,
    SearchCustomersUseCase,
    CreatePetUseCase,
    GetPetUseCase,
    UpdatePetUseCase,
    DeletePetUseCase,
    SearchPetsUseCase,
    ImportCustomersUseCase,
    ExportCustomersUseCase,
  ],
  exports: [
    CreateCompanyProfileUseCase,
    UpdateCompanyProfileUseCase,
    GetCompanyProfileUseCase,
    CreateStoreUseCase,
    UpdateStoreUseCase,
    GetStoreUseCase,
    DeleteStoreUseCase,
    SearchStoresUseCase,
    CreateCustomerUseCase,
    UpdateCustomerUseCase,
    GetCustomerUseCase,
    DeleteCustomerUseCase,
    ArchiveCustomerUseCase,
    SearchCustomersUseCase,
    CreatePetUseCase,
    GetPetUseCase,
    UpdatePetUseCase,
    DeletePetUseCase,
    SearchPetsUseCase,
    ImportCustomersUseCase,
    ExportCustomersUseCase,
  ],
})
export class AdministrativeApplicationModule {}
