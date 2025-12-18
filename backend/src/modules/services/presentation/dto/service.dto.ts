/**
 * Service DTOs
 *
 * Data Transfer Objects for Service API endpoints.
 */

import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Consumed Item DTO
 */
export class ConsumedItemDto {
  @ApiProperty({ description: 'Product ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  productId!: string;

  @ApiProperty({ description: 'Quantity consumed', example: 2, minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity!: number;
}

/**
 * Create Service Request DTO
 */
export class CreateServiceDto {
  @ApiProperty({ description: 'Service name', example: 'Dog Grooming' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Service description', example: 'Full grooming service for dogs' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Duration in minutes', example: 60, minimum: 1 })
  @IsNumber()
  @Min(1)
  durationMinutes!: number;

  @ApiProperty({ description: 'Service price', example: 25.50, minimum: 0 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ description: 'Whether service consumes inventory', example: true })
  @IsBoolean()
  consumesInventory!: boolean;

  @ApiPropertyOptional({ 
    description: 'List of consumed items',
    type: () => ConsumedItemDto,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsumedItemDto)
  consumedItems?: ConsumedItemDto[];

  @ApiPropertyOptional({ 
    description: 'Required resources',
    type: [String],
    isArray: true,
    example: ['grooming_station', 'dryer'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredResources?: string[];

  @ApiPropertyOptional({ 
    description: 'Service tags',
    type: [String],
    isArray: true,
    example: ['grooming', 'dog'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Update Service Request DTO
 */
export class UpdateServiceDto {
  @ApiPropertyOptional({ description: 'Service name', example: 'Dog Grooming' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Service description', example: 'Full grooming service for dogs' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes', example: 60, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Service price', example: 25.50, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Whether service consumes inventory', example: true })
  @IsOptional()
  @IsBoolean()
  consumesInventory?: boolean;

  @ApiPropertyOptional({ 
    description: 'List of consumed items',
    type: () => ConsumedItemDto,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsumedItemDto)
  consumedItems?: ConsumedItemDto[];

  @ApiPropertyOptional({ 
    description: 'Required resources',
    type: [String],
    isArray: true,
    example: ['grooming_station', 'dryer'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredResources?: string[];

  @ApiPropertyOptional({ 
    description: 'Service tags',
    type: [String],
    isArray: true,
    example: ['grooming', 'dog'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Service Response DTO
 */
export class ServiceResponseDto {
  @ApiProperty({ description: 'Service ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ description: 'Service name', example: 'Dog Grooming' })
  name!: string;

  @ApiPropertyOptional({ description: 'Service description', example: 'Full grooming service for dogs' })
  description?: string;

  @ApiProperty({ description: 'Duration in minutes', example: 60 })
  durationMinutes!: number;

  @ApiProperty({ description: 'Service price', example: 25.50 })
  price!: number;

  @ApiProperty({ description: 'Whether service consumes inventory', example: true })
  consumesInventory!: boolean;

  @ApiProperty({ 
    description: 'List of consumed items',
    type: () => ConsumedItemDto,
    isArray: true,
  })
  consumedItems!: ConsumedItemDto[];

  @ApiProperty({ 
    description: 'Required resources',
    type: [String],
    isArray: true,
    example: ['grooming_station', 'dryer'],
  })
  requiredResources!: string[];

  @ApiProperty({ 
    description: 'Service tags',
    type: [String],
    isArray: true,
    example: ['grooming', 'dog'],
  })
  tags!: string[];

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}
