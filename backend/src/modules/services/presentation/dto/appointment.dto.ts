/**
 * Appointment DTOs
 *
 * Data Transfer Objects for Appointment API endpoints.
 */

import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Appointment Service Line DTO
 */
export class AppointmentServiceLineDto {
  @IsUUID()
  serviceId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceOverride?: number;
}

/**
 * Create Appointment Request DTO
 */
export class CreateAppointmentDto {
  @IsUUID()
  storeId!: string;

  @IsUUID()
  customerId!: string;

  @IsUUID()
  petId!: string;

  @IsDateString()
  startAt!: string; // ISO date string

  @IsDateString()
  endAt!: string; // ISO date string

  @IsOptional()
  @IsUUID()
  staffId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppointmentServiceLineDto)
  services!: AppointmentServiceLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  recurrenceId?: string;
}

/**
 * Update Appointment Request DTO
 */
export class UpdateAppointmentDto {
  @IsOptional()
  @IsDateString()
  startAt?: string; // ISO date string

  @IsOptional()
  @IsDateString()
  endAt?: string; // ISO date string

  @IsOptional()
  @IsUUID()
  staffId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppointmentServiceLineDto)
  services?: AppointmentServiceLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Confirm Appointment Request DTO
 */
export class ConfirmAppointmentDto {
  // No additional fields needed - appointment ID is in the URL path
}

/**
 * Consumed Item DTO (for completion)
 */
export class ConsumedItemDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;
}

/**
 * Complete Appointment Request DTO
 */
export class CompleteAppointmentDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsumedItemDto)
  consumedItems?: ConsumedItemDto[];
}

/**
 * Cancel Appointment Request DTO
 */
export class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  markNoShow?: boolean;
}

/**
 * Search Appointments Query DTO
 */
export class SearchAppointmentsQueryDto {
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsOptional()
  @IsUUID()
  staffId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  petId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string; // ISO date string

  @IsOptional()
  @IsDateString()
  endDate?: string; // ISO date string

  @IsOptional()
  @IsString()
  status?: string; // 'booked' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'needs-reschedule'

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  perPage?: number;

  @IsOptional()
  @IsString()
  sort?: string; // e.g., "start_at", "-start_at", "created_at", "-created_at"
}

/**
 * Appointment Response DTO
 */
export class AppointmentResponseDto {
  id!: string;
  storeId!: string;
  customerId!: string;
  petId!: string;
  startAt!: Date;
  endAt!: Date;
  status!: string; // AppointmentStatus enum value
  createdBy?: string;
  staffId?: string;
  notes?: string;
  recurrenceId?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  reason?: string;
  noShow!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * Appointment with Enriched Data Response DTO
 */
export class AppointmentEnrichedResponseDto extends AppointmentResponseDto {
  store?: {
    id: string;
    name: string;
  };
  customer?: {
    id: string;
    fullName: string;
  };
  pet?: {
    id: string;
    name: string;
  };
  staff?: {
    id: string;
    fullName: string;
  };
  services?: Array<{
    serviceId: string;
    serviceName: string;
    quantity: number;
  }>;
}
