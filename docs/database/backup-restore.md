# Backup and Restore Procedures — Patacão Petshop

## Overview

This document defines backup and restore procedures for the Patacão Petshop database, including schedules, retention policies, and recovery procedures.

**Database:** PostgreSQL 15.x  
**Backup Tool:** pg_dump, pgBackRest (recommended for production)  
**Storage:** AWS S3, Azure Blob Storage, or on-premise storage

---

## Backup Strategy

### Backup Types

1. **Full Backup**
   - Complete database dump
   - Includes all data and schema
   - Weekly or daily

2. **Incremental Backup**
   - Only changed data since last backup
   - Faster, less storage
   - Daily or continuous

3. **Continuous Archiving (WAL)**
   - Write-Ahead Log archiving
   - Point-in-time recovery (PITR)
   - Continuous

### Backup Schedule

| Backup Type | Frequency | Retention | Storage |
|-------------|-----------|-----------|---------|
| Full Backup | Daily | 30 days | S3/Blob Storage |
| Incremental Backup | Every 6 hours | 7 days | S3/Blob Storage |
| WAL Archiving | Continuous | 7 days | S3/Blob Storage |
| Monthly Archive | Monthly | 1 year | Long-term storage |

---

## Backup Procedures

### Full Backup (pg_dump)

#### Manual Backup

```bash
# Full database backup
pg_dump -h localhost -U postgres -d patacao \
  -F c \
  -f backup_$(date +%Y%m%d_%H%M%S).dump

# Compressed backup
pg_dump -h localhost -U postgres -d patacao \
  -F c \
  -Z 9 \
  -f backup_$(date +%Y%m%d_%H%M%S).dump.gz
```

#### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

DB_HOST="localhost"
DB_NAME="patacao"
DB_USER="postgres"
BACKUP_DIR="/backups"
S3_BUCKET="patacao-backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -F c \
  -Z 9 \
  -f $BACKUP_DIR/backup_$DATE.dump.gz

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$DATE.dump.gz \
  s3://$S3_BUCKET/daily/backup_$DATE.dump.gz

# Cleanup local backups older than 7 days
find $BACKUP_DIR -name "backup_*.dump.gz" -mtime +7 -delete
```

### pgBackRest (Recommended for Production)

#### Configuration

```ini
[global]
repo1-type=s3
repo1-s3-bucket=patacao-backups
repo1-s3-region=eu-west-1
repo1-path=/backups

[global:archive-push]
compress-level=3

[patacao]
pg1-path=/var/lib/postgresql/15/main
pg1-port=5432
```

#### Backup Commands

```bash
# Full backup
pgbackrest --stanza=patacao backup --type=full

# Incremental backup
pgbackrest --stanza=patacao backup --type=incr

# Differential backup
pgbackrest --stanza=patacao backup --type=diff

# Verify backup
pgbackrest --stanza=patacao info
```

### WAL Archiving

#### PostgreSQL Configuration

```conf
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'pgbackrest archive-push %p'
max_wal_senders = 3
```

---

## Restore Procedures

### Full Restore from pg_dump

#### Restore Database

```bash
# Drop existing database (CAUTION: Data loss)
dropdb -h localhost -U postgres patacao

# Create new database
createdb -h localhost -U postgres patacao

# Restore from backup
pg_restore -h localhost -U postgres -d patacao \
  -v \
  backup_20250115_120000.dump
```

#### Restore Specific Tables

```bash
# Restore specific table
pg_restore -h localhost -U postgres -d patacao \
  -t customers \
  -v \
  backup_20250115_120000.dump
```

### Point-in-Time Recovery (PITR)

#### Using pgBackRest

```bash
# Stop PostgreSQL
systemctl stop postgresql

# Restore to specific time
pgbackrest --stanza=patacao restore \
  --type=time \
  --target="2025-01-15 14:30:00"

# Start PostgreSQL
systemctl start postgresql
```

#### Using WAL Files

```bash
# Restore base backup
pg_restore -h localhost -U postgres -d patacao base_backup.dump

# Replay WAL files until target time
pg_waldump -p /var/lib/postgresql/15/main/pg_wal \
  --start=0/00000000 \
  --end=0/FFFFFFFF \
  | psql -h localhost -U postgres -d patacao
```

---

## Recovery Objectives

### RPO (Recovery Point Objective)

- **Target:** 1 hour
- **Maximum Data Loss:** 1 hour of transactions
- **Achieved Through:** WAL archiving every 15 minutes

### RTO (Recovery Time Objective)

- **Target:** 4 hours
- **Maximum Downtime:** 4 hours
- **Achieved Through:** Automated restore procedures

---

## Backup Verification

### Automated Verification

```bash
#!/bin/bash
# verify_backup.sh

BACKUP_FILE=$1
DB_NAME="patacao_test"

# Create test database
createdb -h localhost -U postgres $DB_NAME

# Restore backup
pg_restore -h localhost -U postgres -d $DB_NAME -v $BACKUP_FILE

# Verify data integrity
psql -h localhost -U postgres -d $DB_NAME -c "
  SELECT 
    COUNT(*) as table_count,
    SUM(n_live_tup) as total_rows
  FROM pg_stat_user_tables;
"

# Drop test database
dropdb -h localhost -U postgres $DB_NAME
```

### Manual Verification

1. Restore backup to test database
2. Verify table counts
3. Check data integrity
4. Test application connectivity
5. Verify indexes and constraints

---

## Backup Storage

### Storage Locations

1. **Primary Storage:** Cloud storage (S3, Azure Blob)
2. **Secondary Storage:** On-premise backup server
3. **Long-term Archive:** Glacier, Azure Archive

### Storage Encryption

- Encrypt backups at rest
- Use AWS KMS, Azure Key Vault
- Encrypt in transit (TLS)

### Storage Retention

| Backup Type | Retention Period | Storage Tier |
|-------------|------------------|--------------|
| Daily Backups | 30 days | Standard |
| Weekly Backups | 90 days | Standard |
| Monthly Backups | 1 year | Archive |
| Yearly Backups | 7 years | Archive (compliance) |

---

## Disaster Recovery

### Disaster Recovery Plan

1. **Identify Disaster**
   - Database corruption
   - Data center failure
   - Ransomware attack

2. **Assess Impact**
   - Data loss extent
   - Service availability
   - Recovery time needed

3. **Execute Recovery**
   - Restore from latest backup
   - Replay WAL files if available
   - Verify data integrity

4. **Post-Recovery**
   - Notify stakeholders
   - Document incident
   - Review and improve procedures

### Recovery Scenarios

#### Scenario 1: Single Table Corruption

```bash
# Restore specific table from backup
pg_restore -h localhost -U postgres -d patacao \
  -t customers \
  --clean \
  --if-exists \
  backup_20250115_120000.dump
```

#### Scenario 2: Full Database Corruption

```bash
# Full restore from backup
pgbackrest --stanza=patacao restore --type=full

# Replay WAL files to latest
pgbackrest --stanza=patacao restore --type=time --target=latest
```

#### Scenario 3: Point-in-Time Recovery

```bash
# Restore to specific time before corruption
pgbackrest --stanza=patacao restore \
  --type=time \
  --target="2025-01-15 14:30:00"
```

---

## Backup Monitoring

### Monitoring Metrics

- Backup success/failure
- Backup duration
- Backup size
- Storage usage
- Restore test results

### Alerts

- Backup failure alert
- Backup size anomaly
- Storage quota warning
- Restore test failure

### Monitoring Tools

- CloudWatch (AWS)
- Azure Monitor
- Prometheus + Grafana
- Custom scripts

---

## Backup Automation

### Cron Schedule

```cron
# Daily full backup at 2 AM
0 2 * * * /usr/local/bin/backup.sh

# Incremental backup every 6 hours
0 */6 * * * /usr/local/bin/incremental_backup.sh

# Weekly backup verification
0 3 * * 0 /usr/local/bin/verify_backup.sh
```

### CI/CD Integration

```yaml
# .github/workflows/backup.yml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Backup Database
        run: |
          pg_dump -h ${{ secrets.DB_HOST }} \
            -U ${{ secrets.DB_USER }} \
            -d patacao \
            -F c \
            -f backup.dump
      
      - name: Upload to S3
        run: |
          aws s3 cp backup.dump \
            s3://patacao-backups/daily/backup_$(date +%Y%m%d).dump
```

---

## Backup Security

### Access Control

- Limit backup access to authorized personnel
- Use IAM roles for cloud storage access
- Encrypt backup files

### Backup Encryption

```bash
# Encrypt backup with GPG
pg_dump -h localhost -U postgres -d patacao \
  -F c \
  | gpg --encrypt --recipient backup@patacao.com \
  > backup_$(date +%Y%m%d).dump.gpg
```

### Backup Testing

- Test restore procedures monthly
- Document restore times
- Verify data integrity
- Update procedures as needed

---

## Compliance Requirements

### GDPR

- Encrypt personal data in backups
- Secure backup storage
- Document data retention
- Enable data deletion from backups

### Financial Records

- Retain financial data backups for 10 years
- Store in immutable storage
- Audit backup access

---

## Backup Checklist

### Daily

- [ ] Verify backup completion
- [ ] Check backup size
- [ ] Verify backup upload to cloud
- [ ] Review backup logs

### Weekly

- [ ] Test restore procedure
- [ ] Verify backup integrity
- [ ] Review storage usage
- [ ] Update backup documentation

### Monthly

- [ ] Full restore test
- [ ] Review retention policies
- [ ] Audit backup access
- [ ] Update disaster recovery plan

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

