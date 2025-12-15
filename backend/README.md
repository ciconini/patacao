# Patacão Backend

Backend API for the Patacão Petshop Management System.

## Tech Stack

- **Runtime:** Node.js 20.x LTS
- **Framework:** NestJS 10.x
- **Language:** TypeScript 5.3+
- **Database:** Firebase Firestore
- **Cache/Session:** Redis 7.x
- **Firebase SDK:** Firebase Admin SDK 12.x+

## Architecture

Clean/Hexagonal Architecture with the following layers:

- **Presentation:** Controllers, DTOs, validation
- **Application:** Use cases, application services
- **Domain:** Entities, value objects, domain services
- **Ports:** Repository interfaces, adapter interfaces
- **Adapters:** Database, Redis, external services

## Getting Started

### Prerequisites

- Node.js 20.x LTS
- Docker and Docker Compose
- Firebase project (or use Firebase Emulator)
- Redis 7.x (or use Docker)
- Firebase CLI (optional, for emulator): `npm install -g firebase-tools`

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

### Development

```bash
# Option 1: Use Docker Compose (includes Firebase Emulator)
docker-compose -f docker-compose.dev.yml up -d

# Option 2: Use Firebase Emulator locally
firebase emulators:start --only firestore

# Start development server
npm run start:dev
```

### Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Download service account key from Project Settings > Service Accounts
3. Set `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env`
4. Set `FIREBASE_PROJECT_ID` in `.env`

For local development with emulator:
- Set `USE_FIREBASE_EMULATOR=true` in `.env`
- Set `FIREBASE_EMULATOR_HOST=localhost:8080` in `.env`

### Available Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code
- `npm run firebase:deploy` - Deploy Firestore rules and indexes
- `npm run firebase:emulators` - Start Firebase emulators

## Project Structure

```
src/
├── shared/           # Shared utilities (logger, errors, config)
├── modules/          # Feature modules
│   ├── administrative/
│   ├── services/
│   ├── financial/
│   ├── inventory/
│   └── users/
├── adapters/         # Infrastructure adapters
│   ├── db/          # Database adapter
│   ├── redis/       # Redis adapter
│   ├── email/       # Email adapter
│   └── queue/       # Queue adapter
├── workers/          # Background workers
└── main.ts          # Application entry point
```

## Environment Variables

See `.env.example` for required environment variables.

## API Documentation

API documentation available at `/api/v1` (when implemented).

## License

UNLICENSED - Proprietary

