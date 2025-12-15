# Use Case UC-ADMIN-008: Create Pet

## 1. Objective

Create a new pet record linked to an existing customer. Pet records store animal information including species, breed, date of birth, microchip ID, medical notes, and vaccination history. Pets are required for appointment scheduling.

## 2. Actors and Permissions

**Primary Actor:** Staff, Manager, Veterinarian

**Secondary Actors:** None

**Required Permissions:**
- Role: `Staff`, `Manager`, `Veterinarian`, or `Owner`
- Permission: `pets:create`

**Authorization Rules:**
- Users with `Staff`, `Manager`, `Veterinarian`, or `Owner` role can create pets
- System must validate role before allowing pet creation

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Staff`, `Manager`, `Veterinarian`, or `Owner` role assigned
3. Customer with specified `customer_id` exists in the system (or inline customer creation is supported)
4. System has available storage capacity for new records

## 4. Postconditions

1. A new `Pet` entity is created with a unique UUID `id`
2. Pet record is persisted in the `pets` table
3. Pet is linked to the specified `customer_id`
4. `created_at` timestamp is set to current server time
5. `updated_at` is initially set to `created_at`
6. Audit log entry is created recording the creation action
7. Pet is ready to have appointments scheduled

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `customer_id` | UUID | Yes | Must exist | Customer identifier (owner of pet) |
| `name` | String | Yes | Max 255 chars, non-empty | Pet's name |
| `species` | String | Yes | Max 64 chars, non-empty | Species (e.g., "dog", "cat", "bird") |
| `breed` | String | No | Max 128 chars | Breed name |
| `date_of_birth` | Date | No | Valid date, not future | Date of birth (YYYY-MM-DD) |
| `microchip_id` | String | No | Valid microchip format | Microchip identification number |
| `medical_notes` | String | No | Max 5000 chars | Medical notes and history |
| `vaccination` | JSON Array | No | Valid vaccination structure | Vaccination records |

**Vaccination JSON Structure:**
```json
[
  {
    "vaccine": "Rabies",
    "date": "2024-01-15",
    "expires": "2025-01-15",
    "administered_by": "Dr. Silva"
  }
]
```

**Inline Customer Creation (Optional):**
If `customer_id` is not provided, system may support inline customer creation with customer fields:
- `customer.full_name` (required)
- `customer.email` (optional)
- `customer.phone` (optional)

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier for the created pet |
| `customer_id` | UUID | Customer identifier (owner) |
| `name` | String | Pet's name |
| `species` | String | Species |
| `breed` | String | Breed (nullable) |
| `date_of_birth` | Date | Date of birth (nullable) |
| `age` | Integer | Calculated age in years (nullable if date_of_birth not provided) |
| `microchip_id` | String | Microchip ID (nullable) |
| `medical_notes` | String | Medical notes (nullable) |
| `vaccination` | JSON Array | Vaccination records (nullable) |
| `created_at` | DateTime | Creation timestamp (ISO 8601) |
| `updated_at` | DateTime | Last update timestamp (ISO 8601) |

## 7. Main Flow

1. System receives request to create pet with input data
2. System validates user authentication and role (`Staff`, `Manager`, `Veterinarian`, or `Owner`)
3. System validates required fields are present (`customer_id`, `name`, `species`)
4. System loads customer by `customer_id` to verify existence (or creates inline customer if supported)
5. System validates `name` is non-empty and not whitespace-only
6. System validates `species` is non-empty and not whitespace-only
7. System validates `date_of_birth` is valid date and not in future if provided
8. System validates `microchip_id` format if provided (format depends on country/standard)
9. System validates `vaccination` JSON array structure if provided
10. System calculates `age` from `date_of_birth` if provided
11. System generates UUID for `id`
12. System sets `created_at` and `updated_at` to current timestamp
13. System persists pet record to `pets` table
14. System creates audit log entry with action `create`, entity_type `Pet`, entity_id, and performed_by
15. System returns created pet object with all fields including calculated `age`

## 8. Alternative Flows

### 8.1. Customer Not Found
- **Trigger:** Step 4 finds no customer with given `customer_id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Customer not found"
  - Use case terminates (or proceeds with inline customer creation if supported)

### 8.2. Inline Customer Creation
- **Trigger:** `customer_id` not provided, inline customer creation supported
- **Action:**
  - System creates customer using provided customer fields (see UC-ADMIN-005)
  - System uses newly created customer_id for pet
  - Use case continues with pet creation

### 8.3. Missing Required Field
- **Trigger:** Step 3 detects missing required field
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Required field [field_name] is missing"
  - Use case terminates

### 8.4. Invalid Name Format
- **Trigger:** Step 5 detects invalid name (empty or whitespace-only)
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Pet name cannot be empty"
  - Use case terminates

### 8.5. Invalid Date of Birth
- **Trigger:** Step 7 detects invalid date or future date
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Date of birth must be a valid date and cannot be in the future"
  - Use case terminates

### 8.6. Invalid Microchip Format
- **Trigger:** Step 8 detects invalid microchip format
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Microchip ID format is invalid"
  - Use case terminates

### 8.7. Invalid Vaccination Structure
- **Trigger:** Step 9 detects invalid vaccination JSON
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Vaccination must be an array of vaccination records"
  - Use case terminates

### 8.8. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Staff, Manager, Veterinarian, or Owner role can create pets"
  - Use case terminates

## 9. Business Rules

**BR1:** A pet must be linked to an existing customer. System should allow inline customer creation when creating pet.

**BR2:** Pet name and species are required. Breed, date of birth, and other fields are optional.

**BR3:** Microchip format must be validated when provided. Format depends on country/standard (ISO 11784/11785 for international).

**BR4:** Age is calculated from `date_of_birth` if provided. Age is not stored but calculated on-the-fly.

**BR5:** Vaccination records are stored as JSON array for flexibility. Future enhancements may include structured vaccination entity.

**BR6:** Pet creation enables appointment scheduling. Appointments require a pet to be linked.

**BR7:** All pet creation actions must be logged in audit logs for compliance and medical record traceability.

**BR8:** Medical notes may contain sensitive information. Ensure proper access controls and GDPR compliance.

## 10. Validation Rules

1. **Customer ID Validation:**
   - Must be valid UUID format
   - Must exist in `customers` table
   - Customer must not be archived (business rule dependent)

2. **Name Validation:**
   - Cannot be empty or whitespace-only
   - Maximum 255 characters
   - Must contain at least one non-whitespace character

3. **Species Validation:**
   - Cannot be empty or whitespace-only
   - Maximum 64 characters
   - Common values: "dog", "cat", "bird", "rabbit", "hamster", "reptile", "other"

4. **Breed Validation (if provided):**
   - Maximum 128 characters
   - Can be empty string (nullable)

5. **Date of Birth Validation (if provided):**
   - Must be valid date format (YYYY-MM-DD)
   - Cannot be in the future
   - Reasonable range (e.g., not more than 50 years ago for most pets)

6. **Microchip ID Validation (if provided):**
   - Must match microchip format (ISO 11784/11785: 15 digits)
   - Or country-specific format
   - Must be unique if system enforces uniqueness

7. **Medical Notes Validation (if provided):**
   - Maximum 5000 characters
   - Can contain structured or free-form text

8. **Vaccination Validation (if provided):**
   - Must be JSON array
   - Each entry should have: vaccine (string), date (date), expires (date, optional), administered_by (string, optional)

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `MISSING_REQUIRED_FIELD` | "Required field [field] is missing" | Required field not provided |
| 400 | `INVALID_NAME` | "Pet name cannot be empty" | Name is empty or whitespace-only |
| 400 | `INVALID_SPECIES` | "Species cannot be empty" | Species is empty or whitespace-only |
| 400 | `INVALID_DATE_OF_BIRTH` | "Date of birth must be valid and not in future" | Invalid date format or future date |
| 400 | `INVALID_MICROCHIP` | "Microchip ID format is invalid" | Microchip does not match format |
| 400 | `INVALID_VACCINATION` | "Vaccination must be an array" | Vaccination JSON invalid |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Staff, Manager, Veterinarian, or Owner role can create pets" | User lacks required role |
| 404 | `CUSTOMER_NOT_FOUND` | "Customer not found" | Customer does not exist |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error during persistence |

## 12. Events Triggered

**Domain Events:**
- `PetCreated` event is published with payload:
  - `pet_id` (UUID)
  - `customer_id` (UUID)
  - `name` (String)
  - `species` (String)
  - `created_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Pet", action="create"

**Integration Events:**
- None (pet creation is internal administrative action)

## 13. Repository Methods Required

**PetRepository Interface:**
- `save(pet: Pet): Promise<Pet>` - Persist new pet entity
- `findById(id: UUID): Promise<Pet | null>` - Retrieve by ID

**CustomerRepository Interface:**
- `findById(id: UUID): Promise<Customer | null>` - Verify customer exists
- `save(customer: Customer): Promise<Customer>` - Create inline customer if supported

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user

## 14. Notes or Limitations

1. **Inline Customer Creation:** System may support creating customer inline when creating pet. This improves UX but adds complexity.

2. **Microchip Format:** Microchip format validation depends on country/standard. Consider configurable validation rules.

3. **Age Calculation:** Age is calculated from date_of_birth. Consider timezone and precision (years, months, days).

4. **Vaccination Records:** Vaccination is stored as JSON for flexibility. Consider structured vaccination entity in future.

5. **Medical Notes:** Medical notes may contain sensitive information. Ensure proper access controls and encryption if required.

6. **Performance:** Pet creation is frequent operation. Ensure efficient database operations.

7. **Data Retention:** Pet data retention follows GDPR requirements. Ensure deletion workflows are available.

8. **Future Enhancements:** Consider adding:
   - Pet photos
   - Pet tags/categories
   - Pet insurance information
   - Pet weight/health tracking
   - Breed-specific fields

9. **Business Rule Dependencies:** Pet records are required by Services module for appointment scheduling.

10. **Transaction Safety:** Pet creation should be atomic. Use database transactions if inline customer creation is supported.

