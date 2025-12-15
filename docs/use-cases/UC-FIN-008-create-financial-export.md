# Use Case UC-FIN-008: Create Financial Export

## 1. Objective

Create a financial export containing invoices, transactions, and credit notes for a specified period. Export is generated in CSV or JSON format for accountant reconciliation and VAT reporting. Export can be downloaded immediately or queued for background processing and SFTP delivery.

## 2. Actors and Permissions

**Primary Actor:** Accountant, Owner

**Secondary Actors:** None

**Required Permissions:**
- Role: `Accountant` or `Owner`
- Permission: `financial-exports:create`

**Authorization Rules:**
- Only `Accountant` or `Owner` can create financial exports
- System must validate role before allowing export creation

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Accountant` or `Owner` role assigned
3. Company with specified `company_id` exists
4. Period dates (`period_start`, `period_end`) are valid
5. System has available storage capacity for export files

## 4. Postconditions

1. A new `FinancialExport` entity is created with status `pending` or `completed`
2. Export record is persisted in the `financial_exports` table
3. Export file is generated (CSV or JSON format)
4. Export file is stored (local storage or SFTP)
5. Export includes all invoices, transactions, and credit notes for the period
6. `created_at` timestamp is set to current server time
7. Audit log entry is created recording the export creation
8. Export is ready for download or SFTP delivery

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `company_id` | UUID | Yes | Must exist | Company identifier |
| `period_start` | Date | Yes | Valid date, <= period_end | Start date of export period (YYYY-MM-DD) |
| `period_end` | Date | Yes | Valid date, >= period_start | End date of export period (YYYY-MM-DD) |
| `format` | String | Yes | "csv" or "json" | Export file format |
| `include_voided` | Boolean | No | true/false | Include voided invoices (defaults to false) |
| `delivery_method` | String | No | "download" or "sftp" | Delivery method (defaults to "download") |

**Export Period:**
- Period dates are inclusive (includes transactions on start and end dates)
- Period cannot exceed maximum allowed range (e.g., 1 year, business rule dependent)

## 6. Outputs

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier for the export |
| `company_id` | UUID | Company identifier |
| `period_start` | Date | Export period start date |
| `period_end` | Date | Export period end date |
| `format` | String | Export format ("csv" or "json") |
| `status` | String | Export status ("pending", "processing", "completed", "failed") |
| `file_path` | String | Local file path (nullable) |
| `sftp_reference` | JSON Object | SFTP delivery reference (nullable) |
| `record_count` | Integer | Number of records exported |
| `created_by` | UUID | User who created the export |
| `created_at` | DateTime | Creation timestamp (ISO 8601) |
| `completed_at` | DateTime | Completion timestamp (nullable) |
| `download_url` | String | Download URL (nullable, if delivery_method="download") |

## 7. Main Flow

1. System receives request to create financial export with input data
2. System validates user authentication and role (`Accountant` or `Owner`)
3. System validates required fields are present (`company_id`, `period_start`, `period_end`, `format`)
4. System validates `format` is "csv" or "json"
5. System validates `period_start` and `period_end` are valid dates
6. System validates `period_start` <= `period_end`
7. System validates period range does not exceed maximum allowed (e.g., 1 year)
8. System loads company by `company_id` to verify existence
9. System queries invoices for period:
    - System filters invoices by `company_id` and `issued_at` between `period_start` and `period_end`
    - System excludes voided invoices if `include_voided=false`
    - System includes invoice lines, payment info, credit notes
10. System queries transactions for period:
    - System filters transactions by `store_id` (belonging to company) and `created_at` between dates
    - System includes transaction lines
11. System queries credit notes for period:
    - System filters credit notes by linked invoices in period
    - System includes credit note details
12. System generates export file:
    - If format is "csv": Generate CSV file with all records
    - If format is "json": Generate JSON file with structured data
13. System stores export file:
    - If `delivery_method="download"`: Store locally, generate download URL
    - If `delivery_method="sftp"`: Upload to SFTP server, store reference
14. System creates financial export record:
    - System sets `status` to "completed" (or "pending" if queued)
    - System sets `file_path` or `sftp_reference`
    - System sets `record_count` to number of records exported
    - System sets `created_by` to current user ID
    - System sets `created_at` to current timestamp
15. System persists export record to `financial_exports` table
16. System creates audit log entry with action `create`, entity_type `FinancialExport`, entity_id, period, and performed_by
17. System returns export object with download URL or SFTP reference

## 8. Alternative Flows

### 8.1. Company Not Found
- **Trigger:** Step 8 finds no company with given `company_id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Company not found"
  - Use case terminates

### 8.2. Invalid Date Format
- **Trigger:** Step 5 detects invalid date format
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Date format must be YYYY-MM-DD"
  - Use case terminates

### 8.3. Invalid Period Range
- **Trigger:** Step 6 detects `period_start` > `period_end`
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Period start date must be before or equal to end date"
  - Use case terminates

### 8.4. Period Range Too Large
- **Trigger:** Step 7 detects period exceeds maximum allowed range
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Export period cannot exceed [max_days] days"
  - Use case terminates

### 8.5. Invalid Format
- **Trigger:** Step 4 detects invalid format (not "csv" or "json")
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Format must be 'csv' or 'json'"
  - Use case terminates

### 8.6. No Records Found
- **Trigger:** Steps 9-11 find no records for period
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "No financial records found for the specified period"
  - Use case terminates (or create empty export, business rule dependent)

### 8.7. File Generation Failed
- **Trigger:** Step 12 fails to generate export file
- **Action:**
  - System returns error `500 Internal Server Error`
  - Error message: "Failed to generate export file"
  - Use case terminates

### 8.8. SFTP Upload Failed
- **Trigger:** Step 13 fails to upload to SFTP
- **Action:**
  - System returns error `500 Internal Server Error`
  - Error message: "Failed to upload export to SFTP server"
  - Use case terminates

### 8.9. Unauthorized Access
- **Trigger:** Step 2 fails authorization check
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Accountant or Owner role can create financial exports"
  - Use case terminates

## 9. Business Rules

**BR1:** Only `Accountant` or `Owner` can create financial exports. Exports contain sensitive financial data.

**BR2:** Export period dates are inclusive. Includes all transactions on start and end dates.

**BR3:** Export includes invoices, transactions, and credit notes for the period. Voided invoices are excluded by default.

**BR4:** Export files are immutable once generated. Cannot modify exported data.

**BR5:** Export files must include all fields required by accountant for reconciliation and VAT reporting.

**BR6:** Export period range is limited to prevent performance issues (e.g., maximum 1 year).

**BR7:** Export can be delivered via download or SFTP. SFTP delivery is queued for background processing.

**BR8:** All export creation actions must be logged in audit logs for compliance and traceability.

**BR9:** Export files are retained per data retention policy (e.g., 10 years for financial records).

**BR10:** Export includes fiscal fields (NIFs, invoice numbers, VAT breakdowns) required for Portuguese tax reporting.

## 10. Validation Rules

1. **Company Validation:**
   - Must exist in `companies` table

2. **Date Validation:**
   - `period_start`: Valid date format (YYYY-MM-DD)
   - `period_end`: Valid date format (YYYY-MM-DD)
   - `period_start` <= `period_end`
   - Period range <= maximum allowed (e.g., 365 days)

3. **Format Validation:**
   - Must be "csv" or "json"
   - Case-sensitive

4. **Delivery Method Validation:**
   - Must be "download" or "sftp" if provided
   - Defaults to "download"

5. **Include Voided Validation:**
   - Boolean value
   - Defaults to false

6. **Export Data Validation:**
   - Must include all required fiscal fields
   - Must include invoice numbers, NIFs, dates, VAT breakdowns
   - Must include transaction details
   - Must include credit note references

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_DATE_FORMAT` | "Date format must be YYYY-MM-DD" | Invalid date format |
| 400 | `INVALID_PERIOD_RANGE` | "Period start date must be before or equal to end date" | Invalid date range |
| 400 | `PERIOD_TOO_LARGE` | "Export period cannot exceed [max] days" | Period exceeds limit |
| 400 | `INVALID_FORMAT` | "Format must be 'csv' or 'json'" | Invalid format |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Accountant or Owner role can create financial exports" | User lacks role |
| 404 | `COMPANY_NOT_FOUND` | "Company not found" | Company does not exist |
| 404 | `NO_RECORDS` | "No financial records found for the specified period" | No data to export |
| 500 | `EXPORT_GENERATION_FAILED` | "Failed to generate export file" | File generation failed |
| 500 | `SFTP_UPLOAD_FAILED` | "Failed to upload export to SFTP server" | SFTP upload failed |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error |

## 12. Events Triggered

**Domain Events:**
- `FinancialExportCreated` event is published with payload:
  - `export_id` (UUID)
  - `company_id` (UUID)
  - `period_start` (Date)
  - `period_end` (Date)
  - `format` (String)
  - `record_count` (Integer)
  - `created_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="FinancialExport", action="create", period
- Background job queued if SFTP delivery (optional)

**Integration Events:**
- SFTP upload notification (if SFTP delivery)

## 13. Repository Methods Required

**FinancialExportRepository Interface:**
- `save(export: FinancialExport): Promise<FinancialExport>` - Persist export record
- `findById(id: UUID): Promise<FinancialExport | null>` - Retrieve export

**InvoiceRepository Interface:**
- `findByCompanyAndPeriod(companyId: UUID, start: Date, end: Date, includeVoided: boolean): Promise<Invoice[]>` - Query invoices for period

**TransactionRepository Interface:**
- `findByCompanyAndPeriod(companyId: UUID, start: Date, end: Date): Promise<Transaction[]>` - Query transactions for period

**CreditNoteRepository Interface:**
- `findByInvoiceIds(invoiceIds: UUID[]): Promise<CreditNote[]>` - Query credit notes for invoices

**CompanyRepository Interface:**
- `findById(id: UUID): Promise<Company | null>` - Verify company exists

**FileStorageService Interface:**
- `saveFile(file: File, path: string): Promise<string>` - Save export file locally
- `uploadToSFTP(file: File, sftpConfig: SFTPConfig): Promise<string>` - Upload to SFTP

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

## 14. Notes or Limitations

1. **Performance:** Large period exports may take time. Consider background job processing for large exports.

2. **File Size:** Export files can be large. Consider compression or chunked delivery for large files.

3. **Data Retention:** Export files must be retained per data retention policy (e.g., 10 years).

4. **SFTP Delivery:** SFTP delivery requires background job processing. Export status should reflect processing state.

5. **Export Format:** CSV and JSON formats must include all required fiscal fields for Portuguese tax reporting.

6. **Voided Invoices:** Voided invoices are excluded by default. Include if `include_voided=true`.

7. **Future Enhancements:** Consider adding:
   - Export templates
   - Scheduled exports
   - Export history
   - Custom field selection
   - Multiple format support (XML, Excel)

8. **Business Rule Dependencies:** Export creation depends on:
   - Financial module for invoice/transaction/credit note data
   - Administrative module for company data

9. **Security:** Export files contain sensitive financial data. Ensure proper access controls and encryption.

10. **Compliance:** Export files must comply with Portuguese fiscal requirements and accountant expectations.

