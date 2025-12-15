# AppointmentServiceLine Domain Entity

## Entity Description

The `AppointmentServiceLine` entity represents a join entity that links an Appointment to a Service. This entity tracks which services are included in an appointment, along with quantities and optional price overrides. It enables flexible pricing where individual service prices can be overridden per appointment line, while maintaining a reference to the base service.

**Key Characteristics:**
- Pure domain entity with no framework dependencies
- Encapsulates business rules and invariants
- Represents a line item in an appointment (join entity)
- Supports price overrides for flexible pricing
- Immutable identity and foreign key references (appointmentId, serviceId)
- Tracks creation and update timestamps

## Properties

### Required Properties
- **`id`** (string, UUID): Unique identifier for the line
- **`appointmentId`** (string, UUID): Reference to the Appointment entity (invariant: must exist)
- **`serviceId`** (string, UUID): Reference to the Service entity (invariant: must exist)
- **`quantity`** (number): Quantity of the service (default 1, must be positive integer)

### Optional Properties
- **`priceOverride`** (number): Optional price override per unit (non-negative if provided)

### Metadata Properties
- **`createdAt`** (Date): Timestamp when the line was created
- **`updatedAt`** (Date): Timestamp of the last update

## Constructor Rules

### Required Parameters
1. **`id`**: Must be a non-empty string (UUID format recommended)
2. **`appointmentId`**: Must be a non-empty string - **invariant**: Line must be linked to an Appointment
3. **`serviceId`**: Must be a non-empty string - **invariant**: Line must be linked to a Service

### Optional Parameters
- **`quantity`**: Defaults to 1, must be a positive integer
- **`priceOverride`**: Optional price override (must be non-negative if provided)
- **`createdAt`**: Defaults to current date/time if not provided
- **`updatedAt`**: Defaults to current date/time if not provided

### Validation Rules
- **ID Validation**: Throws error if `id` is empty or null
- **Appointment ID Validation**: Throws error if `appointmentId` is empty or null
- **Service ID Validation**: Throws error if `serviceId` is empty or null
- **Quantity Validation**: Must be a positive integer
- **Price Override Validation**: If provided, must be non-negative

### Example Constructor Usage
```typescript
// Minimal required fields (quantity defaults to 1)
const line = new AppointmentServiceLine(
  'uuid-123',
  'appointment-uuid-456',
  'service-uuid-789'
);

// Full constructor with price override
const line = new AppointmentServiceLine(
  'uuid-123',
  'appointment-uuid-456',
  'service-uuid-789',
  2,        // quantity
  25.50,    // priceOverride
  new Date('2024-01-01'),
  new Date('2024-01-01')
);

// Constructor without price override (uses Service price)
const line = new AppointmentServiceLine(
  'uuid-123',
  'appointment-uuid-456',
  'service-uuid-789',
  3         // quantity, no price override
);
```

## Methods

### Getters (Read-Only Access)
All properties are accessed through getters that return copies to maintain encapsulation:
- `id`: Returns the line's unique identifier
- `appointmentId`: Returns the appointment ID (immutable)
- `serviceId`: Returns the service ID (immutable)
- `quantity`: Returns the quantity
- `priceOverride`: Returns the price override (or undefined)
- `createdAt`: Returns a copy of the creation timestamp
- `updatedAt`: Returns a copy of the last update timestamp

### Behavior Methods

#### Property Updates
- **`updateQuantity(quantity: number)`**: Updates the quantity (validates positive integer)
- **`updatePriceOverride(priceOverride: number | undefined)`**: Updates or removes price override (validates non-negative)
- **`removePriceOverride()`**: Removes the price override, reverting to Service price

#### Price Calculations
- **`calculateLineTotal(servicePrice: number)`**: Calculates line total (quantity * effective price)
  - Uses price_override if set, otherwise uses servicePrice
  - Returns quantity * effective price
- **`getEffectivePrice(servicePrice: number)`**: Gets the effective price per unit
  - Uses price_override if set, otherwise uses servicePrice
  - Returns the price per unit

#### Status Checks
- **`hasPriceOverride()`**: Returns true if price override is set

## Invariants

### Core Invariants (Always Enforced)
1. **Appointment Linkage**: An AppointmentServiceLine **must** be linked to an Appointment (`appointmentId` cannot be empty)
   - Enforced in constructor
   - Cannot be changed after creation (immutable property)

2. **Service Linkage**: An AppointmentServiceLine **must** be linked to a Service (`serviceId` cannot be empty)
   - Enforced in constructor
   - Cannot be changed after creation (immutable property)

3. **Quantity Requirement**: Quantity **must** be a positive integer
   - Enforced in constructor and `updateQuantity()` method

4. **Price Override Validation**: If price override is provided, it **must** be non-negative
   - Enforced in constructor and `updatePriceOverride()` method

### Business Rules
1. **Price Calculation**: Price calculation for an Appointment sums lines using `price_override` when present, otherwise Service price
   - Implemented via `calculateLineTotal()` and `getEffectivePrice()` methods
   - Use case/appointment level aggregates all line totals

2. **Price Override Priority**: Price override takes precedence over Service base price when calculating line totals
   - If `priceOverride` is set, it is used
   - If `priceOverride` is undefined, Service price is used

3. **Timestamp Tracking**: `createdAt` is immutable, `updatedAt` is updated on every modification

## Example Lifecycle

### 1. Line Creation
**Scenario**: Creating a service line for an appointment.

```
1. AppointmentServiceLine entity is instantiated:
   - id: "line-001"
   - appointmentId: "appt-001"
   - serviceId: "svc-001"
   - quantity: 1
   - priceOverride: undefined
   - createdAt: 2024-01-15T10:00:00Z
   - updatedAt: 2024-01-15T10:00:00Z

2. Entity validates:
   ✓ appointmentId is not empty
   ✓ serviceId is not empty
   ✓ quantity is positive integer
```

### 2. Quantity Update
**Scenario**: Updating the quantity of a service in an appointment.

```
1. updateQuantity(2)
   → quantity: 2
   → updatedAt: 2024-01-15T10:05:00Z

2. updateQuantity(3)
   → quantity: 3
   → updatedAt: 2024-01-15T10:10:00Z
```

### 3. Price Override
**Scenario**: Applying a price override for a discounted service.

```
1. Service base price: 30.00
2. hasPriceOverride() → false

3. updatePriceOverride(25.00)
   → priceOverride: 25.00
   → hasPriceOverride() → true
   → updatedAt: 2024-01-15T10:15:00Z

4. getEffectivePrice(30.00) → 25.00 (uses override)
5. calculateLineTotal(30.00) → 75.00 (3 * 25.00)
```

### 4. Price Calculation Without Override
**Scenario**: Calculating line total using Service base price.

```
1. priceOverride: undefined
2. Service base price: 30.00
3. quantity: 2

4. hasPriceOverride() → false
5. getEffectivePrice(30.00) → 30.00 (uses Service price)
6. calculateLineTotal(30.00) → 60.00 (2 * 30.00)
```

### 5. Removing Price Override
**Scenario**: Removing a price override to revert to Service base price.

```
1. priceOverride: 25.00
2. hasPriceOverride() → true

3. removePriceOverride()
   → priceOverride: undefined
   → hasPriceOverride() → false
   → updatedAt: 2024-01-15T10:20:00Z

4. getEffectivePrice(30.00) → 30.00 (reverted to Service price)
5. calculateLineTotal(30.00) → 90.00 (3 * 30.00)
```

### 6. Multiple Lines in Appointment
**Scenario**: An appointment with multiple service lines.

```
1. Line 1: service-001, quantity: 1, priceOverride: undefined
   → calculateLineTotal(30.00) → 30.00

2. Line 2: service-002, quantity: 2, priceOverride: 20.00
   → calculateLineTotal(25.00) → 40.00 (uses override 20.00)

3. Line 3: service-003, quantity: 1, priceOverride: undefined
   → calculateLineTotal(15.00) → 15.00

4. Total appointment price: 30.00 + 40.00 + 15.00 = 85.00
   (calculated at appointment/use case level)
```

### 7. Price Override Update
**Scenario**: Updating an existing price override.

```
1. priceOverride: 25.00
2. updatePriceOverride(22.50)
   → priceOverride: 22.50
   → updatedAt: 2024-01-15T10:25:00Z

3. calculateLineTotal(30.00) → 67.50 (3 * 22.50)
```

### 8. Error Scenarios
**Scenario**: Attempting invalid operations.

```
1. new AppointmentServiceLine("", "appt-001", "svc-001")
   → Error: "AppointmentServiceLine ID is required"

2. new AppointmentServiceLine("line-001", "", "svc-001")
   → Error: "Appointment ID is required - an AppointmentServiceLine must be linked to an Appointment"

3. new AppointmentServiceLine("line-001", "appt-001", "")
   → Error: "Service ID is required - an AppointmentServiceLine must be linked to a Service"

4. new AppointmentServiceLine("line-001", "appt-001", "svc-001", 0)
   → Error: "Quantity must be a positive integer"

5. new AppointmentServiceLine("line-001", "appt-001", "svc-001", 1, -10.00)
   → Error: "Price override cannot be negative"

6. updateQuantity(0)
   → Error: "Quantity must be a positive integer"

7. updatePriceOverride(-5.00)
   → Error: "Price override cannot be negative"

8. calculateLineTotal(-10.00)
   → Error: "Service price cannot be negative"
```

## Design Decisions

1. **Immutable Identity**: `id`, `appointmentId`, and `serviceId` are immutable to maintain referential integrity
2. **Encapsulation**: All properties are private with getters returning copies to prevent external mutation
3. **Validation at Boundaries**: All validation happens in constructor and update methods
4. **Price Override Pattern**: Price override is optional and takes precedence over Service price when calculating totals
5. **Quantity Default**: Quantity defaults to 1 for convenience
6. **Price Calculation Methods**: Methods require servicePrice parameter to avoid coupling with Service entity
7. **Effective Price Logic**: Centralized in `getEffectivePrice()` method for consistency
8. **Line Total Calculation**: `calculateLineTotal()` encapsulates quantity * effective price logic
9. **Timestamp Management**: Automatic `updatedAt` tracking on every modification

## Usage Notes

- This entity is framework-agnostic and can be used in any context
- Repository implementations should handle persistence concerns
- Price calculation requires Service entity's base price (passed as parameter to avoid coupling)
- Appointment total is calculated by summing all line totals (done at appointment/use case level)
- Price overrides enable flexible pricing (discounts, promotions, custom pricing)
- Multiple lines can exist for the same appointment (one-to-many relationship)
- Multiple lines can reference the same service (allows quantity > 1 or multiple instances)
- Domain events can be published when significant state changes occur (outside entity scope)
- This is a join entity, so it represents the relationship between Appointment and Service with additional attributes

