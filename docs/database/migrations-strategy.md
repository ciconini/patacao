# Database Migrations Strategy — Patacão Petshop

## Overview

This document defines the strategy, approach, and best practices for managing database schema migrations in the Patacão Petshop system.

**Migration Tool:** TypeORM Migrations (or Prisma Migrate)  
**Database:** PostgreSQL 15.x  
**Version Control:** Git

---

## Migration Principles

### 1. Immutability
- Migrations are immutable once committed
- Never modify existing migrations
- Create new migrations to fix issues

### 2. Reversibility
- All migrations should be reversible (up and down)
- Test rollback procedures before deployment

### 3. Atomicity
- Each migration should be atomic (all or nothing)
- Use database transactions where possible

### 4. Idempotency
- Migrations should be idempotent (safe to run multiple times)
- Use `IF NOT EXISTS` / `IF EXISTS` clauses where appropriate

---

## Migration Naming Convention

### Format
```
{timestamp}-{description}.{extension}
```

### Examples
```
20250115120000-create-companies-table.ts
20250115120001-create-stores-table.ts
20250115120002-add-index-to-invoices.ts
20250115120003-add-consent-fields-to-customers.ts
```

### Naming Guidelines
- Use descriptive names
- Use kebab-case
- Include action verb (create, add, modify, remove)
- Include target entity/table name

---

## Migration Structure

### TypeORM Migration Template

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompaniesTable1234567890123 implements MigrationInterface {
  name = 'CreateCompaniesTable1234567890123'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        nif VARCHAR(32) NOT NULL,
        address JSONB NULL,
        tax_regime VARCHAR(64) NULL,
        default_vat_rate DECIMAL(5,2) NULL,
        phone VARCHAR(32) NULL,
        email VARCHAR(255) NULL,
        website VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NULL
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_companies_nif ON companies(nif);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_companies_nif;`);
    await queryRunner.query(`DROP TABLE IF EXISTS companies;`);
  }
}
```

---

## Migration Types

### 1. Schema Migrations
- Create/drop tables
- Add/remove columns
- Modify column types
- Add/remove constraints

### 2. Index Migrations
- Create/drop indexes
- Modify index definitions

### 3. Data Migrations
- Transform existing data
- Seed initial data
- Backfill missing data

### 4. Constraint Migrations
- Add/remove foreign keys
- Add/remove unique constraints
- Add/remove check constraints

---

## Migration Workflow

### Development

1. **Create Migration**
   ```bash
   npm run migration:create -- -n CreateCompaniesTable
   ```

2. **Write Migration**
   - Implement `up()` method
   - Implement `down()` method
   - Test locally

3. **Test Migration**
   ```bash
   npm run migration:run
   npm run migration:revert
   npm run migration:run
   ```

4. **Commit to Git**
   - Commit migration file
   - Include in pull request

### Code Review

1. Review migration SQL
2. Verify reversibility
3. Check for data loss risks
4. Verify index creation
5. Check foreign key constraints

### Deployment

1. **Pre-deployment**
   - Backup database
   - Review migration order
   - Test on staging

2. **Deployment**
   - Run migrations automatically (CI/CD)
   - Or run manually with approval

3. **Post-deployment**
   - Verify migration success
   - Check application functionality
   - Monitor performance

---

## Migration Best Practices

### 1. Breaking Changes

**Avoid:**
- Dropping columns without deprecation period
- Changing column types without data migration
- Removing indexes without performance analysis

**Do:**
- Add new columns as nullable first
- Deprecate old columns before removal
- Create new indexes before dropping old ones

### 2. Data Migrations

**Guidelines:**
- Run data migrations in separate transactions
- Test with production-like data volumes
- Provide rollback strategy
- Log migration progress

**Example:**
```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // Add new column
  await queryRunner.query(`
    ALTER TABLE customers 
    ADD COLUMN consent_marketing BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  // Migrate existing data
  await queryRunner.query(`
    UPDATE customers 
    SET consent_marketing = TRUE 
    WHERE email IS NOT NULL;
  `);
}
```

### 3. Index Creation

**Guidelines:**
- Create indexes concurrently in production
- Use `CONCURRENTLY` for large tables
- Monitor index creation time

**Example:**
```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // Concurrent index creation (non-blocking)
  await queryRunner.query(`
    CREATE INDEX CONCURRENTLY idx_appointments_store_start 
    ON appointments(store_id, start_at);
  `);
}
```

### 4. Foreign Key Constraints

**Guidelines:**
- Add foreign keys after data migration
- Use `NOT VALID` for existing data, then validate
- Consider performance impact

**Example:**
```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // Add foreign key without validating existing data
  await queryRunner.query(`
    ALTER TABLE stores 
    ADD CONSTRAINT fk_stores_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(id) 
    NOT VALID;
  `);

  // Validate foreign key
  await queryRunner.query(`
    ALTER TABLE stores 
    VALIDATE CONSTRAINT fk_stores_company;
  `);
}
```

---

## Migration Versioning

### Version Table

TypeORM/Prisma maintains a migration version table:
- `migrations` table tracks executed migrations
- Contains: `id`, `timestamp`, `name`

### Version Control

- Migrations are versioned in Git
- Migration order is determined by timestamp
- Never change migration timestamps

---

## Rollback Strategy

### Automatic Rollback

**When to Rollback:**
- Migration fails during deployment
- Application errors after migration
- Performance degradation

**How to Rollback:**
```bash
npm run migration:revert
```

### Manual Rollback

1. Identify last successful migration
2. Create rollback migration if needed
3. Restore database backup if necessary
4. Verify application functionality

### Rollback Best Practices

- Always test rollback procedures
- Keep database backups before migrations
- Document rollback steps
- Have rollback plan ready

---

## Migration Testing

### Local Testing

1. **Fresh Database**
   ```bash
   npm run migration:run
   ```

2. **Existing Database**
   - Test migration on copy of production data
   - Verify data integrity
   - Check performance impact

### Staging Testing

1. Run migrations on staging environment
2. Test application functionality
3. Verify data integrity
4. Performance testing

### Production Testing

1. Run migrations during low-traffic period
2. Monitor application logs
3. Check database performance
4. Verify data integrity

---

## Migration Dependencies

### Ordering

Migrations must run in order:
1. Create base tables first
2. Add foreign keys after referenced tables exist
3. Add indexes after table creation
4. Data migrations after schema changes

### Dependency Management

- Use migration timestamps for ordering
- Document dependencies in migration comments
- Test migration order locally

---

## Seed Data Migrations

### Initial Seed Data

Create seed migrations for:
- Default roles
- System configuration
- Reference data

### Seed Migration Example

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`
    INSERT INTO roles (id, name, permissions, created_at) VALUES
    ('Owner', 'Owner', '["*"]', NOW()),
    ('Manager', 'Manager', '["appointments:*", "customers:*"]', NOW()),
    ('Staff', 'Staff', '["appointments:read", "appointments:create"]', NOW())
    ON CONFLICT (id) DO NOTHING;
  `);
}
```

---

## Migration Performance

### Large Table Migrations

**Strategies:**
- Use `CONCURRENTLY` for index creation
- Batch data migrations
- Run during maintenance windows
- Monitor lock times

### Lock Management

- Avoid long-running migrations
- Use `LOCK TIMEOUT` settings
- Test lock behavior on staging

---

## Migration Monitoring

### Logging

- Log all migration executions
- Track migration duration
- Log errors and warnings

### Metrics

- Migration execution time
- Database lock duration
- Application downtime
- Rollback frequency

---

## Migration Troubleshooting

### Common Issues

1. **Migration Fails**
   - Check error logs
   - Verify database state
   - Rollback if necessary
   - Fix migration and redeploy

2. **Migration Hangs**
   - Check for locks
   - Kill blocking queries
   - Retry migration

3. **Data Loss**
   - Restore from backup
   - Investigate root cause
   - Fix migration

### Recovery Procedures

1. **Partial Migration**
   - Identify completed steps
   - Create compensating migration
   - Complete or rollback

2. **Corrupted State**
   - Restore from backup
   - Re-run migrations from last known good state

---

## Migration Checklist

### Before Creating Migration

- [ ] Review schema changes
- [ ] Check for breaking changes
- [ ] Plan data migration if needed
- [ ] Consider performance impact

### Before Deploying Migration

- [ ] Test migration locally
- [ ] Test on staging
- [ ] Backup production database
- [ ] Review migration order
- [ ] Prepare rollback plan

### After Deploying Migration

- [ ] Verify migration success
- [ ] Check application functionality
- [ ] Monitor performance
- [ ] Update documentation

---

## Migration Tools

### TypeORM

```bash
# Generate migration
npm run migration:generate -- -n MigrationName

# Create empty migration
npm run migration:create -- -n MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert

# Show migration status
npm run migration:show
```

### Prisma

```bash
# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset
```

---

## Migration Documentation

### Migration Comments

Include comments in migrations:
- Purpose of migration
- Dependencies
- Breaking changes
- Rollback notes

### Example

```typescript
/**
 * Migration: Add consent fields to customers table
 * 
 * Purpose: Add GDPR consent fields for marketing and reminders
 * Dependencies: None
 * Breaking Changes: None (new nullable columns)
 * Rollback: Safe (drops columns)
 */
export class AddConsentFieldsToCustomers1234567890123 implements MigrationInterface {
  // ...
}
```

---

## Migration Security

### Access Control

- Migrations run with database admin privileges
- Limit migration execution to authorized users
- Audit migration executions

### Sensitive Data

- Never include sensitive data in migrations
- Use environment variables for secrets
- Encrypt sensitive migration data

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

