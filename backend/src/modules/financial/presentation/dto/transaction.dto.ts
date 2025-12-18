/**
 * Transaction DTOs
 *
 * Data Transfer Objects for Transaction API endpoints.
 */

import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Transaction Line Item DTO
 */
export class TransactionLineItemDto {
  @ApiPropertyOptional({ description: 'Product ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: 'Service ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiProperty({ description: 'Quantity', example: 1, minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiProperty({ description: 'Unit price', example: 25.50, minimum: 0 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ description: 'Line item description', example: 'Dog grooming service' })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * Create Transaction Request DTO
 */
export class CreateTransactionDto {
  @IsUUID()
  storeId!: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ 
    description: 'Transaction line items',
    type: () => TransactionLineItemDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionLineItemDto)
  lines!: TransactionLineItemDto[];

  @IsOptional()
  @IsBoolean()
  createInvoice?: boolean; // Default true
}

/**
 * Complete Transaction Request DTO
 */
export class CompleteTransactionDto {
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string; // ISO date string

  @IsOptional()
  @IsString()
  externalReference?: string;
}

/**
 * Transaction Response DTO
 */
export class TransactionResponseDto {
  @ApiProperty({ description: 'Transaction ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ description: 'Store ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  storeId!: string;

  @ApiProperty({ description: 'Invoice ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  invoiceId!: string;

  @ApiProperty({ 
    description: 'Transaction line items',
    type: () => TransactionLineItemDto,
    isArray: true,
  })
  lines!: TransactionLineItemDto[];

  @ApiProperty({ description: 'Total amount', example: 123.00 })
  totalAmount!: number;

  @ApiProperty({ description: 'Payment status', example: 'pending' })
  paymentStatus!: string; // PaymentStatus enum value

  @ApiPropertyOptional({ description: 'Payment method', example: 'cash' })
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Payment date' })
  paidAt?: Date;

  @ApiPropertyOptional({ description: 'External payment reference', example: 'REF-12345' })
  externalReference?: string;

  @ApiProperty({ description: 'User who created the transaction' })
  createdBy!: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}

/**
 * Stock Movement Response DTO
 */
export class StockMovementResponseDto {
  @ApiProperty({ description: 'Stock movement ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ description: 'Product ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  productId!: string;

  @ApiProperty({ description: 'Quantity change', example: -2 })
  quantityChange!: number;

  @ApiProperty({ description: 'Reason for movement', example: 'sale' })
  reason!: string; // StockMovementReason enum value
}

/**
 * Complete Transaction Response DTO
 */
export class CompleteTransactionResponseDto {
  @ApiProperty({ description: 'Transaction ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ description: 'Store ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  storeId!: string;

  @ApiProperty({ description: 'Invoice ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  invoiceId!: string;

  @ApiProperty({ description: 'Payment status', example: 'completed' })
  paymentStatus!: string; // PaymentStatus enum value

  @ApiPropertyOptional({ description: 'Payment method', example: 'cash' })
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Payment date' })
  paidAt?: Date;

  @ApiPropertyOptional({ description: 'External payment reference', example: 'REF-12345' })
  externalReference?: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;

  @ApiProperty({ 
    description: 'Stock movements created',
    type: () => StockMovementResponseDto,
    isArray: true,
  })
  stockMovements!: StockMovementResponseDto[];
}
