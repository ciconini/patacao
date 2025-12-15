# Data Transfer Object (DTO) Definitions: Inventory Module

## Overview

This document defines all Data Transfer Objects (DTOs) used for input/output operations in the Inventory Module of the Petshop Management System. DTOs are used for API requests and responses, following Clean/Hexagonal Architecture principles.

**Module:** Inventory  
**Context:** Petshop Management System (Portugal)  
**Architecture:** Clean/Hexagonal Architecture

---

## Product DTOs

### CreateProductDTO

**Purpose:**  
Input DTO for creating a new product.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `sku` | String | - | Yes | - | Max 64 chars, unique, non-empty | SKU must be unique (company-global) |
| `name` | String | - | Yes | - | Max 255 chars, non-empty | Must not be whitespace-only |
| `description` | String | - | No | - | Max 5000 chars | Product description |
| `category` | String | - | No | - | Max 128 chars | Product category |
| `unit_price` | Decimal | - | Yes | - | >= 0.00, precision 12.2 | Default unit price |
| `vat_rate` | Decimal | - | Yes | - | 0.00 to 100.00, precision 5.2 | VAT rate percentage (e.g., 0.00, 6.00, 13.00, 23.00) |
| `stock_tracked` | Boolean | - | Yes | true | true/false | Stock tracking flag (defaults to true) |
| `reorder_threshold` | Integer | - | No | - | >= 0 | Low-stock threshold for alerts |
| `supplier_id` | UUID | - | No | - | Valid UUID, must exist if provided | Supplier identifier |

**Example Payload:**
```json
{
  "sku": "DOG-FOOD-PREM-001",
  "name": "Premium Dog Food 15kg",
  "description": "High-quality premium dog food for adult dogs",
  "category": "Food",
  "unit_price": 45.99,
  "vat_rate": 23.00,
  "stock_tracked": true,
  "reorder_threshold": 10,
  "supplier_id": "aa0e8400-e29b-41d4-a716-446655440000"
}
```

---

### UpdateProductDTO

**Purpose:**  
Input DTO for updating an existing product. All fields are optional (partial update). SKU is immutable.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `name` | String | - | No | - | Max 255 chars, non-empty | Must not be whitespace-only if provided |
| `description` | String | - | No | - | Max 5000 chars | Product description if provided |
| `category` | String | - | No | - | Max 128 chars | Product category if provided |
| `unit_price` | Decimal | - | No | - | >= 0.00, precision 12.2 | Unit price if provided |
| `vat_rate` | Decimal | - | No | - | 0.00 to 100.00, precision 5.2 | VAT rate if provided |
| `stock_tracked` | Boolean | - | No | - | true/false | Stock tracking flag if provided |
| `reorder_threshold` | Integer | - | No | - | >= 0 | Low-stock threshold if provided |
| `supplier_id` | UUID | - | No | - | Valid UUID, must exist if provided | Supplier identifier if provided |

**Example Payload:**
```json
{
  "name": "Premium Dog Food 15kg - Updated",
  "unit_price": 47.99,
  "reorder_threshold": 15
}
```

---

### ProductResponseDTO

**Purpose:**  
Output DTO for product responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `sku` | String | - | Yes | - | Max 64 chars | SKU (unique) |
| `name` | String | - | Yes | - | Max 255 chars | Product name |
| `description` | String | - | No | null | Max 5000 chars | Product description (nullable) |
| `category` | String | - | No | null | Max 128 chars | Product category (nullable) |
| `unit_price` | Decimal | - | Yes | - | >= 0.00 | Default unit price |
| `vat_rate` | Decimal | - | Yes | - | 0.00 to 100.00 | VAT rate percentage |
| `stock_tracked` | Boolean | - | Yes | true | true/false | Stock tracking flag |
| `reorder_threshold` | Integer | - | No | null | >= 0 | Low-stock threshold (nullable) |
| `supplier_id` | UUID | - | No | null | Valid UUID | Supplier identifier (nullable) |
| `on_hand` | Integer | - | No | null | >= 0 | Current on-hand quantity (nullable, if aggregated) |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |
| `updated_at` | String | ISO 8601 | No | null | Valid datetime | Last update timestamp (nullable) |

**Example Payload:**
```json
{
  "id": "bb0e8400-e29b-41d4-a716-446655440000",
  "sku": "DOG-FOOD-PREM-001",
  "name": "Premium Dog Food 15kg",
  "description": "High-quality premium dog food for adult dogs",
  "category": "Food",
  "unit_price": 45.99,
  "vat_rate": 23.00,
  "stock_tracked": true,
  "reorder_threshold": 10,
  "supplier_id": "aa0e8400-e29b-41d4-a716-446655440000",
  "on_hand": 25,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:45:00Z"
}
```

---

### SearchProductsDTO

**Purpose:**  
Input DTO for searching products with filters and pagination.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `q` | String | - | No | - | Max 255 chars | General search query (searches name, SKU, description) |
| `sku` | String | - | No | - | Max 64 chars | Filter by exact SKU match |
| `category` | String | - | No | - | Max 128 chars | Filter by category (exact match) |
| `supplier_id` | UUID | - | No | - | Valid UUID | Filter by supplier |
| `stock_tracked` | Boolean | - | No | - | true/false | Filter by stock tracking flag |
| `low_stock` | Boolean | - | No | - | true/false | Filter products with on_hand <= reorder_threshold |
| `page` | Integer | - | No | 1 | Min 1 | Page number for pagination |
| `per_page` | Integer | - | No | 20 | Min 1, max 100 | Number of results per page |
| `sort` | String | - | No | "name" | Valid sort field | Sort field and direction ("-" prefix for descending) |

**Example Payload:**
```json
{
  "q": "dog food",
  "category": "Food",
  "stock_tracked": true,
  "low_stock": true,
  "page": 1,
  "per_page": 20,
  "sort": "name"
}
```

---

### PaginatedProductsResponseDTO

**Purpose:**  
Output DTO for paginated product search results.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `items` | Array[ProductResponseDTO] | - | Yes | - | Array of product objects | Matching products |
| `meta` | PaginationMetaDTO | - | Yes | - | Valid pagination metadata | Pagination information |

**Example Payload:**
```json
{
  "items": [
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440000",
      "sku": "DOG-FOOD-PREM-001",
      "name": "Premium Dog Food 15kg",
      "description": "High-quality premium dog food for adult dogs",
      "category": "Food",
      "unit_price": 45.99,
      "vat_rate": 23.00,
      "stock_tracked": true,
      "reorder_threshold": 10,
      "supplier_id": "aa0e8400-e29b-41d4-a716-446655440000",
      "on_hand": 25,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:45:00Z"
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

## Supplier DTOs

### CreateSupplierDTO

**Purpose:**  
Input DTO for creating a new supplier.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `name` | String | - | Yes | - | Max 255 chars, non-empty | Must not be whitespace-only |
| `contact_email` | String | - | No | - | Valid email format, max 255 chars | Standard email validation |
| `phone` | String | - | No | - | Max 32 chars, valid phone format | Portuguese phone format |
| `default_lead_time_days` | Integer | - | No | - | >= 0 | Default lead time in days for reorder calculations |

**Example Payload:**
```json
{
  "name": "Pet Supplies Wholesale Ltd",
  "contact_email": "orders@petsupplies.pt",
  "phone": "+351 21 123 4567",
  "default_lead_time_days": 7
}
```

---

### UpdateSupplierDTO

**Purpose:**  
Input DTO for updating an existing supplier. All fields are optional (partial update).

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `name` | String | - | No | - | Max 255 chars, non-empty | Must not be whitespace-only if provided |
| `contact_email` | String | - | No | - | Valid email format, max 255 chars | Standard email validation if provided |
| `phone` | String | - | No | - | Max 32 chars, valid phone format | Portuguese phone format if provided |
| `default_lead_time_days` | Integer | - | No | - | >= 0 | Default lead time in days if provided |

**Example Payload:**
```json
{
  "contact_email": "newemail@petsupplies.pt",
  "default_lead_time_days": 10
}
```

---

### SupplierResponseDTO

**Purpose:**  
Output DTO for supplier responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `name` | String | - | Yes | - | Max 255 chars | Supplier name |
| `contact_email` | String | - | No | null | Max 255 chars | Contact email (nullable) |
| `phone` | String | - | No | null | Max 32 chars | Contact phone number (nullable) |
| `default_lead_time_days` | Integer | - | No | null | >= 0 | Default lead time in days (nullable) |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |
| `updated_at` | String | ISO 8601 | No | null | Valid datetime | Last update timestamp (nullable) |

**Example Payload:**
```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440000",
  "name": "Pet Supplies Wholesale Ltd",
  "contact_email": "orders@petsupplies.pt",
  "phone": "+351 21 123 4567",
  "default_lead_time_days": 7,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:45:00Z"
}
```

---

### SearchSuppliersDTO

**Purpose:**  
Input DTO for searching suppliers with filters and pagination.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `q` | String | - | No | - | Max 255 chars | General search query (searches name, email, phone) |
| `page` | Integer | - | No | 1 | Min 1 | Page number for pagination |
| `per_page` | Integer | - | No | 20 | Min 1, max 100 | Number of results per page |
| `sort` | String | - | No | "name" | Valid sort field | Sort field and direction ("-" prefix for descending) |

**Example Payload:**
```json
{
  "q": "Pet Supplies",
  "page": 1,
  "per_page": 20,
  "sort": "name"
}
```

---

## Stock Receipt DTOs

### StockReceiptLineDTO

**Purpose:**  
Stock receipt line item structure used in stock receipt creation.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `product_id` | UUID | - | Yes | - | Valid UUID, must exist | Product identifier |
| `quantity` | Integer | - | Yes | - | Min 1 | Quantity received |
| `batch_number` | String | - | No | - | Max 128 chars | Batch number for tracking |
| `expiry_date` | String | yyyy-MM-dd | No | - | Valid date, not past | Expiry date |
| `unit_cost` | Decimal | - | No | - | >= 0.00, precision 12.2 | Unit cost (for cost tracking) |

**Example Payload:**
```json
{
  "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
  "quantity": 50,
  "batch_number": "BATCH-2024-001",
  "expiry_date": "2025-12-31",
  "unit_cost": 35.00
}
```

---

### CreateStockReceiptDTO

**Purpose:**  
Input DTO for creating a new stock receipt.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `store_id` | UUID | - | Yes | - | Valid UUID, must exist | Store identifier |
| `supplier_id` | UUID | - | No | - | Valid UUID, must exist if provided | Supplier identifier |
| `purchase_order_id` | UUID | - | No | - | Valid UUID, must exist and be receivable if provided | Purchase order identifier |
| `location_id` | UUID | - | No | - | Valid UUID, must exist if provided | Inventory location identifier (defaults to store) |
| `lines` | Array[StockReceiptLineDTO] | - | Yes | - | Min 1 line item | Array of stock receipt line items |

**Example Payload:**
```json
{
  "store_id": "660e8400-e29b-41d4-a716-446655440000",
  "supplier_id": "aa0e8400-e29b-41d4-a716-446655440000",
  "purchase_order_id": "cc0e8400-e29b-41d4-a716-446655440000",
  "location_id": "dd0e8400-e29b-41d4-a716-446655440000",
  "lines": [
    {
      "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "quantity": 50,
      "batch_number": "BATCH-2024-001",
      "expiry_date": "2025-12-31",
      "unit_cost": 35.00
    }
  ]
}
```

---

### StockBatchResponseDTO

**Purpose:**  
Output DTO for stock batch responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `product_id` | UUID | - | Yes | - | Valid UUID | Product identifier |
| `batch_number` | String | - | No | null | Max 128 chars | Batch number (nullable) |
| `quantity` | Integer | - | Yes | - | >= 0 | Current quantity in batch |
| `expiry_date` | String | yyyy-MM-dd | No | null | Valid date | Expiry date (nullable) |
| `received_at` | String | ISO 8601 | Yes | - | Valid datetime | Receipt timestamp |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |
| `updated_at` | String | ISO 8601 | No | null | Valid datetime | Last update timestamp (nullable) |

**Example Payload:**
```json
{
  "id": "ee0e8400-e29b-41d4-a716-446655440000",
  "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
  "batch_number": "BATCH-2024-001",
  "quantity": 50,
  "expiry_date": "2025-12-31",
  "received_at": "2024-01-15T10:30:00Z",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

### StockMovementResponseDTO

**Purpose:**  
Output DTO for stock movement responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `product_id` | UUID | - | Yes | - | Valid UUID | Product identifier |
| `batch_id` | UUID | - | No | null | Valid UUID | Batch identifier (nullable) |
| `quantity_change` | Integer | - | Yes | - | Non-zero integer | Quantity change (positive for increase, negative for decrease) |
| `reason` | String | - | Yes | - | Max 64 chars | Movement reason (e.g., "receipt", "sale", "adjustment", "transfer", "reservation_release") |
| `performed_by` | UUID | - | Yes | - | Valid UUID | User who performed the movement |
| `location_id` | UUID | - | No | null | Valid UUID | Inventory location identifier (nullable) |
| `reference_id` | UUID | - | No | null | Valid UUID | Generic reference (invoice, purchase_order, transaction) (nullable) |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |

**Example Payload:**
```json
{
  "id": "ff0e8400-e29b-41d4-a716-446655440000",
  "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
  "batch_id": "ee0e8400-e29b-41d4-a716-446655440000",
  "quantity_change": 50,
  "reason": "receipt",
  "performed_by": "990e8400-e29b-41d4-a716-446655440000",
  "location_id": "dd0e8400-e29b-41d4-a716-446655440000",
  "reference_id": "cc0e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### StockReceiptResponseDTO

**Purpose:**  
Output DTO for stock receipt responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `receipt_id` | UUID | - | Yes | - | Valid UUID | Stock receipt identifier |
| `store_id` | UUID | - | Yes | - | Valid UUID | Store identifier |
| `supplier_id` | UUID | - | No | null | Valid UUID | Supplier identifier (nullable) |
| `purchase_order_id` | UUID | - | No | null | Valid UUID | Purchase order identifier (nullable) |
| `stock_batches` | Array[StockBatchResponseDTO] | - | Yes | - | Array of batch objects | Created/updated stock batches |
| `stock_movements` | Array[StockMovementResponseDTO] | - | Yes | - | Array of movement objects | Created stock movements |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |
| `updated_at` | String | ISO 8601 | No | null | Valid datetime | Last update timestamp (nullable) |

**Example Payload:**
```json
{
  "receipt_id": "110e8400-e29b-41d4-a716-446655440000",
  "store_id": "660e8400-e29b-41d4-a716-446655440000",
  "supplier_id": "aa0e8400-e29b-41d4-a716-446655440000",
  "purchase_order_id": "cc0e8400-e29b-41d4-a716-446655440000",
  "stock_batches": [
    {
      "id": "ee0e8400-e29b-41d4-a716-446655440000",
      "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "batch_number": "BATCH-2024-001",
      "quantity": 50,
      "expiry_date": "2025-12-31",
      "received_at": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "stock_movements": [
    {
      "id": "ff0e8400-e29b-41d4-a716-446655440000",
      "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "batch_id": "ee0e8400-e29b-41d4-a716-446655440000",
      "quantity_change": 50,
      "reason": "receipt",
      "performed_by": "990e8400-e29b-41d4-a716-446655440000",
      "location_id": "dd0e8400-e29b-41d4-a716-446655440000",
      "reference_id": "cc0e8400-e29b-41d4-a716-446655440000",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

### SearchStockBatchesDTO

**Purpose:**  
Input DTO for searching stock batches with filters and pagination.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `product_id` | UUID | - | No | - | Valid UUID | Filter by product |
| `batch_number` | String | - | No | - | Max 128 chars | Filter by batch number (partial match) |
| `expiry_before` | String | yyyy-MM-dd | No | - | Valid date | Filter batches expiring before this date |
| `expired` | Boolean | - | No | - | true/false | Filter expired batches (expiry_date < today) |
| `page` | Integer | - | No | 1 | Min 1 | Page number for pagination |
| `per_page` | Integer | - | No | 20 | Min 1, max 100 | Number of results per page |
| `sort` | String | - | No | "-expiry_date" | Valid sort field | Sort field and direction ("-" prefix for descending) |

**Example Payload:**
```json
{
  "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
  "expiry_before": "2025-12-31",
  "expired": false,
  "page": 1,
  "per_page": 20,
  "sort": "-expiry_date"
}
```

---

### SearchStockMovementsDTO

**Purpose:**  
Input DTO for searching stock movements with filters and pagination.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `product_id` | UUID | - | No | - | Valid UUID | Filter by product |
| `reason` | String | - | No | - | Max 64 chars | Filter by movement reason (exact match) |
| `from` | String | yyyy-MM-dd | No | - | Valid date | Start date (filter by `created_at`) |
| `to` | String | yyyy-MM-dd | No | - | Valid date, >= from | End date (filter by `created_at`) |
| `location_id` | UUID | - | No | - | Valid UUID | Filter by inventory location |
| `reference_id` | UUID | - | No | - | Valid UUID | Filter by reference (invoice, PO, transaction) |
| `page` | Integer | - | No | 1 | Min 1 | Page number for pagination |
| `per_page` | Integer | - | No | 20 | Min 1, max 100 | Number of results per page |
| `sort` | String | - | No | "-created_at" | Valid sort field | Sort field and direction ("-" prefix for descending) |

**Example Payload:**
```json
{
  "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
  "reason": "receipt",
  "from": "2024-01-01",
  "to": "2024-01-31",
  "page": 1,
  "per_page": 20,
  "sort": "-created_at"
}
```

---

## Stock Adjustment DTOs

### CreateStockAdjustmentDTO

**Purpose:**  
Input DTO for creating a stock adjustment.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `store_id` | UUID | - | Yes | - | Valid UUID, must exist | Store identifier |
| `product_id` | UUID | - | Yes | - | Valid UUID, must exist | Product identifier |
| `quantity_change` | Integer | - | Yes | - | Non-zero integer | Quantity change (positive for increase, negative for decrease) |
| `reason` | String | - | Yes | - | Max 255 chars, non-empty | Reason for adjustment (e.g., "damage", "theft", "found", "correction") |
| `location_id` | UUID | - | No | - | Valid UUID, must exist if provided | Inventory location identifier (defaults to store) |
| `reference_id` | UUID | - | No | - | Valid UUID | Optional reference (e.g., incident report ID) |

**Example Payload:**
```json
{
  "store_id": "660e8400-e29b-41d4-a716-446655440000",
  "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
  "quantity_change": -5,
  "reason": "Damaged items found during inventory check",
  "location_id": "dd0e8400-e29b-41d4-a716-446655440000",
  "reference_id": "220e8400-e29b-41d4-a716-446655440000"
}
```

---

## Inventory Reservation DTOs

### CreateInventoryReservationDTO

**Purpose:**  
Input DTO for creating an inventory reservation.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `product_id` | UUID | - | Yes | - | Valid UUID, must exist, stock_tracked=true | Product identifier |
| `quantity` | Integer | - | Yes | - | Min 1 | Quantity to reserve |
| `reserved_for_id` | UUID | - | Yes | - | Valid UUID, must exist | Target entity identifier (appointment or transaction) |
| `reserved_for_type` | String | - | Yes | - | "appointment" or "transaction" | Target entity type |
| `expires_at` | String | ISO 8601 | No | - | Valid datetime, future | Expiry datetime (nullable) |

**Example Payload:**
```json
{
  "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
  "quantity": 2,
  "reserved_for_id": "330e8400-e29b-41d4-a716-446655440000",
  "reserved_for_type": "appointment",
  "expires_at": "2024-01-20T18:00:00Z"
}
```

---

### InventoryReservationResponseDTO

**Purpose:**  
Output DTO for inventory reservation responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `product_id` | UUID | - | Yes | - | Valid UUID | Product identifier |
| `quantity` | Integer | - | Yes | - | >= 1 | Reserved quantity |
| `reserved_for_id` | UUID | - | Yes | - | Valid UUID | Target entity identifier |
| `reserved_for_type` | String | - | Yes | - | "appointment" or "transaction" | Target entity type |
| `expires_at` | String | ISO 8601 | No | null | Valid datetime | Expiry datetime (nullable) |
| `status` | String | - | Yes | - | "active", "released", "consumed" | Reservation status |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |

**Example Payload:**
```json
{
  "id": "440e8400-e29b-41d4-a716-446655440000",
  "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
  "quantity": 2,
  "reserved_for_id": "330e8400-e29b-41d4-a716-446655440000",
  "reserved_for_type": "appointment",
  "expires_at": "2024-01-20T18:00:00Z",
  "status": "active",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

## Purchase Order DTOs

### PurchaseOrderLineDTO

**Purpose:**  
Purchase order line item structure used in purchase order creation and updates.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `product_id` | UUID | - | Yes | - | Valid UUID, must exist | Product identifier |
| `quantity` | Integer | - | Yes | - | Min 1 | Quantity to order |
| `unit_price` | Decimal | - | Yes | - | >= 0.00, precision 12.2 | Unit price |

**Example Payload:**
```json
{
  "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
  "quantity": 100,
  "unit_price": 35.00
}
```

---

### CreatePurchaseOrderDTO

**Purpose:**  
Input DTO for creating a new purchase order.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `supplier_id` | UUID | - | Yes | - | Valid UUID, must exist | Supplier identifier |
| `store_id` | UUID | - | No | - | Valid UUID, must exist if provided | Store identifier (destination for goods) |
| `lines` | Array[PurchaseOrderLineDTO] | - | Yes | - | Min 1 line item | Array of purchase order line items |
| `status` | String | - | No | "draft" | "draft" or "ordered" | PO status (defaults to "draft") |

**Example Payload:**
```json
{
  "supplier_id": "aa0e8400-e29b-41d4-a716-446655440000",
  "store_id": "660e8400-e29b-41d4-a716-446655440000",
  "lines": [
    {
      "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "quantity": 100,
      "unit_price": 35.00
    }
  ],
  "status": "draft"
}
```

---

### PurchaseOrderLineResponseDTO

**Purpose:**  
Output DTO for purchase order line item responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `purchase_order_id` | UUID | - | Yes | - | Valid UUID | Purchase order identifier |
| `product_id` | UUID | - | Yes | - | Valid UUID | Product identifier |
| `quantity` | Integer | - | Yes | - | >= 1 | Quantity ordered |
| `unit_price` | Decimal | - | Yes | - | >= 0.00 | Unit price |
| `line_total` | Decimal | - | Yes | - | >= 0.00 | Line total (quantity * unit_price) |
| `received_quantity` | Integer | - | Yes | - | >= 0 | Quantity received (defaults to 0) |

**Example Payload:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "purchase_order_id": "cc0e8400-e29b-41d4-a716-446655440000",
  "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
  "quantity": 100,
  "unit_price": 35.00,
  "line_total": 3500.00,
  "received_quantity": 0
}
```

---

### PurchaseOrderResponseDTO

**Purpose:**  
Output DTO for purchase order responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `supplier_id` | UUID | - | Yes | - | Valid UUID | Supplier identifier |
| `supplier_name` | String | - | Yes | - | Max 255 chars | Supplier name (denormalized) |
| `store_id` | UUID | - | No | null | Valid UUID | Store identifier (nullable) |
| `lines` | Array[PurchaseOrderLineResponseDTO] | - | Yes | - | Min 1 line item | Purchase order line items |
| `status` | String | - | Yes | - | "draft", "ordered", "received", "cancelled" | PO status |
| `total_amount` | Decimal | - | Yes | - | >= 0.00, precision 12.2 | Total order amount (sum of line totals) |
| `created_by` | UUID | - | Yes | - | Valid UUID | User who created the PO |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |
| `updated_at` | String | ISO 8601 | No | null | Valid datetime | Last update timestamp (nullable) |

**Example Payload:**
```json
{
  "id": "cc0e8400-e29b-41d4-a716-446655440000",
  "supplier_id": "aa0e8400-e29b-41d4-a716-446655440000",
  "supplier_name": "Pet Supplies Wholesale Ltd",
  "store_id": "660e8400-e29b-41d4-a716-446655440000",
  "lines": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "purchase_order_id": "cc0e8400-e29b-41d4-a716-446655440000",
      "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "quantity": 100,
      "unit_price": 35.00,
      "line_total": 3500.00,
      "received_quantity": 0
    }
  ],
  "status": "draft",
  "total_amount": 3500.00,
  "created_by": "990e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

### ReceivePurchaseOrderDTO

**Purpose:**  
Input DTO for receiving goods against a purchase order.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `store_id` | UUID | - | No | - | Valid UUID, must exist if provided | Store receiving goods (defaults to PO store) |
| `received_lines` | Array[StockReceiptLineDTO] | - | Yes | - | Min 1 line item | Array of received line items |

**Note:** `received_lines` must match PO lines. `product_id` must match a PO line, and `quantity` must be <= ordered quantity (not yet received).

**Example Payload:**
```json
{
  "store_id": "660e8400-e29b-41d4-a716-446655440000",
  "received_lines": [
    {
      "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "quantity": 100,
      "batch_number": "BATCH-2024-001",
      "expiry_date": "2025-12-31",
      "unit_cost": 35.00
    }
  ]
}
```

---

### ReceivePurchaseOrderResponseDTO

**Purpose:**  
Output DTO for purchase order receiving responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `purchase_order_id` | UUID | - | Yes | - | Valid UUID | Purchase order identifier |
| `status` | String | - | Yes | - | "ordered" or "received" | Updated PO status |
| `received_lines` | Array[Object] | - | Yes | - | Array of received line objects | Received lines with batch information |
| `stock_batches` | Array[StockBatchResponseDTO] | - | Yes | - | Array of batch objects | Created/updated stock batches |
| `stock_movements` | Array[StockMovementResponseDTO] | - | Yes | - | Array of movement objects | Created stock movements |
| `received_at` | String | ISO 8601 | Yes | - | Valid datetime | Receiving timestamp |
| `received_by` | UUID | - | Yes | - | Valid UUID | User who received the goods |

**Example Payload:**
```json
{
  "purchase_order_id": "cc0e8400-e29b-41d4-a716-446655440000",
  "status": "received",
  "received_lines": [
    {
      "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "quantity": 100,
      "batch_number": "BATCH-2024-001",
      "expiry_date": "2025-12-31"
    }
  ],
  "stock_batches": [
    {
      "id": "ee0e8400-e29b-41d4-a716-446655440000",
      "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "batch_number": "BATCH-2024-001",
      "quantity": 100,
      "expiry_date": "2025-12-31",
      "received_at": "2024-01-20T10:30:00Z",
      "created_at": "2024-01-20T10:30:00Z",
      "updated_at": "2024-01-20T10:30:00Z"
    }
  ],
  "stock_movements": [
    {
      "id": "ff0e8400-e29b-41d4-a716-446655440000",
      "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "batch_id": "ee0e8400-e29b-41d4-a716-446655440000",
      "quantity_change": 100,
      "reason": "receipt",
      "performed_by": "990e8400-e29b-41d4-a716-446655440000",
      "location_id": "dd0e8400-e29b-41d4-a716-446655440000",
      "reference_id": "cc0e8400-e29b-41d4-a716-446655440000",
      "created_at": "2024-01-20T10:30:00Z"
    }
  ],
  "received_at": "2024-01-20T10:30:00Z",
  "received_by": "990e8400-e29b-41d4-a716-446655440000"
}
```

---

### SearchPurchaseOrdersDTO

**Purpose:**  
Input DTO for searching purchase orders with filters and pagination.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `supplier_id` | UUID | - | No | - | Valid UUID | Filter by supplier |
| `store_id` | UUID | - | No | - | Valid UUID | Filter by store |
| `status` | String | - | No | - | "draft", "ordered", "received", "cancelled" | Filter by status (exact match) |
| `page` | Integer | - | No | 1 | Min 1 | Page number for pagination |
| `per_page` | Integer | - | No | 20 | Min 1, max 100 | Number of results per page |
| `sort` | String | - | No | "-created_at" | Valid sort field | Sort field and direction ("-" prefix for descending) |

**Example Payload:**
```json
{
  "supplier_id": "aa0e8400-e29b-41d4-a716-446655440000",
  "status": "ordered",
  "page": 1,
  "per_page": 20,
  "sort": "-created_at"
}
```

---

## Stock Reconciliation DTOs

### StockCountDTO

**Purpose:**  
Stock count entry structure used in stock reconciliation.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `product_id` | UUID | - | Yes | - | Valid UUID, must exist | Product identifier |
| `counted_quantity` | Integer | - | Yes | - | >= 0 | Physical count quantity |
| `batch_number` | String | - | No | - | Max 128 chars | Batch number (if batch-specific count) |

**Example Payload:**
```json
{
  "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
  "counted_quantity": 45,
  "batch_number": "BATCH-2024-001"
}
```

---

### CreateStockReconciliationDTO

**Purpose:**  
Input DTO for creating a stock reconciliation.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `store_id` | UUID | - | Yes | - | Valid UUID, must exist | Store identifier |
| `location_id` | UUID | - | No | - | Valid UUID, must exist if provided | Inventory location identifier (defaults to store) |
| `counts` | Array[StockCountDTO] | - | Yes | - | Min 1 count entry | Array of stock count entries |

**Example Payload:**
```json
{
  "store_id": "660e8400-e29b-41d4-a716-446655440000",
  "location_id": "dd0e8400-e29b-41d4-a716-446655440000",
  "counts": [
    {
      "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "counted_quantity": 45,
      "batch_number": "BATCH-2024-001"
    }
  ]
}
```

---

### StockReconciliationCountResponseDTO

**Purpose:**  
Output DTO for stock reconciliation count entries.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `product_id` | UUID | - | Yes | - | Valid UUID | Product identifier |
| `system_quantity` | Integer | - | Yes | - | >= 0 | System quantity before reconciliation |
| `counted_quantity` | Integer | - | Yes | - | >= 0 | Physical count quantity |
| `variance` | Integer | - | Yes | - | Integer | Variance (counted_quantity - system_quantity) |
| `batch_number` | String | - | No | null | Max 128 chars | Batch number (nullable) |

**Example Payload:**
```json
{
  "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
  "system_quantity": 50,
  "counted_quantity": 45,
  "variance": -5,
  "batch_number": "BATCH-2024-001"
}
```

---

### StockReconciliationResponseDTO

**Purpose:**  
Output DTO for stock reconciliation responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `reconciliation_id` | UUID | - | Yes | - | Valid UUID | Stock reconciliation identifier |
| `store_id` | UUID | - | Yes | - | Valid UUID | Store identifier |
| `location_id` | UUID | - | No | null | Valid UUID | Inventory location identifier (nullable) |
| `counts` | Array[StockReconciliationCountResponseDTO] | - | Yes | - | Array of count objects | Counts with variances |
| `adjustments` | Array[StockMovementResponseDTO] | - | Yes | - | Array of movement objects | Stock movements created for variances |
| `performed_by` | UUID | - | Yes | - | Valid UUID | User who performed the reconciliation |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |

**Example Payload:**
```json
{
  "reconciliation_id": "660e8400-e29b-41d4-a716-446655440000",
  "store_id": "660e8400-e29b-41d4-a716-446655440000",
  "location_id": "dd0e8400-e29b-41d4-a716-446655440000",
  "counts": [
    {
      "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "system_quantity": 50,
      "counted_quantity": 45,
      "variance": -5,
      "batch_number": "BATCH-2024-001"
    }
  ],
  "adjustments": [
    {
      "id": "ff0e8400-e29b-41d4-a716-446655440000",
      "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "batch_id": "ee0e8400-e29b-41d4-a716-446655440000",
      "quantity_change": -5,
      "reason": "reconciliation",
      "performed_by": "990e8400-e29b-41d4-a716-446655440000",
      "location_id": "dd0e8400-e29b-41d4-a716-446655440000",
      "reference_id": "660e8400-e29b-41d4-a716-446655440000",
      "created_at": "2024-01-20T10:30:00Z"
    }
  ],
  "performed_by": "990e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-20T10:30:00Z"
}
```

---

## Validation Notes

### Portuguese-Specific Validations

1. **VAT Rates:**
   - Common rates: 0.00%, 6.00%, 13.00%, 23.00%
   - Must be between 0.00 and 100.00
   - Precision: 5.2 (e.g., 23.00)

2. **Phone Number:**
   - Portuguese phone format: +351 followed by 9 digits
   - May include spaces or dashes for readability
   - Examples: "+351 21 123 4567", "+351912345678"

### Common Validation Rules

1. **Decimal Precision:**
   - Amounts/Prices: 12 digits total, 2 decimal places (DECIMAL(12,2))
   - VAT rates: 5 digits total, 2 decimal places (DECIMAL(5,2))
   - Range: 0.00 to 9999999999.99 for amounts
   - Range: 0.00 to 100.00 for VAT rates

2. **Date Formats:**
   - Dates: `yyyy-MM-dd` (e.g., "2024-01-15")
   - DateTimes: ISO 8601 format (e.g., "2024-01-15T10:30:00Z")

3. **Stock Movement Reasons:**
   - Valid values: "receipt", "sale", "adjustment", "transfer", "reservation_release", "reconciliation"
   - Reason codes are standardized for reporting and audit

4. **Purchase Order Status:**
   - Valid values: "draft", "ordered", "received", "cancelled"
   - Status transitions are restricted (business rule validation)

5. **Reservation Status:**
   - Valid values: "active", "released", "consumed"
   - Status transitions are restricted (business rule validation)

6. **Reservation Types:**
   - Valid values: "appointment", "transaction"
   - Determines which entity the reservation is linked to

### Business Rules

1. **Stock Tracking:**
   - Only `stock_tracked=true` products have stock movements
   - Non-tracked products can still be sold but do not affect inventory

2. **Batch Management:**
   - Batches enable expiry tracking
   - Default batch created if none provided during receipt
   - Expired batches cannot be sold (enforced at transaction completion)

3. **Stock Movements:**
   - Movements are append-only (no deletions)
   - Corrections via compensating movements
   - All movements create audit trail

4. **Reservations:**
   - Reduce available stock but not on-hand
   - Final decrement occurs on completion (sale/service)
   - Expired reservations should be auto-released

5. **Purchase Order Receiving:**
   - Can receive partial quantities
   - Cannot over-receive unless override (business rule dependent)
   - PO status updates to "received" when all lines fully received

6. **Stock Reconciliation:**
   - Variances applied as stock movements
   - Reason code: "reconciliation"
   - Negative variances cannot violate non-negative stock rule (if configured)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

