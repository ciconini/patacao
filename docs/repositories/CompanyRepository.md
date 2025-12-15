# Repository Interface Contract: CompanyRepository

## Overview

The `CompanyRepository` interface defines the contract for company data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for company entity operations, including business profile management and fiscal data handling.

**Entity:** `Company`  
**Table:** `companies`  
**Module:** Administrative

## Entity Structure

Based on the ER model, the `Company` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `name` (VARCHAR(255), NOT NULL) - Company/business name
- `nif` (VARCHAR(32), NOT NULL) - Portuguese fiscal number (Número de Identificação Fiscal)
- `address` (JSON, NULL) - Structured address: `{street, city, postal_code, country}`
- `tax_regime` (VARCHAR(64), NULL) - Tax regime identifier (e.g., "Simplificado", "Normal")
- `default_vat_rate` (DECIMAL(5,2), NULL) - Default VAT rate percentage (e.g., 23.00 for 23%)
- `phone` (VARCHAR(32), NULL) - Contact phone number
- `email` (VARCHAR(255), NULL) - Contact email
- `website` (VARCHAR(255), NULL) - Company website
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NULL) - Last update timestamp

**Indexes:**
- Primary key on `id`
- Index on `nif` (for uniqueness checks and lookups)

**Relationships:**
- Company 1 — 1..* Store (a company can have many stores)

**Business Rules:**
- `nif` must validate against Portuguese NIF format when used for invoicing
- Only `Owner` role users may update core fiscal fields (NIF, tax_regime)
- NIF must be unique across all companies

---

## Method Specifications

### 1. `save(company: Company): Promise<Company>`

**Purpose:**  
Persist a new company entity. This method handles company creation and is used during business profile setup.

**Input Parameters:**
- `company` (Company): Company entity to persist
  - `id` is null/undefined (new company)
  - Required fields: `name`, `nif`, `address`, `tax_regime`
  - Optional fields: `default_vat_rate`, `phone`, `email`, `website`

**Output Type:**
- `Promise<Company>`: Returns the persisted company entity with all fields populated, including generated `id`, `created_at`, and `updated_at` timestamps

**Error Conditions:**
- `CompanyValidationError`: If required fields are missing or invalid
- `InvalidNifError`: If `nif` does not match Portuguese NIF format
- `DuplicateNifError`: If `nif` already exists in system
- `InvalidAddressError`: If `address` structure is invalid
- `InvalidVatRateError`: If `default_vat_rate` is outside valid range (0.00 to 100.00)
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- NIF uniqueness check should be within the same transaction

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `created_at` and `updated_at` to current timestamp
- Validates Portuguese NIF format (9 digits with checksum)
- Checks NIF uniqueness before persisting
- Stores `address` as JSON in database
- Returns the complete company entity with all fields

**Related Use Cases:**
- UC-ADMIN-001: Create Company Profile

---

### 2. `findById(id: UUID): Promise<Company | null>`

**Purpose:**  
Retrieve a company entity by its unique identifier. Used for company lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Company identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<Company | null>`: Returns the company entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete company entity with all fields
- Returns `null` if company with given `id` does not exist
- Should use primary key index for efficient lookup
- Parses JSON field (`address`) from database
- Does not filter by any criteria (pure ID lookup)

**Related Use Cases:**
- UC-ADMIN-001: Create Company Profile (validation)
- UC-ADMIN-002: Update Company Profile
- UC-ADMIN-003: Create Store (company validation)
- UC-ADMIN-004: Update Store (company access check)
- UC-FIN-001: Create Invoice Draft (company validation)
- UC-FIN-002: Issue Invoice (NIF validation)
- UC-FIN-008: Create Financial Export (company validation)

---

### 3. `update(company: Company): Promise<Company>`

**Purpose:**  
Update an existing company entity. Used for modifying company information, fiscal data, and contact details.

**Input Parameters:**
- `company` (Company): Company entity with updated fields
  - `id` must be valid UUID of existing company
  - Only provided fields are updated (partial update)
  - Required fields cannot be set to null (business rule validation in application layer)

**Output Type:**
- `Promise<Company>`: Returns the updated company entity with all fields

**Error Conditions:**
- `CompanyNotFoundError`: If company with given `id` does not exist
- `CompanyValidationError`: If updated fields are invalid
- `InvalidNifError`: If `nif` is being updated and does not match Portuguese NIF format
- `DuplicateNifError`: If `nif` is being updated and already exists (excluding current company)
- `InvalidAddressError`: If `address` is being updated and structure is invalid
- `InvalidVatRateError`: If `default_vat_rate` is being updated and is outside valid range
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- NIF uniqueness check should be within the same transaction if NIF is being updated

**Notes on Expected Behaviour:**
- Updates only provided fields (partial update)
- Preserves `created_at` timestamp
- Updates `updated_at` timestamp to current time
- Validates Portuguese NIF format if `nif` is being updated
- Checks NIF uniqueness if `nif` is being updated (excluding current company)
- Stores `address` as JSON in database if being updated
- Returns complete updated company entity

**Related Use Cases:**
- UC-ADMIN-002: Update Company Profile

---

### 4. `findByNif(nif: string): Promise<Company | null>`

**Purpose:**  
Retrieve a company entity by its NIF (Portuguese fiscal number). Used for NIF uniqueness checks and company lookup by fiscal identifier.

**Input Parameters:**
- `nif` (string): Portuguese NIF (Número de Identificação Fiscal)
  - Must be non-empty string
  - Must not be null or undefined
  - Should be in Portuguese NIF format (9 digits with checksum)

**Output Type:**
- `Promise<Company | null>`: Returns the company entity if found, `null` if not found

**Error Conditions:**
- `InvalidNifError`: If `nif` is empty or null
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Searches for company where `nif` matches exactly
- Uses index on `nif` for efficient lookup
- Returns first match if multiple companies with same NIF exist (should not happen due to uniqueness constraint)
- Returns `null` if no company found with given NIF
- Parses JSON field (`address`) from database
- Used for NIF uniqueness validation during create and update operations

**Sorting and Filtering Rules:**
- Exact NIF match (case-sensitive or case-insensitive, business rule dependent)
- No filtering applied (pure NIF lookup)

**Related Use Cases:**
- UC-ADMIN-001: Create Company Profile (NIF uniqueness check)
- UC-ADMIN-002: Update Company Profile (NIF uniqueness check excluding current company)

---

### 5. `findAll(): Promise<Company[]>`

**Purpose:**  
Retrieve all companies in the system. Used for company listing and selection operations.

**Input Parameters:**
- None

**Output Type:**
- `Promise<Company[]>`: Returns array of all company entities
  - Returns empty array `[]` if no companies exist

**Error Conditions:**
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns all companies without filtering
- Returns companies in no specific order (database-dependent)
- Parses JSON field (`address`) from database
- Should be used with caution if system supports multiple companies (consider pagination)
- Used for company selection in administrative operations

**Sorting and Filtering Rules:**
- No default sorting applied
- No filtering applied
- Application layer may sort by `name` or `created_at`

**Related Use Cases:**
- Company listing operations
- Company selection in administrative workflows

---

### 6. `exists(id: UUID): Promise<boolean>`

**Purpose:**  
Check if a company with the given ID exists. Used for quick existence validation without loading the full entity.

**Input Parameters:**
- `id` (UUID): Company identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<boolean>`: Returns `true` if company exists, `false` otherwise

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Uses efficient EXISTS query or COUNT query
- Returns boolean value (true/false)
- Does not load company entity (more efficient than `findById()` for existence checks)
- Uses primary key index for efficient lookup
- Used for validation before operations that require company existence

**Related Use Cases:**
- Company validation in store creation
- Company validation in invoice creation
- Company access checks

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()` and `exists()`
   - Index on `nif` for `findByNif()` and uniqueness checks

2. **Query Optimization:**
   - Use efficient queries for existence checks
   - Consider caching company data if frequently accessed
   - Use `exists()` instead of `findById()` when only existence check is needed

### Data Integrity

1. **Foreign Key Constraints:**
   - Stores reference company via `company_id` (enforced by database)
   - Invoices reference company via `company_id` (enforced by database)
   - Financial exports reference company via `company_id` (enforced by database)

2. **Validation:**
   - `nif` must be unique (enforced by database unique constraint or application logic)
   - `nif` must match Portuguese NIF format (validated in application layer)
   - `default_vat_rate` must be between 0.00 and 100.00 (validated in application layer)
   - `address` must have valid JSON structure (validated in application layer)

3. **Business Rules:**
   - NIF uniqueness is critical for fiscal compliance
   - Fiscal fields (NIF, tax_regime) can only be updated by Owner role
   - Company is the root entity for multi-store operations

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`save`, `update`) should be within transactions
- NIF uniqueness checks should be within the same transaction as company creation/update

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- NIF format validation should occur in application layer before repository call

### Business Rules

1. **NIF Validation:**
   - Portuguese NIF validation requires implementing checksum algorithm
   - NIF must be unique across all companies
   - NIF format: 9 digits with checksum validation

2. **Fiscal Compliance:**
   - Company fiscal data is used in invoice generation
   - Fiscal fields are protected (Owner role only for updates)
   - Default VAT rate is used when product/service VAT rate is not specified

3. **Multi-Company Support:**
   - System may support single or multiple companies per installation
   - Company is the root entity for stores, invoices, and financial operations

---

## Related Repositories

- **StoreRepository:** For managing stores associated with company
- **InvoiceRepository:** For invoices linked to company
- **FinancialExportRepository:** For financial exports linked to company
- **AuditLogRepository:** For logging company operations (handled by application layer)

---

## Future Enhancements

Potential additional methods for future use cases:

- `findByTaxRegime(taxRegime: string): Promise<Company[]>` - Find companies by tax regime
- `getCompanyStatistics(companyId: UUID): Promise<CompanyStatistics>` - Get company statistics
- `validateNif(nif: string): Promise<boolean>` - Validate NIF format and checksum
- `search(criteria: SearchCriteria, pagination: Pagination): Promise<PaginatedResult<Company>>` - Search companies with filters

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

