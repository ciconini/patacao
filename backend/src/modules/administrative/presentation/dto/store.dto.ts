/**
 * Store DTOs
 *
 * Data Transfer Objects for Store API endpoints.
 */

import { IsString, IsOptional, IsObject, ValidateNested, IsEmail, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from './company.dto';
import { IsPortuguesePhone } from '../../../../shared/validation/validators/is-portuguese-phone.validator';
import { IsTimezone } from '../../../../shared/validation/validators/is-timezone.validator';
import { IsTimeFormat } from '../../../../shared/validation/validators/is-time-format.validator';

/**
 * Opening Hours DTO for a single day
 */
export class DayOpeningHoursDto {
  @IsOptional()
  @IsTimeFormat()
  open?: string;

  @IsOptional()
  @IsTimeFormat()
  close?: string;

  @IsOptional()
  closed?: boolean;
}

/**
 * Weekly Opening Hours DTO
 */
export class WeeklyOpeningHoursDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => DayOpeningHoursDto)
  monday?: DayOpeningHoursDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayOpeningHoursDto)
  tuesday?: DayOpeningHoursDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayOpeningHoursDto)
  wednesday?: DayOpeningHoursDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayOpeningHoursDto)
  thursday?: DayOpeningHoursDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayOpeningHoursDto)
  friday?: DayOpeningHoursDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayOpeningHoursDto)
  saturday?: DayOpeningHoursDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayOpeningHoursDto)
  sunday?: DayOpeningHoursDto;
}

/**
 * Create Store Request DTO
 */
export class CreateStoreDto {
  @IsUUID()
  companyId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  @IsObject()
  address?: AddressDto;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPortuguesePhone()
  phone?: string;

  @ValidateNested()
  @Type(() => WeeklyOpeningHoursDto)
  @IsObject()
  openingHours!: WeeklyOpeningHoursDto;

  @IsOptional()
  @IsTimezone()
  timezone?: string;
}

/**
 * Update Store Request DTO
 */
export class UpdateStoreDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  @IsObject()
  address?: AddressDto;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPortuguesePhone()
  phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WeeklyOpeningHoursDto)
  @IsObject()
  openingHours?: WeeklyOpeningHoursDto;

  @IsOptional()
  @IsTimezone()
  timezone?: string;
}

/**
 * Store Response DTO
 */
export class StoreResponseDto {
  id!: string;

  companyId!: string;

  name!: string;

  address?: AddressDto;

  email?: string;

  phone?: string;

  openingHours!: WeeklyOpeningHoursDto;

  timezone!: string;

  createdAt!: Date;

  updatedAt!: Date;
}
