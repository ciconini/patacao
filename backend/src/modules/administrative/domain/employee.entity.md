# Employee Domain Entity

## Entity Description

The `Employee` entity represents an employee (staff member) in the petshop management system. This entity represents employment/HR information, distinct from the `User` entity which handles system access and authentication. An Employee may be linked to a User entity for system access, but employment information is maintained separately.

**Key Characteristics:**
- Pure domain entity with no framework dependencies
- Encapsulates business rules and invariants
- Represents employment/HR information
- Supports multiple employment statuses and types
- Tracks salary and compensation information
- Can be assigned to multiple stores
- Validates Portuguese NIF (tax ID) format

## Properties

### Required Properties
- **`id`** (string, UUID): Unique identifier for the employee
- **`companyId`** (string, UUID): Reference to the Company entity (invariant: must exist)
- **`employeeNumber`** (string): Unique employee number within the company (1-50 characters)
- **`fullName`** (string): Employee's full name (1-255 characters)
- **`employmentStartDate`** (Date): Date when employment started (cannot be in future)

### Optional Properties
- **`userId`** (string, UUID): Link to User entity for system access
- **`email`** (string): Contact email address
- **`phone`** (string): Contact phone number
- **`address`** (Address): Employee's address (structured)
- **`nif`** (string): Portuguese NIF (Número de Identificação Fiscal) - 9 digits with check digit
- **`dateOfBirth`** (Date): Date of birth
- **`employmentEndDate`** (Date): Date when employment ended (if applicable)
- **`position`** (string): Job title/position
- **`department`** (string): Department name
- **`salary`** (number): Monthly salary (non-negative)
- **`hourlyRate`** (number): Hourly rate for part-time/contract (non-negative)
- **`emergencyContactName`** (string): Emergency contact name
- **`emergencyContactPhone`** (string): Emergency contact phone
- **`notes`** (string): Additional notes

### Employment Properties
- **`employmentStatus`** (EmploymentStatus): Current employment status (default ACTIVE)
  - ACTIVE: Currently employed and working
  - ON_LEAVE: On leave (sick, vacation, etc.)
  - TERMINATED: Employment has ended
  - SUSPENDED: Temporarily suspended
- **`employmentType`** (EmploymentType): Type of employment (default FULL_TIME)
  - FULL_TIME: Full-time employment
  - PART_TIME: Part-time employment
  - CONTRACT: Contract-based employment
  - INTERN: Internship

### Store Assignment
- **`storeIds`** (string[]): List of Store IDs where employee works

### Metadata Properties
- **`createdAt`** (Date): Timestamp when the employee was created
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
2. **`companyId`**: Must be a non-empty string - **invariant**: Employee must be linked to a Company
3. **`employeeNumber`**: Must be a non-empty string, 1-50 characters, must be unique within company
4. **`fullName`**: Must be a non-empty string, 1-255 characters
5. **`employmentStartDate`**: Must be a valid date, cannot be in the future

### Optional Parameters
- All other properties are optional and can be set later via behavior methods
- **`employmentStatus`**: Defaults to ACTIVE
- **`employmentType`**: Defaults to FULL_TIME
- **`storeIds`**: Defaults to empty array

### Validation Rules
- **ID Validation**: Throws error if `id` is empty or null
- **Company ID Validation**: Throws error if `companyId` is empty or null
- **Employee Number Validation**: Throws error if `employeeNumber` is empty or exceeds 50 characters
- **Full Name Validation**: Throws error if `fullName` is empty, null, or exceeds 255 characters
- **Employment Start Date**: Cannot be in the future
- **Employment End Date**: If provided, must be after start date
- **NIF Validation**: If provided, must be:
  - Exactly 9 digits
  - Valid check digit according to Portuguese NIF algorithm
- **Address Validation**: If provided, must have:
  - Non-empty street
  - Non-empty city
  - Valid Portuguese postal code format (XXXX-XXX)
- **Email Validation**: If provided, must be valid email format and max 255 characters
- **Salary/Hourly Rate**: Cannot be negative

### Example Constructor Usage
```typescript
// Minimal required fields
const employee = new Employee(
  'uuid-123',
  'company-uuid-456',
  'EMP-001',
  'João Silva',
  new Date('2024-01-15')
);

// Full constructor
const employee = new Employee(
  'uuid-123',
  'company-uuid-456',
  'EMP-001',
  'João Silva',
  new Date('2024-01-15'),
  EmploymentStatus.ACTIVE,
  EmploymentType.FULL_TIME,
  'user-uuid-789',
  'joao.silva@patacao.pt',
  '+351912345678',
  {
    street: 'Rua das Flores, 123',
    city: 'Lisboa',
    postalCode: '1000-001',
    country: 'Portugal'
  },
  '123456789',
  new Date('1990-05-15'),
  undefined,
  'Veterinarian',
  'Medical Services',
  ['store-001'],
  2500.00,
  undefined,
  'Maria Silva',
  '+351912345679',
  'Experienced veterinarian'
);
```

## Methods

### Getters (Read-Only Access)
All properties are accessed through getters that return copies to maintain encapsulation.

### Behavior Methods

#### Property Updates
- **`updateEmployeeNumber(employeeNumber: string)`**: Updates employee number (validates non-empty, max 50 chars)
- **`updateFullName(fullName: string)`**: Updates full name (validates non-empty, max 255 chars)
- **`updateEmail(email: string | undefined)`**: Updates email (validates format)
- **`updatePhone(phone: string | undefined)`**: Updates phone number
- **`updateAddress(address: Address | undefined)`**: Updates address (validates structure)
- **`updateNif(nif: string | undefined)`**: Updates NIF (validates format and check digit)
- **`updateDateOfBirth(dateOfBirth: Date | undefined)`**: Updates date of birth (validates not in future)
- **`updatePosition(position: string | undefined)`**: Updates job title/position
- **`updateDepartment(department: string | undefined)`**: Updates department
- **`updateNotes(notes: string | undefined)`**: Updates additional notes

#### User Account Linking
- **`linkToUser(userId: string)`**: Links employee to User entity for system access
- **`unlinkFromUser()`**: Unlinks employee from User entity
- **`hasUserAccount()`**: Checks if employee is linked to a User account

#### Employment Management
- **`updateEmploymentStartDate(startDate: Date)`**: Updates start date (validates not in future, not after end date)
- **`updateEmploymentEndDate(endDate: Date | undefined)`**: Updates end date (validates after start date)
- **`updateEmploymentStatus(status: EmploymentStatus)`**: Updates employment status
- **`updateEmploymentType(type: EmploymentType)`**: Updates employment type
- **`terminate(endDate?: Date)`**: Terminates employee (sets end date and status to TERMINATED)

#### Store Assignment
- **`assignToStore(storeId: string)`**: Assigns employee to a store
- **`removeFromStore(storeId: string)`**: Removes employee from a store
- **`isAssignedToStore(storeId: string)`**: Checks if employee is assigned to a store

#### Compensation Management
- **`updateSalary(salary: number | undefined)`**: Updates monthly salary (validates non-negative)
- **`updateHourlyRate(hourlyRate: number | undefined)`**: Updates hourly rate (validates non-negative)

#### Emergency Contact
- **`updateEmergencyContact(name: string | undefined, phone: string | undefined)`**: Updates emergency contact information

#### Calculations
- **`calculateAge()`**: Returns age in years (or undefined if date of birth not set)
- **`calculateYearsOfService()`**: Returns years of service from start date to end date (or today if active)

#### Status Checks
- **`isActive()`**: Returns true if employee is active (status is ACTIVE and no end date)
- **`hasNif()`**: Returns true if employee has a valid NIF

## Invariants

### Core Invariants (Always Enforced)
1. **Company Linkage**: An Employee **must** be linked to a Company (`companyId` cannot be empty)
   - Enforced in constructor
   - Cannot be changed after creation (immutable property)

2. **Employee Number Requirement**: Employee number **must** be non-empty and 1-50 characters
   - Enforced in constructor and `updateEmployeeNumber()` method
   - Must be unique within company (enforced at repository/aggregate level)

3. **Full Name Requirement**: Full name **must** be non-empty and 1-255 characters
   - Enforced in constructor and `updateFullName()` method

4. **Employment Start Date**: Cannot be in the future
   - Enforced in constructor and `updateEmploymentStartDate()` method

5. **Employment End Date**: If provided, must be after start date
   - Enforced in constructor and `updateEmploymentEndDate()` method

6. **NIF Format**: If NIF is provided, it **must** be:
   - Exactly 9 digits
   - Valid check digit according to Portuguese NIF algorithm
   - Enforced in constructor and `updateNif()` method

7. **Address Structure**: If address is provided, it **must** have:
   - Non-empty street
   - Non-empty city
   - Valid Portuguese postal code format (XXXX-XXX)

8. **Compensation**: Salary and hourly rate cannot be negative
   - Enforced in constructor and update methods

### Business Rules
1. **User Account Linking**: Employee can be linked to a User entity for system access, but employment info is separate
2. **Employment Status**: Status changes reflect current employment state
3. **Termination**: Terminating an employee sets end date and status to TERMINATED
4. **Multi-Store Assignment**: Employees can work at multiple stores
5. **Years of Service**: Calculated from start date to end date (or today if active)

## Example Lifecycle

### 1. Employee Hiring
**Scenario**: A new employee is hired and added to the system.

```
1. Employee entity is instantiated:
   - id: "emp-001"
   - companyId: "comp-001"
   - employeeNumber: "EMP-001"
   - fullName: "João Silva"
   - employmentStartDate: 2024-01-15
   - employmentStatus: ACTIVE
   - employmentType: FULL_TIME
   - createdAt: 2024-01-15T10:00:00Z
   - updatedAt: 2024-01-15T10:00:00Z

2. Entity validates:
   ✓ companyId is not empty
   ✓ employeeNumber is not empty
   ✓ fullName is not empty
   ✓ employmentStartDate is not in future
```

### 2. Adding Personal Information
**Scenario**: Employee's personal and contact information is added.

```
1. updateNif("123456789")
   → Validates NIF format and check digit
   → updatedAt: 2024-01-15T10:30:00Z

2. updateAddress({
     street: "Rua das Flores, 123",
     city: "Lisboa",
     postalCode: "1000-001"
   })
   → Validates address structure
   → updatedAt: 2024-01-15T10:35:00Z

3. updateEmail("joao.silva@patacao.pt")
   → Validates email format
   → updatedAt: 2024-01-15T10:40:00Z
```

### 3. Linking to User Account
**Scenario**: Employee is given system access by linking to User entity.

```
1. linkToUser("user-001")
   → userId: "user-001"
   → updatedAt: 2024-01-15T11:00:00Z

2. hasUserAccount() → true
```

### 4. Store Assignment
**Scenario**: Employee is assigned to work at multiple stores.

```
1. assignToStore("store-001")
   → storeIds: ["store-001"]
   → updatedAt: 2024-01-15T12:00:00Z

2. assignToStore("store-002")
   → storeIds: ["store-001", "store-002"]
   → updatedAt: 2024-01-15T12:05:00Z

3. isAssignedToStore("store-001") → true
```

### 5. Compensation Setup
**Scenario**: Employee's salary information is recorded.

```
1. updateSalary(2500.00)
   → salary: 2500.00
   → updatedAt: 2024-01-15T13:00:00Z

2. updateHourlyRate(15.50)
   → hourlyRate: 15.50
   → updatedAt: 2024-01-15T13:05:00Z
```

### 6. Employment Status Changes
**Scenario**: Employee goes on leave, then returns.

```
1. updateEmploymentStatus(EmploymentStatus.ON_LEAVE)
   → employmentStatus: ON_LEAVE
   → updatedAt: 2024-06-01T09:00:00Z

2. updateEmploymentStatus(EmploymentStatus.ACTIVE)
   → employmentStatus: ACTIVE
   → updatedAt: 2024-06-15T09:00:00Z
```

### 7. Years of Service Calculation
**Scenario**: System calculates employee's years of service.

```
1. calculateYearsOfService()
   → Returns: 2 (years)
   → Based on start date: 2024-01-15, today: 2026-01-20

2. After termination:
   terminate(new Date('2026-12-31'))
   → employmentEndDate: 2026-12-31
   → employmentStatus: TERMINATED
   → calculateYearsOfService() → 2 (years from start to end)
```

### 8. Employee Termination
**Scenario**: Employee leaves the company.

```
1. terminate(new Date('2026-12-31'))
   → employmentEndDate: 2026-12-31
   → employmentStatus: TERMINATED
   → updatedAt: 2026-12-31T10:00:00Z

2. isActive() → false
3. calculateYearsOfService() → 2 (years)
```

### 9. Error Scenarios
**Scenario**: Attempting invalid operations.

```
1. new Employee("", "comp-001", "EMP-001", "João Silva", new Date())
   → Error: "Employee ID is required"

2. new Employee("emp-001", "", "EMP-001", "João Silva", new Date())
   → Error: "Company ID is required - an Employee must be linked to a Company"

3. new Employee("emp-001", "comp-001", "", "João Silva", new Date())
   → Error: "Employee number is required"

4. new Employee("emp-001", "comp-001", "EMP-001", "João Silva", new Date('2025-12-31'))
   → Error: "Employment start date cannot be in the future"

5. updateEmploymentEndDate(new Date('2023-01-01'))
   → Error: "Employment end date cannot be before start date"

6. updateSalary(-100)
   → Error: "Salary cannot be negative"

7. updateNif("12345678")
   → Error: "NIF must be exactly 9 digits"
```

## Design Decisions

1. **Immutable Identity**: `id` and `companyId` are immutable to maintain referential integrity
2. **Encapsulation**: All properties are private with getters returning copies to prevent external mutation
3. **Validation at Boundaries**: All validation happens in constructor and update methods
4. **User Account Separation**: Employee and User are separate entities; Employee can be linked to User for system access
5. **Employment Status Management**: Status enum provides clear employment states
6. **Employment Type Support**: Supports different employment types (full-time, part-time, contract, intern)
7. **Multi-Store Assignment**: Employees can work at multiple stores
8. **Compensation Tracking**: Supports both salary and hourly rate for different employment types
9. **Portuguese NIF Validation**: Implements Portuguese NIF check digit algorithm for fiscal compliance
10. **Years of Service Calculation**: Calculates service duration from start to end date (or today if active)
11. **Timestamp Management**: Automatic `updatedAt` tracking on every modification

## Usage Notes

- This entity is framework-agnostic and can be used in any context
- Repository implementations should handle persistence concerns
- Employee number uniqueness must be enforced at repository/aggregate level
- Employee can exist without a linked User account (for HR records)
- User account can exist without an Employee record (for system-only users)
- Termination automatically sets end date and status
- Years of service calculation handles both active and terminated employees
- Domain events can be published when significant state changes occur (outside entity scope)

