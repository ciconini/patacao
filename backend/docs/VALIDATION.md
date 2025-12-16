# Validation Implementation

## Overview

Phase 3.3 Validation has been completed. This document describes the validation architecture and how to use custom validators.

## Architecture

### 1. Global Validation Pipe

**Location:** `backend/src/main.ts`

The global `ValidationPipe` is configured with:
- `whitelist: true` - Strips properties that don't have decorators
- `forbidNonWhitelisted: true` - Rejects requests with unknown properties
- `transform: true` - Automatically transforms payloads to DTO instances
- `enableImplicitConversion: true` - Enables automatic type conversion

### 2. Custom Validators

**Location:** `backend/src/shared/validation/validators/`

Custom validators for Portuguese-specific validations:

#### Portuguese NIF Validator
- **File:** `is-portuguese-nif.validator.ts`
- **Usage:** `@IsPortugueseNIF()`
- **Validates:** 9-digit Portuguese NIF with checksum validation
- **Example:**
  ```typescript
  @IsPortugueseNIF()
  nif!: string;
  ```

#### Portuguese Phone Validator
- **File:** `is-portuguese-phone.validator.ts`
- **Usage:** `@IsPortuguesePhone()`
- **Validates:** Portuguese phone formats (+351XXXXXXXXX or 9XXXXXXXX)
- **Example:**
  ```typescript
  @IsOptional()
  @IsPortuguesePhone()
  phone?: string;
  ```

#### Portuguese Postal Code Validator
- **File:** `is-portuguese-postal-code.validator.ts`
- **Usage:** `@IsPortuguesePostalCode()`
- **Validates:** Portuguese postal code format (XXXX-XXX)
- **Example:**
  ```typescript
  @IsPortuguesePostalCode()
  postalCode!: string;
  ```

#### VAT Rate Validator
- **File:** `is-vat-rate.validator.ts`
- **Usage:** `@IsVATRate()` or `@IsVATRate({ allowCommonRatesOnly: true })`
- **Validates:** VAT rate between 0 and 100, optionally only common Portuguese rates (0%, 6%, 13%, 23%)
- **Example:**
  ```typescript
  @IsVATRate()
  vatRate!: number;
  
  // Or restrict to common rates only
  @IsVATRate({ allowCommonRatesOnly: true })
  vatRate!: number;
  ```

#### Time Format Validator
- **File:** `is-time-format.validator.ts`
- **Usage:** `@IsTimeFormat()`
- **Validates:** Time in HH:MM format (24-hour, 00:00 to 23:59)
- **Example:**
  ```typescript
  @IsTimeFormat()
  openTime!: string;
  ```

#### Timezone Validator
- **File:** `is-timezone.validator.ts`
- **Usage:** `@IsTimezone()`
- **Validates:** IANA timezone identifier (e.g., Europe/Lisbon)
- **Example:**
  ```typescript
  @IsOptional()
  @IsTimezone()
  timezone?: string;
  ```

### 3. Validation Error Handling

**Location:** `backend/src/shared/presentation/filters/http-exception.filter.ts`

Validation errors from `class-validator` are automatically caught and formatted:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "statusCode": 400,
    "details": {
      "fields": ["nif", "phone"],
      "messages": [
        "NIF must be a valid Portuguese NIF (9 digits with valid check digit)",
        "Phone must be a valid Portuguese phone number (+351XXXXXXXXX or 9XXXXXXXX)"
      ]
    }
  },
  "path": "/api/v1/companies",
  "method": "POST",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Usage Examples

### Company DTO with Custom Validators

```typescript
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { IsPortugueseNIF } from '../../../../shared/validation/validators/is-portuguese-nif.validator';
import { IsPortuguesePhone } from '../../../../shared/validation/validators/is-portuguese-phone.validator';
import { IsVATRate } from '../../../../shared/validation/validators/is-vat-rate.validator';

export class CreateCompanyDto {
  @IsString()
  name!: string;

  @IsPortugueseNIF()
  nif!: string;

  @IsOptional()
  @IsPortuguesePhone()
  phone?: string;

  @IsOptional()
  @IsNumber()
  @IsVATRate()
  defaultVatRate?: number;
}
```

### Store DTO with Time and Timezone Validators

```typescript
import { IsTimeFormat } from '../../../../shared/validation/validators/is-time-format.validator';
import { IsTimezone } from '../../../../shared/validation/validators/is-timezone.validator';

export class DayOpeningHoursDto {
  @IsOptional()
  @IsTimeFormat()
  open?: string;

  @IsOptional()
  @IsTimeFormat()
  close?: string;

  @IsOptional()
  closed?: boolean;
}

export class CreateStoreDto {
  @IsOptional()
  @IsTimezone()
  timezone?: string;
}
```

### Address DTO with Postal Code Validator

```typescript
import { IsPortuguesePostalCode } from '../../../../shared/validation/validators/is-portuguese-postal-code.validator';

export class AddressDto {
  @IsString()
  street!: string;

  @IsString()
  city!: string;

  @IsPortuguesePostalCode()
  postalCode!: string;

  @IsOptional()
  @IsString()
  country?: string;
}
```

## Integration with Domain Value Objects

The custom validators leverage existing domain value objects:

- **PortugueseNIF validator** uses `PortugueseNIF.isValid()` from the domain layer
- **Portuguese Phone validator** uses `PhoneNumber.isValid()` from the domain layer
- **Postal Code validator** uses the same validation logic as `Address` value object

This ensures consistency between API validation and domain validation.

## Error Messages

Each validator provides user-friendly error messages:

- **NIF:** "NIF must be a valid Portuguese NIF (9 digits with valid check digit)"
- **Phone:** "Phone must be a valid Portuguese phone number (+351XXXXXXXXX or 9XXXXXXXX)"
- **Postal Code:** "Postal code must be in Portuguese format (XXXX-XXX)"
- **VAT Rate:** "VAT rate must be between 0 and 100" or "VAT rate must be one of the common Portuguese rates: 0%, 6%, 13%, or 23%"
- **Time Format:** "Time must be in HH:MM format (24-hour, e.g., 09:00, 23:59)"
- **Timezone:** "Timezone must be a valid IANA timezone identifier (e.g., Europe/Lisbon)"

## Testing

To test validators:

1. **Valid data:** Send requests with valid Portuguese formats
2. **Invalid data:** Send requests with invalid formats to see validation errors
3. **Edge cases:** Test boundary values (e.g., VAT rate 0, 100, 101)

## Best Practices

1. **Use appropriate validators:** Choose validators that match your business requirements
2. **Combine validators:** Use multiple validators for comprehensive validation
3. **Optional fields:** Use `@IsOptional()` before custom validators for optional fields
4. **Error messages:** Custom validators provide clear, actionable error messages
5. **Domain consistency:** Validators use domain value objects to ensure consistency

## Future Enhancements

Potential improvements:

- Additional Portuguese-specific validators (e.g., IBAN, NIPC)
- Custom validators for business rules (e.g., appointment time ranges)
- Async validators for database uniqueness checks
- Conditional validation based on other fields
- Custom validation groups for different scenarios

