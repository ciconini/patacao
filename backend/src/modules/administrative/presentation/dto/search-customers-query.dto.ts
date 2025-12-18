/**
 * Search Customers Query DTO
 *
 * Query parameters for searching customers.
 */

import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../../shared/presentation/dto/pagination.dto';

/**
 * Search Customers Query Parameters DTO
 */
export class SearchCustomersQueryDto extends PaginationQueryDto {
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
