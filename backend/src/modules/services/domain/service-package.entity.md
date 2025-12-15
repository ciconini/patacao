# ServicePackage Domain Entity

## Entity Description

The `ServicePackage` entity represents a package/bundle of services offered by the petshop. Service packages allow grouping multiple services together, often with a bundle price that may be lower than the sum of individual service prices. When a package is booked, it creates separate AppointmentServiceLine entries for each included Service, allowing for individual tracking and pricing flexibility.

**Key Characteristics:**
- Pure domain entity with no framework dependencies
- Encapsulates business rules and invariants
- Represents a bundle of services with optional bundle pricing
- Maintains ordered list of services with quantities
- Immutable identity (ID cannot be changed)
- Tracks creation and update timestamps

## Properties

### Required Properties
- **`id`** (string, UUID): Unique identifier for the package
- **`name`** (string): Package name (1-255 characters)
- **`services`** (ServicePackageItem[]): Ordered list of services with quantities (must have at least one)

### Optional Properties
- **`description`** (string): Package description
- **`bundlePrice`** (number): Bundle price (non-negative if provided)

### Metadata Properties
- **`createdAt`** (Date): Timestamp when the package was created
- **`updatedAt`** (Date): Timestamp of the last update

### ServicePackageItem Interface
```typescript
interface ServicePackageItem {
  serviceId: string;    // Required: Service ID reference
  quantity: number;     // Required: Quantity of the service (positive integer)
}
```

## Constructor Rules

### Required Parameters
1. **`id`**: Must be a non-empty string (UUID format recommended)
2. **`name`**: Must be a non-empty string, 1-255 characters
3. **`services`**: Must be a non-empty array of ServicePackageItem objects

### Optional Parameters
- **`description`**: Optional package description
- **`bundlePrice`**: Optional bundle price (must be non-negative if provided)
- **`createdAt`**: Defaults to current date/time if not provided
- **`updatedAt`**: Defaults to current date/time if not provided

### Validation Rules
- **ID Validation**: Throws error if `id` is empty or null
- **Name Validation**: Throws error if `name` is empty, null, or exceeds 255 characters
- **Services Validation**: 
  - Must have at least one service
  - Service IDs cannot be empty
  - Quantities must be positive integers
  - No duplicate service IDs allowed
- **Bundle Price Validation**: If provided, must be non-negative

### Example Constructor Usage
```typescript
// Minimal required fields
const package = new ServicePackage(
  'uuid-123',
  'Complete Grooming Package',
  [
    { serviceId: 'service-001', quantity: 1 },
    { serviceId: 'service-002', quantity: 1 }
  ]
);

// Full constructor with bundle price
const package = new ServicePackage(
  'uuid-123',
  'Complete Grooming Package',
  [
    { serviceId: 'service-001', quantity: 1 },
    { serviceId: 'service-002', quantity: 2 },
    { serviceId: 'service-003', quantity: 1 }
  ],
  'Full grooming service including bath, haircut, and nail trimming',
  75.00,  // bundlePrice
  new Date('2024-01-01'),
  new Date('2024-01-01')
);
```

## Methods

### Getters (Read-Only Access)
All properties are accessed through getters that return copies to maintain encapsulation:
- `id`: Returns the package's unique identifier
- `name`: Returns the package name
- `description`: Returns the description (or undefined)
- `services`: Returns a copy of the services array with new object instances
- `bundlePrice`: Returns the bundle price (or undefined)
- `createdAt`: Returns a copy of the creation timestamp
- `updatedAt`: Returns a copy of the last update timestamp

### Behavior Methods

#### Property Updates
- **`updateName(name: string)`**: Updates the package name (validates non-empty, max 255 chars)
- **`updateDescription(description: string | undefined)`**: Updates the description
- **`updateBundlePrice(bundlePrice: number | undefined)`**: Updates the bundle price (validates non-negative)

#### Service Management
- **`addService(serviceId: string, quantity?: number)`**: Adds a service to the package or updates quantity if already exists
- **`removeService(serviceId: string)`**: Removes a service from the package (cannot remove last service)
- **`updateServiceQuantity(serviceId: string, quantity: number)`**: Updates quantity for a specific service
- **`setServices(services: ServicePackageItem[])`**: Replaces all services in the package
- **`getServiceQuantity(serviceId: string)`**: Gets quantity for a specific service
- **`containsService(serviceId: string)`**: Checks if package contains a specific service

#### Calculations and Queries
- **`getServiceCount()`**: Returns the number of unique services in the package
- **`getTotalServiceQuantity()`**: Returns the sum of all service quantities
- **`hasBundlePrice()`**: Returns true if bundle price is set

## Invariants

### Core Invariants (Always Enforced)
1. **Name Requirement**: Package name **must** be non-empty and between 1-255 characters
   - Enforced in constructor and `updateName()` method

2. **Services Requirement**: Package **must** have at least one service
   - Enforced in constructor and `setServices()` method
   - Cannot remove the last service (enforced in `removeService()`)

3. **Service Validation**: Each service in the package must have:
   - Non-empty service ID
   - Positive integer quantity
   - No duplicate service IDs in the package

4. **Bundle Price Validation**: If bundle price is provided, it **must** be non-negative
   - Enforced in constructor and `updateBundlePrice()` method

### Business Rules
1. **Package Booking**: Packages create separate AppointmentServiceLine entries for each included Service when booked
   - This is enforced at the use case/appointment level, not in the entity
   - Entity provides the services list for use case to process

2. **Order Preservation**: Services list maintains order (important for appointment scheduling sequence)
   - Services are stored in the order they are added
   - Order can be changed by using `setServices()` with a new order

3. **Quantity Management**: Adding a service that already exists increases its quantity
   - `addService()` automatically handles quantity accumulation

4. **Timestamp Tracking**: `createdAt` is immutable, `updatedAt` is updated on every modification

## Example Lifecycle

### 1. Package Creation
**Scenario**: Creating a new grooming package with multiple services.

```
1. ServicePackage entity is instantiated:
   - id: "pkg-001"
   - name: "Complete Grooming Package"
   - services: [
       { serviceId: "groom-001", quantity: 1 },
       { serviceId: "bath-001", quantity: 1 },
       { serviceId: "nail-001", quantity: 1 }
     ]
   - bundlePrice: 75.00
   - description: "Full grooming service"
   - createdAt: 2024-01-15T10:00:00Z
   - updatedAt: 2024-01-15T10:00:00Z

2. Entity validates:
   ✓ id is not empty
   ✓ name is not empty
   ✓ services list has at least one service
   ✓ all service IDs are non-empty
   ✓ all quantities are positive integers
   ✓ no duplicate service IDs
   ✓ bundlePrice is non-negative
```

### 2. Adding Services
**Scenario**: Adding an additional service to an existing package.

```
1. addService("trim-001", 1)
   → Service added to package
   → services.length: 4
   → updatedAt: 2024-01-15T10:05:00Z

2. getServiceCount() → 4
3. getTotalServiceQuantity() → 4
```

### 3. Updating Service Quantity
**Scenario**: Increasing quantity of a service in the package.

```
1. getServiceQuantity("bath-001") → 1
2. updateServiceQuantity("bath-001", 2)
   → Quantity updated to 2
   → updatedAt: 2024-01-15T10:10:00Z

3. getServiceQuantity("bath-001") → 2
4. getTotalServiceQuantity() → 5
```

### 4. Adding Existing Service
**Scenario**: Adding a service that already exists in the package (quantity accumulation).

```
1. containsService("groom-001") → true
2. getServiceQuantity("groom-001") → 1

3. addService("groom-001", 1)
   → Quantity accumulated: 1 + 1 = 2
   → updatedAt: 2024-01-15T10:15:00Z

4. getServiceQuantity("groom-001") → 2
```

### 5. Removing Services
**Scenario**: Removing a service from the package.

```
1. getServiceCount() → 4
2. removeService("nail-001")
   → Service removed
   → services.length: 3
   → updatedAt: 2024-01-15T10:20:00Z

3. containsService("nail-001") → false
4. getServiceCount() → 3
```

### 6. Bundle Price Management
**Scenario**: Updating the bundle price.

```
1. hasBundlePrice() → true
2. bundlePrice → 75.00

3. updateBundlePrice(80.00)
   → bundlePrice: 80.00
   → updatedAt: 2024-01-15T10:25:00Z

4. updateBundlePrice(undefined)
   → bundlePrice: undefined
   → hasBundlePrice() → false
   → updatedAt: 2024-01-15T10:26:00Z
```

### 7. Package Information Queries
**Scenario**: Querying package information for display or calculation.

```
1. getServiceCount() → 3
   → Number of unique services

2. getTotalServiceQuantity() → 4
   → Sum of all quantities (1 + 2 + 1)

3. containsService("groom-001") → true
4. getServiceQuantity("groom-001") → 2

5. hasBundlePrice() → true
6. bundlePrice → 80.00
```

### 8. Replacing All Services
**Scenario**: Completely replacing the services in a package.

```
1. setServices([
     { serviceId: "new-service-001", quantity: 1 },
     { serviceId: "new-service-002", quantity: 2 }
   ])
   → Validates new services list
   → Replaces all existing services
   → updatedAt: 2024-01-15T10:30:00Z

2. getServiceCount() → 2
3. containsService("groom-001") → false
```

### 9. Error Scenarios
**Scenario**: Attempting invalid operations.

```
1. new ServicePackage("", "Package Name", [{ serviceId: "svc-001", quantity: 1 }])
   → Error: "ServicePackage ID is required"

2. new ServicePackage("pkg-001", "", [{ serviceId: "svc-001", quantity: 1 }])
   → Error: "ServicePackage name is required"

3. new ServicePackage("pkg-001", "Package Name", [])
   → Error: "ServicePackage must have at least one service"

4. new ServicePackage("pkg-001", "Package Name", [
     { serviceId: "", quantity: 1 }
   ])
   → Error: "Service ID cannot be empty"

5. new ServicePackage("pkg-001", "Package Name", [
     { serviceId: "svc-001", quantity: 0 }
   ])
   → Error: "Service quantity must be a positive integer"

6. new ServicePackage("pkg-001", "Package Name", [
     { serviceId: "svc-001", quantity: 1 },
     { serviceId: "svc-001", quantity: 1 }
   ])
   → Error: "ServicePackage cannot have duplicate service IDs"

7. new ServicePackage("pkg-001", "Package Name", 
     [{ serviceId: "svc-001", quantity: 1 }],
     undefined,
     -10.00)
   → Error: "Bundle price cannot be negative"

8. removeService("non-existent-service")
   → Error: "Service with ID non-existent-service not found in package"

9. removeService("last-service") // when only one service remains
   → Error: "Cannot remove the last service from package - package must have at least one service"
```

## Design Decisions

1. **Immutable Identity**: `id` is immutable to maintain referential integrity
2. **Encapsulation**: All properties are private with getters returning copies to prevent external mutation
3. **Validation at Boundaries**: All validation happens in constructor and update methods
4. **Order Preservation**: Services list maintains order for appointment scheduling sequence
5. **Quantity Accumulation**: Adding an existing service increases its quantity (convenience feature)
6. **Minimum Service Requirement**: Package must always have at least one service (business rule)
7. **Bundle Price Optionality**: Bundle price is optional to allow flexible pricing strategies
8. **Duplicate Prevention**: Service IDs must be unique within a package
9. **Timestamp Management**: Automatic `updatedAt` tracking on every modification

## Usage Notes

- This entity is framework-agnostic and can be used in any context
- Repository implementations should handle persistence concerns
- Use cases should orchestrate entity creation and updates
- When booking a package, use cases should create separate AppointmentServiceLine entries for each service
- Bundle price is optional - pricing can be calculated from individual service prices if not set
- Service order in the package may be important for appointment scheduling sequence
- Domain events can be published when significant state changes occur (outside entity scope)
- Package services are references (service IDs), not embedded Service entities (maintains separation of concerns)

