# Services Module — Requirements

Scope: service catalog, appointment scheduling, staff allocation, service notes and history, email reminders.

Functional Requirements

1. F1: Service Catalog — CRUD services with fields: name, description, duration, price, required resources, and tags.
2. F2: Service Packages — define packages composed of multiple services with bundle pricing.
3. F3: Appointment Scheduling — create/read/update/cancel appointments with fields: customer, pet, service(s), staff, start/end time, location, status (booked, confirmed, checked-in, completed, cancelled).
4. F4: Staff Allocation — assign staff to appointments manually or via automatic suggestions based on skills and availability.
5. F5: Calendar View — staff and store calendar views (day/week) showing appointments and free slots.
6. F6: Service Notes & History — capture notes during service (groomer/vet notes) stored against pet and appointment history.
7. F7: Reminders — schedule and send email reminders for upcoming appointments (templates managed in Administrative settings); include placeholders for SMS in the future.
8. F8: Appointment Conflicts — prevent double-booking of staff and resources; surface conflicts on schedule save.
9. F9: Recurring Appointments — support simple recurrence patterns (daily, weekly, custom interval) for repeat services.
10. F10: Cancellation & No-show Handling — flag no-shows and optionally apply soft penalties (note only) to customer record.

Non-Functional Requirements

1. N1: Availability — appointment creation and calendar must respond within 500ms during business hours.
2. N2: Concurrency — ensure calendar operations handle concurrent booking attempts with optimistic locking and conflict resolution.
3. N3: Auditability — record who created/modified/cancelled appointments and service notes with timestamps.
4. N4: Localization — UI and email templates must support `pt-PT` and date/time formats for Portugal.
5. N5: Data retention — service notes and appointment history to be retained and searchable for at least 5 years unless GDPR deletion requested.

Dependencies

- Depends on Administrative for customer and pet records, staff profiles and store opening hours.
- Depends on Users & Access Control for permission to create/modify appointments and view staff calendars.
- Depends on Inventory for services that consume stock (e.g., products used during a service) to decrement inventory during checkout.
- Depends on Financial for finalizing checkout and invoice generation (manual payment recording flow).

Business Rules

BR1: Appointments must be scheduled only within store opening hours and staff working hours.
BR2: When a service consumes inventory items, the inventory reservation should occur at appointment confirmation and final decrement at checkout/completion.
BR3: If assigned staff is unavailable (on leave or absent), appointment status must be marked `needs-reschedule` and manager notified.
BR4: Recurring appointments must create distinct appointment instances (no implicit single record with multiple dates) which can be individually modified or cancelled.
BR5: Email reminders must not be sent to customers who have revoked marketing/communication consent; reminder-only consent tracked separately.
BR6: No-show entries do not automatically trigger refunds; any refund must be processed by an authorized accountant/manager and recorded in Financial exports.

Acceptance Criteria

- Users can create services and appointments, assign staff, and view calendars with conflict prevention.
- Service notes are audit-logged and linked to pet history.
- Email reminders are sent only when the customer has not opted out and templates populated correctly.

