# Use Case UC-INV-003: Create Inventory Reservation

## 1. Objective
Reserve stock for a product to prevent overselling when linked to an appointment or transaction. Reservation reduces available stock but not committed/on-hand; final decrement occurs on completion of the sale/service.

## 2. Actors and Permissions (include RBAC roles)
- Primary: Staff, Manager
- Secondary: Owner (oversight)
- Permissions: `inventory-reservations:create`
- Authorization: Staff allowed; Manager/Owner can override insufficient stock rules.

## 3. Preconditions
1. Authenticated session.
2. Role: Staff/Manager/Owner with permission.
3. `product_id` exists and is stock_tracked.
4. Sufficient available stock for requested quantity (unless override by Manager/Owner).
5. `reserved_for` target exists (appointment_id or transaction_id) if provided.

## 4. Postconditions
1. Inventory reservation record created.
2. Available stock reduced by reserved quantity (business rule: affects availability, not on-hand).
3. Timestamps set; audit log created.
4. Reservation can expire or be released later.

## 5. Inputs (fields, types, constraints)
| Field | Type | Req | Constraints | Description |
|---|---|---|---|---|
| `product_id` | UUID | Yes | Must exist; stock_tracked=true | Product to reserve |
| `quantity` | Integer | Yes | >0 | Quantity to reserve |
| `reserved_for_id` | UUID | Yes | Must exist | Appointment or transaction ID |
| `reserved_for_type` | String | Yes | `appointment` or `transaction` | Target type |
| `expires_at` | DateTime | No | In future | Optional expiration |

## 6. Outputs (fields, types)
| Field | Type | Description |
|---|---|---|
| `id` | UUID | Reservation ID |
| `product_id` | UUID | Product |
| `quantity` | Integer | Reserved quantity |
| `reserved_for_id` | UUID | Target entity |
| `reserved_for_type` | String | `appointment` or `transaction` |
| `expires_at` | DateTime | Expiry (nullable) |
| `created_at` | DateTime | Creation timestamp |

## 7. Main Flow
1. Validate auth and permission.
2. Validate product exists and is stock_tracked.
3. Validate `reserved_for_id` exists per `reserved_for_type` (appointment or transaction).
4. Validate `quantity` > 0.
5. Validate `expires_at` if provided (future).
6. Check available stock >= requested quantity.
7. If insufficient stock and user is Staff -> block; if Manager/Owner -> allow override (business rule flag).
8. Create reservation record with quantity, product_id, reserved_for, expires_at.
9. Reduce available stock (business rule: hold/reserved pool) but do not decrement on-hand.
10. Create audit log entry.
11. Return reservation record.

## 8. Alternative Flows
- Product not found or not stock_tracked -> 404/400.
- Target (appointment/transaction) not found -> 404.
- Quantity <= 0 -> 400.
- Expiry invalid/past -> 400.
- Insufficient stock -> 409 for Staff; Manager/Owner may override per config.
- Unauthorized -> 403.
- DB failure -> 500.

## 9. Business Rules
- BR1: Reservations reduce available stock but not on-hand; final decrement on completion (sale/service).
- BR2: If available stock insufficient, block unless override by Manager/Owner when configured.
- BR3: Reservations are linked to appointments or transactions; must be released or consumed.
- BR4: Expired reservations should be auto-released.
- BR5: Audit required for creation/release/expiration.

## 10. Validation Rules
- `product_id`: exists; stock_tracked=true.
- `quantity`: integer >0.
- `reserved_for_type`: `appointment` or `transaction`.
- `reserved_for_id`: exists in respective table.
- `expires_at`: future datetime if provided.
- Stock availability: available >= requested (unless override).

## 11. Error Conditions and Meanings
| HTTP | Code | Message |
|---|---|---|
| 400 | `INVALID_QUANTITY` | Quantity must be greater than 0 |
| 400 | `INVALID_TARGET_TYPE` | Reserved_for_type must be appointment or transaction |
| 400 | `INVALID_EXPIRY` | Expiry must be in the future |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | You do not have permission to reserve stock |
| 404 | `PRODUCT_NOT_FOUND` | Product not found |
| 404 | `TARGET_NOT_FOUND` | Target appointment/transaction not found |
| 409 | `INSUFFICIENT_STOCK` | Not enough available stock to reserve |
| 500 | `INTERNAL_ERROR` | An internal error occurred |

## 12. Events Triggered
- Domain: `InventoryReserved` (reservation_id, product_id, quantity, reserved_for_id, reserved_for_type, expires_at, timestamp)
- System: Audit log entry

## 13. Repository Methods Required
- ProductRepository.findById(productId)
- AvailabilityService.checkAvailable(productId, quantity)
- ReservationRepository.save(reservation)
- ReservationRepository.findById(id) (for release/expiry workflows)
- AppointmentRepository.findById / TransactionRepository.findById (target lookup)
- AuditLogRepository.create(auditLog)

## 14. Notes or Limitations
- Applies only to stock_tracked products.
- Must integrate with auto-release on expiry and release on cancellation.
- Override behavior for insufficient stock is a business rule flag.
- Performance: availability checks should be fast (<200ms); consider caching/indices.
- Concurrency: guard against race conditions when multiple reservations on same SKU.
- Future: support partial reservations, multi-location holds, reservation priorities.
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