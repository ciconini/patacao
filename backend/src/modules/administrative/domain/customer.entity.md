# Customer Domain Entity

## Entity Description

The `Customer` entity represents a client/owner of pets in the petshop management system. Customers are the people who bring their pets to the petshop for services, appointments, and purchases. This entity manages customer information, contact details, and consent preferences for communications.

**Key Characteristics:**
- Pure domain entity with no framework dependencies
- Encapsulates business rules and invariants
- Represents clients (distinct from system Users who are staff)
- Manages consent preferences for marketing and reminders
- Immutable identity (ID cannot be changed)
- Tracks creation and update timestamps

## Properties

### Required Properties
- **`id`** (string, UUID): Unique identifier for the customer
- **`fullName`** (string): Customer's full name (1-200 characters)

### Optional Properties
- **`email`** (string): Contact email address (validated format)
- **`phone`** (string): Contact phone number
- **`address`** (Address): Customer's address (structured)

### Consent Properties
- **`consentMarketing`** (boolean): Consent for marketing communications (default false)
- **`consentReminders`** (boolean): Consent for appointment reminders (default false)

### Metadata Properties
- **`createdAt`** (Date): Timestamp when the customer was created
- **`updatedAt`** (Date): Timestamp of the last update

### Address Interface
```typescript
interface Address {
  street: string;        // Required: Street address
  city: string;          // Required: City name
  postalCode: string;    // Required: Postal code
  country?: string;      // Optional: Country name
}
```

## Constructor Rules

### Required Parameters
1. **`id`**: Must be a non-empty string (UUID format recommended)
2. **`fullName`**: Must be a non-empty string, 1-200 characters

### Optional Parameters
- **`email`**: Optional email address (validated if provided)
- **`phone`**: Optional phone number
- **`address`**: Optional structured address
- **`consentMarketing`**: Defaults to false
- **`consentReminders`**: Defaults to false
- **`createdAt`**: Defaults to current date/time if not provided
- **`updatedAt`**: Defaults to current date/time if not provided

### Validation Rules
- **ID Validation**: Throws error if `id` is empty or null
- **Full Name Validation**: Throws error if `fullName` is empty, null, or exceeds 200 characters
- **Email Validation**: If provided, must match valid email format and not exceed 255 characters
- **Address Validation**: If provided, must have valid street, city, and postalCode (each with length limits)

### Example Constructor Usage
```typescript
// Minimal required fields
const customer = new Customer(
  'uuid-123',
  'João Silva'
);

// Full constructor with all fields
const customer = new Customer(
  'uuid-123',
  'João Silva',
  'joao.silva@example.com',
  '+351912345678',
  {
    street: 'Rua das Flores, 123',
    city: 'Lisboa',
    postalCode: '1000-001',
    country: 'Portugal'
  },
  true,  // consentMarketing
  true,  // consentReminders
  new Date('2024-01-01'),
  new Date('2024-01-01')
);
```

## Methods

### Getters (Read-Only Access)
All properties are accessed through getters that return copies to maintain encapsulation:
- `id`: Returns the customer's unique identifier
- `fullName`: Returns the customer's full name
- `email`: Returns the email address (or undefined)
- `phone`: Returns the phone number (or undefined)
- `address`: Returns a copy of the address (or undefined)
- `consentMarketing`: Returns marketing consent status
- `consentReminders`: Returns reminders consent status
- `createdAt`: Returns a copy of the creation timestamp
- `updatedAt`: Returns a copy of the last update timestamp

### Behavior Methods

#### Property Updates
- **`updateFullName(fullName: string)`**: Updates the customer's full name (validates non-empty, max 200 chars)
- **`updateEmail(email: string | undefined)`**: Updates the email address (validates format if provided)
- **`updatePhone(phone: string | undefined)`**: Updates the phone number
- **`updateAddress(address: Address | undefined)`**: Updates the address (validates structure if provided)
- **`updateConsentMarketing(consent: boolean)`**: Updates marketing consent
- **`updateConsentReminders(consent: boolean)`**: Updates appointment reminders consent

#### Status Checks
- **`canReceiveReminders()`**: Returns true if customer has consented to appointment reminders
- **`canReceiveMarketing()`**: Returns true if customer has consented to marketing communications
- **`hasEmail()`**: Returns true if customer has a valid email address
- **`hasPhone()`**: Returns true if customer has a valid phone number
- **`hasAddress()`**: Returns true if customer has a complete address

## Invariants

### Core Invariants (Always Enforced)
1. **Full Name Requirement**: Customer full name **must** be non-empty and between 1-200 characters
   - Enforced in constructor and `updateFullName()` method

2. **Email Format**: If email is provided, it **must** match a valid email format
   - Enforced in constructor and `updateEmail()` method
   - Maximum length: 255 characters

3. **Address Structure**: If address is provided, it **must** have:
   - Non-empty street (max 200 characters)
   - Non-empty city (max 100 characters)
   - Non-empty postal code (max 20 characters)
   - Optional country

### Business Rules
1. **Reminder Consent**: `consentReminders` must be true to send appointment reminders by email
   - Enforced by `canReceiveReminders()` method
   - Business logic should check this before sending reminders

2. **Marketing Consent**: `consentMarketing` must be true to send marketing communications
   - Enforced by `canReceiveMarketing()` method
   - Business logic should check this before sending marketing emails

3. **Customer Deletion**: Deleting a Customer requires reassigning or deleting linked Pets/appointments or archiving
   - This is enforced at the use case/repository level, not in the entity
   - Entity provides status checks to help determine if customer can be safely deleted

4. **Timestamp Tracking**: `createdAt` is immutable, `updatedAt` is updated on every modification

## Example Lifecycle

### 1. Customer Registration
**Scenario**: A new customer visits the petshop for the first time.

```
1. Customer entity is instantiated:
   - id: "cust-001"
   - fullName: "Maria Santos"
   - email: undefined
   - phone: undefined
   - address: undefined
   - consentMarketing: false
   - consentReminders: false
   - createdAt: 2024-01-15T10:00:00Z
   - updatedAt: 2024-01-15T10:00:00Z

2. Entity validates:
   ✓ id is not empty
   ✓ fullName is not empty
```

### 2. Adding Contact Information
**Scenario**: Customer provides contact details during registration.

```
1. updateEmail("maria.santos@example.com")
   → Validates email format
   → email: "maria.santos@example.com"
   → updatedAt: 2024-01-15T10:05:00Z

2. updatePhone("+351912345678")
   → phone: "+351912345678"
   → updatedAt: 2024-01-15T10:06:00Z

3. updateAddress({
     street: "Avenida da Liberdade, 456",
     city: "Porto",
     postalCode: "4000-123",
     country: "Portugal"
   })
   → Validates address structure
   → address: { street: "...", city: "...", postalCode: "...", country: "..." }
   → updatedAt: 2024-01-15T10:07:00Z
```

### 3. Consent Management
**Scenario**: Customer opts in for appointment reminders and marketing.

```
1. updateConsentReminders(true)
   → consentReminders: true
   → updatedAt: 2024-01-15T10:10:00Z

2. canReceiveReminders() → true
   → System can now send appointment reminders

3. updateConsentMarketing(true)
   → consentMarketing: true
   → updatedAt: 2024-01-15T10:11:00Z

4. canReceiveMarketing() → true
   → System can now send marketing communications
```

### 4. Appointment Reminder Check
**Scenario**: System checks if customer can receive appointment reminders before sending.

```
1. canReceiveReminders() → true
   → Customer has consented to reminders

2. hasEmail() → true
   → Customer has a valid email address

3. System proceeds to send appointment reminder email
```

### 5. Information Updates
**Scenario**: Customer moves and updates address and phone.

```
1. updateAddress({
     street: "Rua Nova, 789",
     city: "Braga",
     postalCode: "4700-456",
     country: "Portugal"
   })
   → Validates new address
   → address updated
   → updatedAt: 2024-06-01T14:00:00Z

2. updatePhone("+351987654321")
   → phone updated
   → updatedAt: 2024-06-01T14:01:00Z
```

### 6. Consent Withdrawal
**Scenario**: Customer opts out of marketing communications.

```
1. updateConsentMarketing(false)
   → consentMarketing: false
   → updatedAt: 2024-08-15T09:00:00Z

2. canReceiveMarketing() → false
   → System should stop sending marketing emails

3. canReceiveReminders() → true
   → Reminders consent still active
```

### 7. Status Checks
**Scenario**: System checks customer contact information availability.

```
1. hasEmail() → true
   → Customer has email: "maria.santos@example.com"

2. hasPhone() → true
   → Customer has phone: "+351912345678"

3. hasAddress() → true
   → Customer has complete address

4. All contact methods available for communication
```

### 8. Error Scenarios
**Scenario**: Attempting invalid operations.

```
1. new Customer("", "Maria Santos")
   → Error: "Customer ID is required"

2. new Customer("cust-001", "")
   → Error: "Customer full name is required"

3. new Customer("cust-001", "Maria Santos", "invalid-email")
   → Error: "Invalid email format"

4. updateFullName("A".repeat(201))
   → Error: "Customer full name cannot exceed 200 characters"

5. updateAddress({
     street: "",
     city: "Porto",
     postalCode: "4000-123"
   })
   → Error: "Address street is required"

6. updateEmail("very-long-email-address-that-exceeds-255-characters..." + "@example.com")
   → Error: "Email cannot exceed 255 characters"
```

## Design Decisions

1. **Immutable Identity**: `id` is immutable to maintain referential integrity
2. **Encapsulation**: All properties are private with getters returning copies to prevent external mutation
3. **Validation at Boundaries**: All validation happens in constructor and update methods
4. **Consent Management**: Separate boolean flags for marketing and reminders enable granular consent control
5. **Address Structure**: Structured address interface ensures consistent data format
6. **Optional Contact Info**: Email, phone, and address are optional to support walk-in customers
7. **Status Check Methods**: Helper methods (`hasEmail()`, `hasPhone()`, `hasAddress()`) simplify business logic
8. **Consent Business Rules**: `canReceiveReminders()` and `canReceiveMarketing()` encapsulate consent logic
9. **Timestamp Management**: Automatic `updatedAt` tracking on every modification

## Usage Notes

- This entity is framework-agnostic and can be used in any context
- Repository implementations should handle persistence concerns
- Use cases should orchestrate entity creation and updates
- Customer deletion/archival should be handled at the use case level with proper checks for linked entities (Pets, Appointments, Invoices)
- Consent preferences should be checked before sending any communications
- Domain events can be published when significant state changes occur (outside entity scope)
- Customer is distinct from User entity (Customer = client, User = staff member)

