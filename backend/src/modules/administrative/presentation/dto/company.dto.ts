/**
 * Company DTOs
 *
 * Data Transfer Objects for Company API endpoints.
 * These DTOs map HTTP requests/responses to use case input/output models.
 */

import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  ValidateNested,
  Min,
  Max,
  IsEmail,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsPortugueseNIF } from '../../../../shared/validation/validators/is-portuguese-nif.validator';
import { IsPortuguesePhone } from '../../../../shared/validation/validators/is-portuguese-phone.validator';
import { IsPortuguesePostalCode } from '../../../../shared/validation/validators/is-portuguese-postal-code.validator';
import { IsVATRate } from '../../../../shared/validation/validators/is-vat-rate.validator';

/**
 * Address DTO
 */
export class AddressDto {
  @IsString()
  street!: string;

  @IsString()
  city!: string;

  @IsPortuguesePostalCode()
  postalCode!: string;

  @IsOptional()
  @IsString()
  country?: string;
}

/**
 * Create Company Request DTO
 */
export class CreateCompanyDto {
  @IsString()
  name!: string;

  @IsPortugueseNIF()
  nif!: string;

  @ValidateNested()
  @Type(() => AddressDto)
  @IsObject()
  address!: AddressDto;

  @IsString()
  taxRegime!: string;

  @IsOptional()
  @IsNumber()
  @IsVATRate()
  defaultVatRate?: number;

  @IsOptional()
  @IsPortuguesePhone()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  website?: string;
}

/**
 * Update Company Request DTO
 */
export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsPortugueseNIF()
  nif?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  @IsObject()
  address?: AddressDto;

  @IsOptional()
  @IsString()
  taxRegime?: string;

  @IsOptional()
  @IsNumber()
  @IsVATRate()
  defaultVatRate?: number;

  @IsOptional()
  @IsPortuguesePhone()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  website?: string;
}

/**
 * Company Response DTO
 */
export class CompanyResponseDto {
  id!: string;

  name!: string;

  nif!: string;

  address!: AddressDto;

  taxRegime!: string;

  defaultVatRate?: number;

  phone?: string;

  email?: string;

  website?: string;

  createdAt!: Date;

  updatedAt!: Date;
}
