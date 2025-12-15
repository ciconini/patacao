# Service Domain Entity

## Entity Description

The `Service` entity represents a service offered by the petshop (e.g., grooming, vaccination, consultation). This entity defines the service catalog with pricing, duration, resource requirements, and inventory consumption rules.

**Key Characteristics:**
- Pure domain entity with no framework dependencies
- Encapsulates business rules and invariants
- Represents service catalog items
- Tracks inventory consumption requirements
- Supports resource requirements and categorization via tags
- Validates pricing and duration constraints

## Properties

### Required Properties
- **`id`** (string, UUID): Unique identifier for the service
- **`name`** (string): Service name (1-255 characters)
- **`durationMinutes`** (number): Service duration in minutes (must be positive integer)
- **`price`** (number): Service price (must be non-negative)

### Optional Properties
- **`description`** (string): Service description
- **`requiredResources`** (string[]): List of required resource identifiers
- **`consumesInventory`** (boolean): Whether service consumes inventory items (default false)
- **`consumedItems`** (ConsumedItem[]): List of products and quantities consumed by this service
- **`tags`** (string[]): Service tags for categorization

### Metadata Properties
- **`createdAt`** (Date): Timestamp when the service was created
- **`updatedAt`** (Date): Timestamp of the last update

### ConsumedItem Interface
```typescript
interface ConsumedItem {
  productId: string;    // Required: Product ID
  quantity: number;     // Required: Quantity consumed (positive integer)
}
```

## Constructor Rules

### Required Parameters
1. **`id`**: Must be a non-empty string (UUID format recommended)
2. **`name`**: Must be a non-empty string, 1-255 characters
3. **`durationMinutes`**: Must be a positive integer
4. **`price`**: Must be a non-negative number

### Optional Parameters
- All other properties are optional and can be set later via behavior methods
- **`consumesInventory`**: Defaults to false
- **`requiredResources`**: Defaults to empty array
- **`consumedItems`**: Defaults to empty array
- **`tags`**: Defaults to empty array

### Validation Rules
- **ID Validation**: Throws error if `id` is empty or null
- **Name Validation**: Throws error if `name` is empty, null, or exceeds 255 characters
- **Duration Validation**: Throws error if `durationMinutes` is not a positive integer
- **Price Validation**: Throws error if `price` is negative
- **Required Resources Validation**: If provided, resource IDs must be non-empty strings (enforced in constructor and `setRequiredResources()`)
- **Tags Validation**: If provided, tags must be non-empty strings (enforced in constructor and `setTags()`)
- **Inventory Consumption**: If `consumesInventory` is true, `consumedItems` must have at least one item
- **Consumed Items Validation**: 
  - Product IDs cannot be empty
  - Quantities must be positive integers
  - No duplicate product IDs allowed

### Example Constructor Usage
```typescript
// Minimal required fields
const service = new Service(
  'uuid-123',
  'Basic Grooming',
  60,
  25.00
);

// Full constructor with inventory consumption
const service = new Service(
  'uuid-123',
  'Full Grooming Package',
  120,
  50.00,
  'Complete grooming service including bath, haircut, and nail trimming',
  ['grooming-station-1', 'dryer'],
  true,
  [
    { productId: 'shampoo-001', quantity: 1 },
    { productId: 'conditioner-001', quantity: 1 }
  ],
  ['grooming', 'premium'],
  new Date('2024-01-15'),
  new Date('2024-01-15')
);
```

## Methods

### Getters (Read-Only Access)
All properties are accessed through getters that return copies to maintain encapsulation.

### Behavior Methods

#### Property Updates
- **`updateName(name: string)`**: Updates service name (validates non-empty, max 255 chars)
- **`updateDescription(description: string | undefined)`**: Updates service description
- **`updateDuration(durationMinutes: number)`**: Updates duration (validates positive integer)
- **`updatePrice(price: number)`**: Updates price (validates non-negative)

#### Resource Management
- **`addRequiredResource(resourceId: string)`**: Adds a required resource
- **`removeRequiredResource(resourceId: string)`**: Removes a required resource
- **`setRequiredResources(resources: string[])`**: Sets all required resources (validates resource IDs are not empty)
- **`requiresResource(resourceId: string)`**: Checks if service requires a specific resource

#### Inventory Consumption Management
- **`enableInventoryConsumption(consumedItems: ConsumedItem[])`**: Enables inventory consumption with items
- **`disableInventoryConsumption()`**: Disables inventory consumption and clears consumed items
- **`addConsumedItem(productId: string, quantity: number)`**: Adds or updates a consumed item
- **`removeConsumedItem(productId: string)`**: Removes a consumed item
- **`updateConsumedItemQuantity(productId: string, quantity: number)`**: Updates quantity for a consumed item
- **`getConsumedQuantity(productId: string)`**: Gets consumed quantity for a specific product
- **`consumesInventoryItems()`**: Checks if service consumes inventory
- **`getConsumedProductsCount()`**: Gets number of unique products consumed

#### Tag Management
- **`addTag(tag: string)`**: Adds a tag to the service
- **`removeTag(tag: string)`**: Removes a tag from the service
- **`setTags(tags: string[])`**: Sets all tags (validates tags are not empty)
- **`hasTag(tag: string)`**: Checks if service has a specific tag

#### Calculations
- **`getDurationHours()`**: Returns duration in hours (decimal)

## Invariants

### Core Invariants (Always Enforced)
1. **Name Requirement**: Service name **must** be non-empty and 1-255 characters
   - Enforced in constructor and `updateName()` method

2. **Duration Requirement**: Duration **must** be a positive integer (in minutes)
   - Enforced in constructor and `updateDuration()` method

3. **Price Requirement**: Price **must** be non-negative
   - Enforced in constructor and `updatePrice()` method

4. **Inventory Consumption**: If `consumesInventory` is true, **must** have at least one consumed item
   - Enforced in constructor and `enableInventoryConsumption()` method
   - Automatically disabled if all consumed items are removed

5. **Consumed Items Validity**: Consumed items **must** have:
   - Non-empty product IDs
   - Positive integer quantities
   - No duplicate product IDs

### Business Rules
1. **Inventory Reservation**: If `consumesInventory` is true, inventory reservation and decrement rules apply (reserve at confirmation, decrement at sale completion) - enforced at use case level
2. **Staff Skills Matching**: Service's duration and assigned staff skills must match when auto-assigning staff - enforced at use case/domain service level
3. **Resource Requirements**: Required resources are tracked for scheduling and availability checks
4. **Tag Categorization**: Tags enable service filtering and categorization

## Example Lifecycle

### 1. Service Creation
**Scenario**: A new grooming service is added to the catalog.

```
1. Service entity is instantiated:
   - id: "service-001"
   - name: "Basic Grooming"
   - durationMinutes: 60
   - price: 25.00
   - consumesInventory: false
   - createdAt: 2024-01-15T10:00:00Z
   - updatedAt: 2024-01-15T10:00:00Z

2. Entity validates:
   ✓ id is not empty
   ✓ name is not empty
   ✓ durationMinutes is positive
   ✓ price is non-negative
```

### 2. Adding Description and Resources
**Scenario**: Service details are added.

```
1. updateDescription("Basic grooming service including bath and brush")
   → updatedAt: 2024-01-15T10:30:00Z

2. addRequiredResource("grooming-station-1")
   → requiredResources: ["grooming-station-1"]
   → updatedAt: 2024-01-15T10:35:00Z

3. requiresResource("grooming-station-1") → true
```

### 3. Enabling Inventory Consumption
**Scenario**: Service is updated to consume inventory items.

```
1. enableInventoryConsumption([
     { productId: "shampoo-001", quantity: 1 },
     { productId: "conditioner-001", quantity: 1 }
   ])
   → consumesInventory: true
   → consumedItems: [{ productId: "shampoo-001", quantity: 1 }, ...]
   → updatedAt: 2024-01-15T11:00:00Z

2. consumesInventoryItems() → true
3. getConsumedProductsCount() → 2
```

### 4. Updating Consumed Items
**Scenario**: Service consumption requirements change.

```
1. addConsumedItem("towel-001", 2)
   → consumedItems: [..., { productId: "towel-001", quantity: 2 }]
   → updatedAt: 2024-01-15T11:30:00Z

2. updateConsumedItemQuantity("shampoo-001", 2)
   → consumedItems: [{ productId: "shampoo-001", quantity: 2 }, ...]
   → updatedAt: 2024-01-15T11:35:00Z

3. getConsumedQuantity("shampoo-001") → 2
```

### 5. Tag Management
**Scenario**: Service is categorized with tags.

```
1. addTag("grooming")
   → tags: ["grooming"]
   → updatedAt: 2024-01-15T12:00:00Z

2. addTag("premium")
   → tags: ["grooming", "premium"]
   → updatedAt: 2024-01-15T12:05:00Z

3. hasTag("grooming") → true
```

### 6. Price and Duration Updates
**Scenario**: Service pricing and duration are adjusted.

```
1. updatePrice(30.00)
   → price: 30.00
   → updatedAt: 2024-01-20T09:00:00Z

2. updateDuration(90)
   → durationMinutes: 90
   → getDurationHours() → 1.5
   → updatedAt: 2024-01-20T09:05:00Z
```

### 7. Disabling Inventory Consumption
**Scenario**: Service no longer requires inventory items.

```
1. disableInventoryConsumption()
   → consumesInventory: false
   → consumedItems: []
   → updatedAt: 2024-01-25T10:00:00Z

2. consumesInventoryItems() → false
```

### 8. Removing Consumed Items
**Scenario**: A consumed item is removed from the service.

```
1. removeConsumedItem("towel-001")
   → consumedItems: [{ productId: "shampoo-001", quantity: 2 }, ...]
   → updatedAt: 2024-01-25T11:00:00Z

2. If last item removed:
   removeConsumedItem("shampoo-001")
   removeConsumedItem("conditioner-001")
   → consumesInventory: false (automatically disabled)
   → consumedItems: []
   → updatedAt: 2024-01-25T11:30:00Z
```

### 9. Error Scenarios
**Scenario**: Attempting invalid operations.

```
1. new Service("", "Basic Grooming", 60, 25.00)
   → Error: "Service ID is required"

2. new Service("service-001", "", 60, 25.00)
   → Error: "Service name is required"

3. new Service("service-001", "Basic Grooming", 0, 25.00)
   → Error: "Service duration must be a positive integer (in minutes)"

4. new Service("service-001", "Basic Grooming", 60, -10.00)
   → Error: "Service price cannot be negative"

5. new Service("service-001", "Basic Grooming", 60, 25.00, undefined, [], true, [])
   → Error: "Service that consumes inventory must have at least one consumed item"

6. enableInventoryConsumption([
     { productId: "shampoo-001", quantity: 1 },
     { productId: "shampoo-001", quantity: 2 }
   ])
   → Error: "Consumed items cannot have duplicate product IDs"

7. addConsumedItem("", 1)
   → Error: "Product ID cannot be empty"

8. addConsumedItem("product-001", 0)
   → Error: "Consumed item quantity must be positive"
```

## Design Decisions

1. **Immutable Identity**: `id` is immutable to maintain referential integrity
2. **Encapsulation**: All properties are private with getters returning copies to prevent external mutation
3. **Validation at Boundaries**: All validation happens in constructor and update methods
4. **Inventory Consumption**: Automatic enabling/disabling based on consumed items presence
5. **Consumed Items Management**: Supports adding, updating, and removing consumed items with quantity tracking
6. **Resource Requirements**: Flexible list of resource identifiers for scheduling
7. **Tag System**: Simple tag-based categorization for filtering and organization
8. **Duration Calculation**: Duration in hours is calculated, not stored
9. **Price Validation**: Non-negative constraint ensures valid pricing
10. **Timestamp Management**: Automatic `updatedAt` tracking on every modification

## Usage Notes

- This entity is framework-agnostic and can be used in any context
- Repository implementations should handle persistence concerns
- Inventory reservation and decrement rules are enforced at use case level when `consumesInventory` is true
- Staff skills matching for auto-assignment is handled at use case/domain service level
- Consumed items are validated to ensure no duplicates and valid quantities
- Service duration is used for appointment scheduling and staff assignment
- Tags enable service filtering and categorization in the catalog
- Domain events can be published when significant state changes occur (outside entity scope)

