# Inventory Module — Requirements

Scope: product catalog, SKUs, suppliers, stock movements, receipts and adjustments, low-stock alerts, batch/expiry support.

Functional Requirements

1. F1: Product Catalog — CRUD products with fields: SKU, name, description, price, category, supplier reference, VAT rate, unit of measure, stock tracking enabled flag.
2. F2: Supplier Management — CRUD suppliers with contact details and default lead times.
3. F3: Stock Receipts — create goods-received records (GRN) to add stock from purchase orders or manual receipts; support batch and expiry date assignment.
4. F4: Stock Movements — record stock adjustments, transfers, and consumption (from services or sales) with reason and user reference.
5. F5: Inventory Reservations — reserve stock for appointments or orders at confirmation to prevent overselling.
6. F6: Stock Reconciliation / Counts — perform stock takes, reconcile discrepancies, and record adjustments with reason and audit trail.
7. F7: Low-Stock Alerts — configurable reorder thresholds and notification (in-app) for items below threshold.
8. F8: Batch and Expiry Support — track batch numbers and expiry dates where applicable and surface soon-to-expire items.
9. F9: Import/Export — import product catalogs and export stock reports in CSV/JSON.
10. F10: Stock History — searchable history of stock movements per SKU with timestamps and user references.

Non-Functional Requirements

1. N1: Consistency — inventory transactions must preserve strong consistency for stock levels (use database transactions to avoid race conditions).
2. N2: Performance — real-time stock checks for POS and appointment confirmation must respond within 200ms.
3. N3: Scalability — handle up to 50k SKUs with reasonable pagination and indexing.
4. N4: Auditability — stock movements and adjustments must be logged immutably with user and timestamp.
5. N5: Data retention — stock history retained for at least 5 years for traceability.

Dependencies

- Depends on Administrative for supplier contact references and product visibility per store.
- Depends on Services for inventory consumption by services and stock reservation behavior.
- Depends on Financial for decrementing stock on confirmed sales and including product lines in invoices.
- Depends on Users & Access Control to authorize stock adjustments and transfers.

Business Rules

BR1: Stock reservation at appointment confirmation reduces available stock but not committed stock quantity until checkout; final decrement occurs on sale completion.
BR2: If available stock is insufficient at reservation time, the system should prevent booking that consumes stock unless an override is provided by a Manager.
BR3: Expired items cannot be sold; the system must block sale of items past expiry and surface expired items during stock reconciliation.
BR4: Low-stock alerts must respect supplier lead time; suggested reorder quantity should factor in average daily sales (future refinement) but default to user-configured reorder quantity.
BR5: Stock adjustments require a reason and cannot be performed by Staff role unless explicitly permitted by Manager or Owner.

Acceptance Criteria

- Product catalog and supplier CRUD works and integrates with stock receipts.
- Reservations and decrements occur per business rules and stock history is searchable and auditable.

