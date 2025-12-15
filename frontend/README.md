# Patacão Frontend

Frontend application for Patacão Petshop Management System built with Angular 20.

## Tech Stack

- **Framework**: Angular 20.3.x
- **Language**: TypeScript 5.9.x
- **UI Library**: PrimeNG 20.3.x
- **Icons**: Font Awesome 6.x, PrimeIcons 7.x
- **State Management**: NgRx 18.x
- **Internationalization**: ngx-translate 17.x
- **Firebase**: @angular/fire 20.x
- **Styling**: SCSS

## Prerequisites

- Node.js 20.x LTS
- npm 10.x+

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm start
```

The application will be available at `http://localhost:4200`

### Build

```bash
# Development build
npm run build

# Production build
npm run build:prod
```

### Testing

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Code Quality

```bash
# Lint
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check

# Type checking
npm run type-check
```

## Project Structure

```
src/
├── app/              # Root application component and configuration
├── shared/           # Shared code across modules
│   ├── components/   # Reusable UI components (Atomic Design)
│   ├── hooks/        # Shared hooks
│   ├── utils/        # Utility functions
│   ├── services/     # Shared services
│   ├── stores/       # Shared state management
│   └── types/        # Shared TypeScript types
├── modules/          # Feature modules
│   ├── administrative/
│   ├── services/
│   ├── financial/
│   ├── inventory/
│   └── users/
├── adapters/         # Platform-specific adapters
├── workers/          # Service workers
├── config/           # Configuration files
└── environments/     # Environment configurations
```

## Environment Configuration

- `environment.ts`: Development configuration
- `environment.prod.ts`: Production configuration

See `src/config/firebase.config.ts` for Firebase configuration.

## Documentation

For detailed architecture and development guidelines, see:
- `docs/frontend/frontend-architecture.md`
- `docs/tech-stack.md`
