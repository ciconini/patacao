# Domain Model — Entities & Relationships

This document lists the application's entities, their attributes, relationships (UML-style text), and business rules. Entities are aligned with modules: Administrative, Services, Financial, Inventory, Users & Access Control.

Notes on conventions

- `+` = required attribute
- `(opt)` = optional attribute
- Cardinality notation: `1`, `0..1`, `1..*`, `0..*`.

---

1) Company (Business Profile) — essential
- Attributes:
  - +`id` (UUID)
  - +`name`
  - +`nif` (seller fiscal number)
  - +`address` (structured: street, city, postal_code)
  - +`tax_regime` (string)
  - `default_vat_rate` (decimal)
  - `phone` (opt)
  - `email` (opt)
  - `website` (opt)
  - `created_at`, `updated_at`
- Relationships (UML text):
  - Company 1 — 1..* Store  (a company can have many stores)
- Business rules:
  - BR: `nif` must validate against Portuguese NIF format when used for invoicing.
  - BR: Only `Owner` role users may update core fiscal fields.

---

2) Store — essential
- Attributes:
  - +`id` (UUID)
  - +`company_id` (FK)
  - +`name`
  - `address` (structured)
  - `email` (opt)
  - `phone` (opt)
  - +`opening_hours` (structured weekly schedule)
  - `timezone` (default Europe/Lisbon)
  - `created_at`, `updated_at`
- Relationships:
  - Store 1 — 1 Company
  - Store 1 — 0..* User (staff assigned to store)
  - Store 1 — 0..* InventoryLocation
- Business rules:
  - BR: Staff schedules cannot place staff outside `opening_hours` for that Store.
  - BR: Invoice numbering and fiscal settings can be store-scoped if configured; otherwise inherit Company defaults.

---

3) User — essential (system user: staff, managers, accountants, veterinarians)
- Attributes:
  - +`id` (UUID)
  - +`email` (unique)
  - +`full_name`
  - `phone` (opt)
  - `username` (opt)
  - `password_hash` (secure storage)
  - `roles` (list of Role IDs)
  - `working_hours` (opt, for staff)
  - `service_skills` (opt list of Service IDs or tags)
  - `active` (boolean)
  - `created_at`, `updated_at`
- Relationships:
  - User 1 — 0..* Store (user may be assigned to multiple stores)
  - User 1 — 1..* Role (user must have at least one role)
- Business rules:
  - BR: A user must have at least one Role to access system.
  - BR: Only Owner can create Owner users or transfer ownership.
  - BR: Session revocation must terminate active sessions for the `User`.

---

4) Role — essential
- Attributes:
  - +`id` (string)
  - +`name` (Owner, Manager, Staff, Accountant, Veterinarian)
  - `permissions` (list of permission keys)
  - `created_at`, `updated_at`
- Relationships:
  - Role 1 — 0..* User
- Business rules:
  - BR: Roles are validated on assignment; a user cannot be role-less.
  - BR: Sensitive roles (Owner) have restricted creation flows.

---

5) Customer — essential (client/owner of pets)
- Attributes:
  - +`id` (UUID)
  - +`full_name`
  - `email` (opt)
  - `phone` (opt)
  - `address` (opt)
  - `consent_marketing` (boolean)
  - `consent_reminders` (boolean)
  - `created_at`, `updated_at`
- Relationships:
  - Customer 1 — 0..* Pet
  - Customer 1 — 0..* Appointment (as booker)
  - Customer 1 — 0..* Invoice (as buyer)
- Business rules:
  - BR: `consent_reminders` must be true to send appointment reminders by email.
  - BR: Deleting a Customer requires reassigning or deleting linked Pets/appointments or archiving the Customer.

---

6) Pet — essential
- Attributes:
  - +`id` (UUID)
  - +`name`
  - +`customer_id` (FK to Customer)
  - `species` (e.g., dog, cat)
  - `breed` (opt)
  - `date_of_birth` (opt) / `age` (calculated)
  - `microchip_id` (opt)
  - `medical_notes` (opt)
  - `vaccination_dates` (list or structure) (opt)
  - `created_at`, `updated_at`
- Relationships:
  - Pet 1 — 1 Customer
  - Pet 1 — 0..* Appointment
  - Pet 1 — 0..* ServiceNote
- Business rules:
  - BR: A Pet must be linked to a Customer; system should allow inline creation of Customer when creating Pet.
  - BR: Microchip format validated when provided.

---

7) Service — essential
- Attributes:
  - +`id` (UUID)
  - +`name`
  - `description` (opt)
  - +`duration_minutes`
  - +`price`
  - `required_resources` (opt list of resource identifiers)
  - `consumes_inventory` (boolean)
  - `consumed_items` (optional list of {product_id, quantity})
  - `tags` (opt)
  - `created_at`, `updated_at`
- Relationships:
  - Service 1 — 0..* AppointmentServiceLine
  - Service 1 — 0..* User (via `service_skills` association)
- Business rules:
  - BR: If `consumes_inventory` is true, Inventory reservation and decrement rules apply (reserve at confirmation, decrement at sale completion).
  - BR: A Service's duration and assigned staff skills must match when auto-assigning staff.

---

8) ServicePackage — optional
- Attributes:
  - +`id` (UUID)
  - +`name`
  - `description` (opt)
  - `services` (ordered list of Service IDs and quantities)
  - `bundle_price` (opt)
  - `created_at`, `updated_at`
- Relationships:
  - ServicePackage 1 — 0..* Service (composition)
- Business rules:
  - BR: Packages create separate AppointmentServiceLine entries for each included Service when booked.

---

9) Appointment — essential
- Attributes:
  - +`id` (UUID)
  - +`store_id` (FK)
  - +`customer_id` (FK)
  - +`pet_id` (FK)
  - +`start_at` (datetime)
  - +`end_at` (datetime)
  - +`status` (booked, confirmed, checked_in, completed, cancelled, needs-reschedule)
  - `created_by` (User ID)
  - `staff_id` (opt User ID)
  - `notes` (opt)
  - `recurrence_id` (opt, references recurrence group)
  - `created_at`, `updated_at`
- Relationships:
  - Appointment 1 — 1..* AppointmentServiceLine
  - Appointment 0..1 — 1 Staff (User) (assigned staff)
  - Appointment 1 — 1 Customer
  - Appointment 1 — 1 Pet
- Business rules:
  - BR: Appointment must fall within Store opening hours and assigned Staff working hours.
  - BR: Double-booking prevented; booking endpoint must check concurrency and lock or reject conflicting bookings.
  - BR: Recurring appointments must materialize as distinct Appointment instances linked via `recurrence_id`.

---

10) AppointmentServiceLine — essential (join entity)
- Attributes:
  - +`id` (UUID)
  - +`appointment_id` (FK)
  - +`service_id` (FK)
  - `quantity` (default 1)
  - `price_override` (opt)
  - `created_at`, `updated_at`
- Relationships:
  - AppointmentServiceLine * — 1 Appointment
  - AppointmentServiceLine * — 1 Service
- Business rules:
  - BR: Price calculation for an Appointment sums lines using `price_override` when present, otherwise Service price.

---

11) Product — essential (inventory sellable item)
- Attributes:
  - +`id` (UUID)
  - +`sku` (unique)
  - +`name`
  - `description` (opt)
  - `category` (opt)
  - `unit_price`
  - `vat_rate` (decimal)
  - `stock_tracked` (boolean)
  - `reorder_threshold` (opt)
  - `created_at`, `updated_at`
- Relationships:
  - Product 1 — 0..* StockBatch
  - Product 1 — 0..* StockMovement
- Business rules:
  - BR: Sales can include Product line items; if `stock_tracked` is true, reservations and decrements apply.
  - BR: SKU must be unique per Store or per Company depending on configuration (choose Company-global by default).

---

12) Supplier — optional
- Attributes:
  - +`id` (UUID)
  - +`name`
  - `contact_email` (opt)
  - `phone` (opt)
  - `default_lead_time_days` (opt)
  - `created_at`, `updated_at`
- Relationships:
  - Supplier 1 — 0..* Product (via product.supplier reference)
  - Supplier 1 — 0..* PurchaseOrder
- Business rules:
  - BR: Suggested reorder uses Supplier `default_lead_time_days` when calculating expected arrival.

---

13) StockBatch — optional (for batch/expiry tracking)
- Attributes:
  - +`id` (UUID)
  - +`product_id` (FK)
  - +`batch_number` (opt)
  - `quantity` (integer)
  - `expiry_date` (opt)
  - `received_at`
  - `created_at`, `updated_at`
- Relationships:
  - StockBatch 1 — 1 Product
  - StockBatch 1 — 0..* StockMovement
- Business rules:
  - BR: Items in expired StockBatch cannot be sold; system must block them at POS.

---

14) StockMovement — essential
- Attributes:
  - +`id` (UUID)
  - +`product_id` (FK)
  - `batch_id` (opt)
  - +`quantity_change` (integer, positive for receipt, negative for decrement)
  - +`reason` (receipt, sale, adjustment, transfer, reservation_release)
  - +`performed_by` (User ID)
  - +`location_id` (InventoryLocation / Store)
  - `reference_id` (opt, e.g., invoice id, purchase_order id)
  - `created_at`
- Relationships:
  - StockMovement * — 1 Product
  - StockMovement 0..1 — 1 StockBatch
- Business rules:
  - BR: All stock changes must be recorded as StockMovement with `performed_by` and cannot be deleted (only corrected with compensating movement).
  - BR: Transactions creating multiple StockMovements must be atomic to preserve consistency.

---

15) InventoryReservation — optional/essential depending on config
- Attributes:
  - +`id` (UUID)
  - +`product_id`
  - +`quantity`
  - +`reserved_for` (appointment_id or order_id)
  - +`expires_at` (opt)
  - `created_at`
- Relationships:
  - InventoryReservation * — 1 Product
  - InventoryReservation 0..1 — 1 Appointment
- Business rules:
  - BR: Reservation reduces available stock for other operations but final decrement happens at sale completion.
  - BR: Manager can override reservation failures.

---

16) PurchaseOrder — optional
- Attributes:
  - +`id` (UUID)
  - +`supplier_id` (FK)
  - `store_id` (FK)
  - `order_lines` (list of {product_id, quantity, unit_price})
  - `status` (draft, ordered, received, cancelled)
  - `created_by` (User ID)
  - `created_at`, `updated_at`
- Relationships:
  - PurchaseOrder 1 — 1 Supplier
  - PurchaseOrder 1 — 0..* StockBatch (via GoodsReceived)
- Business rules:
  - BR: Receiving goods creates StockBatch and StockMovement entries; PO status updates to `received`.

---

17) Invoice — essential
- Attributes:
  - +`id` (UUID)
  - +`company_id` (FK)
  - +`store_id` (FK)
  - +`invoice_number` (string, sequential)
  - +`issued_at` (datetime)
  - +`buyer_customer_id` (opt FK)
  - `lines` (list of {description, product_id|service_id opt, quantity, unit_price, vat_rate})
  - +`subtotal`, `vat_total`, `total`
  - +`status` (draft, issued, paid, cancelled, refunded)
  - `paid_at` (opt)
  - `payment_method` (opt)
  - `external_reference` (opt)
  - `created_by` (User ID)
  - `created_at`, `updated_at`
- Relationships:
  - Invoice 1 — 0..* Transaction (sale records)
  - Invoice 0..1 — 1 Customer
- Business rules:
  - BR: Invoice cannot be `issued` without valid Company `nif` and sequential `invoice_number`.
  - BR: Once `issued`, editing is restricted; void/credit-note flows are required to correct.

---

18) CreditNote — optional/essential for refunds
- Attributes:
  - +`id` (UUID)
  - +`invoice_id` (FK)
  - `issued_at`
  - `reason`
  - `amount`
  - `created_by`
  - `created_at`
- Relationships:
  - CreditNote 1 — 1 Invoice
- Business rules:
  - BR: CreditNote must reference original Invoice and reduce outstanding amount in exports.
  - BR: Only Manager/Accountant can create CreditNote.

---

19) Transaction (Sale) — essential (represents POS/cart)
- Attributes:
  - +`id` (UUID)
  - +`store_id` (FK)
  - +`invoice_id` (FK)
  - `line_items` (products/services with qty, price)
  - `total_amount`
  - `payment_status` (pending, paid_manual, refunded)
  - `created_by` (User ID)
  - `created_at`, `updated_at`
- Relationships:
  - Transaction 1 — 1 Invoice
  - Transaction 1 — 0..* StockMovement (decrements created when completed)
- Business rules:
  - BR: Completing a Transaction with products triggers StockMovement decrements for tracked products.
  - BR: Payment is recorded manually; `payment_status` must reflect manual entries.

---

20) FinancialExport — optional
- Attributes:
  - +`id` (UUID)
  - +`company_id`
  - `period_start`, `period_end`
  - `format` (CSV/JSON)
  - `file_path` or `sftp_reference`
  - `created_at`, `created_by`
- Relationships:
  - FinancialExport 1 — 0..* Invoice
- Business rules:
  - BR: Exports must include all fields required by accountant and be immutable once generated.

---

21) AuditLog — essential (cross-cutting)
- Attributes:
  - +`id` (UUID)
  - +`entity_type` (string)
  - +`entity_id` (UUID)
  - +`action` (create, update, delete, void)
  - +`performed_by` (User ID)
  - +`timestamp`
  - `meta` (opt JSON with before/after)
- Relationships:
  - AuditLog 0..* — references any entity
- Business rules:
  - BR: AuditLog entries are append-only; editing is not allowed. Logs must be searchable by admin roles.

---

22) Session — optional
- Attributes:
  - +`id` (UUID)
  - +`user_id`
  - `created_at`
  - `expires_at`
  - `revoked` (boolean)
- Relationships:
  - Session * — 1 User
- Business rules:
  - BR: Revoking a Session immediately denies access; tokens must be short-lived and refresh tokens revocable.

---

UML Relationships (summary text)

- Company 1 — 1..* Store
- Store 1 — 0..* User (staff assignments)
- User 1 — 1..* Role
- Customer 1 — 0..* Pet
- Customer 1 — 0..* Appointment
- Pet 1 — 0..* Appointment
- Appointment 1 — 1..* AppointmentServiceLine
- AppointmentServiceLine * — 1 Service
- Service 1 — 0..* User (via User.service_skills)
- Product 1 — 0..* StockBatch
- Product 1 — 0..* StockMovement
- Appointment 0..1 — 0..1 User (assigned staff)
- PurchaseOrder 1 — 1 Supplier
- StockMovement * — 1 Product
- Transaction 1 — 1 Invoice
- Invoice 0..1 — 1 Customer
- Invoice 0..* — 0..* StockMovement (references)
- AuditLog references any entity (append-only)

---

Design decisions & clarifications

- Single concept rule: `Pet` is the single entity representing animals; `Customer` is the owner. No duplicate "Animal" entity.
- `User` represents people who log into the system (staff); `Customer` represents clients and is distinct.
- Staff-specific fields are optional attributes on `User` to avoid duplicating concepts.
- Inventory location concepts are represented by `Store` and optional `InventoryLocation` if finer granularity is needed later.
- Payments are intentionally out-of-scope: `Transaction.payment_status` supports manual recording, but no PSP/payment entity is included now; placeholders can be added later.

---