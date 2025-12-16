/**
 * Portuguese Phone Number Validator
 * 
 * Custom validator for Portuguese phone numbers.
 * Validates formats: +351XXXXXXXXX or 9XXXXXXXX
 * 
 * Usage:
 * @IsPortuguesePhone()
 * phone: string;
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { PhoneNumber } from '../../modules/shared/domain/phone-number.value-object';

@ValidatorConstraint({ name: 'isPortuguesePhone', async: false })
export class IsPortuguesePhoneConstraint implements ValidatorConstraintInterface {
  validate(phone: any, args: ValidationArguments): boolean {
    if (typeof phone !== 'string') {
      return false;
    }

    // Use PhoneNumber validation
    if (!PhoneNumber.isValid(phone)) {
      return false;
    }

    // Additional Portuguese-specific validation
    const trimmed = phone.trim();
    const digits = trimmed.replace(/\D/g, '');

    // Portugal formats:
    // 1. International: +351XXXXXXXXX (9 digits after country code)
    // 2. Mobile: 9XXXXXXXX (9 digits starting with 9)
    // 3. Landline: 2XXXXXXXX or 3XXXXXXXX (9 digits starting with 2 or 3)
    
    if (trimmed.startsWith('+351')) {
      // International format: +351 followed by 9 digits
      const afterCountryCode = digits.substring(3); // Remove 351
      return afterCountryCode.length === 9;
    } else if (digits.length === 9) {
      // Portuguese format: 9 digits starting with 9 (mobile) or 2/3 (landline)
      return digits.startsWith('9') || digits.startsWith('2') || digits.startsWith('3');
    }

    return false;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Phone must be a valid Portuguese phone number (+351XXXXXXXXX or 9XXXXXXXX)';
  }
}

/**
 * Validates that a string is a valid Portuguese phone number
 * 
 * @param validationOptions - Optional validation options
 * @returns Property decorator
 */
export function IsPortuguesePhone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPortuguesePhoneConstraint,
    });
  };
}

