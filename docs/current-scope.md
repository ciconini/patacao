# Petshop Management System — Current Scope

Purpose

This document captures the current agreed scope for the Patacão Petshop and should be used as canonical context for planning, development, and discussions with the team and stakeholders.

Scope Summary

- Title: Patacão
- Primary users: petshop owners, managers, receptionists/cashiers, groomers, accountants and veterinarians.
- Language & Locale: European Portuguese (pt-PT); currency EUR; Portugal time zones (WET/WEST).
- Platforms: Responsive Web App (desktop-first).

In-Scope Modules

1. Administrative
   - Business profile and settings (fiscal data, VAT rates, store locations)
   - Staff management and basic scheduling
   - Customer and pet records

2. Services
   - Service catalog and pricing
   - Appointment scheduling and staff allocation
   - Service notes and history per pet
   - Reminders/notifications (email)

3. Financial
   - Invoice and receipt generation (VAT-aware, Portuguese fiscal fields)
   - Manual payment recording fields (`payment_method`, `paid_at`, `external_reference`)
   - Financial exports (CSV/JSON/SFTP) for accounting reconciliation

4. Inventory
   - Product catalog, SKUs, suppliers
   - Stock movements, receipts, and adjustments
   - Low-stock alerts
   - Batch/expiry support where applicable

5. Users & Access Control
   - Role-based access control (Owner, Manager, Staff, Accountant, Veterinarian)
   - Permissions matrix and session management
   - Audit logging for key actions (sales, invoice changes, stock adjustments)

Out-of-Scope (for current phase / MVP)

- On-premise deployment packaging (cloud-first approach).

MVP Recommendation

Deliver a minimum viable product that provides high-value operational features:
- Customer & pet records
- Appointment scheduling with staff calendar
- POS that creates invoices and decrements inventory; cashier records manual payment info
- Product catalog and stock decrement on sale
- Basic roles and permissions (owner/manager/staff)
- VAT-aware invoice generation and accounting export

Acceptance Criteria (for current scope)

- Core flows implemented: appointment lifecycle, POS checkout (manual payment), stock decrement, invoice generation.
- Manual payment recording present on checkout with fields `payment_method`, `paid_at`, and `external_reference`.
- API and data contracts do not include active PSP endpoints; payment endpoint stubs only.
- Documentation updated to reflect payment removal and reconciliation process for accountants.

Integration & Future Work Notes

- Keep API placeholders for future payment endpoints, refunds, and webhooks to ease later integration.
- Recommended future PSPs to evaluate: Stripe, Mollie, Ifthenpay (for Multibanco/MB WAY) and local Portuguese PSPs.
- Re-introducing payments will require PCI-DSS scoping, PSD2/SCA compliance analysis, and updated UX for card entry and refunds.

Compliance & Security

- Security: encrypt sensitive data at rest, use HTTPS, enforce strong authentication and RBAC, and store audit logs immutably.

Document Maintenance

- This document is the single-source summary of scope for the current project phase. Update whenever scope decisions change (especially regarding payments or accounting scope).

Reference

Created as the canonical current-scope document for planning and collaboration.
