import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirestoreUnitOfWork } from './firestore-unit-of-work';
import { UnitOfWork } from '../../shared/ports/unit-of-work.port';
import { FirestoreAuditLogRepository } from './firestore-audit-log.repository';
import { AppConfigService } from '../../shared/config/config.service';

@Global()
@Module({
  imports: [],
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: (config: AppConfigService) => {
        // Initialize Firebase Admin SDK
        if (!admin.apps.length) {
          const useEmulator = config.useFirebaseEmulator;
          const projectId = config.firebaseProjectId;

          if (useEmulator) {
            // Use Firebase Emulator for local development
            process.env.FIRESTORE_EMULATOR_HOST = config.firebaseEmulatorHost || 'localhost:8080';
            admin.initializeApp({
              projectId: projectId || 'patacao-dev',
            });
          } else {
            // Production: Use service account
            const serviceAccountPath = config.firebaseServiceAccountPath;
            const serviceAccountKey = config.firebaseServiceAccountKey;

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
                const defaultPath = path.join(
                  process.cwd(),
                  'config',
                  'secrets',
                  'firebase-service-account.json',
                );
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
      inject: [AppConfigService],
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
    {
      provide: 'AuditLogRepository',
      useClass: FirestoreAuditLogRepository,
    },
  ],
  exports: ['FIREBASE_ADMIN', 'FIRESTORE', 'UnitOfWork', 'AuditLogRepository'],
})
export class DatabaseModule {}
