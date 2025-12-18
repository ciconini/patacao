# Data Migration & Seeding Documentation

## Overview

This document describes the data migration and seeding processes for the Patacão Petshop Management System. It covers development seeding, production migrations, and best practices.

## Table of Contents

1. [Database Seeding](#database-seeding)
2. [Database Migrations](#database-migrations)
3. [Migration Best Practices](#migration-best-practices)
4. [Common Scenarios](#common-scenarios)
5. [Troubleshooting](#troubleshooting)

---

## Database Seeding

### Purpose

Seeding populates the database with initial data for development and testing. This includes:
- Default system roles
- Sample company and store
- Sample users (for testing different roles)
- Sample customers, pets, products, and services (optional)

### Usage

#### Seed Roles Only

```bash
npm run seed:roles
```

Creates only the default system roles (Owner, Manager, Staff, Accountant, Veterinarian).

#### Seed Basic Data

```bash
npm run seed:dev
```

Creates:
- Default roles
- Sample company and store
- Sample users (owner, manager, staff, accountant, veterinarian)

#### Seed Full Sample Data

```bash
npm run seed:dev:full
```

Creates everything above plus:
- Sample customers and pets
- Sample products
- Sample services

### Default Credentials

After seeding, the following test users are created:

| Email | Password | Role |
|-------|----------|------|
| owner@patacao.pt | password123 | Owner |
| manager@patacao.pt | password123 | Manager |
| staff@patacao.pt | password123 | Staff |
| accountant@patacao.pt | password123 | Accountant |
| vet@patacao.pt | password123 | Veterinarian |

**⚠️ Important**: Change these passwords immediately in production environments!

### Seed Script Location

The seed script is located at: `src/cli/seed-database.ts`

### Customizing Seed Data

To customize seed data, edit `src/cli/seed-database.ts`:

```typescript
// Modify sample data in seed functions:
// - seedCompanyAndStore()
// - seedUsers()
// - seedCustomersAndPets()
// - seedProducts()
// - seedServices()
```

---

## Database Migrations

### Purpose

Migrations manage schema changes and data transformations in a versioned, trackable way. They ensure:
- Consistent database state across environments
- Ability to rollback changes
- Audit trail of schema changes

### Migration System

The migration system:
- Tracks applied migrations in `_migrations` collection
- Supports versioned migrations (numbered files)
- Allows rollback for migrations that support it
- Prevents duplicate execution

### Creating a Migration

1. **Create migration file** in `migrations/` directory:

```typescript
// migrations/002_add_field_to_users.ts

import * as admin from 'firebase-admin';

const db = admin.firestore();

export async function up(): Promise<void> {
  console.log('  Adding new field to users...');
  
  const usersSnapshot = await db.collection('users').get();
  const batch = db.batch();
  let count = 0;
  
  usersSnapshot.docs.forEach(doc => {
    const userData = doc.data();
    
    // Only update if field doesn't exist
    if (!userData.newField) {
      batch.update(doc.ref, {
        newField: 'default-value',
        updatedAt: admin.firestore.Timestamp.now(),
      });
      count++;
    }
  });
  
  await batch.commit();
  console.log(`  ✅ Updated ${count} users`);
}

export async function down(): Promise<void> {
  console.log('  Removing new field from users...');
  
  const usersSnapshot = await db.collection('users').get();
  const batch = db.batch();
  let count = 0;
  
  usersSnapshot.docs.forEach(doc => {
    const userData = doc.data();
    
    if (userData.newField) {
      const updates: any = {
        updatedAt: admin.firestore.Timestamp.now(),
      };
      updates.newField = admin.firestore.FieldValue.delete();
      
      batch.update(doc.ref, updates);
      count++;
    }
  });
  
  await batch.commit();
  console.log(`  ✅ Removed field from ${count} users`);
}
```

2. **Naming convention**: `{number}_{description}.ts`
   - Example: `001_initial_roles.ts`, `002_add_field_to_users.ts`
   - Numbers should be sequential

### Running Migrations

#### List All Migrations

```bash
npm run migrate -- --list
```

Shows all available migrations and their status (applied/pending).

#### Check Migration Status

```bash
npm run migrate -- --status
```

Shows summary of applied and pending migrations.

#### Run All Pending Migrations

```bash
npm run migrate
```

Runs all migrations that haven't been applied yet.

#### Run Specific Migration

```bash
npm run migrate -- --up 002_add_field_to_users
```

Runs a specific migration by name.

#### Rollback Migration

```bash
npm run migrate -- --down 002_add_field_to_users
```

Rolls back a specific migration (if it supports rollback).

### Migration File Structure

```typescript
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Migration: Description
 * 
 * Brief description of what this migration does.
 */

export async function up(): Promise<void> {
  // Migration logic here
  // - Create collections
  // - Add fields
  // - Transform data
  // - Update indexes
}

export async function down(): Promise<void> {
  // Rollback logic here (optional)
  // - Remove fields
  // - Revert transformations
  // - Delete collections (carefully!)
}
```

### Migration Tracking

Migrations are tracked in the `_migrations` collection:

```typescript
{
  name: '002_add_field_to_users',
  version: '002',
  appliedAt: Timestamp,
}
```

This prevents:
- Running the same migration twice
- Running migrations out of order
- Losing track of applied changes

---

## Migration Best Practices

### 1. Idempotent Migrations

Migrations should be safe to run multiple times:

```typescript
// ✅ Good: Check if field exists before adding
if (!doc.data().newField) {
  batch.update(doc.ref, { newField: 'value' });
}

// ❌ Bad: Always adds field (will fail on second run)
batch.update(doc.ref, { newField: 'value' });
```

### 2. Batch Operations

Use Firestore batches for bulk operations:

```typescript
// ✅ Good: Batch operations (up to 500 operations)
const batch = db.batch();
docs.forEach(doc => {
  batch.update(doc.ref, { field: 'value' });
});
await batch.commit();

// ❌ Bad: Individual writes (slow, expensive)
for (const doc of docs) {
  await doc.ref.update({ field: 'value' });
}
```

### 3. Handle Large Datasets

For large datasets, process in batches:

```typescript
export async function up(): Promise<void> {
  let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;
  let hasMore = true;
  
  while (hasMore) {
    let query = db.collection('users').limit(500);
    
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      hasMore = false;
      break;
    }
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { field: 'value' });
    });
    
    await batch.commit();
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    
    console.log(`  Processed ${snapshot.size} documents...`);
  }
}
```

### 4. Always Include Rollback

When possible, provide a `down()` function:

```typescript
export async function down(): Promise<void> {
  // Reverse the changes made in up()
  // This allows safe rollback if needed
}
```

### 5. Test Migrations

Test migrations in development before running in production:

1. Run on development database
2. Verify changes
3. Test rollback if applicable
4. Document any issues

### 6. Document Breaking Changes

If a migration introduces breaking changes:

```typescript
/**
 * Migration: Add Required Field
 * 
 * ⚠️ BREAKING CHANGE: Adds required field 'email' to users.
 * Existing users without email will have empty string.
 * Application code must handle this.
 */
```

### 7. Use Transactions for Critical Updates

For critical updates that must be atomic:

```typescript
export async function up(): Promise<void> {
  const userRef = db.collection('users').doc('user-id');
  
  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const userData = userDoc.data();
    
    // Validate before updating
    if (!userData) {
      throw new Error('User not found');
    }
    
    transaction.update(userRef, {
      field: 'value',
      updatedAt: admin.firestore.Timestamp.now(),
    });
  });
}
```

### 8. Preserve Data

Never delete data unless absolutely necessary:

```typescript
// ✅ Good: Archive instead of delete
batch.update(doc.ref, {
  archived: true,
  archivedAt: admin.firestore.Timestamp.now(),
});

// ❌ Bad: Hard delete (data loss)
batch.delete(doc.ref);
```

---

## Common Scenarios

### Scenario 1: Adding a New Field

```typescript
export async function up(): Promise<void> {
  const snapshot = await db.collection('users').get();
  const batch = db.batch();
  
  snapshot.docs.forEach(doc => {
    if (!doc.data().newField) {
      batch.update(doc.ref, {
        newField: 'default-value',
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }
  });
  
  await batch.commit();
}

export async function down(): Promise<void> {
  const snapshot = await db.collection('users').get();
  const batch = db.batch();
  
  snapshot.docs.forEach(doc => {
    if (doc.data().newField) {
      batch.update(doc.ref, {
        newField: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }
  });
  
  await batch.commit();
}
```

### Scenario 2: Renaming a Field

```typescript
export async function up(): Promise<void> {
  const snapshot = await db.collection('users').get();
  const batch = db.batch();
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.oldFieldName && !data.newFieldName) {
      batch.update(doc.ref, {
        newFieldName: data.oldFieldName,
        oldFieldName: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }
  });
  
  await batch.commit();
}

export async function down(): Promise<void> {
  const snapshot = await db.collection('users').get();
  const batch = db.batch();
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.newFieldName && !data.oldFieldName) {
      batch.update(doc.ref, {
        oldFieldName: data.newFieldName,
        newFieldName: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }
  });
  
  await batch.commit();
}
```

### Scenario 3: Data Transformation

```typescript
export async function up(): Promise<void> {
  const snapshot = await db.collection('products').get();
  const batch = db.batch();
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    
    // Transform old format to new format
    if (data.price && typeof data.price === 'string') {
      batch.update(doc.ref, {
        price: parseFloat(data.price),
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }
  });
  
  await batch.commit();
}
```

### Scenario 4: Creating Indexes

Note: Firestore indexes are typically managed via `firestore.indexes.json`, but you can document index requirements in migrations:

```typescript
export async function up(): Promise<void> {
  // Note: This migration requires a composite index
  // Add to firestore.indexes.json:
  // {
  //   "collectionGroup": "appointments",
  //   "queryScope": "COLLECTION",
  //   "fields": [
  //     { "fieldPath": "storeId", "order": "ASCENDING" },
  //     { "fieldPath": "status", "order": "ASCENDING" },
  //     { "fieldPath": "startAt", "order": "ASCENDING" }
  //   ]
  // }
  
  console.log('  ⚠️  Remember to deploy indexes: npm run firebase:deploy');
}
```

---

## Troubleshooting

### Migration Fails Mid-Execution

If a migration fails partway through:

1. **Check migration status**: `npm run migrate -- --status`
2. **Review error logs** to identify the issue
3. **Fix the migration** code
4. **Manually clean up** any partial changes if needed
5. **Re-run the migration** (it will skip already-applied parts if idempotent)

### Migration Already Applied But Needs Re-run

If you need to re-run a migration:

1. **Remove migration record**:
   ```typescript
   await db.collection('_migrations').doc('migration-name').delete();
   ```
2. **Re-run the migration**: `npm run migrate -- --up migration-name`

### Rollback Fails

If rollback fails:

1. **Check if `down()` function exists** and is correct
2. **Manually reverse changes** if needed
3. **Remove migration record** if rollback is not possible
4. **Document the issue** for future reference

### Large Dataset Performance

For large datasets:

1. **Process in smaller batches** (500 documents at a time)
2. **Run during off-peak hours**
3. **Monitor Firestore quotas** and limits
4. **Consider using Cloud Functions** for very large migrations

### Migration Conflicts

If multiple developers create migrations:

1. **Coordinate migration numbers** to avoid conflicts
2. **Use sequential numbering** (001, 002, 003...)
3. **Merge conflicts** should be resolved by renumbering if needed

---

## Environment-Specific Considerations

### Development

- Run seeds frequently to reset test data
- Test migrations before committing
- Use `--full` seed for comprehensive testing

### Staging

- Run migrations before deploying code
- Verify migrations complete successfully
- Test rollback procedures

### Production

- **Always backup** before running migrations
- Run migrations during maintenance windows
- Monitor migration execution
- Have rollback plan ready
- Test in staging first

---

## Related Documentation

- [Firestore Schema](./FIRESTORE_SCHEMA.md)
- [Firestore Security Rules](./FIRESTORE_SECURITY_RULES.md)
- [Firebase Configuration](../docs/configuration/firebase-configuration.md)

---

**Last Updated**: 2025-01-XX  
**Maintained By**: Development Team

