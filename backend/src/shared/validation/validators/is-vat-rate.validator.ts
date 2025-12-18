/**
 * VAT Rate Validator
 *
 * Custom validator for VAT rates.
 * Validates that a number is between 0 and 100, and optionally matches common Portuguese VAT rates.
 *
 * Usage:
 * @IsVATRate()
 * vatRate: number;
 *
 * @IsVATRate({ allowCommonRatesOnly: true })
 * vatRate: number; // Only allows 0, 6, 13, 23
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

export interface IsVATRateOptions {
  allowCommonRatesOnly?: boolean; // If true, only allows 0, 6, 13, 23
}

@ValidatorConstraint({ name: 'isVATRate', async: false })
export class IsVATRateConstraint implements ValidatorConstraintInterface {
  validate(vatRate: any, args: ValidationArguments): boolean {
    if (typeof vatRate !== 'number') {
      return false;
    }

    // Check range
    if (vatRate < 0 || vatRate > 100) {
      return false;
    }

    // Check if only common Portuguese rates are allowed
    const options = args.constraints[0] as IsVATRateOptions | undefined;
    if (options?.allowCommonRatesOnly) {
      const commonRates = [0, 6, 13, 23];
      return commonRates.includes(vatRate);
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const options = args.constraints[0] as IsVATRateOptions | undefined;
    if (options?.allowCommonRatesOnly) {
      return 'VAT rate must be one of the common Portuguese rates: 0%, 6%, 13%, or 23%';
    }
    return 'VAT rate must be between 0 and 100';
  }
}

/**
 * Validates that a number is a valid VAT rate
 *
 * @param options - Optional validation options
 * @param validationOptions - Optional validation options
 * @returns Property decorator
 */
export function IsVATRate(options?: IsVATRateOptions, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: IsVATRateConstraint,
    });
  };
}
