# Use Case UC-AUTH-006: Search Users

## 1. Objective

Search and filter user accounts by various criteria including email, name, role, store assignment, and active status. Supports pagination for large result sets. Used for user management, staff directory, and administrative reporting.

## 2. Actors and Permissions

**Primary Actor:** Manager, Owner

**Secondary Actors:** None

**Required Permissions:**
- Role: `Manager` or `Owner`
- Permission: `users:read` or `users:search`

**Authorization Rules:**
- Only `Manager` or `Owner` can search users
- System must validate role before allowing search operations
- Search results may be filtered by store access (business rule dependent)

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Manager` or `Owner` role assigned
3. Database is accessible and user records exist (or empty result set returned)

## 4. Postconditions

1. Search query is executed against user records
2. Results are filtered by search criteria and pagination parameters
3. Results are sorted according to sort parameter
4. Pagination metadata is calculated (total count, page number, per_page)
5. User list is returned with pagination information (password_hash excluded)
6. Search operation is logged in audit logs (optional, for sensitive searches)

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `q` | String | No | Max 255 chars | General search query (searches email, full_name, username) |
| `email` | String | No | Max 255 chars | Filter by email (partial match) |
| `role` | String | No | Valid role name | Filter by role (Owner, Manager, Staff, Accountant, Veterinarian) |
| `store_id` | UUID | No | Must exist | Filter by store assignment |
| `active` | Boolean | No | true/false | Filter by active status |
| `page` | Integer | No | Min 1, default 1 | Page number for pagination |
| `per_page` | Integer | No | Min 1, max 100, default 20 | Number of results per page |
| `sort` | String | No | "full_name", "email", "-created_at", etc. | Sort field and direction ("-" prefix for descending) |

**Search Query (`q`):**
- Searches across: `email`, `full_name`, `username`
- Partial match (LIKE query)
- Case-insensitive

**Sort Options:**
- `full_name` or `-full_name`: Sort by name ascending/descending
- `email` or `-email`: Sort by email ascending/descending
- `created_at` or `-created_at`: Sort by creation date ascending/descending
- Default: `full_name` ascending

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `items` | Array[User] | Array of user objects matching search criteria |
| `meta` | Object | Pagination and search metadata |
| `meta.total` | Integer | Total number of matching users |
| `meta.page` | Integer | Current page number |
| `meta.per_page` | Integer | Results per page |
| `meta.total_pages` | Integer | Total number of pages |
| `meta.has_next` | Boolean | Whether next page exists |
| `meta.has_previous` | Boolean | Whether previous page exists |

**User Object (in items array):**
- `id` (UUID)
- `email` (String)
- `full_name` (String)
- `phone` (String, nullable)
- `username` (String, nullable)
- `roles` (Array[String]) - Role names
- `store_ids` (Array[UUID]) - Assigned stores
- `active` (Boolean)
- `last_login_at` (DateTime, nullable)
- `created_at` (DateTime)
- `updated_at` (DateTime)
- `password_hash` (excluded from response for security)

## 7. Main Flow

1. System receives search request with query parameters
2. System validates user authentication and role (`Manager` or `Owner`)
3. System validates pagination parameters (`page` >= 1, `per_page` between 1 and 100)
4. System validates sort parameter (valid field and direction)
5. System builds database query with filters:
   - If `q` provided: search `email`, `full_name`, `username` (partial match, case-insensitive)
   - If `email` provided: partial match on email (case-insensitive)
   - If `role` provided: filter by role (exact match)
   - If `store_id` provided: filter users assigned to store
   - If `active` provided: filter by active status
6. System applies sorting according to `sort` parameter (default: `full_name` ascending)
7. System calculates total count of matching records (before pagination)
8. System applies pagination (LIMIT and OFFSET based on `page` and `per_page`)
9. System executes query and retrieves user records
10. System enriches results with role names and store assignments
11. System excludes sensitive fields (password_hash) from response
12. System calculates pagination metadata (total_pages, has_next, has_previous)
13. System returns user list with pagination metadata

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
  - Error message: "Invalid sort field. Valid fields: full_name, email, created_at"
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
  - Error message: "Only Manager or Owner role can search users"
  - Use case terminates

### 8.5. Database Error
- **Trigger:** Step 9 encounters database error
- **Action:**
  - System returns error `500 Internal Server Error`
  - Error message: "An error occurred while searching users"
  - Use case terminates

## 9. Business Rules

**BR1:** Search is case-insensitive for text fields (email, full_name, username).

**BR2:** General search query (`q`) searches across multiple fields for convenience.

**BR3:** Pagination is required for performance. Large result sets are paginated to prevent performance issues.

**BR4:** Sensitive fields (password_hash) are excluded from search results for security.

**BR5:** Search results include role names and store assignments for display convenience.

**BR6:** Default sort order is full_name ascending for administrative convenience.

**BR7:** Search results may be filtered by store access if business rules require store-scoped visibility.

**BR8:** Role filtering enables finding users with specific roles (e.g., all Managers, all Staff).

## 10. Validation Rules

1. **Pagination Validation:**
   - `page`: Must be integer >= 1, defaults to 1
   - `per_page`: Must be integer between 1 and 100, defaults to 20

2. **Sort Validation:**
   - Must be valid field: "full_name", "email", "created_at"
   - Optional "-" prefix for descending order
   - Default: "full_name" (ascending)

3. **Search Query Validation:**
   - `q`: Maximum 255 characters
   - Searches: email, full_name, username (partial match)

4. **Filter Validation:**
   - `email`: Maximum 255 characters
   - `role`: Must be valid role name
   - `store_id`: Must be valid UUID if provided
   - `active`: Boolean value

5. **Result Limit:**
   - Maximum 100 results per page to prevent performance issues

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_PAGINATION` | "Page must be >= 1 and per_page between 1 and 100" | Invalid pagination parameters |
| 400 | `INVALID_SORT` | "Invalid sort field" | Sort field not recognized |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Manager or Owner role can search users" | User lacks required role |
| 500 | `INTERNAL_ERROR` | "An error occurred while searching users" | System error during search |

## 12. Events Triggered

**Domain Events:**
- None (search is read-only operation)

**System Events:**
- Audit log entry may be created for sensitive searches (business rule dependent)

**Integration Events:**
- None (search is internal operation)

## 13. Repository Methods Required

**UserRepository Interface:**
- `search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<User>>` - Execute search with pagination
- `count(criteria: SearchCriteria): Promise<number>` - Count matching records

**SearchCriteria Object:**
- `q?: string` - General search query
- `email?: string` - Email filter
- `role?: string` - Role filter
- `store_id?: UUID` - Store filter
- `active?: boolean` - Active status filter

**Pagination Object:**
- `page: number` - Page number
- `per_page: number` - Results per page

**Sort Object:**
- `field: string` - Sort field
- `direction: 'asc' | 'desc'` - Sort direction

## 14. Notes or Limitations

1. **Security:** Password hashes and other sensitive fields are excluded from search results.

2. **Performance:** Search operations should use database indexes on `email`, `full_name`, `role`, and `store_id` for efficient queries.

3. **Pagination:** Large result sets require pagination. Ensure efficient COUNT queries for total calculation.

4. **Store Scoping:** Consider business rules for store-scoped user visibility (users visible only to assigned stores).

5. **Future Enhancements:** Consider adding:
   - Advanced filters (last login date, creation date range)
   - Export search results
   - User activity status (online/offline)
   - Bulk user operations

6. **Database Optimization:** Ensure proper indexes on searchable fields (`email`, `full_name`, `role`, `store_id`, `active`).

7. **Security:** Search queries should be parameterized to prevent SQL injection attacks. User data may contain sensitive information.

8. **GDPR Compliance:** User search results may contain personal data. Ensure compliance with GDPR requirements for data access.

