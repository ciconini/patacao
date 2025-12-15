# Local Development Setup — Patacão Petshop

## Overview

This document provides detailed instructions for setting up a local development environment for the Patacão Petshop Management System.

**Estimated Time:** 30-45 minutes  
**Requirements:** Docker, Node.js 20.x, Git

---

## Docker Compose Setup

### docker-compose.dev.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    env_file:
      - .env.development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      firebase-emulator:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: npm run start:dev

  firebase-emulator:
    image: mtlynch/firestore-emulator:latest
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  redis_data:
```

### Starting Services

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes
docker-compose -f docker-compose.dev.yml down -v
```

---

## Database Setup

### Firestore Setup

```bash
# Deploy Firestore rules (if needed)
npm run firebase:deploy

# Or use emulator for local development
firebase emulators:start --only firestore
```

### Seed Data

```bash
# Seed Firestore with test data
npm run seed

# Seed specific data
npm run seed:roles
npm run seed:test-users
```

### Firebase Emulator Access

**Using Firebase Emulator UI:**
- URL: http://localhost:4000 (if Firebase UI is enabled)
- View Firestore data and test rules

**Using Firebase CLI:**
```bash
# Start emulator
firebase emulators:start --only firestore

# View emulator UI
# Open http://localhost:4000 in browser
```

---

## Redis Setup

### Redis Access

**Using redis-cli:**
```bash
docker-compose -f docker-compose.dev.yml exec redis redis-cli
```

**Using RedisInsight:**
- Download: https://redis.com/redis-enterprise/redis-insight/
- Connect to: localhost:6379

---

## Development Scripts

### package.json Scripts

```json
{
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts",
    "type-check": "tsc --noEmit",
    "firebase:deploy": "firebase deploy --only firestore:rules,firestore:indexes",
    "firebase:emulators": "firebase emulators:start",
    "seed": "ts-node src/scripts/seed.ts"
  }
}
```

---

## Hot Reload

### Backend Hot Reload

**Using nodemon:**
```json
{
  "nodemonConfig": {
    "watch": ["src"],
    "ext": "ts",
    "ignore": ["src/**/*.spec.ts"],
    "exec": "ts-node src/index.ts"
  }
}
```

### Frontend Hot Reload

**Angular CLI:**
```bash
ng serve --port 4200
```

---

## Debugging

### VS Code Debug Configuration

**.vscode/launch.json:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### Database Debugging

**Query Logging:**
```typescript
// Enable query logging in development
const dataSource = new DataSource({
  logging: process.env.NODE_ENV === 'development'
});
```

---

## Testing Setup

### Test Database

**Firebase Emulator for tests:**
```env
USE_FIREBASE_EMULATOR=true
FIREBASE_EMULATOR_HOST=localhost:8080
```

**Test setup:**
```typescript
beforeAll(async () => {
  // Setup Firebase emulator for tests
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  // Initialize Firebase Admin with emulator
});

afterAll(async () => {
  // Cleanup test data
  // Clear Firestore emulator data
});
```

---

## Common Development Tasks

### Creating a New Feature

1. **Create Branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Create Use Case**
   ```bash
   # Follow use case template
   # Create in src/modules/{module}/application/use-cases/
   ```

3. **Create Repository Method**
   ```bash
   # Add method to repository interface
   # Implement in repository adapter
   ```

4. **Create API Endpoint**
   ```bash
   # Add route in controller
   # Add DTOs
   # Add validation
   ```

5. **Write Tests**
   ```bash
   # Unit tests for use case
   # Integration tests for repository
   # E2E tests for API
   ```

6. **Update Documentation**
   ```bash
   # Update API documentation
   # Update use case documentation
   ```

---

## Troubleshooting

### Port Conflicts

**Change ports in docker-compose.dev.yml:**
```yaml
services:
  app:
    ports:
      - "3001:3000"  # Change host port
```

### Database Connection Issues

**Check Firebase connection:**
```bash
# Test Firebase connection
# Check Firebase emulator is running
curl http://localhost:8080
```

**Reset Firestore data:**
```bash
# Clear Firestore emulator data
# Restart emulator or use Firebase CLI to clear data
firebase emulators:exec --only firestore "echo 'Emulator started'"
```

### Module Not Found

**Clear node_modules:**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Development Best Practices

1. **Use Environment Variables**
   - Never hardcode values
   - Use .env.development for local config

2. **Write Tests First**
   - TDD approach
   - Test critical paths

3. **Keep Firestore Rules Simple**
   - Test rules thoroughly
   - Use Firebase Console for rule testing
   - Deploy rules incrementally

4. **Commit Often**
   - Small, focused commits
   - Clear commit messages

5. **Review Code**
   - Self-review before PR
   - Request reviews from team

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

