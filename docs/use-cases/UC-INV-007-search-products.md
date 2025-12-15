# Use Case UC-INV-007: Search Products

## 1. Objective

Search and filter product records by various criteria including SKU, name, category, supplier, and stock status. Supports pagination for large result sets. Used for product lookup during POS checkout, inventory management, and product catalog browsing.

## 2. Actors and Permissions

**Primary Actor:** Staff, Manager

**Secondary Actors:** None

**Required Permissions:**
- Role: `Staff`, `Manager`, `Accountant`, or `Owner`
- Permission: `products:read` or `products:search`

**Authorization Rules:**
- Users with `Staff`, `Manager`, `Accountant`, or `Owner` role can search products
- System must validate role before allowing search operations
- Search results may be filtered by store access (business rule dependent)

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Staff`, `Manager`, `Accountant`, or `Owner` role assigned
3. Database is accessible and product records exist (or empty result set returned)

## 4. Postconditions

1. Search query is executed against product records
2. Results are filtered by search criteria and pagination parameters
3. Results are sorted according to sort parameter
4. Pagination metadata is calculated (total count, page number, per_page)
5. Product list is returned with pagination information
6. Search operation is logged in audit logs (optional, for sensitive searches)

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `q` | String | No | Max 255 chars | General search query (searches SKU, name, description) |
| `sku` | String | No | Max 64 chars | Filter by exact SKU match |
| `name` | String | No | Max 255 chars | Filter by name (partial match) |
| `category` | String | No | Max 128 chars | Filter by category |
| `supplier_id` | UUID | No | Must exist | Filter by supplier |
| `stock_tracked` | Boolean | No | true/false | Filter by stock tracking flag |
| `low_stock` | Boolean | No | true/false | Filter products below reorder threshold |
| `page` | Integer | No | Min 1, default 1 | Page number for pagination |
| `per_page` | Integer | No | Min 1, max 100, default 20 | Number of results per page |
| `sort` | String | No | "name", "sku", "category", "-name", etc. | Sort field and direction ("-" prefix for descending) |

**Search Query (`q`):**
- Searches across: `sku`, `name`, `description`
- Partial match (LIKE query)
- Case-insensitive

**Sort Options:**
- `name` or `-name`: Sort by name ascending/descending
- `sku` or `-sku`: Sort by SKU ascending/descending
- `category` or `-category`: Sort by category ascending/descending
- `unit_price` or `-unit_price`: Sort by price ascending/descending
- Default: `name` ascending

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `items` | Array[Product] | Array of product objects matching search criteria |
| `meta` | Object | Pagination and search metadata |
| `meta.total` | Integer | Total number of matching products |
| `meta.page` | Integer | Current page number |
| `meta.per_page` | Integer | Results per page |
| `meta.total_pages` | Integer | Total number of pages |
| `meta.has_next` | Boolean | Whether next page exists |
| `meta.has_previous` | Boolean | Whether previous page exists |

**Product Object (in items array):**
- `id` (UUID)
- `sku` (String)
- `name` (String)
- `description` (String, nullable)
- `category` (String, nullable)
- `unit_price` (Decimal)
- `vat_rate` (Decimal)
- `stock_tracked` (Boolean)
- `reorder_threshold` (Integer, nullable)
- `supplier_id` (UUID, nullable)
- `current_stock` (Integer, nullable, if stock_tracked=true) - Calculated from stock movements
- `created_at` (DateTime)
- `updated_at` (DateTime)

## 7. Main Flow

1. System receives search request with query parameters
2. System validates user authentication and role (`Staff`, `Manager`, `Accountant`, or `Owner`)
3. System validates pagination parameters (`page` >= 1, `per_page` between 1 and 100)
4. System validates sort parameter (valid field and direction)
5. System builds database query with filters:
   - If `q` provided: search `sku`, `name`, `description` (partial match, case-insensitive)
   - If `sku` provided: exact match on SKU (case-insensitive)
   - If `name` provided: partial match on name (case-insensitive)
   - If `category` provided: exact match on category
   - If `supplier_id` provided: filter by supplier
   - If `stock_tracked` provided: filter by stock tracking flag
   - If `low_stock` = true: filter products where current_stock < reorder_threshold (only for stock_tracked products)
6. System applies sorting according to `sort` parameter (default: `name` ascending)
7. System calculates total count of matching records (before pagination)
8. System applies pagination (LIMIT and OFFSET based on `page` and `per_page`)
9. System executes query and retrieves product records
10. For each product, if `stock_tracked` = true, calculate current stock from stock movements
11. System calculates pagination metadata (total_pages, has_next, has_previous)
12. System returns product list with pagination metadata

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
  - Error message: "Invalid sort field. Valid fields: name, sku, category, unit_price"
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
  - Error message: "Only Staff, Manager, Accountant, or Owner role can search products"
  - Use case terminates

### 8.5. Database Error
- **Trigger:** Step 9 encounters database error
- **Action:**
  - System returns error `500 Internal Server Error`
  - Error message: "An error occurred while searching products"
  - Use case terminates

## 9. Business Rules

**BR1:** Search is case-insensitive for text fields (SKU, name, description).

**BR2:** General search query (`q`) searches across multiple fields (SKU, name, description) for convenience.

**BR3:** Exact SKU match is supported for precise lookups (e.g., during POS checkout).

**BR4:** Pagination is required for performance. Large result sets are paginated to prevent performance issues.

**BR5:** Low-stock filter only applies to products with `stock_tracked` = true. Calculation: current_stock < reorder_threshold.

**BR6:** Current stock calculation aggregates stock movements (sum of quantity_change) for stock_tracked products.

**BR7:** Search results may be filtered by store access if business rules require store-scoped product visibility.

**BR8:** Default sort order is name ascending for administrative convenience.

## 10. Validation Rules

1. **Pagination Validation:**
   - `page`: Must be integer >= 1, defaults to 1
   - `per_page`: Must be integer between 1 and 100, defaults to 20

2. **Sort Validation:**
   - Must be valid field: "name", "sku", "category", "unit_price"
   - Optional "-" prefix for descending order
   - Default: "name" (or "name" for ascending)

3. **Search Query Validation:**
   - `q`: Maximum 255 characters
   - Searches: sku, name, description (partial match)

4. **Filter Validation:**
   - `sku`: Maximum 64 characters
   - `name`: Maximum 255 characters
   - `category`: Maximum 128 characters
   - `supplier_id`: Must be valid UUID if provided
   - `stock_tracked`: Boolean value
   - `low_stock`: Boolean value

5. **Result Limit:**
   - Maximum 100 results per page to prevent performance issues

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_PAGINATION` | "Page must be >= 1 and per_page between 1 and 100" | Invalid pagination parameters |
| 400 | `INVALID_SORT` | "Invalid sort field" | Sort field not recognized |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Staff, Manager, Accountant, or Owner role can search products" | User lacks required role |
| 500 | `INTERNAL_ERROR` | "An error occurred while searching products" | System error during search |

## 12. Events Triggered

**Domain Events:**
- None (search is read-only operation)

**System Events:**
- Audit log entry may be created for sensitive searches (business rule dependent)

**Integration Events:**
- None (search is internal operation)

## 13. Repository Methods Required

**ProductRepository Interface:**
- `search(criteria: SearchCriteria, pagination: Pagination, sort: Sort): Promise<PaginatedResult<Product>>` - Execute search with pagination
- `count(criteria: SearchCriteria): Promise<number>` - Count matching records
- `calculateCurrentStock(productId: UUID): Promise<number>` - Calculate current stock from movements (for stock_tracked products)

**SearchCriteria Object:**
- `q?: string` - General search query
- `sku?: string` - SKU filter
- `name?: string` - Name filter
- `category?: string` - Category filter
- `supplier_id?: UUID` - Supplier filter
- `stock_tracked?: boolean` - Stock tracking filter
- `low_stock?: boolean` - Low stock filter

**Pagination Object:**
- `page: number` - Page number
- `per_page: number` - Results per page

**Sort Object:**
- `field: string` - Sort field
- `direction: 'asc' | 'desc'` - Sort direction

## 14. Notes or Limitations

1. **Performance:** Search operations should use database indexes on `sku`, `name`, `category`, and `supplier_id` for efficient queries.

2. **Full-Text Search:** Consider implementing full-text search for better search capabilities (PostgreSQL full-text search or Elasticsearch).

3. **Result Caching:** Search results may be cached for frequently accessed queries to improve performance.

4. **Pagination:** Large result sets require pagination. Ensure efficient COUNT queries for total calculation.

5. **Stock Calculation:** Current stock calculation for stock_tracked products aggregates stock movements. Consider caching or materialized views for performance.

6. **Low-Stock Filter:** Low-stock calculation requires joining with stock movements. Ensure efficient query optimization.

7. **Store Scoping:** Consider business rules for store-scoped product visibility (products visible only to assigned stores).

8. **Future Enhancements:** Consider adding:
   - Advanced filters (price range, VAT rate, stock status)
   - Export search results
   - Saved searches
   - Search suggestions/autocomplete
   - Product images in results

9. **Database Optimization:** Ensure proper indexes on searchable fields (`sku`, `name`, `category`, `supplier_id`, `stock_tracked`).

10. **Security:** Search queries should be parameterized to prevent SQL injection attacks.

