/**
 * Purchase Order DTOs
 * 
 * Data Transfer Objects for Purchase Order API endpoints.
 */

import { IsString, IsOptional, IsUUID, IsArray, ValidateNested, IsNumber, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Purchase Order Line DTO
 */
export class PurchaseOrderLineDto {
  @IsUUID()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

/**
 * Create Purchase Order Request DTO
 */
export class CreatePurchaseOrderDto {
  @IsUUID()
  supplierId!: string;

  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines!: PurchaseOrderLineDto[];

  @IsOptional()
  @IsEnum(['draft', 'ordered'])
  status?: 'draft' | 'ordered';
}

/**
 * Receive Purchase Order Line DTO
 */
export class ReceivePurchaseOrderLineDto {
  @IsUUID()
  productId!: string;

  @IsNumber()
  @Min(0)
  quantityReceived!: number;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string; // ISO date string

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;
}

/**
 * Receive Purchase Order Request DTO
 */
export class ReceivePurchaseOrderDto {
  @IsOptional()
  @IsUUID()
  storeId?: string; // Optional: defaults to PO store

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderLineDto)
  receivedLines!: ReceivePurchaseOrderLineDto[];
}

/**
 * Purchase Order Response DTO
 */
export class PurchaseOrderResponseDto {
  id!: string;
  supplierId!: string;
  supplierName!: string;
  storeId?: string;
  lines!: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  status!: string; // PurchaseOrderStatus enum value
  totalAmount!: number;
  createdBy!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

