# Use Case UC-ADMIN-011: Import Customers

## 1. Objective

Import customer records from CSV or JSON file. Supports bulk creation of customers for data migration, initial setup, or periodic imports. Handles validation, error reporting, and partial success scenarios.

## 2. Actors and Permissions

**Primary Actor:** Manager, Owner

**Secondary Actors:** None

**Required Permissions:**
- Role: `Manager` or `Owner`
- Permission: `customers:import`

**Authorization Rules:**
- Only `Manager` or `Owner` role can import customers
- System must validate role before allowing import operations

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Manager` or `Owner` role assigned
3. Import file is provided (CSV or JSON format)
4. File size is within system limits (e.g., max 10MB)
5. System has available storage capacity for new records

## 4. Postconditions

1. Import file is parsed and validated
2. Valid customer records are created in database
3. Invalid records are identified and reported
4. Import summary is generated (successful, failed, skipped counts)
5. Audit log entry is created recording the import action
6. Import report is available for download (optional)

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `file` | File | Yes | CSV or JSON, max 10MB | Import file containing customer data |
| `format` | String | Yes | "csv" or "json" | File format |
| `skip_duplicates` | Boolean | No | true/false | Skip records with duplicate emails (defaults to true) |
| `dry_run` | Boolean | No | true/false | Validate only, do not import (defaults to false) |

**CSV Format:**
```csv
full_name,email,phone,address_street,address_city,address_postal_code,consent_marketing,consent_reminders
John Doe,john@example.com,+351912345678,Rua Example 123,Lisboa,1000-001,true,true
Jane Smith,jane@example.com,+351912345679,Rua Test 456,Porto,4000-001,false,true
```

**JSON Format:**
```json
[
  {
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+351912345678",
    "address": {
      "street": "Rua Example 123",
      "city": "Lisboa",
      "postal_code": "1000-001"
    },
    "consent_marketing": true,
    "consent_reminders": true
  }
]
```

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `import_id` | UUID | Unique identifier for this import operation |
| `status` | String | "completed", "failed", "partial" |
| `total_records` | Integer | Total number of records in file |
| `successful` | Integer | Number of successfully imported records |
| `failed` | Integer | Number of failed records |
| `skipped` | Integer | Number of skipped records (duplicates) |
| `errors` | Array[Object] | Array of error objects for failed records |
| `created_at` | DateTime | Import timestamp |

**Error Object:**
- `row_number` (Integer): Row/record number in file
- `field` (String): Field name with error (nullable)
- `message` (String): Error message
- `data` (Object): Record data that failed

## 7. Main Flow

1. System receives import request with file and parameters
2. System validates user authentication and `Manager` or `Owner` role
3. System validates file is provided and format is "csv" or "json"
4. System validates file size is within limits (max 10MB)
5. System parses file according to format (CSV or JSON)
6. System validates file structure (required columns/fields present)
7. For each record in file:
   - System validates required fields (`full_name` must be present)
   - System validates `email` format if provided
   - System validates `phone` format if provided
   - System validates `address` structure if provided
   - System checks for duplicate email if `skip_duplicates=true`
   - If `dry_run=false` and record is valid:
     - System creates customer record (see UC-ADMIN-005)
     - System increments successful counter
   - If record is invalid:
     - System records error with row number and error message
     - System increments failed counter
   - If duplicate email and `skip_duplicates=true`:
     - System skips record
     - System increments skipped counter
8. System generates import summary (successful, failed, skipped counts)
9. System creates audit log entry with action `import`, import_id, summary, and performed_by
10. If `dry_run=false`, system returns import summary with import_id
11. If `dry_run=true`, system returns validation results without creating records

## 8. Alternative Flows

### 8.1. Invalid File Format
- **Trigger:** Step 3 detects invalid format (not "csv" or "json")
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "File format must be 'csv' or 'json'"
  - Use case terminates

### 8.2. File Too Large
- **Trigger:** Step 4 detects file exceeds size limit
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "File size exceeds maximum limit of 10MB"
  - Use case terminates

### 8.3. File Parse Error
- **Trigger:** Step 5 fails to parse file (malformed CSV/JSON)
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "File could not be parsed. Please check file format"
  - Use case terminates

### 8.4. Invalid File Structure
- **Trigger:** Step 6 detects missing required columns/fields
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "File structure is invalid. Required fields: full_name"
  - Use case terminates

### 8.5. All Records Failed
- **Trigger:** Step 7 results in all records failing validation
- **Action:**
  - System returns import summary with `status="failed"`, `successful=0`, `failed=total_records`
  - System includes error details for all records
  - Use case completes (no records created)

### 8.6. Partial Success
- **Trigger:** Step 7 results in some records succeeding and some failing
- **Action:**
  - System returns import summary with `status="partial"`
  - System includes counts and error details
  - Use case completes (successful records created)

### 8.7. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Manager or Owner role can import customers"
  - Use case terminates

## 9. Business Rules

**BR1:** Import operations are restricted to `Manager` and `Owner` roles to prevent unauthorized bulk data operations.

**BR2:** Duplicate emails are skipped by default (`skip_duplicates=true`). Set `skip_duplicates=false` to fail on duplicates.

**BR3:** Dry run mode (`dry_run=true`) validates records without creating them. Useful for testing import files.

**BR4:** Import operations are atomic per record. Failed records do not roll back successful records.

**BR5:** All import operations must be logged in audit logs with summary for compliance and troubleshooting.

**BR6:** Import file size is limited to prevent system overload. Consider chunked processing for large files.

**BR7:** Validation follows same rules as customer creation (UC-ADMIN-005). Invalid records are reported but do not block valid records.

**BR8:** Import summary includes detailed error information for failed records to enable correction and re-import.

## 10. Validation Rules

1. **File Format Validation:**
   - Must be "csv" or "json"
   - File must be parseable according to format

2. **File Size Validation:**
   - Maximum 10MB file size
   - Consider chunked processing for larger files

3. **Record Validation (per record):**
   - `full_name`: Required, non-empty, max 255 chars
   - `email`: Optional, valid email format if provided
   - `phone`: Optional, valid phone format if provided
   - `address`: Optional, valid address structure if provided
   - `consent_marketing`: Optional, boolean, defaults to false
   - `consent_reminders`: Optional, boolean, defaults to true

4. **Duplicate Detection:**
   - Check email uniqueness if `skip_duplicates=true`
   - Skip duplicate records or fail based on `skip_duplicates` setting

5. **Error Reporting:**
   - Record row/line number for error location
   - Field name and error message for validation failures
   - Record data for context

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_FORMAT` | "File format must be 'csv' or 'json'" | Invalid file format |
| 400 | `FILE_TOO_LARGE` | "File size exceeds maximum limit" | File too large |
| 400 | `PARSE_ERROR` | "File could not be parsed" | File parsing failed |
| 400 | `INVALID_STRUCTURE` | "File structure is invalid" | Missing required fields |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Manager or Owner role can import customers" | User lacks role |
| 500 | `INTERNAL_ERROR` | "An error occurred during import" | System error |

## 12. Events Triggered

**Domain Events:**
- `CustomerImportStarted` event is published with payload:
  - `import_id` (UUID)
  - `total_records` (Integer)
  - `imported_by` (User ID)
  - `timestamp` (DateTime)

- `CustomerImportCompleted` event is published with payload:
  - `import_id` (UUID)
  - `status` (String)
  - `successful` (Integer)
  - `failed` (Integer)
  - `skipped` (Integer)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="CustomerImport", action="import", import_id, and summary

**Integration Events:**
- None (import is internal administrative action)

## 13. Repository Methods Required

**CustomerRepository Interface:**
- `save(customer: Customer): Promise<Customer>` - Create customer (see UC-ADMIN-005)
- `findByEmail(email: string): Promise<Customer | null>` - Check duplicate emails

**ImportRepository Interface (optional):**
- `saveImport(import: Import): Promise<Import>` - Store import record
- `findImportById(id: UUID): Promise<Import | null>` - Retrieve import record

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**FileParser Interface:**
- `parseCSV(file: File): Promise<Record[]>` - Parse CSV file
- `parseJSON(file: File): Promise<Record[]>` - Parse JSON file

## 14. Notes or Limitations

1. **File Size Limits:** Large files may require chunked processing or background job processing.

2. **Performance:** Import operations can be time-consuming. Consider asynchronous processing for large files.

3. **Error Handling:** Partial success scenarios require careful error reporting. Ensure users can identify and fix failed records.

4. **Duplicate Handling:** Duplicate detection uses email. Consider additional duplicate detection logic (phone, name).

5. **Transaction Safety:** Import operations are not fully atomic. Failed records do not roll back successful records. Consider transaction per record or batch.

6. **Validation:** Validation follows customer creation rules. Ensure consistent validation logic.

7. **Audit Trail:** All import operations must be logged for compliance and troubleshooting.

8. **Future Enhancements:** Consider adding:
   - Import templates/download
   - Scheduled imports
   - Import history/reports
   - Bulk update via import
   - Data mapping/transformation

9. **Security:** File uploads should be validated and sanitized to prevent security vulnerabilities.

10. **GDPR Compliance:** Import operations may involve personal data. Ensure proper access controls and audit logging.

