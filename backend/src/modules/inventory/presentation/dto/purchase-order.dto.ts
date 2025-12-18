/**
 * Purchase Order DTOs
 *
 * Data Transfer Objects for Purchase Order API endpoints.
 */

import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Purchase Order Line DTO
 */
export class PurchaseOrderLineDto {
  @ApiProperty({ description: 'Product ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ description: 'Quantity', example: 10, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ description: 'Unit price', example: 15.50, minimum: 0 })
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

  @ApiProperty({ 
    description: 'Purchase order line items',
    type: () => PurchaseOrderLineDto,
    isArray: true,
  })
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
  @ApiProperty({ description: 'Purchase order ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ description: 'Supplier ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  supplierId!: string;

  @ApiProperty({ description: 'Supplier name', example: 'Pet Supplies Co.' })
  supplierName!: string;

  @ApiPropertyOptional({ description: 'Store ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  storeId?: string;

  @ApiProperty({ 
    description: 'Purchase order line items',
    type: () => PurchaseOrderLineDto,
    isArray: true,
  })
  lines!: PurchaseOrderLineDto[];

  @ApiProperty({ description: 'Purchase order status', example: 'draft' })
  status!: string; // PurchaseOrderStatus enum value

  @ApiProperty({ description: 'Total amount', example: 155.00 })
  totalAmount!: number;

  @ApiProperty({ description: 'User who created the purchase order' })
  createdBy!: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}
