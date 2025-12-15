# Administrative Module — Requirements

Scope: business profile and settings, staff management and basic scheduling, customer and pet records.

Functional Requirements

1. F1: Business Profile Management — create, read, update, delete (CRUD) company/business profile with fiscal data required for invoices (company name, fiscal number/NIF, address, tax regime, default VAT rate).
2. F2: Store Settings — configure store-level settings (name, address, contact email, opening hours, timezone) per store instance.
3. F3: Fiscal Settings — manage VAT rates and rounding rules used across Financial module.
4. F4: Staff Management — CRUD staff members with profile fields (name, contact, role(s), working hours, service skills).
5. F5: Staff Schedule — create and view basic weekly schedules for staff; assign services to staff availability blocks.
6. F6: Customer Records — CRUD customer profiles with contact info, preferences, consent flags (GDPR), and linked pet records.
7. F7: Pet Records — CRUD pet profiles: name, species, breed, date of birth/age, microchip ID, medical notes, vaccination dates, owner link.
8. F8: Search & Filter — search customers, pets, and staff by common fields (name, phone, email, microchip, tags) with filters.
9. F9: Import/Export — import/export customer and pet lists via CSV/JSON for migration and backups.
10. F10: Activity Log — view administrative changes (profile edits, staff changes) tied to user accounts (audit entries).

Non-Functional Requirements

1. N1: Localization — all UI labels and messages must support European Portuguese (`pt-PT`).
2. N2: Performance — basic administrative list views must render results under 300ms for up to 10k records (server-side pagination required).
3. N3: Availability — administrative functions should be available 99.5% for MVP hours.
4. N4: Security — data at rest encrypted for sensitive fields (personal data, NIF); HTTPS enforced.
5. N5: Data retention & GDPR — support export of personal data and deletion workflows; consent flags stored and auditable.
6. N6: Backups — administrative data backup policy with daily snapshot and 30-day retention for MVP.

Dependencies

- Depends on Users & Access Control for authentication, roles and permissions (staff CRUD must enforce RBAC).
- Depends on Services for staff skills and schedule allocations.
- Depends on Inventory for supplier contact reference if suppliers are stored in business profile in future.
- Depends on Financial for fiscal fields used in invoices (NIF, tax regime).

Business Rules

BR1: Only users with role `Owner` or `Manager` can modify business profile or fiscal settings.
BR2: Staff cannot be scheduled outside store opening hours. Attempts must be blocked with a validation error.
BR3: A pet must be linked to an existing customer record; creation of a new pet may create a new customer inline if needed.
BR4: NIF field must be validated for numeric format and length per Portuguese rules; invalid NIFs should block invoice issuance.
BR5: Consent flag must be explicitly set when adding marketing preferences; default is opt-out.
BR6: Deleting a customer requires either (a) reassigning or deleting all linked pets and appointments, or (b) marking the customer as archived; hard deletion should be restricted and logged.

Acceptance Criteria

- Admin can manage business profile, staff, customers, and pets with RBAC enforced.
- Pet records are linked to customers and used by Services workflows.
- Search/filter and import/export functions work and honor data validation rules.

