/**
 * Export Customers Query DTO
 *
 * Query parameters for exporting customers.
 */

import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Export Customers Query Parameters DTO
 */
export class ExportCustomersQueryDto {
  @IsEnum(['csv', 'json'])
  format!: 'csv' | 'json';

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  consentMarketing?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  consentReminders?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  archived?: boolean;
}

