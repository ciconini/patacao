/**
 * Administrative Presentation Module
 *
 * NestJS module that registers all controllers for the Administrative module.
 */

import { Module } from '@nestjs/common';
import { AdministrativeApplicationModule } from '../application/administrative.application.module';
import { CompanyController } from './controllers/company.controller';
import { StoreController } from './controllers/store.controller';
import { CustomerController } from './controllers/customer.controller';
import { PetController } from './controllers/pet.controller';
import { ImportController } from './controllers/import.controller';

@Module({
  imports: [AdministrativeApplicationModule],
  controllers: [
    CompanyController,
    StoreController,
    CustomerController,
    PetController,
    ImportController,
  ],
})
export class AdministrativePresentationModule {}
