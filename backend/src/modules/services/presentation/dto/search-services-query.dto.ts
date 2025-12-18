/**
 * Search Services Query DTO
 *
 * Query parameters for searching services.
 */

import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../../shared/presentation/dto/pagination.dto';

/**
 * Search Services Query Parameters DTO
 */
export class SearchServicesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  consumesInventory?: boolean;
}

