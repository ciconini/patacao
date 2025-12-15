# Use Case UC-INV-001: Receive Stock (Stock Receipt)

## 1. Objective
Record incoming stock for products at a store (optionally via purchase order), creating stock batches (with optional batch/expiry) and stock movements to increase on-hand quantity.

## 2. Actors and Permissions (include RBAC roles)
- Primary: Staff, Manager
- Secondary: Owner (oversight)
- Permissions: `stock-receipts:create`
- Authorization: User must have store access; Staff allowed, Manager/Owner may override constraints.

## 3. Preconditions
1. Authenticated session.
2. Role: Staff/Manager/Owner with permission.
3. `store_id` exists and user can access it.
4. `product_id` in each line exists and is active.
5. If provided: `supplier_id` exists; `purchase_order_id` exists and is receivable (status allows receive).

## 4. Postconditions
1. Stock receipt recorded (ID if modeled).
2. Stock batches created/updated per line (batch/expiry optional).
3. Stock movements created with positive `quantity_change`, reason `receipt`.
4. Product on-hand increases accordingly.
5. Timestamps set; audit log written.

## 5. Inputs (fields, types, constraints)
| Field | Type | Req | Constraints | Description |
|---|---|---|---|---|
| `store_id` | UUID | Yes | Must exist | Store receiving stock |
| `supplier_id` | UUID | No | Must exist if provided | Supplier reference |
| `purchase_order_id` | UUID | No | Must exist & receivable | Link to PO |
| `lines` | Array | Yes | Min 1 | Receipt lines |

**Line fields**
- `product_id` (UUID, required): exists.
- `quantity` (Integer > 0, required).
- `batch_number` (String, optional, <=128 chars).
- `expiry_date` (Date, optional, not past).
- `unit_cost` (Decimal >=0, optional; informational).
- `location_id` (UUID, optional; inventory location; defaults to store).

## 6. Outputs (fields, types)
| Field | Type | Description |
|---|---|---|
| `receipt_id` | UUID | Stock receipt ID (if modeled) |
| `store_id` | UUID | Store |
| `supplier_id` | UUID | Supplier (nullable) |
| `purchase_order_id` | UUID | PO (nullable) |
| `lines` | Array | Lines with created batch IDs |
| `stock_batches` | Array | Batches (id, product_id, batch_number, expiry_date, quantity) |
| `stock_movements` | Array | Movements (id, product_id, quantity_change, reason, performed_by, location_id, reference_id) |
| `created_at` | DateTime | Created timestamp |
| `updated_at` | DateTime | Updated timestamp |

## 7. Main Flow
1. Validate auth and permission.
2. Validate `store_id` exists and access.
3. Validate `supplier_id` if provided.
4. Validate `purchase_order_id` if provided and receivable.
5. Validate `lines` non-empty.
6. For each line: validate product exists; quantity >0; batch_number length; expiry not past; resolve location.
7. Begin DB transaction.
8. For each line: create/update stock_batch; create stock_movement (reason=`receipt`, +quantity, performed_by user, reference receipt/PO, location).
9. Update on-hand (if aggregated field) via movements.
10. If PO, optionally update PO status/progress.
11. Commit transaction.
12. Create audit log entry.
13. Return receipt, batches, movements.

## 8. Alternative Flows
- Store not found or access denied -> 404/403.
- Supplier not found -> 404.
- PO not receivable -> 400/409.
- Empty lines -> 400.
- Product not found -> 404.
- Invalid quantity -> 400.
- Expiry in past -> 400.
- DB/transaction failure -> 500 (rollback).

## 9. Business Rules
- BR1: Each line must reference an existing product.
- BR2: Quantity > 0; integer units.
- BR3: Expiry cannot be past; expired stock not accepted.
- BR4: Stock movements are append-only; corrections via compensating movement.
- BR5: Reason = `receipt`.
- BR6: PO over-receive disallowed unless override (business rule dependent).
- BR7: Audit required for traceability.
- BR8: Location defaults to store if not provided.
- BR9: Batches enable expiry tracking; default batch if none provided.

## 10. Validation Rules
- `store_id`: exists; user has access.
- `supplier_id`: exists if provided.
- `purchase_order_id`: exists & receivable.
- `lines`: length >=1.
- `product_id`: exists.
- `quantity`: integer >0.
- `batch_number`: <=128 chars.
- `expiry_date`: not past.
- `unit_cost`: >=0.
- `location_id`: exists if provided.

## 11. Error Conditions and Meanings
| HTTP | Code | Message |
|---|---|---|
| 400 | `INVALID_QUANTITY` | Quantity must be greater than 0 |
| 400 | `INVALID_EXPIRY` | Expiry date cannot be in the past |
| 400 | `EMPTY_LINES` | At least one line is required |
| 400 | `PO_NOT_RECEIVABLE` | Purchase order cannot be received |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | You do not have access to this store |
| 404 | `STORE_NOT_FOUND` | Store not found |
| 404 | `PRODUCT_NOT_FOUND` | Product not found |
| 404 | `SUPPLIER_NOT_FOUND` | Supplier not found |
| 404 | `PO_NOT_FOUND` | Purchase order not found |
| 500 | `INTERNAL_ERROR` | An internal error occurred |

## 12. Events Triggered
- Domain: `StockReceived` (receipt_id, store_id, lines, performed_by, timestamp)
- Domain: `StockMovementCreated` per line (movement_id, product_id, quantity_change, reason=`receipt`, reference_id, location_id, timestamp)
- System: Audit log entry

## 13. Repository Methods Required
- StoreRepository.findById(storeId)
- UserRepository.hasStoreAccess(userId, storeId)
- SupplierRepository.findById(supplierId)
- PurchaseOrderRepository.findById(poId); isReceivable(po)
- ProductRepository.findById(productId)
- StockBatchRepository.createOrIncrement(batchInput)
- StockMovementRepository.save(movement)
- ProductRepository.updateOnHand(productId, delta) (if aggregated)
- AuditLogRepository.create(auditLog)

## 14. Notes or Limitations
- Only increments stock; decrements handled elsewhere.
- Batch/expiry optional; default batch if omitted.
- Concurrency: use DB transaction and locking when updating stock.
- Performance: moderate volumes; index product_id/store_id.
- Compliance: audit trail required; movements not deleted.
- Future: barcode scanning, cost tracking per batch, partial PO receives, ASN/GRN linking.
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