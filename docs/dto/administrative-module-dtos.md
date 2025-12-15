# Data Transfer Object (DTO) Definitions: Administrative Module

## Overview

This document defines all Data Transfer Objects (DTOs) used for input/output operations in the Administrative Module of the Petshop Management System. DTOs are used for API requests and responses, following Clean/Hexagonal Architecture principles.

**Module:** Administrative  
**Context:** Petshop Management System (Portugal)  
**Architecture:** Clean/Hexagonal Architecture

---

## Shared DTOs

### AddressDTO

**Purpose:**  
Structured address representation used across multiple entities (Company, Store, Customer).

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `street` | String | - | Yes | - | Max 255 chars, non-empty | Must not be whitespace-only |
| `city` | String | - | Yes | - | Max 255 chars, non-empty | Must not be whitespace-only |
| `postal_code` | String | - | Yes | - | Max 20 chars, Portuguese postal code format | Format: NNNN-NNN (e.g., "1000-001") |
| `country` | String | - | No | "Portugal" | Max 100 chars | Optional, defaults to "Portugal" |

**Example Payload:**
```json
{
  "street": "Rua Example, 123",
  "city": "Lisboa",
  "postal_code": "1000-001",
  "country": "Portugal"
}
```

---

### OpeningHoursDTO

**Purpose:**  
Weekly opening hours schedule for stores. Represents the operating schedule for each day of the week.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `monday` | DayScheduleDTO | - | Yes | - | Valid day schedule | Must have `open`, `close`, and `closed` fields |
| `tuesday` | DayScheduleDTO | - | Yes | - | Valid day schedule | Must have `open`, `close`, and `closed` fields |
| `wednesday` | DayScheduleDTO | - | Yes | - | Valid day schedule | Must have `open`, `close`, and `closed` fields |
| `thursday` | DayScheduleDTO | - | Yes | - | Valid day schedule | Must have `open`, `close`, and `closed` fields |
| `friday` | DayScheduleDTO | - | Yes | - | Valid day schedule | Must have `open`, `close`, and `closed` fields |
| `saturday` | DayScheduleDTO | - | Yes | - | Valid day schedule | Must have `open`, `close`, and `closed` fields |
| `sunday` | DayScheduleDTO | - | Yes | - | Valid day schedule | Must have `open`, `close`, and `closed` fields |

**DayScheduleDTO Structure:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `open` | String | HH:mm | Conditional | - | 24-hour format | Required if `closed` is false |
| `close` | String | HH:mm | Conditional | - | 24-hour format | Required if `closed` is false; must be after `open` |
| `closed` | Boolean | - | Yes | false | true/false | If true, `open` and `close` are ignored |

**Example Payload:**
```json
{
  "monday": {"open": "09:00", "close": "18:00", "closed": false},
  "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
  "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
  "thursday": {"open": "09:00", "close": "18:00", "closed": false},
  "friday": {"open": "09:00", "close": "18:00", "closed": false},
  "saturday": {"open": "09:00", "close": "13:00", "closed": false},
  "sunday": {"closed": true}
}
```

---

### WorkingHoursDTO

**Purpose:**  
Weekly working hours schedule for users (staff). Represents the availability schedule for each day of the week.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `monday` | UserDayScheduleDTO | - | Yes | - | Valid day schedule | Must have `start`, `end`, and `available` fields |
| `tuesday` | UserDayScheduleDTO | - | Yes | - | Valid day schedule | Must have `start`, `end`, and `available` fields |
| `wednesday` | UserDayScheduleDTO | - | Yes | - | Valid day schedule | Must have `start`, `end`, and `available` fields |
| `thursday` | UserDayScheduleDTO | - | Yes | - | Valid day schedule | Must have `start`, `end`, and `available` fields |
| `friday` | UserDayScheduleDTO | - | Yes | - | Valid day schedule | Must have `start`, `end`, and `available` fields |
| `saturday` | UserDayScheduleDTO | - | Yes | - | Valid day schedule | Must have `start`, `end`, and `available` fields |
| `sunday` | UserDayScheduleDTO | - | Yes | - | Valid day schedule | Must have `start`, `end`, and `available` fields |

**UserDayScheduleDTO Structure:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `start` | String | HH:mm | Conditional | - | 24-hour format | Required if `available` is true |
| `end` | String | HH:mm | Conditional | - | 24-hour format | Required if `available` is true; must be after `start` |
| `available` | Boolean | - | Yes | false | true/false | If false, `start` and `end` are ignored |

**Example Payload:**
```json
{
  "monday": {"start": "09:00", "end": "18:00", "available": true},
  "tuesday": {"start": "09:00", "end": "18:00", "available": true},
  "wednesday": {"start": "09:00", "end": "18:00", "available": true},
  "thursday": {"start": "09:00", "end": "18:00", "available": true},
  "friday": {"start": "09:00", "end": "18:00", "available": true},
  "saturday": {"available": false},
  "sunday": {"available": false}
}
```

---

### VaccinationDTO

**Purpose:**  
Vaccination record for pets. Represents a single vaccination entry.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `vaccine` | String | - | Yes | - | Max 255 chars, non-empty | Vaccine name |
| `date` | String | yyyy-MM-dd | Yes | - | Valid date, not future | Date when vaccine was administered |
| `expires` | String | yyyy-MM-dd | No | - | Valid date, after `date` | Expiration date of vaccine |
| `administered_by` | String | - | No | - | Max 255 chars | Name of veterinarian who administered |

**Example Payload:**
```json
{
  "vaccine": "Rabies",
  "date": "2024-01-15",
  "expires": "2025-01-15",
  "administered_by": "Dr. Silva"
}
```

---

### PaginationMetaDTO

**Purpose:**  
Pagination metadata for paginated responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `total` | Integer | - | Yes | - | >= 0 | Total number of matching records |
| `page` | Integer | - | Yes | - | >= 1 | Current page number |
| `per_page` | Integer | - | Yes | - | >= 1, <= 100 | Results per page |
| `total_pages` | Integer | - | Yes | - | >= 0 | Total number of pages |
| `has_next` | Boolean | - | Yes | - | true/false | Whether next page exists |
| `has_previous` | Boolean | - | Yes | - | true/false | Whether previous page exists |

**Example Payload:**
```json
{
  "total": 150,
  "page": 2,
  "per_page": 20,
  "total_pages": 8,
  "has_next": true,
  "has_previous": true
}
```

---

## Company DTOs

### CreateCompanyDTO

**Purpose:**  
Input DTO for creating a new company profile.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `name` | String | - | Yes | - | Max 255 chars, non-empty | Must not be whitespace-only |
| `nif` | String | - | Yes | - | 9 digits, Portuguese NIF format | Must pass Portuguese NIF validation algorithm, unique |
| `address` | AddressDTO | - | Yes | - | Valid address structure | Must contain street, city, postal_code |
| `tax_regime` | String | - | Yes | - | Max 64 chars, non-empty | Tax regime identifier (e.g., "Simplificado", "Normal") |
| `default_vat_rate` | Decimal | - | No | - | 0.00 to 100.00, precision 5.2 | VAT rate percentage (e.g., 23.00 for 23%) |
| `phone` | String | - | No | - | Max 32 chars, valid phone format | Portuguese phone format |
| `email` | String | - | No | - | Valid email format, max 255 chars | Standard email validation |
| `website` | String | - | No | - | Valid URL format, max 255 chars | Standard URL validation |

**Example Payload:**
```json
{
  "name": "Patacão Petshop",
  "nif": "123456789",
  "address": {
    "street": "Rua Example, 123",
    "city": "Lisboa",
    "postal_code": "1000-001",
    "country": "Portugal"
  },
  "tax_regime": "Simplificado",
  "default_vat_rate": 23.00,
  "phone": "+351 21 123 4567",
  "email": "contact@patacao.pt",
  "website": "https://www.patacao.pt"
}
```

---

### UpdateCompanyDTO

**Purpose:**  
Input DTO for updating an existing company profile. All fields are optional (partial update).

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `name` | String | - | No | - | Max 255 chars, non-empty | Must not be whitespace-only if provided |
| `nif` | String | - | No | - | 9 digits, Portuguese NIF format | Must pass Portuguese NIF validation algorithm, unique (immutable after creation) |
| `address` | AddressDTO | - | No | - | Valid address structure | Must contain street, city, postal_code if provided |
| `tax_regime` | String | - | No | - | Max 64 chars, non-empty | Tax regime identifier if provided |
| `default_vat_rate` | Decimal | - | No | - | 0.00 to 100.00, precision 5.2 | VAT rate percentage if provided |
| `phone` | String | - | No | - | Max 32 chars, valid phone format | Portuguese phone format if provided |
| `email` | String | - | No | - | Valid email format, max 255 chars | Standard email validation if provided |
| `website` | String | - | No | - | Valid URL format, max 255 chars | Standard URL validation if provided |

**Example Payload:**
```json
{
  "name": "Patacão Petshop Updated",
  "default_vat_rate": 23.00,
  "phone": "+351 21 987 6543"
}
```

---

### CompanyResponseDTO

**Purpose:**  
Output DTO for company profile responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `name` | String | - | Yes | - | Max 255 chars | Company name |
| `nif` | String | - | Yes | - | 9 digits | Portuguese NIF |
| `address` | AddressDTO | - | Yes | - | Valid address structure | Complete address object |
| `tax_regime` | String | - | Yes | - | Max 64 chars | Tax regime |
| `default_vat_rate` | Decimal | - | No | null | 0.00 to 100.00 | Default VAT rate (nullable) |
| `phone` | String | - | No | null | Max 32 chars | Phone number (nullable) |
| `email` | String | - | No | null | Max 255 chars | Email address (nullable) |
| `website` | String | - | No | null | Max 255 chars | Website URL (nullable) |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp (e.g., "2024-01-15T10:30:00Z") |
| `updated_at` | String | ISO 8601 | No | null | Valid datetime | Last update timestamp (nullable) |

**Example Payload:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Patacão Petshop",
  "nif": "123456789",
  "address": {
    "street": "Rua Example, 123",
    "city": "Lisboa",
    "postal_code": "1000-001",
    "country": "Portugal"
  },
  "tax_regime": "Simplificado",
  "default_vat_rate": 23.00,
  "phone": "+351 21 123 4567",
  "email": "contact@patacao.pt",
  "website": "https://www.patacao.pt",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:45:00Z"
}
```

---

## Store DTOs

### CreateStoreDTO

**Purpose:**  
Input DTO for creating a new store.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `company_id` | UUID | - | Yes | - | Valid UUID, must exist | Company identifier this store belongs to |
| `name` | String | - | Yes | - | Max 255 chars, non-empty | Store name/location identifier |
| `address` | AddressDTO | - | No | - | Valid address structure | Must contain street, city, postal_code if provided |
| `email` | String | - | No | - | Valid email format, max 255 chars | Standard email validation |
| `phone` | String | - | No | - | Max 32 chars, valid phone format | Portuguese phone format |
| `opening_hours` | OpeningHoursDTO | - | Yes | - | Valid weekly schedule | Must contain all 7 days of week |
| `timezone` | String | - | No | "Europe/Lisbon" | Valid IANA timezone | IANA timezone identifier (e.g., "Europe/Lisbon", "Europe/Porto") |

**Example Payload:**
```json
{
  "company_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Patacão Lisboa Centro",
  "address": {
    "street": "Avenida da Liberdade, 100",
    "city": "Lisboa",
    "postal_code": "1250-096",
    "country": "Portugal"
  },
  "email": "lisboa@patacao.pt",
  "phone": "+351 21 123 4567",
  "opening_hours": {
    "monday": {"open": "09:00", "close": "18:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
    "thursday": {"open": "09:00", "close": "18:00", "closed": false},
    "friday": {"open": "09:00", "close": "18:00", "closed": false},
    "saturday": {"open": "09:00", "close": "13:00", "closed": false},
    "sunday": {"closed": true}
  },
  "timezone": "Europe/Lisbon"
}
```

---

### UpdateStoreDTO

**Purpose:**  
Input DTO for updating an existing store. All fields are optional (partial update).

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `name` | String | - | No | - | Max 255 chars, non-empty | Must not be whitespace-only if provided |
| `address` | AddressDTO | - | No | - | Valid address structure | Must contain street, city, postal_code if provided |
| `email` | String | - | No | - | Valid email format, max 255 chars | Standard email validation if provided |
| `phone` | String | - | No | - | Max 32 chars, valid phone format | Portuguese phone format if provided |
| `opening_hours` | OpeningHoursDTO | - | No | - | Valid weekly schedule | Must contain all 7 days of week if provided |
| `timezone` | String | - | No | - | Valid IANA timezone | IANA timezone identifier if provided |

**Example Payload:**
```json
{
  "name": "Patacão Lisboa Centro Updated",
  "opening_hours": {
    "monday": {"open": "08:00", "close": "19:00", "closed": false},
    "tuesday": {"open": "08:00", "close": "19:00", "closed": false},
    "wednesday": {"open": "08:00", "close": "19:00", "closed": false},
    "thursday": {"open": "08:00", "close": "19:00", "closed": false},
    "friday": {"open": "08:00", "close": "19:00", "closed": false},
    "saturday": {"open": "09:00", "close": "13:00", "closed": false},
    "sunday": {"closed": true}
  }
}
```

---

### StoreResponseDTO

**Purpose:**  
Output DTO for store responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `company_id` | UUID | - | Yes | - | Valid UUID | Company identifier |
| `name` | String | - | Yes | - | Max 255 chars | Store name |
| `address` | AddressDTO | - | No | null | Valid address structure | Complete address object (nullable) |
| `email` | String | - | No | null | Max 255 chars | Email address (nullable) |
| `phone` | String | - | No | null | Max 32 chars | Phone number (nullable) |
| `opening_hours` | OpeningHoursDTO | - | Yes | - | Valid weekly schedule | Complete opening hours schedule |
| `timezone` | String | - | Yes | - | Valid IANA timezone | Timezone identifier |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |
| `updated_at` | String | ISO 8601 | No | null | Valid datetime | Last update timestamp (nullable) |

**Example Payload:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "company_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Patacão Lisboa Centro",
  "address": {
    "street": "Avenida da Liberdade, 100",
    "city": "Lisboa",
    "postal_code": "1250-096",
    "country": "Portugal"
  },
  "email": "lisboa@patacao.pt",
  "phone": "+351 21 123 4567",
  "opening_hours": {
    "monday": {"open": "09:00", "close": "18:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
    "thursday": {"open": "09:00", "close": "18:00", "closed": false},
    "friday": {"open": "09:00", "close": "18:00", "closed": false},
    "saturday": {"open": "09:00", "close": "13:00", "closed": false},
    "sunday": {"closed": true}
  },
  "timezone": "Europe/Lisbon",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:45:00Z"
}
```

---

## Customer DTOs

### CreateCustomerDTO

**Purpose:**  
Input DTO for creating a new customer.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `full_name` | String | - | Yes | - | Max 255 chars, non-empty | Must not be whitespace-only |
| `email` | String | - | No | - | Valid email format, max 255 chars | Standard email validation |
| `phone` | String | - | No | - | Max 32 chars, valid phone format | Portuguese phone format |
| `address` | AddressDTO | - | No | - | Valid address structure | Must contain street, city, postal_code if provided |
| `consent_marketing` | Boolean | - | No | false | true/false | Consent for marketing communications (opt-out default) |
| `consent_reminders` | Boolean | - | No | true | true/false | Consent for appointment reminders (opt-in default) |

**Example Payload:**
```json
{
  "full_name": "João Silva",
  "email": "joao.silva@example.com",
  "phone": "+351 912 345 678",
  "address": {
    "street": "Rua das Flores, 45",
    "city": "Porto",
    "postal_code": "4000-123",
    "country": "Portugal"
  },
  "consent_marketing": false,
  "consent_reminders": true
}
```

---

### UpdateCustomerDTO

**Purpose:**  
Input DTO for updating an existing customer. All fields are optional (partial update).

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `full_name` | String | - | No | - | Max 255 chars, non-empty | Must not be whitespace-only if provided |
| `email` | String | - | No | - | Valid email format, max 255 chars | Standard email validation if provided |
| `phone` | String | - | No | - | Max 32 chars, valid phone format | Portuguese phone format if provided |
| `address` | AddressDTO | - | No | - | Valid address structure | Must contain street, city, postal_code if provided |
| `consent_marketing` | Boolean | - | No | - | true/false | Consent for marketing communications if provided |
| `consent_reminders` | Boolean | - | No | - | true/false | Consent for appointment reminders if provided |

**Example Payload:**
```json
{
  "full_name": "João Silva Santos",
  "phone": "+351 912 999 888",
  "consent_marketing": true
}
```

---

### CustomerResponseDTO

**Purpose:**  
Output DTO for customer responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `full_name` | String | - | Yes | - | Max 255 chars | Customer's full name |
| `email` | String | - | No | null | Max 255 chars | Email address (nullable) |
| `phone` | String | - | No | null | Max 32 chars | Phone number (nullable) |
| `address` | AddressDTO | - | No | null | Valid address structure | Complete address object (nullable) |
| `consent_marketing` | Boolean | - | Yes | false | true/false | Marketing consent flag |
| `consent_reminders` | Boolean | - | Yes | true | true/false | Reminders consent flag |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |
| `updated_at` | String | ISO 8601 | No | null | Valid datetime | Last update timestamp (nullable) |

**Example Payload:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "full_name": "João Silva",
  "email": "joao.silva@example.com",
  "phone": "+351 912 345 678",
  "address": {
    "street": "Rua das Flores, 45",
    "city": "Porto",
    "postal_code": "4000-123",
    "country": "Portugal"
  },
  "consent_marketing": false,
  "consent_reminders": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:45:00Z"
}
```

---

### SearchCustomersDTO

**Purpose:**  
Input DTO for searching customers with filters and pagination.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `q` | String | - | No | - | Max 255 chars | General search query (searches name, email, phone) |
| `email` | String | - | No | - | Valid email format | Filter by exact email match |
| `phone` | String | - | No | - | Max 32 chars | Filter by phone number (partial or exact) |
| `full_name` | String | - | No | - | Max 255 chars | Filter by name (partial match) |
| `consent_marketing` | Boolean | - | No | - | true/false | Filter by marketing consent |
| `consent_reminders` | Boolean | - | No | - | true/false | Filter by reminders consent |
| `archived` | Boolean | - | No | false | true/false | Include/exclude archived customers |
| `page` | Integer | - | No | 1 | Min 1 | Page number for pagination |
| `per_page` | Integer | - | No | 20 | Min 1, max 100 | Number of results per page |
| `sort` | String | - | No | "-created_at" | Valid sort field | Sort field and direction ("-" prefix for descending) |

**Example Payload:**
```json
{
  "q": "João",
  "consent_reminders": true,
  "page": 1,
  "per_page": 20,
  "sort": "-created_at"
}
```

---

### PaginatedCustomersResponseDTO

**Purpose:**  
Output DTO for paginated customer search results.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `items` | Array[CustomerResponseDTO] | - | Yes | - | Array of customer objects | Matching customers |
| `meta` | PaginationMetaDTO | - | Yes | - | Valid pagination metadata | Pagination information |

**Example Payload:**
```json
{
  "items": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "full_name": "João Silva",
      "email": "joao.silva@example.com",
      "phone": "+351 912 345 678",
      "address": {
        "street": "Rua das Flores, 45",
        "city": "Porto",
        "postal_code": "4000-123",
        "country": "Portugal"
      },
      "consent_marketing": false,
      "consent_reminders": true,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:45:00Z"
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

### ArchiveCustomerDTO

**Purpose:**  
Input DTO for archiving a customer.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `reason` | String | - | No | - | Max 500 chars | Reason for archiving (optional) |

**Example Payload:**
```json
{
  "reason": "Customer requested account closure"
}
```

---

## Pet DTOs

### CreatePetDTO

**Purpose:**  
Input DTO for creating a new pet.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `customer_id` | UUID | - | Yes | - | Valid UUID, must exist | Customer identifier (owner of pet) |
| `name` | String | - | Yes | - | Max 255 chars, non-empty | Pet's name |
| `species` | String | - | Yes | - | Max 64 chars, non-empty | Species (e.g., "dog", "cat", "bird") |
| `breed` | String | - | No | - | Max 128 chars | Breed name |
| `date_of_birth` | String | yyyy-MM-dd | No | - | Valid date, not future | Date of birth |
| `microchip_id` | String | - | No | - | Valid microchip format, max 64 chars | Microchip identification number |
| `medical_notes` | String | - | No | - | Max 5000 chars | Medical notes and history |
| `vaccination` | Array[VaccinationDTO] | - | No | - | Valid vaccination array | Array of vaccination records |

**Example Payload:**
```json
{
  "customer_id": "770e8400-e29b-41d4-a716-446655440000",
  "name": "Max",
  "species": "dog",
  "breed": "Golden Retriever",
  "date_of_birth": "2020-05-15",
  "microchip_id": "PT123456789012",
  "medical_notes": "Allergic to certain foods. Regular checkups required.",
  "vaccination": [
    {
      "vaccine": "Rabies",
      "date": "2024-01-15",
      "expires": "2025-01-15",
      "administered_by": "Dr. Silva"
    }
  ]
}
```

---

### UpdatePetDTO

**Purpose:**  
Input DTO for updating an existing pet. All fields are optional (partial update).

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `name` | String | - | No | - | Max 255 chars, non-empty | Must not be whitespace-only if provided |
| `species` | String | - | No | - | Max 64 chars, non-empty | Species if provided |
| `breed` | String | - | No | - | Max 128 chars | Breed name if provided |
| `date_of_birth` | String | yyyy-MM-dd | No | - | Valid date, not future | Date of birth if provided |
| `microchip_id` | String | - | No | - | Valid microchip format, max 64 chars | Microchip ID if provided |
| `medical_notes` | String | - | No | - | Max 5000 chars | Medical notes if provided |
| `vaccination` | Array[VaccinationDTO] | - | No | - | Valid vaccination array | Array of vaccination records if provided |

**Example Payload:**
```json
{
  "breed": "Golden Retriever Mix",
  "medical_notes": "Updated medical notes. Allergic to certain foods. Regular checkups required.",
  "vaccination": [
    {
      "vaccine": "Rabies",
      "date": "2024-01-15",
      "expires": "2025-01-15",
      "administered_by": "Dr. Silva"
    },
    {
      "vaccine": "DHPP",
      "date": "2024-02-01",
      "expires": "2025-02-01",
      "administered_by": "Dr. Silva"
    }
  ]
}
```

---

### PetResponseDTO

**Purpose:**  
Output DTO for pet responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `customer_id` | UUID | - | Yes | - | Valid UUID | Customer identifier (owner) |
| `name` | String | - | Yes | - | Max 255 chars | Pet's name |
| `species` | String | - | Yes | - | Max 64 chars | Species |
| `breed` | String | - | No | null | Max 128 chars | Breed (nullable) |
| `date_of_birth` | String | yyyy-MM-dd | No | null | Valid date | Date of birth (nullable) |
| `age` | Integer | - | No | null | >= 0 | Calculated age in years (nullable if date_of_birth not provided) |
| `microchip_id` | String | - | No | null | Max 64 chars | Microchip ID (nullable) |
| `medical_notes` | String | - | No | null | Max 5000 chars | Medical notes (nullable) |
| `vaccination` | Array[VaccinationDTO] | - | No | null | Valid vaccination array | Vaccination records (nullable) |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |
| `updated_at` | String | ISO 8601 | No | null | Valid datetime | Last update timestamp (nullable) |

**Example Payload:**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440000",
  "customer_id": "770e8400-e29b-41d4-a716-446655440000",
  "name": "Max",
  "species": "dog",
  "breed": "Golden Retriever",
  "date_of_birth": "2020-05-15",
  "age": 4,
  "microchip_id": "PT123456789012",
  "medical_notes": "Allergic to certain foods. Regular checkups required.",
  "vaccination": [
    {
      "vaccine": "Rabies",
      "date": "2024-01-15",
      "expires": "2025-01-15",
      "administered_by": "Dr. Silva"
    }
  ],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:45:00Z"
}
```

---

## User (Staff) DTOs

### CreateUserDTO

**Purpose:**  
Input DTO for creating a new user (staff member).

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `email` | String | - | Yes | - | Valid email format, unique, max 255 chars | User email address (used for login) |
| `full_name` | String | - | Yes | - | Max 255 chars, non-empty | User's full name |
| `phone` | String | - | No | - | Max 32 chars, valid phone format | Contact phone number |
| `username` | String | - | No | - | Unique, max 128 chars | Optional username (alternative to email login) |
| `roles` | Array[String] | - | Yes | - | Valid role IDs, min 1 role | Role IDs: "Owner", "Manager", "Staff", "Accountant", "Veterinarian" |
| `store_ids` | Array[UUID] | - | No | - | Must exist | Store IDs user is assigned to |
| `working_hours` | WorkingHoursDTO | - | No | - | Valid weekly schedule | Working hours schedule |
| `service_skills` | Array[UUID] | - | No | - | Must exist | Service IDs user is skilled in |
| `active` | Boolean | - | No | true | true/false | Active status |

**Example Payload:**
```json
{
  "email": "staff@patacao.pt",
  "full_name": "Maria Santos",
  "phone": "+351 912 345 678",
  "username": "maria.santos",
  "roles": ["Staff"],
  "store_ids": ["660e8400-e29b-41d4-a716-446655440000"],
  "working_hours": {
    "monday": {"start": "09:00", "end": "18:00", "available": true},
    "tuesday": {"start": "09:00", "end": "18:00", "available": true},
    "wednesday": {"start": "09:00", "end": "18:00", "available": true},
    "thursday": {"start": "09:00", "end": "18:00", "available": true},
    "friday": {"start": "09:00", "end": "18:00", "available": true},
    "saturday": {"available": false},
    "sunday": {"available": false}
  },
  "service_skills": ["990e8400-e29b-41d4-a716-446655440000"],
  "active": true
}
```

---

### UpdateUserDTO

**Purpose:**  
Input DTO for updating an existing user. All fields are optional (partial update).

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `full_name` | String | - | No | - | Max 255 chars, non-empty | Must not be whitespace-only if provided |
| `phone` | String | - | No | - | Max 32 chars, valid phone format | Portuguese phone format if provided |
| `roles` | Array[String] | - | No | - | Valid role IDs, min 1 role | Role IDs if provided (cannot be empty array) |
| `active` | Boolean | - | No | - | true/false | Active status if provided |
| `store_ids` | Array[UUID] | - | No | - | Must exist | Store IDs if provided |
| `working_hours` | WorkingHoursDTO | - | No | - | Valid weekly schedule | Working hours schedule if provided |
| `service_skills` | Array[UUID] | - | No | - | Must exist | Service IDs if provided |

**Note:** `email` and `username` are immutable and cannot be updated.

**Example Payload:**
```json
{
  "full_name": "Maria Santos Silva",
  "phone": "+351 912 999 888",
  "roles": ["Staff", "Veterinarian"],
  "active": true,
  "store_ids": ["660e8400-e29b-41d4-a716-446655440000", "661e8400-e29b-41d4-a716-446655440000"]
}
```

---

### UserResponseDTO

**Purpose:**  
Output DTO for user responses.

**Field List:**

| Field Name | Data Type | Format | Required | Default | Constraints | Validation Rules |
|------------|-----------|--------|----------|---------|-------------|------------------|
| `id` | UUID | - | Yes | - | Valid UUID | System-generated identifier |
| `email` | String | - | Yes | - | Max 255 chars | Email address |
| `full_name` | String | - | Yes | - | Max 255 chars | Full name |
| `phone` | String | - | No | null | Max 32 chars | Phone number (nullable) |
| `username` | String | - | No | null | Max 128 chars | Username (nullable) |
| `roles` | Array[String] | - | Yes | - | Array of role IDs | Assigned role IDs |
| `store_ids` | Array[UUID] | - | No | null | Array of UUIDs | Assigned store IDs (nullable) |
| `working_hours` | WorkingHoursDTO | - | No | null | Valid weekly schedule | Working hours schedule (nullable) |
| `service_skills` | Array[UUID] | - | No | null | Array of UUIDs | Service skill IDs (nullable) |
| `active` | Boolean | - | Yes | true | true/false | Active status |
| `created_at` | String | ISO 8601 | Yes | - | Valid datetime | Creation timestamp |
| `updated_at` | String | ISO 8601 | No | null | Valid datetime | Last update timestamp (nullable) |

**Note:** `password_hash` is never returned in responses for security.

**Example Payload:**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440000",
  "email": "staff@patacao.pt",
  "full_name": "Maria Santos",
  "phone": "+351 912 345 678",
  "username": "maria.santos",
  "roles": ["Staff"],
  "store_ids": ["660e8400-e29b-41d4-a716-446655440000"],
  "working_hours": {
    "monday": {"start": "09:00", "end": "18:00", "available": true},
    "tuesday": {"start": "09:00", "end": "18:00", "available": true},
    "wednesday": {"start": "09:00", "end": "18:00", "available": true},
    "thursday": {"start": "09:00", "end": "18:00", "available": true},
    "friday": {"start": "09:00", "end": "18:00", "available": true},
    "saturday": {"available": false},
    "sunday": {"available": false}
  },
  "service_skills": ["990e8400-e29b-41d4-a716-446655440000"],
  "active": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:45:00Z"
}
```

---

## Validation Notes

### Portuguese-Specific Validations

1. **NIF (Número de Identificação Fiscal):**
   - Format: 9 digits
   - Must pass Portuguese NIF checksum validation algorithm
   - Unique per company

2. **Postal Code:**
   - Format: NNNN-NNN (e.g., "1000-001")
   - Portuguese postal code format validation

3. **Phone Number:**
   - Portuguese phone format: +351 followed by 9 digits
   - May include spaces or dashes for readability
   - Examples: "+351 21 123 4567", "+351912345678"

4. **Timezone:**
   - Default: "Europe/Lisbon"
   - Must be valid IANA timezone identifier

### Common Validation Rules

1. **Email:**
   - Standard RFC 5322 email format validation
   - Case-insensitive
   - Max 255 characters

2. **URL:**
   - Standard URL format validation
   - Must include protocol (http:// or https://)
   - Max 255 characters

3. **Date Formats:**
   - Dates: `yyyy-MM-dd` (e.g., "2024-01-15")
   - DateTimes: ISO 8601 format (e.g., "2024-01-15T10:30:00Z")
   - Times: `HH:mm` 24-hour format (e.g., "09:00", "18:00")

4. **UUID:**
   - Standard UUID v4 format
   - Example: "550e8400-e29b-41d4-a716-446655440000"

5. **Decimal:**
   - Precision: 12 digits total, 2 decimal places
   - Range: 0.00 to 9999999999.99
   - VAT rates: 0.00 to 100.00 with precision 5.2

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

