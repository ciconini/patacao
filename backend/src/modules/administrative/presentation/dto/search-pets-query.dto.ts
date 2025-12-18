/**
 * Search Pets Query DTO
 *
 * Query parameters for searching pets.
 */

import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/presentation/dto/pagination.dto';

/**
 * Search Pets Query Parameters DTO
 */
export class SearchPetsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  species?: string;

  @IsOptional()
  @IsString()
  breed?: string;
}

