# Use Case UC-INV-009: Search Stock Movements

## 1. Objective

Search and filter stock movement records by product, date range, reason, location, and user. Supports pagination for large result sets. Used for stock history tracking, audit trails, and inventory reconciliation. This use case addresses F10: Stock History requirement.

## 2. Actors and Permissions

**Primary Actor:** Staff, Manager, Accountant

**Secondary Actors:** None

**Required Permissions:**
- Role: `Staff`, `Manager`, `Accountant`, or `Owner`
- Permission: `stock-movements:read` or `stock-movements:search`

**Authorization Rules:**
- Users with `Staff`, `Manager`, `Accountant`, or `Owner` role can search stock movements
- System must validate role before allowing search operations
- Search results may be filtered by store access (business rule dependent)

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Staff`, `Manager`, `Accountant`, or `Owner` role assigned
3. Database is accessible and stock movement records exist (or empty result set returned)

## 4. Postconditions

1. Search query is executed against stock movement records
2. Results are filtered by search criteria and pagination parameters
3. Results are sorted according to sort parameter (default: most recent first)
4. Pagination metadata is calculated (total count, page number, per_page)
5. Stock movement list is returned with pagination information
6. Search operation is logged in audit logs (optional, for sensitive searches)

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `product_id` | UUID | No | Must exist if provided | Filter by product |
| `from` | Date | No | Valid date, <= to | Start date for date range filter |
| `to` | Date | No | Valid date, >= from | End date for date range filter |
| `reason` | String | No | Valid reason value | Filter by movement reason (receipt, sale, adjustment, transfer, reservation_release) |
| `location_id` | UUID | No | Must exist if provided | Filter by store/inventory location |
| `performed_by` | UUID | No | Must exist if provided | Filter by user who performed the movement |
| `reference_id` | UUID | No | Must exist if provided | Filter by reference (invoice_id, purchase_order_id, etc.) |
| `page` | Integer | No | Min 1, default 1 | Page number for pagination |
| `per_page` | Integer | No | Min 1, max 100, default 20 | Number of results per page |
| `sort` | String | No | "created_at", "-created_at", etc. | Sort field and direction ("-" prefix for descending) |

**Reason Values:**
- `receipt`: Stock received
- `sale`: Stock sold (decrement)
- `adjustment`: Manual adjustment
- `transfer`: Transfer between locations
- `reservation_release`: Reservation released

**Sort Options:**
- `created_at` or `-created_at`: Sort by creation date ascending/descending
- Default: `-created_at` (most recent first)

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `items` | Array[StockMovement] | Array of stock movement objects matching search criteria |
| `meta` | Object | Pagination and search metadata |
| `meta.total` | Integer | Total number of matching movements |
| `meta.page` | Integer | Current page number |
| `meta.per_page` | Integer | Results per page |
| `meta.total_pages` | Integer | Total number of pages |
| `meta.has_next` | Boolean | Whether next page exists |
| `meta.has_previous` | Boolean | Whether previous page exists |

**Stock Movement Object (in items array):**
- `id` (UUID)
- `product_id` (UUID)
- `product_name` (String, from product) - Denormalized for display
- `product_sku` (String, from product) - Denormalized for display
- `batch_id` (UUID, nullable)
- `batch_number` (String, nullable, from batch)
- `quantity_change` (Integer) - Positive for receipt, negative for decrement
- `reason` (String)
- `performed_by` (UUID)
- `performed_by_name` (String, from user) - Denormalized for display
- `location_id` (UUID)
- `location_name` (String, from store/location) - Denormalized for display
- `reference_id` (UUID, nullable)
- `reference_type` (String, nullable) - Type of reference (invoice, purchase_order, etc.)
- `created_at` (DateTime)

## 7. Main Flow

1. System receives search request with query parameters
2. System validates user authentication and role (`Staff`, `Manager`, `Accountant`, or `Owner`)
3. System validates pagination parameters (`page` >= 1, `per_page` between 1 and 100)
4. System validates sort parameter (valid field and direction)
5. System validates date range (`from` <= `to` if both provided)
6. System validates `reason` is valid value if provided
7. System builds database query with filters:
   - If `product_id` provided: filter by product
   - If `from` provided: filter movements with `created_at` >= from
   - If `to` provided: filter movements with `created_at` <= to
   - If `reason` provided: filter by reason
   - If `location_id` provided: filter by location
   - If `performed_by` provided: filter by user
   - If `reference_id` provided: filter by reference
8. System applies sorting according to `sort` parameter (default: `created_at` descending)
9. System calculates total count of matching records (before pagination)
10. System applies pagination (LIMIT and OFFSET based on `page` and `per_page`)
11. System executes query and retrieves stock movement records
12. System enriches results with denormalized data (product name/SKU, user name, location name)
13. System calculates pagination metadata (total_pages, has_next, has_previous)
14. System returns stock movement list with pagination metadata

## 8. Alternative Flows

### 8.1. Invalid Pagination Parameters
- **Trigger:** Step 3 detects invalid pagination (page < 1 or per_page outside range)
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Page must be >= 1 and per_page must be between 1 and 100"
  - Use case terminates

### 8.2. Invalid Date Range
- **Trigger:** Step 5 detects `from` > `to`
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Start date must be before or equal to end date"
  - Use case terminates

### 8.3. Invalid Reason
- **Trigger:** Step 6 detects invalid reason value
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Invalid reason. Valid values: receipt, sale, adjustment, transfer, reservation_release"
  - Use case terminates

### 8.4. Invalid Sort Parameter
- **Trigger:** Step 4 detects invalid sort field
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Invalid sort field. Valid fields: created_at"
  - Use case terminates

### 8.5. No Results Found
- **Trigger:** Step 11 returns empty result set
- **Action:**
  - System returns success with empty `items` array and `meta.total = 0`
  - Use case completes normally

### 8.6. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Staff, Manager, Accountant, or Owner role can search stock movements"
  - Use case terminates

### 8.7. Database Error
- **Trigger:** Step 11 encounters database error
- **Action:**
  - System returns error `500 Internal Server Error`
  - Error message: "An error occurred while searching stock movements"
  - Use case terminates

## 9. Business Rules

**BR1:** Stock movements are immutable. Search returns historical records that cannot be modified.

**BR2:** Date range filters are inclusive. Movements on start and end dates are included.

**BR3:** Pagination is required for performance. Large result sets are paginated to prevent performance issues.

**BR4:** Default sort order is most recent first (`created_at` descending) for audit trail convenience.

**BR5:** Search results include denormalized data (product name, user name) for display convenience.

**BR6:** Stock movements are retained for at least 5 years for traceability (F10 requirement).

**BR7:** Search results may be filtered by store access if business rules require store-scoped visibility.

**BR8:** Reference filtering allows finding movements linked to specific invoices, purchase orders, or transactions.

## 10. Validation Rules

1. **Pagination Validation:**
   - `page`: Must be integer >= 1, defaults to 1
   - `per_page`: Must be integer between 1 and 100, defaults to 20

2. **Date Range Validation:**
   - `from`: Valid date format (YYYY-MM-DD or ISO 8601)
   - `to`: Valid date format (YYYY-MM-DD or ISO 8601)
   - `from` <= `to` if both provided

3. **Reason Validation:**
   - Must be one of: "receipt", "sale", "adjustment", "transfer", "reservation_release"
   - Case-sensitive

4. **Sort Validation:**
   - Must be valid field: "created_at"
   - Optional "-" prefix for descending order
   - Default: "-created_at" (most recent first)

5. **Reference Validation:**
   - `product_id`, `location_id`, `performed_by`, `reference_id`: Must be valid UUID if provided

6. **Result Limit:**
   - Maximum 100 results per page to prevent performance issues

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_PAGINATION` | "Page must be >= 1 and per_page between 1 and 100" | Invalid pagination parameters |
| 400 | `INVALID_DATE_RANGE` | "Start date must be before or equal to end date" | Invalid date range |
| 400 | `INVALID_REASON` | "Invalid reason value" | Reason not recognized |
| 400 | `INVALID_SORT` | "Invalid sort field" | Sort field not recognized |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Staff, Manager, Accountant, or Owner role can search stock movements" | User lacks required role |
| 500 | `INTERNAL_ERROR` | "An error occurred while searching stock movements" | System error during search |

## 12. Events Triggered

**Domain Events:**
- None (search is read-only operation)

**System Events:**
- Audit log entry may be created for sensitive searches (business rule dependent)

**Integration Events:**
- None (search is internal operation)

## 13. Repository Methods Required

**StockMovementRepository Interface:**
- `search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<StockMovement>>` - Execute search with pagination
- `count(criteria: SearchCriteria): Promise<number>` - Count matching records

**ProductRepository Interface:**
- `findById(id: UUID): Promise<Product | null>` - Load product for denormalization

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Load user for denormalization

**StoreRepository Interface:**
- `findById(id: UUID): Promise<Store | null>` - Load store/location for denormalization

**SearchCriteria Object:**
- `product_id?: UUID` - Product filter
- `from?: Date` - Start date
- `to?: Date` - End date
- `reason?: string` - Reason filter
- `location_id?: UUID` - Location filter
- `performed_by?: UUID` - User filter
- `reference_id?: UUID` - Reference filter

**Pagination Object:**
- `page: number` - Page number
- `per_page: number` - Results per page

**Sort Object:**
- `field: string` - Sort field
- `direction: 'asc' | 'desc'` - Sort direction

## 14. Notes or Limitations

1. **Performance:** Stock movements can be numerous. Ensure proper database indexes on `product_id`, `created_at`, `reason`, `location_id`, and `performed_by`.

2. **Date Range Queries:** Date range filters should use indexed `created_at` field for efficient queries.

3. **Result Caching:** Search results may be cached for frequently accessed queries, but consider cache invalidation for recent movements.

4. **Pagination:** Large result sets require pagination. Ensure efficient COUNT queries for total calculation.

5. **Denormalization:** Consider denormalizing frequently accessed fields (product name, user name) or using database views for performance.

6. **Data Retention:** Stock movements are retained for at least 5 years (F10 requirement). Consider archival strategies for very old movements.

7. **Store Scoping:** Consider business rules for store-scoped movement visibility (movements visible only to assigned stores).

8. **Future Enhancements:** Consider adding:
   - Export search results (CSV/JSON)
   - Stock movement summaries/aggregations
   - Movement trend analysis
   - Batch-level movement filtering
   - Movement reversal tracking

9. **Database Optimization:** Ensure proper indexes on frequently filtered fields:
   - `product_id` (for product-specific history)
   - `created_at` (for date range queries)
   - `reason` (for reason filtering)
   - `location_id` (for location filtering)
   - `performed_by` (for user filtering)
   - `reference_id` (for reference filtering)

10. **Security:** Search queries should be parameterized to prevent SQL injection attacks. Stock movement history may contain sensitive inventory information.

