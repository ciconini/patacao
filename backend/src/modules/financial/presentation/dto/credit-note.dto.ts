/**
 * Credit Note DTOs
 *
 * Data Transfer Objects for Credit Note API endpoints.
 */

import { IsString, IsUUID, IsNumber, Min } from 'class-validator';

/**
 * Create Credit Note Request DTO
 */
export class CreateCreditNoteDto {
  @IsUUID()
  invoiceId!: string;

  @IsString()
  reason!: string;

  @IsNumber()
  @Min(0)
  amount!: number;
}

/**
 * Credit Note Response DTO
 */
export class CreditNoteResponseDto {
  id!: string;
  invoiceId!: string;
  invoiceNumber!: string;
  issuedAt!: Date;
  reason!: string;
  amount!: number;
  createdBy!: string;
  createdAt!: Date;
}
