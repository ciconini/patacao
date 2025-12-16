/**
 * Portuguese Postal Code Validator
 * 
 * Custom validator for Portuguese postal codes.
 * Validates format: XXXX-XXX (4 digits, dash, 3 digits)
 * 
 * Usage:
 * @IsPortuguesePostalCode()
 * postalCode: string;
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isPortuguesePostalCode', async: false })
export class IsPortuguesePostalCodeConstraint implements ValidatorConstraintInterface {
  validate(postalCode: any, args: ValidationArguments): boolean {
    if (typeof postalCode !== 'string') {
      return false;
    }

    const trimmed = postalCode.trim();

    if (trimmed.length === 0) {
      return false;
    }

    // Portuguese postal code format: XXXX-XXX (4 digits, dash, 3 digits)
    const postalCodeRegex = /^\d{4}-\d{3}$/;
    return postalCodeRegex.test(trimmed);
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Postal code must be in Portuguese format (XXXX-XXX)';
  }
}

/**
 * Validates that a string is a valid Portuguese postal code
 * 
 * @param validationOptions - Optional validation options
 * @returns Property decorator
 */
export function IsPortuguesePostalCode(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPortuguesePostalCodeConstraint,
    });
  };
}

