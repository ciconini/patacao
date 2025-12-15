# Store Domain Entity

## Entity Description

The `Store` entity represents a store location in the petshop management system. A Store belongs to a Company and can have multiple staff members assigned. This entity manages store-specific information including location, contact details, and opening hours.

**Key Characteristics:**
- Pure domain entity with no framework dependencies
- Encapsulates business rules and invariants
- Represents a physical store location
- Manages weekly opening hours schedule
- Supports timezone configuration
- Validates opening hours for staff scheduling

## Properties

### Required Properties
- **`id`** (string, UUID): Unique identifier for the store
- **`companyId`** (string, UUID): Reference to the Company entity (invariant: must exist)
- **`name`** (string): Store name (1-255 characters)
- **`openingHours`** (WeeklyOpeningHours): Weekly opening hours schedule (required)

### Optional Properties
- **`address`** (Address): Store address (structured)
- **`email`** (string): Contact email address
- **`phone`** (string): Contact phone number
- **`timezone`** (string): Timezone (default: "Europe/Lisbon")

### Metadata Properties
- **`createdAt`** (Date): Timestamp when the store was created
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

### DayOpeningHours Interface
```typescript
interface DayOpeningHours {
  isOpen: boolean;       // Required: Whether store is open on this day
  openTime?: string;     // Optional: Opening time (format: "HH:mm") - required if isOpen is true
  closeTime?: string;    // Optional: Closing time (format: "HH:mm") - required if isOpen is true
}
```

### WeeklyOpeningHours Interface
```typescript
interface WeeklyOpeningHours {
  monday?: DayOpeningHours;
  tuesday?: DayOpeningHours;
  wednesday?: DayOpeningHours;
  thursday?: DayOpeningHours;
  friday?: DayOpeningHours;
  saturday?: DayOpeningHours;
  sunday?: DayOpeningHours;
}
```

## Constructor Rules

### Required Parameters
1. **`id`**: Must be a non-empty string (UUID format recommended)
2. **`companyId`**: Must be a non-empty string - **invariant**: Store must be linked to a Company
3. **`name`**: Must be a non-empty string, 1-255 characters
4. **`openingHours`**: Must be a valid WeeklyOpeningHours object with at least one open day

### Optional Parameters
- All other properties are optional and can be set later via behavior methods
- **`timezone`**: Defaults to "Europe/Lisbon"

### Validation Rules
- **ID Validation**: Throws error if `id` is empty or null
- **Company ID Validation**: Throws error if `companyId` is empty or null
- **Name Validation**: Throws error if `name` is empty, null, or exceeds 255 characters
- **Opening Hours Validation**: 
  - Must have at least one day with `isOpen: true`
  - If `isOpen` is true, both `openTime` and `closeTime` must be provided
  - Time format must be "HH:mm" (24-hour format)
  - Close time must be after open time
  - If `isOpen` is false, times should not be set
- **Address Validation**: If provided, must have:
  - Non-empty street
  - Non-empty city
  - Valid Portuguese postal code format (XXXX-XXX)
- **Email Validation**: If provided, must be valid email format and max 255 characters

### Example Constructor Usage
```typescript
// Minimal required fields
const store = new Store(
  'uuid-123',
  'company-uuid-456',
  'Lisboa Store',
  {
    monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    saturday: { isOpen: true, openTime: '09:00', closeTime: '13:00' },
    sunday: { isOpen: false }
  }
);

// Full constructor
const store = new Store(
  'uuid-123',
  'company-uuid-456',
  'Lisboa Store',
  {
    monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
    saturday: { isOpen: true, openTime: '09:00', closeTime: '13:00' },
    sunday: { isOpen: false }
  },
  {
    street: 'Rua das Flores, 123',
    city: 'Lisboa',
    postalCode: '1000-001',
    country: 'Portugal'
  },
  'lisboa@patacao.pt',
  '+351213456789',
  'Europe/Lisbon',
  new Date('2024-01-15'),
  new Date('2024-01-15')
);
```

## Methods

### Getters (Read-Only Access)
All properties are accessed through getters that return copies to maintain encapsulation.

### Behavior Methods

#### Property Updates
- **`updateName(name: string)`**: Updates store name (validates non-empty, max 255 chars)
- **`updateAddress(address: Address | undefined)`**: Updates address (validates structure)
- **`updateEmail(email: string | undefined)`**: Updates email (validates format)
- **`updatePhone(phone: string | undefined)`**: Updates phone number
- **`updateTimezone(timezone: string)`**: Updates timezone

#### Opening Hours Management
- **`updateOpeningHours(openingHours: WeeklyOpeningHours)`**: Updates entire opening hours schedule (validates)
- **`updateDayOpeningHours(dayOfWeek, hours)`**: Updates opening hours for a specific day
- **`getDayOpeningHours(dayOfWeek)`**: Gets opening hours for a specific day

#### Opening Hours Checks
- **`isOpenOnDay(dayOfWeek)`**: Checks if store is open on a specific day
- **`isOpenAtTime(dayOfWeek, time)`**: Checks if store is open at a specific time on a specific day
- **`isTimeRangeWithinOpeningHours(dayOfWeek, startTime, endTime)`**: Checks if a time range falls within opening hours

#### Status Checks
- **`hasCompleteAddress()`**: Checks if store has complete address information

## Invariants

### Core Invariants (Always Enforced)
1. **Company Linkage**: A Store **must** be linked to a Company (`companyId` cannot be empty)
   - Enforced in constructor
   - Cannot be changed after creation (immutable property)

2. **Name Requirement**: Store name **must** be non-empty and 1-255 characters
   - Enforced in constructor and `updateName()` method

3. **Opening Hours Requirement**: Store **must** have at least one day with opening hours
   - Enforced in constructor and `updateOpeningHours()` method

4. **Opening Hours Format**: For open days:
   - Both `openTime` and `closeTime` must be provided
   - Time format must be "HH:mm" (24-hour format)
   - Close time must be after open time
   - For closed days, times should not be set

5. **Address Structure**: If address is provided, it **must** have:
   - Non-empty street
   - Non-empty city
   - Valid Portuguese postal code format (XXXX-XXX)

### Business Rules
1. **Staff Scheduling**: Staff schedules cannot place staff outside `openingHours` for that Store (enforced at use case/domain service level)
2. **Invoice Settings**: Invoice numbering and fiscal settings can be store-scoped if configured; otherwise inherit Company defaults (enforced at use case level)
3. **Timezone**: Default timezone is Europe/Lisbon for Portuguese stores
4. **Opening Hours Validation**: All time validations ensure appointments and staff schedules respect store hours

## Example Lifecycle

### 1. Store Creation
**Scenario**: A new store location is added to the company.

```
1. Store entity is instantiated:
   - id: "store-001"
   - companyId: "comp-001"
   - name: "Lisboa Store"
   - openingHours: { monday: { isOpen: true, openTime: "09:00", closeTime: "18:00" }, ... }
   - timezone: "Europe/Lisbon"
   - createdAt: 2024-01-15T10:00:00Z
   - updatedAt: 2024-01-15T10:00:00Z

2. Entity validates:
   ✓ companyId is not empty
   ✓ name is not empty
   ✓ openingHours has at least one open day
   ✓ all open days have valid time ranges
```

### 2. Adding Contact Information
**Scenario**: Store contact details are added.

```
1. updateAddress({
     street: "Rua das Flores, 123",
     city: "Lisboa",
     postalCode: "1000-001"
   })
   → Validates address structure
   → updatedAt: 2024-01-15T10:30:00Z

2. updateEmail("lisboa@patacao.pt")
   → Validates email format
   → updatedAt: 2024-01-15T10:35:00Z

3. updatePhone("+351213456789")
   → updatedAt: 2024-01-15T10:40:00Z
```

### 3. Opening Hours Management
**Scenario**: Store opening hours are configured for the week.

```
1. updateOpeningHours({
     monday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
     tuesday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
     wednesday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
     thursday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
     friday: { isOpen: true, openTime: "09:00", closeTime: "18:00" },
     saturday: { isOpen: true, openTime: "09:00", closeTime: "13:00" },
     sunday: { isOpen: false }
   })
   → Validates at least one open day
   → Validates all time formats
   → Validates close time after open time
   → updatedAt: 2024-01-15T11:00:00Z
```

### 4. Updating Single Day Hours
**Scenario**: Store changes Saturday hours.

```
1. updateDayOpeningHours("saturday", {
     isOpen: true,
     openTime: "10:00",
     closeTime: "14:00"
   })
   → Validates day hours
   → Validates overall schedule still has open days
   → updatedAt: 2024-01-20T09:00:00Z
```

### 5. Checking Opening Status
**Scenario**: System checks if store is open for appointment booking.

```
1. isOpenOnDay("monday") → true
2. isOpenOnDay("sunday") → false

3. isOpenAtTime("monday", "10:00") → true
4. isOpenAtTime("monday", "08:00") → false (before opening)
5. isOpenAtTime("monday", "19:00") → false (after closing)

6. isTimeRangeWithinOpeningHours("monday", "10:00", "11:00") → true
7. isTimeRangeWithinOpeningHours("monday", "08:00", "09:00") → false
8. isTimeRangeWithinOpeningHours("monday", "17:00", "19:00") → false
```

### 6. Timezone Update
**Scenario**: Store moves to a different timezone (unlikely but possible).

```
1. updateTimezone("Europe/Madrid")
   → timezone: "Europe/Madrid"
   → updatedAt: 2024-06-01T10:00:00Z
```

### 7. Error Scenarios
**Scenario**: Attempting invalid operations.

```
1. new Store("", "comp-001", "Lisboa Store", openingHours)
   → Error: "Store ID is required"

2. new Store("store-001", "", "Lisboa Store", openingHours)
   → Error: "Company ID is required - a Store must be linked to a Company"

3. new Store("store-001", "comp-001", "", openingHours)
   → Error: "Store name is required"

4. new Store("store-001", "comp-001", "Lisboa Store", {})
   → Error: "Store must have at least one day with opening hours"

5. updateDayOpeningHours("monday", {
     isOpen: true,
     openTime: "18:00",
     closeTime: "09:00"
   })
   → Error: "Close time must be after open time"

6. updateDayOpeningHours("monday", {
     isOpen: true,
     openTime: "09:00"
     // missing closeTime
   })
   → Error: "Open days must have both openTime and closeTime"

7. updateDayOpeningHours("monday", {
     isOpen: false,
     openTime: "09:00",
     closeTime: "18:00"
   })
   → Error: "Closed days should not have openTime or closeTime"
```

## Design Decisions

1. **Immutable Identity**: `id` and `companyId` are immutable to maintain referential integrity
2. **Encapsulation**: All properties are private with getters returning copies to prevent external mutation
3. **Validation at Boundaries**: All validation happens in constructor and update methods
4. **Opening Hours Structure**: Flexible weekly schedule supporting different hours per day
5. **Timezone Support**: Stores can have different timezones (defaults to Europe/Lisbon)
6. **Time Validation**: Comprehensive time range validation for appointment and staff scheduling
7. **Address Structure**: Structured address with Portuguese postal code format validation
8. **Opening Hours Checks**: Methods to check if store is open at specific times for appointment validation
9. **Timestamp Management**: Automatic `updatedAt` tracking on every modification

## Usage Notes

- This entity is framework-agnostic and can be used in any context
- Repository implementations should handle persistence concerns
- Staff scheduling validation should use `isTimeRangeWithinOpeningHours()` to ensure staff hours don't exceed store hours
- Appointment booking should validate against opening hours using `isOpenAtTime()` or `isTimeRangeWithinOpeningHours()`
- Invoice numbering and fiscal settings inheritance from Company is handled at use case level
- Opening hours are validated to ensure at least one day is open
- Time format validation ensures consistent 24-hour format (HH:mm)
- Domain events can be published when significant state changes occur (outside entity scope)

