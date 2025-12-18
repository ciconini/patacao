/**
 * Search Stores Query DTO
 *
 * Query parameters for searching stores.
 */

import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/presentation/dto/pagination.dto';

/**
 * Search Stores Query Parameters DTO
 */
export class SearchStoresQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;
}

