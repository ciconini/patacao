/**
 * Stock Management DTOs
 * 
 * Data Transfer Objects for Stock operations (receipts, adjustments, movements).
 */

import { IsString, IsOptional, IsUUID, IsArray, ValidateNested, IsNumber, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Stock Receipt Line DTO
 */
export class StockReceiptLineDto {
  @IsUUID()
  productId!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string; // ISO date string

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsUUID()
  locationId?: string;
}

/**
 * Receive Stock Request DTO
 */
export class ReceiveStockDto {
  @IsUUID()
  storeId!: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockReceiptLineDto)
  lines!: StockReceiptLineDto[];
}

/**
 * Stock Adjustment Request DTO
 */
export class StockAdjustmentDto {
  @IsUUID()
  storeId!: string;

  @IsOptional()
  @IsUUID()
  locationId?: string; // Optional inventory location, defaults to store

  @IsUUID()
  productId!: string;

  @IsNumber()
  quantityChange!: number; // Positive for increment, negative for decrement

  @IsString()
  reason!: string; // Required reason for adjustment

  @IsOptional()
  @IsString()
  referenceId?: string; // Optional reference (e.g., recount session)
}

/**
 * Stock Movement Response DTO
 */
export class StockMovementResponseDto {
  id!: string;
  productId!: string;
  quantity!: number;
  movementType!: string; // 'in' | 'out'
  reason!: string; // StockMovementReason enum value
  locationId!: string;
  performedBy!: string;
  referenceId?: string;
  createdAt!: Date;
}

/**
 * Stock Movement Enriched Response DTO
 */
export class StockMovementEnrichedResponseDto extends StockMovementResponseDto {
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  performedByUser?: {
    id: string;
    fullName: string;
  };
  location?: {
    id: string;
    name: string;
  };
}

/**
 * Search Stock Movements Query DTO
 */
export class SearchStockMovementsQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsDateString()
  from?: string; // ISO date string

  @IsOptional()
  @IsDateString()
  to?: string; // ISO date string

  @IsOptional()
  @IsString()
  reason?: string; // StockMovementReason enum value

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsUUID()
  performedBy?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  perPage?: number;

  @IsOptional()
  @IsString()
  sort?: string; // e.g., "created_at", "-created_at"
}

