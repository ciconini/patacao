# Data Transfer Object (DTO) Definitions: Financial Module

## Overview

This document defines all Data Transfer Objects (DTOs) used for input/output operations in the Financial Module of the Petshop Management System. DTOs are used for API requests and responses, following Clean/Hexagonal Architecture principles.

**Module:** Financial  
**Context:** Petshop Management System (Portugal)  
**Architecture:** Clean/Hexagonal Architecture

---

## Invoice DTOs

### InvoiceLineDTO

**Purpose:**  
Invoice line item structure used in invoice creation and updates.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `description` | String | - | Yes | - | Max 2000 chars, non-empty | Must not be whitespace-only |
| `product_id` | UUID | - | No | - | Valid UUID, must exist if provided | Product identifier (if product line) |
| `service_id` | UUID | - | No | - | Valid UUID, must exist if provided | Service identifier (if service line) |
| `quantity` | Integer | - | Yes | - | Min 1 | Quantity of items |
| `unit_price` | Decimal | - | Yes | - | >= 0.00, precision 12.2 | Unit price per item |
| `vat_rate` | Decimal | - | Yes | - | 0.00 to 100.00, precision 5.2 | VAT rate percentage (e.g., 23.00 for 23%) |

**Note:** Either `product_id` or `service_id` can be provided, but not both. At least one must be provided.

**Example Payload:**
```json
{
  "description": "Dog Grooming Service",
  "service_id": "990e8400-e29b-41d4-a716-446655440000",
  "quantity": 1,
  "unit_price": 25.00,
  "vat_rate": 23.00
}
```

---

### CreateInvoiceDTO

**Purpose:**  
Input DTO for creating a new invoice in draft status.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `company_id` | UUID | - | Yes | - | Valid UUID, must exist | Company identifier |
| `store_id` | UUID | - | Yes | - | Valid UUID, must exist | Store identifier |
| `buyer_customer_id` | UUID | - | No | - | Valid UUID, must exist if provided | Customer identifier (buyer) |
| `lines` | Array[InvoiceLineDTO] | - | Yes | - | Min 1 line item | Array of invoice line items |
| `status` | String | - | No | "draft" | "draft" only | Invoice status (defaults to "draft") |

**Example Payload:**
```json
{
  "company_id": "550e8400-e29b-41d4-a716-446655440000",
  "store_id": "660e8400-e29b-41d4-a716-446655440000",
  "buyer_customer_id": "770e8400-e29b-41d4-a716-446655440000",
  "lines": [
    {
      "description": "Dog Grooming Service",
      "service_id": "990e8400-e29b-41d4-a716-446655440000",
      "quantity": 1,
      "unit_price": 25.00,
      "vat_rate": 23.00
    },
    {
      "description": "Dog Food Premium",
      "product_id": "880e8400-e29b-41d4-a716-446655440000",
      "quantity": 2,
      "unit_price": 15.50,
      "vat_rate": 23.00
    }
  ],
  "status": "draft"
}
```

---

### UpdateInvoiceDTO

**Purpose:**  
Input DTO for updating an existing draft invoice. All fields are optional (partial update). Only draft invoices can be updated.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `buyer_customer_id` | UUID | - | No | - | Valid UUID, must exist if provided | Customer identifier (buyer) |
| `lines` | Array[InvoiceLineDTO] | - | No | - | Min 1 line item if provided | Array of invoice line items |
| `status` | String | - | No | - | "draft" only | Invoice status (can only be "draft") |

**Example Payload:**
```json
{
  "buyer_customer_id": "770e8400-e29b-41d4-a716-446655440000",
  "lines": [
    {
      "description": "Dog Grooming Service",
      "service_id": "990e8400-e29b-41d4-a716-446655440000",
      "quantity": 2,
      "unit_price": 25.00,
      "vat_rate": 23.00
    }
  ]
}
```

---

### InvoiceLineResponseDTO

**Purpose:**  
Output DTO for invoice line item responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `invoice_id` | UUID | - | Yes | - | Valid UUID | Invoice identifier |
| `description` | String | - | Yes | - | Max 2000 chars | Line item description |
| `product_id` | UUID | - | No | null | Valid UUID | Product identifier (nullable) |
| `service_id` | UUID | - | No | null | Valid UUID | Service identifier (nullable) |
| `quantity` | Integer | - | Yes | - | >= 1 | Quantity of items |
| `unit_price` | Decimal | - | Yes | - | >= 0.00 | Unit price per item |
| `vat_rate` | Decimal | - | Yes | - | 0.00 to 100.00 | VAT rate percentage |
| `line_total` | Decimal | - | Yes | - | >= 0.00 | Line total (quantity * unit_price * (1 + vat_rate/100)) |

**Example Payload:**
```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440000",
  "invoice_id": "bb0e8400-e29b-41d4-a716-446655440000",
  "description": "Dog Grooming Service",
  "service_id": "990e8400-e29b-41d4-a716-446655440000",
  "product_id": null,
  "quantity": 1,
  "unit_price": 25.00,
  "vat_rate": 23.00,
  "line_total": 30.75
}
```

---

### InvoiceResponseDTO

**Purpose:**  
Output DTO for invoice responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `company_id` | UUID | - | Yes | - | Valid UUID | Company identifier |
| `store_id` | UUID | - | Yes | - | Valid UUID | Store identifier |
| `invoice_number` | String | - | Yes | - | Max 128 chars | Sequential invoice number (placeholder for draft) |
| `issued_at` | String | ISO 8601 | No | null | Valid datetime | Issue date (nullable for draft) |
| `buyer_customer_id` | UUID | - | No | null | Valid UUID | Customer identifier (nullable) |
| `lines` | Array[InvoiceLineResponseDTO] | - | Yes | - | Min 1 line item | Array of invoice line items |
| `subtotal` | Decimal | - | Yes | - | >= 0.00, precision 12.2 | Subtotal (sum of line totals before VAT) |
| `vat_total` | Decimal | - | Yes | - | >= 0.00, precision 12.2 | Total VAT amount |
| `total` | Decimal | - | Yes | - | >= 0.00, precision 12.2 | Grand total (subtotal + VAT) |
| `status` | String | - | Yes | - | "draft", "issued", "paid", "cancelled", "refunded" | Invoice status |
| `paid_at` | String | ISO 8601 | No | null | Valid datetime | Payment date (nullable) |
| `payment_method` | String | - | No | null | Max 64 chars | Payment method (nullable) |
| `external_reference` | String | - | No | null | Max 255 chars | External payment reference (nullable) |
| `created_by` | UUID | - | Yes | - | Valid UUID | User who created the invoice |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |
| `updated_at` | String | ISO 8601 | No | null | Valid datetime | Last update timestamp (nullable) |

**Example Payload:**
```json
{
  "id": "bb0e8400-e29b-41d4-a716-446655440000",
  "company_id": "550e8400-e29b-41d4-a716-446655440000",
  "store_id": "660e8400-e29b-41d4-a716-446655440000",
  "invoice_number": "INV-2024-001",
  "issued_at": "2024-01-15T10:30:00Z",
  "buyer_customer_id": "770e8400-e29b-41d4-a716-446655440000",
  "lines": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440000",
      "invoice_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "description": "Dog Grooming Service",
      "service_id": "990e8400-e29b-41d4-a716-446655440000",
      "product_id": null,
      "quantity": 1,
      "unit_price": 25.00,
      "vat_rate": 23.00,
      "line_total": 30.75
    }
  ],
  "subtotal": 56.00,
  "vat_total": 12.88,
  "total": 68.88,
  "status": "issued",
  "paid_at": null,
  "payment_method": null,
  "external_reference": null,
  "created_by": "990e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

### MarkInvoicePaidDTO

**Purpose:**  
Input DTO for marking an invoice as paid.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `payment_method` | String | - | Yes | - | Max 64 chars, non-empty | Payment method (e.g., "cash", "card", "transfer", "check", "mb_way", "multibanco") |
| `paid_at` | String | ISO 8601 | No | Current time | Valid datetime, not future | Payment date/time |
| `external_reference` | String | - | No | - | Max 255 chars | External payment reference (transaction ID, check number, etc.) |

**Example Payload:**
```json
{
  "payment_method": "card",
  "paid_at": "2024-01-15T14:30:00Z",
  "external_reference": "TXN-123456789"
}
```

---

### VoidInvoiceDTO

**Purpose:**  
Input DTO for voiding an invoice.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `reason` | String | - | Yes | - | Max 500 chars, non-empty | Reason for voiding the invoice |

**Example Payload:**
```json
{
  "reason": "Invoice issued in error. Customer requested cancellation."
}
```

---

### SearchInvoicesDTO

**Purpose:**  
Input DTO for searching invoices with filters and pagination.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `company_id` | UUID | - | No | - | Valid UUID | Filter by company |
| `store_id` | UUID | - | No | - | Valid UUID | Filter by store |
| `status` | String | - | No | - | "draft", "issued", "paid", "cancelled", "refunded" | Filter by status (exact match) |
| `from` | String | yyyy-MM-dd | No | - | Valid date | Start date (filter by `issued_at`) |
| `to` | String | yyyy-MM-dd | No | - | Valid date, >= from | End date (filter by `issued_at`) |
| `buyer_customer_id` | UUID | - | No | - | Valid UUID | Filter by customer |
| `invoice_number` | String | - | No | - | Max 128 chars | Filter by invoice number (partial match) |
| `page` | Integer | - | No | 1 | Min 1 | Page number for pagination |
| `per_page` | Integer | - | No | 20 | Min 1, max 100 | Number of results per page |
| `sort` | String | - | No | "-issued_at" | Valid sort field | Sort field and direction ("-" prefix for descending) |

**Example Payload:**
```json
{
  "company_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "issued",
  "from": "2024-01-01",
  "to": "2024-01-31",
  "page": 1,
  "per_page": 20,
  "sort": "-issued_at"
}
```

---

### PaginatedInvoicesResponseDTO

**Purpose:**  
Output DTO for paginated invoice search results.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `items` | Array[InvoiceResponseDTO] | - | Yes | - | Array of invoice objects | Matching invoices |
| `meta` | PaginationMetaDTO | - | Yes | - | Valid pagination metadata | Pagination information |

**Example Payload:**
```json
{
  "items": [
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440000",
      "company_id": "550e8400-e29b-41d4-a716-446655440000",
      "store_id": "660e8400-e29b-41d4-a716-446655440000",
      "invoice_number": "INV-2024-001",
      "issued_at": "2024-01-15T10:30:00Z",
      "buyer_customer_id": "770e8400-e29b-41d4-a716-446655440000",
      "lines": [],
      "subtotal": 56.00,
      "vat_total": 12.88,
      "total": 68.88,
      "status": "issued",
      "paid_at": null,
      "payment_method": null,
      "external_reference": null,
      "created_by": "990e8400-e29b-41d4-a716-446655440000",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "per_page": 20,
    "total_pages": 8,
    "has_next": true,
    "has_previous": false
  }
}
```

---

## Credit Note DTOs

### CreateCreditNoteDTO

**Purpose:**  
Input DTO for creating a new credit note.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `invoice_id` | UUID | - | Yes | - | Valid UUID, must exist, status="issued" or "paid" | Original invoice identifier |
| `reason` | String | - | Yes | - | Max 500 chars, non-empty | Reason for credit note (e.g., "Refund", "Invoice correction", "Product return", "Service cancellation", "Discount adjustment", "Other") |
| `amount` | Decimal | - | Yes | - | > 0.00, <= invoice total, precision 12.2 | Credit note amount (must not exceed invoice total or outstanding amount) |

**Example Payload:**
```json
{
  "invoice_id": "bb0e8400-e29b-41d4-a716-446655440000",
  "reason": "Product return - Customer returned defective item",
  "amount": 15.50
}
```

---

### CreditNoteResponseDTO

**Purpose:**  
Output DTO for credit note responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `invoice_id` | UUID | - | Yes | - | Valid UUID | Original invoice identifier |
| `invoice_number` | String | - | Yes | - | Max 128 chars | Original invoice number (from invoice) |
| `issued_at` | String | ISO 8601 | Yes | - | Valid datetime | Credit note issue timestamp |
| `reason` | String | - | Yes | - | Max 500 chars | Reason for credit note |
| `amount` | Decimal | - | Yes | - | > 0.00, precision 12.2 | Credit note amount |
| `created_by` | UUID | - | Yes | - | Valid UUID | User who created the credit note |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |

**Example Payload:**
```json
{
  "id": "cc0e8400-e29b-41d4-a716-446655440000",
  "invoice_id": "bb0e8400-e29b-41d4-a716-446655440000",
  "invoice_number": "INV-2024-001",
  "issued_at": "2024-01-20T14:30:00Z",
  "reason": "Product return - Customer returned defective item",
  "amount": 15.50,
  "created_by": "990e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-20T14:30:00Z"
}
```

---

## Transaction DTOs

### TransactionLineDTO

**Purpose:**  
Transaction line item structure used in transaction creation.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `product_id` | UUID | - | No | - | Valid UUID, must exist if provided | Product identifier (if product line) |
| `service_id` | UUID | - | No | - | Valid UUID, must exist if provided | Service identifier (if service line) |
| `quantity` | Integer | - | Yes | - | Min 1 | Quantity of items |
| `unit_price` | Decimal | - | Yes | - | >= 0.00, precision 12.2 | Unit price per item |

**Note:** Either `product_id` or `service_id` can be provided, but not both. At least one must be provided.

**Example Payload:**
```json
{
  "product_id": "880e8400-e29b-41d4-a716-446655440000",
  "quantity": 2,
  "unit_price": 15.50
}
```

---

### CreateTransactionDTO

**Purpose:**  
Input DTO for creating a new transaction (POS checkout).

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `store_id` | UUID | - | Yes | - | Valid UUID, must exist | Store identifier |
| `customer_id` | UUID | - | No | - | Valid UUID, must exist if provided | Customer identifier (buyer) |
| `lines` | Array[TransactionLineDTO] | - | Yes | - | Min 1 line item | Array of transaction line items |
| `create_invoice` | Boolean | - | No | true | true/false | Create draft invoice (defaults to true) |

**Example Payload:**
```json
{
  "store_id": "660e8400-e29b-41d4-a716-446655440000",
  "customer_id": "770e8400-e29b-41d4-a716-446655440000",
  "lines": [
    {
      "product_id": "880e8400-e29b-41d4-a716-446655440000",
      "quantity": 2,
      "unit_price": 15.50
    },
    {
      "service_id": "990e8400-e29b-41d4-a716-446655440000",
      "quantity": 1,
      "unit_price": 25.00
    }
  ],
  "create_invoice": true
}
```

---

### TransactionLineResponseDTO

**Purpose:**  
Output DTO for transaction line item responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `transaction_id` | UUID | - | Yes | - | Valid UUID | Transaction identifier |
| `product_id` | UUID | - | No | null | Valid UUID | Product identifier (nullable) |
| `service_id` | UUID | - | No | null | Valid UUID | Service identifier (nullable) |
| `quantity` | Integer | - | Yes | - | >= 1 | Quantity of items |
| `unit_price` | Decimal | - | Yes | - | >= 0.00 | Unit price per item |
| `line_total` | Decimal | - | Yes | - | >= 0.00 | Line total (quantity * unit_price) |

**Example Payload:**
```json
{
  "id": "dd0e8400-e29b-41d4-a716-446655440000",
  "transaction_id": "ee0e8400-e29b-41d4-a716-446655440000",
  "product_id": "880e8400-e29b-41d4-a716-446655440000",
  "service_id": null,
  "quantity": 2,
  "unit_price": 15.50,
  "line_total": 31.00
}
```

---

### TransactionResponseDTO

**Purpose:**  
Output DTO for transaction responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `store_id` | UUID | - | Yes | - | Valid UUID | Store identifier |
| `invoice_id` | UUID | - | Yes | - | Valid UUID | Linked invoice identifier |
| `lines` | Array[TransactionLineResponseDTO] | - | Yes | - | Min 1 line item | Array of transaction line items |
| `total_amount` | Decimal | - | Yes | - | >= 0.00, precision 12.2 | Transaction total amount |
| `payment_status` | String | - | Yes | - | "pending", "paid_manual", "refunded" | Payment status |
| `created_by` | UUID | - | Yes | - | Valid UUID | User who created the transaction |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |
| `updated_at` | String | ISO 8601 | No | null | Valid datetime | Last update timestamp (nullable) |

**Example Payload:**
```json
{
  "id": "ee0e8400-e29b-41d4-a716-446655440000",
  "store_id": "660e8400-e29b-41d4-a716-446655440000",
  "invoice_id": "bb0e8400-e29b-41d4-a716-446655440000",
  "lines": [
    {
      "id": "dd0e8400-e29b-41d4-a716-446655440000",
      "transaction_id": "ee0e8400-e29b-41d4-a716-446655440000",
      "product_id": "880e8400-e29b-41d4-a716-446655440000",
      "service_id": null,
      "quantity": 2,
      "unit_price": 15.50,
      "line_total": 31.00
    }
  ],
  "total_amount": 56.00,
  "payment_status": "pending",
  "created_by": "990e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

### CompleteTransactionDTO

**Purpose:**  
Input DTO for completing a transaction (recording payment and triggering stock decrements).

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `payment_method` | String | - | No | - | Max 64 chars | Payment method (e.g., "cash", "card", "transfer", "check", "mb_way", "multibanco") |
| `paid_at` | String | ISO 8601 | No | Current time | Valid datetime, not future | Payment date/time |
| `external_reference` | String | - | No | - | Max 255 chars | External payment reference (transaction ID, check number, etc.) |

**Example Payload:**
```json
{
  "payment_method": "card",
  "paid_at": "2024-01-15T14:30:00Z",
  "external_reference": "TXN-123456789"
}
```

---

### SearchTransactionsDTO

**Purpose:**  
Input DTO for searching transactions with filters and pagination.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `store_id` | UUID | - | No | - | Valid UUID | Filter by store |
| `status` | String | - | No | - | "pending", "paid_manual", "refunded" | Filter by payment status (exact match) |
| `from` | String | yyyy-MM-dd | No | - | Valid date | Start date (filter by `created_at`) |
| `to` | String | yyyy-MM-dd | No | - | Valid date, >= from | End date (filter by `created_at`) |
| `page` | Integer | - | No | 1 | Min 1 | Page number for pagination |
| `per_page` | Integer | - | No | 20 | Min 1, max 100 | Number of results per page |
| `sort` | String | - | No | "-created_at" | Valid sort field | Sort field and direction ("-" prefix for descending) |

**Example Payload:**
```json
{
  "store_id": "660e8400-e29b-41d4-a716-446655440000",
  "status": "paid_manual",
  "from": "2024-01-01",
  "to": "2024-01-31",
  "page": 1,
  "per_page": 20,
  "sort": "-created_at"
}
```

---

### PaginatedTransactionsResponseDTO

**Purpose:**  
Output DTO for paginated transaction search results.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `items` | Array[TransactionResponseDTO] | - | Yes | - | Array of transaction objects | Matching transactions |
| `meta` | PaginationMetaDTO | - | Yes | - | Valid pagination metadata | Pagination information |

**Example Payload:**
```json
{
  "items": [
    {
      "id": "ee0e8400-e29b-41d4-a716-446655440000",
      "store_id": "660e8400-e29b-41d4-a716-446655440000",
      "invoice_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "lines": [],
      "total_amount": 56.00,
      "payment_status": "paid_manual",
      "created_by": "990e8400-e29b-41d4-a716-446655440000",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T14:30:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "per_page": 20,
    "total_pages": 8,
    "has_next": true,
    "has_previous": false
  }
}
```

---

## Financial Export DTOs

### CreateFinancialExportDTO

**Purpose:**  
Input DTO for creating a new financial export.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `company_id` | UUID | - | Yes | - | Valid UUID, must exist | Company identifier |
| `period_start` | String | yyyy-MM-dd | Yes | - | Valid date, <= period_end | Start date of export period (inclusive) |
| `period_end` | String | yyyy-MM-dd | Yes | - | Valid date, >= period_start | End date of export period (inclusive) |
| `format` | String | - | Yes | - | "csv" or "json" | Export file format |
| `include_voided` | Boolean | - | No | false | true/false | Include voided invoices (defaults to false) |
| `delivery_method` | String | - | No | "download" | "download" or "sftp" | Delivery method (defaults to "download") |

**Example Payload:**
```json
{
  "company_id": "550e8400-e29b-41d4-a716-446655440000",
  "period_start": "2024-01-01",
  "period_end": "2024-01-31",
  "format": "csv",
  "include_voided": false,
  "delivery_method": "download"
}
```

---

### FinancialExportResponseDTO

**Purpose:**  
Output DTO for financial export responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `company_id` | UUID | - | Yes | - | Valid UUID | Company identifier |
| `period_start` | String | yyyy-MM-dd | Yes | - | Valid date | Export period start date |
| `period_end` | String | yyyy-MM-dd | Yes | - | Valid date | Export period end date |
| `format` | String | - | Yes | - | "csv" or "json" | Export format |
| `status` | String | - | Yes | - | "pending", "processing", "completed", "failed" | Export status |
| `file_path` | String | - | No | null | Max 1024 chars | Local file path (nullable) |
| `sftp_reference` | JSON Object | - | No | null | Valid JSON | SFTP delivery reference (nullable) |
| `record_count` | Integer | - | No | null | >= 0 | Number of records exported (nullable) |
| `created_by` | UUID | - | Yes | - | Valid UUID | User who created the export |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |
| `completed_at` | String | ISO 8601 | No | null | Valid datetime | Completion timestamp (nullable) |
| `download_url` | String | - | No | null | Max 512 chars | Download URL (nullable, if delivery_method="download") |

**Example Payload:**
```json
{
  "id": "ff0e8400-e29b-41d4-a716-446655440000",
  "company_id": "550e8400-e29b-41d4-a716-446655440000",
  "period_start": "2024-01-01",
  "period_end": "2024-01-31",
  "format": "csv",
  "status": "completed",
  "file_path": "/exports/financial_2024_01_550e8400.csv",
  "sftp_reference": null,
  "record_count": 1250,
  "created_by": "990e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-02-01T10:30:00Z",
  "completed_at": "2024-02-01T10:32:15Z",
  "download_url": "https://api.patacao.pt/exports/download/ff0e8400-e29b-41d4-a716-446655440000"
}
```

---

### SearchFinancialExportsDTO

**Purpose:**  
Input DTO for searching financial exports with filters and pagination.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `company_id` | UUID | - | No | - | Valid UUID | Filter by company |
| `status` | String | - | No | - | "pending", "processing", "completed", "failed" | Filter by status (exact match) |
| `format` | String | - | No | - | "csv" or "json" | Filter by format (exact match) |
| `from` | String | yyyy-MM-dd | No | - | Valid date | Start date (filter by `created_at`) |
| `to` | String | yyyy-MM-dd | No | - | Valid date, >= from | End date (filter by `created_at`) |
| `page` | Integer | - | No | 1 | Min 1 | Page number for pagination |
| `per_page` | Integer | - | No | 20 | Min 1, max 100 | Number of results per page |
| `sort` | String | - | No | "-created_at" | Valid sort field | Sort field and direction ("-" prefix for descending) |

**Example Payload:**
```json
{
  "company_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "format": "csv",
  "from": "2024-01-01",
  "to": "2024-01-31",
  "page": 1,
  "per_page": 20,
  "sort": "-created_at"
}
```

---

### PaginatedFinancialExportsResponseDTO

**Purpose:**  
Output DTO for paginated financial export search results.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `items` | Array[FinancialExportResponseDTO] | - | Yes | - | Array of financial export objects | Matching exports |
| `meta` | PaginationMetaDTO | - | Yes | - | Valid pagination metadata | Pagination information |

**Example Payload:**
```json
{
  "items": [
    {
      "id": "ff0e8400-e29b-41d4-a716-446655440000",
      "company_id": "550e8400-e29b-41d4-a716-446655440000",
      "period_start": "2024-01-01",
      "period_end": "2024-01-31",
      "format": "csv",
      "status": "completed",
      "file_path": "/exports/financial_2024_01_550e8400.csv",
      "sftp_reference": null,
      "record_count": 1250,
      "created_by": "990e8400-e29b-41d4-a716-446655440000",
      "created_at": "2024-02-01T10:30:00Z",
      "completed_at": "2024-02-01T10:32:15Z",
      "download_url": "https://api.patacao.pt/exports/download/ff0e8400-e29b-41d4-a716-446655440000"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "per_page": 20,
    "total_pages": 2,
    "has_next": true,
    "has_previous": false
  }
}
```

---

## Validation Notes

### Portuguese-Specific Validations

1. **VAT Rates:**
   - Common rates: 0.00%, 6.00%, 13.00%, 23.00%
   - Must be between 0.00 and 100.00
   - Precision: 5.2 (e.g., 23.00)

2. **Invoice Numbering:**
   - Sequential per company/store
   - Format may include prefix, year, and sequence (e.g., "INV-2024-001")
   - Must be unique

3. **Payment Methods:**
   - Common values: "cash", "card", "transfer", "check", "mb_way", "multibanco"
   - Portuguese-specific: "mb_way", "multibanco"

### Common Validation Rules

1. **Decimal Precision:**
   - Amounts: 12 digits total, 2 decimal places (DECIMAL(12,2))
   - VAT rates: 5 digits total, 2 decimal places (DECIMAL(5,2))
   - Range: 0.00 to 9999999999.99 for amounts
   - Range: 0.00 to 100.00 for VAT rates

2. **Date Formats:**
   - Dates: `yyyy-MM-dd` (e.g., "2024-01-15")
   - DateTimes: ISO 8601 format (e.g., "2024-01-15T10:30:00Z")

3. **Invoice Status:**
   - Valid values: "draft", "issued", "paid", "cancelled", "refunded"
   - Status transitions are restricted (business rule validation)

4. **Payment Status:**
   - Valid values: "pending", "paid_manual", "refunded"
   - Status transitions are restricted (business rule validation)

5. **Export Format:**
   - Valid values: "csv", "json"
   - Case-sensitive

6. **Export Status:**
   - Valid values: "pending", "processing", "completed", "failed"
   - Status transitions are restricted (business rule validation)

### Business Rules

1. **Invoice Totals:**
   - `subtotal` = sum of line totals (before VAT)
   - `vat_total` = sum of line VAT amounts
   - `total` = `subtotal + vat_total`
   - Line total = `quantity * unit_price * (1 + vat_rate/100)`

2. **Transaction Totals:**
   - `total_amount` = sum of line totals
   - Line total = `quantity * unit_price`

3. **Credit Note Amount:**
   - Must be > 0
   - Cannot exceed invoice total
   - Cannot exceed outstanding amount (invoice total - sum of existing credit notes)

4. **Export Period:**
   - `period_start` must be <= `period_end`
   - Period dates are inclusive
   - Period cannot exceed maximum allowed range (e.g., 1 year, business rule dependent)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

