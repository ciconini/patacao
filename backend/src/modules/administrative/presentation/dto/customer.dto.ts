/**
 * Customer DTOs
 * 
 * Data Transfer Objects for Customer API endpoints.
 */

import { IsString, IsOptional, IsBoolean, IsObject, ValidateNested, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from './company.dto';
import { IsPortuguesePhone } from '../../../../shared/validation/validators/is-portuguese-phone.validator';

/**
 * Create Customer Request DTO
 */
export class CreateCustomerDto {
  
  @IsString()
  fullName!: string;

  
  @IsOptional()
  @IsEmail()
  email?: string;

  
  @IsOptional()
  @IsPortuguesePhone()
  phone?: string;

  
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  @IsObject()
  address?: AddressDto;

  
  @IsOptional()
  @IsBoolean()
  consentMarketing?: boolean;

  
  @IsOptional()
  @IsBoolean()
  consentReminders?: boolean;
}

/**
 * Update Customer Request DTO
 */
export class UpdateCustomerDto {
  
  @IsOptional()
  @IsString()
  fullName?: string;

  
  @IsOptional()
  @IsEmail()
  email?: string;

  
  @IsOptional()
  @IsPortuguesePhone()
  phone?: string;

  
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  @IsObject()
  address?: AddressDto;

  
  @IsOptional()
  @IsBoolean()
  consentMarketing?: boolean;

  
  @IsOptional()
  @IsBoolean()
  consentReminders?: boolean;
}

/**
 * Search Customers Query DTO
 */
export class SearchCustomersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  
  @IsOptional()
  @IsEmail()
  email?: string;

  
  @IsOptional()
  @IsPortuguesePhone()
  phone?: string;

  
  @IsOptional()
  @IsString()
  fullName?: string;

  
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  consentMarketing?: boolean;

  
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  consentReminders?: boolean;

  
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  archived?: boolean;

  
  @IsOptional()
  @Type(() => Number)
  page?: number;

  
  @IsOptional()
  @Type(() => Number)
  perPage?: number;

  @IsOptional()
  @IsString()
  sort?: string;
}

/**
 * Customer Response DTO
 */
export class CustomerResponseDto {
  
  id!: string;

  
  fullName!: string;

  
  email?: string;

  
  phone?: string;

  
  address?: AddressDto;

  
  consentMarketing!: boolean;

  
  consentReminders!: boolean;

  
  createdAt!: Date;

  
  updatedAt!: Date;
}

/**
 * Import Customers Request DTO
 */
export class ImportCustomersDto {
  @IsString()
  csvContent!: string;
}

/**
 * Import Customers Response DTO
 */
export class ImportCustomersResponseDto {
  totalRows!: number;
  successful!: number;
  failed!: number;
  errors!: Array<{
    rowNumber: number;
    field?: string;
    message: string;
    data: Record<string, unknown>;
  }>;
}
