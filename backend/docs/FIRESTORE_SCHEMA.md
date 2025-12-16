# Firestore Schema Documentation

## Overview

This document describes the Firestore database schema for the Patacão Petshop Management System. It includes collection structures, field definitions, relationships, and indexing requirements.

## Collection Naming Conventions

- **Collections**: Use lowercase with underscores (snake_case)
  - Examples: `companies`, `stock_movements`, `invoice_number_counters`
- **Document IDs**: Use UUIDs (v4) for all entities
- **Subcollections**: Avoid subcollections; use flat collections with foreign key references
- **Field Names**: Use camelCase in documents (TypeScript convention)

## Collections

### 1. `companies`

**Description**: Company profile information (business entity)

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  name: string;                  // Company name
  nif: string;                   // Portuguese fiscal number (NIF)
  address: {
    street: string;
    city: string;
    postalCode: string;
    country?: string;
  };
  taxRegime: string;             // Tax regime identifier
  defaultVatRate?: number;       // Default VAT rate (0-100)
  phone?: string;
  email?: string;
  website?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- Single field: `nif` (for uniqueness checks)

**Queries**:
- Find by NIF: `where('nif', '==', nif)`

---

### 2. `stores`

**Description**: Store locations belonging to a company

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  companyId: string;             // FK -> companies.id
  name: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country?: string;
  };
  email?: string;
  phone?: string;
  openingHours: {
    // Weekly schedule structure
    monday?: { open: string; close: string; closed?: boolean };
    tuesday?: { open: string; close: string; closed?: boolean };
    wednesday?: { open: string; close: string; closed?: boolean };
    thursday?: { open: string; close: string; closed?: boolean };
    friday?: { open: string; close: string; closed?: boolean };
    saturday?: { open: string; close: string; closed?: boolean };
    sunday?: { open: string; close: string; closed?: boolean };
  };
  timezone: string;              // Default: 'Europe/Lisbon'
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- Single field: `companyId` (for listing stores by company)

**Queries**:
- Find by company: `where('companyId', '==', companyId)`

---

### 3. `users`

**Description**: System users (staff, managers, accountants, veterinarians)

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  email: string;                 // Unique, lowercase
  fullName: string;
  phone?: string;
  username?: string;             // Unique
  passwordHash?: string;         // bcrypt hash
  roleIds: string[];             // Array of role IDs
  storeIds: string[];            // Array of store IDs (assignments)
  workingHours?: {
    // Weekly schedule structure (same as stores)
    monday?: { start: string; end: string; closed?: boolean };
    // ... other days
  };
  serviceSkills?: string[];      // Array of service IDs
  active: boolean;               // Default: true
  lastLogin?: Timestamp;
  failedLoginAttempts?: number;  // Default: 0
  lockoutExpiry?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- Single field: `email` (for login)
- Single field: `username` (for login)
- Single field: `active` (for filtering active users)
- Composite: `active + email` (for search queries)

**Queries**:
- Find by email: `where('email', '==', email)`
- Find by username: `where('username', '==', username)`
- Search: `where('active', '==', true).where('email', '>=', query).where('email', '<=', query + '\uf8ff')`

---

### 4. `sessions`

**Description**: User authentication sessions

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  userId: string;                // FK -> users.id
  refreshToken?: string;         // Stored separately (not in domain entity)
  createdAt: Timestamp;
  expiresAt?: Timestamp;
  revoked: boolean;              // Default: false
  revokedAt?: Timestamp;
}
```

**Indexes**:
- Single field: `userId` (for listing user sessions)
- Single field: `refreshToken` (for token lookup)
- Single field: `revoked` (for filtering active sessions)
- Composite: `userId + revoked` (for finding active sessions by user)

**Queries**:
- Find by refresh token: `where('refreshToken', '==', token)`
- Find active sessions by user: `where('userId', '==', userId).where('revoked', '==', false)`

---

### 5. `password_reset_tokens`

**Description**: Password reset tokens (temporary, time-limited)

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  userId: string;                // FK -> users.id
  tokenHash: string;             // Hashed token
  expiresAt: Timestamp;
  used: boolean;                 // Default: false
  usedAt?: Timestamp;
  createdAt: Timestamp;
}
```

**Indexes**:
- Single field: `tokenHash` (for token lookup)
- Single field: `userId` (for invalidating existing tokens)
- Single field: `expiresAt` (for cleanup queries)

**Queries**:
- Find by token hash: `where('tokenHash', '==', hash)`
- Find by user: `where('userId', '==', userId)`

---

### 6. `customers`

**Description**: Customer/client information (pet owners)

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  fullName: string;
  email?: string;                // Lowercase
  phone?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country?: string;
  };
  consentMarketing: boolean;     // Default: false
  consentReminders: boolean;     // Default: true
  archived: boolean;             // Default: false (soft delete)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- Single field: `email` (for lookup)
- Single field: `phone` (for lookup)
- Single field: `archived` (for filtering)
- Composite: `archived + email` (for search)
- Composite: `archived + fullName` (for search with ordering)

**Queries**:
- Find by email: `where('email', '==', email).where('archived', '==', false)`
- Find by phone: `where('phone', '==', phone).where('archived', '==', false)`
- Search: `where('archived', '==', false).where('fullName', '>=', query).where('fullName', '<=', query + '\uf8ff').orderBy('fullName')`

---

### 7. `pets`

**Description**: Pet information (linked to customers)

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  customerId: string;            // FK -> customers.id
  name: string;
  species: string;               // e.g., 'dog', 'cat'
  breed?: string;
  dateOfBirth?: Timestamp;
  microchipId?: string;
  medicalNotes?: string;
  vaccinations: Array<{
    vaccine: string;
    date: Timestamp;
    veterinarian?: string;
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- Single field: `customerId` (for listing pets by customer)
- Single field: `microchipId` (for lookup)

**Queries**:
- Find by customer: `where('customerId', '==', customerId)`
- Find by microchip: `where('microchipId', '==', microchipId)`
- Count by customer: `where('customerId', '==', customerId).count()`

---

### 8. `services`

**Description**: Service catalog (grooming, veterinary, etc.)

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;                 // Decimal (12,2)
  consumesInventory: boolean;    // Default: false
  consumedItems?: Array<{
    productId: string;
    quantity: number;
  }>;
  tags?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- Single field: `name` (for search)

**Queries**:
- Search by name: `where('name', '>=', query).where('name', '<=', query + '\uf8ff')`

---

### 9. `appointments`

**Description**: Service appointments/bookings

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  storeId: string;               // FK -> stores.id
  customerId: string;            // FK -> customers.id
  petId?: string;                // FK -> pets.id (optional)
  assignedStaffId?: string;      // FK -> users.id
  startAt: Timestamp;
  endAt: Timestamp;
  status: string;                // 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'
  notes?: string;
  cancelledAt?: Timestamp;
  cancelledBy?: string;          // FK -> users.id
  cancellationReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- Single field: `storeId` (for listing by store)
- Single field: `customerId` (for listing by customer)
- Single field: `status` (for filtering)
- Single field: `startAt` (for date range queries)
- Composite: `storeId + status + startAt` (for conflict detection)
- Composite: `customerId + status + startAt` (for customer appointments)
- Composite: `storeId + startAt + endAt` (for conflict detection)

**Queries**:
- Find conflicts: `where('storeId', '==', storeId).where('status', '!=', 'cancelled').where('startAt', '>=', start).where('startAt', '<=', end)`
- Search: `where('storeId', '==', storeId).where('status', '==', status).where('startAt', '>=', start).orderBy('startAt')`

---

### 10. `appointment_service_lines`

**Description**: Services included in an appointment (many-to-many relationship)

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  appointmentId: string;         // FK -> appointments.id
  serviceId: string;             // FK -> services.id
  quantity: number;              // Default: 1
  price: number;                 // Snapshot price at time of booking
  createdAt: Timestamp;
}
```

**Indexes**:
- Single field: `appointmentId` (for listing services in appointment)

**Queries**:
- Find by appointment: `where('appointmentId', '==', appointmentId)`

---

### 11. `products`

**Description**: Product catalog (inventory items)

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  sku: string;                   // Unique stock keeping unit
  name: string;
  description?: string;
  category?: string;
  unitPrice: number;             // Decimal (12,2)
  vatRate: number;               // 0-100
  trackInventory: boolean;       // Default: true
  lowStockThreshold?: number;
  supplierId?: string;           // FK -> suppliers.id
  tags?: string[];
  active: boolean;               // Default: true
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- Single field: `sku` (for uniqueness checks)
- Single field: `active` (for filtering)
- Single field: `category` (for filtering)
- Composite: `active + name` (for search)
- Composite: `active + sku` (for search)

**Queries**:
- Find by SKU: `where('sku', '==', sku)`
- Search: `where('active', '==', true).where('name', '>=', query).where('name', '<=', query + '\uf8ff')`

---

### 12. `product_stock`

**Description**: Current stock levels per product (and optionally per location)

**Document Structure**:
```typescript
{
  id: string;                    // Composite key: `${productId}_${locationId}` or `${productId}_default`
  productId: string;             // FK -> products.id
  locationId?: string;           // FK -> stores.id (optional, for multi-location)
  onHand: number;                // Current stock quantity
  reserved: number;              // Reserved quantity (default: 0)
  available: number;             // Computed: onHand - reserved
  updatedAt: Timestamp;
}
```

**Indexes**:
- Single field: `productId` (for aggregating stock across locations)

**Queries**:
- Find by product: `where('productId', '==', productId)`

---

### 13. `stock_movements`

**Description**: Immutable audit log of all stock movements (receipts, adjustments, sales)

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  productId: string;             // FK -> products.id
  movementType: string;          // 'receipt', 'adjustment', 'sale', 'reservation', 'release'
  quantity: number;              // Positive for increases, negative for decreases
  batchNumber?: string;          // FK -> stock_batches.batchNumber
  locationId?: string;           // FK -> stores.id
  referenceId?: string;          // Reference to related entity (transaction, purchase order, etc.)
  referenceType?: string;        // 'transaction', 'purchase_order', 'adjustment', etc.
  notes?: string;
  createdBy: string;             // FK -> users.id
  createdAt: Timestamp;
}
```

**Indexes**:
- Single field: `productId` (for product history)
- Single field: `movementType` (for filtering)
- Single field: `createdAt` (for date range queries)
- Composite: `productId + createdAt` (for product history with ordering)
- Composite: `productId + movementType + createdAt` (for filtered history)

**Queries**:
- Search: `where('productId', '==', productId).where('createdAt', '>=', start).where('createdAt', '<=', end).orderBy('createdAt', 'desc')`

---

### 14. `stock_batches`

**Description**: Batch/lot tracking for inventory (expiry dates, batch numbers)

**Document Structure**:
```typescript
{
  id: string;                    // Composite key: `${productId}_${batchNumber}`
  productId: string;             // FK -> products.id
  batchNumber: string;
  quantity: number;              // Current quantity in this batch
  expiryDate?: Timestamp;
  receivedAt: Timestamp;
  supplierId?: string;           // FK -> suppliers.id
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- Single field: `productId` (for listing batches by product)
- Composite: `productId + batchNumber` (for uniqueness checks)

**Queries**:
- Find by product and batch: `where('productId', '==', productId).where('batchNumber', '==', batchNumber)`
- Find by product: `where('productId', '==', productId)`

---

### 15. `inventory_reservations`

**Description**: Temporary inventory reservations (for appointments, pending transactions)

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  productId: string;             // FK -> products.id
  quantity: number;
  reservedFor: string;           // Reference ID (appointment ID, transaction ID, etc.)
  reservedForType: string;       // 'appointment', 'transaction', etc.
  expiresAt: Timestamp;          // Reservation expiration
  status: string;                // 'active', 'fulfilled', 'expired', 'released'
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- Single field: `productId` (for listing reservations by product)
- Single field: `reservedFor` (for finding by appointment/transaction)
- Single field: `status` (for filtering)
- Single field: `expiresAt` (for cleanup queries)
- Composite: `productId + status` (for active reservations)
- Composite: `reservedFor + status` (for finding active reservations)

**Queries**:
- Find by product: `where('productId', '==', productId)`
- Find by appointment: `where('reservedFor', '==', appointmentId)`
- Find active by product: `where('productId', '==', productId).where('status', '==', 'active')`

---

### 16. `suppliers`

**Description**: Supplier/vendor information

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  name: string;
  nif?: string;                  // Portuguese fiscal number
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country?: string;
  };
  email?: string;
  phone?: string;
  contactPerson?: string;
  paymentTerms?: string;
  active: boolean;               // Default: true
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- Single field: `active` (for filtering)

**Queries**:
- List active suppliers: `where('active', '==', true)`

---

### 17. `purchase_orders`

**Description**: Purchase orders from suppliers

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  supplierId: string;            // FK -> suppliers.id
  orderNumber: string;           // Unique order number
  status: string;                // 'draft', 'sent', 'received', 'cancelled'
  orderDate: Timestamp;
  expectedDeliveryDate?: Timestamp;
  receivedDate?: Timestamp;
  lines: Array<{
    productId: string;           // FK -> products.id
    quantity: number;
    unitPrice: number;
    receivedQuantity?: number;
  }>;
  totalAmount: number;           // Decimal (12,2)
  notes?: string;
  createdBy: string;             // FK -> users.id
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- Single field: `supplierId` (for listing by supplier)
- Single field: `status` (for filtering)
- Single field: `orderDate` (for date range queries)

**Queries**:
- Find by supplier: `where('supplierId', '==', supplierId)`
- Find by status: `where('status', '==', status)`

---

### 18. `invoices`

**Description**: Sales invoices (issued to customers)

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  companyId: string;             // FK -> companies.id
  storeId: string;               // FK -> stores.id
  invoiceNumber: string;         // Sequential, unique per company
  issuedAt?: Timestamp;          // Null for drafts
  buyerCustomerId?: string;      // FK -> customers.id (optional for walk-ins)
  lines: Array<{
    description: string;
    productId?: string;          // FK -> products.id
    serviceId?: string;          // FK -> services.id
    quantity: number;
    unitPrice: number;           // Decimal (12,2)
    vatRate: number;             // 0-100
  }>;
  subtotal: number;              // Decimal (12,2)
  vatTotal: number;              // Decimal (12,2)
  total: number;                 // Decimal (12,2)
  status: string;                // 'draft', 'issued', 'paid', 'void'
  paidAt?: Timestamp;
  paymentMethod?: string;        // 'cash', 'card', 'transfer', etc.
  externalReference?: string;
  createdBy: string;             // FK -> users.id
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- Single field: `companyId` (for listing by company)
- Single field: `storeId` (for listing by store)
- Single field: `invoiceNumber` (for uniqueness checks)
- Single field: `status` (for filtering)
- Single field: `issuedAt` (for date range queries)
- Composite: `companyId + invoiceNumber` (for uniqueness checks)
- Composite: `companyId + issuedAt` (for period queries)
- Composite: `companyId + status + issuedAt` (for filtered period queries)

**Queries**:
- Find by invoice number: `where('invoiceNumber', '==', number).where('companyId', '==', companyId)`
- Find by period: `where('companyId', '==', companyId).where('issuedAt', '>=', start).where('issuedAt', '<=', end)`

---

### 19. `invoice_number_counters`

**Description**: Sequential invoice number generation (per company/store)

**Document Structure**:
```typescript
{
  id: string;                    // Composite key: `${companyId}_${year}`
  companyId: string;             // FK -> companies.id
  year: number;                  // Year (e.g., 2024)
  lastNumber: number;            // Last used invoice number
  updatedAt: Timestamp;
}
```

**Indexes**:
- Composite: `companyId + year` (for uniqueness checks)

**Queries**:
- Find counter: `where('companyId', '==', companyId).where('year', '==', year)`

---

### 20. `transactions`

**Description**: Point-of-sale transactions (sales, payments)

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  invoiceId?: string;            // FK -> invoices.id (if linked to invoice)
  storeId: string;               // FK -> stores.id
  customerId?: string;           // FK -> customers.id (optional)
  transactionNumber: string;     // Unique transaction number
  status: string;                // 'pending', 'completed', 'cancelled'
  lines: Array<{
    productId?: string;          // FK -> products.id
    serviceId?: string;          // FK -> services.id
    description: string;
    quantity: number;
    unitPrice: number;           // Decimal (12,2)
    vatRate: number;             // 0-100
  }>;
  subtotal: number;              // Decimal (12,2)
  vatTotal: number;              // Decimal (12,2)
  total: number;                 // Decimal (12,2)
  paymentMethod: string;         // 'cash', 'card', 'transfer', etc.
  paymentStatus: string;         // 'pending', 'paid', 'refunded'
  completedAt?: Timestamp;
  createdBy: string;             // FK -> users.id
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- Single field: `invoiceId` (for finding by invoice)
- Single field: `storeId` (for listing by store)
- Single field: `status` (for filtering)
- Single field: `createdAt` (for date range queries)
- Composite: `storeId + createdAt` (for period queries)
- Composite: `storeId + status + createdAt` (for filtered period queries)

**Queries**:
- Find by invoice: `where('invoiceId', '==', invoiceId)`
- Find by period: `where('storeId', '==', storeId).where('createdAt', '>=', start).where('createdAt', '<=', end)`

---

### 21. `credit_notes`

**Description**: Credit notes (refunds, adjustments to invoices)

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  invoiceId: string;             // FK -> invoices.id
  creditNoteNumber: string;      // Unique credit note number
  amount: number;                // Decimal (12,2)
  reason: string;
  issuedAt: Timestamp;
  createdBy: string;             // FK -> users.id
  createdAt: Timestamp;
}
```

**Indexes**:
- Single field: `invoiceId` (for finding by invoice)
- Composite: `invoiceId + amount` (for aggregation queries)

**Queries**:
- Find by invoice: `where('invoiceId', '==', invoiceId)`
- Find by multiple invoices: `where('invoiceId', 'in', [id1, id2, ...])` (batched)

---

### 22. `financial_exports`

**Description**: Financial data exports (for accounting systems)

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  exportType: string;            // 'invoice', 'transaction', 'credit_note'
  format: string;                // 'csv', 'xml', 'json'
  periodStart: Timestamp;
  periodEnd: Timestamp;
  status: string;                // 'pending', 'processing', 'completed', 'failed'
  filePath?: string;             // Storage path
  sftpHost?: string;             // SFTP server details
  sftpPath?: string;
  errorMessage?: string;
  createdBy: string;             // FK -> users.id
  createdAt: Timestamp;
  completedAt?: Timestamp;
}
```

**Indexes**:
- Single field: `status` (for filtering)
- Single field: `createdAt` (for listing)

**Queries**:
- List by status: `where('status', '==', status).orderBy('createdAt', 'desc')`

---

### 23. `audit_logs`

**Description**: Immutable audit log of all significant actions

**Document Structure**:
```typescript
{
  id: string;                    // UUID, document ID
  entityType: string;            // 'user', 'customer', 'invoice', etc.
  entityId: string;              // ID of the affected entity
  action: string;                // 'create', 'update', 'delete', 'login', etc.
  userId: string;                // FK -> users.id (who performed the action)
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: Record<string, any>; // Additional context
  ipAddress?: string;
  userAgent?: string;
  createdAt: Timestamp;
}
```

**Indexes**:
- Single field: `entityType` (for filtering by entity)
- Single field: `entityId` (for entity history)
- Single field: `userId` (for user activity)
- Single field: `action` (for filtering by action)
- Single field: `createdAt` (for date range queries)
- Composite: `entityType + entityId + createdAt` (for entity history)
- Composite: `userId + createdAt` (for user activity)
- Composite: `action + createdAt` (for action history)

**Queries**:
- Find by entity: `where('entityType', '==', type).where('entityId', '==', id).orderBy('createdAt', 'desc')`
- Find by user: `where('userId', '==', userId).orderBy('createdAt', 'desc')`

---

## Relationships Summary

- `companies` 1 → N `stores`
- `stores` 1 → N `appointments`
- `stores` 1 → N `transactions`
- `users` N → M `stores` (via `storeIds` array)
- `users` N → M `roles` (via `roleIds` array)
- `customers` 1 → N `pets`
- `customers` 1 → N `appointments`
- `customers` 1 → N `invoices`
- `pets` 1 → N `appointments`
- `appointments` 1 → N `appointment_service_lines`
- `appointment_service_lines` N → 1 `services`
- `products` 1 → N `stock_movements`
- `products` 1 → N `stock_batches`
- `products` 1 → N `inventory_reservations`
- `suppliers` 1 → N `purchase_orders`
- `invoices` 1 → N `credit_notes`
- `invoices` 1 → N `transactions`

---

## Data Types

- **UUID**: String (v4 UUID format)
- **Timestamp**: Firestore `Timestamp` type
- **Decimal**: Number (stored as number, precision handled in application)
- **Boolean**: Boolean
- **String**: String
- **Array**: Array
- **Object**: Object (nested document)

---

## Notes

1. **Soft Deletes**: Some entities use `archived` flag instead of hard deletes (e.g., `customers`)
2. **Immutable Logs**: `stock_movements` and `audit_logs` are append-only (never updated or deleted)
3. **Composite Keys**: Some collections use composite document IDs (e.g., `product_stock`, `stock_batches`, `invoice_number_counters`)
4. **Arrays**: Firestore arrays are used for multi-value fields (e.g., `roleIds`, `storeIds`, `tags`)
5. **Nested Objects**: Address and schedule structures are stored as nested objects
6. **Timestamps**: All timestamps use Firestore `Timestamp` type (not ISO strings)

