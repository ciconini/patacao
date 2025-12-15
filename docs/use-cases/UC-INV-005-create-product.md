# Use Case UC-INV-005: Create Product

## 1. Objective
Create a new product in the catalog with SKU, name, pricing, VAT, stock tracking flag, category, and optional supplier reference.

## 2. Actors and Permissions (include RBAC roles)
- Primary: Manager, Owner
- Permissions: `products:create`
- Authorization: Staff cannot create products by default.

## 3. Preconditions
1. Authenticated session.
2. Role: Manager/Owner with permission.
3. SKU uniqueness within company (or global, per configuration).
4. Supplier exists if provided.

## 4. Postconditions
1. Product entity created with unique `id` and `sku`.
2. Product persisted with pricing, VAT, stock_tracked flag, reorder threshold.
3. `created_at`/`updated_at` set; audit log created.

## 5. Inputs (fields, types, constraints)
| Field | Type | Req | Constraints | Description |
|---|---|---|---|---|
| `sku` | String | Yes | Unique, max 64 | Stock keeping unit |
| `name` | String | Yes | Max 255 | Product name |
| `description` | String | No | Max 2000 | Description |
| `category` | String | No | Max 128 | Category |
| `unit_price` | Decimal | Yes | >=0 | Default unit price |
| `vat_rate` | Decimal | Yes | 0-100 | VAT percent |
| `stock_tracked` | Boolean | Yes | true/false | Track stock |
| `reorder_threshold` | Integer | No | >=0 | Low-stock threshold |
| `supplier_id` | UUID | No | Must exist if provided | Supplier reference |

## 6. Outputs (fields, types)
| Field | Type | Description |
|---|---|---|
| `id` | UUID | Product ID |
| `sku` | String | SKU |
| `name` | String | Name |
| `description` | String | Description (nullable) |
| `category` | String | Category (nullable) |
| `unit_price` | Decimal | Default unit price |
| `vat_rate` | Decimal | VAT percent |
| `stock_tracked` | Boolean | Stock tracking flag |
| `reorder_threshold` | Integer | Low-stock threshold (nullable) |
| `supplier_id` | UUID | Supplier (nullable) |
| `created_at` | DateTime | Creation timestamp |
| `updated_at` | DateTime | Update timestamp |

## 7. Main Flow
1. Validate auth and permission.
2. Validate SKU uniqueness per company/global config.
3. Validate required fields: sku, name, unit_price, vat_rate, stock_tracked.
4. Validate supplier exists if provided.
5. Validate field constraints (lengths, ranges).
6. Generate UUID for product.
7. Persist product with timestamps.
8. Create audit log entry.
9. Return product.

## 8. Alternative Flows
- SKU already exists -> 409.
- Supplier not found -> 404.
- Missing required field -> 400.
- Invalid VAT or price -> 400.
- Unauthorized -> 403.
- DB error -> 500.

## 9. Business Rules
- BR1: SKU must be unique (company-global by default).
- BR2: VAT must be valid per Administrative fiscal settings (0/6/13/23 typical).
- BR3: `stock_tracked` determines whether stock movements apply.
- BR4: Reorder threshold used for low-stock alerts.
- BR5: Audit trail required for product creation.

## 10. Validation Rules
- `sku`: non-empty, max 64, unique.
- `name`: non-empty, max 255.
- `unit_price`: decimal >=0.
- `vat_rate`: 0-100, precision 2.
- `stock_tracked`: boolean.
- `reorder_threshold`: integer >=0 if provided.
- `supplier_id`: exists if provided.

## 11. Error Conditions and Meanings
| HTTP | Code | Message |
|---|---|---|
| 400 | `MISSING_REQUIRED_FIELD` | Required field [field] is missing |
| 400 | `INVALID_VAT` | VAT rate must be between 0 and 100 |
| 400 | `INVALID_PRICE` | Unit price must be >= 0 |
| 400 | `INVALID_THRESHOLD` | Reorder threshold must be >= 0 |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | You do not have permission to create products |
| 404 | `SUPPLIER_NOT_FOUND` | Supplier not found |
| 409 | `DUPLICATE_SKU` | SKU already exists |
| 500 | `INTERNAL_ERROR` | An internal error occurred |

## 12. Events Triggered
- Domain: `ProductCreated` (product_id, sku, name, stock_tracked, created_by, timestamp)
- System: Audit log entry

## 13. Repository Methods Required
- ProductRepository.findBySku(sku)
- ProductRepository.save(product)
- SupplierRepository.findById(supplierId)
- AuditLogRepository.create(auditLog)

## 14. Notes or Limitations
- SKU uniqueness scope (company/global) must be defined; enforce accordingly.
- VAT list should align with Administrative fiscal settings.
- If stock_tracked=false, stock movements are ignored; still allow sales without inventory.
- Future: barcodes/GTIN, images, multi-price lists, unit of measure, variants.
{
  "cells": [],
  "metadata": {
    "language_info": {
      "name": "python"
    }
  },
  "nbformat": 4,
  "nbformat_minor": 2
}