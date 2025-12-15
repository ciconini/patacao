# Environment Variables — Patacão Petshop

## Overview

This document lists all environment variables used in the Patacão Petshop Management System, including descriptions, default values, and required flags.

**Environment Files:** `.env.development`, `.env.staging`, `.env.production`  
**Secrets Management:** AWS Secrets Manager, Azure Key Vault (production)

---

## Application Configuration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `NODE_ENV` | string | Yes | - | Environment: `development`, `staging`, `production` |
| `PORT` | number | No | `3000` | HTTP server port |
| `API_VERSION` | string | No | `v1` | API version prefix |
| `LOG_LEVEL` | string | No | `info` | Log level: `debug`, `info`, `warn`, `error` |
| `LOG_FORMAT` | string | No | `json` | Log format: `json`, `pretty` |

---

## Firebase Configuration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `FIREBASE_PROJECT_ID` | string | Yes | - | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | string | No | `config/secrets/firebase-service-account.json` | Path to service account JSON file (relative to project root or absolute path) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | string | No | - | Service account JSON as string (base64 or JSON) |
| `USE_FIREBASE_EMULATOR` | boolean | No | `false` | Use Firebase emulator for local development |
| `FIREBASE_EMULATOR_HOST` | string | No | `localhost:8080` | Firebase emulator host and port |

---

## Redis Configuration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `REDIS_HOST` | string | Yes | - | Redis host |
| `REDIS_PORT` | number | No | `6379` | Redis port |
| `REDIS_PASSWORD` | string | No | - | Redis password |
| `REDIS_DB` | number | No | `0` | Redis database number |
| `REDIS_TLS` | boolean | No | `false` | Enable TLS connection |
| `REDIS_KEY_PREFIX` | string | No | `patacao:` | Key prefix for namespacing |

---

## Authentication & Security

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `JWT_SECRET` | string | Yes | - | JWT signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | string | No | `1h` | Access token expiration |
| `REFRESH_TOKEN_EXPIRES_IN` | string | No | `7d` | Refresh token expiration |
| `SESSION_SECRET` | string | Yes | - | Session encryption secret |
| `SESSION_MAX_AGE` | number | No | `86400000` | Session max age (ms) |
| `BCRYPT_ROUNDS` | number | No | `10` | Bcrypt salt rounds |
| `RATE_LIMIT_WINDOW` | number | No | `900000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | number | No | `100` | Max requests per window |

---

## Email Configuration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `EMAIL_PROVIDER` | string | No | `smtp` | Email provider: `smtp`, `ses`, `sendgrid` |
| `EMAIL_HOST` | string | No | - | SMTP host |
| `EMAIL_PORT` | number | No | `587` | SMTP port |
| `EMAIL_USER` | string | No | - | SMTP username |
| `EMAIL_PASSWORD` | string | No | - | SMTP password |
| `EMAIL_FROM` | string | No | `noreply@patacao.com` | From email address |
| `EMAIL_FROM_NAME` | string | No | `Patacão` | From name |
| `EMAIL_SECURE` | boolean | No | `false` | Use TLS/SSL |
| `AWS_SES_REGION` | string | No | - | AWS SES region (if using SES) |
| `AWS_SES_ACCESS_KEY_ID` | string | No | - | AWS SES access key |
| `AWS_SES_SECRET_ACCESS_KEY` | string | No | - | AWS SES secret key |

---

## File Storage Configuration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `STORAGE_TYPE` | string | No | `local` | Storage type: `local`, `s3`, `azure` |
| `STORAGE_PATH` | string | No | `./uploads` | Local storage path |
| `AWS_REGION` | string | No | - | AWS region |
| `AWS_S3_BUCKET` | string | No | - | S3 bucket name |
| `AWS_ACCESS_KEY_ID` | string | No | - | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | string | No | - | AWS secret key |
| `AZURE_STORAGE_ACCOUNT` | string | No | - | Azure storage account |
| `AZURE_STORAGE_KEY` | string | No | - | Azure storage key |
| `AZURE_STORAGE_CONTAINER` | string | No | - | Azure container name |

---

## Message Queue Configuration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `QUEUE_PROVIDER` | string | No | `bull` | Queue provider: `bull`, `rabbitmq`, `sqs` |
| `RABBITMQ_URL` | string | No | - | RabbitMQ connection URL |
| `RABBITMQ_QUEUE` | string | No | `patacao` | RabbitMQ queue name |
| `AWS_SQS_QUEUE_URL` | string | No | - | AWS SQS queue URL |
| `AWS_SQS_REGION` | string | No | - | AWS SQS region |

---

## Monitoring & Observability

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `SENTRY_DSN` | string | No | - | Sentry DSN for error tracking |
| `SENTRY_ENVIRONMENT` | string | No | - | Sentry environment |
| `PROMETHEUS_ENABLED` | boolean | No | `false` | Enable Prometheus metrics |
| `PROMETHEUS_PORT` | number | No | `9090` | Prometheus metrics port |
| `LOGSTASH_HOST` | string | No | - | Logstash host for log shipping |
| `LOGSTASH_PORT` | number | No | `5000` | Logstash port |

---

## Feature Flags

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `FEATURE_MFA_ENABLED` | boolean | No | `false` | Enable multi-factor authentication |
| `FEATURE_PAYMENTS_ENABLED` | boolean | No | `false` | Enable payment gateway integration |
| `FEATURE_EXPORT_SFTP` | boolean | No | `false` | Enable SFTP export |
| `FEATURE_ANALYTICS` | boolean | No | `false` | Enable analytics tracking |

---

## External Services

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `SFTP_HOST` | string | No | - | SFTP host for exports |
| `SFTP_PORT` | number | No | `22` | SFTP port |
| `SFTP_USER` | string | No | - | SFTP username |
| `SFTP_PASSWORD` | string | No | - | SFTP password |
| `SFTP_KEY` | string | No | - | SFTP private key |

---

## Environment-Specific Examples

### Development (.env.development)

```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
LOG_FORMAT=pretty

FIREBASE_PROJECT_ID=patacao-dev
FIREBASE_SERVICE_ACCOUNT_PATH=
FIREBASE_SERVICE_ACCOUNT_KEY=
USE_FIREBASE_EMULATOR=true
FIREBASE_EMULATOR_HOST=localhost:8080

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_SECRET=dev_secret_key_change_in_production_min_32_chars
JWT_EXPIRES_IN=24h
SESSION_SECRET=dev_session_secret

STORAGE_TYPE=local
STORAGE_PATH=./uploads
```

### Production (.env.production)

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
LOG_FORMAT=json

# Firebase (from secrets manager)
FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
FIREBASE_SERVICE_ACCOUNT_KEY=${FIREBASE_SERVICE_ACCOUNT_KEY}
USE_FIREBASE_EMULATOR=false

# Redis (from secrets manager)
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# JWT (from secrets manager)
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=1h
SESSION_SECRET=${SESSION_SECRET}

# Storage
STORAGE_TYPE=s3
AWS_REGION=eu-west-1
AWS_S3_BUCKET=patacao-uploads
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}

# Monitoring
SENTRY_DSN=${SENTRY_DSN}
SENTRY_ENVIRONMENT=production
```

---

## Secrets Management

### Production Secrets

**Storage:**
- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault

**Secrets to Store:**
- Database credentials
- JWT secrets
- API keys
- Email credentials
- AWS/Azure credentials

### Secret Rotation

- Rotate secrets regularly (every 90 days)
- Use IAM roles where possible
- Monitor secret access
- Audit secret usage

---

## Validation

### Environment Variable Validation

**On Application Start:**
- Validate required variables
- Validate variable formats
- Validate ranges (ports, timeouts)
- Provide clear error messages

**Example:**
```typescript
const requiredVars = [
  'NODE_ENV',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET'
];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}
```

---

## Security Best Practices

1. **Never Commit Secrets**
   - Use `.env.example` for documentation
   - Add `.env*` to `.gitignore`
   - Use secrets manager in production

2. **Use Strong Secrets**
   - JWT secrets: minimum 32 characters
   - Random generation for production
   - Different secrets per environment

3. **Limit Access**
   - Restrict who can access secrets
   - Use IAM roles for cloud services
   - Audit secret access

4. **Rotate Regularly**
   - Rotate secrets every 90 days
   - Plan rotation windows
   - Test rotation procedures

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

