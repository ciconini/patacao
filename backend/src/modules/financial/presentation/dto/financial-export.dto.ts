/**
 * Financial Export DTOs
 *
 * Data Transfer Objects for Financial Export API endpoints.
 */

import { IsString, IsOptional, IsUUID, IsEnum, IsDateString, IsBoolean } from 'class-validator';

/**
 * Create Financial Export Request DTO
 */
export class CreateFinancialExportDto {
  @IsUUID()
  companyId!: string;

  @IsDateString()
  startDate!: string; // ISO date string

  @IsDateString()
  endDate!: string; // ISO date string

  @IsEnum(['csv', 'json'])
  format!: 'csv' | 'json';

  @IsOptional()
  @IsBoolean()
  includeVoided?: boolean; // Default false

  @IsOptional()
  @IsString()
  sftpHost?: string;

  @IsOptional()
  @IsString()
  sftpPort?: string;

  @IsOptional()
  @IsString()
  sftpUsername?: string;

  @IsOptional()
  @IsString()
  sftpPassword?: string;

  @IsOptional()
  @IsString()
  sftpPath?: string;
}

/**
 * Financial Export Response DTO
 */
export class FinancialExportResponseDto {
  id!: string;
  companyId!: string;
  startDate!: Date;
  endDate!: Date;
  format!: string; // ExportFormat enum value
  filePath?: string;
  sftpReference?: string;
  recordCount!: number;
  totalAmount!: number;
  createdBy!: string;
  createdAt!: Date;
}
