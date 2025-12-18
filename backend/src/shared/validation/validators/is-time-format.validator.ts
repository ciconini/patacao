/**
 * Time Format Validator
 *
 * Custom validator for time format (HH:MM).
 * Validates that a string is in 24-hour format (00:00 to 23:59).
 *
 * Usage:
 * @IsTimeFormat()
 * openTime: string;
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isTimeFormat', async: false })
export class IsTimeFormatConstraint implements ValidatorConstraintInterface {
  validate(time: any, args: ValidationArguments): boolean {
    if (typeof time !== 'string') {
      return false;
    }

    const trimmed = time.trim();

    // Validate HH:MM format (24-hour)
    const timeRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(trimmed)) {
      return false;
    }

    // Additional validation: ensure it's a valid time
    const [hours, minutes] = trimmed.split(':').map(Number);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Time must be in HH:MM format (24-hour, e.g., 09:00, 23:59)';
  }
}

/**
 * Validates that a string is in HH:MM time format
 *
 * @param validationOptions - Optional validation options
 * @returns Property decorator
 */
export function IsTimeFormat(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTimeFormatConstraint,
    });
  };
}
