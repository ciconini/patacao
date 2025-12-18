/**
 * Authentication DTOs
 *
 * Data Transfer Objects for Authentication API endpoints.
 */

import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

/**
 * Login Request DTO
 */
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

/**
 * Login Response DTO
 */
export class LoginResponseDto {
  accessToken!: string;
  refreshToken!: string;
  user!: {
    id: string;
    email: string;
    fullName: string;
    roles: string[];
  };
  expiresIn!: number; // Access token expiration in seconds
}

/**
 * Logout Request DTO
 */
export class LogoutDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

/**
 * Logout Response DTO
 */
export class LogoutResponseDto {
  success!: boolean;
  message!: string;
}

/**
 * Refresh Token Request DTO
 */
export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

/**
 * Refresh Token Response DTO
 */
export class RefreshTokenResponseDto {
  accessToken!: string;
  refreshToken?: string; // Optional, only present if refresh token was rotated
  expiresIn!: number; // Access token expiration in seconds
}

/**
 * Password Reset Request DTO
 */
export class PasswordResetRequestDto {
  @IsEmail()
  email!: string;
}

/**
 * Password Reset Request Response DTO
 */
export class PasswordResetRequestResponseDto {
  success!: boolean;
  message!: string;
}

/**
 * Password Reset Confirm DTO
 */
export class PasswordResetConfirmDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword!: string;
}

/**
 * Password Reset Confirm Response DTO
 */
export class PasswordResetConfirmResponseDto {
  success!: boolean;
  message!: string;
}
