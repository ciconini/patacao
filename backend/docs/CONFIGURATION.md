# Configuration Management

## Overview

Phase 3.5 Configuration Management has been completed. This document describes the configuration architecture and all available configuration options.

## Architecture

### 1. Configuration Schema

**Location:** `backend/src/shared/config/config.schema.ts`

Uses Zod for environment variable validation:
- Validates all environment variables on application startup
- Provides type-safe configuration access
- Reports all validation errors at startup
- Sets sensible defaults where appropriate

### 2. Configuration Service

**Location:** `backend/src/shared/config/config.service.ts`

Provides typed access to configuration values:
- Type-safe getters for all configuration values
- No need to use string keys or provide defaults
- IntelliSense support in IDEs

### 3. Configuration Module

**Location:** `backend/src/shared/config/config.module.ts`

NestJS module that:
- Registers the configuration schema
- Validates environment variables on startup
- Provides `AppConfigService` globally
- Loads `.env.local` and `.env` files

## Configuration Options

### Application Configuration

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `NODE_ENV` | `development \| production \| test` | `development` | No | Node.js environment |
| `PORT` | `number` | `3000` | No | Server port |
| `API_VERSION` | `string` | `v1` | No | API version prefix |

### Firebase Configuration

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `FIREBASE_PROJECT_ID` | `string` | - | **Yes** | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | `string` | - | No | Path to service account JSON file |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | `string` | - | No | Base64-encoded service account JSON |
| `USE_FIREBASE_EMULATOR` | `boolean` | `false` | No | Use Firebase emulator |
| `FIREBASE_EMULATOR_HOST` | `string` | - | No | Firebase emulator host |

**Note:** Either `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT_KEY` must be provided.

### Redis Configuration

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `REDIS_HOST` | `string` | `localhost` | No | Redis host |
| `REDIS_PORT` | `number` | `6379` | No | Redis port |
| `REDIS_PASSWORD` | `string` | - | No | Redis password (if required) |
| `REDIS_DB` | `number` | `0` | No | Redis database number |

### CORS Configuration

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `CORS_ORIGIN` | `string` | `*` | No | Allowed CORS origins |

### Logging Configuration

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `LOG_LEVEL` | `error \| warn \| info \| debug \| verbose` | `info` | No | Logging level |
| `LOG_FORMAT` | `json \| pretty` | `json` | No | Log format (json for production, pretty for dev) |
| `LOG_TO_FILE` | `boolean` | `false` | No | Enable file logging |
| `LOG_DIR` | `string` | `logs` | No | Log directory path |

### JWT Configuration

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `JWT_SECRET` | `string` | - | No | JWT secret key (min 32 chars, required for production) |
| `JWT_EXPIRES_IN` | `string` | `15m` | No | Access token expiration (e.g., "15m", "1h") |
| `JWT_REFRESH_EXPIRES_IN` | `string` | `7d` | No | Refresh token expiration (e.g., "7d", "30d") |

### Rate Limiting Configuration

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `RATE_LIMIT_TTL` | `number` | `60` | No | Rate limit time window (seconds) |
| `RATE_LIMIT_MAX` | `number` | `10` | No | Maximum requests per time window |

### Security Configuration

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `BCRYPT_ROUNDS` | `number` | `10` | No | Bcrypt hashing rounds |

### Account Lockout Configuration

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `MAX_FAILED_LOGIN_ATTEMPTS` | `number` | `5` | No | Maximum failed login attempts before lockout |
| `LOCKOUT_DURATION_MINUTES` | `number` | `15` | No | Account lockout duration in minutes |

## Environment Files

### `.env` (Base Configuration)

Base configuration file, committed to version control (with sensitive values excluded):

```bash
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Firebase
FIREBASE_PROJECT_ID=your-project-id
USE_FIREBASE_EMULATOR=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Logging
LOG_LEVEL=info
LOG_FORMAT=pretty
LOG_TO_FILE=false

# JWT
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=10
```

### `.env.local` (Local Overrides)

Local development overrides (not committed to version control):

```bash
# Override Firebase to use emulator
USE_FIREBASE_EMULATOR=true
FIREBASE_EMULATOR_HOST=localhost:8080

# Override logging for development
LOG_LEVEL=debug
LOG_FORMAT=pretty

# Local Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### `.env.production` (Production)

Production-specific configuration (not committed, managed via deployment):

```bash
NODE_ENV=production
PORT=3000

# Firebase Production
FIREBASE_PROJECT_ID=patacao-prod
FIREBASE_SERVICE_ACCOUNT_KEY=<base64-encoded-key>

# Redis Production
REDIS_HOST=redis.production.example.com
REDIS_PORT=6379
REDIS_PASSWORD=<secure-password>

# Logging Production
LOG_LEVEL=info
LOG_FORMAT=json
LOG_TO_FILE=true
LOG_DIR=/var/log/patacao

# JWT Production (REQUIRED)
JWT_SECRET=<secure-random-string-min-32-chars>

# CORS Production
CORS_ORIGIN=https://app.patacao.pt
```

## Usage

### In Services

```typescript
import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../shared/config/config.service';

@Injectable()
export class MyService {
  constructor(private readonly config: AppConfigService) {}

  doSomething() {
    const port = this.config.port;
    const firebaseProjectId = this.config.firebaseProjectId;
    const logLevel = this.config.logLevel;
  }
}
```

### In Modules

```typescript
import { Module } from '@nestjs/common';
import { AppConfigService } from '../../shared/config/config.service';

@Module({
  providers: [
    {
      provide: 'MyService',
      useFactory: (config: AppConfigService) => {
        return new MyService(config.redisHost, config.redisPort);
      },
      inject: [AppConfigService],
    },
  ],
})
export class MyModule {}
```

## Validation

Configuration is validated on application startup:

- **Missing required variables**: Application fails to start with clear error message
- **Invalid values**: Application fails to start with validation errors
- **Type mismatches**: Automatically converted where possible (e.g., string to number)

### Example Validation Errors

```
Error: Configuration validation failed:
  - FIREBASE_PROJECT_ID: Required
  - PORT: Expected number, received "abc"
  - LOG_LEVEL: Invalid enum value. Expected 'error' | 'warn' | 'info' | 'debug' | 'verbose', received 'invalid'
```

## Best Practices

1. **Never commit sensitive values**: Use `.env.local` or environment variables in production
2. **Use typed access**: Always use `AppConfigService` instead of `ConfigService.get()`
3. **Set defaults appropriately**: Defaults should work for local development
4. **Validate in production**: Ensure all required variables are set in production
5. **Document changes**: Update this document when adding new configuration options

## Security Considerations

1. **Sensitive values**: Never log or expose sensitive configuration values
2. **JWT Secret**: Must be at least 32 characters in production
3. **Service Account**: Store securely, never commit to version control
4. **Redis Password**: Use strong passwords in production
5. **CORS Origin**: Restrict to specific domains in production (avoid `*`)

## Migration Guide

### From ConfigService to AppConfigService

**Before:**
```typescript
constructor(private readonly configService: ConfigService) {
  const port = this.configService.get('PORT', 3000);
}
```

**After:**
```typescript
constructor(private readonly config: AppConfigService) {
  const port = this.config.port; // Type-safe, no string keys
}
```

## Troubleshooting

### Configuration not loading

1. Check `.env` file exists in project root
2. Verify file is not in `.gitignore` (base `.env` should be committed)
3. Check environment variable names match schema exactly

### Validation errors

1. Check error message for specific validation failures
2. Verify variable types match schema (e.g., numbers vs strings)
3. Ensure required variables are set

### Type errors

1. Use `AppConfigService` instead of `ConfigService`
2. Access properties directly (e.g., `config.port`) instead of `get()`
3. Check TypeScript types match schema

