# Logging Implementation

## Overview

Phase 3.4 Logging has been completed. This document describes the logging architecture and how to use it.

## Architecture

### 1. Enhanced Logger Service

**Location:** `backend/src/shared/logger/logger.service.ts`

The logger service provides:

- **Structured Logging**: JSON format for production, pretty format for development
- **Log Levels**: error, warn, info, debug, verbose (configurable via `LOG_LEVEL`)
- **Log Rotation**: Automatic file rotation with size limits (5MB per file, 5 files max)
- **Multiple Transports**: Console (always), File (production), Access logs, Error logs
- **Exception Handling**: Automatic logging of uncaught exceptions and unhandled rejections

### 2. Request/Response Logging Middleware

**Location:** `backend/src/shared/presentation/middleware/request-logger.middleware.ts`

Automatically logs all HTTP requests and responses with:
- HTTP method and path
- Status code
- Request duration
- IP address and user agent
- User ID (if authenticated)
- Request ID (if provided in headers)
- Query parameters and sanitized request body

### 3. Log Files

Logs are written to the `logs/` directory (configurable via `LOG_DIR`):

- `combined.log` - All logs (production)
- `error.log` - Error-level logs only
- `access.log` - HTTP request/response logs
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

## Configuration

### Environment Variables

```bash
# Log level (error, warn, info, debug, verbose)
LOG_LEVEL=info

# Log format (json, pretty)
LOG_FORMAT=json

# Enable file logging (true/false)
LOG_TO_FILE=false

# Log directory path
LOG_DIR=logs
```

### Log Levels

- **error**: Error events that might still allow the application to continue
- **warn**: Warning messages for potentially harmful situations
- **info**: Informational messages (default)
- **debug**: Detailed information for debugging
- **verbose**: Very detailed information

## Usage

### Basic Logging

```typescript
import { Logger } from '@nestjs/common';

export class MyService {
  private readonly logger = new Logger(MyService.name);

  doSomething() {
    this.logger.log('Doing something');
    this.logger.warn('Warning message');
    this.logger.error('Error message', 'Stack trace');
    this.logger.debug('Debug information');
  }
}
```

### Using the App Logger with Metadata

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { Logger, LogMetadata } from '../../shared/logger/logger.service';

@Injectable()
export class MyService {
  constructor(
    @Inject('Logger')
    private readonly logger: Logger
  ) {}

  doSomething(userId: string) {
    const metadata: LogMetadata = {
      context: 'MyService',
      userId,
      action: 'doSomething',
    };

    this.logger.logWithMetadata('info', 'Action performed', metadata);
  }
}
```

### Request Logging

Request logging is automatic via middleware. Each request logs:

**Request:**
```json
{
  "timestamp": "2024-01-01 12:00:00.000",
  "level": "INFO",
  "message": "HTTP Request",
  "type": "http_request",
  "method": "POST",
  "path": "/api/v1/companies",
  "statusCode": 0,
  "duration": 0,
  "context": "HTTP",
  "userId": "user-123",
  "requestId": "req-456",
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "query": {},
  "body": { "name": "Company Name" }
}
```

**Response:**
```json
{
  "timestamp": "2024-01-01 12:00:00.150",
  "level": "INFO",
  "message": "HTTP Response",
  "type": "http_response",
  "method": "POST",
  "path": "/api/v1/companies",
  "statusCode": 201,
  "duration": 150,
  "context": "HTTP",
  "userId": "user-123",
  "requestId": "req-456",
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "responseSize": 256
}
```

## Log Format

### JSON Format (Production)

```json
{
  "timestamp": "2024-01-01 12:00:00.000",
  "level": "INFO",
  "message": "Application started",
  "context": "AppModule"
}
```

### Pretty Format (Development)

```
2024-01-01 12:00:00.000 info [AppModule] Application started
```

## Security

### Sensitive Data Sanitization

The request logger automatically sanitizes sensitive fields:
- `password`
- `passwordHash`
- `token`
- `secret`
- `apiKey`
- `authorization`

These fields are replaced with `***REDACTED***` in logs.

## Log Rotation

Log files are automatically rotated when they reach 5MB:
- Maximum file size: 5MB
- Maximum number of files: 5
- Old files are automatically deleted

## Best Practices

1. **Use appropriate log levels**: 
   - `error` for errors that need attention
   - `warn` for warnings
   - `info` for general information
   - `debug` for debugging details
   - `verbose` for very detailed information

2. **Include context**: Always include context in logs for better traceability

3. **Don't log sensitive data**: Sensitive information is automatically sanitized, but be careful with custom logs

4. **Use structured logging**: Include metadata in logs for better searchability

5. **Monitor log files**: Set up log monitoring and alerting for production

## Integration with Monitoring

Logs can be integrated with:
- **AWS CloudWatch**: Stream logs to CloudWatch Logs
- **ELK Stack**: Send logs to Elasticsearch via Logstash
- **Grafana Loki**: Send logs to Loki for visualization
- **Splunk**: Forward logs to Splunk for analysis

## Example: Logging in Use Cases

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '../../shared/logger/logger.service';

@Injectable()
export class CreateCompanyUseCase {
  constructor(
    @Inject('Logger')
    private readonly logger: Logger,
    private readonly companyRepository: CompanyRepository
  ) {}

  async execute(input: CreateCompanyInput): Promise<CreateCompanyOutput> {
    this.logger.logWithMetadata('info', 'Creating company', {
      context: 'CreateCompanyUseCase',
      userId: input.performedBy,
      companyName: input.name,
    });

    try {
      const company = await this.companyRepository.save(companyEntity);
      
      this.logger.logWithMetadata('info', 'Company created successfully', {
        context: 'CreateCompanyUseCase',
        userId: input.performedBy,
        companyId: company.id,
      });

      return company;
    } catch (error) {
      this.logger.logWithMetadata('error', 'Failed to create company', {
        context: 'CreateCompanyUseCase',
        userId: input.performedBy,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
```

## Troubleshooting

### Logs not appearing

1. Check `LOG_LEVEL` environment variable
2. Verify `LOG_DIR` exists and is writable
3. Check file permissions

### Log files too large

1. Adjust `maxsize` in logger configuration
2. Reduce `maxFiles` if needed
3. Consider log aggregation service

### Performance impact

1. Use appropriate log levels (avoid `debug`/`verbose` in production)
2. Consider async logging for high-traffic scenarios
3. Monitor log file I/O performance

