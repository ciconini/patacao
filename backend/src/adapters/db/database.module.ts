import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { FirestoreUnitOfWork } from './firestore-unit-of-work';
import { UnitOfWork } from '../../shared/ports/unit-of-work.port';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: (configService: ConfigService) => {
        // Initialize Firebase Admin SDK
        if (!admin.apps.length) {
          const useEmulator = configService.get('USE_FIREBASE_EMULATOR', 'false') === 'true';
          const projectId = configService.get('FIREBASE_PROJECT_ID');

          if (useEmulator) {
            // Use Firebase Emulator for local development
            process.env.FIRESTORE_EMULATOR_HOST = configService.get(
              'FIREBASE_EMULATOR_HOST',
              'localhost:8080',
            );
            admin.initializeApp({
              projectId: projectId || 'patacao-dev',
            });
          } else {
            // Production: Use service account
            const serviceAccountPath = configService.get('FIREBASE_SERVICE_ACCOUNT_PATH');
            const serviceAccountKey = configService.get('FIREBASE_SERVICE_ACCOUNT_KEY');

            if (serviceAccountPath) {
              // Load from file path (absolute or relative to project root)
              const path = require('path');
              const resolvedPath = path.isAbsolute(serviceAccountPath)
                ? serviceAccountPath
                : path.join(process.cwd(), serviceAccountPath);
              const serviceAccount = require(resolvedPath);
              admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: projectId,
              });
            } else if (serviceAccountKey) {
              // Load from JSON string (environment variable)
              const serviceAccount = JSON.parse(serviceAccountKey);
              admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: projectId,
              });
            } else {
              // Try default path: config/secrets/firebase-service-account.json
              try {
                const path = require('path');
                const defaultPath = path.join(process.cwd(), 'config', 'secrets', 'firebase-service-account.json');
                const serviceAccount = require(defaultPath);
                admin.initializeApp({
                  credential: admin.credential.cert(serviceAccount),
                  projectId: projectId,
                });
              } catch (defaultPathError) {
                // Use default credentials (for Google Cloud environments)
                admin.initializeApp({
                  projectId: projectId,
                });
              }
            }
          }
        }
        return admin;
      },
      inject: [ConfigService],
    },
    {
      provide: 'FIRESTORE',
      useFactory: (firebaseAdmin: typeof admin) => {
        return firebaseAdmin.firestore();
      },
      inject: ['FIREBASE_ADMIN'],
    },
    {
      provide: 'UnitOfWork',
      useClass: FirestoreUnitOfWork,
    },
  ],
  exports: ['FIREBASE_ADMIN', 'FIRESTORE', 'UnitOfWork'],
})
export class DatabaseModule {}

