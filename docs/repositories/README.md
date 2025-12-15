# Repository Interface Contracts - Index

This document lists all available repositories that can be created based on the current ER model.

## Already Created

The following repository contracts have already been generated:

1. ✅ **PetRepository** - `Pet` entity operations
2. ✅ **UserRepository** - `User` entity operations (staff, managers, etc.)
3. ✅ **AppointmentRepository** - `Appointment` entity operations
4. ✅ **ServiceRepository** - `Service` entity operations
5. ✅ **OwnerRepository** - Owner-specific operations on `User` entity (Owner is a Role, not a separate entity)

## Available Repositories (Not Yet Created)

Based on the ER model, the following repositories can be created:

### Administrative Module

6. **CompanyRepository** - `Company` entity (business profile, fiscal data)
   - Table: `companies`
   - Key operations: CRUD, NIF validation, fiscal settings management

7. **StoreRepository** - `Store` entity (store locations, opening hours)
   - Table: `stores`
   - Key operations: CRUD, opening hours validation, store-company relationships

8. **CustomerRepository** - `Customer` entity (client/owner of pets)
   - Table: `customers`
   - Key operations: CRUD, search, consent management, archive/delete

9. **InventoryLocationRepository** - `InventoryLocation` entity (optional, for finer inventory granularity)
   - Table: `inventory_locations`
   - Key operations: CRUD, store-location relationships

### Users & Access Control Module

10. **RoleRepository** - `Role` entity (Owner, Manager, Staff, Accountant, Veterinarian)
    - Table: `roles`
    - Key operations: CRUD, permission management, role validation

11. **SessionRepository** - `Session` entity (user sessions, authentication)
    - Table: `sessions`
    - Key operations: CRUD, session validation, revocation, expiration management

### Services Module

12. **ServicePackageRepository** - `ServicePackage` entity (service bundles)
    - Table: `service_packages`
    - Key operations: CRUD, service composition management

13. **AppointmentServiceLineRepository** - `AppointmentServiceLine` entity (join entity for appointment services)
    - Table: `appointment_service_lines`
    - Key operations: CRUD, appointment-service relationships, price override management

### Inventory Module

14. **ProductRepository** - `Product` entity (inventory sellable items)
    - Table: `products`
    - Key operations: CRUD, search, SKU management, stock tracking, supplier relationships

15. **SupplierRepository** - `Supplier` entity (product suppliers)
    - Table: `suppliers`
    - Key operations: CRUD, search, lead time management

16. **StockBatchRepository** - `StockBatch` entity (batch/expiry tracking)
    - Table: `stock_batches`
    - Key operations: CRUD, expiry management, batch tracking, product-batch relationships

17. **StockMovementRepository** - `StockMovement` entity (stock change records)
    - Table: `stock_movements`
    - Key operations: CRUD, movement history, reason tracking, audit trail

18. **InventoryReservationRepository** - `InventoryReservation` entity (reserved stock for appointments/transactions)
    - Table: `inventory_reservations`
    - Key operations: CRUD, reservation management, expiration handling, availability checks

19. **PurchaseOrderRepository** - `PurchaseOrder` entity (supplier orders)
    - Table: `purchase_orders`
    - Key operations: CRUD, status management, supplier relationships, receiving workflow

20. **PurchaseOrderLineRepository** - `PurchaseOrderLine` entity (join entity for PO line items)
    - Table: `purchase_order_lines`
    - Key operations: CRUD, PO-product relationships, quantity management

### Financial Module

21. **InvoiceRepository** - `Invoice` entity (invoices, receipts)
    - Table: `invoices`
    - Key operations: CRUD, invoice numbering, status management, fiscal compliance, customer relationships

22. **InvoiceLineRepository** - `InvoiceLine` entity (join entity for invoice line items)
    - Table: `invoice_lines`
    - Key operations: CRUD, invoice-product/service relationships, VAT calculation

23. **CreditNoteRepository** - `CreditNote` entity (refunds, credit notes)
    - Table: `credit_notes`
    - Key operations: CRUD, invoice relationships, refund management

24. **TransactionRepository** - `Transaction` entity (POS/sales transactions)
    - Table: `transactions`
    - Key operations: CRUD, payment status management, invoice relationships, completion workflow

25. **TransactionLineRepository** - `TransactionLine` entity (join entity for transaction line items)
    - Table: `transaction_lines`
    - Key operations: CRUD, transaction-product/service relationships

26. **FinancialExportRepository** - `FinancialExport` entity (accounting exports)
    - Table: `financial_exports`
    - Key operations: CRUD, export generation, period management, file handling

### Cross-Cutting Module

27. **AuditLogRepository** - `AuditLog` entity (audit trail, append-only logs)
    - Table: `audit_logs`
    - Key operations: Create (append-only), search, filtering by entity type/action, compliance reporting

## Join Tables (Typically Managed via Parent Repositories)

The following join tables are typically managed through their parent entity repositories rather than having separate repositories:

- `user_roles` - Managed via `UserRepository` (role assignment methods)
- `user_service_skills` - Managed via `UserRepository` (service skills assignment methods)
- `appointment_service_lines` - Can have separate `AppointmentServiceLineRepository` or managed via `AppointmentRepository`
- `invoice_lines` - Can have separate `InvoiceLineRepository` or managed via `InvoiceRepository`
- `transaction_lines` - Can have separate `TransactionLineRepository` or managed via `TransactionRepository`
- `purchase_order_lines` - Can have separate `PurchaseOrderLineRepository` or managed via `PurchaseOrderRepository`

**Note:** Join table repositories can be created if there's a need for complex operations on the join entities themselves, but typically they're managed through the parent entity repositories.

## Summary

- **Total Entities in ER Model:** 28 tables
- **Join Tables:** 6 (typically managed via parent repositories)
- **Main Entities:** 22
- **Repositories Already Created:** 5
- **Repositories Available to Create:** 22 (including join table repositories if needed)

## Repository Creation Guidelines

When creating repository contracts, follow these guidelines:

1. **Align with ER Model:** Use exact field names, types, and constraints from the ER diagram
2. **Follow Use Cases:** Derive methods from existing use cases and API endpoints
3. **No Invention:** Do not invent new fields, entities, filters, or relationships
4. **Standard Structure:** Each method should include:
   - Method name
   - Purpose
   - Input parameters (with types and constraints)
   - Output type (entity or DTO)
   - Error conditions
   - Transaction rules (if applicable)
   - Notes on expected behaviour
   - Pagination rules (if applicable)
   - Sorting and filtering rules (if applicable)

## Related Documentation

- [Domain Entities](../../domain/entities.md)
- [ER Diagram](../../domain/er-diagram.txt)
- [REST API Endpoints](../../api/rest-endpoints.md)
- [Backend Architecture](../../architecture/backend-architecture.md)

---

**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

