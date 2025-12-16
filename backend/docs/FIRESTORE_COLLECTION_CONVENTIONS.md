# Firestore Collection Naming Conventions

## Overview

This document defines the naming conventions and best practices for Firestore collections, documents, and fields in the Patacão Petshop Management System.

## Collection Names

### Rules

1. **Use lowercase with underscores (snake_case)**
   - ✅ Good: `stock_movements`, `invoice_number_counters`, `appointment_service_lines`
   - ❌ Bad: `StockMovements`, `invoiceNumberCounters`, `appointment-service-lines`

2. **Use plural nouns**
   - ✅ Good: `companies`, `users`, `products`
   - ❌ Bad: `company`, `user`, `product`

3. **Be descriptive but concise**
   - ✅ Good: `inventory_reservations`, `password_reset_tokens`
   - ❌ Bad: `inv_res`, `pwd_tokens`, `reservations_for_inventory_items`

4. **Avoid abbreviations unless widely understood**
   - ✅ Good: `purchase_orders`, `credit_notes`
   - ❌ Bad: `po`, `cn`

### Collection List

- `companies`
- `stores`
- `users`
- `sessions`
- `password_reset_tokens`
- `customers`
- `pets`
- `services`
- `appointments`
- `appointment_service_lines`
- `products`
- `product_stock`
- `stock_movements`
- `stock_batches`
- `inventory_reservations`
- `suppliers`
- `purchase_orders`
- `invoices`
- `invoice_number_counters`
- `transactions`
- `credit_notes`
- `financial_exports`
- `audit_logs`

## Document IDs

### Rules

1. **Use UUIDs (v4) for most entities**
   - Format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
   - Generated client-side or server-side
   - Examples: `550e8400-e29b-41d4-a716-446655440000`

2. **Use composite keys for special cases**
   - Format: `${entityId}_${identifier}`
   - Examples:
     - `product_stock`: `${productId}_${locationId}` or `${productId}_default`
     - `stock_batches`: `${productId}_${batchNumber}`
     - `invoice_number_counters`: `${companyId}_${year}`

3. **Never use auto-incrementing IDs**
   - ❌ Bad: `1`, `2`, `3`, etc.
   - Firestore doesn't support auto-increment, and it's not scalable

4. **Never use sequential IDs based on timestamps**
   - ❌ Bad: `20240101120000`, `20240101120001`
   - Can cause hot-spotting in Firestore

## Field Names

### Rules

1. **Use camelCase (TypeScript convention)**
   - ✅ Good: `createdAt`, `invoiceNumber`, `productId`
   - ❌ Bad: `created_at`, `invoice_number`, `product_id`

2. **Use descriptive names**
   - ✅ Good: `expiresAt`, `lockoutExpiry`, `failedLoginAttempts`
   - ❌ Bad: `exp`, `lock`, `attempts`

3. **Use consistent naming patterns**
   - Timestamps: `createdAt`, `updatedAt`, `issuedAt`, `paidAt`
   - Foreign keys: `{entity}Id` (e.g., `companyId`, `storeId`, `userId`)
   - Status fields: `status`, `active`, `archived`, `revoked`
   - Boolean flags: `isActive`, `isArchived`, `consentMarketing`

4. **Use arrays for multi-value relationships**
   - ✅ Good: `roleIds: string[]`, `storeIds: string[]`, `tags: string[]`
   - ❌ Bad: Creating separate documents for each relationship

## Nested Objects

### Rules

1. **Use nested objects for structured data**
   - Address: `{ street, city, postalCode, country }`
   - Opening hours: `{ monday: { open, close, closed }, ... }`
   - Line items: `{ productId, quantity, unitPrice, vatRate }`

2. **Keep nesting shallow (max 2-3 levels)**
   - ✅ Good: `address.city`, `openingHours.monday.open`
   - ❌ Bad: `data.user.profile.address.city.street.number`

3. **Use consistent structure across collections**
   - All addresses use the same structure
   - All timestamps use Firestore `Timestamp` type

## Data Types

### Rules

1. **Use Firestore native types**
   - `string`: Text data
   - `number`: Numeric data (integers and decimals)
   - `boolean`: True/false values
   - `Timestamp`: Date and time
   - `array`: Lists of values
   - `map` (object): Nested structures
   - `null`: Missing/optional values

2. **Never store dates as strings**
   - ✅ Good: `createdAt: Timestamp`
   - ❌ Bad: `createdAt: "2024-01-01T12:00:00Z"`

3. **Store decimals as numbers**
   - Firestore doesn't have a decimal type
   - Handle precision in application code
   - Example: Store `12.50` as `12.5` (number)

4. **Use arrays for multi-value fields**
   - ✅ Good: `roleIds: ["Owner", "Manager"]`
   - ❌ Bad: `roleIds: "Owner,Manager"` (comma-separated string)

## Indexes

### Rules

1. **Single-field indexes are automatic**
   - Firestore automatically creates indexes for single fields
   - No need to define them explicitly

2. **Composite indexes must be defined**
   - Required for queries with multiple `where()` clauses
   - Required for queries with `where()` + `orderBy()` on different fields
   - Defined in `firestore.indexes.json`

3. **Index naming**
   - Firestore auto-generates index names
   - Format: `{collection}_{field1}_{order1}_{field2}_{order2}_...`

## Subcollections

### Rules

1. **Avoid subcollections**
   - Use flat collections with foreign key references instead
   - Easier to query and maintain
   - Better for our use case

2. **Exception: Only use subcollections if data is truly hierarchical**
   - Example: `companies/{companyId}/stores/{storeId}` (if stores are never queried independently)
   - We use flat collections: `stores` with `companyId` field

## Examples

### Good Collection Structure

```typescript
// Collection: companies
// Document ID: UUID
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Patacão Petshop",
  nif: "123456789",
  address: {
    street: "Rua Example 123",
    city: "Lisboa",
    postalCode: "1000-001",
    country: "Portugal"
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Good Composite Key

```typescript
// Collection: product_stock
// Document ID: composite key
{
  id: "product-123_default",  // ${productId}_${locationId}
  productId: "product-123",
  locationId: "default",
  onHand: 100,
  updatedAt: Timestamp
}
```

### Good Array Usage

```typescript
// Collection: users
{
  id: "user-123",
  email: "user@example.com",
  roleIds: ["Owner", "Manager"],  // Array, not comma-separated string
  storeIds: ["store-1", "store-2"],
  createdAt: Timestamp
}
```

## Migration Guidelines

When adding new collections or fields:

1. **Update schema documentation** (`FIRESTORE_SCHEMA.md`)
2. **Add indexes** if needed (`firestore.indexes.json`)
3. **Update security rules** (`firestore.rules`)
4. **Update repository implementations** if needed
5. **Create migration script** if data transformation is required

## Best Practices

1. **Keep collections flat** - Avoid deep nesting
2. **Use foreign keys** - Reference other documents by ID
3. **Denormalize carefully** - Only when it improves query performance
4. **Index strategically** - Only create indexes for queries you actually use
5. **Use soft deletes** - Set `archived: true` instead of deleting
6. **Make audit logs immutable** - Never update or delete audit logs
7. **Use transactions** - For operations that must be atomic
8. **Batch writes** - Group multiple writes together when possible

