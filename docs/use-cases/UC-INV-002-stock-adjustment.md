# Use Case UC-INV-002: Stock Adjustment

## 1. Objective
Record manual stock adjustments (increment or decrement) for a product at a store/inventory location with a required reason and audit trail.

## 2. Actors and Permissions (include RBAC roles)
- Primary: Manager, Owner
- Secondary: Staff (only if explicitly permitted)
- Permissions: `stock-adjustments:create`
- Authorization: Staff blocked by default unless manager override; user must have store access.

## 3. Preconditions
1. Authenticated session.
2. Role: Manager/Owner (or Staff if explicitly permitted) with permission.
3. `store_id` (or `location_id`) exists and user has access.
4. `product_id` exists and is active.

## 4. Postconditions
1. Stock movement recorded with positive or negative `quantity_change` and reason `adjustment`.
2. Product on-hand updated accordingly.
3. Timestamps updated; audit log created.
4. Adjustment is immutable; corrections require compensating movement.

## 5. Inputs (fields, types, constraints)
| Field | Type | Req | Constraints | Description |
|---|---|---|---|---|
| `store_id` | UUID | Yes | Must exist | Store (or location) where adjustment occurs |
| `location_id` | UUID | No | If used, must exist | Inventory location; defaults to store |
| `product_id` | UUID | Yes | Must exist | Product to adjust |
| `quantity_change` | Integer | Yes | Non-zero; + adds, - removes | Adjustment quantity |
| `reason` | String | Yes | Non-empty, <= 255 | Reason for adjustment |
| `reference_id` | UUID | No | Optional link (e.g., recount session) | Reference |

## 6. Outputs (fields, types)
| Field | Type | Description |
|---|---|---|
| `stock_movement_id` | UUID | Movement ID |
| `product_id` | UUID | Product |
| `quantity_change` | Integer | Positive/negative adjustment |
| `reason` | String | `adjustment` |
| `performed_by` | UUID | User ID |
| `location_id` | UUID | Store or inventory location |
| `reference_id` | UUID | Optional reference |
| `created_at` | DateTime | Creation timestamp |

## 7. Main Flow
1. Validate auth and permission.
2. Validate store/location access.
3. Validate product exists.
4. Validate `quantity_change` is non-zero integer.
5. Validate `reason` non-empty and length <=255.
6. Begin DB transaction.
7. Create stock movement: reason `adjustment`, quantity_change (+/-), product_id, location_id/store_id, performed_by, reference_id.
8. Update product on-hand (if aggregated field) accordingly.
9. Commit transaction.
10. Create audit log entry.
11. Return movement details.

## 8. Alternative Flows
- Store/location not found or no access -> 404/403.
- Product not found -> 404.
- Quantity_change = 0 -> 400.
- Reason missing/too long -> 400.
- DB/transaction failure -> 500 (rollback).
- Staff without explicit permission -> 403.

## 9. Business Rules
- BR1: Adjustment requires explicit reason; no empty reasons.
- BR2: Staff cannot adjust stock unless explicitly permitted.
- BR3: Movements are append-only; no deletions, only compensations.
- BR4: Negative adjustments cannot reduce below 0 if business rule enforces non-negative stock (configurable).
- BR5: Audit required for all adjustments.
- BR6: Location defaults to store when not provided.

## 10. Validation Rules
- `store_id`/`location_id`: exist; user access required.
- `product_id`: exists.
- `quantity_change`: integer, non-zero.
- `reason`: non-empty, <=255 chars.
- `reference_id`: UUID if provided.

## 11. Error Conditions and Meanings
| HTTP | Code | Message |
|---|---|---|
| 400 | `ZERO_QUANTITY` | Quantity change cannot be zero |
| 400 | `MISSING_REASON` | Reason is required |
| 400 | `REASON_TOO_LONG` | Reason cannot exceed 255 characters |
| 400 | `NEGATIVE_STOCK_BLOCKED` | Adjustment would result in negative stock | (if enforced) |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | You do not have permission to adjust stock |
| 404 | `STORE_NOT_FOUND` | Store not found |
| 404 | `PRODUCT_NOT_FOUND` | Product not found |
| 500 | `INTERNAL_ERROR` | An internal error occurred |

## 12. Events Triggered
- Domain: `StockMovementCreated` (movement_id, product_id, quantity_change, reason=`adjustment`, location_id, performed_by, timestamp)
- System: Audit log entry

## 13. Repository Methods Required
- StoreRepository.findById(storeId)
- UserRepository.hasStoreAccess(userId, storeId)
- ProductRepository.findById(productId)
- StockMovementRepository.save(movement)
- ProductRepository.updateOnHand(productId, delta) (if aggregated)
- AuditLogRepository.create(auditLog)

## 14. Notes or Limitations
- Use compensating movements to correct mistakes; do not delete.
- Negative stock protection may be configurable; enforce if required.
- Concurrency: use transactions/locking when updating stock.
- Performance: light; ensure indexes on product_id/location_id.
- Future: approval workflow for large negative adjustments; attachment of evidence; reason codes.
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