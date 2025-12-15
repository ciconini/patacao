# Financial Module — Requirements

Scope: invoice and receipt generation, manual payment recording, POS/checkout flows without in-app payment capture, financial exports for accounting.

Functional Requirements

1. F1: POS Checkout — create sales transactions (cart) which may include services and products; support line items, quantities, discounts, taxes.
2. F2: Invoice & Receipt Generation — generate VAT-aware invoices and receipts in Portuguese format with required fiscal fields (seller NIF, buyer NIF if provided, invoice number, date, VAT breakdown, total, payment status).
3. F3: Manual Payment Recording — allow cashier to mark a transaction as paid manually with fields: `payment_method`, `paid_at`, `external_reference`, and `paid_by`.
4. F4: Invoice Numbering — sequential invoice numbering per legal/regulatory rules; support prefixing and configurable numbering starting point.
5. F5: Credit Notes & Refund Records — create credit notes (refund records) linked to original invoice; actual money refund is handled outside the system but must be recorded.
6. F6: Financial Exports — export transactions, invoices, and credit notes in CSV/JSON and provide an SFTP export option for accountants.
7. F7: Tax Calculation — automatic VAT calculation per line and summary; support multiple VAT rates and rounding rules defined in Administrative fiscal settings.
8. F8: Audit Trail — immutable log entries for invoice creation, editing, and voiding; show user who performed the action and timestamp.
9. F9: Transaction Statuses — support statuses: draft, issued, paid (manual), cancelled, refunded.
10. F10: Fiscal Field Validation — validate required fiscal fields (NIF formats, mandatory fields) before issuing invoice.

Non-Functional Requirements

1. N1: Correctness — tax calculations must be deterministic and match Portuguese VAT rounding expectations; unit tests required for tax calculation logic.
2. N2: Performance — generating a PDF invoice must complete within 1s for typical invoices.
3. N3: Security — financial data must be encrypted at rest; access restricted by RBAC; audit logs tamper-evident.
4. N4: Compliance — invoices must contain required Portuguese fiscal fields; support exporting data for accounting and VAT reporting.
5. N5: Backup & Retention — financial records retained for at least 10 years or per local regulations; backups daily with 7-year cold storage recommendation (note: confirm with accountant/legal team).

Dependencies

- Depends on Administrative for business fiscal data, store and seller NIF, and customer info.
- Depends on Inventory for product line items and stock decrement triggered by successful sale.
- Depends on Users & Access Control for permissioning (who can issue invoices, create credit notes, mark as paid).
- Depends on Services for service line items and linking to appointment records.

Business Rules

BR1: An invoice cannot be issued without a valid seller NIF and a valid sequential invoice number; system must block issuance if fields invalid.
BR2: VAT must be applied per line based on the product/service category and the configured VAT rate; where buyer NIF is provided and special tax rules apply, apply them accordingly.
BR3: Manual payment marking sets the transaction `payment_status` to `paid` and records `paid_at` and `external_reference`; no money is transferred by the system.
BR4: Credit notes must reference the original invoice and reduce the outstanding amount; creation of a credit note requires Manager or Accountant role.
BR5: Draft invoices can be edited; once `issued`, only Manager or Accountant can void or edit (with audit log entry). Void operations must create a traceable record.
BR6: All invoice data used for VAT reporting must be exportable in the format expected by the accountant (CSV/JSON) and include invoice numbering, NIFs, dates, VAT breakdowns.

Acceptance Criteria

- Checkout flow creates invoices with correct VAT calculation and records manual payment information.
- Invoice numbering is sequential and validated; electronic invoice output (PDF/HTML) contains required fiscal fields.
- Exports provide complete transaction history for accountant reconciliation.

Notes

- Payment gateway / PSP integrations are out-of-scope for this phase. Payment-related API endpoints should be placeholders only (see `docs/no-payment-context.md`).
