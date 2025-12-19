# Firebase Configuration

This document describes the Firebase configuration setup for the Patacão Petshop Management System.

## Overview

The project uses Firebase for:
- **Backend**: Firebase Admin SDK (server-side operations)
- **Frontend**: Firebase Client SDK (client-side operations, authentication, etc.)

## Configuration Files

### Backend Configuration

The backend uses Firebase Admin SDK and is configured through environment variables:

- `FIREBASE_PROJECT_ID`: The Firebase project ID (default: `patacao`)
- `FIREBASE_SERVICE_ACCOUNT_PATH`: Path to service account JSON file
- `FIREBASE_SERVICE_ACCOUNT_KEY`: Service account JSON as string (alternative to path)
- `USE_FIREBASE_EMULATOR`: Set to `true` for local development
- `FIREBASE_EMULATOR_HOST`: Emulator host (default: `localhost:8080`)

See `backend/src/adapters/db/database.module.ts` for initialization logic.

### Frontend Configuration

The frontend uses the Firebase Client SDK and configuration is stored in environment files:

- `frontend/src/environments/environment.ts` - Development configuration
- `frontend/src/environments/environment.prod.ts` - Production configuration


### Firebase CLI Configuration

The `backend/firebase.json` file is used by Firebase CLI for:
- Deploying Firestore rules and indexes
- Running Firebase emulators locally

Current project: `patacao`

## Setup Instructions

### Backend Setup

1. **For Production:**
   - Create a service account in Firebase Console
   - Download the service account JSON file
   - Place the file in `backend/config/secrets/firebase-service-account.json` (recommended)
   - Or set `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env` to point to the file location
   - Or set `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env` with the JSON content as a string
   - Set `FIREBASE_PROJECT_ID=patacao` in `.env`
   - **Note:** The `config/secrets/` directory is automatically ignored by git for security

2. **For Local Development:**
   - Set `USE_FIREBASE_EMULATOR=true` in `.env`
   - Set `FIREBASE_EMULATOR_HOST=localhost:8080` in `.env`
   - Start Firebase emulator: `npm run firebase:emulators`

### Frontend Setup

1. Install Firebase dependencies:
   ```bash
   npm install @angular/fire firebase
   ```

2. Import Firebase modules in your Angular app module:
   ```typescript
   import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
   import { provideFirestore, getFirestore } from '@angular/fire/firestore';
   import { provideAuth, getAuth } from '@angular/fire/auth';
   import { environment } from './environments/environment';
   
   // In your app.config.ts or app.module.ts
   provideFirebaseApp(() => initializeApp(environment.firebase)),
   provideFirestore(() => getFirestore()),
   provideAuth(() => getAuth()),
   ```

3. Use the configuration:
   ```typescript
   import { firebaseConfig } from '@config/firebase.config';
   ```

## Security Notes

⚠️ **Important Security Considerations:**

1. **API Key Security**: The Firebase API key in the frontend configuration is safe to expose in client-side code. Firebase uses security rules to protect your data, not API key secrecy.

2. **Service Account**: Never commit service account JSON files to version control. Use environment variables or secure secret management.

3. **Firestore Rules**: Always configure proper Firestore security rules. See `backend/firestore.rules`.

4. **Environment Variables**: Never commit `.env` files with production credentials.

## Firebase Services Used

- **Firestore**: Primary database (NoSQL document database)
- **Firebase Authentication**: User authentication (if used)
- **Firebase Storage**: File storage (if used)
- **Firebase Analytics**: Analytics tracking (measurementId)

## Troubleshooting

### Backend Connection Issues

- Verify `FIREBASE_PROJECT_ID` matches your Firebase project
- Check service account has proper permissions
- For emulator: ensure emulator is running on correct port

### Frontend Connection Issues

- Verify `projectId` in environment files matches Firebase project
- Check browser console for Firebase initialization errors
- Ensure Firebase services are enabled in Firebase Console

## References

- [Firebase Documentation](https://firebase.google.com/docs)
- [AngularFire Documentation](https://github.com/angular/angularfire)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)

