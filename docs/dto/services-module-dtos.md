# Data Transfer Object (DTO) Definitions: Services Module

## Overview

This document defines all Data Transfer Objects (DTOs) used for input/output operations in the Services Module of the Petshop Management System. DTOs are used for API requests and responses, following Clean/Hexagonal Architecture principles.

**Module:** Services  
**Context:** Petshop Management System (Portugal)  
**Architecture:** Clean/Hexagonal Architecture

---

## Service DTOs

### ConsumedItemDTO

**Purpose:**  
Consumed item structure used in service creation and updates. Represents a product consumed during service execution.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `product_id` | UUID | - | Yes | - | Valid UUID, must exist | Product identifier |
| `quantity` | Integer | - | Yes | - | Min 1 | Quantity consumed during service |

**Example Payload:**
```json
{
  "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
  "quantity": 2
}
```

---

### CreateServiceDTO

**Purpose:**  
Input DTO for creating a new service.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `name` | String | - | Yes | - | Max 255 chars, non-empty | Must not be whitespace-only |
| `description` | String | - | No | - | Max 2000 chars | Service description |
| `duration_minutes` | Integer | - | Yes | - | Min 1 | Service duration in minutes |
| `price` | Decimal | - | Yes | - | >= 0.00, precision 12.2 | Service price |
| `consumes_inventory` | Boolean | - | Yes | false | true/false | Whether service consumes inventory items |
| `consumed_items` | Array[ConsumedItemDTO] | - | No | - | Required if consumes_inventory=true, min 1 item | List of products consumed during service |
| `required_resources` | Array[String] | - | No | - | Max 50 items, each max 128 chars | List of resource identifiers (e.g., "grooming_station", "exam_room") |
| `tags` | Array[String] | - | No | - | Max 20 items, each max 64 chars | Service tags for categorization |

**Example Payload:**
```json
{
  "name": "Dog Grooming - Full Service",
  "description": "Complete grooming service including bath, haircut, nail trim, and ear cleaning",
  "duration_minutes": 90,
  "price": 45.00,
  "consumes_inventory": true,
  "consumed_items": [
    {
      "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "quantity": 1
    },
    {
      "product_id": "cc0e8400-e29b-41d4-a716-446655440000",
      "quantity": 2
    }
  ],
  "required_resources": ["grooming_station_1"],
  "tags": ["grooming", "dog", "full-service"]
}
```

---

### UpdateServiceDTO

**Purpose:**  
Input DTO for updating an existing service. All fields are optional (partial update).

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `name` | String | - | No | - | Max 255 chars, non-empty | Must not be whitespace-only if provided |
| `description` | String | - | No | - | Max 2000 chars | Service description if provided |
| `duration_minutes` | Integer | - | No | - | Min 1 | Service duration in minutes if provided |
| `price` | Decimal | - | No | - | >= 0.00, precision 12.2 | Service price if provided |
| `consumes_inventory` | Boolean | - | No | - | true/false | Inventory consumption flag if provided |
| `consumed_items` | Array[ConsumedItemDTO] | - | No | - | Required if consumes_inventory=true, min 1 item | List of consumed products if provided |
| `required_resources` | Array[String] | - | No | - | Max 50 items, each max 128 chars | Required resources if provided |
| `tags` | Array[String] | - | No | - | Max 20 items, each max 64 chars | Service tags if provided |

**Example Payload:**
```json
{
  "name": "Dog Grooming - Full Service (Updated)",
  "price": 50.00,
  "duration_minutes": 120
}
```

---

### ServiceResponseDTO

**Purpose:**  
Output DTO for service responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `name` | String | - | Yes | - | Max 255 chars | Service name |
| `description` | String | - | No | null | Max 2000 chars | Service description (nullable) |
| `duration_minutes` | Integer | - | Yes | - | >= 1 | Service duration in minutes |
| `price` | Decimal | - | Yes | - | >= 0.00 | Service price |
| `consumes_inventory` | Boolean | - | Yes | false | true/false | Inventory consumption flag |
| `consumed_items` | Array[ConsumedItemDTO] | - | No | null | Array of consumed items | Consumed products (nullable) |
| `required_resources` | Array[String] | - | No | null | Array of strings | Required resources (nullable) |
| `tags` | Array[String] | - | No | null | Array of strings | Service tags (nullable) |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |
| `updated_at` | String | ISO 8601 | No | null | Valid datetime | Last update timestamp (nullable) |

**Example Payload:**
```json
{
  "id": "dd0e8400-e29b-41d4-a716-446655440000",
  "name": "Dog Grooming - Full Service",
  "description": "Complete grooming service including bath, haircut, nail trim, and ear cleaning",
  "duration_minutes": 90,
  "price": 45.00,
  "consumes_inventory": true,
  "consumed_items": [
    {
      "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "quantity": 1
    }
  ],
  "required_resources": ["grooming_station_1"],
  "tags": ["grooming", "dog", "full-service"],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:45:00Z"
}
```

---

### SearchServicesDTO

**Purpose:**  
Input DTO for searching services with filters and pagination.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `q` | String | - | No | - | Max 255 chars | General search query (searches name, description) |
| `tag` | String | - | No | - | Max 64 chars | Filter by tag (exact match) |
| `consumes_inventory` | Boolean | - | No | - | true/false | Filter by inventory consumption flag |
| `min_duration` | Integer | - | No | - | Min 1 | Filter services with duration >= min_duration |
| `max_duration` | Integer | - | No | - | Min 1 | Filter services with duration <= max_duration |
| `min_price` | Decimal | - | No | - | >= 0.00 | Filter services with price >= min_price |
| `max_price` | Decimal | - | No | - | >= 0.00 | Filter services with price <= max_price |
| `page` | Integer | - | No | 1 | Min 1 | Page number for pagination |
| `per_page` | Integer | - | No | 20 | Min 1, max 100 | Number of results per page |
| `sort` | String | - | No | "name" | Valid sort field | Sort field and direction ("-" prefix for descending) |

**Example Payload:**
```json
{
  "q": "grooming",
  "tag": "dog",
  "consumes_inventory": true,
  "min_duration": 30,
  "max_duration": 120,
  "page": 1,
  "per_page": 20,
  "sort": "name"
}
```

---

### PaginatedServicesResponseDTO

**Purpose:**  
Output DTO for paginated service search results.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `items` | Array[ServiceResponseDTO] | - | Yes | - | Array of service objects | Matching services |
| `meta` | PaginationMetaDTO | - | Yes | - | Valid pagination metadata | Pagination information |

**Example Payload:**
```json
{
  "items": [
    {
      "id": "dd0e8400-e29b-41d4-a716-446655440000",
      "name": "Dog Grooming - Full Service",
      "description": "Complete grooming service including bath, haircut, nail trim, and ear cleaning",
      "duration_minutes": 90,
      "price": 45.00,
      "consumes_inventory": true,
      "consumed_items": [],
      "required_resources": ["grooming_station_1"],
      "tags": ["grooming", "dog", "full-service"],
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:45:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "per_page": 20,
    "total_pages": 3,
    "has_next": true,
    "has_previous": false
  }
}
```

---

## Service Package DTOs

### ServicePackageItemDTO

**Purpose:**  
Service package item structure used in service package creation. Represents a service included in a package.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `service_id` | UUID | - | Yes | - | Valid UUID, must exist | Service identifier |
| `qty` | Integer | - | Yes | - | Min 1 | Quantity of this service in the package |

**Example Payload:**
```json
{
  "service_id": "dd0e8400-e29b-41d4-a716-446655440000",
  "qty": 1
}
```

---

### CreateServicePackageDTO

**Purpose:**  
Input DTO for creating a new service package.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `name` | String | - | Yes | - | Max 255 chars, non-empty | Must not be whitespace-only |
| `description` | String | - | No | - | Max 2000 chars | Package description |
| `services` | Array[ServicePackageItemDTO] | - | Yes | - | Min 1 service item | Ordered list of services in package |
| `bundle_price` | Decimal | - | No | - | >= 0.00, precision 12.2 | Bundle price (if different from sum of service prices) |

**Example Payload:**
```json
{
  "name": "Puppy Starter Package",
  "description": "Complete package for new puppies including vaccination, checkup, and grooming",
  "services": [
    {
      "service_id": "dd0e8400-e29b-41d4-a716-446655440000",
      "qty": 1
    },
    {
      "service_id": "ee0e8400-e29b-41d4-a716-446655440000",
      "qty": 1
    }
  ],
  "bundle_price": 120.00
}
```

---

### ServicePackageResponseDTO

**Purpose:**  
Output DTO for service package responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `name` | String | - | Yes | - | Max 255 chars | Package name |
| `description` | String | - | No | null | Max 2000 chars | Package description (nullable) |
| `services` | Array[ServicePackageItemDTO] | - | Yes | - | Min 1 service item | Ordered list of services in package |
| `bundle_price` | Decimal | - | No | null | >= 0.00 | Bundle price (nullable) |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |
| `updated_at` | String | ISO 8601 | No | null | Valid datetime | Last update timestamp (nullable) |

**Example Payload:**
```json
{
  "id": "ff0e8400-e29b-41d4-a716-446655440000",
  "name": "Puppy Starter Package",
  "description": "Complete package for new puppies including vaccination, checkup, and grooming",
  "services": [
    {
      "service_id": "dd0e8400-e29b-41d4-a716-446655440000",
      "qty": 1
    },
    {
      "service_id": "ee0e8400-e29b-41d4-a716-446655440000",
      "qty": 1
    }
  ],
  "bundle_price": 120.00,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:45:00Z"
}
```

---

## Appointment DTOs

### AppointmentServiceLineDTO

**Purpose:**  
Appointment service line structure used in appointment creation and updates.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `service_id` | UUID | - | Yes | - | Valid UUID, must exist | Service identifier |
| `quantity` | Integer | - | Yes | 1 | Min 1 | Quantity of this service |
| `price_override` | Decimal | - | No | - | >= 0.00, precision 12.2 | Override service price (if different from default) |

**Example Payload:**
```json
{
  "service_id": "dd0e8400-e29b-41d4-a716-446655440000",
  "quantity": 1,
  "price_override": 50.00
}
```

---

### RecurrenceDTO

**Purpose:**  
Recurrence pattern structure used in appointment creation for recurring appointments.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `pattern` | String | - | Yes | - | "daily", "weekly", "monthly", "custom" | Recurrence pattern |
| `interval` | Integer | - | Yes | - | Min 1 | Interval between occurrences (e.g., every 2 weeks) |
| `end_date` | String | yyyy-MM-dd | No | - | Valid date, >= start_at | End date for recurrence (nullable) |
| `count` | Integer | - | No | - | Min 1 | Number of occurrences (nullable, alternative to end_date) |

**Note:** Either `end_date` or `count` should be provided, but not both.

**Example Payload:**
```json
{
  "pattern": "weekly",
  "interval": 2,
  "end_date": "2025-12-31"
}
```

---

### CreateAppointmentDTO

**Purpose:**  
Input DTO for creating a new appointment.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `store_id` | UUID | - | Yes | - | Valid UUID, must exist | Store identifier |
| `customer_id` | UUID | - | Yes | - | Valid UUID, must exist | Customer identifier |
| `pet_id` | UUID | - | Yes | - | Valid UUID, must exist | Pet identifier |
| `start_at` | String | ISO 8601 | Yes | - | Valid datetime, not past | Appointment start time |
| `end_at` | String | ISO 8601 | Yes | - | Valid datetime, > start_at | Appointment end time |
| `staff_id` | UUID | - | No | - | Valid UUID, must exist, assigned to store | Assigned staff member |
| `services` | Array[AppointmentServiceLineDTO] | - | Yes | - | Min 1 service | Array of services for appointment |
| `notes` | String | - | No | - | Max 2000 chars | Appointment notes |
| `recurrence` | RecurrenceDTO | - | No | - | Valid recurrence pattern | Recurrence configuration (optional) |

**Example Payload:**
```json
{
  "store_id": "660e8400-e29b-41d4-a716-446655440000",
  "customer_id": "770e8400-e29b-41d4-a716-446655440000",
  "pet_id": "880e8400-e29b-41d4-a716-446655440000",
  "start_at": "2024-02-01T10:00:00Z",
  "end_at": "2024-02-01T11:30:00Z",
  "staff_id": "990e8400-e29b-41d4-a716-446655440000",
  "services": [
    {
      "service_id": "dd0e8400-e29b-41d4-a716-446655440000",
      "quantity": 1,
      "price_override": 50.00
    }
  ],
  "notes": "First time grooming for this puppy",
  "recurrence": {
    "pattern": "weekly",
    "interval": 2,
    "end_date": "2025-12-31"
  }
}
```

---

### UpdateAppointmentDTO

**Purpose:**  
Input DTO for updating an existing appointment. All fields are optional (partial update).

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `start_at` | String | ISO 8601 | No | - | Valid datetime, not past | Appointment start time if provided |
| `end_at` | String | ISO 8601 | No | - | Valid datetime, > start_at | Appointment end time if provided |
| `staff_id` | UUID | - | No | - | Valid UUID, must exist, assigned to store | Assigned staff member if provided |
| `status` | String | - | No | - | Valid status value | Appointment status if provided |
| `notes` | String | - | No | - | Max 2000 chars | Appointment notes if provided |
| `services` | Array[AppointmentServiceLineDTO] | - | No | - | Min 1 service if provided | Array of services if provided |

**Example Payload:**
```json
{
  "start_at": "2024-02-01T11:00:00Z",
  "end_at": "2024-02-01T12:30:00Z",
  "staff_id": "990e8400-e29b-41d4-a716-446655440000",
  "notes": "Updated notes - customer requested earlier time"
}
```

---

### AppointmentServiceLineResponseDTO

**Purpose:**  
Output DTO for appointment service line responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `appointment_id` | UUID | - | Yes | - | Valid UUID | Appointment identifier |
| `service_id` | UUID | - | Yes | - | Valid UUID | Service identifier |
| `service_name` | String | - | Yes | - | Max 255 chars | Service name (denormalized) |
| `quantity` | Integer | - | Yes | - | >= 1 | Quantity of this service |
| `price_override` | Decimal | - | No | null | >= 0.00 | Override service price (nullable) |
| `unit_price` | Decimal | - | Yes | - | >= 0.00 | Unit price used (service price or override) |
| `line_total` | Decimal | - | Yes | - | >= 0.00 | Line total (quantity * unit_price) |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |
| `updated_at` | String | ISO 8601 | No | null | Valid datetime | Last update timestamp (nullable) |

**Example Payload:**
```json
{
  "id": "110e8400-e29b-41d4-a716-446655440000",
  "appointment_id": "220e8400-e29b-41d4-a716-446655440000",
  "service_id": "dd0e8400-e29b-41d4-a716-446655440000",
  "service_name": "Dog Grooming - Full Service",
  "quantity": 1,
  "price_override": 50.00,
  "unit_price": 50.00,
  "line_total": 50.00,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

### AppointmentResponseDTO

**Purpose:**  
Output DTO for appointment responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `store_id` | UUID | - | Yes | - | Valid UUID | Store identifier |
| `store_name` | String | - | Yes | - | Max 255 chars | Store name (denormalized) |
| `customer_id` | UUID | - | Yes | - | Valid UUID | Customer identifier |
| `customer_name` | String | - | Yes | - | Max 255 chars | Customer name (denormalized) |
| `pet_id` | UUID | - | Yes | - | Valid UUID | Pet identifier |
| `pet_name` | String | - | Yes | - | Max 255 chars | Pet name (denormalized) |
| `start_at` | String | ISO 8601 | Yes | - | Valid datetime | Appointment start time |
| `end_at` | String | ISO 8601 | Yes | - | Valid datetime | Appointment end time |
| `status` | String | - | Yes | - | Valid status value | Appointment status ("booked", "confirmed", "checked_in", "completed", "cancelled", "needs-reschedule") |
| `staff_id` | UUID | - | No | null | Valid UUID | Assigned staff member (nullable) |
| `staff_name` | String | - | No | null | Max 255 chars | Staff name (denormalized, nullable) |
| `services` | Array[AppointmentServiceLineResponseDTO] | - | Yes | - | Min 1 service | Appointment service lines |
| `notes` | String | - | No | null | Max 2000 chars | Appointment notes (nullable) |
| `recurrence_id` | UUID | - | No | null | Valid UUID | Recurrence group identifier (nullable) |
| `created_by` | UUID | - | No | null | Valid UUID | User who created the appointment (nullable) |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |
| `updated_at` | String | ISO 8601 | No | null | Valid datetime | Last update timestamp (nullable) |

**Example Payload:**
```json
{
  "id": "220e8400-e29b-41d4-a716-446655440000",
  "store_id": "660e8400-e29b-41d4-a716-446655440000",
  "store_name": "Patacão Lisboa Centro",
  "customer_id": "770e8400-e29b-41d4-a716-446655440000",
  "customer_name": "João Silva",
  "pet_id": "880e8400-e29b-41d4-a716-446655440000",
  "pet_name": "Max",
  "start_at": "2024-02-01T10:00:00Z",
  "end_at": "2024-02-01T11:30:00Z",
  "status": "booked",
  "staff_id": "990e8400-e29b-41d4-a716-446655440000",
  "staff_name": "Maria Santos",
  "services": [
    {
      "id": "110e8400-e29b-41d4-a716-446655440000",
      "appointment_id": "220e8400-e29b-41d4-a716-446655440000",
      "service_id": "dd0e8400-e29b-41d4-a716-446655440000",
      "service_name": "Dog Grooming - Full Service",
      "quantity": 1,
      "price_override": 50.00,
      "unit_price": 50.00,
      "line_total": 50.00,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "notes": "First time grooming for this puppy",
  "recurrence_id": null,
  "created_by": "990e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

### CompleteAppointmentDTO

**Purpose:**  
Input DTO for completing an appointment.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `notes` | String | - | No | - | Max 5000 chars | Service notes (groomer/vet notes) |
| `consumed_items` | Array[ConsumedItemDTO] | - | No | - | Required if service consumes inventory | Actual consumed items (may differ from reservation) |

**Note:** `consumed_items` may include `batch_id` for expiry tracking (see inventory module DTOs for full structure).

**Example Payload:**
```json
{
  "notes": "Pet was very calm during grooming. Recommended follow-up in 6 weeks.",
  "consumed_items": [
    {
      "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "quantity": 1
    }
  ]
}
```

---

### CancelAppointmentDTO

**Purpose:**  
Input DTO for cancelling an appointment.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `reason` | String | - | No | - | Max 500 chars | Reason for cancellation (e.g., "Customer cancellation", "Staff unavailable", "Pet illness", "Weather", "No-show", "Other") |
| `mark_no_show` | Boolean | - | No | false | true/false | Mark as no-show (defaults to false) |

**Example Payload:**
```json
{
  "reason": "Customer cancellation - pet is ill",
  "mark_no_show": false
}
```

---

### RescheduleAppointmentDTO

**Purpose:**  
Input DTO for rescheduling an appointment.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `new_start_at` | String | ISO 8601 | Yes | - | Valid datetime, not past | New appointment start time |
| `new_end_at` | String | ISO 8601 | Yes | - | Valid datetime, > new_start_at | New appointment end time |
| `staff_id` | UUID | - | No | - | Valid UUID, must exist, assigned to store | New assigned staff member (optional) |

**Example Payload:**
```json
{
  "new_start_at": "2024-02-05T14:00:00Z",
  "new_end_at": "2024-02-05T15:30:00Z",
  "staff_id": "990e8400-e29b-41d4-a716-446655440000"
}
```

---

### SearchAppointmentsDTO

**Purpose:**  
Input DTO for searching appointments with filters and pagination.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `store_id` | UUID | - | No | - | Valid UUID, must exist if provided | Filter by store |
| `staff_id` | UUID | - | No | - | Valid UUID, must exist if provided | Filter by assigned staff |
| `customer_id` | UUID | - | No | - | Valid UUID, must exist if provided | Filter by customer |
| `pet_id` | UUID | - | No | - | Valid UUID, must exist if provided | Filter by pet |
| `start_date` | String | yyyy-MM-dd | No | - | Valid date, <= end_date | Start date for date range filter |
| `end_date` | String | yyyy-MM-dd | No | - | Valid date, >= start_date | End date for date range filter |
| `status` | String | - | No | - | Valid status value | Filter by appointment status (exact match) |
| `page` | Integer | - | No | 1 | Min 1 | Page number for pagination |
| `per_page` | Integer | - | No | 20 | Min 1, max 100 | Number of results per page |
| `sort` | String | - | No | "start_at" | Valid sort field | Sort field and direction ("-" prefix for descending) |

**Status Values:**
- `booked`: Appointment booked but not confirmed
- `confirmed`: Appointment confirmed
- `checked_in`: Customer checked in
- `completed`: Appointment completed
- `cancelled`: Appointment cancelled
- `needs-reschedule`: Appointment needs rescheduling

**Example Payload:**
```json
{
  "store_id": "660e8400-e29b-41d4-a716-446655440000",
  "staff_id": "990e8400-e29b-41d4-a716-446655440000",
  "start_date": "2024-02-01",
  "end_date": "2024-02-28",
  "status": "confirmed",
  "page": 1,
  "per_page": 20,
  "sort": "start_at"
}
```

---

### PaginatedAppointmentsResponseDTO

**Purpose:**  
Output DTO for paginated appointment search results.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `items` | Array[AppointmentResponseDTO] | - | Yes | - | Array of appointment objects | Matching appointments |
| `meta` | PaginationMetaDTO | - | Yes | - | Valid pagination metadata | Pagination information |

**Example Payload:**
```json
{
  "items": [
    {
      "id": "220e8400-e29b-41d4-a716-446655440000",
      "store_id": "660e8400-e29b-41d4-a716-446655440000",
      "store_name": "Patacão Lisboa Centro",
      "customer_id": "770e8400-e29b-41d4-a716-446655440000",
      "customer_name": "João Silva",
      "pet_id": "880e8400-e29b-41d4-a716-446655440000",
      "pet_name": "Max",
      "start_at": "2024-02-01T10:00:00Z",
      "end_at": "2024-02-01T11:30:00Z",
      "status": "confirmed",
      "staff_id": "990e8400-e29b-41d4-a716-446655440000",
      "staff_name": "Maria Santos",
      "services": [],
      "notes": null,
      "recurrence_id": null,
      "created_by": "990e8400-e29b-41d4-a716-446655440000",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "per_page": 20,
    "total_pages": 8,
    "has_next": true,
    "has_previous": false
  }
}
```

---

## Validation Notes

### Common Validation Rules

1. **Decimal Precision:**
   - Prices: 12 digits total, 2 decimal places (DECIMAL(12,2))
   - Range: 0.00 to 9999999999.99

2. **Date Formats:**
   - Dates: `yyyy-MM-dd` (e.g., "2024-01-15")
   - DateTimes: ISO 8601 format (e.g., "2024-01-15T10:30:00Z")

3. **Appointment Status:**
   - Valid values: "booked", "confirmed", "checked_in", "completed", "cancelled", "needs-reschedule"
   - Status transitions are restricted (business rule validation)

4. **Recurrence Patterns:**
   - Valid values: "daily", "weekly", "monthly", "custom"
   - Either `end_date` or `count` should be provided, but not both

5. **Time Validation:**
   - `start_at` must not be in the past
   - `end_at` must be after `start_at`
   - Appointment times must be within store opening hours
   - Staff working hours must accommodate appointment time (if staff assigned)

### Business Rules

1. **Service Duration:**
   - Total appointment duration should match sum of service durations * quantities (with tolerance)
   - Duration calculated from `end_at - start_at`

2. **Inventory Consumption:**
   - If `consumes_inventory=true`, `consumed_items` array is required
   - Inventory reservations created on appointment confirmation
   - Stock decremented on appointment completion

3. **Appointment Conflicts:**
   - No double-booking of staff members
   - No overlapping appointments for same resource
   - Store-level conflict checking

4. **Recurrence:**
   - Creates multiple appointment instances
   - All instances linked via `recurrence_id`
   - Cancelling one instance does not cancel others (unless business rule specifies)

5. **Cancellation:**
   - Releases inventory reservations if appointment was confirmed
   - Cannot cancel completed appointments
   - No-show flag can be set during cancellation

6. **Completion:**
   - Only confirmed or checked_in appointments can be completed
   - Creates stock movements for consumed items
   - Releases or consumes inventory reservations

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

