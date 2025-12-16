/**
 * Pet DTOs
 * 
 * Data Transfer Objects for Pet API endpoints.
 */

import { IsString, IsOptional, IsArray, ValidateNested, IsUUID, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Vaccination Record DTO
 */
export class VaccinationRecordDto {
  @IsOptional()
  @IsString()
  vaccine?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  expires?: string;

  @IsOptional()
  @IsString()
  administered_by?: string;
}

/**
 * Create Pet Request DTO
 */
export class CreatePetDto {
  @IsUUID()
  customerId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  species?: string;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  microchipId?: string;

  @IsOptional()
  @IsString()
  medicalNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VaccinationRecordDto)
  vaccination?: VaccinationRecordDto[];
}

/**
 * Update Pet Request DTO
 */
export class UpdatePetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  species?: string;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  microchipId?: string;

  @IsOptional()
  @IsString()
  medicalNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VaccinationRecordDto)
  vaccination?: VaccinationRecordDto[];
}

/**
 * Pet Response DTO
 */
export class PetResponseDto {
  id!: string;
  customerId!: string;
  name!: string;
  species?: string;
  breed?: string;
  dateOfBirth?: Date;
  age?: number;
  microchipId?: string;
  medicalNotes?: string;
  vaccination!: VaccinationRecordDto[];
  createdAt!: Date;
  updatedAt!: Date;
}
