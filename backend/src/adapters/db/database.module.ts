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
            const emulatorHost = config.firebaseEmulatorHost || 'localhost:8888';
            process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
            process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
            console.log('🔥 Firebase: Using EMULATOR mode');
            console.log(`   Firestore: ${emulatorHost}`);
            console.log(`   Auth: localhost:9099`);
            console.log(`   Project ID: ${projectId || 'patacao-dev'}`);
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
              console.log('🔥 Firebase: Using PRODUCTION mode');
              console.log(`   Service Account: ${resolvedPath}`);
              console.log(`   Project ID: ${projectId}`);
              admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: projectId,
              });
            } else if (serviceAccountKey) {
              // Load from JSON string (environment variable)
              const serviceAccount = JSON.parse(serviceAccountKey);
              console.log('🔥 Firebase: Using PRODUCTION mode');
              console.log(`   Service Account: From environment variable`);
              console.log(`   Project ID: ${projectId}`);
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
                console.log('🔥 Firebase: Using PRODUCTION mode');
                console.log(`   Service Account: ${defaultPath}`);
                console.log(`   Project ID: ${projectId}`);
                admin.initializeApp({
                  credential: admin.credential.cert(serviceAccount),
                  projectId: projectId,
                });
              } catch (defaultPathError) {
                // Use default credentials (for Google Cloud environments)
                console.log('🔥 Firebase: Using PRODUCTION mode (Default Credentials)');
                console.log(`   Project ID: ${projectId}`);
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
