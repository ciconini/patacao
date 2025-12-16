/**
 * Service DTOs
 * 
 * Data Transfer Objects for Service API endpoints.
 */

import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Consumed Item DTO
 */
export class ConsumedItemDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;
}

/**
 * Create Service Request DTO
 */
export class CreateServiceDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(1)
  durationMinutes!: number;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsBoolean()
  consumesInventory!: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsumedItemDto)
  consumedItems?: ConsumedItemDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredResources?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Update Service Request DTO
 */
export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  consumesInventory?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsumedItemDto)
  consumedItems?: ConsumedItemDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredResources?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Service Response DTO
 */
export class ServiceResponseDto {
  id!: string;
  name!: string;
  description?: string;
  durationMinutes!: number;
  price!: number;
  consumesInventory!: boolean;
  consumedItems!: Array<{
    productId: string;
    quantity: number;
  }>;
  requiredResources!: string[];
  tags!: string[];
  createdAt!: Date;
  updatedAt!: Date;
}

