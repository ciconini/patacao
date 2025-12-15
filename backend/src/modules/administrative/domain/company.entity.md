# Company Domain Entity

## Entity Description

The `Company` entity represents the business profile (company) in the petshop management system. This entity represents the legal business entity that operates the petshop stores. It contains fiscal information required for Portuguese business compliance and invoicing.

**Key Characteristics:**
- Pure domain entity with no framework dependencies
- Encapsulates business rules and invariants
- Represents the legal business entity
- Validates Portuguese NIF (tax ID) format
- Tracks fiscal information for invoicing compliance
- Supports multiple stores under one company

## Properties

### Required Properties
- **`id`** (string, UUID): Unique identifier for the company
- **`name`** (string): Company name (1-255 characters)
- **`nif`** (string): Portuguese NIF (Número de Identificação Fiscal) - 9 digits with check digit
- **`address`** (Address): Company address (structured, required)
- **`taxRegime`** (string): Tax regime (1-100 characters)

### Optional Properties
- **`defaultVatRate`** (number): Default VAT rate (0-100)
- **`phone`** (string): Contact phone number
- **`email`** (string): Contact email address
- **`website`** (string): Company website URL

### Metadata Properties
- **`createdAt`** (Date): Timestamp when the company was created
- **`updatedAt`** (Date): Timestamp of the last update

### Address Interface
```typescript
interface Address {
  street: string;        // Required: Street address
  city: string;          // Required: City name
  postalCode: string;    // Required: Portuguese postal code (XXXX-XXX format)
  country?: string;      // Optional: Country (defaults to Portugal)
}
```

## Constructor Rules

### Required Parameters
1. **`id`**: Must be a non-empty string (UUID format recommended)
2. **`name`**: Must be a non-empty string, 1-255 characters
3. **`nif`**: Must be a non-empty string, exactly 9 digits with valid check digit
4. **`address`**: Must be a valid Address object with street, city, and postal code
5. **`taxRegime`**: Must be a non-empty string, 1-100 characters

### Optional Parameters
- All other properties are optional and can be set later via behavior methods

### Validation Rules
- **ID Validation**: Throws error if `id` is empty or null
- **Name Validation**: Throws error if `name` is empty, null, or exceeds 255 characters
- **NIF Validation**: 
  - Must be exactly 9 digits
  - Must have valid check digit according to Portuguese NIF algorithm
  - Required for invoicing compliance
- **Address Validation**: Must have:
  - Non-empty street
  - Non-empty city
  - Valid Portuguese postal code format (XXXX-XXX)
- **Tax Regime Validation**: Must be non-empty and max 100 characters
- **VAT Rate Validation**: If provided, must be between 0 and 100 (inclusive)
- **Email Validation**: If provided, must be valid email format and max 255 characters

### Example Constructor Usage
```typescript
// Minimal required fields
const company = new Company(
  'uuid-123',
  'Patacão Petshop',
  '123456789',
  {
    street: 'Rua das Flores, 123',
    city: 'Lisboa',
    postalCode: '1000-001'
  },
  'Simplified Regime'
);

// Full constructor
const company = new Company(
  'uuid-123',
  'Patacão Petshop',
  '123456789',
  {
    street: 'Rua das Flores, 123',
    city: 'Lisboa',
    postalCode: '1000-001',
    country: 'Portugal'
  },
  'Simplified Regime',
  23.00,
  '+351213456789',
  'contact@patacao.pt',
  'https://www.patacao.pt',
  new Date('2024-01-15'),
  new Date('2024-01-15')
);
```

## Methods

### Getters (Read-Only Access)
All properties are accessed through getters that return copies to maintain encapsulation.

### Behavior Methods

#### Property Updates
- **`updateName(name: string)`**: Updates company name (validates non-empty, max 255 chars)
- **`updateNif(nif: string)`**: Updates NIF (validates format and check digit) - **Core fiscal field**
- **`updateAddress(address: Address)`**: Updates address (validates structure)
- **`updateTaxRegime(taxRegime: string)`**: Updates tax regime (validates non-empty) - **Core fiscal field**
- **`updateDefaultVatRate(vatRate: number | undefined)`**: Updates default VAT rate (validates 0-100) - **Core fiscal field**
- **`updatePhone(phone: string | undefined)`**: Updates phone number
- **`updateEmail(email: string | undefined)`**: Updates email (validates format)
- **`updateWebsite(website: string | undefined)`**: Updates website URL

#### Status Checks
- **`hasValidNif()`**: Returns true if NIF is valid
- **`hasCompleteAddress()`**: Returns true if address is complete
- **`hasRequiredFiscalInfo()`**: Returns true if company has all required fiscal information for invoicing

#### VAT Rate Management
- **`getVatRate(overrideRate?: number)`**: Gets the VAT rate to use (default or override)

## Invariants

### Core Invariants (Always Enforced)
1. **Name Requirement**: Company name **must** be non-empty and 1-255 characters
   - Enforced in constructor and `updateName()` method

2. **NIF Requirement**: NIF **must** be:
   - Exactly 9 digits
   - Valid check digit according to Portuguese NIF algorithm
   - Required for invoicing compliance
   - Enforced in constructor and `updateNif()` method

3. **Address Requirement**: Address **must** have:
   - Non-empty street
   - Non-empty city
   - Valid Portuguese postal code format (XXXX-XXX)
   - Enforced in constructor and `updateAddress()` method

4. **Tax Regime Requirement**: Tax regime **must** be non-empty and max 100 characters
   - Enforced in constructor and `updateTaxRegime()` method

5. **VAT Rate Range**: If provided, VAT rate **must** be between 0 and 100 (inclusive)
   - Enforced in constructor and `updateDefaultVatRate()` method

### Business Rules
1. **Fiscal Field Updates**: Only Owner role users may update core fiscal fields (NIF, tax regime, default VAT rate) - enforced at use case level
2. **Invoicing Requirements**: Company must have valid NIF and complete address for invoicing
3. **Multiple Stores**: Company can have multiple stores (relationship managed at aggregate/repository level)
4. **VAT Rate Usage**: Default VAT rate is used unless overridden at invoice/service level

## Example Lifecycle

### 1. Company Registration
**Scenario**: A new petshop company is registered in the system.

```
1. Company entity is instantiated:
   - id: "comp-001"
   - name: "Patacão Petshop"
   - nif: "123456789"
   - address: { street: "Rua das Flores, 123", city: "Lisboa", postalCode: "1000-001" }
   - taxRegime: "Simplified Regime"
   - createdAt: 2024-01-15T10:00:00Z
   - updatedAt: 2024-01-15T10:00:00Z

2. Entity validates:
   ✓ id is not empty
   ✓ name is not empty
   ✓ nif format is valid (9 digits)
   ✓ nif check digit is valid
   ✓ address structure is complete
   ✓ postal code format is valid (XXXX-XXX)
   ✓ taxRegime is not empty
```

### 2. Adding Contact Information
**Scenario**: Company contact details are added.

```
1. updateEmail("contact@patacao.pt")
   → Validates email format
   → updatedAt: 2024-01-15T10:30:00Z

2. updatePhone("+351213456789")
   → updatedAt: 2024-01-15T10:35:00Z

3. updateWebsite("https://www.patacao.pt")
   → updatedAt: 2024-01-15T10:40:00Z
```

### 3. Setting Default VAT Rate
**Scenario**: Company sets default VAT rate for invoicing.

```
1. updateDefaultVatRate(23.00)
   → defaultVatRate: 23.00
   → updatedAt: 2024-01-15T11:00:00Z

2. getVatRate() → 23.00
3. getVatRate(6.00) → 6.00 (override)
```

### 4. Fiscal Information Verification
**Scenario**: System checks if company has required fiscal information for invoicing.

```
1. hasValidNif() → true
2. hasCompleteAddress() → true
3. hasRequiredFiscalInfo() → true
   → Company has all required information for invoicing
```

### 5. Address Update
**Scenario**: Company moves to a new location.

```
1. updateAddress({
     street: "Avenida da Liberdade, 456",
     city: "Porto",
     postalCode: "4000-001",
     country: "Portugal"
   })
   → Validates address structure
   → Validates postal code format
   → updatedAt: 2024-06-01T09:00:00Z
```

### 6. Tax Regime Update
**Scenario**: Company changes tax regime (Owner role required at use case level).

```
1. updateTaxRegime("General Regime")
   → taxRegime: "General Regime"
   → updatedAt: 2024-12-01T10:00:00Z
   → Note: Use case should verify Owner role before allowing this update
```

### 7. NIF Validation
**Scenario**: System validates NIF when company information is updated.

```
1. updateNif("123456789")
   → Validates 9 digits format
   → Validates check digit algorithm
   → updatedAt: 2024-01-15T11:30:00Z

2. Attempt invalid NIF:
   updateNif("12345678")
   → Error: "NIF must be exactly 9 digits"

3. Attempt NIF with invalid check digit:
   updateNif("123456788")
   → Error: "Invalid NIF check digit"
```

### 8. Error Scenarios
**Scenario**: Attempting invalid operations.

```
1. new Company("", "Patacão Petshop", "123456789", address, "Simplified Regime")
   → Error: "Company ID is required"

2. new Company("comp-001", "", "123456789", address, "Simplified Regime")
   → Error: "Company name is required"

3. new Company("comp-001", "Patacão Petshop", "", address, "Simplified Regime")
   → Error: "NIF is required"

4. new Company("comp-001", "Patacão Petshop", "123456789", invalidAddress, "Simplified Regime")
   → Error: "Address street is required" (or similar address validation error)

5. updateDefaultVatRate(150)
   → Error: "VAT rate must be between 0 and 100"

6. updateEmail("invalid-email")
   → Error: "Invalid email format"
```

## Design Decisions

1. **Immutable Identity**: `id` is immutable to maintain referential integrity
2. **Encapsulation**: All properties are private with getters returning copies to prevent external mutation
3. **Validation at Boundaries**: All validation happens in constructor and update methods
4. **Portuguese NIF Validation**: Implements Portuguese NIF check digit algorithm for fiscal compliance
5. **Address Structure**: Structured address with Portuguese postal code format validation
6. **Fiscal Field Protection**: Core fiscal fields (NIF, tax regime, VAT rate) are marked in documentation for Owner-only updates (enforced at use case level)
7. **VAT Rate Management**: Supports default rate with override capability
8. **Fiscal Compliance**: Methods to check if company has required fiscal information for invoicing
9. **Timestamp Management**: Automatic `updatedAt` tracking on every modification

## Usage Notes

- This entity is framework-agnostic and can be used in any context
- Repository implementations should handle persistence concerns
- NIF uniqueness should be enforced at repository/aggregate level
- Core fiscal field updates (NIF, tax regime, default VAT rate) should be restricted to Owner role users at use case level
- Company can have multiple stores (relationship managed at aggregate/repository level)
- Fiscal information validation is required before allowing invoicing operations
- Domain events can be published when significant state changes occur (outside entity scope)
- NIF validation uses the official Portuguese algorithm for check digit verification

