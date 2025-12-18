/**
 * Invoice DTOs
 *
 * Data Transfer Objects for Invoice API endpoints.
 */

import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { IsVATRate } from '../../../../shared/validation/validators/is-vat-rate.validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Invoice Line DTO
 */
export class InvoiceLineDto {
  @ApiProperty({ description: 'Line item description', example: 'Dog grooming service' })
  @IsString()
  description!: string;

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

  @ApiProperty({ description: 'VAT rate percentage', example: 23.00 })
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

  @ApiProperty({ 
    description: 'Invoice line items',
    type: () => InvoiceLineDto,
    isArray: true,
  })
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
  @ApiProperty({ description: 'Invoice ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ description: 'Company ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  companyId!: string;

  @ApiProperty({ description: 'Store ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  storeId!: string;

  @ApiProperty({ description: 'Invoice number', example: 'INV-2024-001' })
  invoiceNumber!: string;

  @ApiPropertyOptional({ description: 'Issue date' })
  issuedAt?: Date;

  @ApiPropertyOptional({ description: 'Buyer customer ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  buyerCustomerId?: string;

  @ApiProperty({ 
    description: 'Invoice line items',
    type: () => InvoiceLineDto,
    isArray: true,
  })
  lines!: InvoiceLineDto[];

  @ApiProperty({ description: 'Subtotal before VAT', example: 100.00 })
  subtotal!: number;

  @ApiProperty({ description: 'Total VAT amount', example: 23.00 })
  vatTotal!: number;

  @ApiProperty({ description: 'Grand total', example: 123.00 })
  total!: number;

  @ApiProperty({ description: 'Invoice status', example: 'draft' })
  status!: string; // InvoiceStatus enum value

  @ApiPropertyOptional({ description: 'Payment date' })
  paidAt?: Date;

  @ApiPropertyOptional({ description: 'Payment method', example: 'cash' })
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'External payment reference', example: 'REF-12345' })
  externalReference?: string;

  @ApiProperty({ description: 'User who created the invoice' })
  createdBy!: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}
