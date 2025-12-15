# Owner Domain Entity

## Entity Description

The `Owner` entity represents a business owner (proprietário) of the Company in the petshop management system. This entity represents the legal/fiscal owner(s) of the business, distinct from system Users who have the "Owner" role for access control purposes.

**Key Characteristics:**
- Pure domain entity with no framework dependencies
- Encapsulates business rules and invariants
- Represents legal/fiscal ownership of the Company
- Supports multiple owners with ownership percentages
- Validates Portuguese NIF (tax ID) format
- Tracks fiscal and legal information required for Portuguese business compliance

## Properties

### Required Properties
- **`id`** (string, UUID): Unique identifier for the owner
- **`companyId`** (string, UUID): Reference to the Company entity (invariant: must exist)
- **`fullName`** (string): Owner's full name (1-255 characters)

### Optional Properties
- **`nif`** (string): Portuguese NIF (Número de Identificação Fiscal) - 9 digits with check digit
- **`address`** (Address): Owner's address (structured)
- **`email`** (string): Contact email address
- **`phone`** (string): Contact phone number
- **`dateOfBirth`** (Date): Owner's date of birth
- **`nationality`** (string): Owner's nationality
- **`notes`** (string): Additional notes

### Ownership Properties
- **`ownershipPercentage`** (number): Percentage of ownership (0-100, default 100)
- **`isPrimaryOwner`** (boolean): Whether this is the primary owner (default true)

### Metadata Properties
- **`createdAt`** (Date): Timestamp when the owner was created
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
2. **`companyId`**: Must be a non-empty string - **invariant**: Owner must be linked to a Company
3. **`fullName`**: Must be a non-empty string, 1-255 characters

### Optional Parameters
- All other properties are optional and can be set later via behavior methods
- **`ownershipPercentage`**: Defaults to 100 (full ownership)
- **`isPrimaryOwner`**: Defaults to true

### Validation Rules
- **ID Validation**: Throws error if `id` is empty or null
- **Company ID Validation**: Throws error if `companyId` is empty or null
- **Full Name Validation**: Throws error if `fullName` is empty, null, or exceeds 255 characters
- **NIF Validation**: If provided, must be:
  - Exactly 9 digits
  - Valid check digit according to Portuguese NIF algorithm
- **Address Validation**: If provided, must have:
  - Non-empty street
  - Non-empty city
  - Valid Portuguese postal code format (XXXX-XXX)
- **Email Validation**: If provided, must be valid email format and max 255 characters
- **Ownership Percentage**: Must be between 0 and 100 (inclusive)
- **Date of Birth**: If provided, cannot be in the future

### Example Constructor Usage
```typescript
// Minimal required fields
const owner = new Owner(
  'uuid-123',
  'company-uuid-456',
  'João Silva'
);

// Full constructor with address
const owner = new Owner(
  'uuid-123',
  'company-uuid-456',
  'João Silva',
  '123456789',
  {
    street: 'Rua das Flores, 123',
    city: 'Lisboa',
    postalCode: '1000-001',
    country: 'Portugal'
  },
  'joao.silva@example.com',
  '+351912345678',
  100,
  true,
  new Date('1980-05-15'),
  'Portuguese',
  'Primary business owner'
);
```

## Methods

### Getters (Read-Only Access)
All properties are accessed through getters that return copies to maintain encapsulation:
- `id`: Returns the owner's unique identifier
- `companyId`: Returns the company ID (immutable)
- `fullName`: Returns the owner's full name
- `nif`: Returns the NIF (or undefined)
- `address`: Returns a copy of the address (or undefined)
- `email`: Returns the email (or undefined)
- `phone`: Returns the phone (or undefined)
- `ownershipPercentage`: Returns the ownership percentage
- `isPrimaryOwner`: Returns whether this is the primary owner
- `dateOfBirth`: Returns a copy of the date of birth (or undefined)
- `nationality`: Returns the nationality (or undefined)
- `notes`: Returns notes (or undefined)
- `createdAt`: Returns a copy of the creation timestamp
- `updatedAt`: Returns a copy of the last update timestamp

### Behavior Methods

#### Property Updates
- **`updateFullName(fullName: string)`**: Updates the owner's full name (validates non-empty, max 255 chars)
- **`updateNif(nif: string | undefined)`**: Updates NIF (validates format and check digit)
- **`updateAddress(address: Address | undefined)`**: Updates address (validates structure)
- **`updateEmail(email: string | undefined)`**: Updates email (validates format)
- **`updatePhone(phone: string | undefined)`**: Updates phone number
- **`updateDateOfBirth(dateOfBirth: Date | undefined)`**: Updates date of birth (validates not in future)
- **`updateNationality(nationality: string | undefined)`**: Updates nationality
- **`updateNotes(notes: string | undefined)`**: Updates additional notes

#### Ownership Management
- **`updateOwnershipPercentage(percentage: number)`**: Updates ownership percentage (validates 0-100)
- **`setPrimaryOwner(isPrimary: boolean)`**: Sets or unsets the primary owner flag

#### Status Checks
- **`hasNif()`**: Returns true if owner has a valid NIF
- **`hasCompleteAddress()`**: Returns true if owner has complete address information
- **`hasRequiredFiscalInfo()`**: Returns true if owner has NIF and complete address (required for fiscal purposes)

#### Age Calculation
- **`calculateAge()`**: Returns age in years (or undefined if date of birth not set)

## Invariants

### Core Invariants (Always Enforced)
1. **Company Linkage**: An Owner **must** be linked to a Company (`companyId` cannot be empty)
   - Enforced in constructor
   - Cannot be changed after creation (immutable property)

2. **Full Name Requirement**: Owner full name **must** be non-empty and between 1-255 characters
   - Enforced in constructor and `updateFullName()` method

3. **NIF Format**: If NIF is provided, it **must** be:
   - Exactly 9 digits
   - Valid check digit according to Portuguese NIF algorithm
   - Enforced in constructor and `updateNif()` method

4. **Address Structure**: If address is provided, it **must** have:
   - Non-empty street
   - Non-empty city
   - Valid Portuguese postal code format (XXXX-XXX)

5. **Ownership Percentage**: Must be between 0 and 100 (inclusive)
   - Enforced in constructor and `updateOwnershipPercentage()` method

6. **Date Validity**: Date of birth cannot be in the future
   - Enforced in constructor and `updateDateOfBirth()` method

7. **Email Format**: If email is provided, must be valid format and max 255 characters

### Business Rules
1. **Primary Owner**: At least one Owner should be marked as primary owner for a Company
2. **Ownership Totals**: Sum of ownership percentages across all owners of a Company should equal 100% (enforced at aggregate level, not entity level)
3. **Fiscal Requirements**: For Portuguese business compliance, owners typically need NIF and complete address
4. **Multiple Owners**: Company can have multiple owners with different ownership percentages

## Example Lifecycle

### 1. Company Registration with Primary Owner
**Scenario**: A new petshop company is registered with a single owner.

```
1. Company is created (companyId: "comp-001")
2. Primary Owner entity is instantiated:
   - id: "owner-001"
   - companyId: "comp-001"
   - fullName: "João Silva"
   - nif: "123456789"
   - address: { street: "Rua das Flores, 123", city: "Lisboa", postalCode: "1000-001" }
   - ownershipPercentage: 100
   - isPrimaryOwner: true
   - createdAt: 2024-01-15T10:00:00Z
   - updatedAt: 2024-01-15T10:00:00Z

3. Entity validates:
   ✓ companyId is not empty
   ✓ fullName is not empty
   ✓ nif format is valid (9 digits)
   ✓ nif check digit is valid
   ✓ address structure is complete
   ✓ postal code format is valid (XXXX-XXX)
   ✓ ownershipPercentage is 100
```

### 2. Adding Contact Information
**Scenario**: Owner adds email and phone for business communications.

```
1. updateEmail("joao.silva@example.com")
   → Validates email format
   → updatedAt: 2024-01-15T10:30:00Z

2. updatePhone("+351912345678")
   → updatedAt: 2024-01-15T10:35:00Z
```

### 3. Adding Second Owner (Partnership)
**Scenario**: Business expands and adds a partner with 30% ownership.

```
1. Second Owner entity is created:
   - id: "owner-002"
   - companyId: "comp-001"
   - fullName: "Maria Santos"
   - nif: "987654321"
   - ownershipPercentage: 30
   - isPrimaryOwner: false

2. Primary owner's percentage is updated:
   - updateOwnershipPercentage(70)
   → updatedAt: 2024-01-20T14:00:00Z
   → ownershipPercentage: 70

3. System validates total ownership = 100% (at aggregate level)
```

### 4. Fiscal Information Verification
**Scenario**: System checks if owner has required fiscal information for compliance.

```
1. hasNif() → true
2. hasCompleteAddress() → true
3. hasRequiredFiscalInfo() → true
   → Owner has all required information for fiscal compliance
```

### 5. Address Update
**Scenario**: Owner moves to a new location.

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

### 6. NIF Validation
**Scenario**: System validates NIF when owner information is updated.

```
1. updateNif("123456789")
   → Validates 9 digits format
   → Validates check digit algorithm
   → updatedAt: 2024-01-15T11:00:00Z

2. Attempt invalid NIF:
   updateNif("12345678")
   → Error: "NIF must be exactly 9 digits"

3. Attempt NIF with invalid check digit:
   updateNif("123456788")
   → Error: "Invalid NIF check digit"
```

### 7. Primary Owner Transfer
**Scenario**: Business ownership changes, new primary owner is designated.

```
1. Current primary owner (owner-001):
   setPrimaryOwner(false)
   → isPrimaryOwner: false
   → updatedAt: 2024-12-01T10:00:00Z

2. New primary owner (owner-002):
   setPrimaryOwner(true)
   → isPrimaryOwner: true
   → updatedAt: 2024-12-01T10:05:00Z
```

### 8. Error Scenarios
**Scenario**: Attempting invalid operations.

```
1. new Owner("", "comp-001", "João Silva")
   → Error: "Owner ID is required"

2. new Owner("owner-001", "", "João Silva")
   → Error: "Company ID is required - an Owner must be linked to a Company"

3. new Owner("owner-001", "comp-001", "")
   → Error: "Owner full name is required"

4. new Owner("owner-001", "comp-001", "João Silva", "12345678")
   → Error: "NIF must be exactly 9 digits"

5. updateOwnershipPercentage(150)
   → Error: "Ownership percentage must be between 0 and 100"

6. updateAddress({ street: "", city: "Lisboa", postalCode: "1000-001" })
   → Error: "Address street is required"

7. updateEmail("invalid-email")
   → Error: "Invalid email format"
```

## Design Decisions

1. **Immutable Identity**: `id` and `companyId` are immutable to maintain referential integrity
2. **Encapsulation**: All properties are private with getters returning copies to prevent external mutation
3. **Validation at Boundaries**: All validation happens in constructor and update methods
4. **Portuguese NIF Validation**: Implements Portuguese NIF check digit algorithm for fiscal compliance
5. **Address Structure**: Structured address with Portuguese postal code format validation
6. **Multiple Ownership Support**: Supports multiple owners with ownership percentages
7. **Primary Owner Flag**: Allows designation of primary owner for business operations
8. **Fiscal Compliance**: Methods to check if owner has required fiscal information
9. **Timestamp Management**: Automatic `updatedAt` tracking on every modification

## Usage Notes

- This entity is framework-agnostic and can be used in any context
- Repository implementations should handle persistence concerns
- Use cases should orchestrate entity creation and updates
- Ownership percentage totals should be validated at the aggregate/Company level
- At least one Owner should be marked as primary owner for a Company
- Domain events can be published when significant state changes occur (outside entity scope)
- NIF validation uses the official Portuguese algorithm for check digit verification

