/**
 * Portuguese NIF Validator
 *
 * Custom validator for Portuguese NIF (Número de Identificação Fiscal).
 * Validates that a string is a valid Portuguese NIF (9 digits with checksum).
 *
 * Usage:
 * @IsPortugueseNIF()
 * nif: string;
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { PortugueseNIF } from '../../../modules/shared/domain/portuguese-nif.value-object';

@ValidatorConstraint({ name: 'isPortugueseNIF', async: false })
export class IsPortugueseNIFConstraint implements ValidatorConstraintInterface {
  validate(nif: any, args: ValidationArguments): boolean {
    if (typeof nif !== 'string') {
      return false;
    }

    return PortugueseNIF.isValid(nif);
  }

  defaultMessage(args: ValidationArguments): string {
    return 'NIF must be a valid Portuguese NIF (9 digits with valid check digit)';
  }
}

/**
 * Validates that a string is a valid Portuguese NIF
 *
 * @param validationOptions - Optional validation options
 * @returns Property decorator
 */
export function IsPortugueseNIF(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPortugueseNIFConstraint,
    });
  };
}
