/**
 * Inventory Reservation DTOs
 *
 * Data Transfer Objects for Inventory Reservation API endpoints.
 */

import { IsString, IsOptional, IsUUID, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';

/**
 * Create Inventory Reservation Request DTO
 */
export class CreateInventoryReservationDto {
  @IsUUID()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsUUID()
  reservedForId!: string; // Appointment or transaction ID

  @IsEnum(['appointment', 'transaction'])
  reservedForType!: 'appointment' | 'transaction';

  @IsOptional()
  @IsDateString()
  expiresAt?: string; // ISO date string
}

/**
 * Release Inventory Reservation Request DTO
 */
export class ReleaseInventoryReservationDto {
  // No additional fields needed - reservation ID is in the URL path
}

/**
 * Inventory Reservation Response DTO
 */
export class InventoryReservationResponseDto {
  id!: string;
  productId!: string;
  quantity!: number;
  reservedForId!: string;
  reservedForType!: 'appointment' | 'transaction';
  status!: string; // ReservationStatus enum value
  expiresAt?: Date;
  createdAt!: Date;
  updatedAt!: Date;
}
