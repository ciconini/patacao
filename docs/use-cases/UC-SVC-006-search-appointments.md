# Use Case UC-SVC-006: Search Appointments

## 1. Objective

Search and filter appointment records by various criteria including store, staff, customer, pet, date range, and status. Supports pagination for large result sets. Used for calendar views, appointment management, and reporting.

## 2. Actors and Permissions

**Primary Actor:** Staff, Manager, Veterinarian

**Secondary Actors:** None

**Required Permissions:**
- Role: `Staff`, `Manager`, `Veterinarian`, or `Owner`
- Permission: `appointments:read` or `appointments:search`

**Authorization Rules:**
- Users with `Staff`, `Manager`, `Veterinarian`, or `Owner` role can search appointments
- System must validate role before allowing search operations
- Search results may be filtered by store access (business rule dependent)

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Staff`, `Manager`, `Veterinarian`, or `Owner` role assigned
3. Database is accessible and appointment records exist (or empty result set returned)

## 4. Postconditions

1. Search query is executed against appointment records
2. Results are filtered by search criteria and pagination parameters
3. Results are sorted according to sort parameter (default: start_at ascending)
4. Pagination metadata is calculated (total count, page number, per_page)
5. Appointment list is returned with pagination information
6. Search operation is logged in audit logs (optional, for sensitive searches)

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `store_id` | UUID | No | Must exist if provided | Filter by store |
| `staff_id` | UUID | No | Must exist if provided | Filter by assigned staff |
| `customer_id` | UUID | No | Must exist if provided | Filter by customer |
| `pet_id` | UUID | No | Must exist if provided | Filter by pet |
| `start_date` | Date | No | Valid date, <= end_date | Start date for date range filter |
| `end_date` | Date | No | Valid date, >= start_date | End date for date range filter |
| `status` | String | No | Valid status value | Filter by appointment status |
| `page` | Integer | No | Min 1, default 1 | Page number for pagination |
| `per_page` | Integer | No | Min 1, max 100, default 20 | Number of results per page |
| `sort` | String | No | "start_at", "-start_at", etc. | Sort field and direction ("-" prefix for descending) |

**Status Values:**
- `booked`: Appointment booked but not confirmed
- `confirmed`: Appointment confirmed
- `checked_in`: Customer checked in
- `completed`: Appointment completed
- `cancelled`: Appointment cancelled
- `needs-reschedule`: Appointment needs rescheduling

**Sort Options:**
- `start_at` or `-start_at`: Sort by start time ascending/descending
- `created_at` or `-created_at`: Sort by creation date ascending/descending
- Default: `start_at` ascending (earliest first)

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `items` | Array[Appointment] | Array of appointment objects matching search criteria |
| `meta` | Object | Pagination and search metadata |
| `meta.total` | Integer | Total number of matching appointments |
| `meta.page` | Integer | Current page number |
| `meta.per_page` | Integer | Results per page |
| `meta.total_pages` | Integer | Total number of pages |
| `meta.has_next` | Boolean | Whether next page exists |
| `meta.has_previous` | Boolean | Whether previous page exists |

**Appointment Object (in items array):**
- `id` (UUID)
- `store_id` (UUID)
- `store_name` (String, from store) - Denormalized for display
- `customer_id` (UUID)
- `customer_name` (String, from customer) - Denormalized for display
- `pet_id` (UUID)
- `pet_name` (String, from pet) - Denormalized for display
- `start_at` (DateTime)
- `end_at` (DateTime)
- `status` (String)
- `staff_id` (UUID, nullable)
- `staff_name` (String, from user, nullable) - Denormalized for display
- `services` (Array[Object]) - Service lines with service names
- `notes` (String, nullable)
- `created_at` (DateTime)
- `updated_at` (DateTime)

## 7. Main Flow

1. System receives search request with query parameters
2. System validates user authentication and role (`Staff`, `Manager`, `Veterinarian`, or `Owner`)
3. System validates pagination parameters (`page` >= 1, `per_page` between 1 and 100)
4. System validates sort parameter (valid field and direction)
5. System validates date range (`start_date` <= `end_date` if both provided)
6. System validates `status` is valid value if provided
7. System builds database query with filters:
   - If `store_id` provided: filter by store
   - If `staff_id` provided: filter by assigned staff
   - If `customer_id` provided: filter by customer
   - If `pet_id` provided: filter by pet
   - If `start_date` provided: filter appointments with `start_at` >= start_date
   - If `end_date` provided: filter appointments with `start_at` <= end_date
   - If `status` provided: filter by status
8. System applies store access filtering (if business rule requires store-scoped visibility)
9. System applies sorting according to `sort` parameter (default: `start_at` ascending)
10. System calculates total count of matching records (before pagination)
11. System applies pagination (LIMIT and OFFSET based on `page` and `per_page`)
12. System executes query and retrieves appointment records
13. System enriches results with denormalized data (store name, customer name, pet name, staff name, service names)
14. System calculates pagination metadata (total_pages, has_next, has_previous)
15. System returns appointment list with pagination metadata

## 8. Alternative Flows

### 8.1. Invalid Pagination Parameters
- **Trigger:** Step 3 detects invalid pagination (page < 1 or per_page outside range)
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Page must be >= 1 and per_page must be between 1 and 100"
  - Use case terminates

### 8.2. Invalid Date Range
- **Trigger:** Step 5 detects `start_date` > `end_date`
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Start date must be before or equal to end date"
  - Use case terminates

### 8.3. Invalid Status
- **Trigger:** Step 6 detects invalid status value
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Invalid status. Valid values: booked, confirmed, checked_in, completed, cancelled, needs-reschedule"
  - Use case terminates

### 8.4. Invalid Sort Parameter
- **Trigger:** Step 4 detects invalid sort field
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Invalid sort field. Valid fields: start_at, created_at"
  - Use case terminates

### 8.5. No Results Found
- **Trigger:** Step 12 returns empty result set
- **Action:**
  - System returns success with empty `items` array and `meta.total = 0`
  - Use case completes normally

### 8.6. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Staff, Manager, Veterinarian, or Owner role can search appointments"
  - Use case terminates

### 8.7. Database Error
- **Trigger:** Step 12 encounters database error
- **Action:**
  - System returns error `500 Internal Server Error`
  - Error message: "An error occurred while searching appointments"
  - Use case terminates

## 9. Business Rules

**BR1:** Search is case-insensitive for text fields (customer name, pet name).

**BR2:** Date range filters are inclusive. Appointments on start and end dates are included.

**BR3:** Pagination is required for performance. Large result sets are paginated to prevent performance issues.

**BR4:** Default sort order is `start_at` ascending (earliest first) for calendar views.

**BR5:** Search results include denormalized data (customer name, pet name, staff name) for display convenience.

**BR6:** Search results may be filtered by store access if business rules require store-scoped visibility.

**BR7:** Status filtering enables finding appointments in specific states (e.g., all confirmed appointments, all completed appointments).

**BR8:** Staff filtering enables calendar views for specific staff members.

## 10. Validation Rules

1. **Pagination Validation:**
   - `page`: Must be integer >= 1, defaults to 1
   - `per_page`: Must be integer between 1 and 100, defaults to 20

2. **Date Range Validation:**
   - `start_date`: Valid date format (YYYY-MM-DD or ISO 8601)
   - `end_date`: Valid date format (YYYY-MM-DD or ISO 8601)
   - `start_date` <= `end_date` if both provided

3. **Status Validation:**
   - Must be one of: "booked", "confirmed", "checked_in", "completed", "cancelled", "needs-reschedule"
   - Case-sensitive

4. **Sort Validation:**
   - Must be valid field: "start_at", "created_at"
   - Optional "-" prefix for descending order
   - Default: "start_at" (ascending)

5. **Reference Validation:**
   - `store_id`, `staff_id`, `customer_id`, `pet_id`: Must be valid UUID if provided

6. **Result Limit:**
   - Maximum 100 results per page to prevent performance issues

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_PAGINATION` | "Page must be >= 1 and per_page between 1 and 100" | Invalid pagination parameters |
| 400 | `INVALID_DATE_RANGE` | "Start date must be before or equal to end date" | Invalid date range |
| 400 | `INVALID_STATUS` | "Invalid status value" | Status not recognized |
| 400 | `INVALID_SORT` | "Invalid sort field" | Sort field not recognized |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Staff, Manager, Veterinarian, or Owner role can search appointments" | User lacks required role |
| 500 | `INTERNAL_ERROR` | "An error occurred while searching appointments" | System error during search |

## 12. Events Triggered

**Domain Events:**
- None (search is read-only operation)

**System Events:**
- Audit log entry may be created for sensitive searches (business rule dependent)

**Integration Events:**
- None (search is internal operation)

## 13. Repository Methods Required

**AppointmentRepository Interface:**
- `search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<Appointment>>` - Execute search with pagination
- `count(criteria: SearchCriteria): Promise<number>` - Count matching records

**StoreRepository Interface:**
- `findById(id: UUID): Promise<Store | null>` - Load store for denormalization

**CustomerRepository Interface:**
- `findById(id: UUID): Promise<Customer | null>` - Load customer for denormalization

**PetRepository Interface:**
- `findById(id: UUID): Promise<Pet | null>` - Load pet for denormalization

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Load staff for denormalization

**ServiceRepository Interface:**
- `findById(id: UUID): Promise<Service | null>` - Load service for denormalization

**SearchCriteria Object:**
- `store_id?: UUID` - Store filter
- `staff_id?: UUID` - Staff filter
- `customer_id?: UUID` - Customer filter
- `pet_id?: UUID` - Pet filter
- `start_date?: Date` - Start date
- `end_date?: Date` - End date
- `status?: string` - Status filter

**Pagination Object:**
- `page: number` - Page number
- `per_page: number` - Results per page

**Sort Object:**
- `field: string` - Sort field
- `direction: 'asc' | 'desc'` - Sort direction

## 14. Notes or Limitations

1. **Performance:** Appointment searches must respond within 500ms (N1 requirement). Ensure proper database indexes on `store_id`, `staff_id`, `customer_id`, `pet_id`, `start_at`, and `status`.

2. **Date Range Queries:** Date range filters should use indexed `start_at` field for efficient queries.

3. **Result Caching:** Search results may be cached for frequently accessed queries, but consider cache invalidation for recent appointments.

4. **Pagination:** Large result sets require pagination. Ensure efficient COUNT queries for total calculation.

5. **Denormalization:** Consider denormalizing frequently accessed fields (customer name, pet name, staff name) or using database views for performance.

6. **Store Scoping:** Consider business rules for store-scoped appointment visibility (appointments visible only to assigned stores).

7. **Calendar Views:** Search results are used for calendar views. Consider date range optimization for day/week views.

8. **Future Enhancements:** Consider adding:
   - Export search results (CSV/JSON)
   - Appointment summaries/aggregations
   - Appointment trend analysis
   - Service-based filtering
   - Recurring appointment grouping

9. **Database Optimization:** Ensure proper indexes on frequently filtered fields:
   - `store_id` (for store filtering)
   - `staff_id` (for staff calendar views)
   - `customer_id` (for customer history)
   - `pet_id` (for pet history)
   - `start_at` (for date range queries)
   - `status` (for status filtering)

10. **Security:** Search queries should be parameterized to prevent SQL injection attacks. Appointment data may contain sensitive customer/pet information.

