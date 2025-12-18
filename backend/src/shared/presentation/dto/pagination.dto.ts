/**
 * Shared Pagination DTOs
 *
 * Reusable DTOs for pagination across all modules.
 */

import { IsOptional, IsNumber, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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
  @ApiProperty({ description: 'Total number of items', example: 100 })
  total!: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Number of items per page', example: 20 })
  perPage!: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPages!: number;

  @ApiProperty({ description: 'Whether there is a next page', example: true })
  hasNext!: boolean;

  @ApiProperty({ description: 'Whether there is a previous page', example: false })
  hasPrevious!: boolean;
}

/**
 * Paginated Response DTO
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ 
    description: 'Array of items',
    type: 'array',
    isArray: true,
  })
  items!: T[];

  @ApiProperty({ 
    description: 'Pagination metadata',
    type: () => PaginationMetaDto,
  })
  meta!: PaginationMetaDto;
}
