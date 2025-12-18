/**
 * User DTOs
 *
 * Data Transfer Objects for User API endpoints.
 */

import {
  IsString,
  IsOptional,
  IsEmail,
  IsArray,
  IsBoolean,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Working Hours DTO for a single day
 */
export class DayWorkingHoursDto {
  @IsOptional()
  @IsString()
  start?: string; // Format: "HH:mm" (e.g., "09:00")

  @IsOptional()
  @IsString()
  end?: string; // Format: "HH:mm" (e.g., "17:00")

  @IsOptional()
  @IsBoolean()
  available?: boolean;
}

/**
 * Weekly Working Hours DTO
 */
export class WeeklyWorkingHoursDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => DayWorkingHoursDto)
  monday?: DayWorkingHoursDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayWorkingHoursDto)
  tuesday?: DayWorkingHoursDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayWorkingHoursDto)
  wednesday?: DayWorkingHoursDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayWorkingHoursDto)
  thursday?: DayWorkingHoursDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayWorkingHoursDto)
  friday?: DayWorkingHoursDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayWorkingHoursDto)
  saturday?: DayWorkingHoursDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayWorkingHoursDto)
  sunday?: DayWorkingHoursDto;
}

/**
 * Create User Request DTO
 */
export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsArray()
  @IsString({ each: true })
  roles!: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  storeIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => WeeklyWorkingHoursDto)
  workingHours?: WeeklyWorkingHoursDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceSkills?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

/**
 * Update User Request DTO
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  storeIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => WeeklyWorkingHoursDto)
  workingHours?: WeeklyWorkingHoursDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceSkills?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

/**
 * Search Users Query DTO
 */
export class SearchUsersQueryDto {
  @IsOptional()
  @IsString()
  q?: string; // General search query (searches email, fullName, username)

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  role?: string; // Filter by role ID

  @IsOptional()
  @IsUUID()
  storeId?: string; // Filter by store ID

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  active?: boolean;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  perPage?: number;

  @IsOptional()
  @IsString()
  sort?: string; // e.g., "full_name", "-full_name", "created_at", "-created_at"
}

/**
 * User Response DTO
 */
export class UserResponseDto {
  id!: string;
  email!: string;
  fullName!: string;
  phone?: string;
  username?: string;
  roles!: string[];
  storeIds!: string[];
  workingHours?: {
    monday?: { startTime: string; endTime: string; isAvailable: boolean };
    tuesday?: { startTime: string; endTime: string; isAvailable: boolean };
    wednesday?: { startTime: string; endTime: string; isAvailable: boolean };
    thursday?: { startTime: string; endTime: string; isAvailable: boolean };
    friday?: { startTime: string; endTime: string; isAvailable: boolean };
    saturday?: { startTime: string; endTime: string; isAvailable: boolean };
    sunday?: { startTime: string; endTime: string; isAvailable: boolean };
  };
  serviceSkills!: string[];
  active!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
