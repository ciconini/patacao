# Use Case UC-ADMIN-007: Archive Customer

## 1. Objective

Archive a customer record instead of hard deletion. Archiving preserves historical data (appointments, invoices, pet records) while marking the customer as inactive. Hard deletion is restricted and requires Owner role with additional safeguards.

## 2. Actors and Permissions

**Primary Actor:** Manager, Owner

**Secondary Actors:** None

**Required Permissions:**
- Role: `Manager` or `Owner` (for archiving)
- Role: `Owner` only (for hard deletion)
- Permission: `customers:archive` (for archiving)
- Permission: `customers:delete` (for hard deletion, Owner only)

**Authorization Rules:**
- `Manager` and `Owner` can archive customers
- Only `Owner` can perform hard deletion
- System must validate role before allowing archive/delete operations

## 3. Preconditions

1. User is authenticated and has a valid session
2. User has `Manager` or `Owner` role assigned (for archiving)
3. User has `Owner` role assigned (for hard deletion)
4. Customer with specified `id` exists in the system
5. Customer is not already archived (for archive operation)
6. Customer has no active appointments or pending transactions (business rule dependent)

## 4. Postconditions

### Archive Operation:
1. Customer entity is marked as archived (soft delete)
2. `archived_at` timestamp is set to current server time
3. `updated_at` timestamp is updated
4. Customer record remains in database but is excluded from active searches
5. Linked pets, appointments, and invoices remain accessible
6. Audit log entry is created recording the archive action

### Hard Delete Operation (Owner only):
1. System verifies customer has no linked pets, appointments, or invoices
2. If linked records exist, operation is blocked
3. Customer entity is permanently deleted from database
4. Audit log entry is created recording the deletion action
5. Customer record is no longer accessible

## 5. Inputs

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Yes | Must exist | Customer identifier |
| `operation` | String | Yes | "archive" or "delete" | Operation type: archive (soft delete) or delete (hard delete) |
| `reason` | String | No | Max 500 chars | Reason for archiving/deleting (for audit) |

**Operation Types:**
- `archive`: Soft delete, preserves data
- `delete`: Hard delete, permanent removal (Owner only)

## 6. Outputs

### Archive Operation:
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Customer identifier |
| `archived` | Boolean | true (archived) |
| `archived_at` | DateTime | Archive timestamp |
| `archived_by` | UUID | User who performed archive |
| `reason` | String | Archive reason (nullable) |

### Hard Delete Operation:
| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | true if deleted |
| `deleted_at` | DateTime | Deletion timestamp |
| `deleted_by` | UUID | User who performed deletion |

## 7. Main Flow

### Archive Flow:
1. System receives request to archive customer with `id`, `operation="archive"`, and optional `reason`
2. System validates user authentication and `Manager` or `Owner` role
3. System loads existing customer record by `id`
4. System verifies customer exists (return 404 if not found)
5. System verifies customer is not already archived
6. System validates `reason` length if provided (max 500 chars)
7. System captures current customer state for audit log
8. System sets `archived` flag to `true` (or sets `archived_at` timestamp)
9. System sets `archived_at` to current timestamp
10. System sets `archived_by` to current user ID
11. System sets `updated_at` to current timestamp
12. System persists updated customer record
13. System creates audit log entry with action `archive`, reason, and performed_by
14. System returns archived customer object

### Hard Delete Flow (Owner only):
1. System receives request to delete customer with `id`, `operation="delete"`, and optional `reason`
2. System validates user authentication and `Owner` role
3. System loads existing customer record by `id`
4. System verifies customer exists (return 404 if not found)
5. System checks for linked pets (count > 0)
6. System checks for linked appointments (count > 0, status != cancelled)
7. System checks for linked invoices (count > 0)
8. If any linked records exist, return error 409 Conflict
9. System validates `reason` length if provided (max 500 chars)
10. System captures current customer state for audit log
11. System creates audit log entry with action `delete`, reason, and performed_by
12. System permanently deletes customer record from database
13. System returns success response

## 8. Alternative Flows

### 8.1. Customer Not Found
- **Trigger:** Step 4 (both flows) finds no customer with given `id`
- **Action:**
  - System returns error `404 Not Found`
  - Error message: "Customer not found"
  - Use case terminates

### 8.2. Customer Already Archived
- **Trigger:** Step 5 detects customer already archived
- **Action:**
  - System returns error `409 Conflict`
  - Error message: "Customer is already archived"
  - Use case terminates

### 8.3. Linked Pets Exist (Hard Delete)
- **Trigger:** Step 5 (delete flow) finds linked pets
- **Action:**
  - System returns error `409 Conflict`
  - Error message: "Cannot delete customer with linked pets. Archive instead or delete pets first"
  - Use case terminates

### 8.4. Linked Appointments Exist (Hard Delete)
- **Trigger:** Step 6 (delete flow) finds linked appointments
- **Action:**
  - System returns error `409 Conflict`
  - Error message: "Cannot delete customer with linked appointments. Archive instead or cancel appointments first"
  - Use case terminates

### 8.5. Linked Invoices Exist (Hard Delete)
- **Trigger:** Step 7 (delete flow) finds linked invoices
- **Action:**
  - System returns error `409 Conflict`
  - Error message: "Cannot delete customer with linked invoices. Archive instead"
  - Use case terminates

### 8.6. Unauthorized Access (Hard Delete)
- **Trigger:** Step 2 (delete flow) detects non-Owner role
- **Action:**
  - System returns error `403 Forbidden`
  - Error message: "Only Owner role can perform hard deletion"
  - Use case terminates

### 8.7. Invalid Operation Type
- **Trigger:** Invalid `operation` value (not "archive" or "delete")
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Operation must be 'archive' or 'delete'"
  - Use case terminates

### 8.8. Reason Too Long
- **Trigger:** Step 6/9 detects reason exceeds 500 characters
- **Action:**
  - System returns error `400 Bad Request`
  - Error message: "Reason cannot exceed 500 characters"
  - Use case terminates

## 9. Business Rules

**BR1:** Hard deletion is restricted to `Owner` role only. This prevents accidental data loss.

**BR2:** Hard deletion requires customer to have no linked pets, appointments, or invoices. System enforces referential integrity.

**BR3:** Archiving preserves all historical data. Archived customers are excluded from active searches but remain accessible for historical records.

**BR4:** Archived customers cannot be used for new appointments or transactions. System must check archive status before allowing operations.

**BR5:** All archive/delete actions must be logged in audit logs with reason for compliance and GDPR traceability.

**BR6:** Archive operation is reversible (unarchive use case may exist). Hard delete is permanent and irreversible.

**BR7:** Reason field is optional but recommended for audit trail and compliance.

**BR8:** Linked pets can be reassigned to another customer or deleted separately before customer deletion.

## 10. Validation Rules

1. **Customer Existence:**
   - Customer must exist in database
   - Customer must not be already archived (for archive operation)

2. **Operation Type Validation:**
   - Must be exactly "archive" or "delete"
   - Case-sensitive

3. **Reason Validation (if provided):**
   - Maximum 500 characters
   - Cannot be empty string (if provided)

4. **Role Validation:**
   - Archive: `Manager` or `Owner` role required
   - Delete: `Owner` role required exclusively

5. **Linked Records Validation (Hard Delete):**
   - No linked pets (count = 0)
   - No linked appointments (count = 0 or all cancelled)
   - No linked invoices (count = 0)

## 11. Error Conditions and Their Meanings

| HTTP Status | Error Code | Message | Meaning |
|-------------|------------|---------|---------|
| 400 | `INVALID_OPERATION` | "Operation must be 'archive' or 'delete'" | Invalid operation type |
| 400 | `REASON_TOO_LONG` | "Reason cannot exceed 500 characters" | Reason field too long |
| 401 | `UNAUTHORIZED` | "Authentication required" | User not authenticated |
| 403 | `FORBIDDEN` | "Only Owner role can perform hard deletion" | User lacks Owner role for delete |
| 404 | `CUSTOMER_NOT_FOUND` | "Customer not found" | Customer does not exist |
| 409 | `ALREADY_ARCHIVED` | "Customer is already archived" | Customer already archived |
| 409 | `HAS_LINKED_PETS` | "Cannot delete customer with linked pets" | Pets exist, cannot delete |
| 409 | `HAS_LINKED_APPOINTMENTS` | "Cannot delete customer with linked appointments" | Appointments exist, cannot delete |
| 409 | `HAS_LINKED_INVOICES` | "Cannot delete customer with linked invoices" | Invoices exist, cannot delete |
| 500 | `INTERNAL_ERROR` | "An internal error occurred" | System error |

## 12. Events Triggered

**Domain Events:**
- `CustomerArchived` event is published with payload:
  - `customer_id` (UUID)
  - `reason` (String, nullable)
  - `archived_by` (User ID)
  - `timestamp` (DateTime)

- `CustomerDeleted` event is published with payload:
  - `customer_id` (UUID)
  - `reason` (String, nullable)
  - `deleted_by` (User ID)
  - `timestamp` (DateTime)

**System Events:**
- Audit log entry created: `AuditLog.created` with entity_type="Customer", action="archive" or "delete", reason, and performed_by

**Integration Events:**
- None (customer archive/delete is internal administrative action)

## 13. Repository Methods Required

**CustomerRepository Interface:**
- `findById(id: UUID): Promise<Customer | null>` - Load existing customer
- `update(customer: Customer): Promise<Customer>` - Persist archived customer
- `delete(id: UUID): Promise<void>` - Permanently delete customer
- `isArchived(id: UUID): Promise<boolean>` - Check archive status

**PetRepository Interface:**
- `countByCustomerId(customerId: UUID): Promise<number>` - Count linked pets

**AppointmentRepository Interface:**
- `countByCustomerId(customerId: UUID): Promise<number>` - Count linked appointments

**InvoiceRepository Interface:**
- `countByCustomerId(customerId: UUID): Promise<number>` - Count linked invoices

**AuditLogRepository Interface:**
- `create(auditLog: AuditLog): Promise<AuditLog>` - Record audit entry

**UserRepository Interface:**
- `findById(id: UUID): Promise<User | null>` - Retrieve current user

## 14. Notes or Limitations

1. **GDPR Compliance:** Hard deletion may be required for GDPR "right to be forgotten" requests. Ensure proper workflow and authorization.

2. **Data Preservation:** Archiving preserves historical data for compliance and business needs. Hard delete permanently removes data.

3. **Referential Integrity:** Hard delete enforces referential integrity. Consider cascade delete options if business rules allow.

4. **Reversibility:** Archive operation may be reversible (unarchive use case). Hard delete is permanent.

5. **Performance:** Archive/delete operations are infrequent. No special performance optimizations required.

6. **Audit Trail:** All archive/delete actions must be logged with reason for compliance and troubleshooting.

7. **Business Rule Dependencies:** Archive status is checked by Services module before allowing new appointments.

8. **Future Enhancements:** Consider adding:
   - Bulk archive/delete operations
   - Archive expiration (auto-delete after retention period)
   - Customer merge before deletion
   - Export customer data before deletion (GDPR)

9. **Transaction Safety:** Archive/delete operations should be atomic. Use database transactions to ensure consistency.

10. **Linked Records Handling:** Consider business rules for handling linked records:
    - Reassign pets to another customer
    - Cancel or reassign appointments
    - Preserve invoices for accounting (archive only)

