# Repository Interface Contract: AuditLogRepository

## Overview

The `AuditLogRepository` interface defines the contract for audit log data persistence operations in the Petshop Management System. This repository belongs to the Application/Domain Ports layer in the Clean/Hexagonal Architecture and provides abstraction for audit log entity operations, including audit trail recording, compliance tracking, and security monitoring.

**Entity:** `AuditLog`  
**Table:** `audit_logs`  
**Module:** Audit & Operational (Cross-cutting)

## Entity Structure

Based on the ER model, the `AuditLog` entity has the following attributes:

- `id` (UUID, PRIMARY KEY) - Unique identifier
- `entity_type` (VARCHAR(128), NOT NULL) - Type of entity being audited (e.g., "User", "Invoice", "Product", "Appointment")
- `entity_id` (UUID, NOT NULL) - Identifier of the entity being audited
- `action` (VARCHAR(64), NOT NULL) - Action performed: create, update, delete, void, login, etc.
- `performed_by` (UUID, NOT NULL, FK -> users(id)) - User who performed the action
- `timestamp` (DATETIME, NOT NULL) - When the action was performed
- `meta` (JSON, NULL) - Additional metadata (before/after snapshots, IP address, user agent, reason, etc.)

**Indexes:**
- Primary key on `id`
- Composite index on `entity_type, entity_id` (for entity-specific audit trail queries)
- Index on `performed_by` (for user-specific audit trail queries)

**Relationships:**
- AuditLog * — 1 User (via `performed_by`)
- AuditLog 0..* — references any entity (polymorphic relationship via `entity_type` and `entity_id`)

**Business Rules:**
- AuditLog entries are append-only; editing is not allowed
- Logs must be searchable by admin roles (Owner, Manager, Auditor/Accountant)
- All create/update/delete operations are logged
- Audit logs include user, timestamp, and before/after values
- Required for compliance and troubleshooting

---

## Method Specifications

### 1. `create(auditLog: AuditLog): Promise<AuditLog>`

**Purpose:**  
Persist a new audit log entry. This method handles audit log creation and is used throughout the system to record all significant operations for compliance, security monitoring, and troubleshooting.

**Input Parameters:**
- `auditLog` (AuditLog): Audit log entity to persist
  - `id` is null/undefined (new audit log)
  - Required fields: `entity_type`, `entity_id`, `action`, `performed_by`, `timestamp`
  - Optional fields: `meta` (JSON with before/after snapshots, IP address, user agent, reason, etc.)

**Output Type:**
- `Promise<AuditLog>`: Returns the persisted audit log entity with all fields populated, including generated `id` and `timestamp`

**Error Conditions:**
- `AuditLogValidationError`: If required fields are missing or invalid
- `InvalidEntityTypeError`: If `entity_type` is empty or whitespace-only
- `InvalidEntityIdError`: If `entity_id` is not a valid UUID format
- `InvalidActionError`: If `action` is empty or whitespace-only
- `UserNotFoundError`: If `performed_by` does not exist
- `InvalidTimestampError`: If `timestamp` is in the future
- `InvalidMetaError`: If `meta` is provided and is not valid JSON
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Should be executed within a database transaction
- Transaction should be managed by the calling use case or application service
- User existence validation should be within the same transaction
- Should not fail the main operation if audit log creation fails (best effort, but log the failure)

**Notes on Expected Behaviour:**
- Generates UUID for `id`
- Sets `timestamp` to current timestamp if not provided (or uses provided timestamp)
- Validates that `performed_by` references existing user
- Validates `entity_type` is non-empty string
- Validates `entity_id` is valid UUID format
- Validates `action` is non-empty string
- Validates `meta` is valid JSON if provided
- Stores `meta` as JSON in database
- Returns the complete audit log entity with all fields
- Audit logs are append-only (cannot be updated or deleted after creation)
- Should not throw errors that would fail the main operation (best effort logging)

**Related Use Cases:**
- All use cases that perform create/update/delete operations
- UC-AUTH-001: User Login (login attempts)
- UC-ADMIN-005: Create Customer
- UC-ADMIN-006: Update Customer
- UC-ADMIN-007: Archive Customer
- UC-ADMIN-008: Create Pet
- UC-ADMIN-009: Create User Staff
- UC-INV-005: Create Product
- UC-INV-006: Update Product
- UC-INV-008: Create Supplier
- UC-INV-011: Create Purchase Order
- UC-INV-012: Receive Purchase Order
- UC-INV-010: Release Inventory Reservation
- UC-SVC-001: Create Service
- UC-SVC-002: Create Appointment
- UC-SVC-003: Confirm Appointment
- UC-SVC-004: Complete Appointment
- UC-SVC-005: Cancel Appointment
- UC-FIN-001: Create Invoice (Draft)
- UC-FIN-002: Issue Invoice
- UC-FIN-003: Mark Invoice as Paid
- UC-FIN-004: Void Invoice
- UC-FIN-005: Create Credit Note
- UC-FIN-006: Create Transaction
- UC-FIN-007: Complete Transaction
- UC-FIN-008: Create Financial Export

---

### 2. `findById(id: UUID): Promise<AuditLog | null>`

**Purpose:**  
Retrieve an audit log entry by its unique identifier. Used for audit log lookup, validation, and detail retrieval.

**Input Parameters:**
- `id` (UUID): Audit log identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<AuditLog | null>`: Returns the audit log entity if found, `null` if not found

**Error Conditions:**
- `InvalidUUIDError`: If `id` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Returns complete audit log entity with all fields
- Returns `null` if audit log with given `id` does not exist
- Should use primary key index for efficient lookup
- Does not filter by any criteria (pure ID lookup)
- Parses JSON field (`meta`) from database

**Related Use Cases:**
- Audit log detail retrieval

---

### 3. `search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<AuditLog>>`

**Purpose:**  
Search and filter audit log records by various criteria with pagination and sorting. Used for audit trail access, compliance reporting, and security monitoring.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object
  - `entity_type?: string` - Filter by entity type (exact match)
  - `entity_id?: UUID` - Filter by entity ID
  - `performed_by?: UUID` - Filter by user who performed action
  - `action?: string` - Filter by action (exact match)
  - `from?: Date` - Start date (filter by `timestamp`)
  - `to?: Date` - End date (filter by `timestamp`)
- `pagination` (Pagination): Pagination parameters
  - `page: number` - Page number (min 1, default 1)
  - `per_page: number` - Results per page (min 1, max 100, default 20)
- `sort` (Sort): Sort parameters
  - `field: string` - Sort field ("timestamp", "entity_type", "action", "performed_by")
  - `direction: 'asc' | 'desc'` - Sort direction (default: "desc" for timestamp)

**Output Type:**
- `Promise<PaginatedResult<AuditLog>>`: Returns paginated result with:
  - `items: AuditLog[]` - Array of audit log entities matching criteria
  - `meta: PaginationMeta` - Pagination metadata (total, page, per_page, total_pages, has_next, has_previous)

**Error Conditions:**
- `InvalidPaginationError`: If pagination parameters are invalid
- `InvalidSortError`: If sort field is invalid
- `InvalidDateRangeError`: If `from` > `to`
- `InvalidUUIDError`: If `entity_id` or `performed_by` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Builds query with filters based on criteria
- Date range filters use `timestamp` field (audit logs with `timestamp` between `from` and `to`, inclusive)
- Entity type filter uses exact match (case-sensitive)
- Action filter uses exact match (case-sensitive)
- Entity ID and performed_by filters use exact match
- Uses composite index on `entity_type, entity_id` for efficient entity-specific queries
- Uses index on `performed_by` for efficient user-specific queries
- Returns audit logs in no specific order if no sort specified (default: `timestamp` descending, most recent first)
- Returns empty array if no results found
- Parses JSON field (`meta`) from database for each result

**Pagination Rules:**
- Default page: 1
- Default per_page: 20
- Maximum per_page: 100
- Returns empty array if no results found
- Total count calculated before pagination

**Sorting and Filtering Rules:**
- Valid sort fields: "timestamp", "entity_type", "action", "performed_by"
- Default sort: "timestamp" descending (most recent first)
- Date range filters are inclusive (audit logs on start and end dates are included)
- Entity type and action filters use exact match (case-sensitive)
- Entity ID and performed_by filters use exact match

**Related Use Cases:**
- Audit log listing operations (GET /audit-logs endpoint)

---

### 4. `count(criteria: SearchCriteria): Promise<number>`

**Purpose:**  
Count the number of audit log entries matching search criteria. Used for pagination metadata calculation and audit statistics.

**Input Parameters:**
- `criteria` (SearchCriteria): Search criteria object (same as `search()` method)
  - `entity_type?: string` - Filter by entity type
  - `entity_id?: UUID` - Filter by entity ID
  - `performed_by?: UUID` - Filter by user
  - `action?: string` - Filter by action
  - `from?: Date` - Start date
  - `to?: Date` - End date

**Output Type:**
- `Promise<number>`: Returns count of matching audit log entries (integer >= 0)

**Error Conditions:**
- `InvalidDateRangeError`: If `from` > `to`
- `InvalidUUIDError`: If `entity_id` or `performed_by` is not a valid UUID format
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
- Audit log listing operations (pagination metadata)

---

### 5. `findByEntity(entityType: string, entityId: UUID): Promise<AuditLog[]>`

**Purpose:**  
Retrieve all audit log entries for a specific entity. Used for entity-specific audit trail and change history.

**Input Parameters:**
- `entityType` (string): Entity type
  - Must be non-empty string
  - Must not be null or undefined
- `entityId` (UUID): Entity identifier
  - Must be valid UUID format
  - Must not be null or undefined

**Output Type:**
- `Promise<AuditLog[]>`: Returns array of audit log entities for the entity
  - Returns empty array `[]` if entity has no audit logs
  - Returns empty array `[]` if entity does not exist (no error thrown)

**Error Conditions:**
- `InvalidEntityTypeError`: If `entityType` is empty or null
- `InvalidUUIDError`: If `entityId` is not a valid UUID format
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters audit logs where `entity_type = entityType` AND `entity_id = entityId`
- Uses composite index on `entity_type, entity_id` for efficient query
- Returns audit logs in no specific order (database-dependent)
- Returns empty array if no audit logs found for entity
- Used for entity-specific audit trail and change history
- Parses JSON field (`meta`) from database for each result

**Sorting and Filtering Rules:**
- Filters by entity type and entity ID
- No default sorting applied
- Application layer may sort by `timestamp` descending (most recent first)

**Related Use Cases:**
- Entity change history
- Audit trail for specific entities

---

### 6. `findByPerformedBy(performedBy: UUID, dateRange?: DateRange): Promise<AuditLog[]>`

**Purpose:**  
Retrieve all audit log entries for actions performed by a specific user, optionally filtered by date range. Used for user activity monitoring and security auditing.

**Input Parameters:**
- `performedBy` (UUID): User identifier
  - Must be valid UUID format
  - Must not be null or undefined
- `dateRange` (DateRange, optional): Optional date range filter
  - `from?: Date` - Start date
  - `to?: Date` - End date

**Output Type:**
- `Promise<AuditLog[]>`: Returns array of audit log entities for the user
  - Returns empty array `[]` if user has no audit logs
  - Returns empty array `[]` if user does not exist (no error thrown)

**Error Conditions:**
- `InvalidUUIDError`: If `performedBy` is not a valid UUID format
- `InvalidDateRangeError`: If `dateRange` is provided and `from` > `to`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters audit logs where `performed_by = performedBy`
- If `dateRange` provided, filters by `timestamp` between `from` and `to` (inclusive)
- Uses index on `performed_by` for efficient query
- Returns audit logs in no specific order (database-dependent)
- Returns empty array if no audit logs found for user
- Used for user activity monitoring and security auditing
- Parses JSON field (`meta`) from database for each result

**Sorting and Filtering Rules:**
- Filters by user and optional date range
- No default sorting applied
- Application layer may sort by `timestamp` descending (most recent first)

**Related Use Cases:**
- User activity monitoring
- Security auditing
- User behavior analysis

---

### 7. `findByAction(action: string, dateRange?: DateRange): Promise<AuditLog[]>`

**Purpose:**  
Retrieve all audit log entries for a specific action type. Used for action-specific audit reporting and monitoring.

**Input Parameters:**
- `action` (string): Action type
  - Must be non-empty string
  - Must not be null or undefined
  - Common values: "create", "update", "delete", "void", "login", "logout", "confirm", "complete", "cancel"
- `dateRange` (DateRange, optional): Optional date range filter
  - `from?: Date` - Start date
  - `to?: Date` - End date

**Output Type:**
- `Promise<AuditLog[]>`: Returns array of audit log entities with the specified action
  - Returns empty array `[]` if no audit logs found with given action

**Error Conditions:**
- `InvalidActionError`: If `action` is empty or null
- `InvalidDateRangeError`: If `dateRange` is provided and `from` > `to`
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters audit logs where `action = action` (exact match, case-sensitive)
- If `dateRange` provided, filters by `timestamp` between `from` and `to` (inclusive)
- Returns audit logs in no specific order (database-dependent)
- Returns empty array if no audit logs found with given action
- Used for action-specific audit reporting
- Parses JSON field (`meta`) from database for each result

**Sorting and Filtering Rules:**
- Filters by action and optional date range
- No default sorting applied
- Application layer may sort by `timestamp` descending (most recent first)

**Related Use Cases:**
- Action-specific audit reporting
- Security monitoring (e.g., all login attempts)

---

### 8. `findByDateRange(start: Date, end: Date): Promise<AuditLog[]>`

**Purpose:**  
Retrieve all audit log entries within a date range. Used for period-based audit reporting and compliance audits.

**Input Parameters:**
- `start` (Date): Start date (inclusive)
  - Must be valid date
  - Must not be null or undefined
- `end` (Date): End date (inclusive)
  - Must be valid date
  - Must not be null or undefined
  - Must be >= start

**Output Type:**
- `Promise<AuditLog[]>`: Returns array of audit log entities within the date range
  - Returns empty array `[]` if no audit logs found in date range

**Error Conditions:**
- `InvalidDateRangeError`: If `start` > `end`
- `InvalidDateError`: If `start` or `end` is invalid
- `DatabaseError`: If database operation fails

**Transaction Rules:**
- Read-only operation, no transaction required
- May be executed within a read transaction for consistency

**Notes on Expected Behaviour:**
- Filters audit logs where `timestamp` between `start` and `end` (inclusive)
- Returns audit logs in no specific order (database-dependent)
- Returns empty array if no audit logs found in date range
- Used for period-based audit reporting and compliance audits
- Parses JSON field (`meta`) from database for each result

**Sorting and Filtering Rules:**
- Filters by date range only
- No default sorting applied
- Application layer may sort by `timestamp` ascending (chronological order)

**Related Use Cases:**
- Period-based audit reporting
- Compliance audits
- System activity reports

---

## General Notes

### Performance Considerations

1. **Indexes:** All queries should leverage existing indexes:
   - Primary key index on `id` for `findById()`
   - Composite index on `entity_type, entity_id` for `findByEntity()` and entity-specific queries
   - Index on `performed_by` for `findByPerformedBy()` and user-specific queries

2. **Query Optimization:**
   - Use efficient queries for date range filtering
   - Consider partitioning audit logs by date for large volumes
   - Use pagination for large result sets
   - Consider archiving old audit logs (data retention policy)

3. **JSON Field Handling:**
   - `meta` is stored as JSON
   - Parse JSON fields when loading entities
   - Validate JSON structure when saving entities
   - Consider indexing specific JSON fields if frequently queried

### Data Integrity

1. **Foreign Key Constraints:**
   - `performed_by` must reference existing user (enforced by database)
   - Audit logs cannot be deleted (append-only, business rule)

2. **Validation:**
   - `entity_type` must be non-empty string
   - `entity_id` must be valid UUID format
   - `action` must be non-empty string
   - `timestamp` must not be in the future
   - `meta` must be valid JSON if provided

3. **Business Rules:**
   - Audit logs are append-only (cannot be updated or deleted)
   - All create/update/delete operations must be logged
   - Audit logs include user, timestamp, and before/after values
   - Required for compliance and troubleshooting

### Transaction Management

- Repository methods do not manage transactions themselves
- Transactions are managed by application services or use case handlers
- Read operations typically do not require transactions
- Write operations (`create`) should be within transactions
- Audit log creation should not fail the main operation (best effort logging)

### Error Handling

- Repository methods throw domain-specific errors, not infrastructure errors
- Database-specific errors should be caught and converted to domain errors
- Validation errors should be thrown before database operations
- Audit log creation failures should be logged but not fail the main operation

### Business Rules

1. **Append-Only:**
   - Audit logs cannot be updated or deleted after creation
   - Provides immutable audit trail for compliance
   - All changes are tracked through new audit log entries

2. **Compliance:**
   - Audit logs are required for compliance (GDPR, financial regulations)
   - Audit logs must be searchable by admin roles
   - Audit logs must include user, timestamp, and action details
   - Before/after values stored in `meta` field for update operations

3. **Security:**
   - Audit logs track all significant operations
   - Login attempts (successful and failed) are logged
   - Security-sensitive operations are logged with additional metadata (IP address, user agent)
   - Audit logs are accessible only to authorized roles (Owner, Manager, Auditor/Accountant)

4. **Data Retention:**
   - Audit logs should be retained per data retention policy
   - Old audit logs may be archived (business rule dependent)
   - GDPR compliance may require audit log retention for specific periods

---

## Related Repositories

- **UserRepository:** For user validation (performed_by)
- **All other repositories:** Audit logs reference any entity via `entity_type` and `entity_id`

---

## Future Enhancements

Potential additional methods for future use cases:

- `findByEntityType(entityType: string, dateRange?: DateRange): Promise<AuditLog[]>` - Find audit logs by entity type
- `getAuditStatistics(criteria: SearchCriteria): Promise<AuditStatistics>` - Get audit statistics
- `archiveOldLogs(retentionDays: number): Promise<number>` - Archive old audit logs
- `exportAuditLogs(criteria: SearchCriteria, format: string): Promise<ExportResult>` - Export audit logs for compliance

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

