# Use Case UC-SVC-001: Create Service

## 1. Objective

Create a new service in the service catalog with name, description, duration, price, inventory consumption settings, and optional tags. Services represent sellable offerings like grooming, veterinary consultations, or other pet care services.

## 2. Actors and Permissions

**Primary Actor:** Manager, Owner

**Secondary Actors:** None

**Required Permissions:**
- Role: `Manager` or `Owner`
- Permission: `services:create`

**Authorization Rules:**
- Only `Manager` or `Owner` can create services
- `Staff` and `Veterinarian` roles cannot create services
- System must validate role before allowing service creation

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Manager` or `Owner` role assigned
3. Products referenced in `consumed_items` exist if provided
4. System has available storage capacity for new records

## 4. Postconditions

1. A new `Service` entity is created with a unique UUID `id`
2. Service record is persisted in the `services` table
3. `created_at` timestamp is set to current server time
4. `updated_at` is initially set to `created_at`
5. Audit log entry is created recording the creation action
6. Service is ready to be used in appointments and service packages

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `name` | String | Yes | Max 255 chars, non-empty | Service name |
| `description` | String | No | Max 2000 chars | Service description |
| `duration_minutes` | Integer | Yes | > 0 | Service duration in minutes |
| `price` | Decimal | Yes | >= 0 | Service price |
| `consumes_inventory` | Boolean | Yes | true/false | Whether service consumes inventory items |
| `consumed_items` | Array[Object] | No | Required if consumes_inventory=true | List of products consumed during service |
| `required_resources` | Array[String] | No | Max 50 items | List of resource identifiers (e.g., "grooming_station", "exam_room") |
| `tags` | Array[String] | No | Max 20 items | Service tags for categorization |

**Consumed Items Structure (if consumes_inventory=true):**
```json
[
  {
    "product_id": "UUID",
    "quantity": 2
  }
]
```

**Consumed Item Fields:**
- `product_id` (UUID, required): Product identifier (must exist)
- `quantity` (Integer, required): Quantity consumed (min 1)

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier for the created service |
| `name` | String | Service name |
| `description` | String | Service description (nullable) |
| `duration_minutes` | Integer | Service duration in minutes |
| `price` | Decimal | Service price |
| `consumes_inventory` | Boolean | Inventory consumption flag |
| `consumed_items` | Array[Object] | Consumed products (nullable) |
| `required_resources` | Array[String] | Required resources (nullable) |
| `tags` | Array[String] | Service tags (nullable) |
| `created_at` | DateTime | Creation timestamp (ISO 8601) |
| `updated_at` | DateTime | Last update timestamp (ISO 8601) |

## 7. Main Flow

1. System receives request to create service with input data
2. System validates user authentication and role (`Manager` or `Owner`)
3. System validates required fields are present (`name`, `duration_minutes`, `price`, `consumes_inventory`)
4. System validates `name` is non-empty and not whitespace-only
5. System validates `duration_minutes` > 0
6. System validates `price` >= 0
7. System validates `consumes_inventory` is boolean
8. If `consumes_inventory` is true:
   - System validates `consumed_items` array is provided and non-empty
   - For each consumed item:
     - System validates `product_id` exists
     - System validates `quantity` > 0
9. System validates `required_resources` array length if provided (max 50 items)
10. System validates `tags` array length if provided (max 20 items)
11. System generates UUID for `id`
12. System sets `created_at` and `updated_at` to current timestamp
13. System persists service record to `services` table
14. System creates audit log entry with action `create`, entity_type `Service`, entity_id, and performed_by
15. System returns created service object with all fields

## 8. Alternative Flows

### 8.1. Missing Required Field
- **Trigger:** Step 3 detects missing required field
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Required field [field_name] is missing"
  - Use case terminates

### 8.2. Invalid Name Format
- **Trigger:** Step 4 detects invalid name (empty or whitespace-only)
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Service name cannot be empty"
  - Use case terminates

### 8.3. Invalid Duration
- **Trigger:** Step 5 detects `duration_minutes` <= 0
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Duration must be greater than 0"
  - Use case terminates

### 8.4. Invalid Price
- **Trigger:** Step 6 detects `price` < 0
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Price must be >= 0"
  - Use case terminates

### 8.5. Missing Consumed Items
- **Trigger:** Step 8 detects `consumes_inventory=true` but `consumed_items` not provided or empty
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Consumed items are required when consumes_inventory is true"
  - Use case terminates

### 8.6. Product Not Found
- **Trigger:** Step 8 detects product does not exist
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Product with ID [id] not found"
  - Use case terminates

### 8.7. Invalid Consumed Item Quantity
- **Trigger:** Step 8 detects `quantity` <= 0
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Consumed item quantity must be greater than 0"
  - Use case terminates

### 8.8. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Manager or Owner role can create services"
  - Use case terminates

## 9. Business Rules

**BR1:** Service name is required and should be descriptive. Duplicate names are allowed (business rule dependent).

**BR2:** Duration must be positive. Duration is used for appointment scheduling and calendar slot calculation.

**BR3:** Price must be non-negative. Free services can have price = 0.

**BR4:** If `consumes_inventory` is true, `consumed_items` must be provided. Inventory reservation occurs at appointment confirmation; decrement occurs at completion.

**BR5:** Required resources are optional identifiers for resource management (e.g., specific rooms, equipment). Used for conflict detection.

**BR6:** Tags are optional for service categorization and filtering.

**BR7:** All service creation actions must be logged in audit logs for compliance.

**BR8:** Service duration and staff skills must match when auto-assigning staff to appointments.

## 10. Validation Rules

1. **Name Validation:**
   - Cannot be empty or whitespace-only
   - Maximum 255 characters
   - Must contain at least one non-whitespace character

2. **Description Validation (if provided):**
   - Maximum 2000 characters
   - Can be empty string (nullable)

3. **Duration Validation:**
   - Must be integer > 0
   - Represents minutes (e.g., 30 = 30 minutes)

4. **Price Validation:**
   - Must be decimal >= 0
   - Precision: 2 decimal places

5. **Consumes Inventory Validation:**
   - Must be boolean value (true/false)

6. **Consumed Items Validation (if consumes_inventory=true):**
   - Must be provided and non-empty array
   - Each item must have:
     - `product_id`: Must exist in `products` table
     - `quantity`: Integer > 0

7. **Required Resources Validation (if provided):**
   - Must be array of strings
   - Maximum 50 items
   - Each resource identifier: maximum 128 characters

8. **Tags Validation (if provided):**
   - Must be array of strings
   - Maximum 20 items
   - Each tag: maximum 64 characters

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `MISSING_REQUIRED_FIELD` | "Required field [field] is missing" | Required field not provided |
| 400 | `INVALID_NAME` | "Service name cannot be empty" | Name is empty or whitespace-only |
| 400 | `INVALID_DURATION` | "Duration must be greater than 0" | Duration is <= 0 |
| 400 | `INVALID_PRICE` | "Price must be >= 0" | Price is negative |
| 400 | `MISSING_CONSUMED_ITEMS` | "Consumed items are required when consumes_inventory is true" | Consumed items missing |
| 400 | `INVALID_QUANTITY` | "Consumed item quantity must be greater than 0" | Invalid quantity |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Manager or Owner role can create services" | User lacks required role |
| 404 | `PRODUCT_NOT_FOUND` | "Product with ID [id] not found" | Product does not exist |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error during persistence |

## 12. Events Triggered

**Domain Events:**
- `ServiceCreated` event is published with payload:
  - `service_id` (UUID)
  - `name` (String)
  - `duration_minutes` (Integer)
  - `price` (Decimal)
  - `consumes_inventory` (Boolean)
  - `created_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Service", action="create"

**Integration Events:**
- None (service creation is internal operation)

## 13. Repository Methods Required

**ServiceRepository Interface:**
- `save(service: Service): Promise<Service>` - Persist new service entity
- `findById(id: UUID): Promise<Service | null>` - Retrieve by ID (for validation)

**ProductRepository Interface:**
- `findById(id: UUID): Promise<Product | null>` - Verify product exists (for consumed_items)

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user for audit logging

## 14. Notes or Limitations

1. **Inventory Consumption:** Services that consume inventory require `consumed_items`. Inventory reservation occurs at appointment confirmation; decrement occurs at appointment completion.

2. **Duration:** Service duration is used for appointment scheduling. Calendar slots are calculated based on duration.

3. **Required Resources:** Resource identifiers are optional but useful for conflict detection (e.g., preventing double-booking of specific rooms or equipment).

4. **Tags:** Tags enable service categorization and filtering. Consider standardizing tag values for consistency.

5. **Performance:** Service creation is infrequent. No special performance optimizations required.

6. **Future Enhancements:** Consider adding:
   - Service categories
   - Service images
   - Service pricing tiers
   - Service availability schedules
   - Service dependencies (prerequisites)

7. **Business Rule Dependencies:** Service creation is used by:
   - Appointment scheduling (service selection)
   - Service packages (service composition)
   - Staff skills assignment (service skills)

8. **Transaction Safety:** Service creation should be atomic. Use database transactions to ensure consistency.

9. **Validation:** Ensure consumed_items products exist and are active. Consider validating product availability if needed.

10. **Audit Trail:** All service creation actions must be logged for compliance and troubleshooting.

