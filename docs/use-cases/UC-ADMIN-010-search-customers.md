# Use Case UC-ADMIN-010: Search Customers

## 1. Objective

Search and filter customer records by various criteria including name, email, phone, and other attributes. Supports pagination for large result sets. Used for finding customers during appointment booking, POS checkout, and administrative tasks.

## 2. Actors and Permissions

**Primary Actor:** Staff, Manager, Accountant

**Secondary Actors:** None

**Required Permissions:**
- Role: `Staff`, `Manager`, `Accountant`, or `Owner`
- Permission: `customers:read` or `customers:search`

**Authorization Rules:**
- Users with `Staff`, `Manager`, `Accountant`, or `Owner` role can search customers
- System must validate role before allowing search operations
- Search results may be filtered by store access (business rule dependent)

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Staff`, `Manager`, `Accountant`, or `Owner` role assigned
3. Database is accessible and customer records exist (or empty result set returned)

## 4. Postconditions

1. Search query is executed against customer records
2. Results are filtered by search criteria and pagination parameters
3. Results are sorted according to sort parameter
4. Pagination metadata is calculated (total count, page number, per_page)
5. Customer list is returned with pagination information
6. Search operation is logged in audit logs (optional, for sensitive searches)

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `q` | String | No | Max 255 chars | General search query (searches name, email, phone) |
| `email` | String | No | Valid email format | Filter by exact email match |
| `phone` | String | No | Max 32 chars | Filter by phone number (partial or exact) |
| `full_name` | String | No | Max 255 chars | Filter by name (partial match) |
| `consent_marketing` | Boolean | No | true/false | Filter by marketing consent |
| `consent_reminders` | Boolean | No | true/false | Filter by reminders consent |
| `archived` | Boolean | No | true/false | Include/exclude archived customers (defaults to false) |
| `page` | Integer | No | Min 1, default 1 | Page number for pagination |
| `per_page` | Integer | No | Min 1, max 100, default 20 | Number of results per page |
| `sort` | String | No | "name", "email", "created_at", "-name", etc. | Sort field and direction ("-" prefix for descending) |

**Search Query (`q`):**
- Searches across: `full_name`, `email`, `phone`
- Partial match (LIKE query)
- Case-insensitive

**Sort Options:**
- `name` or `-name`: Sort by full_name ascending/descending
- `email` or `-email`: Sort by email ascending/descending
- `created_at` or `-created_at`: Sort by creation date ascending/descending
- Default: `created_at` descending (newest first)

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `items` | Array[Customer] | Array of customer objects matching search criteria |
| `meta` | Object | Pagination and search metadata |
| `meta.total` | Integer | Total number of matching customers |
| `meta.page` | Integer | Current page number |
| `meta.per_page` | Integer | Results per page |
| `meta.total_pages` | Integer | Total number of pages |
| `meta.has_next` | Boolean | Whether next page exists |
| `meta.has_previous` | Boolean | Whether previous page exists |

**Customer Object (in items array):**
- `id` (UUID)
- `full_name` (String)
- `email` (String, nullable)
- `phone` (String, nullable)
- `address` (JSON Object, nullable)
- `consent_marketing` (Boolean)
- `consent_reminders` (Boolean)
- `created_at` (DateTime)
- `updated_at` (DateTime)

## 7. Main Flow

1. System receives search request with query parameters
2. System validates user authentication and role (`Staff`, `Manager`, `Accountant`, or `Owner`)
3. System validates pagination parameters (`page` >= 1, `per_page` between 1 and 100)
4. System validates sort parameter (valid field and direction)
5. System builds database query with filters:
   - If `q` provided: search `full_name`, `email`, `phone` (partial match, case-insensitive)
   - If `email` provided: exact match on email (case-insensitive)
   - If `phone` provided: partial match on phone
   - If `full_name` provided: partial match on full_name (case-insensitive)
   - If `consent_marketing` provided: filter by consent_marketing boolean
   - If `consent_reminders` provided: filter by consent_reminders boolean
   - If `archived` not provided or false: exclude archived customers (archived = false or archived_at IS NULL)
   - If `archived` = true: include only archived customers
6. System applies sorting according to `sort` parameter (default: `created_at` descending)
7. System calculates total count of matching records (before pagination)
8. System applies pagination (LIMIT and OFFSET based on `page` and `per_page`)
9. System executes query and retrieves customer records
10. System calculates pagination metadata (total_pages, has_next, has_previous)
11. System returns customer list with pagination metadata

## 8. Alternative Flows

### 8.1. Invalid Pagination Parameters
- **Trigger:** Step 3 detects invalid pagination (page < 1 or per_page outside range)
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Page must be >= 1 and per_page must be between 1 and 100"
  - Use case terminates

### 8.2. Invalid Sort Parameter
- **Trigger:** Step 4 detects invalid sort field
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Invalid sort field. Valid fields: name, email, created_at"
  - Use case terminates

### 8.3. No Results Found
- **Trigger:** Step 9 returns empty result set
- **Action:**
  - System returns success with empty `items` array and `meta.total = 0`
  - Use case completes normally

### 8.4. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Staff, Manager, Accountant, or Owner role can search customers"
  - Use case terminates

### 8.5. Database Error
- **Trigger:** Step 9 encounters database error
- **Action:**
  - System returns error `500 Internal Server Error`
  - Error message: "An error occurred while searching customers"
  - Use case terminates

## 9. Business Rules

**BR1:** Archived customers are excluded from search results by default. Set `archived=true` to include archived customers.

**BR2:** Search is case-insensitive for text fields (name, email, phone).

**BR3:** General search query (`q`) searches across multiple fields (name, email, phone) for convenience.

**BR4:** Exact email match is supported for precise lookups (e.g., during login or account recovery).

**BR5:** Pagination is required for performance. Large result sets are paginated to prevent performance issues.

**BR6:** Search results may be filtered by store access if business rules require store-scoped customer visibility.

**BR7:** Search operations are logged in audit logs if sensitive data is accessed (business rule dependent).

**BR8:** Default sort order is newest first (`created_at` descending) for administrative convenience.

## 10. Validation Rules

1. **Pagination Validation:**
   - `page`: Must be integer >= 1, defaults to 1
   - `per_page`: Must be integer between 1 and 100, defaults to 20

2. **Sort Validation:**
   - Must be valid field: "name", "email", "created_at"
   - Optional "-" prefix for descending order
   - Default: "created_at" (or "-created_at" for descending)

3. **Search Query Validation:**
   - `q`: Maximum 255 characters
   - Searches: full_name, email, phone (partial match)

4. **Filter Validation:**
   - `email`: Must be valid email format if provided
   - `phone`: Maximum 32 characters
   - `full_name`: Maximum 255 characters
   - `consent_marketing`: Boolean value
   - `consent_reminders`: Boolean value
   - `archived`: Boolean value, defaults to false

5. **Result Limit:**
   - Maximum 100 results per page to prevent performance issues

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_PAGINATION` | "Page must be >= 1 and per_page between 1 and 100" | Invalid pagination parameters |
| 400 | `INVALID_SORT` | "Invalid sort field" | Sort field not recognized |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Staff, Manager, Accountant, or Owner role can search customers" | User lacks required role |
| 500 | `INTERNAL_ERROR` | "An error occurred while searching customers" | System error during search |

## 12. Events Triggered

**Domain Events:**
- None (search is read-only operation)

**System Events:**
- Audit log entry may be created for sensitive searches (business rule dependent)

**Integration Events:**
- None (search is internal operation)

## 13. Repository Methods Required

**CustomerRepository Interface:**
- `search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<Customer>>` - Execute search with pagination
- `count(criteria: SearchCriteria): Promise<number>` - Count matching records

**SearchCriteria Object:**
- `q?: string` - General search query
- `email?: string` - Email filter
- `phone?: string` - Phone filter
- `full_name?: string` - Name filter
- `consent_marketing?: boolean` - Marketing consent filter
- `consent_reminders?: boolean` - Reminders consent filter
- `archived?: boolean` - Archive status filter

**Pagination Object:**
- `page: number` - Page number
- `per_page: number` - Results per page

**Sort Object:**
- `field: string` - Sort field
- `direction: 'asc' | 'desc'` - Sort direction

## 14. Notes or Limitations

1. **Performance:** Search operations should use database indexes on `email`, `phone`, and `full_name` for efficient queries.

2. **Full-Text Search:** Consider implementing full-text search for better search capabilities (PostgreSQL full-text search or Elasticsearch).

3. **Result Caching:** Search results may be cached for frequently accessed queries to improve performance.

4. **Pagination:** Large result sets require pagination. Ensure efficient COUNT queries for total calculation.

5. **Archive Filtering:** Archived customers are excluded by default. Ensure proper filtering logic.

6. **Store Scoping:** Consider business rules for store-scoped customer visibility (customers visible only to assigned stores).

7. **GDPR Compliance:** Search results may contain personal data. Ensure proper access controls and audit logging.

8. **Future Enhancements:** Consider adding:
   - Advanced filters (date ranges, tags)
   - Export search results
   - Saved searches
   - Search suggestions/autocomplete

9. **Database Optimization:** Ensure proper indexes on searchable fields (`email`, `phone`, `full_name`, `created_at`).

10. **Security:** Search queries should be parameterized to prevent SQL injection attacks.

