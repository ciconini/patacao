# Domain Event Model — Patacão Petshop Management System

## Overview

This document defines the Domain Event Model for the Patacão Petshop Management System. Domain events represent significant business occurrences that have happened in the system and are used for decoupling modules, enabling asynchronous processing, and maintaining eventual consistency.

**Architecture:** Clean/Hexagonal Architecture  
**Event Pattern:** Domain Events (in-memory or message broker)  
**Event Store:** Optional (events may be persisted for audit/replay)

---

## Event Structure

### Standard Event Format

All domain events follow a consistent structure:

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "EventName",
  "aggregate_id": "770e8400-e29b-41d4-a716-446655440000",
  "aggregate_type": "EntityName",
  "version": 1,
  "occurred_at": "2024-01-15T10:30:00Z",
  "performed_by": "990e8400-e29b-41d4-a716-446655440000",
  "payload": {
    // Event-specific payload fields
  },
  "metadata": {
    "correlation_id": "aa0e8400-e29b-41d4-a716-446655440000",
    "causation_id": "bb0e8400-e29b-41d4-a716-446655440000",
    "request_id": "cc0e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Event Structure Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_id` | UUID | Yes | Unique identifier for this event instance |
| `event_type` | String | Yes | Event type name (e.g., "CompanyCreated", "InvoiceIssued") |
| `aggregate_id` | UUID | Yes | Identifier of the aggregate root that produced the event |
| `aggregate_type` | String | Yes | Type of aggregate root (e.g., "Company", "Invoice") |
| `version` | Integer | Yes | Event version (for schema evolution) |
| `occurred_at` | DateTime (ISO 8601) | Yes | Timestamp when event occurred |
| `performed_by` | UUID | Yes | User ID who triggered the event |
| `payload` | Object | Yes | Event-specific data |
| `metadata` | Object | No | Additional metadata (correlation_id, causation_id, request_id) |

---

## Event Categories

### Entity Lifecycle Events
Events triggered when entities are created, updated, or deleted.

### State Transition Events
Events triggered when entities change state (e.g., draft → issued, booked → confirmed).

### Business Process Events
Events triggered by business processes (e.g., payment recorded, stock received).

### Integration Events
Events intended for external system integration (optional, future use).

---

## Domain Events by Module

### Authentication & Users Module

#### UserLoggedIn

**Event Type:** `UserLoggedIn`

**When Triggered:**
- UC-AUTH-001: User Login (after successful authentication)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `user_id` | UUID | Yes | Valid UUID | User identifier |
| `email` | String | Yes | Max 255 chars | User email address |
| `ip_address` | String | No | Valid IP address | Client IP address |
| `user_agent` | String | No | Max 512 chars | Client user agent |
| `session_id` | UUID | Yes | Valid UUID | Session identifier |

**Consumers/Listeners:**
- Audit Log Service (records login event)
- Session Management Service (tracks active sessions)
- Security Monitoring Service (detects suspicious activity)

**Lifecycle Notes:**
- Event is published immediately after successful authentication
- Event is idempotent (multiple logins create separate events)
- Event may trigger MFA challenge in future

**Idempotency Rules:**
- Each login creates a new event (not idempotent by design)
- Event ID is unique per login session

**Error Handling:**
- If event publishing fails, authentication still succeeds (fire-and-forget)
- Failed events are logged for monitoring
- Retry mechanism for critical audit logging

---

#### UserCreated

**Event Type:** `UserCreated`

**When Triggered:**
- UC-AUTH-005: Create User (after user account creation)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `user_id` | UUID | Yes | Valid UUID | User identifier |
| `email` | String | Yes | Max 255 chars | User email address |
| `full_name` | String | Yes | Max 255 chars | User full name |
| `roles` | Array[String] | Yes | Min 1 role | Assigned role IDs |
| `store_ids` | Array[UUID] | No | Array of UUIDs | Assigned store IDs |
| `active` | Boolean | Yes | true/false | Active status |

**Consumers/Listeners:**
- Audit Log Service (records user creation)
- Notification Service (sends welcome email, if configured)
- Permission Service (updates permission cache)

**Lifecycle Notes:**
- Event is published after user record is persisted
- Event triggers welcome email (if configured)
- Event may trigger password setup workflow

**Idempotency Rules:**
- Event is idempotent based on `user_id`
- Duplicate events for same user_id are ignored

**Error Handling:**
- If notification fails, user creation still succeeds
- Failed notifications are queued for retry

---

#### UserUpdated

**Event Type:** `UserUpdated`

**When Triggered:**
- User profile update (after user record update)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `user_id` | UUID | Yes | Valid UUID | User identifier |
| `changes` | Object | Yes | Changed fields | Fields that were updated |
| `previous_values` | Object | No | Previous values | Previous field values (for audit) |

**Consumers/Listeners:**
- Audit Log Service (records user update)
- Permission Service (updates permission cache if roles changed)
- Session Service (revokes sessions if roles/permissions changed)

**Lifecycle Notes:**
- Event is published after user record is updated
- If roles changed, sessions may be invalidated
- Event includes before/after values for audit

**Idempotency Rules:**
- Event is idempotent based on `event_id`
- Duplicate events are ignored

**Error Handling:**
- If permission cache update fails, user update still succeeds
- Cache invalidation is retried asynchronously

---

### Administrative Module

#### CompanyCreated

**Event Type:** `CompanyCreated`

**When Triggered:**
- UC-ADMIN-001: Create Company Profile (after company creation)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `company_id` | UUID | Yes | Valid UUID | Company identifier |
| `name` | String | Yes | Max 255 chars | Company name |
| `nif` | String | Yes | 9 digits | Portuguese NIF |
| `tax_regime` | String | Yes | Max 64 chars | Tax regime |

**Consumers/Listeners:**
- Audit Log Service (records company creation)
- Financial Service (initializes fiscal settings)

**Lifecycle Notes:**
- Event is published after company record is persisted
- Event triggers fiscal configuration initialization

**Idempotency Rules:**
- Event is idempotent based on `company_id`
- Duplicate events are ignored

**Error Handling:**
- If fiscal initialization fails, company creation still succeeds
- Fiscal initialization is retried asynchronously

---

#### CompanyUpdated

**Event Type:** `CompanyUpdated`

**When Triggered:**
- UC-ADMIN-002: Update Company Profile (after company update)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `company_id` | UUID | Yes | Valid UUID | Company identifier |
| `changes` | Object | Yes | Changed fields | Fields that were updated |
| `fiscal_fields_changed` | Boolean | Yes | true/false | Whether fiscal fields (NIF, tax_regime) were changed |

**Consumers/Listeners:**
- Audit Log Service (records company update)
- Financial Service (updates fiscal settings if fiscal fields changed)

**Lifecycle Notes:**
- Event is published after company record is updated
- If fiscal fields changed, financial settings are updated

**Idempotency Rules:**
- Event is idempotent based on `event_id`

**Error Handling:**
- If fiscal update fails, company update still succeeds
- Fiscal update is retried asynchronously

---

#### StoreCreated

**Event Type:** `StoreCreated`

**When Triggered:**
- UC-ADMIN-003: Create Store (after store creation)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `store_id` | UUID | Yes | Valid UUID | Store identifier |
| `company_id` | UUID | Yes | Valid UUID | Company identifier |
| `name` | String | Yes | Max 255 chars | Store name |
| `timezone` | String | Yes | Valid IANA timezone | Store timezone |

**Consumers/Listeners:**
- Audit Log Service (records store creation)
- Appointment Service (initializes store schedule)
- Inventory Service (creates default inventory location)

**Lifecycle Notes:**
- Event is published after store record is persisted
- Event triggers default inventory location creation

**Idempotency Rules:**
- Event is idempotent based on `store_id`

**Error Handling:**
- If default location creation fails, store creation still succeeds
- Default location creation is retried asynchronously

---

#### CustomerCreated

**Event Type:** `CustomerCreated`

**When Triggered:**
- UC-ADMIN-005: Create Customer (after customer creation)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `customer_id` | UUID | Yes | Valid UUID | Customer identifier |
| `full_name` | String | Yes | Max 255 chars | Customer full name |
| `email` | String | No | Max 255 chars | Customer email |
| `consent_marketing` | Boolean | Yes | true/false | Marketing consent |
| `consent_reminders` | Boolean | Yes | true/false | Reminders consent |

**Consumers/Listeners:**
- Audit Log Service (records customer creation)
- Marketing Service (adds to marketing list if consent_marketing=true)
- Notification Service (sends welcome email if configured)

**Lifecycle Notes:**
- Event is published after customer record is persisted
- Event triggers marketing list update (if consented)

**Idempotency Rules:**
- Event is idempotent based on `customer_id`

**Error Handling:**
- If marketing list update fails, customer creation still succeeds
- Marketing list update is retried asynchronously

---

#### CustomerUpdated

**Event Type:** `CustomerUpdated`

**When Triggered:**
- UC-ADMIN-006: Update Customer (after customer update)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `customer_id` | UUID | Yes | Valid UUID | Customer identifier |
| `changes` | Object | Yes | Changed fields | Fields that were updated |
| `consent_changed` | Boolean | Yes | true/false | Whether consent flags changed |

**Consumers/Listeners:**
- Audit Log Service (records customer update)
- Marketing Service (updates marketing list if consent_marketing changed)

**Lifecycle Notes:**
- Event is published after customer record is updated
- If consent_marketing changed, marketing list is updated

**Idempotency Rules:**
- Event is idempotent based on `event_id`

**Error Handling:**
- If marketing list update fails, customer update still succeeds

---

#### CustomerArchived

**Event Type:** `CustomerArchived`

**When Triggered:**
- UC-ADMIN-007: Archive Customer (after customer archiving)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `customer_id` | UUID | Yes | Valid UUID | Customer identifier |
| `reason` | String | No | Max 500 chars | Archival reason |

**Consumers/Listeners:**
- Audit Log Service (records customer archival)
- Marketing Service (removes from marketing list)
- GDPR Service (triggers data retention workflow)

**Lifecycle Notes:**
- Event is published after customer is archived
- Event triggers GDPR data retention workflow

**Idempotency Rules:**
- Event is idempotent based on `customer_id` (only one archive event per customer)

**Error Handling:**
- If marketing list removal fails, archival still succeeds
- Marketing list removal is retried asynchronously

---

#### PetCreated

**Event Type:** `PetCreated`

**When Triggered:**
- UC-ADMIN-008: Create Pet (after pet creation)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `pet_id` | UUID | Yes | Valid UUID | Pet identifier |
| `customer_id` | UUID | Yes | Valid UUID | Customer identifier |
| `name` | String | Yes | Max 255 chars | Pet name |
| `species` | String | Yes | Max 64 chars | Species |
| `microchip_id` | String | No | Max 64 chars | Microchip ID |

**Consumers/Listeners:**
- Audit Log Service (records pet creation)
- Notification Service (sends pet registration confirmation if configured)

**Lifecycle Notes:**
- Event is published after pet record is persisted
- Event may trigger pet registration confirmation email

**Idempotency Rules:**
- Event is idempotent based on `pet_id`

**Error Handling:**
- If notification fails, pet creation still succeeds

---

### Services Module

#### ServiceCreated

**Event Type:** `ServiceCreated`

**When Triggered:**
- UC-SVC-001: Create Service (after service creation)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `service_id` | UUID | Yes | Valid UUID | Service identifier |
| `name` | String | Yes | Max 255 chars | Service name |
| `duration_minutes` | Integer | Yes | Min 1 | Service duration |
| `price` | Decimal | Yes | >= 0.00 | Service price |
| `consumes_inventory` | Boolean | Yes | true/false | Inventory consumption flag |

**Consumers/Listeners:**
- Audit Log Service (records service creation)
- Appointment Service (updates service catalog cache)

**Lifecycle Notes:**
- Event is published after service record is persisted
- Event triggers service catalog cache invalidation

**Idempotency Rules:**
- Event is idempotent based on `service_id`

**Error Handling:**
- If cache invalidation fails, service creation still succeeds

---

#### AppointmentCreated

**Event Type:** `AppointmentCreated`

**When Triggered:**
- UC-SVC-002: Create Appointment (after appointment creation)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `appointment_id` | UUID | Yes | Valid UUID | Appointment identifier |
| `store_id` | UUID | Yes | Valid UUID | Store identifier |
| `customer_id` | UUID | Yes | Valid UUID | Customer identifier |
| `pet_id` | UUID | Yes | Valid UUID | Pet identifier |
| `start_at` | DateTime (ISO 8601) | Yes | Valid datetime | Appointment start time |
| `end_at` | DateTime (ISO 8601) | Yes | Valid datetime | Appointment end time |
| `status` | String | Yes | "booked" | Appointment status |
| `staff_id` | UUID | No | Valid UUID | Assigned staff member |
| `service_ids` | Array[UUID] | Yes | Min 1 service | Service IDs for appointment |
| `recurrence_id` | UUID | No | Valid UUID | Recurrence group identifier |

**Consumers/Listeners:**
- Audit Log Service (records appointment creation)
- Reminder Service (schedules reminder if consent_reminders=true)
- Calendar Service (updates calendar view)

**Lifecycle Notes:**
- Event is published after appointment record is persisted
- Event triggers reminder scheduling (if customer consented)
- For recurring appointments, multiple events may be published

**Idempotency Rules:**
- Event is idempotent based on `appointment_id`
- Recurring appointments create separate events per occurrence

**Error Handling:**
- If reminder scheduling fails, appointment creation still succeeds
- Reminder scheduling is retried asynchronously

---

#### AppointmentConfirmed

**Event Type:** `AppointmentConfirmed`

**When Triggered:**
- UC-SVC-003: Confirm Appointment (after appointment confirmation)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `appointment_id` | UUID | Yes | Valid UUID | Appointment identifier |
| `store_id` | UUID | Yes | Valid UUID | Store identifier |
| `customer_id` | UUID | Yes | Valid UUID | Customer identifier |
| `pet_id` | UUID | Yes | Valid UUID | Pet identifier |
| `start_at` | DateTime (ISO 8601) | Yes | Valid datetime | Appointment start time |
| `confirmed_at` | DateTime (ISO 8601) | Yes | Valid datetime | Confirmation timestamp |
| `inventory_reservations` | Array[Object] | No | Array of reservations | Created inventory reservations |

**Consumers/Listeners:**
- Audit Log Service (records appointment confirmation)
- Inventory Service (creates inventory reservations if services consume inventory)
- Reminder Service (confirms reminder scheduling)
- Notification Service (sends confirmation email if consent_reminders=true)

**Lifecycle Notes:**
- Event is published after appointment status changes to "confirmed"
- Event triggers inventory reservation creation
- Event triggers confirmation email (if customer consented)

**Idempotency Rules:**
- Event is idempotent based on `appointment_id` (only one confirmation per appointment)
- Duplicate confirmation events are ignored

**Error Handling:**
- If inventory reservation fails, appointment confirmation may fail (business rule dependent)
- If email fails, confirmation still succeeds
- Email sending is retried asynchronously

---

#### AppointmentCompleted

**Event Type:** `AppointmentCompleted`

**When Triggered:**
- UC-SVC-004: Complete Appointment (after appointment completion)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `appointment_id` | UUID | Yes | Valid UUID | Appointment identifier |
| `store_id` | UUID | Yes | Valid UUID | Store identifier |
| `customer_id` | UUID | Yes | Valid UUID | Customer identifier |
| `pet_id` | UUID | Yes | Valid UUID | Pet identifier |
| `completed_at` | DateTime (ISO 8601) | Yes | Valid datetime | Completion timestamp |
| `completed_by` | UUID | Yes | Valid UUID | User who completed appointment |
| `stock_movements` | Array[Object] | No | Array of movements | Created stock movements |
| `notes` | String | No | Max 5000 chars | Service notes |

**Consumers/Listeners:**
- Audit Log Service (records appointment completion)
- Inventory Service (decrements stock, releases/consumes reservations)
- Financial Service (creates invoice draft, if configured)
- Notification Service (sends completion notification if configured)

**Lifecycle Notes:**
- Event is published after appointment status changes to "completed"
- Event triggers stock decrement for consumed items
- Event may trigger invoice creation

**Idempotency Rules:**
- Event is idempotent based on `appointment_id` (only one completion per appointment)
- Duplicate completion events are ignored

**Error Handling:**
- If stock decrement fails, appointment completion may fail (business rule dependent)
- If invoice creation fails, completion still succeeds
- Invoice creation is retried asynchronously

---

#### AppointmentCancelled

**Event Type:** `AppointmentCancelled`

**When Triggered:**
- UC-SVC-005: Cancel Appointment (after appointment cancellation)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `appointment_id` | UUID | Yes | Valid UUID | Appointment identifier |
| `store_id` | UUID | Yes | Valid UUID | Store identifier |
| `customer_id` | UUID | Yes | Valid UUID | Customer identifier |
| `pet_id` | UUID | Yes | Valid UUID | Pet identifier |
| `cancelled_at` | DateTime (ISO 8601) | Yes | Valid datetime | Cancellation timestamp |
| `cancelled_by` | UUID | Yes | Valid UUID | User who cancelled appointment |
| `reason` | String | No | Max 500 chars | Cancellation reason |
| `no_show` | Boolean | Yes | true/false | No-show flag |
| `released_reservations` | Array[UUID] | No | Array of UUIDs | Released inventory reservation IDs |

**Consumers/Listeners:**
- Audit Log Service (records appointment cancellation)
- Inventory Service (releases inventory reservations)
- Reminder Service (cancels scheduled reminders)
- Notification Service (sends cancellation notification if configured)

**Lifecycle Notes:**
- Event is published after appointment status changes to "cancelled"
- Event triggers inventory reservation release
- Event triggers reminder cancellation

**Idempotency Rules:**
- Event is idempotent based on `appointment_id` (only one cancellation per appointment)
- Duplicate cancellation events are ignored

**Error Handling:**
- If reservation release fails, cancellation still succeeds
- Reservation release is retried asynchronously

---

### Financial Module

#### InvoiceCreated

**Event Type:** `InvoiceCreated`

**When Triggered:**
- UC-FIN-001: Create Invoice Draft (after invoice creation)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `invoice_id` | UUID | Yes | Valid UUID | Invoice identifier |
| `company_id` | UUID | Yes | Valid UUID | Company identifier |
| `store_id` | UUID | Yes | Valid UUID | Store identifier |
| `status` | String | Yes | "draft" | Invoice status |
| `total` | Decimal | Yes | >= 0.00 | Invoice total amount |
| `created_by` | UUID | Yes | Valid UUID | User who created invoice |

**Consumers/Listeners:**
- Audit Log Service (records invoice creation)
- Financial Service (tracks draft invoices)

**Lifecycle Notes:**
- Event is published after invoice record is persisted
- Event is for draft invoices only

**Idempotency Rules:**
- Event is idempotent based on `invoice_id`

**Error Handling:**
- If audit logging fails, invoice creation still succeeds

---

#### InvoiceIssued

**Event Type:** `InvoiceIssued`

**When Triggered:**
- UC-FIN-002: Issue Invoice (after invoice issuance)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `invoice_id` | UUID | Yes | Valid UUID | Invoice identifier |
| `invoice_number` | String | Yes | Max 128 chars | Sequential invoice number |
| `company_id` | UUID | Yes | Valid UUID | Company identifier |
| `store_id` | UUID | Yes | Valid UUID | Store identifier |
| `total` | Decimal | Yes | >= 0.00 | Invoice total amount |
| `issued_by` | UUID | Yes | Valid UUID | User who issued invoice |
| `issued_at` | DateTime (ISO 8601) | Yes | Valid datetime | Issue timestamp |

**Consumers/Listeners:**
- Audit Log Service (records invoice issuance)
- Financial Service (updates fiscal records)
- Notification Service (sends invoice email to customer, if configured)
- Export Service (includes in financial exports)

**Lifecycle Notes:**
- Event is published after invoice status changes to "issued"
- Event triggers invoice email (if customer email exists)
- Event is included in financial exports

**Idempotency Rules:**
- Event is idempotent based on `invoice_id` (only one issuance per invoice)
- Duplicate issuance events are ignored

**Error Handling:**
- If email sending fails, invoice issuance still succeeds
- Email sending is retried asynchronously

---

#### InvoicePaymentRecorded

**Event Type:** `InvoicePaymentRecorded`

**When Triggered:**
- UC-FIN-003: Mark Invoice Paid (after payment recording)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `invoice_id` | UUID | Yes | Valid UUID | Invoice identifier |
| `invoice_number` | String | Yes | Max 128 chars | Invoice number |
| `payment_method` | String | Yes | Max 64 chars | Payment method |
| `paid_at` | DateTime (ISO 8601) | Yes | Valid datetime | Payment timestamp |
| `external_reference` | String | No | Max 255 chars | External payment reference |
| `recorded_by` | UUID | Yes | Valid UUID | User who recorded payment |

**Consumers/Listeners:**
- Audit Log Service (records payment)
- Financial Service (updates payment records)
- Notification Service (sends payment confirmation email, if configured)

**Lifecycle Notes:**
- Event is published after invoice payment is recorded
- Event triggers payment confirmation email (if configured)

**Idempotency Rules:**
- Event is idempotent based on `invoice_id` and `paid_at` (prevents duplicate payment records)

**Error Handling:**
- If email sending fails, payment recording still succeeds

---

#### InvoiceVoided

**Event Type:** `InvoiceVoided`

**When Triggered:**
- UC-FIN-004: Void Invoice (after invoice voiding)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `invoice_id` | UUID | Yes | Valid UUID | Invoice identifier |
| `invoice_number` | String | Yes | Max 128 chars | Invoice number |
| `company_id` | UUID | Yes | Valid UUID | Company identifier |
| `voided_by` | UUID | Yes | Valid UUID | User who voided invoice |
| `voided_at` | DateTime (ISO 8601) | Yes | Valid datetime | Void timestamp |
| `reason` | String | Yes | Max 500 chars | Void reason |

**Consumers/Listeners:**
- Audit Log Service (records invoice voiding)
- Financial Service (updates fiscal records)
- Export Service (marks as voided in exports)

**Lifecycle Notes:**
- Event is published after invoice status changes to "voided"
- Event triggers fiscal record update

**Idempotency Rules:**
- Event is idempotent based on `invoice_id` (only one void per invoice)

**Error Handling:**
- If fiscal update fails, voiding still succeeds
- Fiscal update is retried asynchronously

---

#### CreditNoteCreated

**Event Type:** `CreditNoteCreated`

**When Triggered:**
- UC-FIN-005: Create Credit Note (after credit note creation)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `credit_note_id` | UUID | Yes | Valid UUID | Credit note identifier |
| `invoice_id` | UUID | Yes | Valid UUID | Original invoice identifier |
| `invoice_number` | String | Yes | Max 128 chars | Original invoice number |
| `amount` | Decimal | Yes | > 0.00 | Credit note amount |
| `reason` | String | Yes | Max 500 chars | Credit note reason |
| `created_by` | UUID | Yes | Valid UUID | User who created credit note |
| `issued_at` | DateTime (ISO 8601) | Yes | Valid datetime | Issue timestamp |

**Consumers/Listeners:**
- Audit Log Service (records credit note creation)
- Financial Service (updates invoice outstanding amount)
- Export Service (includes in financial exports)

**Lifecycle Notes:**
- Event is published after credit note record is persisted
- Event triggers invoice outstanding amount update

**Idempotency Rules:**
- Event is idempotent based on `credit_note_id`

**Error Handling:**
- If outstanding amount update fails, credit note creation still succeeds
- Outstanding amount update is retried asynchronously

---

#### TransactionCreated

**Event Type:** `TransactionCreated`

**When Triggered:**
- UC-FIN-006: Create Transaction (after transaction creation)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `transaction_id` | UUID | Yes | Valid UUID | Transaction identifier |
| `store_id` | UUID | Yes | Valid UUID | Store identifier |
| `invoice_id` | UUID | No | Valid UUID | Linked invoice identifier |
| `total_amount` | Decimal | Yes | >= 0.00 | Transaction total |
| `created_by` | UUID | Yes | Valid UUID | User who created transaction |

**Consumers/Listeners:**
- Audit Log Service (records transaction creation)
- Financial Service (tracks pending transactions)

**Lifecycle Notes:**
- Event is published after transaction record is persisted
- Event may include invoice_id if invoice was created

**Idempotency Rules:**
- Event is idempotent based on `transaction_id`

**Error Handling:**
- If audit logging fails, transaction creation still succeeds

---

#### TransactionCompleted

**Event Type:** `TransactionCompleted`

**When Triggered:**
- UC-FIN-007: Complete Transaction (after transaction completion)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `transaction_id` | UUID | Yes | Valid UUID | Transaction identifier |
| `store_id` | UUID | Yes | Valid UUID | Store identifier |
| `invoice_id` | UUID | Yes | Valid UUID | Linked invoice identifier |
| `payment_status` | String | Yes | "paid_manual" | Payment status |
| `payment_method` | String | No | Max 64 chars | Payment method |
| `completed_by` | UUID | Yes | Valid UUID | User who completed transaction |
| `stock_movements` | Array[Object] | No | Array of movements | Created stock movements |

**Consumers/Listeners:**
- Audit Log Service (records transaction completion)
- Inventory Service (decrements stock for tracked products)
- Financial Service (updates payment records)

**Lifecycle Notes:**
- Event is published after transaction status changes to "paid_manual"
- Event triggers stock decrement for tracked products
- Event may trigger invoice payment recording

**Idempotency Rules:**
- Event is idempotent based on `transaction_id` (only one completion per transaction)

**Error Handling:**
- If stock decrement fails, transaction completion may fail (business rule dependent)
- Stock decrement is retried if initial attempt fails

---

#### FinancialExportCreated

**Event Type:** `FinancialExportCreated`

**When Triggered:**
- UC-FIN-008: Create Financial Export (after export creation)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `export_id` | UUID | Yes | Valid UUID | Export identifier |
| `company_id` | UUID | Yes | Valid UUID | Company identifier |
| `period_start` | Date (yyyy-MM-dd) | Yes | Valid date | Export period start |
| `period_end` | Date (yyyy-MM-dd) | Yes | Valid date | Export period end |
| `format` | String | Yes | "csv" or "json" | Export format |
| `status` | String | Yes | "pending" or "processing" | Export status |
| `created_by` | UUID | Yes | Valid UUID | User who created export |

**Consumers/Listeners:**
- Export Service (processes export generation)
- Audit Log Service (records export creation)

**Lifecycle Notes:**
- Event is published after export record is created
- Event triggers export file generation (asynchronous)

**Idempotency Rules:**
- Event is idempotent based on `export_id`

**Error Handling:**
- If export generation fails, export record is marked as "failed"
- Export generation is retried with exponential backoff

---

### Inventory Module

#### ProductCreated

**Event Type:** `ProductCreated`

**When Triggered:**
- UC-INV-005: Create Product (after product creation)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `product_id` | UUID | Yes | Valid UUID | Product identifier |
| `sku` | String | Yes | Max 64 chars | Product SKU |
| `name` | String | Yes | Max 255 chars | Product name |
| `stock_tracked` | Boolean | Yes | true/false | Stock tracking flag |
| `unit_price` | Decimal | Yes | >= 0.00 | Unit price |

**Consumers/Listeners:**
- Audit Log Service (records product creation)
- Inventory Service (initializes stock tracking if stock_tracked=true)

**Lifecycle Notes:**
- Event is published after product record is persisted
- Event triggers stock tracking initialization (if applicable)

**Idempotency Rules:**
- Event is idempotent based on `product_id`

**Error Handling:**
- If stock initialization fails, product creation still succeeds
- Stock initialization is retried asynchronously

---

#### SupplierCreated

**Event Type:** `SupplierCreated`

**When Triggered:**
- UC-INV-008: Create Supplier (after supplier creation)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `supplier_id` | UUID | Yes | Valid UUID | Supplier identifier |
| `name` | String | Yes | Max 255 chars | Supplier name |
| `contact_email` | String | No | Max 255 chars | Contact email |
| `default_lead_time_days` | Integer | No | >= 0 | Default lead time |

**Consumers/Listeners:**
- Audit Log Service (records supplier creation)
- Purchase Order Service (updates supplier catalog)

**Lifecycle Notes:**
- Event is published after supplier record is persisted

**Idempotency Rules:**
- Event is idempotent based on `supplier_id`

**Error Handling:**
- If catalog update fails, supplier creation still succeeds

---

#### StockReceived

**Event Type:** `StockReceived`

**When Triggered:**
- UC-INV-001: Receive Stock (after stock receipt)
- UC-INV-012: Receive Purchase Order (after PO receiving)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `receipt_id` | UUID | Yes | Valid UUID | Stock receipt identifier |
| `store_id` | UUID | Yes | Valid UUID | Store identifier |
| `supplier_id` | UUID | No | Valid UUID | Supplier identifier |
| `purchase_order_id` | UUID | No | Valid UUID | Purchase order identifier |
| `lines` | Array[Object] | Yes | Min 1 line | Stock receipt lines |
| `performed_by` | UUID | Yes | Valid UUID | User who received stock |

**Stock Receipt Line Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `product_id` | UUID | Yes | Valid UUID | Product identifier |
| `quantity` | Integer | Yes | Min 1 | Quantity received |
| `batch_id` | UUID | No | Valid UUID | Batch identifier |
| `batch_number` | String | No | Max 128 chars | Batch number |

**Consumers/Listeners:**
- Audit Log Service (records stock receipt)
- Inventory Service (updates stock levels)
- Purchase Order Service (updates PO received quantities)
- Notification Service (sends low-stock alerts if threshold reached)

**Lifecycle Notes:**
- Event is published after stock receipt is processed
- Event triggers stock level updates
- Event may trigger low-stock alerts

**Idempotency Rules:**
- Event is idempotent based on `receipt_id`
- Duplicate receipt events are ignored

**Error Handling:**
- If stock update fails, receipt processing fails (transaction rollback)
- If alert sending fails, receipt still succeeds

---

#### StockMovementCreated

**Event Type:** `StockMovementCreated`

**When Triggered:**
- UC-INV-001: Receive Stock (for each movement)
- UC-INV-002: Stock Adjustment (after adjustment)
- UC-SVC-004: Complete Appointment (for stock decrement)
- UC-FIN-007: Complete Transaction (for stock decrement)
- UC-INV-004: Stock Reconciliation (for variance adjustments)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `movement_id` | UUID | Yes | Valid UUID | Movement identifier |
| `product_id` | UUID | Yes | Valid UUID | Product identifier |
| `batch_id` | UUID | No | Valid UUID | Batch identifier |
| `quantity_change` | Integer | Yes | Non-zero integer | Quantity change (positive or negative) |
| `reason` | String | Yes | Max 64 chars | Movement reason |
| `location_id` | UUID | No | Valid UUID | Inventory location identifier |
| `reference_id` | UUID | No | Valid UUID | Reference (invoice, PO, appointment, transaction) |
| `performed_by` | UUID | Yes | Valid UUID | User who performed movement |

**Consumers/Listeners:**
- Audit Log Service (records stock movement)
- Inventory Service (updates aggregated stock levels)
- Reporting Service (updates stock reports)

**Lifecycle Notes:**
- Event is published after stock movement is persisted
- Event triggers aggregated stock level update
- Event is used for stock history and reporting

**Idempotency Rules:**
- Event is idempotent based on `movement_id`
- Duplicate movement events are ignored

**Error Handling:**
- If aggregated update fails, movement still succeeds
- Aggregated update is retried asynchronously

---

#### InventoryReserved

**Event Type:** `InventoryReserved`

**When Triggered:**
- UC-INV-003: Inventory Reservation (after reservation creation)
- UC-SVC-003: Confirm Appointment (for services that consume inventory)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `reservation_id` | UUID | Yes | Valid UUID | Reservation identifier |
| `product_id` | UUID | Yes | Valid UUID | Product identifier |
| `quantity` | Integer | Yes | Min 1 | Reserved quantity |
| `reserved_for_id` | UUID | Yes | Valid UUID | Target entity identifier |
| `reserved_for_type` | String | Yes | "appointment" or "transaction" | Target entity type |
| `expires_at` | DateTime (ISO 8601) | No | Valid datetime | Expiry datetime |

**Consumers/Listeners:**
- Audit Log Service (records reservation)
- Inventory Service (reduces available stock)
- Expiration Service (schedules reservation expiration check)

**Lifecycle Notes:**
- Event is published after reservation is created
- Event triggers available stock reduction
- Event triggers expiration scheduling

**Idempotency Rules:**
- Event is idempotent based on `reservation_id`

**Error Handling:**
- If available stock update fails, reservation creation fails (transaction rollback)

---

#### InventoryReservationReleased

**Event Type:** `InventoryReservationReleased`

**When Triggered:**
- UC-INV-010: Release Inventory Reservation (after reservation release)
- UC-SVC-005: Cancel Appointment (for confirmed appointments with reservations)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `reservation_id` | UUID | Yes | Valid UUID | Reservation identifier |
| `product_id` | UUID | Yes | Valid UUID | Product identifier |
| `quantity` | Integer | Yes | Min 1 | Released quantity |
| `released_by` | UUID | Yes | Valid UUID | User who released reservation |
| `release_reason` | String | Yes | Max 64 chars | Release reason (e.g., "cancelled", "expired", "manual") |

**Consumers/Listeners:**
- Audit Log Service (records reservation release)
- Inventory Service (increases available stock)
- Expiration Service (cancels expiration scheduling)

**Lifecycle Notes:**
- Event is published after reservation is released
- Event triggers available stock increase

**Idempotency Rules:**
- Event is idempotent based on `reservation_id` (only one release per reservation)

**Error Handling:**
- If available stock update fails, release still succeeds
- Available stock update is retried asynchronously

---

#### PurchaseOrderCreated

**Event Type:** `PurchaseOrderCreated`

**When Triggered:**
- UC-INV-011: Create Purchase Order (after PO creation)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `purchase_order_id` | UUID | Yes | Valid UUID | Purchase order identifier |
| `supplier_id` | UUID | Yes | Valid UUID | Supplier identifier |
| `store_id` | UUID | No | Valid UUID | Store identifier |
| `status` | String | Yes | "draft" or "ordered" | PO status |
| `total_amount` | Decimal | Yes | >= 0.00 | Total order amount |
| `created_by` | UUID | Yes | Valid UUID | User who created PO |

**Consumers/Listeners:**
- Audit Log Service (records PO creation)
- Purchase Order Service (tracks pending orders)

**Lifecycle Notes:**
- Event is published after PO record is persisted

**Idempotency Rules:**
- Event is idempotent based on `purchase_order_id`

**Error Handling:**
- If audit logging fails, PO creation still succeeds

---

#### PurchaseOrderReceived

**Event Type:** `PurchaseOrderReceived`

**When Triggered:**
- UC-INV-012: Receive Purchase Order (after PO receiving)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `purchase_order_id` | UUID | Yes | Valid UUID | Purchase order identifier |
| `supplier_id` | UUID | Yes | Valid UUID | Supplier identifier |
| `store_id` | UUID | Yes | Valid UUID | Store identifier |
| `received_lines` | Array[Object] | Yes | Min 1 line | Received line items |
| `received_by` | UUID | Yes | Valid UUID | User who received PO |
| `received_at` | DateTime (ISO 8601) | Yes | Valid datetime | Receiving timestamp |

**Consumers/Listeners:**
- Audit Log Service (records PO receiving)
- StockReceived event (triggers stock receipt processing)
- Purchase Order Service (updates PO status)

**Lifecycle Notes:**
- Event is published after PO receiving is processed
- Event triggers StockReceived event

**Idempotency Rules:**
- Event is idempotent based on `purchase_order_id` and receiving timestamp

**Error Handling:**
- If stock receipt processing fails, PO receiving fails (transaction rollback)

---

#### StockReconciled

**Event Type:** `StockReconciled`

**When Triggered:**
- UC-INV-004: Stock Reconciliation (after reconciliation processing)

**Payload Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `reconciliation_id` | UUID | Yes | Valid UUID | Reconciliation identifier |
| `store_id` | UUID | Yes | Valid UUID | Store identifier |
| `location_id` | UUID | No | Valid UUID | Inventory location identifier |
| `counts` | Array[Object] | Yes | Min 1 count | Stock count entries |
| `adjustments` | Array[UUID] | Yes | Array of UUIDs | Created stock movement IDs |
| `performed_by` | UUID | Yes | Valid UUID | User who performed reconciliation |

**Stock Count Structure:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `product_id` | UUID | Yes | Valid UUID | Product identifier |
| `system_quantity` | Integer | Yes | >= 0 | System quantity before reconciliation |
| `counted_quantity` | Integer | Yes | >= 0 | Physical count quantity |
| `variance` | Integer | Yes | Integer | Variance (counted - system) |

**Consumers/Listeners:**
- Audit Log Service (records reconciliation)
- StockMovementCreated events (for each variance adjustment)
- Reporting Service (updates reconciliation reports)

**Lifecycle Notes:**
- Event is published after reconciliation is processed
- Event triggers stock movement creation for variances

**Idempotency Rules:**
- Event is idempotent based on `reconciliation_id`

**Error Handling:**
- If stock movement creation fails, reconciliation fails (transaction rollback)

---

## Event Lifecycle

### Event Publishing

1. **Synchronous Publishing (In-Memory):**
   - Events are published within the same transaction
   - Consumers are notified immediately
   - Used for critical events requiring immediate processing

2. **Asynchronous Publishing (Message Broker):**
   - Events are published to message broker (RabbitMQ/Kafka)
   - Consumers process events asynchronously
   - Used for non-critical events (notifications, reports)

3. **Event Store (Optional):**
   - Events may be persisted in event store for audit/replay
   - Event store enables event sourcing (if implemented)

### Event Consumption

1. **Immediate Consumers:**
   - Process events synchronously within transaction
   - Must succeed for transaction to commit
   - Examples: Audit logging, stock updates

2. **Asynchronous Consumers:**
   - Process events from message broker
   - May retry on failure
   - Examples: Email notifications, report generation

3. **Background Workers:**
   - Long-running processes consuming events
   - Examples: Export generation, reminder scheduling

### Event Ordering

1. **Per-Aggregate Ordering:**
   - Events for same aggregate are processed in order
   - Ensures consistency for aggregate state

2. **Cross-Aggregate Ordering:**
   - Events across aggregates may be processed out of order
   - Eventual consistency is acceptable

3. **Causation Tracking:**
   - Events include `causation_id` to track event chains
   - Enables tracing event dependencies

---

## Idempotency Rules

### General Idempotency Principles

1. **Event ID Uniqueness:**
   - Each event has a unique `event_id`
   - Duplicate events with same `event_id` are ignored

2. **Aggregate-Based Idempotency:**
   - Events are idempotent based on `aggregate_id` and event type
   - Duplicate events for same aggregate are ignored

3. **Idempotency Keys:**
   - Critical events include idempotency keys
   - Consumers check idempotency keys before processing

### Idempotency by Event Type

| Event Type | Idempotency Key | Rule |
|------------|----------------|------|
| Entity Created | `aggregate_id` | Only one creation event per entity |
| Entity Updated | `event_id` | Each update creates unique event |
| State Transition | `aggregate_id` + `new_status` | Only one transition to specific state |
| Business Process | `aggregate_id` + `process_id` | Only one process completion per aggregate |

### Idempotency Implementation

1. **Consumer-Side:**
   - Consumers maintain processed event IDs
   - Duplicate events are detected and ignored

2. **Database Constraints:**
   - Unique constraints on event_id prevent duplicates
   - Database-level idempotency enforcement

3. **Message Broker:**
   - Message broker deduplication (if supported)
   - At-least-once delivery with idempotent consumers

---

## Error Handling Guidelines

### Event Publishing Errors

1. **Critical Events:**
   - If publishing fails, transaction is rolled back
   - Event publishing is part of transaction
   - Examples: Stock movements, invoice issuance

2. **Non-Critical Events:**
   - If publishing fails, operation still succeeds
   - Failed events are logged for retry
   - Examples: Email notifications, reports

3. **Retry Strategy:**
   - Exponential backoff for retries
   - Maximum retry attempts (e.g., 3 attempts)
   - Dead letter queue for failed events

### Event Consumption Errors

1. **Transient Errors:**
   - Retry with exponential backoff
   - Maximum retry attempts
   - Examples: Network errors, temporary service unavailability

2. **Permanent Errors:**
   - Move to dead letter queue
   - Alert administrators
   - Manual intervention required
   - Examples: Invalid event payload, business rule violations

3. **Partial Failures:**
   - Process successful parts
   - Log failed parts for retry
   - Examples: Batch processing, multiple line items

### Error Event Types

1. **EventProcessingFailed:**
   - Published when event consumption fails
   - Includes original event and error details
   - Triggers alerting and retry mechanisms

2. **EventPublishingFailed:**
   - Logged when event publishing fails
   - Triggers retry mechanism
   - May trigger fallback processing

### Monitoring and Alerting

1. **Event Metrics:**
   - Event publishing rate
   - Event consumption rate
   - Event processing latency
   - Failed event count

2. **Alerts:**
   - High failure rate
   - Dead letter queue size
   - Event processing delays
   - Missing events (expected but not received)

---

## Event Versioning

### Schema Evolution

1. **Backward Compatibility:**
   - New fields are optional
   - Existing fields are not removed
   - Field types are not changed

2. **Version Field:**
   - Events include `version` field
   - Consumers handle multiple versions
   - Version migration strategy

3. **Breaking Changes:**
   - New event type created
   - Old event type deprecated
   - Migration period for consumers

### Version Migration

1. **Dual Publishing:**
   - Publish both old and new event versions
   - Consumers migrate gradually
   - Old version removed after migration

2. **Event Transformation:**
   - Transform old events to new format
   - Transformation layer in consumers
   - Gradual migration

---

## Event Metadata

### Standard Metadata Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `correlation_id` | UUID | No | Groups related events |
| `causation_id` | UUID | No | Links event to causing event |
| `request_id` | UUID | No | Links event to API request |
| `user_id` | UUID | Yes | User who triggered event |
| `ip_address` | String | No | Client IP address |
| `user_agent` | String | No | Client user agent |

### Metadata Usage

1. **Tracing:**
   - `correlation_id` groups related events
   - `causation_id` tracks event chains
   - `request_id` links to API requests

2. **Audit:**
   - `user_id` identifies who triggered event
   - `ip_address` and `user_agent` for security

3. **Debugging:**
   - Metadata enables event traceability
   - Debugging event processing issues

---

## Event Store (Optional)

### Event Store Benefits

1. **Audit Trail:**
   - Complete history of all events
   - Immutable event log
   - Compliance and auditing

2. **Event Sourcing:**
   - Rebuild aggregate state from events
   - Time travel and debugging
   - Event replay capabilities

3. **Analytics:**
   - Event-based analytics
   - Business intelligence
   - Reporting and dashboards

### Event Store Implementation

1. **Storage:**
   - Dedicated event store database
   - Append-only log structure
   - Indexed by aggregate_id and event_type

2. **Retention:**
   - Events retained per retention policy
   - Financial events: 10 years
   - Operational events: 1 year

3. **Querying:**
   - Query events by aggregate_id
   - Query events by event_type
   - Query events by date range

---

## Integration Events (Future)

### External System Integration

1. **Accounting Systems:**
   - Invoice data export
   - Financial data synchronization
   - Tax reporting

2. **Payment Gateways:**
   - Payment processing events
   - Payment confirmation events
   - Refund events

3. **Third-Party Services:**
   - Marketing platform integration
   - CRM integration
   - Analytics platform integration

### Integration Event Structure

Integration events follow the same structure as domain events but are intended for external consumption:

- Event payload includes all necessary data
- Event format is versioned and documented
- Event delivery is guaranteed (at-least-once)

---

## Best Practices

### Event Design

1. **Event Naming:**
   - Use past tense (e.g., "InvoiceIssued", not "IssueInvoice")
   - Be specific and descriptive
   - Follow consistent naming convention

2. **Event Payload:**
   - Include all necessary data
   - Avoid including sensitive data unnecessarily
   - Keep payload size reasonable

3. **Event Granularity:**
   - One event per significant occurrence
   - Not too fine-grained (performance)
   - Not too coarse-grained (flexibility)

### Event Publishing

1. **Transaction Boundaries:**
   - Publish events within transaction
   - Ensure event publishing is atomic
   - Rollback if critical event publishing fails

2. **Event Ordering:**
   - Maintain order for same aggregate
   - Use causation_id for event chains
   - Handle out-of-order events gracefully

3. **Performance:**
   - Use asynchronous publishing for non-critical events
   - Batch events when possible
   - Monitor event publishing performance

### Event Consumption

1. **Idempotency:**
   - Always implement idempotent consumers
   - Check for duplicate events
   - Handle idempotency keys

2. **Error Handling:**
   - Implement retry logic
   - Use dead letter queues
   - Monitor and alert on failures

3. **Performance:**
   - Process events asynchronously
   - Use parallel processing when safe
   - Monitor consumption latency

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

