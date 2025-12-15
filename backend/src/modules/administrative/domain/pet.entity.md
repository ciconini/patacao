# Pet Domain Entity

## Entity Description

The `Pet` entity represents an animal (pet) owned by a customer in the petshop management system. It encapsulates all business logic related to pet information, medical records, and age calculations.

**Key Characteristics:**
- Pure domain entity with no framework dependencies
- Encapsulates business rules and invariants
- Provides behavior methods for domain operations
- Immutable identity (ID cannot be changed)
- Tracks creation and update timestamps

## Properties

### Required Properties
- **`id`** (string, UUID): Unique identifier for the pet
- **`customerId`** (string, UUID): Reference to the Customer entity that owns this pet
- **`name`** (string): Pet's name (1-100 characters)

### Optional Properties
- **`species`** (string): Species name (e.g., "dog", "cat", "bird")
- **`breed`** (string): Breed name (e.g., "Golden Retriever", "Persian")
- **`dateOfBirth`** (Date): Pet's date of birth
- **`microchipId`** (string): Microchip identification number (validated format)
- **`medicalNotes`** (string): Medical history and notes
- **`vaccinationRecords`** (VaccinationRecord[]): Array of vaccination records

### Metadata Properties
- **`createdAt`** (Date): Timestamp when the pet was created
- **`updatedAt`** (Date): Timestamp of the last update

### VaccinationRecord Interface
```typescript
interface VaccinationRecord {
  vaccineType: string;        // Required: Type of vaccine
  administeredDate: Date;     // Required: When vaccine was given
  nextDueDate?: Date;         // Optional: When next dose is due
  veterinarian?: string;      // Optional: Veterinarian who administered
  batchNumber?: string;       // Optional: Vaccine batch number
}
```

## Constructor Rules

### Required Parameters
1. **`id`**: Must be a non-empty string (UUID format recommended)
2. **`customerId`**: Must be a non-empty string - **invariant**: Pet must be linked to a Customer
3. **`name`**: Must be a non-empty string, 1-100 characters

### Optional Parameters
- All other properties are optional and can be set later via behavior methods

### Validation Rules
- **ID Validation**: Throws error if `id` is empty or null
- **Customer ID Validation**: Throws error if `customerId` is empty or null
- **Name Validation**: Throws error if `name` is empty, null, or exceeds 100 characters
- **Microchip ID Validation**: If provided, must match one of:
  - ISO 11784/11785 format: 15 digits
  - Alternative format: 9-10 digits
  - Alphanumeric format: 9-15 alphanumeric characters
- **Date of Birth**: If provided, cannot be in the future

### Example Constructor Usage
```typescript
// Minimal required fields
const pet = new Pet(
  'uuid-123',
  'customer-uuid-456',
  'Max'
);

// Full constructor
const pet = new Pet(
  'uuid-123',
  'customer-uuid-456',
  'Max',
  'dog',
  'Golden Retriever',
  new Date('2020-05-15'),
  '123456789012345',
  'Allergic to certain foods',
  [],
  new Date('2024-01-01'),
  new Date('2024-01-01')
);
```

## Methods

### Getters (Read-Only Access)
All properties are accessed through getters that return copies to maintain encapsulation:
- `id`: Returns the pet's unique identifier
- `customerId`: Returns the customer ID (immutable)
- `name`: Returns the pet's name
- `species`: Returns the species (or undefined)
- `breed`: Returns the breed (or undefined)
- `dateOfBirth`: Returns a copy of the date of birth (or undefined)
- `microchipId`: Returns the microchip ID (or undefined)
- `medicalNotes`: Returns medical notes (or undefined)
- `vaccinationRecords`: Returns a copy of the vaccination records array with new Date instances for immutability
- `createdAt`: Returns a copy of the creation timestamp
- `updatedAt`: Returns a copy of the last update timestamp

### Behavior Methods

#### Age Calculation
- **`calculateAge()`**: Returns age in years (or undefined if date of birth not set)
- **`calculateAgeInMonths()`**: Returns age in months (or undefined if date of birth not set)

#### Property Updates
- **`updateName(newName: string)`**: Updates the pet's name (validates non-empty, max 100 chars)
- **`updateSpecies(species: string | undefined)`**: Updates the species
- **`updateBreed(breed: string | undefined)`**: Updates the breed
- **`updateDateOfBirth(dateOfBirth: Date | undefined)`**: Updates date of birth (validates not in future)
- **`updateMicrochipId(microchipId: string | undefined)`**: Updates microchip ID (validates format)
- **`updateMedicalNotes(notes: string | undefined)`**: Updates medical notes

#### Vaccination Management
- **`addVaccinationRecord(record: VaccinationRecord)`**: Adds a new vaccination record (validates record, creates new Date instances for immutability)
- **`removeVaccinationRecord(index: number)`**: Removes a vaccination record by index
- **`getDueVaccinations(referenceDate?: Date)`**: Returns vaccination records that are due or overdue (returns copies with new Date instances)
- **`getLatestVaccination(vaccineType: string)`**: Returns the most recent vaccination for a specific vaccine type (returns copy with new Date instances)

#### Status Checks
- **`hasMicrochip()`**: Returns true if pet has a valid microchip ID
- **`isYoung()`**: Returns true if pet is less than 1 year old
- **`isSenior()`**: Returns true if pet is senior (7+ years for dogs, 10+ years for cats, 7+ for others)

## Invariants

### Core Invariants (Always Enforced)
1. **Customer Linkage**: A Pet **must** be linked to a Customer (`customerId` cannot be empty)
   - Enforced in constructor
   - Cannot be changed after creation (immutable property)

2. **Name Requirement**: Pet name **must** be non-empty and between 1-100 characters
   - Enforced in constructor and `updateName()` method

3. **Microchip Format**: If microchip ID is provided, it **must** match a valid format
   - ISO 11784/11785 (15 digits)
   - Alternative (9-10 digits)
   - Alphanumeric (9-15 characters)

4. **Date Validity**: Date of birth cannot be in the future
   - Enforced in constructor and `updateDateOfBirth()` method

5. **Vaccination Record Validity**: Vaccination records must have:
   - Non-empty vaccine type
   - Administered date (cannot be in future)
   - Next due date (if provided) must be after administered date

### Business Rules
1. **Age Calculation**: Age is calculated dynamically from `dateOfBirth`, never stored
2. **Timestamp Tracking**: `createdAt` is immutable, `updatedAt` is updated on every modification
3. **Vaccination Tracking**: System tracks vaccination history for health management
4. **Senior Pet Classification**: Different age thresholds for different species (dogs: 7+, cats: 10+)

## Example Lifecycle

### 1. Pet Registration
**Scenario**: A new customer brings their dog to the petshop for the first time.

```
1. Customer is created/identified (customerId: "cust-001")
2. Pet entity is instantiated:
   - id: "pet-001"
   - customerId: "cust-001"
   - name: "Max"
   - species: "dog"
   - breed: "Golden Retriever"
   - dateOfBirth: 2020-05-15
   - microchipId: "123456789012345"
   - createdAt: 2024-01-15T10:00:00Z
   - updatedAt: 2024-01-15T10:00:00Z

3. Entity validates:
   ✓ customerId is not empty
   ✓ name is not empty
   ✓ microchipId format is valid (15 digits)
   ✓ dateOfBirth is not in future
```

### 2. Adding Medical Information
**Scenario**: During first visit, veterinarian adds medical notes and vaccination record.

```
1. updateMedicalNotes("Allergic to chicken, requires special diet")
   → updatedAt: 2024-01-15T10:30:00Z

2. addVaccinationRecord({
     vaccineType: "Rabies",
     administeredDate: 2024-01-15,
     nextDueDate: 2025-01-15,
     veterinarian: "Dr. Silva",
     batchNumber: "RAB-2024-001"
   })
   → updatedAt: 2024-01-15T10:35:00Z
   → vaccinationRecords.length: 1
```

### 3. Age-Based Operations
**Scenario**: System checks if pet qualifies for puppy services or senior care.

```
1. calculateAge() → 3 (years)
2. isYoung() → false (not less than 1 year)
3. isSenior() → false (dog, but less than 7 years)
4. calculateAgeInMonths() → 44 (months)
```

### 4. Vaccination Management
**Scenario**: Pet returns for annual vaccination checkup.

```
1. getDueVaccinations() → [Rabies record] (nextDueDate: 2025-01-15, today: 2025-01-20)
2. addVaccinationRecord({
     vaccineType: "Rabies",
     administeredDate: 2025-01-20,
     nextDueDate: 2026-01-20,
     veterinarian: "Dr. Silva"
   })
   → vaccinationRecords.length: 2

3. getLatestVaccination("Rabies") → Returns the 2025-01-20 record
```

### 5. Information Updates
**Scenario**: Customer moves and updates pet's microchip information.

```
1. updateMicrochipId("987654321098765")
   → Validates new microchip format
   → updatedAt: 2024-06-01T14:00:00Z

2. hasMicrochip() → true
```

### 6. Senior Pet Classification
**Scenario**: After several years, pet becomes eligible for senior care programs.

```
1. Time passes: current date is 2031-05-15
2. calculateAge() → 11 (years)
3. isSenior() → true (dog, 11 years >= 7 years threshold)
4. System can now apply senior pet discounts or special care protocols
```

### 7. Error Scenarios
**Scenario**: Attempting invalid operations.

```
1. new Pet("", "cust-001", "Max")
   → Error: "Pet ID is required"

2. new Pet("pet-001", "", "Max")
   → Error: "Customer ID is required - a Pet must be linked to a Customer"

3. new Pet("pet-001", "cust-001", "")
   → Error: "Pet name is required"

4. new Pet("pet-001", "cust-001", "Max", undefined, undefined, new Date('2025-12-31'))
   → Error: "Date of birth cannot be in the future"

5. updateMicrochipId("invalid")
   → Error: "Invalid microchip ID format..."

6. addVaccinationRecord({ vaccineType: "", administeredDate: new Date() })
   → Error: "Vaccine type is required"
```

## Design Decisions

1. **Immutable Identity**: `id` and `customerId` are immutable to maintain referential integrity
2. **Encapsulation**: All properties are private with getters returning copies to prevent external mutation
3. **Validation at Boundaries**: All validation happens in constructor and update methods
4. **Age Calculation**: Age is calculated, not stored, to ensure accuracy over time
5. **Vaccination Tracking**: Structured vaccination records support health management workflows
6. **Date Immutability**: All Date objects in vaccination records are copied to new instances to prevent external mutation
7. **Species-Aware Logic**: Senior classification considers species-specific age thresholds
8. **Timestamp Management**: Automatic `updatedAt` tracking on every modification

## Usage Notes

- This entity is framework-agnostic and can be used in any context
- Repository implementations should handle persistence concerns
- Use cases should orchestrate entity creation and updates
- Domain events can be published when significant state changes occur (outside entity scope)

