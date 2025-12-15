# Repository Interface Contract: CustomerRepository

## Overview

The `CustomerRepository` interface defines the contract for customer data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for customer entity operations, including CRUD, search, archiving, and GDPR-compliant data management.

**Entity:** `Customer`  
**Table:** `customers`  
**Module:** Administrative

## Entity Structure

Based on the ER model, the `Customer` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `full_name` (VARCHAR(255), NOT NULL) - Customer full name
- `email` (VARCHAR(255), NULL) - Contact email (optional)
- `phone` (VARCHAR(32), NULL) - Contact phone number (optional)
- `address` (JSON, NULL) - Structured address: `{street, city, postal_code, country}`
- `consent_marketing` (BOOLEAN, NOT NULL, DEFAULT FALSE) - Marketing consent flag
- `consent_reminders` (BOOLEAN, NOT NULL, DEFAULT TRUE) - Appointment reminders consent flag
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NULL) - Last update timestamp

**Note:** The use cases reference archiving functionality (`archived`, `archived_at`, `archived_by` fields), but these are not explicitly in the ER model. These fields may be added to support soft delete functionality.

**Indexes:**
- Primary key on `id`
- Index on `email` (for email lookups and uniqueness checks)
- Index on `phone` (for phone lookups)

**Relationships:**
- Customer 1 — 0..* Pet (customer owns pets)
- Customer 1 — 0..* Appointment (customer books appointments)
- Customer 1 — 0..* Invoice (customer is buyer on invoices)

**Business Rules:**
- `consent_reminders` must be true to send appointment reminders by email
- Deleting a Customer requires reassigning or deleting linked Pets/appointments or archiving the Customer
- At least one contact method (email or phone) is recommended but not required
- Customer data retention follows GDPR requirements

---

## Method Specifications

### 1. `save(customer: Customer): Promise<Customer>`

**Purpose:**  
Persist a new customer entity. This method handles customer creation and is used during customer registration and inline customer creation.

**Input Parameters:**
- `customer` (Customer): Customer entity to persist
  - `id` is null/undefined (new customer)
  - Required fields: `full_name`
  - Optional fields: `email`, `phone`, `address`, `consent_marketing`, `consent_reminders`
  - Defaults: `consent_marketing` = false, `consent_reminders` = true

**Output Type:**
- `Promise<Customer>`: Returns the persisted customer entity with all fields populated, including generated `id`, `created_at`, and `updated_at` timestamps

**Error Conditions:**
- `CustomerValidationError`: If required fields are missing or invalid
- `InvalidNameError`: If `full_name` is empty or whitespace-only
- `InvalidEmailError`: If `email` format is invalid
- `InvalidPhoneError`: If `phone` format is invalid
- `InvalidAddressError`: If `address` structure is invalid
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `created_at` and `updated_at` to current timestamp
- Sets default values: `consent_marketing` = false, `consent_reminders` = true if not provided
- Stores `address` as JSON in database
- Does not enforce email/phone uniqueness (duplicate customers allowed, business rule dependent)
- Returns the complete customer entity with all fields

**Related Use Cases:**
- UC-ADMIN-005: Create Customer
- UC-ADMIN-011: Import Customers

---

### 2. `findById(id: UUID): Promise<Customer | null>`

**Purpose:**  
Retrieve a customer entity by its unique identifier. Used for customer lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Customer identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Customer | null>`: Returns the customer entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete customer entity with all fields
- Returns `null` if customer with given `id` does not exist
- Should use primary key index for efficient lookup
- Parses JSON field (`address`) from database
- Does not filter by archive status (returns archived customers if they exist)
- May filter by archive status based on business rules (application layer decision)

**Related Use Cases:**
- UC-ADMIN-005: Create Customer (validation)
- UC-ADMIN-006: Update Customer
- UC-ADMIN-007: Archive Customer
- UC-ADMIN-008: Create Pet (customer validation)
- UC-SVC-002: Create Appointment (customer validation)
- UC-FIN-001: Create Invoice Draft (customer validation)
- UC-FIN-006: Create Transaction (customer validation)

---

### 3. `update(customer: Customer): Promise<Customer>`

**Purpose:**  
Update an existing customer entity. Used for modifying customer information, contact details, and consent flags.

**Input Parameters:**
- `customer` (Customer): Customer entity with updated fields
  - `id` must be valid UUID of existing customer
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)

**Output Type:**
- `Promise<Customer>`: Returns the updated customer entity with all fields

**Error Conditions:**
- `CustomerNotFoundError`: If customer with given `id` does not exist
- `CustomerValidationError`: If updated fields are invalid
- `InvalidNameError`: If `full_name` is being updated and is empty or whitespace-only
- `InvalidEmailError`: If `email` is being updated and format is invalid
- `InvalidPhoneError`: If `phone` is being updated and format is invalid
- `InvalidAddressError`: If `address` is being updated and structure is invalid
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Preserves `created_at` timestamp
- Updates `updated_at` timestamp to current time
- Stores `address` as JSON in database if being updated
- Returns complete updated customer entity
- Consent flag changes should be logged for GDPR compliance (handled in application layer)

**Related Use Cases:**
- UC-ADMIN-006: Update Customer

---

### 4. `search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<Customer>>`

**Purpose:**  
Search and filter customer records by various criteria with pagination and sorting. Used for customer lookup during appointment booking, POS checkout, and administrative tasks.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object
  - `q?: string` - General search query (searches in `full_name`, `email`, `phone`)
  - `email?: string` - Filter by exact email match
  - `phone?: string` - Filter by phone number (partial or exact match)
  - `full_name?: string` - Filter by name (partial match)
  - `consent_marketing?: boolean` - Filter by marketing consent flag
  - `consent_reminders?: boolean` - Filter by reminders consent flag
  - `archived?: boolean` - Include/exclude archived customers (defaults to false)
- `pagination` (Pagination): Pagination parameters
  - `page: number` - Page number (min 1, default 1)
  - `per_page: number` - Results per page (min 1, max 100, default 20)
- `sort` (Sort): Sort parameters
  - `field: string` - Sort field ("full_name", "email", "created_at")
  - `direction: 'asc' | 'desc'` - Sort direction (default: "asc")

**Output Type:**
- `Promise<PaginatedResult<Customer>>`: Returns paginated result with:
  - `items: Customer[]` - Array of customer entities matching criteria
  - `meta: PaginationMeta` - Pagination metadata (total, page, per_page, total_pages, has_next, has_previous)

**Error Conditions:**
- `InvalidPaginationError`: If pagination parameters are invalid
- `InvalidSortError`: If sort field is invalid
- `InvalidEmailError`: If `email` filter format is invalid
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Builds query with filters based on criteria
- Text search (`q`) searches in `full_name`, `email`, and `phone` fields (case-insensitive, partial match)
- Email filter uses exact match (case-insensitive)
- Phone filter uses partial match (case-insensitive)
- Name filter uses partial match (case-insensitive)
- Consent filters use exact boolean match
- Archive filter excludes archived customers by default (`archived = false` or `archived IS NULL`)
- Uses indexes on `email` and `phone` for efficient queries
- Returns customers in no specific order if no sort specified (default: `full_name` ascending)
- Parses JSON field (`address`) from database
- Returns empty array if no results found

**Pagination Rules:**
- Default page: 1
- Default per_page: 20
- Maximum per_page: 100
- Returns empty array if no results found
- Total count calculated before pagination

**Sorting and Filtering Rules:**
- Valid sort fields: "full_name", "email", "created_at"
- Default sort: "full_name" ascending (alphabetical)
- Text search is case-insensitive and uses partial matching (LIKE or full-text search)
- Email filter uses exact match (case-insensitive)
- Phone filter uses partial match (case-insensitive)
- Archive filter defaults to excluding archived customers

**Related Use Cases:**
- UC-ADMIN-010: Search Customers

---

### 5. `count(criteria: SearchCriteria): Promise<number>`

**Purpose:**  
Count the number of customers matching search criteria. Used for pagination metadata calculation.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object (same as `search()` method)
  - `q?: string` - General search query
  - `email?: string` - Filter by email
  - `phone?: string` - Filter by phone
  - `full_name?: string` - Filter by name
  - `consent_marketing?: boolean` - Filter by marketing consent
  - `consent_reminders?: boolean` - Filter by reminders consent
  - `archived?: boolean` - Include/exclude archived customers

**Output Type:**
- `Promise<number>`: Returns count of matching customers (integer >= 0)

**Error Conditions:**
- `InvalidEmailError`: If `email` filter format is invalid
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses same filtering logic as `search()` method
- Should use efficient COUNT query
- Returns integer count, never negative
- Does not apply pagination (counts all matching records)
- Uses indexes for efficient counting

**Related Use Cases:**
- UC-ADMIN-010: Search Customers (pagination metadata)

---

### 6. `findByEmail(email: string): Promise<Customer | null>`

**Purpose:**  
Retrieve a customer entity by its email address. Used for email uniqueness checks, duplicate detection, and customer lookup by email.

**Input Parameters:**
- `email` (string): Customer email address
  - Must be non-empty string
  - Must not be null or undefined
  - Should be valid email format (validated in application layer)

**Output Type:**
- `Promise<Customer | null>`: Returns the customer entity if found, `null` if not found
  - If multiple customers with same email exist, returns first match (business rule dependent)

**Error Conditions:**
- `InvalidEmailError`: If `email` is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Searches for customer where `email` matches exactly (case-insensitive)
- Uses index on `email` for efficient lookup
- Returns first match if multiple customers with same email exist
- Returns `null` if no customer found with given email
- Parses JSON field (`address`) from database
- Used for duplicate detection during customer creation/import

**Sorting and Filtering Rules:**
- Exact email match (case-insensitive)
- No filtering applied (pure email lookup)

**Related Use Cases:**
- UC-ADMIN-011: Import Customers (duplicate email check)

---

### 7. `findByPhone(phone: string): Promise<Customer | null>`

**Purpose:**  
Retrieve a customer entity by its phone number. Used for phone uniqueness checks, duplicate detection, and customer lookup by phone.

**Input Parameters:**
- `phone` (string): Customer phone number
  - Must be non-empty string
  - Must not be null or undefined

**Output Type:**
- `Promise<Customer | null>`: Returns the customer entity if found, `null` if not found
  - If multiple customers with same phone exist, returns first match (business rule dependent)

**Error Conditions:**
- `InvalidPhoneError`: If `phone` is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Searches for customer where `phone` matches exactly (case-insensitive, may normalize phone format)
- Uses index on `phone` for efficient lookup
- Returns first match if multiple customers with same phone exist
- Returns `null` if no customer found with given phone
- Parses JSON field (`address`) from database
- Used for duplicate detection during customer creation/import

**Sorting and Filtering Rules:**
- Exact phone match (may normalize phone format for comparison)
- No filtering applied (pure phone lookup)

**Related Use Cases:**
- Customer duplicate detection
- Customer lookup by phone

---

### 8. `delete(id: UUID): Promise<void>`

**Purpose:**  
Permanently delete a customer entity from the database. Used for hard deletion (GDPR "right to be forgotten" requests). This operation is restricted and should only be used after verifying no linked records exist.

**Input Parameters:**
- `id` (UUID): Customer identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<void>`: Returns void on successful deletion

**Error Conditions:**
- `CustomerNotFoundError`: If customer with given `id` does not exist
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `ReferentialIntegrityError`: If customer has linked pets, appointments, or invoices (business rule dependent)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- Referential integrity checks should be within the same transaction

**Notes on Expected Behaviour:**
- Permanently deletes customer record from database
- Does not cascade delete linked records (pets, appointments, invoices)
- Should verify no linked records exist before deletion (application layer responsibility)
- Hard delete is permanent and cannot be undone
- Used for GDPR "right to be forgotten" requests
- Should be logged in audit trail (handled in application layer)

**Related Use Cases:**
- UC-ADMIN-007: Archive Customer (hard delete operation)

---

### 9. `isArchived(id: UUID): Promise<boolean>`

**Purpose:**  
Check if a customer is archived. Used for archive status validation and filtering.

**Input Parameters:**
- `id` (UUID): Customer identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if customer is archived, `false` otherwise
  - Returns `false` if customer does not exist

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Checks if customer has `archived` flag set to `true` or `archived_at` is not null
- Returns `false` if customer does not exist
- Uses efficient query (checks archive status only, does not load full entity)
- Used for validation before archive operations

**Related Use Cases:**
- UC-ADMIN-007: Archive Customer (check if already archived)

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`, `delete()`, and `isArchived()`
   - Index on `email` for `findByEmail()` and email filtering in `search()`
   - Index on `phone` for `findByPhone()` and phone filtering in `search()`

2. **Query Optimization:**
   - Use efficient queries for text search (consider full-text search for large datasets)
   - Optimize pagination queries with proper indexes
   - Use `count()` for pagination metadata instead of loading all records
   - Consider caching frequently accessed customer data

3. **Search Performance:**
   - Text search (`q` parameter) may require full-text search indexes for large datasets
   - Email and phone filters use indexes for efficient queries
   - Archive filtering should use index if `archived` field is indexed

### Data Integrity

1. **Foreign Key Constraints:**
   - Pets reference customer via `customer_id` (enforced by database)
   - Appointments reference customer via `customer_id` (enforced by database)
   - Invoices reference customer via `buyer_customer_id` (enforced by database)

2. **Validation:**
   - `full_name` must be non-empty and not whitespace-only
   - `email` must be valid email format if provided
   - `phone` must be valid phone format if provided
   - `address` must have valid JSON structure if provided
   - Email/phone uniqueness is not enforced (duplicate customers allowed, business rule dependent)

3. **Business Rules:**
   - At least one contact method (email or phone) is recommended
   - Consent flags are critical for GDPR compliance
   - Customer deletion requires checking for linked records
   - Archive preserves historical data while marking customer as inactive

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`, `update`, `delete`) should be within transactions
- Referential integrity checks should be within the same transaction as deletion

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Referential integrity errors should be thrown when attempting to delete customer with linked records

### Business Rules

1. **GDPR Compliance:**
   - Consent flags must be explicitly recorded and auditable
   - Customer data retention follows GDPR requirements
   - Hard deletion may be required for "right to be forgotten" requests
   - Archive preserves data while marking customer as inactive

2. **Contact Information:**
   - At least one contact method (email or phone) is recommended
   - Email and phone are optional fields
   - Duplicate emails/phones are allowed (business rule dependent)

3. **Consent Management:**
   - `consent_reminders` must be true to send appointment reminders
   - `consent_marketing` controls marketing communications
   - Consent changes should be logged for audit trail

4. **Archive vs Delete:**
   - Archive (soft delete) preserves historical data
   - Hard delete permanently removes customer record
   - Archive is preferred over hard delete for data preservation

---

## Related Repositories

- **PetRepository:** For managing pets owned by customer
- **AppointmentRepository:** For appointments booked by customer
- **InvoiceRepository:** For invoices where customer is buyer
- **AuditLogRepository:** For logging customer operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `findByConsentMarketing(consent: boolean): Promise<Customer[]>` - Find customers by marketing consent
- `findByConsentReminders(consent: boolean): Promise<Customer[]>` - Find customers by reminders consent
- `archive(id: UUID, archivedBy: UUID, reason?: string): Promise<Customer>` - Archive customer (if archiving fields added to ER model)
- `unarchive(id: UUID): Promise<Customer>` - Unarchive customer (if archiving fields added to ER model)
- `bulkUpdate(customers: Customer[]): Promise<Customer[]>` - Bulk update customers
- `merge(sourceId: UUID, targetId: UUID): Promise<Customer>` - Merge duplicate customers

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

