/**
 * Shared Pagination DTOs
 * 
 * Reusable DTOs for pagination across all modules.
 */

import { IsOptional, IsNumber, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Pagination Query Parameters DTO
 */
export class PaginationQueryDto {
  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  perPage?: number;

  @IsOptional()
  @IsString()
  sort?: string;
}

/**
 * Pagination Metadata Response DTO
 */
export class PaginationMetaDto {
  
  total!: number;

  
  page!: number;

  
  perPage!: number;

  
  totalPages!: number;

  
  hasNext!: boolean;

  
  hasPrevious!: boolean;
}

/**
 * Paginated Response DTO
 */
export class PaginatedResponseDto<T> {
  
  items!: T[];

  
  meta!: PaginationMetaDto;
}

