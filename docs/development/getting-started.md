# Getting Started — Patacão Petshop Development

## Overview

This guide helps new developers get started with the Patacão Petshop Management System development environment.

**Prerequisites:** Node.js 20.x, Docker, Git  
**Time to Setup:** ~30 minutes

---

## Prerequisites

### Required Software

1. **Node.js 20.x LTS**
   - Download: https://nodejs.org/
   - Verify: `node --version` (should be 20.x)

2. **Docker & Docker Compose**
   - Download: https://www.docker.com/
   - Verify: `docker --version` and `docker-compose --version`

3. **Git**
   - Download: https://git-scm.com/
   - Verify: `git --version`

4. **Code Editor**
   - Recommended: Visual Studio Code
   - Extensions: ESLint, Prettier, TypeScript

### Optional Software

- **Firebase CLI:** `npm install -g firebase-tools` (for emulator and deployment)
- **Redis Client:** RedisInsight or redis-cli
- **API Client:** Postman, Insomnia, or curl

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/patacao.git
cd patacao
```

### 2. Install Dependencies

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies (if applicable)
cd ../frontend
npm install
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.development

# Edit environment variables
nano .env.development
```

**Required Variables:**
- `DB_HOST=localhost`
- `DB_NAME=patacao_dev`
- `DB_USER=postgres`
- `DB_PASSWORD=dev_password`
- `JWT_SECRET=dev_secret_key_min_32_chars`
- `SESSION_SECRET=dev_session_secret`

### 4. Start Services

```bash
# Start Firebase Emulator, Redis, and application
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker-compose -f docker-compose.dev.yml ps
```

### 5. Setup Firebase

```bash
# Option 1: Use Firebase Emulator (recommended for local dev)
firebase emulators:start --only firestore

# Option 2: Configure Firebase project
# Set FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_KEY in .env

# Seed Firestore with test data (optional)
npm run seed
```

### 6. Start Development Server

```bash
# Backend
cd backend
npm run dev

# Frontend (if applicable)
cd ../frontend
npm start
```

### 7. Verify Setup

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-01-15T10:00:00Z",
#   "version": "1.0.0"
# }
```

---

## Development Workflow

### Daily Workflow

1. **Pull Latest Changes**
   ```bash
   git pull origin main
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Write code
   - Write tests
   - Update documentation

4. **Run Tests**
   ```bash
   npm test
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

6. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

### Code Quality

**Before Committing:**
```bash
# Lint code
npm run lint

# Format code
npm run format

# Run tests
npm test

# Check types
npm run type-check
```

---

## Project Structure

```
patacao/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── administrative/
│   │   │   ├── services/
│   │   │   ├── financial/
│   │   │   ├── inventory/
│   │   │   └── users/
│   │   ├── shared/
│   │   └── adapters/
│   ├── tests/
│   ├── (Firestore collections managed via Firebase)
│   └── package.json
├── frontend/ (if applicable)
├── docs/
├── docker-compose.dev.yml
└── README.md
```

---

## Common Tasks

### Firebase Operations

```bash
# Deploy Firestore rules and indexes
npm run firebase:deploy

# Start Firebase emulators
npm run firebase:emulators

# View Firebase emulator UI
# Open http://localhost:4000 in browser
```

### Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

### Development Tools

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## Troubleshooting

### Common Issues

#### Firebase Connection Error

**Problem:** Cannot connect to Firebase

**Solution:**
```bash
# Check if Firebase Emulator is running
docker-compose -f docker-compose.dev.yml ps

# Restart Firebase Emulator
docker-compose -f docker-compose.dev.yml restart firebase-emulator

# Check connection
curl http://localhost:8080

# Verify Firebase project ID in .env
# Check FIREBASE_EMULATOR_HOST is set correctly
```

#### Port Already in Use

**Problem:** Port 3000 already in use

**Solution:**
```bash
# Find process using port
lsof -i :3000

# Kill process or change PORT in .env
PORT=3001 npm run dev
```

#### Firestore Rules Errors

**Problem:** Firestore rules deployment fails

**Solution:**
```bash
# Check Firebase project configuration
firebase projects:list

# Test rules locally with emulator
firebase emulators:start --only firestore

# Deploy rules
npm run firebase:deploy

# Check rules in Firebase Console
```

---

## Next Steps

1. **Read Documentation**
   - Architecture documentation
   - API documentation
   - Use case specifications

2. **Explore Codebase**
   - Review module structure
   - Understand domain entities
   - Review use cases

3. **Start Contributing**
   - Pick a small task
   - Write tests first
   - Submit pull request

---

## Resources

### Documentation

- **Architecture:** `docs/architecture/`
- **API:** `docs/api/`
- **Use Cases:** `docs/use-cases/`
- **Domain:** `docs/domain/`

### External Resources

- **Node.js:** https://nodejs.org/docs
- **TypeScript:** https://www.typescriptlang.org/docs
- **Firebase:** https://firebase.google.com/docs
- **Firestore:** https://firebase.google.com/docs/firestore
- **Docker:** https://docs.docker.com/

---

## Getting Help

### Internal

- **Slack:** #patacao-dev channel
- **Email:** dev@patacao.com
- **Wiki:** Internal documentation wiki

### External

- **Stack Overflow:** Tag questions with `patacao`
- **GitHub Issues:** Report bugs and feature requests

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team

