/**
 * Invoice DTOs
 * 
 * Data Transfer Objects for Invoice API endpoints.
 */

import { IsString, IsOptional, IsUUID, IsArray, ValidateNested, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { IsVATRate } from '../../../../shared/validation/validators/is-vat-rate.validator';
import { Type } from 'class-transformer';

/**
 * Invoice Line DTO
 */
export class InvoiceLineDto {
  @IsString()
  description!: string;

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

  @IsNumber()
  @IsVATRate()
  vatRate!: number;
}

/**
 * Create Invoice Draft Request DTO
 */
export class CreateInvoiceDraftDto {
  @IsUUID()
  companyId!: string;

  @IsUUID()
  storeId!: string;

  @IsOptional()
  @IsUUID()
  buyerCustomerId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines!: InvoiceLineDto[];
}

/**
 * Issue Invoice Request DTO
 */
export class IssueInvoiceDto {
  // No additional fields needed - invoice ID is in the URL path
}

/**
 * Mark Invoice Paid Request DTO
 */
export class MarkInvoicePaidDto {
  @IsString()
  paymentMethod!: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string; // ISO date string

  @IsOptional()
  @IsString()
  externalReference?: string;
}

/**
 * Void Invoice Request DTO
 */
export class VoidInvoiceDto {
  @IsString()
  reason!: string; // Required reason for voiding
}

/**
 * Invoice Response DTO
 */
export class InvoiceResponseDto {
  id!: string;
  companyId!: string;
  storeId!: string;
  invoiceNumber!: string;
  issuedAt?: Date;
  buyerCustomerId?: string;
  lines!: Array<{
    description: string;
    productId?: string;
    serviceId?: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
  }>;
  subtotal!: number;
  vatTotal!: number;
  total!: number;
  status!: string; // InvoiceStatus enum value
  paidAt?: Date;
  paymentMethod?: string;
  externalReference?: string;
  createdBy!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

