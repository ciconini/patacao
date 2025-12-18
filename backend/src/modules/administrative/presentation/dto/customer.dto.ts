/**
 * Customer DTOs
 *
 * Data Transfer Objects for Customer API endpoints.
 */

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  ValidateNested,
  IsEmail,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
 * Import Error DTO
 */
export class ImportErrorDto {
  @ApiProperty({ description: 'Row number in the import file', example: 1 })
  @IsNumber()
  rowNumber!: number;

  @ApiPropertyOptional({ description: 'Field name that caused the error', example: 'email' })
  @IsOptional()
  @IsString()
  field?: string;

  @ApiProperty({ description: 'Error message', example: 'Invalid email format' })
  @IsString()
  message!: string;

  @ApiProperty({ 
    description: 'Row data that caused the error',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  data!: Record<string, unknown>;
}

/**
 * Import Customers Response DTO
 */
export class ImportCustomersResponseDto {
  @ApiProperty({ description: 'Total number of rows processed', example: 100 })
  @IsNumber()
  totalRows!: number;

  @ApiProperty({ description: 'Number of successfully imported rows', example: 95 })
  @IsNumber()
  successful!: number;

  @ApiProperty({ description: 'Number of failed rows', example: 5 })
  @IsNumber()
  failed!: number;

  @ApiProperty({ 
    description: 'Array of import errors',
    type: () => ImportErrorDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportErrorDto)
  errors!: ImportErrorDto[];
}
