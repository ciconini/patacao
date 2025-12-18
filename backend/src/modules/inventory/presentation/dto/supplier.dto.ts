/**
 * Supplier DTOs
 *
 * Data Transfer Objects for Supplier API endpoints.
 */

import { IsString, IsOptional, IsEmail, IsNumber, Min } from 'class-validator';

/**
 * Create Supplier Request DTO
 */
export class CreateSupplierDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultLeadTimeDays?: number;
}

/**
 * Update Supplier Request DTO
 */
export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultLeadTimeDays?: number;
}

/**
 * Supplier Response DTO
 */
export class SupplierResponseDto {
  id!: string;
  name!: string;
  contactEmail?: string;
  phone?: string;
  defaultLeadTimeDays?: number;
  createdAt!: Date;
  updatedAt!: Date;
}
