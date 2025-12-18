# Database Migrations

This directory contains database migration scripts for Firestore schema changes.

## Quick Start

### List all migrations
```bash
npm run migrate -- --list
```

### Check migration status
```bash
npm run migrate -- --status
```

### Run all pending migrations
```bash
npm run migrate
```

### Run specific migration
```bash
npm run migrate -- --up 002_add_field_to_users
```

### Rollback migration
```bash
npm run migrate -- --down 002_add_field_to_users
```

## Creating a New Migration

1. Create a new file: `{number}_{description}.ts`
   - Example: `002_add_field_to_users.ts`
   - Use sequential numbering

2. Implement `up()` and optionally `down()` functions:

```typescript
import * as admin from 'firebase-admin';

const db = admin.firestore();

export async function up(): Promise<void> {
  // Migration logic here
}

export async function down(): Promise<void> {
  // Rollback logic here (optional)
}
```

3. Test the migration:
   ```bash
   npm run migrate -- --up your_migration_name
   ```

## Migration Best Practices

- **Idempotent**: Migrations should be safe to run multiple times
- **Batched**: Use Firestore batches for bulk operations (max 500)
- **Tested**: Always test in development first
- **Documented**: Include comments explaining what the migration does
- **Reversible**: Provide `down()` function when possible

## See Also

- [Data Migration Documentation](../docs/DATA_MIGRATION.md) - Complete migration guide
- [Firestore Schema](../docs/FIRESTORE_SCHEMA.md) - Database schema reference

