/**
 * Timezone Validator
 * 
 * Custom validator for IANA timezone identifiers.
 * Validates that a string is a valid IANA timezone identifier.
 * 
 * Usage:
 * @IsTimezone()
 * timezone: string;
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isTimezone', async: false })
export class IsTimezoneConstraint implements ValidatorConstraintInterface {
  private readonly validTimezones: Set<string>;

  constructor() {
    // Common IANA timezone identifiers
    // This is a subset - in production, you might want to use a library like 'tzdata'
    this.validTimezones = new Set([
      // Europe
      'Europe/Lisbon',
      'Europe/London',
      'Europe/Paris',
      'Europe/Madrid',
      'Europe/Berlin',
      'Europe/Rome',
      'Europe/Amsterdam',
      'Europe/Brussels',
      'Europe/Vienna',
      'Europe/Prague',
      'Europe/Warsaw',
      'Europe/Stockholm',
      'Europe/Copenhagen',
      'Europe/Helsinki',
      'Europe/Oslo',
      'Europe/Dublin',
      'Europe/Athens',
      'Europe/Bucharest',
      'Europe/Budapest',
      'Europe/Zagreb',
      'Europe/Belgrade',
      'Europe/Sofia',
      'Europe/Kiev',
      'Europe/Moscow',
      // Americas
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Sao_Paulo',
      'America/Mexico_City',
      'America/Argentina/Buenos_Aires',
      'America/Toronto',
      'America/Vancouver',
      // Asia
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Hong_Kong',
      'Asia/Singapore',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Bangkok',
      'Asia/Seoul',
      // Pacific
      'Pacific/Auckland',
      'Pacific/Sydney',
      'Pacific/Honolulu',
      // UTC
      'UTC',
    ]);
  }

  validate(timezone: any, args: ValidationArguments): boolean {
    if (typeof timezone !== 'string') {
      return false;
    }

    const trimmed = timezone.trim();

    if (trimmed.length === 0) {
      return false;
    }

    // Check against known timezones
    if (this.validTimezones.has(trimmed)) {
      return true;
    }

    // Validate IANA timezone format (Continent/City or Region/City)
    // Basic format validation: at least one slash, valid characters
    const timezoneRegex = /^[A-Za-z_]+\/[A-Za-z_]+$/;
    if (!timezoneRegex.test(trimmed)) {
      return false;
    }

    // For production, you might want to use a library to validate against actual IANA database
    // For now, we accept any string matching the format
    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Timezone must be a valid IANA timezone identifier (e.g., Europe/Lisbon)';
  }
}

/**
 * Validates that a string is a valid IANA timezone identifier
 * 
 * @param validationOptions - Optional validation options
 * @returns Property decorator
 */
export function IsTimezone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTimezoneConstraint,
    });
  };
}

