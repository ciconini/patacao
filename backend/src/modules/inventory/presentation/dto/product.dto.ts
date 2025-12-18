/**
 * Product DTOs
 *
 * Data Transfer Objects for Product API endpoints.
 */

import { IsString, IsOptional, IsNumber, IsBoolean, IsUUID, Min, Max } from 'class-validator';
import { IsVATRate } from '../../../../shared/validation/validators/is-vat-rate.validator';
import { Type } from 'class-transformer';

/**
 * Create Product Request DTO
 */
export class CreateProductDto {
  @IsString()
  sku!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsNumber()
  @IsVATRate()
  vatRate!: number;

  @IsBoolean()
  stockTracked!: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderThreshold?: number;

  @IsOptional()
  @IsUUID()
  supplierId?: string;
}

/**
 * Update Product Request DTO
 */
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  @IsVATRate()
  vatRate?: number;

  @IsOptional()
  @IsBoolean()
  stockTracked?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderThreshold?: number;

  @IsOptional()
  @IsUUID()
  supplierId?: string;
}

/**
 * Search Products Query DTO
 */
export class SearchProductsQueryDto {
  @IsOptional()
  @IsString()
  q?: string; // General search query (searches SKU, name, description)

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  stockTracked?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  lowStock?: boolean; // Filter products below reorder threshold

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  perPage?: number;

  @IsOptional()
  @IsString()
  sort?: string; // e.g., "name", "-name", "sku", "-sku", "category", "-category", "unit_price", "-unit_price"
}

/**
 * Product Response DTO
 */
export class ProductResponseDto {
  id!: string;
  sku!: string;
  name!: string;
  description?: string;
  category?: string;
  unitPrice!: number;
  vatRate!: number;
  stockTracked!: boolean;
  reorderThreshold?: number;
  supplierId?: string;
  currentStock?: number; // Only for stock-tracked products
  createdAt!: Date;
  updatedAt!: Date;
}
