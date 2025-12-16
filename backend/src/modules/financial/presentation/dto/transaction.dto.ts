/**
 * Transaction DTOs
 * 
 * Data Transfer Objects for Transaction API endpoints.
 */

import { IsString, IsOptional, IsUUID, IsArray, ValidateNested, IsNumber, IsBoolean, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Transaction Line Item DTO
 */
export class TransactionLineItemDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

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
  id!: string;
  storeId!: string;
  invoiceId!: string;
  lines!: Array<{
    productId?: string;
    serviceId?: string;
    quantity: number;
    unitPrice: number;
    description?: string;
  }>;
  totalAmount!: number;
  paymentStatus!: string; // PaymentStatus enum value
  paymentMethod?: string;
  paidAt?: Date;
  externalReference?: string;
  createdBy!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * Complete Transaction Response DTO
 */
export class CompleteTransactionResponseDto {
  id!: string;
  storeId!: string;
  invoiceId!: string;
  paymentStatus!: string; // PaymentStatus enum value
  paymentMethod?: string;
  paidAt?: Date;
  externalReference?: string;
  updatedAt!: Date;
  stockMovements!: Array<{
    id: string;
    productId: string;
    quantityChange: number;
    reason: string; // StockMovementReason enum value
  }>;
}

