# Use Case UC-INV-004: Stock Reconciliation (Stock Count)

## 1. Objective
Perform a stock take for selected products at a store/location, compare counted quantities to system quantities, and record resulting adjustments with reasons and audit trail.

## 2. Actors and Permissions (include RBAC roles)
- Primary: Manager
- Secondary: Owner (oversight)
- Permissions: `stock-reconciliation:create`
- Authorization: Staff generally not allowed unless explicitly permitted for counting only (without applying adjustments).

## 3. Preconditions
1. Authenticated session.
2. Role: Manager/Owner with permission.
3. `store_id` (or location) exists and user has access.
4. Products to be counted exist.

## 4. Postconditions
1. Stock reconciliation session recorded (if modeled) with counts per product.
2. For products where counted != system, stock adjustments (movements) created with reason `reconciliation` or `adjustment`.
3. Product on-hand updated accordingly.
4. Timestamps set; audit log created.

## 5. Inputs (fields, types, constraints)
| Field | Type | Req | Constraints | Description |
|---|---|---|---|---|
| `store_id` | UUID | Yes | Must exist | Store/location for count |
| `location_id` | UUID | No | If used, must exist | Inventory location |
| `counts` | Array | Yes | Min 1 | Count entries |

**Count entry fields**
- `product_id` (UUID, required): exists.
- `counted_quantity` (Integer, required): >=0.
- `batch_number` (String, optional): if counting by batch.

## 6. Outputs (fields, types)
| Field | Type | Description |
|---|---|---|
| `reconciliation_id` | UUID | Reconciliation session ID (if modeled) |
| `store_id` | UUID | Store/location |
| `counts` | Array | Counts with variances |
| `adjustments` | Array | Stock movements created for variances |
| `created_at` | DateTime | Creation timestamp |

## 7. Main Flow
1. Validate auth and permission.
2. Validate store/location access.
3. Validate `counts` non-empty.
4. For each count entry: validate product exists; counted_quantity >=0; validate batch if provided.
5. Load current system quantity (and batch quantity if batch provided).
6. Compute variance = counted_quantity - system_quantity.
7. Begin DB transaction.
8. For each variance != 0:
   - Create stock movement with quantity_change = variance (positive add, negative remove), reason `reconciliation` (or `adjustment`), product_id, batch_id if applicable, location_id/store_id, performed_by.
   - Update product/batch on-hand accordingly.
9. Optionally record reconciliation session with all counts and variances.
10. Commit transaction.
11. Create audit log entry.
12. Return reconciliation summary (counts + adjustments).

## 8. Alternative Flows
- Store/location not found or access denied -> 404/403.
- Product not found -> 404.
- Counted_quantity < 0 -> 400.
- DB/transaction failure -> 500 (rollback).
- Batch provided but not found -> 404.

## 9. Business Rules
- BR1: Variances must be applied as stock movements; no silent changes.
- BR2: Reason codes for reconciliation should be standardized (`reconciliation`).
- BR3: Staff typically cannot apply adjustments; counting-only mode may be allowed (no movements until approved).
- BR4: Audit trail required for all variances.
- BR5: Negative variances cannot be applied if they would violate non-negative stock rule (configurable).

## 10. Validation Rules
- `store_id`/`location_id`: exist; access required.
- `counts`: length >=1.
- `product_id`: exists.
- `counted_quantity`: integer >=0.
- `batch_number`: validate if provided (must exist if used).
- Variance application guarded by non-negative stock rule if configured.

## 11. Error Conditions and Meanings
| HTTP | Code | Message |
|---|---|---|
| 400 | `INVALID_COUNT` | Counted quantity must be >= 0 |
| 400 | `NEGATIVE_STOCK_BLOCKED` | Adjustment would result in negative stock |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | You do not have permission to reconcile stock |
| 404 | `STORE_NOT_FOUND` | Store not found |
| 404 | `PRODUCT_NOT_FOUND` | Product not found |
| 404 | `BATCH_NOT_FOUND` | Batch not found |
| 500 | `INTERNAL_ERROR` | An internal error occurred |

## 12. Events Triggered
- Domain: `StockReconciled` (reconciliation_id, store_id, counts, performed_by, timestamp)
- Domain: `StockMovementCreated` for each variance movement
- System: Audit log entry

## 13. Repository Methods Required
- StoreRepository.findById(storeId)
- UserRepository.hasStoreAccess(userId, storeId)
- ProductRepository.findById(productId)
- StockBatchRepository.findByProductAndBatch(productId, batchNumber) (if batching)
- StockMovementRepository.save(movement)
- ProductRepository.updateOnHand(productId, delta) (if aggregated)
- ReconciliationRepository.save(session) (if modeled)
- AuditLogRepository.create(auditLog)

## 14. Notes or Limitations
- Counting-only mode vs apply-adjustments mode should be configurable.
- Concurrency: lock during reconciliation application to avoid race conditions.
- Large counts: consider pagination/chunking for many SKUs.
- Batches: ensure expired batches handled; counts may be batch-specific.
- Future: approval workflows, attachments (count sheets/photos), variance thresholds requiring approval.
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