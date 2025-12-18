REST API Endpoints — Patacão Petshop

Conventions
- Auth: Bearer token (session/JWT) unless marked public.
- Pagination query params: `page` (int), `per_page` (int), `sort` (field[,asc|desc]).
- Standard responses shown: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 500 Server Error.
- Roles: `Owner`, `Manager`, `Staff`, `Accountant`, `Veterinarian`.
- No in-app payment endpoints (payments are manual/external).

Format: For each module a table of endpoints with: Method | Route | Params | Body | Responses | Auth/Permissions

---

**Module: Authentication & Users (users module)**

- POST /auth/login
  - Params: none
  - Body: { email, password }
  - Responses: 200 { access_token, refresh_token, user } | 400 | 401
  - Auth: public

- POST /auth/logout
  - Params: none
  - Body: { refresh_token (opt) }
  - Responses: 204 | 401
  - Auth: Bearer required (any authenticated user)

- POST /auth/refresh
  - Params: none
  - Body: { refresh_token }
  - Responses: 200 { access_token, refresh_token } | 401
  - Auth: public (requires valid refresh token)

- POST /auth/password-reset/request
  - Params: none
  - Body: { email }
  - Responses: 200 (email queued) | 400
  - Auth: public

- POST /auth/password-reset/confirm
  - Params: none
  - Body: { token, new_password }
  - Responses: 200 | 400 | 401
  - Auth: public

- GET /users
  - Params: query: `page`, `per_page`, `q` (search), `role`, `store_id`
  - Body: none
  - Responses: 200 { items: [...], meta } | 401 | 403
  - Auth: Owner, Manager

- POST /users
  - Params: none
  - Body: { email, full_name, phone(opt), username(opt), roles: [role_ids], store_ids: [store_id], working_hours(opt), password(opt) }
  - Responses: 201 { user } | 400 | 401 | 403
  - Auth: Owner, Manager
  - Notes: If `password` is provided, a Firebase Auth user is automatically created and linked to the internal user. If omitted, user must go through password reset flow to set password.

- GET /users/{id}
  - Params: path id
  - Body: none
  - Responses: 200 { user } | 401 | 403 | 404
  - Auth: Owner, Manager, Accountant, Staff (self) — permission checks apply

- PUT /users/{id}
  - Params: id
  - Body: { full_name, phone, roles(opt), active(opt), store_ids(opt), working_hours(opt) }
  - Responses: 200 { user } | 400 | 401 | 403 | 404
  - Auth: Owner, Manager (or self with restricted fields)

- DELETE /users/{id}
  - Params: id
  - Body: none
  - Responses: 204 | 401 | 403 | 404
  - Auth: Owner (deleting Owners restricted), Manager can deactivate staff (archive)

- GET /roles
  - Params: none
  - Body: none
  - Responses: 200 { roles } | 401
  - Auth: Owner, Manager

- GET /sessions
  - Params: query `user_id` optional
  - Body: none
  - Responses: 200 { sessions } | 401 | 403
  - Auth: Owner, Manager

- POST /sessions/{id}/revoke
  - Params: id (session id)
  - Body: none
  - Responses: 204 | 401 | 403 | 404
  - Auth: Owner, Manager

- POST /auth/mfa/enable  (optional)
  - Params: none
  - Body: { type: 'totp' }
  - Responses: 200 { mfa_setup } | 401
  - Auth: Owner, Manager (optional per user)


---

**Module: Administrative (administrative module)**

- GET /companies/{id}
  - Params: id
  - Body: none
  - Responses: 200 { company } | 401 | 403 | 404
  - Auth: Owner, Manager

- PUT /companies/{id}
  - Params: id
  - Body: { name, nif, address, tax_regime, default_vat_rate, phone, email }
  - Responses: 200 { company } | 400 | 401 | 403
  - Auth: Owner only for fiscal fields; Manager allowed for non-fiscal

- GET /stores
  - Params: query `company_id`, `page`, `per_page`
  - Body: none
  - Responses: 200 list | 401 | 403
  - Auth: Owner, Manager

- POST /stores
  - Params: none
  - Body: { company_id, name, address, opening_hours, timezone, email, phone }
  - Responses: 201 { store } | 400 | 401 | 403
  - Auth: Owner, Manager

- GET /stores/{id}
  - Params: id
  - Body: none
  - Responses: 200 { store } | 401 | 403 | 404
  - Auth: Owner, Manager, staff with access to store

- PUT /stores/{id}
  - Params: id
  - Body: { name, address, opening_hours, timezone, email, phone }
  - Responses: 200 { store } | 401 | 403 | 404
  - Auth: Owner, Manager

- DELETE /stores/{id}
  - Params: id
  - Body: none
  - Responses: 204 | 401 | 403 | 404
  - Auth: Owner (or Manager with constraints)

- GET /customers
  - Params: `page`, `per_page`, `q`, `email`, `phone` (search)
  - Body: none
  - Responses: 200 { items, meta } | 401 | 403
  - Auth: Staff, Manager, Accountant

- POST /customers
  - Params: none
  - Body: { full_name, email(opt), phone(opt), address(opt), consent_marketing(opt), consent_reminders(opt) }
  - Responses: 201 { customer } | 400 | 401 | 403
  - Auth: Staff, Manager

- GET /customers/{id}
  - Params: id
  - Body: none
  - Responses: 200 { customer } | 401 | 403 | 404
  - Auth: Staff, Manager, Accountant

- PUT /customers/{id}
  - Params: id
  - Body: { full_name, email, phone, address, consent_marketing, consent_reminders }
  - Responses: 200 { customer } | 400 | 401 | 403 | 404
  - Auth: Staff, Manager

- POST /customers/{id}/archive
  - Params: id
  - Body: { reason(opt) }
  - Responses: 200 { archived: true } | 401 | 403 | 404
  - Auth: Manager, Owner

- DELETE /customers/{id}
  - Params: id
  - Body: none
  - Responses: 204 | 401 | 403 | 404
  - Auth: Owner (hard delete restricted; prefer archive)

- GET /pets
  - Params: `page`, `per_page`, `customer_id`, `q`, `microchip_id`
  - Body: none
  - Responses: 200 list | 401 | 403
  - Auth: Staff, Manager, Veterinarian

- POST /pets
  - Params: none
  - Body: { name, customer_id (or inline customer object), species, breed(opt), date_of_birth(opt), microchip_id(opt), medical_notes(opt), vaccination(opt) }
  - Responses: 201 { pet } | 400 | 401 | 403
  - Auth: Staff, Manager, Veterinarian

- GET /pets/{id}
  - Params: id
  - Body: none
  - Responses: 200 { pet } | 401 | 403 | 404
  - Auth: Staff, Manager, Veterinarian

- PUT /pets/{id}
  - Params: id
  - Body: { name, breed, date_of_birth, microchip_id, medical_notes, vaccination }
  - Responses: 200 { pet } | 400 | 401 | 403 | 404
  - Auth: Staff, Manager, Veterinarian

- DELETE /pets/{id}
  - Params: id
  - Body: none
  - Responses: 204 | 401 | 403 | 404
  - Auth: Manager, Owner (deletion requires reassign/archive of linked appointments)

- GET /import/customers
  - Params: none
  - Body: CSV/JSON file multipart
  - Responses: 202 (import started) | 400 | 401 | 403
  - Auth: Manager, Owner

- GET /export/customers
  - Params: `format` (csv|json), filters
  - Responses: 200 file | 401 | 403
  - Auth: Manager, Accountant


---

**Module: Services (services module)**

- GET /services
  - Params: `page`, `per_page`, `q`, `tag`
  - Body: none
  - Responses: 200 list | 401 | 403
  - Auth: Staff, Manager, Veterinarian

- POST /services
  - Params: none
  - Body: { name, description(opt), duration_minutes, price, consumes_inventory(boolean), consumed_items(opt), tags(opt) }
  - Responses: 201 { service } | 400 | 401 | 403
  - Auth: Manager, Owner

- GET /services/{id}
  - Params: id
  - Responses: 200 { service } | 401 | 403 | 404
  - Auth: Staff, Manager

- PUT /services/{id}
  - Params: id
  - Body: { name, description, duration_minutes, price, consumes_inventory, consumed_items }
  - Responses: 200 { service } | 400 | 401 | 403 | 404
  - Auth: Manager, Owner

- DELETE /services/{id}
  - Params: id
  - Body: none
  - Responses: 204 | 401 | 403 | 404
  - Auth: Manager, Owner

- GET /service-packages
  - Params: `page`, `per_page`
  - Body: none
  - Responses: 200 list | 401 | 403
  - Auth: Staff, Manager

- POST /service-packages
  - Params: none
  - Body: { name, services: [{service_id, qty}], bundle_price(opt) }
  - Responses: 201 { package } | 400 | 401 | 403
  - Auth: Manager, Owner

- GET /appointments
  - Params: `page`, `per_page`, `store_id`, `staff_id`, `customer_id`, `start_date`, `end_date`, `status`
  - Body: none
  - Responses: 200 list | 401 | 403
  - Auth: Staff, Manager, Veterinarian

- POST /appointments
  - Params: none
  - Body: { store_id, customer_id, pet_id, start_at, end_at, staff_id(opt), services: [{service_id, qty, price_override(opt)}], notes(opt), recurrence(opt) }
  - Responses: 201 { appointment } | 400 | 401 | 403 | 409 (conflict double-booking)
  - Auth: Staff, Manager

- GET /appointments/{id}
  - Params: id
  - Body: none
  - Responses: 200 { appointment } | 401 | 403 | 404
  - Auth: Staff, Manager, Veterinarian

- PUT /appointments/{id}
  - Params: id
  - Body: { start_at(opt), end_at(opt), staff_id(opt), status(opt), notes(opt), services(opt) }
  - Responses: 200 { appointment } | 400 | 401 | 403 | 404 | 409
  - Auth: Staff (own store), Manager

- POST /appointments/{id}/confirm
  - Params: id
  - Body: none
  - Responses: 200 { appointment } | 401 | 403 | 404 | 409
  - Auth: Staff, Manager

- POST /appointments/{id}/checkin
  - Params: id
  - Body: none
  - Responses: 200 { appointment } | 401 | 403 | 404
  - Auth: Staff

- POST /appointments/{id}/complete
  - Params: id
  - Body: { notes(opt), consumed_items(optional if consumed during service) }
  - Responses: 200 { appointment } | 401 | 403 | 404
  - Auth: Staff, Veterinarian

- POST /appointments/{id}/cancel
  - Params: id
  - Body: { reason(opt), mark_no_show(boolean opt) }
  - Responses: 200 { appointment } | 401 | 403 | 404
  - Auth: Staff, Manager

- POST /appointments/{id}/reschedule
  - Params: id
  - Body: { new_start_at, new_end_at, staff_id(opt) }
  - Responses: 200 { appointment } | 400 | 401 | 403 | 404 | 409
  - Auth: Staff, Manager

- GET /reminders/templates
  - Params: none
  - Body: none
  - Responses: 200 list | 401 | 403
  - Auth: Manager, Owner

- PUT /reminders/templates/{id}
  - Params: id
  - Body: { subject, body, channel: 'email' }
  - Responses: 200 | 401 | 403
  - Auth: Manager

- POST /reminders/send (admin/debug)
  - Params: none
  - Body: { appointment_id }
  - Responses: 202 queued | 401 | 403
  - Auth: Manager

Notes: Appointment endpoints must validate store opening hours and staff availability; conflicts return 409.

---

**Module: Financial (financial module)**

- GET /invoices
  - Params: `company_id`, `store_id`, `page`, `per_page`, `status`, `from`, `to`, `buyer_customer_id`
  - Body: none
  - Responses: 200 list | 401 | 403
  - Auth: Accountant, Manager, Owner

- POST /invoices
  - Params: none
  - Body: { company_id, store_id, buyer_customer_id(opt), lines: [{description, product_id(opt), service_id(opt), quantity, unit_price, vat_rate}] , status: 'draft' or 'issued' }
  - Responses: 201 { invoice } | 400 | 401 | 403
  - Auth: Staff can create draft; Manager/Accountant to issue

- GET /invoices/{id}
  - Params: id
  - Body: none
  - Responses: 200 { invoice } | 401 | 403 | 404
  - Auth: Accountant, Manager, Owner, Staff (own store)

- PUT /invoices/{id}
  - Params: id
  - Body: { lines, buyer_customer_id, status (draft only) }
  - Responses: 200 { invoice } | 400 | 401 | 403 | 404
  - Auth: Draft editable by Staff; once `issued` only Manager/Accountant can void/edit with audit

- POST /invoices/{id}/issue
  - Params: id
  - Body: none
  - Responses: 200 { invoice (issued) } | 400 | 401 | 403 | 404
  - Auth: Manager, Accountant (must validate NIF and numbering)

- POST /invoices/{id}/mark-paid
  - Params: id
  - Body: { payment_method, paid_at, external_reference }
  - Responses: 200 { invoice } | 400 | 401 | 403 | 404
  - Auth: Staff (cashier) can mark paid; Manager/Accountant can override

- POST /invoices/{id}/void
  - Params: id
  - Body: { reason }
  - Responses: 200 | 401 | 403 | 404
  - Auth: Manager, Accountant

- GET /invoice-lines/{invoice_id}
  - Params: invoice_id
  - Responses: 200 list | 401 | 403
  - Auth: Accountant, Manager

- POST /credit-notes
  - Params: none
  - Body: { invoice_id, reason, amount }
  - Responses: 201 { credit_note } | 400 | 401 | 403
  - Auth: Manager, Accountant

- GET /transactions
  - Params: `store_id`, `page`, `per_page`, `from`, `to`, `status`
  - Body: none
  - Responses: 200 list | 401 | 403
  - Auth: Staff, Manager, Accountant

- POST /transactions
  - Params: none
  - Body: { store_id, created_by, lines: [{product_id(opt), service_id(opt), quantity, unit_price}], subtotal, vat_total, total_amount }
  - Responses: 201 { transaction } (produces invoice draft/issued per config) | 400 | 401 | 403
  - Auth: Staff, Manager

- GET /transactions/{id}
  - Params: id
  - Responses: 200 { transaction } | 401 | 403 | 404
  - Auth: Staff, Manager, Accountant

- POST /transactions/{id}/complete
  - Params: id
  - Body: { payment_method(opt), paid_at(opt), external_reference(opt) }
  - Responses: 200 { transaction } | 400 | 401 | 403 | 404
  - Auth: Staff, Manager
  - Notes: Completing triggers stock decrements for stock_tracked products

- GET /financial-exports
  - Params: `company_id`, `period_start`, `period_end`, `format` (csv|json)
  - Body: none
  - Responses: 200 { link/file } | 401 | 403
  - Auth: Accountant, Owner

- POST /financial-exports
  - Params: none
  - Body: { company_id, period_start, period_end, format }
  - Responses: 202 (export queued) | 400 | 401 | 403
  - Auth: Accountant, Owner

Notes: All invoice issuance must validate Company NIF and sequential numbering; system should prevent issuance if invalid.

---

**Module: Inventory (inventory module)**

- GET /products
  - Params: `page`, `per_page`, `q`, `sku`, `category`, `supplier_id`
  - Responses: 200 list | 401 | 403
  - Auth: Staff, Manager

- POST /products
  - Body: { sku, name, description(opt), category(opt), unit_price, vat_rate, stock_tracked(bool), reorder_threshold(opt), supplier_id(opt) }
  - Responses: 201 { product } | 400 | 401 | 403 | 409 (sku conflict)
  - Auth: Manager, Owner

- GET /products/{id}
  - Responses: 200 { product } | 401 | 403 | 404
  - Auth: Staff, Manager

- PUT /products/{id}
  - Body: { name, description, unit_price, vat_rate, stock_tracked, reorder_threshold, supplier_id }
  - Responses: 200 { product } | 400 | 401 | 403 | 404
  - Auth: Manager, Owner

- DELETE /products/{id}
  - Responses: 204 | 401 | 403 | 404
  - Auth: Manager, Owner (safe delete only if no historical ref)

- GET /suppliers
  - Params: `q`, `page`, `per_page`
  - Responses: 200 list | 401 | 403
  - Auth: Staff, Manager

- POST /suppliers
  - Body: { name, contact_email(opt), phone(opt), default_lead_time_days(opt) }
  - Responses: 201 { supplier } | 400 | 401 | 403
  - Auth: Manager

- GET /suppliers/{id}
  - Responses: 200 { supplier } | 401 | 403 | 404
  - Auth: Staff, Manager

- POST /stock-receipts
  - Body: { store_id, supplier_id(opt), lines: [{product_id, quantity, batch_number(opt), expiry_date(opt)}], received_by }
  - Responses: 201 { stock_receipt: { stock_batches, stock_movements } } | 400 | 401 | 403
  - Auth: Staff, Manager

- GET /stock-batches
  - Params: `product_id`, `page`, `per_page`, `expiry_before` (date)
  - Responses: 200 list | 401 | 403
  - Auth: Staff, Manager

- GET /stock-movements
  - Params: `product_id`, `from`, `to`, `page`
  - Responses: 200 list | 401 | 403
  - Auth: Staff, Manager, Accountant

- POST /stock-adjustments
  - Body: { product_id, quantity_change (negative or positive), reason, performed_by }
  - Responses: 201 { stock_movement } | 400 | 401 | 403
  - Auth: Manager, Owner (Staff only when explicitly permitted)

- POST /inventory-reservations
  - Body: { product_id, quantity, reserved_for_id, reserved_for_type ('appointment'|'transaction'), expires_at(opt) }
  - Responses: 201 { reservation } | 400 | 401 | 403 | 409 (insufficient stock)
  - Auth: Staff, Manager

- POST /inventory-reservations/{id}/release
  - Body: none
  - Responses: 200 | 401 | 403 | 404
  - Auth: Staff, Manager

- GET /purchase-orders
  - Params: `supplier_id`, `status`, `page`
  - Responses: 200 list | 401 | 403
  - Auth: Manager, Owner

- POST /purchase-orders
  - Body: { supplier_id, store_id, lines: [{product_id, quantity, unit_price}], created_by }
  - Responses: 201 { po } | 400 | 401 | 403
  - Auth: Manager

- POST /purchase-orders/{id}/receive
  - Body: { received_lines: [{product_id, quantity, batch_number(opt), expiry_date(opt)}], received_by }
  - Responses: 200 { stock_batches, stock_movements } | 400 | 401 | 403 | 404
  - Auth: Staff, Manager

- POST /stock-reconciliation
  - Body: { store_id, counts: [{product_id, counted_quantity, batch_number(opt)}], performed_by }
  - Responses: 202 queued | 400 | 401 | 403
  - Auth: Manager, Owner

Notes: Inventory endpoints should enforce atomic stock updates and respect batch expiry rules; selling an expired batch is blocked at transaction completion.

---

**Module: Audit & Operational (cross-cutting)**

- GET /audit-logs
  - Params: `entity_type`, `entity_id`, `performed_by`, `from`, `to`, `page`
  - Responses: 200 list | 401 | 403
  - Auth: Owner, Manager, Auditor (Accountant role)

- GET /health
  - Params: none
  - Responses: 200 { status: 'ok', components: { db: 'ok', queue: 'ok' } }
  - Auth: none or restricted to internal networks


---

Notes & Business-rule alignment
- Endpoints mirror domain entities and respect business rules (e.g., appointment scheduling enforces opening hours and staff availability; stock reservations occur at confirmation; invoice issuance restricted to Manager/Accountant and NIF validated before issue).
- Payment capture endpoints are intentionally omitted. `transactions/{id}/complete` and `invoices/{id}/mark-paid` accept manual payment details (method, external_reference).
- Audit logs record actions for financial and inventory operations; sensitive operations (void invoice, create credit note, stock adjustments) require Manager/Accountant and create audit entries.
- Concurrency conflicts return 409 (e.g., double-booking, insufficient stock on reservation).

If you want, I can now:
- Expand any endpoint into a full OpenAPI path object (no code), or
- Produce example request/response payloads for the most critical endpoints (CreateAppointment, CompleteTransaction, IssueInvoice).

Document created: `docs/api/rest-endpoints.md`.
